import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } from '@whiskeysockets/baileys';
import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadDotEnv, requireEnv } from './scripts/load-env.js';

loadDotEnv();

// ─── Cache de áudio local ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const AUDIO_CACHE_DIR = path.join(process.cwd(), 'audio_cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


// ─── Supabase ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = requireEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cache phone → lead info (evita query a cada mensagem)
let leadPhoneCache = {};

async function loadLeadPhoneCache() {
  try {
    const { data } = await supabase.from('crm_leads').select('id, name, pipeline_id, details');
    if (data) {
      leadPhoneCache = {};
      for (const lead of data) {
        const phone = ((lead.details && lead.details.phone) || '').replace(/\D/g, '');
        if (phone) leadPhoneCache[phone] = { id: lead.id, name: lead.name, pipelineId: lead.pipeline_id };
      }
      console.log(`Cache leads: ${Object.keys(leadPhoneCache).length} com telefone.`);
    }
  } catch (e) { console.error('Erro cache leads:', e.message); }
}

async function saveMessageToSupabase(leadId, sender, text) {
  try {
    await supabase.from('crm_lead_messages').insert({ lead_id: leadId, sender, text, type: 'whatsapp' });
  } catch (e) { console.error('Erro salvar msg Supabase:', e.message); }
}

// Backoff exponencial para reconexão
let reconnectAttempt = 0;
let reconnectTimer = null;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

let sock = null;
let qrCodeBase64 = null;
let connectionStatus = 'disconnected';

// ─── SSE (Server-Sent Events) ─────────────────────────────────────────────────
// Clientes conectados ao stream de eventos em tempo real
let sseClients = [];

function broadcastSSE(type, data = {}) {
  const payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  sseClients = sseClients.filter(client => {
    try {
      client.res.write(payload);
      return true; // manter cliente vivo
    } catch (e) {
      return false; // remover cliente morto
    }
  });
}
// ──────────────────────────────────────────────────────────────────────────────

let chatsList = [];
let messagesStore = {}; // Map of msg array keyed by JID
const contactsStore = {}; // Map of JID to SAVED name (from your phone's contact book) - HIGHEST PRIORITY
const pushNamesStore = {}; // Map of JID to PUSH name (name the contact set themselves) - FALLBACK
const profilePicsCache = {}; // Map of JID to profile picture URL

const historyPath = './whatsapp_history.json';

