import { useState, useRef, useEffect } from 'react';
import { api, IS_DEMO } from '../api';
import { GITHUB_URL } from './DemoBanner';

export const README_AI_URL = `${GITHUB_URL}#the-ai-part`;

/* Perguntas usadas por backend/scripts/record_demo_chat.py (mostradas desativadas
 * quando não há gravações). */
export const DEMO_QUESTIONS = [
  'Que documentos expiram nos próximos 30 dias?',
  'Mostra os scores de risco de todos os pilotos.',
  'Há documentos com anomalias detetadas?',
  'Dá-me os detalhes do piloto P003.',
  'Quantos pilotos estão em conformidade?',
  'Quem tem documentos já expirados?',
];

const PLACEHOLDER_ANSWER = '<to be recorded>';

/* tool call → "get_expiring_documents(days=30)" */
export function formatToolCall(tc) {
  const args = tc && tc.arguments && typeof tc.arguments === 'object' ? tc.arguments : {};
  const parts = Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  return `${String(tc?.name || 'tool')}(${parts.join(', ')})`;
}

function formatDate(raw) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? String(raw || '') : d.toLocaleDateString('pt-PT');
}

/* Valida o ficheiro de gravações; devolve null se inválido ou vazio. */
export function parseRecordings(data) {
  if (!data || !Array.isArray(data.recordings)) return null;
  const recordings = data.recordings.filter(r =>
    r && typeof r.question === 'string' && typeof r.answer === 'string'
      && r.answer.trim() && r.answer.trim() !== PLACEHOLDER_ANSWER);
  if (!recordings.length) return null;
  return {
    model: String(data.model || 'modelo desconhecido'),
    recordedAt: formatDate(data.recorded_at),
    recordings: recordings.map(r => ({
      question: r.question,
      answer: r.answer,
      toolCalls: Array.isArray(r.tool_calls) ? r.tool_calls : [],
    })),
  };
}

const SUGGESTIONS = [
  'Que pilotos têm documentos a expirar?',
  'Qual é o piloto com maior risco?',
  'Há anomalias detectadas pelo ML?',
  'Mostra-me os documentos do P001',
];

export default function ChatPanel() {
  return IS_DEMO ? <DemoChatPanel /> : <LiveChatPanel />;
}

