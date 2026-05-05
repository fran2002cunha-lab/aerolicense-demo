export default function ApiOfflineBanner() {
  return (
    <div style={{
      background: '#4A0A0A', border: '1px solid #E74C3C', borderRadius: 8,
      padding: '12px 16px', color: '#E74C3C', fontSize: 13, margin: '16px 0',
    }}>
      ❌ API offline — corre <code style={{ background: '#2C0A0A', padding: '2px 6px', borderRadius: 4 }}>
        uvicorn main:app --reload
      </code> no terminal.
    </div>
  );
}
