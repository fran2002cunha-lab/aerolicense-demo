import { c } from '../theme';

export default function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '60px 0', gap: 10 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: `3px solid ${c.border}`,
        borderTopColor: c.primaryLt,
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: c.textMuted, fontSize: 13, fontWeight: 500 }}>A carregar...</span>
    </div>
  );
}