// Format a raw WhatsApp number to readable form: 5511988931958 -> +55 (11) 98893-1958
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  // Brazilian numbers: 55 + DDD (2) + number (8 or 9)
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.substring(2, 4);
    const number = digits.substring(4);
    if (number.length === 9) {
      return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
    } else if (number.length === 8) {
      return `+55 (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
    }
  }
  // International: just add +
  return `+${digits}`;
}

function getContactName(jid) {
  // Priority: 1) Name saved in YOUR address book (contactsStore)
  //           2) Name the contact set on their own profile (pushNamesStore)
  //           3) Formatted phone number as fallback
  if (contactsStore[jid]) return contactsStore[jid];
  if (pushNamesStore[jid]) return pushNamesStore[jid];
  const rawPhone = jid.split('@')[0];
  return formatPhone(rawPhone);
}

// Helper to set a contact name from any source, respecting priority
function setContactName(jid, savedName, pushName) {
  if (savedName) {
    // Address book name - always store this
    contactsStore[jid] = savedName;
  }
  if (pushName && !contactsStore[jid]) {
    // Push name - only use if no address book name
    pushNamesStore[jid] = pushName;
  } else if (pushName) {
    // Always store push name for reference even if we have address book name
    pushNamesStore[jid] = pushName;
  }
}

function saveHistory() {
  try {
    fs.writeFileSync(historyPath, JSON.stringify({
      chatsList,
      messagesStore,
      contactsStore: Object.fromEntries(Object.entries(contactsStore)),
      pushNamesStore: Object.fromEntries(Object.entries(pushNamesStore)),
      profilePicsCache: Object.fromEntries(Object.entries(profilePicsCache).filter(([, v]) => v !== null))
    }, null, 2));
  } catch (e) {
    console.error('Erro ao salvar histórico do WhatsApp:', e);
  }
}

function loadHistory() {
  try {
    if (fs.existsSync(historyPath)) {
      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      chatsList = data.chatsList || [];
      messagesStore = data.messagesStore || {};
      if (data.contactsStore) Object.assign(contactsStore, data.contactsStore);
      if (data.pushNamesStore) Object.assign(pushNamesStore, data.pushNamesStore);
      if (data.profilePicsCache) Object.assign(profilePicsCache, data.profilePicsCache);
      console.log(`Histórico carregado: ${chatsList.length} conversas, ${Object.keys(contactsStore).length} contatos na agenda, ${Object.keys(pushNamesStore).length} push names, ${Object.keys(profilePicsCache).length} fotos.`);
    }
  } catch (e) {
    console.error('Erro ao ler histórico do WhatsApp:', e);
  }
}

// Load local history on startup
loadHistory();

// Fetch ALL profile pictures in background after connecting
let isFetchingProfilePics = false;
let fetchPicsTimer = null;

// Debounced scheduler: waits 8s after last history batch before fetching pics
// This ensures chatsList is fully populated before we start fetching
function scheduleFetchPics() {
  if (fetchPicsTimer) clearTimeout(fetchPicsTimer);
  fetchPicsTimer = setTimeout(() => {
    fetchPicsTimer = null;
    fetchAllProfilePics().catch(e => console.error('Erro ao buscar fotos:', e));
  }, 8000); // 8 seconds after last history batch
}

async function fetchAllProfilePics() {
  if (isFetchingProfilePics) {
    console.log('fetchAllProfilePics já está rodando, agendando nova tentativa...');
    scheduleFetchPics();
    return;
  }
  if (!sock || connectionStatus !== 'connected') return;
  if (chatsList.length === 0) {
    console.log('chatsList vazio, aguardando histórico...');
    scheduleFetchPics();
    return;
  }
  isFetchingProfilePics = true;

  // First: update all chat names using correct priority (address book > push name > phone)
  let nameUpdated = false;
  for (let i = 0; i < chatsList.length; i++) {
    const c = chatsList[i];
    const correctName = getContactName(c.id);
    if (correctName && correctName !== c.name) {
      chatsList[i] = { ...c, name: correctName };
      nameUpdated = true;
    }
  }
  if (nameUpdated) {
    console.log('Nomes atualizados (agenda > push name > telefone).');
    saveHistory();
  }

  // Then: fetch profile pictures for all chats not yet cached
  const toFetch = chatsList.filter(c => !profilePicsCache[c.id]);
  console.log(`Buscando fotos de perfil para ${toFetch.length} contatos...`);

  let fetched = 0;
  let saved = 0;
  for (const chat of toFetch) {
    if (!sock || connectionStatus !== 'connected') break;
    try {
      const url = await sock.profilePictureUrl(chat.id, 'image');
      if (url) {
        profilePicsCache[chat.id] = url;
        fetched++;
      }
    } catch (e) {
      // Contact has no pic visible to us - mark with empty string to skip next time
      profilePicsCache[chat.id] = '';
    }
    saved++;
    // Save progress every 50 pics and throttle requests
    if (saved % 50 === 0) {
      saveHistory();
      console.log(`Fotos: ${fetched} obtidas de ${saved}/${toFetch.length} processados...`);
    }
    await new Promise(r => setTimeout(r, 30)); // 30ms throttle
  }

  console.log(`Fotos de perfil concluídas: ${fetched} obtidas de ${toFetch.length} contatos.`);
  saveHistory();
  isFetchingProfilePics = false;
}

let isInitializing = false;
async function initWhatsApp() {
  if (isInitializing) {
    console.log('initWhatsApp já está em andamento, ignorando chamada duplicada...');
    return;
  }
  isInitializing = true;
  try {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      connectionStatus = 'disconnected';
      try {
        const qrData = await qrcode.toDataURL(qr);
        qrCodeBase64 = qrData;
        // ⚡ Push imediato via SSE — sem esperar polling!
        broadcastSSE('qr_code', { qr: qrData });
        console.log('QR Code gerado e enviado via SSE.');
      } catch (err) {
        console.error("Erro ao gerar QR Code em base64:", err);
      }
    }

    if (connection === 'connecting') {
      connectionStatus = 'connecting';
      qrCodeBase64 = null; // Celular escaneou — QR não é mais válido
      console.log('📱 Celular escaneou o QR — aguardando autenticação...');
    }

    if (connection === 'open') {
      connectionStatus = 'connected';
      isInitializing = false;
      reconnectAttempt = 0;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      qrCodeBase64 = null;
      console.log('✅ WhatsApp conectado com sucesso!');
      // ⚡ Push imediato: avisa o frontend que conectou
      broadcastSSE('wa_connected', { phone: sock?.user?.id ? sock.user.id.split('@')[0].split(':')[0] : null });
      scheduleFetchPics();
      loadLeadPhoneCache();
    }

    if (connection === 'close') {
      connectionStatus = 'disconnected';
      isInitializing = false;
      if (fetchPicsTimer) { clearTimeout(fetchPicsTimer); fetchPicsTimer = null; }
      isFetchingProfilePics = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`Conexão fechada. Código: ${statusCode}. LoggedOut: ${isLoggedOut}`);
      if (!isLoggedOut) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        const delays = [5000, 10000, 20000, 30000, 60000];
        const delay = delays[Math.min(reconnectAttempt, delays.length - 1)];
        console.log(`Reconectando em ${delay / 1000}s (tentativa ${reconnectAttempt + 1})...`);
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          reconnectAttempt++;
          initWhatsApp().catch(err => console.error('Erro ao reconectar:', err));
        }, delay);
      } else {
        console.log('Sessão encerrada (logout). Aguardando novo QR Code.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Sync contacts names — IMPORTANT: c.name = saved in YOUR address book, c.notify = their push name
  sock.ev.on('contacts.set', (contacts) => {
    for (const c of contacts) {
      if (c.id) {
        // c.name = name YOU saved for this contact (address book) — PRIORITY
        // c.verifiedName = verified business name — secondary
        // c.notify = name they set themselves (push name) — lowest priority
        setContactName(c.id, c.name || c.verifiedName, c.notify);
      }
    }
    // Update chatsList names with newly loaded contact names
    for (let i = 0; i < chatsList.length; i++) {
      const newName = getContactName(chatsList[i].id);
      if (newName !== chatsList[i].name) {
        chatsList[i] = { ...chatsList[i], name: newName };
      }
    }
  });

  sock.ev.on('contacts.update', (updates) => {
    for (const update of updates) {
      if (update.id) {
        setContactName(update.id, update.name || update.verifiedName, update.notify);
        // Update matching chat in chatsList
        const idx = chatsList.findIndex(c => c.id === update.id);
        if (idx !== -1) {
          chatsList[idx] = { ...chatsList[idx], name: getContactName(update.id) };
        }
      }
    }
  });

  // Sync initial history
  sock.ev.on('messaging-history.set', ({ chats, contacts, messages }) => {
    console.log(`Histórico recebido: ${chats?.length || 0} chats, ${contacts?.length || 0} contatos, ${messages?.length || 0} mensagens.`);
    
    // Process contacts FIRST so names are available when we process chats
    if (contacts) {
      for (const c of contacts) {
        if (c.id) {
          setContactName(c.id, c.name || c.verifiedName, c.notify);
        }
      }
    }

    if (chats) {
      for (const chat of chats) {
        if (chat.id && chat.id.endsWith('@s.whatsapp.net')) {
          const from = chat.id;
          const phone = from.split('@')[0];
          // getContactName now checks contactsStore (address book) first, then pushNames, then phone
          const name = getContactName(from);
          
          const existingIndex = chatsList.findIndex(c => c.id === from);
          const chatInfo = {
            id: from,
            name,
            phone,
            status: 'Real'
          };
          if (existingIndex !== -1) {
            chatsList[existingIndex] = chatInfo;
          } else {
            chatsList.push(chatInfo);
          }
        }
      }
    }

    if (messages) {
      for (const msg of messages) {
        const from = msg.key.remoteJid;
        if (from && from.endsWith('@s.whatsapp.net') && msg.message) {
          const text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || 
                       msg.message.videoMessage?.caption || 
                       '';
          if (!text) continue;
          
          const isMe = msg.key.fromMe;
          const timestamp = msg.messageTimestamp?.low || msg.messageTimestamp;
          const time = timestamp 
            ? new Date(timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          if (!messagesStore[from]) messagesStore[from] = [];
          
          const msgExists = messagesStore[from].some(m => m.text === text && m.time === time);
          if (!msgExists) {
            messagesStore[from].push({
              sender: isMe ? 'me' : 'lead',
              text,
              time,
              timestamp: timestamp || Date.now() / 1000
            });
          }
        }
      }
      for (const jid in messagesStore) {
        messagesStore[jid].sort((a, b) => a.timestamp - b.timestamp);
      }
    }

    saveHistory();
    // Schedule profile pic fetch after history is done loading
    scheduleFetchPics();
  });

  sock.ev.on('chats.set', ({ chats }) => {
    console.log(`Sync chats.set: ${chats?.length || 0} chats.`);
    if (chats) {
      for (const chat of chats) {
        if (chat.id && chat.id.endsWith('@s.whatsapp.net')) {
          const from = chat.id;
          const phone = from.split('@')[0];
          // Use getContactName which checks address book first
          const name = getContactName(from);
          
          const existingIndex = chatsList.findIndex(c => c.id === from);
          const chatInfo = { id: from, name, phone, status: 'Real' };
          if (existingIndex !== -1) {
            chatsList[existingIndex] = chatInfo;
          } else {
            chatsList.push(chatInfo);
          }
        }
      }
      saveHistory();
      scheduleFetchPics();
    }
  });


  sock.ev.on('messages.set', ({ messages }) => {
    console.log(`Sync messages.set: ${messages?.length || 0} mensagens.`);
    if (messages) {
      for (const msg of messages) {
        const from = msg.key.remoteJid;
        if (from && from.endsWith('@s.whatsapp.net') && msg.message) {
          const text = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || 
                       msg.message.videoMessage?.caption || 
                       '';
          if (!text) continue;
          
          const isMe = msg.key.fromMe;
          const timestamp = msg.messageTimestamp?.low || msg.messageTimestamp;
          const time = timestamp 
            ? new Date(timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          if (!messagesStore[from]) messagesStore[from] = [];
          
          const msgExists = messagesStore[from].some(m => m.text === text && m.time === time);
          if (!msgExists) {
            messagesStore[from].push({
              sender: isMe ? 'me' : 'lead',
              text,
              time,
              timestamp: timestamp || Date.now() / 1000
            });
          }
        }
      }
      for (const jid in messagesStore) {
        messagesStore[jid].sort((a, b) => a.timestamp - b.timestamp);
      }
      saveHistory();
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      let updated = false;
      for (const msg of m.messages) {
        const from = msg.key.remoteJid;
        if (from && from.endsWith('@s.whatsapp.net') && msg.message) {
          // ✅ Desembrulha tipos aninhados (ephemeral, viewOnce, etc.)
          const rawMsg = msg.message;
          const msgContent = rawMsg?.ephemeralMessage?.message ||
                             rawMsg?.viewOnceMessage?.message ||
                             rawMsg?.viewOnceMessageV2?.message?.viewOnceMessage?.message ||
                             rawMsg?.documentWithCaptionMessage?.message ||
                             rawMsg;

          // ✅ Download de áudio se for audioMessage
          let audioUrl = null;
          if (msgContent?.audioMessage) {
            try {
              const stream = await downloadContentFromMessage(msgContent.audioMessage, 'audio');
              let buffer = Buffer.from([]);
              for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
              const fileName = `audio_${from.split('@')[0]}_${timestamp || Date.now()}.ogg`;
              fs.writeFileSync(path.join(AUDIO_CACHE_DIR, fileName), buffer);
              audioUrl = `http://localhost:3001/api/whatsapp/audio/${fileName}`;
              console.log(`[WA] Áudio salvo: ${fileName}`);
            } catch (e) {
              console.warn('[WA] Erro ao baixar áudio:', e.message);
            }
          }

          // ✅ Extrai texto de TODOS os tipos de mensagem
          const text = msgContent?.conversation ||
                       msgContent?.extendedTextMessage?.text ||
                       msgContent?.imageMessage?.caption ||
                       msgContent?.videoMessage?.caption ||
                       msgContent?.documentMessage?.caption ||
                       (msgContent?.audioMessage ? '🎤 Áudio' : '') ||
                       (msgContent?.stickerMessage ? '🔖 Sticker' : '') ||
                       (msgContent?.imageMessage ? '🖼️ Imagem' : '') ||
                       (msgContent?.videoMessage ? '🎥 Vídeo' : '') ||
                       (msgContent?.documentMessage ? '📄 Documento' : '') ||
                       (msgContent?.reactionMessage?.text ? `Reação: ${msgContent.reactionMessage.text}` : '') ||
                       '';

          if (!text) {
            console.log(`[WA] Mensagem sem texto ignorada de ${from.split('@')[0]} — tipo: ${Object.keys(rawMsg || {}).join(', ')}`);
            continue;
          }

          const isMe = msg.key.fromMe;
          const timestamp = msg.messageTimestamp?.low || msg.messageTimestamp;
          const time = timestamp 
            ? new Date(timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          console.log(`[WA] Nova mensagem ${isMe ? '(enviada)' : '(recebida)'} de ${from.split('@')[0]}: ${text.substring(0, 60)}`);

          if (!messagesStore[from]) messagesStore[from] = [];
          messagesStore[from].push({
            sender: isMe ? 'me' : 'lead',
            text,
            time,
            timestamp: timestamp || Date.now() / 1000,
            audioUrl
          });
          
          // Store push name as FALLBACK only — never override address book name
          if (msg.pushName && !isMe) {
            pushNamesStore[from] = msg.pushName;
          }
          // getContactName will use: contactsStore (address book) > pushNamesStore > phone number
          const name = getContactName(from);
          const existingIndex = chatsList.findIndex(c => c.id === from);
          const chatInfo = { id: from, name, phone: from.split('@')[0], status: 'Real' };
          if (existingIndex !== -1) {
            chatsList[existingIndex] = chatInfo;
          } else {
            chatsList.push(chatInfo);
          }

          // ⚡ Broadcast SSE — detecta se é lead conhecido ou número novo
          const msgPayload = { sender: isMe ? 'me' : 'lead', text, time, timestamp: timestamp || Date.now() / 1000, audioUrl };
          const phoneDigits = from.split('@')[0];
          const leadInfo = leadPhoneCache[phoneDigits]
            || leadPhoneCache[phoneDigits.slice(-11)]
            || leadPhoneCache[phoneDigits.slice(-10)];

          if (leadInfo && !isMe) {
            // Lead existente: persiste no Supabase e avisa o CRM
            saveMessageToSupabase(leadInfo.id, 'lead', text);
            broadcastSSE('known_message', {
              chatId: from, leadId: leadInfo.id, leadName: leadInfo.name,
              message: msgPayload,
              chat: { ...chatInfo, lastMessage: text, lastTime: time, profilePic: profilePicsCache[from] || null }
            });
          } else if (!isMe) {
            // Número desconhecido: deixa o usuário escolher o funil
            broadcastSSE('lead_new', {
              chatId: from, phone: formatPhone(phoneDigits), rawPhone: phoneDigits, name,
              message: msgPayload,
              chat: { ...chatInfo, lastMessage: text, lastTime: time, profilePic: profilePicsCache[from] || null }
            });
          } else {
            broadcastSSE('new_message', {
              chatId: from, message: msgPayload,
              chat: { ...chatInfo, lastMessage: text, lastTime: time, profilePic: profilePicsCache[from] || null }
            });
          }

          updated = true;
        }
      }
      if (updated) saveHistory();
    }
  });

  } catch (err) {
    console.error('Erro em initWhatsApp:', err);
    isInitializing = false;
    throw err;
  }
}

