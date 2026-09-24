import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';
import AuthPage from './pages/AuthPage';

// Views
import AdminDashboard from './components/dashboard/AdminDashboard';
import UserDashboard from './components/dashboard/UserDashboard';
import LeadCheckerStudio from './components/leads/LeadCheckerStudio';
import SessionDetails from './components/leads/SessionDetails';
import MasterDncManager from './components/dnc/MasterDncManager';
import SessionsView from './components/sessions/SessionsView';
import UserManagement from './components/admin/UserManagement';

function MainApp() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(() => (isAdmin ? 'dashboard' : 'leads'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // If a regular (non-admin) user is logged in, ensure they are strictly on 'leads' tab
  useEffect(() => {
    if (user && !isAdmin && activeTab !== 'leads') {
      setActiveTab('leads');
    }
  }, [user, isAdmin, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner message="Loading BLA Checker..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleSelectSession = (sessionId) => {
    setSelectedSessionId(sessionId);
    setActiveTab('leads');
  };

  const handleOpenNewScrub = () => {
    setSelectedSessionId(null);
    setActiveTab('leads');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'leads') setSelectedSessionId(null);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        <Navbar
          activeTab={activeTab}
          onOpenNewScrub={handleOpenNewScrub}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && isAdmin && (
            <AdminDashboard
              onSelectSession={handleSelectSession}
              onOpenNewScrub={handleOpenNewScrub}
            />
          )}

          {activeTab === 'leads' && (
            selectedSessionId ? (
              <SessionDetails
                sessionId={selectedSessionId}
                onBack={() => setSelectedSessionId(null)}
              />
            ) : (
              <LeadCheckerStudio
                onViewSessionDetails={handleSelectSession}
                onScrubComplete={(session) => {
                  console.log('[APP] Scrub complete:', session.id);
                }}
              />
            )
          )}

          {activeTab === 'sessions' && isAdmin && (
            <SessionsView
              onSelectSession={handleSelectSession}
              onOpenNewScrub={handleOpenNewScrub}
            />
          )}

          {activeTab === 'dnc' && isAdmin && <MasterDncManager />}

          {activeTab === 'users' && isAdmin && <UserManagement />}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
