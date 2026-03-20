/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import PortalLayout from './components/PortalLayout';
import Layout from './components/Layout';
import TicketList from './components/TicketList';
import NewTicket from './components/NewTicket';
import TicketDetail from './components/TicketDetail';
import Dashboard from './components/Dashboard';
import AdminSettings from './components/AdminSettings';

function PortalContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const navigate = useNavigate();

  // Protect the portal by ensuring the user matches the expected role for the portal they are viewing
  // OR redirect them to their actual portal
  // Initialize view once on load or when path changes significantly
  React.useEffect(() => {
    if (user) {
      const currentPath = window.location.pathname;

      if (user.role === 'provider' && !currentPath.startsWith('/prestador')) {
        navigate('/prestador');
      } else if (user.role === 'client' && !currentPath.startsWith('/cliente')) {
        navigate('/cliente');
      }
      
      // Only set initial view if none is selected
      if (!selectedTicketId) {
        if (currentPath.startsWith('/admin')) setCurrentView('dashboard');
        else setCurrentView('tickets');
      }
    }
  }, [user?.id, navigate]); // Use user.id to be more stable than the whole user object

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedTicketId(null);
  };

  const renderContent = () => {
    if (selectedTicketId) {
      return <TicketDetail ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tickets':
        return <TicketList onSelectTicket={setSelectedTicketId} filter={currentView} />;
      case 'new-ticket':
        return <NewTicket onSuccess={() => handleNavigate('tickets:all')} />;
      case 'settings':
        return <AdminSettings />;
      case 'profile':
        return <AdminSettings isProfileOnly={true} />;
      default:
        if (currentView.startsWith('tickets:')) {
          return <TicketList onSelectTicket={setSelectedTicketId} filter={currentView} />;
        }
        return <TicketList onSelectTicket={setSelectedTicketId} filter="tickets:all" />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate} onSelectTicket={setSelectedTicketId}>
      {renderContent()}
    </Layout>
  );
}

// Wrapper to provide AuthContext for a specific portal
function PortalApp({ role }: { role: string }) {
  return (
    <AuthProvider role={role}>
      <PortalContent />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Condômino Portal */}
        <Route path="/cliente/*" element={
          <PortalLayout 
            publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_CLIENTE} 
            portalName="Condômino"
            signInUrl="/cliente"
          />
        }>
          <Route index element={<PortalApp role="client" />} />
        </Route>

        {/* Prestador Portal */}
        <Route path="/prestador/*" element={
          <PortalLayout 
            publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_PRESTADOR} 
            portalName="Operarum"
            signInUrl="/prestador"
          />
        }>
          <Route index element={<PortalApp role="provider" />} />
        </Route>

        {/* Admin Portal */}
        <Route path="/admin/*" element={
          <PortalLayout 
            publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_ADMIN} 
            portalName="Administrador"
            signInUrl="/admin"
          />
        }>
          <Route index element={<PortalApp role="admin" />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

