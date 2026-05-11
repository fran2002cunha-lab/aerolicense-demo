import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header        from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar       from './components/Sidebar';
import ChatPanel     from './components/ChatPanel';
import Dashboard     from './pages/Dashboard';
import PilotDetail   from './pages/PilotDetail';
import UploadPage    from './pages/UploadPage';
import AlertsPage    from './pages/AlertsPage';
import BlockchainDemo from './pages/BlockchainDemo';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage     from './pages/LoginPage';
import AboutPage     from './pages/AboutPage';
import { onApiStatusChange } from './api';
import { c } from './theme';

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 700);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 700);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!sessionStorage.getItem('aero_role')
  );
  const [activeRole, setActiveRole] = useState(
    () => sessionStorage.getItem('aero_role') || null
  );
  const [apiOffline,    setApiOffline]    = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    return onApiStatusChange(online => setApiOffline(!online));
  }, []);

  /* Fecha sidebar automaticamente ao redimensionar para mobile */
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  function handleLogin(role) {
    sessionStorage.setItem('aero_role', role);
    setActiveRole(role);
    setIsLoggedIn(true);
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const showSidebar = !isMobile || sidebarOpen;

  return (
    <HashRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020B16' }}>
        <Header
          activeRole={activeRole}
          onMenuToggle={isMobile ? () => setSidebarOpen(o => !o) : null}
          menuOpen={sidebarOpen}
        />

        {/* Offline banner */}
        {apiOffline && (
          <div role="alert" style={{
            background: `${c.red}18`, borderBottom: `1px solid ${c.red}35`,
            padding: '8px 24px', fontSize: 12, color: c.red,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠️</span>
            <span><strong>API offline</strong> — dados podem estar desatualizados. A tentar reconectar…</span>
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Overlay on mobile when sidebar open */}
          {isMobile && sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 50,
                background: 'rgba(0,0,0,.55)',
              }}
            />
          )}

          {showSidebar && (
            <div style={isMobile ? {
              position: 'fixed', top: 64, bottom: 0, left: 0, zIndex: 60,
            } : {}}>
              <Sidebar onNavigate={isMobile ? () => setSidebarOpen(false) : null} />
            </div>
          )}

          <main
            id="main-content"
            style={{
              flex: 1,
              padding: isMobile ? '16px' : '28px 32px',
              overflowY: 'auto',
            }}
          >
            <ErrorBoundary>
              <Routes>
                <Route path="/"                  element={<Dashboard />} />
                <Route path="/pilots/:id"        element={<PilotDetail />} />
                <Route path="/pilots/:id/upload" element={<UploadPage />} />
                <Route path="/alerts"            element={<AlertsPage />} />
                <Route path="/blockchain"        element={<BlockchainDemo />} />
                <Route path="/analytics"         element={<AnalyticsPage />} />
                <Route path="/sobre"             element={<AboutPage />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <ChatPanel />
    </HashRouter>
  );
}
