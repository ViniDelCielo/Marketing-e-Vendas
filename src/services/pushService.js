/**
 * pushService.js
 * Serviço completo de Web Push Notifications para ROI Expert.
 *
 * Responsabilidades:
 *  - Verificar suporte do browser
 *  - Registrar o Service Worker
 *  - Solicitar permissão de notificação ao usuário
 *  - Criar/recuperar a PushSubscription via VAPID
 *  - Salvar/atualizar a subscription no Supabase
 *  - Enviar push via Edge Function do Supabase
 */

import { supabase } from '../lib/supabase';

// Chave pública VAPID (deve ser a mesma gerada e salva no .env)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// URL da Edge Function de envio de push
const PUSH_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`;

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/**
 * Converte uma string Base64Url para Uint8Array (necessário para VAPID)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

// -------------------------------------------------------
// Verificações
// -------------------------------------------------------

/**
 * Retorna true se o browser suporta todas as APIs necessárias:
 * Service Worker, PushManager e Notifications
 */
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Retorna o status atual da permissão de notificação:
 * 'default' | 'granted' | 'denied'
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// -------------------------------------------------------
// Registro do Service Worker
// -------------------------------------------------------

let swRegistration = null;

async function getSwRegistration() {
  if (swRegistration) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (err) {
    console.error('[Push] Erro ao registrar Service Worker:', err);
    return null;
  }
}

// -------------------------------------------------------
// Subscription
// -------------------------------------------------------

/**
 * Cria ou recupera a PushSubscription do browser
 */
async function getPushSubscription(registration) {
  // Tentar recuperar subscription existente
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    // Verificar se a chave pública do servidor coincide com a da assinatura existente
    const key = subscription.options.applicationServerKey;
    if (key && VAPID_PUBLIC_KEY) {
      try {
        const currentKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        const subscriptionKey = new Uint8Array(key);
        let matches = currentKey.length === subscriptionKey.length;
        if (matches) {
          for (let i = 0; i < currentKey.length; i++) {
            if (currentKey[i] !== subscriptionKey[i]) {
              matches = false;
              break;
            }
          }
        }
        if (!matches) {
          console.log('[Push] Chave VAPID alterada. Recriando assinatura...');
          await subscription.unsubscribe();
          subscription = null;
        }
      } catch (e) {
        console.warn('[Push] Erro ao comparar chaves VAPID:', e);
        await subscription.unsubscribe();
        subscription = null;
      }
    } else {
      await subscription.unsubscribe();
      subscription = null;
    }
  }

  if (!subscription) {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('A variável VITE_VAPID_PUBLIC_KEY não foi encontrada no seu arquivo .env. Certifique-se de gerar um par de chaves VAPID e adicioná-la.');
    }
    // Criar nova subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  return subscription;
}

/**
 * Salva a subscription no Supabase.
 * Usa upsert baseado no endpoint (único por device/browser).
 */
async function saveSubscriptionToDb(subscription) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
  const authStr = btoa(String.fromCharCode(...new Uint8Array(auth)));

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: p256dh,
      auth: authStr,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    console.error('[Push] Erro ao salvar subscription:', error);
    throw error;
  }
}

/**
 * Remove a subscription do Supabase ao cancelar
 */
async function removeSubscriptionFromDb(endpoint) {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[Push] Erro ao remover subscription:', error);
  }
}

// -------------------------------------------------------
// API Pública
// -------------------------------------------------------

/**
 * Solicita permissão e cria subscription.
 * Retorna 'granted' | 'denied' | 'unsupported'
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    console.warn('[Push] Browser não suporta Web Push');
    return 'unsupported';
  }

  try {
    // Solicitar permissão
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('[Push] Permissão negada pelo usuário');
      return 'denied';
    }

    // Registrar SW e criar subscription
    const registration = await getSwRegistration();
    if (!registration) return 'error';

    const subscription = await getPushSubscription(registration);
    await saveSubscriptionToDb(subscription);

    console.log('[Push] Subscription criada e salva com sucesso');
    return 'granted';
  } catch (err) {
    console.error('[Push] Erro ao ativar push:', err);
    return 'error';
  }
}

/**
 * Cancela a subscription do usuário no browser e no banco
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;

  try {
    const registration = await getSwRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await removeSubscriptionFromDb(endpoint);

    console.log('[Push] Desativado com sucesso');
  } catch (err) {
    console.error('[Push] Erro ao cancelar push:', err);
  }
}

/**
 * Dispara um push para o usuário atual via Edge Function do Supabase.
 * Usado internamente quando um evento relevante ocorre.
 *
 * @param {Object} payload - { title, body, url }
 */
export async function sendPushToCurrentUser(payload) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId: session.user.id,
        title: payload.title,
        body: payload.body,
        url: payload.url || window.location.origin,
        icon: '/favicon.svg',
      }),
    });
  } catch (err) {
    // Não é crítico — falha silenciosa para não bloquear o fluxo principal
    console.warn('[Push] Falha ao enviar push:', err);
  }
}

/**
 * Dispara um push para um usuário específico (destinatário) via Edge Function do Supabase.
 *
 * @param {string} targetUserId - UUID do destinatário
 * @param {Object} payload - { title, body, url }
 */
export async function sendPushToUser(targetUserId, payload) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId: targetUserId,
        title: payload.title,
        body: payload.body,
        url: payload.url || window.location.origin,
        icon: '/favicon.svg',
      }),
    });
  } catch (err) {
    console.warn('[Push] Falha ao enviar push para usuário:', err);
  }
}

/**
 * Cria uma notificação no banco de dados e dispara a notificação push correspondente.
 */
export async function createDbNotification(userId, { title, description, type, relatedId, metadata = {} }) {
  if (!userId) return;
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      description,
      type,
      related_id: relatedId ? String(relatedId) : null,
      metadata,
    });

    if (error) {
      console.error('[Notification] Erro ao salvar notificação no banco:', error);
      return;
    }

    // Se a notificação foi salva com sucesso, dispara o push
    await sendPushToUser(userId, {
      title,
      body: description,
      url: metadata.url || window.location.origin,
    });
  } catch (err) {
    console.warn('[Notification] Erro ao criar notificação:', err);
  }
}

