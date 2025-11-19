import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { CreateTicketModal } from '../Tickets/Shared/CreateTicketModal';
import { ClientOnboardingModal } from '../Clients/ClientOnboardingModal';
import { ClientEditModal } from '../Clients/ClientEditModal';
import { ClientProfileView } from '../Clients/ClientProfileView';
import { UserManagementModal } from '../Admin/UserManagementModal';
import { VLTicketEditModal } from '../Tickets/VolumeShortfall/VLTicketEditModal';
import { RUTicketEditModal } from '../Tickets/ResumeUpdate/RUTicketEditModel';
import { Ticket, Client, AssignedUser, User } from '@/types';

interface Props {
  currentUser: User;
  activeView: string;
  setActiveView: (view: string) => void;
  renderMainContent: () => React.ReactNode;
  renderTicketEditModal: (selectedTicket: Ticket | null, selectedView: string) => React.ReactNode;
  isCreateTicketModalOpen: boolean;
  setIsCreateTicketModalOpen: (val: boolean) => void;
  isClientOnboardingModalOpen: boolean;
  setIsClientOnboardingModalOpen: (val: boolean) => void;
  isClientEditModalOpen: boolean;
  setIsClientEditModalOpen: (val: boolean) => void;
  isClientProfileViewOpen: boolean;
  setIsClientProfileViewOpen: (val: boolean) => void;
  isUserManagementModalOpen: boolean;
  setIsUserManagementModalOpen: (val: boolean) => void;
  selectedTicket: Ticket | null;
  selectedClient: Client | null;
  setSelectedClient: (val: Client | null) => void;
  handleLogout: () => void;
  handleCreateTicket: (data: any) => void;
  handleUpdateClient: (data: Client) => void;
  handleUpdateUser: (userId: string, data: any) => void;
  handleDeleteUser: (userId: string) => void;
  fetchData: () => Promise<void>;
  pendingClientsCount: number;
  onViewLabResults?: (labId: string) => void;
  optedJobLinks?: boolean;
}

const AppLayout: React.FC<Props> = ({
  currentUser,
  activeView,
  setActiveView,
  renderMainContent,
  renderTicketEditModal,
  isCreateTicketModalOpen,
  setIsCreateTicketModalOpen,
  isClientOnboardingModalOpen,
  setIsClientOnboardingModalOpen,
  isClientEditModalOpen,
  setIsClientEditModalOpen,
  isClientProfileViewOpen,
  setIsClientProfileViewOpen,
  isUserManagementModalOpen,
  setIsUserManagementModalOpen,
  selectedTicket,
  selectedClient,
  setSelectedClient,
  handleLogout,
  handleCreateTicket,
  handleUpdateClient,
  handleUpdateUser,
  handleDeleteUser,
  fetchData,
  pendingClientsCount,
  onViewLabResults,
  optedJobLinks = false,
}) => {
  // Hide sidebar for clients with opted_job_links = true
  const showSidebar = !(currentUser.role === 'client' && optedJobLinks);
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={currentUser} onLogout={handleLogout} onViewLabResults={onViewLabResults} />

      <div className="flex">
        {showSidebar && (
          <Sidebar
            user={currentUser}
            activeView={activeView}
            onViewChange={setActiveView}
            pendingClientsCount={pendingClientsCount}
          />
        )}
        <main className="flex-1 p-8">
          {renderMainContent()}
        </main>
      </div>

      {/* Modals */}
      <CreateTicketModal
        user={currentUser}
        isOpen={isCreateTicketModalOpen}
        onClose={() => setIsCreateTicketModalOpen(false)}
        onSubmit={handleCreateTicket}
        onTicketCreated={fetchData}
      />

      {renderTicketEditModal(selectedTicket, "edit")}

      <ClientOnboardingModal
        user={currentUser}
        isOpen={isClientOnboardingModalOpen}
        onClose={() => setIsClientOnboardingModalOpen(false)}
        onClientOnboarded={fetchData}
      />

      <ClientEditModal
        client={selectedClient}
        isOpen={isClientEditModalOpen}
        currentUserRole={currentUser.role}
        onClose={() => {
          setIsClientEditModalOpen(false);
          setSelectedClient(null);
        }}
        onSubmit={handleUpdateClient}
      />

      <ClientProfileView
        currentUser={currentUser}
        isOpen={isClientProfileViewOpen}
        onClose={() => setIsClientProfileViewOpen(false)}
      />

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />
    </div>
  );
};

export default AppLayout;
