import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, FileText, Loader, CheckCircle, Bot } from 'lucide-react';

// Simulated AI API Call
const simulateAIGeneration = async (transcript) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`**Ata de Reunião Gerada por IA**\n\n**Resumo:**\nA reunião discutiu os seguintes pontos baseados no áudio capturado.\n\n**Tópicos Identificados:**\n- ${transcript.substring(0, 100)}...\n\n**Próximos Passos:**\n- Revisar as metas estabelecidas.\n- Compartilhar esta ata com os envolvidos.`);
    }, 2500); // simulate network delay
  });
};

const MeetingAssistant = ({ meeting, onAtaGenerated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setIsRecording(false);
          alert('Permissão de microfone negada. Não é possível gravar a reunião.');
        }
      };
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Seu navegador não suporta a gravação de áudio nativa. Use o Google Chrome ou Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript(''); // Clear previous
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleGenerateAta = async () => {
    if (!transcript.trim()) {
      alert('Nenhum áudio foi transcrito para gerar a ata.');
      return;
    }
    
    setIsGenerating(true);
    // In the future, this will call OpenAI or Gemini API
    const ataText = await simulateAIGeneration(transcript);
    setIsGenerating(false);
    
    if (onAtaGenerated) {
      onAtaGenerated(ataText);
    }
  };

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: '.95rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bot size={18} /> Assistente de Reunião IA
        </h4>
        
        {isRecording && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: '.75rem', fontWeight: 600, animation: 'pulse 2s infinite' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span> Gravando e Transcrevendo...
        </span>}
      </div>

      <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
        A IA transcreverá o áudio capturado pelo seu microfone em tempo real. Ao finalizar a reunião, ela processará o texto e gerará uma ata profissional automaticamente.
      </p>

      {/* Transcript Box */}
      <div style={{ minHeight: 80, maxHeight: 150, overflowY: 'auto', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 8, padding: 10, fontSize: '.85rem', color: '#fff', marginBottom: 12, whiteSpace: 'pre-wrap', position: 'relative' }}>
        {transcript || <span style={{ color: 'rgba(255,255,255,.3)', fontStyle: 'italic' }}>{isRecording ? 'Ouvindo...' : 'A transcrição aparecerá aqui...'}</span>}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button 
          onClick={toggleRecording} 
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: isRecording ? 'rgba(239,68,68,.15)' : 'rgba(16,185,129,.15)', color: isRecording ? '#ef4444' : '#10b981', border: `1px solid ${isRecording ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: '.2s' }}
        >
          {isRecording ? <><MicOff size={16} /> Parar Gravação</> : <><Mic size={16} /> Iniciar Gravação</>}
        </button>
        
        <button 
          onClick={handleGenerateAta}
          disabled={isRecording || isGenerating || !transcript}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', opacity: (isRecording || isGenerating || !transcript) ? 0.5 : 1, color: '#fff', border: 'none', borderRadius: 8, cursor: (isRecording || isGenerating || !transcript) ? 'not-allowed' : 'pointer', fontWeight: 600, transition: '.2s' }}
        >
          {isGenerating ? <><Loader size={16} className="spin" /> Gerando Ata...</> : <><FileText size={16} /> Processar Ata IA</>}
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: .5; } 100% { opacity: 1; } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MeetingAssistant;
