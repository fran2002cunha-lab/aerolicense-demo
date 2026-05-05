import { HashRouter, Routes, Route } from 'react-router-dom';
import Header     from './components/Header';
import Sidebar    from './components/Sidebar';
import Dashboard      from './pages/Dashboard';
import PilotDetail    from './pages/PilotDetail';
import UploadPage     from './pages/UploadPage';
import AlertsPage     from './pages/AlertsPage';
import BlockchainDemo from './pages/BlockchainDemo';

export default function App() {
  return (
    <HashRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1100 }}>
            <Routes>
              <Route path="/"                      element={<Dashboard />} />
              <Route path="/pilots/:id"            element={<PilotDetail />} />
              <Route path="/pilots/:id/upload"     element={<UploadPage />} />
              <Route path="/alerts"                element={<AlertsPage />} />
              <Route path="/blockchain"            element={<BlockchainDemo />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
