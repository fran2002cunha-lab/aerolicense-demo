import { useState } from 'react';
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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!sessionStorage.getItem('aero_role')
  );
  const [activeRole, setActiveRole] = useState(
    () => sessionStorage.getItem('aero_role') || null
  );

  function handleLogin(role) {
    sessionStorage.setItem('aero_role', role);
    setActiveRole(role);
    setIsLoggedIn(true);
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020B16' }}>
        <Header activeRole={activeRole} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
            <ErrorBoundary>
              <Routes>
                <Route path="/"                  element={<Dashboard />} />
                <Route path="/pilots/:id"        element={<PilotDetail />} />
                <Route path="/pilots/:id/upload" element={<UploadPage />} />
                <Route path="/alerts"            element={<AlertsPage />} />
                <Route path="/blockchain"        element={<BlockchainDemo />} />
                <Route path="/analytics"         element={<AnalyticsPage />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <ChatPanel />
    </HashRouter>
  );
}