// Endpoints

// ─── SSE Endpoint: stream de eventos em tempo real ───────────────────────────
app.get('/api/whatsapp/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no' // desativa buffer do nginx se houver
  });

  // Envia evento inicial de conexão
  res.write(`data: ${JSON.stringify({ type: 'connected', status: connectionStatus })}\n\n`);

  const clientId = Date.now() + Math.random();
  sseClients.push({ id: clientId, res });
  console.log(`SSE: novo cliente conectado (total: ${sseClients.length})`);

  // Heartbeat a cada 25s para manter a conexão viva
  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch (e) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`SSE: cliente desconectado (total: ${sseClients.length})`);
  });
});
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/whatsapp/connect', async (req, res) => {
  if (!sock) {
    await initWhatsApp();
  }
  res.json({
    status: connectionStatus,
    qr: qrCodeBase64,
    phone: sock?.user?.id ? sock.user.id.split('@')[0].split(':')[0] : null
  });
});

// Nova sessão: apaga credenciais e gera novo QR
app.post('/api/whatsapp/new-session', async (req, res) => {
  try {
    // Cancela reconexão automática pendente (evita conflito)
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    isInitializing = false;

    // Fecha socket atual
    if (sock) {
      try { sock.end(); } catch (e) {}
      sock = null;
    }
    connectionStatus = 'disconnected';
    qrCodeBase64 = null;

    // Aguarda 600ms para o SO (Windows) liberar os locks dos arquivos antes de deletar
    await new Promise(r => setTimeout(r, 600));

    // Apaga credenciais salvas (com retry para Windows)
    const authDir = 'auth_info_baileys';
    if (fs.existsSync(authDir)) {
      let retries = 3;
      while (retries > 0) {
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
          console.log('Credenciais antigas removidas. Iniciando nova sessão...');
          break;
        } catch (e) {
          retries--;
          if (retries === 0) {
            console.warn('Aviso: não foi possível remover auth_info_baileys completamente:', e.message);
          } else {
            await new Promise(r => setTimeout(r, 400)); // aguarda e tenta de novo
          }
        }
      }
    }

    // Inicia nova sessão (vai gerar novo QR via SSE quando estiver pronto)
    await initWhatsApp();

    // Aguarda até 10s para o QR aparecer (fallback para polling)
    let waited = 0;
    while (!qrCodeBase64 && waited < 10000) {
      await new Promise(r => setTimeout(r, 300));
      waited += 300;
    }

    res.json({
      status: connectionStatus,
      qr: qrCodeBase64,
      phone: null
    });
  } catch (err) {
    console.error('Erro ao iniciar nova sessão:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qr: qrCodeBase64,
    phone: sock?.user?.id ? sock.user.id.split('@')[0].split(':')[0] : null
  });
});

