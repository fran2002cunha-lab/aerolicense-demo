import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

const SUGGESTIONS = [
  'Que pilotos têm documentos a expirar?',
  'Qual é o piloto com maior risco?',
  'Há anomalias detectadas pelo ML?',
  'Mostra-me os documentos do P001',
];

export default function ChatPanel() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Olá! Sou o assistente AeroLicense com IA. Posso responder perguntas sobre conformidade documental, scores de risco e anomalias ML. Como posso ajudar?' },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', text: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const data = await api.chat(msg, history);
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch (err) {
      const errMsg = err.message?.includes('Timeout')
        ? '❌ O assistente não respondeu a tempo. Tenta novamente.'
        : '❌ Erro ao contactar o assistente. Verifica se o backend está a correr.';
      setMessages(prev => [...prev, { role: 'assistant', text: errMsg }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={s.fab} title="Assistente IA">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div style={s.panel}>
          <div style={s.header}>
            <span style={{ fontWeight: 'bold', fontSize: 14 }}>🤖 Assistente AeroLicense</span>
            <span style={{ fontSize: 11, color: '#AABBCC' }}>GPT-4o-mini · Português</span>
          </div>

          <div style={s.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? s.userMsg : s.botMsg}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={s.botMsg}>
                <span style={s.typing}>● ● ●</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div style={s.suggestions}>
              {SUGGESTIONS.map((q, i) => (
                <button key={i} style={s.suggestion} onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div style={s.inputRow}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escreve uma pergunta..."
              style={s.input}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  fab: {
    position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
    width: 52, height: 52, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A56DB, #0EA5E9)',
    border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(26,86,219,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    position: 'fixed', bottom: 92, right: 28, zIndex: 1999,
    width: 360, height: 480, background: '#050F1C',
    borderRadius: 16, border: '1px solid #1E3A5F',
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    background: '#030D1A', padding: '12px 16px',
    borderBottom: '1px solid #1E3A5F',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  botMsg: {
    background: '#0B1E35', color: '#E8EFF8', fontSize: 13,
    borderRadius: '12px 12px 12px 4px', padding: '10px 12px',
    maxWidth: '85%', alignSelf: 'flex-start', lineHeight: 1.5,
    whiteSpace: 'pre-wrap', border: '1px solid #1E3A5F',
  },
  userMsg: {
    background: 'linear-gradient(135deg, #1A56DB, #0EA5E9)',
    color: '#fff', fontSize: 13,
    borderRadius: '12px 12px 4px 12px', padding: '10px 12px',
    maxWidth: '85%', alignSelf: 'flex-end', lineHeight: 1.5,
  },
  typing: { color: '#6B8BAD', letterSpacing: 4, fontSize: 16 },
  suggestions: { padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  suggestion: {
    background: '#030D1A', border: '1px solid #1E3A5F',
    color: '#38BDF8', fontSize: 12, padding: '6px 10px',
    borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif',
  },
  inputRow: {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid #1E3A5F', background: '#030D1A',
  },
  input: {
    flex: 1, background: '#0B1E35', border: '1px solid #1E3A5F',
    borderRadius: 8, padding: '8px 12px', color: '#E8EFF8',
    fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #1A56DB, #0EA5E9)',
    border: 'none', borderRadius: 8, color: '#fff',
    padding: '8px 14px', cursor: 'pointer', fontSize: 16,
  },
};
