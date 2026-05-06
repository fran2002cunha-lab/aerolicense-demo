import { HashRouter, Routes, Route } from 'react-router-dom';
import Header       from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar    from './components/Sidebar';
import ChatPanel  from './components/ChatPanel';
import Dashboard      from './pages/Dashboard';
import PilotDetail    from './pages/PilotDetail';
import UploadPage     from './pages/UploadPage';
import AlertsPage     from './pages/AlertsPage';
import BlockchainDemo from './pages/BlockchainDemo';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
  return (
    <HashRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#030D1A' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
            <ErrorBoundary>
            <Routes>
              <Route path="/"                      element={<Dashboard />} />
              <Route path="/pilots/:id"            element={<PilotDetail />} />
              <Route path="/pilots/:id/upload"     element={<UploadPage />} />
              <Route path="/alerts"                element={<AlertsPage />} />
              <Route path="/blockchain"            element={<BlockchainDemo />} />
              <Route path="/analytics"             element={<AnalyticsPage />} />
            </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <ChatPanel />
    </HashRouter>
  );
}