/* ── Modo demo: respostas gravadas do modelo real, sem texto livre ── */
export function DemoChatPanel({ initiallyOpen = false }) {
  const [open,     setOpen]     = useState(initiallyOpen);
  const [rec,      setRec]      = useState(undefined); // undefined = a carregar, null = indisponível
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open || rec !== undefined) return;
    let alive = true;
    api.chatRecordings()
      .then(d => { if (alive) setRec(parseRecordings(d)); })
      .catch(() => { if (alive) setRec(null); });
    return () => { alive = false; };
  }, [open, rec]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  function ask(r) {
    setMessages(prev => [...prev, { role: 'user', text: r.question }, { role: 'recorded', rec: r }]);
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={s.fab} title="Assistente IA" aria-label="Assistente IA">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chat-panel" style={{ ...s.panel, height: 560, maxHeight: 'calc(100vh - 120px)' }}>
          <div style={s.header}>
            <span style={{ fontWeight: 'bold', fontSize: 14 }}>🤖 Assistente AeroLicense</span>
            <span style={{ fontSize: 11, color: '#AABBCC' }}>{rec === null ? 'Sem backend' : 'Respostas gravadas'}</span>
          </div>

          <div style={s.messages}>
            {rec !== null && (
              <div style={s.botMsg}>
                Olá! Nesta demo estática não há backend, por isso mostro respostas que foram
                gravadas do modelo real. Escolhe uma das perguntas abaixo.
              </div>
            )}
            {rec === undefined && <div style={s.botMsg}><span style={s.typing}>● ● ●</span></div>}
            {rec === null && (
              <div role="status" data-testid="chat-no-backend" style={{ ...s.botMsg, maxWidth: '100%' }}>
                <strong>Esta demo estática não tem backend</strong>, por isso o assistente não responde aqui.
                {'\n\n'}Como funciona: o modelo recebe a pergunta e só pode ler dados através de
                5 ferramentas (pilotos, expirações, detalhe de piloto, scores de risco, anomalias ML).
                O backend valida os argumentos, executa a ferramenta e devolve o resultado ao modelo,
                num ciclo de no máximo 5 rondas de ferramentas e uma resposta final.
                {'\n\n'}
                <a href={README_AI_URL} target="_blank" rel="noopener noreferrer" style={s.link}>
                  Ver o código e a secção «The AI part» do README no GitHub →
                </a>
              </div>
            )}
            {messages.map((m, i) => m.role === 'user' ? (
              <div key={i} style={s.userMsg}>{m.text}</div>
            ) : (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-start', maxWidth: '92%' }}>
                {m.rec.toolCalls.map((tc, j) => (
                  <span key={j} style={s.toolChip}>tool call: {formatToolCall(tc)}</span>
                ))}
                <div style={{ ...s.botMsg, maxWidth: '100%' }}>{m.rec.answer}</div>
                <span style={s.recLabel}>
                  Resposta gravada do modelo real ({rec?.model}, {rec?.recordedAt})
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {rec === null && (
            <div style={{ ...s.suggestions, maxHeight: 190, overflowY: 'auto', paddingTop: 8, borderTop: '1px solid #1E3A5F' }}>
              <span style={s.recLabel}>Perguntas de exemplo (precisam do backend):</span>
              {DEMO_QUESTIONS.map(q => (
                <button key={q} type="button" disabled style={{ ...s.suggestion, opacity: 0.5, cursor: 'not-allowed' }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {rec && (
            <div style={{ ...s.suggestions, maxHeight: 190, overflowY: 'auto', paddingTop: 8, borderTop: '1px solid #1E3A5F' }}>
              {rec.recordings.map((r, i) => (
                <button key={i} type="button" style={s.suggestion} onClick={() => ask(r)}>
                  {r.question}
                </button>
              ))}
            </div>
          )}

          <div style={{ ...s.inputRow, flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value=""
                readOnly
                disabled
                aria-describedby="demo-chat-note"
                placeholder="Texto livre desativado no modo demo"
                style={{ ...s.input, opacity: 0.5, cursor: 'not-allowed' }}
              />
              <button disabled style={{ ...s.sendBtn, opacity: 0.4, cursor: 'not-allowed' }} aria-label="Enviar">➤</button>
            </div>
            <span id="demo-chat-note" style={{ fontSize: 10.5, color: '#6B8BAD', lineHeight: 1.4 }}>
              Sem backend nesta demo estática (sem chaves de API), por isso o texto livre está desativado.
              O assistente completo está no código do GitHub.
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Modo normal: chat ligado ao backend ── */
function LiveChatPanel() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Olá! Sou o assistente AeroLicense com IA. Posso responder perguntas sobre conformidade documental, scores de risco e anomalias ML. Como posso ajudar?' },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [model,    setModel]    = useState(null); // reportado pelo backend em cada resposta
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
      // O backend aceita no máximo 20 mensagens, 1000 caracteres cada e 8000 no total
      let history = newMessages.slice(0, -1).slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.text).slice(0, 1000),
      }));
      while (history.reduce((n, m) => n + m.content.length, 0) > 8000) history = history.slice(1);
      const data = await api.chat(msg, history);
      if (data.model) setModel(String(data.model));
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
      <button onClick={() => setOpen(o => !o)} style={s.fab} title="Assistente IA" aria-label="Assistente IA">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chat-panel" style={s.panel}>
          <div style={s.header}>
            <span style={{ fontWeight: 'bold', fontSize: 14 }}>🤖 Assistente AeroLicense</span>
            <span style={{ fontSize: 11, color: '#AABBCC' }}>{model ? `${model} · ` : ''}Português</span>
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
              aria-label="Pergunta para o assistente"
              style={s.input}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
              aria-label="Enviar"
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
  toolChip: {
    alignSelf: 'flex-start', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 10.5, color: '#A78BFA', background: '#1A1033',
    border: '1px solid #3B2A6B', borderRadius: 999, padding: '3px 9px',
    wordBreak: 'break-all',
  },
  link: { color: '#60A5FA', fontWeight: 600, textDecoration: 'underline' },
  recLabel: { fontSize: 10, color: '#6B8BAD', fontStyle: 'italic', paddingLeft: 2 },
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
    fontSize: 13, fontFamily: 'Inter, sans-serif',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #1A56DB, #0EA5E9)',
    border: 'none', borderRadius: 8, color: '#fff',
    padding: '8px 14px', cursor: 'pointer', fontSize: 16,
  },
};