app.get('/api/whatsapp/chats', (req, res) => {
  const formattedChats = chatsList.map(c => {
    const msgs = messagesStore[c.id] || [];
    const lastMsg = msgs[msgs.length - 1];
    // Resolve name: saved contact name OR formatted phone
    const resolvedName = contactsStore[c.id] || c.name || formatPhone(c.phone || c.id.split('@')[0]);
    const isContact = !!(contactsStore[c.id] || (c.name && c.name !== c.phone && c.name !== c.id.split('@')[0]));
    // profilePicsCache[id] = URL string (valid), '' (no pic), undefined (not fetched yet)
    const cachedPic = profilePicsCache[c.id];
    return {
      ...c,
      name: resolvedName,
      isContact,
      profilePic: (cachedPic && cachedPic !== '') ? cachedPic : null,
      lastMessage: lastMsg ? lastMsg.text : 'Nenhuma mensagem recente',
      time: lastMsg ? lastMsg.time : '10:00'
    };
  });
  res.json(formattedChats);
});

app.get('/api/whatsapp/messages', (req, res) => {
  const { chatId } = req.query;
  if (!chatId) return res.json([]);
  const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
  res.json(messagesStore[jid] || messagesStore[chatId] || []);
});

// Returns profile picture URL for a JID (with caching)
app.get('/api/whatsapp/profile-pic', async (req, res) => {
  const { jid } = req.query;
  if (!jid) return res.json({ url: null });
  // Return from cache: '' means no pic, valid string means URL
  const cached = profilePicsCache[jid];
  if (cached !== undefined) {
    return res.json({ url: cached || null });
  }
  if (!sock || connectionStatus !== 'connected') {
    return res.json({ url: null });
  }
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    profilePicsCache[jid] = url || '';
    res.json({ url: url || null });
  } catch (e) {
    // Don't cache null - allow retry next time
    res.json({ url: null });
  }
});

