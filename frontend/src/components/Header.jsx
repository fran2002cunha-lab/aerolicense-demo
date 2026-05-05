import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Header() {
  const [online, setOnline] = useState(null);
  const [mode, setMode]     = useState('');

  useEffect(() => {
    api.status()
      .then(d => { setOnline(true); setMode(d.modo || ''); })
      .catch(() => setOnline(false));
  }, []);

  return (
    <div style={s.header}>
      <span style={{ fontSize: 28 }}>✈</span>
      <div>
        <h1 style={s.title}>AeroLicense <span style={s.sub}>Plataforma</span></h1>
        <div style={s.status}>
          <div style={{ ...s.dot, background: online ? '#27AE60' : '#E74C3C',
            boxShadow: online ? '0 0 6px #27AE60' : 'none' }} />
          <span style={{ color: '#AABBCC', fontSize: 12 }}>
            {online === null ? 'A ligar...' : online ? `API online${mode ? ` · ${mode}` : ''}` : 'API offline'}
          </span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <span style={s.badge}>Python · FastAPI</span>
        <span style={{ ...s.badge, background: '#8E44AD' }}>Ethereum · Solidity</span>
        <span style={{ ...s.badge, background: '#27AE60' }}>React</span>
      </div>
    </div>
  );
}

const s = {
  header: { background: '#061228', padding: '16px 32px', borderBottom: '3px solid #0087CC',
    display: 'flex', alignItems: 'center', gap: 16 },
  title:  { fontSize: 22, color: '#fff' },
  sub:    { fontSize: 13, color: '#0087CC', marginLeft: 4 },
  status: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  dot:    { width: 10, height: 10, borderRadius: '50%' },
  badge:  { background: '#0087CC', color: '#fff', fontSize: 11, fontWeight: 'bold',
    padding: '3px 10px', borderRadius: 20 },
};
