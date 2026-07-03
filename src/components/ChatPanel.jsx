import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Send, Paperclip, Mic, Smile, Square, Download, ShieldCheck, MessageCircle } from 'lucide-react';
import { useChat } from '../hooks/useChat';

const ChatPanel = ({ isOpen, onClose, departmentName, client }) => {
  const { user } = useAuth();
  const { messages, sendMessage } = useChat(client?.id, departmentName);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isInternalMsg, setIsInternalMsg] = useState(false);
  const [hideAnalystName, setHideAnalystName] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const EMOJIS = ['😀', '😂', '😍', '😭', '😎', '🔥', '👍', '🙏', '🎉', '💡', '✅', '❌', '👀', '🚀', '💯', '🤔', '❤️', '🙌', '💪', '✨'];

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    try {
      await sendMessage(text, {
        isInternal: isInternalMsg,
        hideName: hideAnalystName
      });
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await sendMessage(file.name, { file });
    } catch (err) {
      console.error("Erro ao enviar arquivo:", err);
      alert("Erro ao enviar arquivo. Verifique sua conexão e tente novamente.");
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleAudioRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
        try {
          await sendMessage('Áudio', { file });
        } catch (err) {
          console.error("Erro ao enviar áudio:", err);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao gravar áudio:", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const handleEmojiClick = () => {
    setShowEmojis(!showEmojis);
  };

  const exportChat = () => {
    if (!messages || messages.length === 0) return;
    
    let textContent = `HISTÓRICO DE MENSAGENS - Cliente: ${client?.name || 'Desconhecido'}\nData da Exportação: ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleString('pt-BR');
      const sender = msg.hide_sender_name ? 'Time de Atendimento' : msg.sender_name;
      const content = msg.content || '';
      let mediaInfo = '';
      if (msg.media_url) {
        mediaInfo = ` [Anexo: ${msg.media_type}] (${msg.media_url})`;
      }
      
      textContent += `[${date}] ${sender}:\n${content}${mediaInfo}\n\n`;
    });
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_historico_${client?.name?.replace(/\\s+/g, '_') || 'cliente'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
      <div className="chat-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.role === 'client' ? 'Chat com a Agência' : `Chat Interno: ${client?.name}`}
          </h3>
          <span className="chat-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} className="text-primary" />
            {user?.role === 'client' ? 'Mensagens com sua agência ROI Expert' : 'Visível apenas p/ Admins e Cliente'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportChat} className="action-btn" title="Exportar Histórico (TXT)">
            <Download size={18} />
          </button>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
      </div>

      <div className="chat-messages">
        {messages && messages.map(msg => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`message ${isMe ? 'user' : 'system'}`}>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: 4 }}>{msg.sender_name}</div>
              {msg.media_url && (
                <div style={{ marginBottom: 8 }}>
                  {msg.media_type === 'image' ? <img src={msg.media_url} alt="anexo" style={{ maxWidth: '100%', borderRadius: 8 }} /> :
                    msg.media_type === 'video' ? <video src={msg.media_url} controls style={{ maxWidth: '100%', borderRadius: 8 }} /> :
                      msg.media_type === 'audio' ? <audio src={msg.media_url} controls style={{ width: '200px', height: '40px' }} /> :
                        <a href={msg.media_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>📎 Ver anexo</a>}
                </div>
              )}
              {msg.content}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendText} className="chat-input-area">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

        {showEmojis && (
          <div className="emoji-picker">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="emoji-btn"
                onClick={() => { setInput(prev => prev + emoji); setShowEmojis(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {user?.role !== 'client' && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', padding: '0 4px', background: 'transparent' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} title="Cliente não verá esta mensagem">
              <input type="checkbox" checked={isInternalMsg} onChange={(e) => setIsInternalMsg(e.target.checked)} />
              Oculto (Interno)
            </label>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} title="Anônimo para cliente">
              <input type="checkbox" checked={hideAnalystName} onChange={(e) => setHideAnalystName(e.target.checked)} />
              Ocultar Analista
            </label>
          </div>
        )}

        <div className="chat-input-wrapper">
          <button type="button" onClick={handleEmojiClick} className="action-btn" title="Emojis">
            <Smile size={18} />
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="action-btn" title="Anexar Arquivo" disabled={uploading}>
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={uploading ? "Enviando arquivo..." : "Escreva sua mensagem..."}
            className="chat-input"
            disabled={uploading}
          />

          <button type="button" onClick={handleAudioRecord} className="action-btn" style={{ color: isRecording ? 'var(--danger)' : '' }} title={isRecording ? "Parar Gravação" : "Mensagem de Áudio"}>
            {isRecording ? <Square size={18} /> : <Mic size={18} />}
          </button>
          <button type="submit" className="send-btn" title="Enviar" disabled={uploading}><Send size={16} /></button>
        </div>
      </form>

      <style>{`
        .chat-panel {
          position: fixed;
          top: 80px;
          bottom: 24px;
          right: -400px;
          width: 380px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: -5px 10px 30px rgba(0,0,0,0.5);
          transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .chat-panel.open {
          right: 12px;
        }
        .chat-header {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.02);
          flex-shrink: 0;
        }
        .chat-header h3 {
          margin: 0 0 2px 0;
          font-size: 1rem;
          color: var(--text-main);
        }
        .chat-subtitle {
          font-size: 0.75rem;
          color: var(--tertiary);
          font-weight: 500;
        }
        .close-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .chat-messages {
          flex: 1;
          min-height: 0;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        
        .message {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.85rem;
          line-height: 1.4;
          position: relative;
        }
        .message.system {
          align-self: flex-start;
          background: rgba(255,255,255,0.07);
          color: var(--text-main);
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .message.user {
          align-self: flex-end;
          background: linear-gradient(135deg, var(--primary), var(--tertiary));
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        .chat-input-area {
          padding: 12px;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(0,0,0,0.2);
          position: relative;
          flex-shrink: 0;
        }
        .emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: var(--surface, #1e293b);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
          margin-bottom: 8px;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .emoji-btn {
          background: transparent;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .emoji-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .action-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: color 0.2s, background 0.2s;
        }
        .action-btn:hover {
          background: rgba(255,255,255,0.05);
          color: var(--primary);
        }
        .chat-input-wrapper {
          display: flex;
          gap: 4px;
          align-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 6px 6px 6px 12px;
          transition: all 0.2s;
        }
        .chat-input-wrapper:focus-within {
          border-color: var(--tertiary);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.1);
        }
        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          outline: none;
          font-size: 0.85rem;
          min-width: 0;
          padding: 4px 6px;
        }
        .chat-input::placeholder {
          color: var(--text-muted);
        }
        .send-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--tertiary));
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          flex-shrink: 0;
          margin-left: 4px;
        }
        .send-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
        }
        .send-btn:active {
          transform: scale(0.95);
        }
        
        @media (max-width: 768px) {
          .chat-panel { width: 100%; right: -100%; }
        }
      `}</style>
    </div>
  );
};

export default ChatPanel;