// Returns all saved contacts for name resolution
app.get('/api/whatsapp/contacts', (req, res) => {
  res.json(contactsStore);
});

app.post('/api/whatsapp/logout', (req, res) => {
  // Responde imediatamente para o frontend não travar
  res.json({ success: true });

  // Executa limpeza em segundo plano (sem bloquear)
  setImmediate(() => {
    try {
      // NÃO chama sock.logout() pois isso derruba TODAS as conexões e é lento
      // Apenas remove credenciais locais e histórico
      const authDir = 'auth_info_baileys';
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }
      if (fs.existsSync(historyPath)) {
        fs.unlinkSync(historyPath);
      }
      chatsList = [];
      messagesStore = {};

      // Fecha socket silenciosamente após limpar
      if (sock) {
        try { sock.end(); } catch (e) {}
        sock = null;
      }
      connectionStatus = 'disconnected';
      qrCodeBase64 = null;
      
      console.log('Sessão WhatsApp removida localmente com sucesso.');
    } catch (err) {
      console.error('Erro ao limpar sessão WhatsApp:', err);
    }
  });
});


app.post('/api/whatsapp/reload-leads', async (req, res) => {
  await loadLeadPhoneCache();
  res.json({ success: true, count: Object.keys(leadPhoneCache).length });
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message, leadId } = req.body;
  if (!sock || connectionStatus !== 'connected') {
    return res.status(400).json({ success: false, error: 'WhatsApp desconectado' });
  }

  try {
    const formattedPhone = phone.includes('@s.whatsapp.net') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(formattedPhone, { text: message });
    
    // Save sent message to local history
    if (!messagesStore[formattedPhone]) messagesStore[formattedPhone] = [];
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    messagesStore[formattedPhone].push({
      sender: 'me',
      text: message,
      time,
      timestamp: Date.now() / 1000
    });
    saveHistory();
    if (leadId) saveMessageToSupabase(leadId, 'me', message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Servir arquivos de áudio cacheados ──────────────────────────────────────
app.get('/api/whatsapp/audio/:filename', (req, res) => {
  const { filename } = req.params;
  // Security: only allow safe filenames (no path traversal)
  if (!/^[\w\-\.]+$/.test(filename)) return res.status(400).json({ error: 'Nome inválido' });
  const filePath = path.join(AUDIO_CACHE_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Áudio não encontrado' });
  res.setHeader('Content-Type', 'audio/ogg');
  res.setHeader('Access-Control-Allow-Origin', '*');
  fs.createReadStream(filePath).pipe(res);
});

// ─── Receber gravação de áudio do browser e enviar como PTT ─────────────────
app.post('/api/whatsapp/send-audio', async (req, res) => {
  const { phone, audioBase64, mimeType } = req.body;
  if (!sock || connectionStatus !== 'connected') {
    return res.status(400).json({ success: false, error: 'WhatsApp desconectado' });
  }
  if (!phone || !audioBase64) {
    return res.status(400).json({ success: false, error: 'phone e audioBase64 são obrigatórios' });
  }
  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    const formattedPhone = phone.includes('@s.whatsapp.net') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    // Envia como PTT (Push To Talk = mensagem de voz)
    await sock.sendMessage(formattedPhone, {
      audio: buffer,
      mimetype: mimeType || 'audio/ogg; codecs=opus',
      ptt: true
    });
    
    // Salva no histórico local
    if (!messagesStore[formattedPhone]) messagesStore[formattedPhone] = [];
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    messagesStore[formattedPhone].push({ sender: 'me', text: '🎤 Áudio', time, timestamp: Date.now() / 1000 });
    saveHistory();
    console.log(`[WA] Áudio PTT enviado para ${formattedPhone}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[WA] Erro ao enviar áudio:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  await loadLeadPhoneCache();
  if (fs.existsSync('auth_info_baileys/creds.json')) {
    initWhatsApp().catch(err => console.error('Erro ao auto-iniciar WhatsApp:', err));
  }
});
