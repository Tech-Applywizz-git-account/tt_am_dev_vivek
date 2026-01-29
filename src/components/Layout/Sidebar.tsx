import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Ticket,
  Users,
  FileText,
  BarChart3,
  Settings,
  UserPlus,
  Search,
  AlertTriangle,
  Clock,
  TrendingUp,
  User as UserIcon,
  Zap,
  Briefcase,
  CheckCircle,
  Building2,
  DollarSign,
  RefreshCw,
  Linkedin,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { User } from '../../types';
import { rolePermissions } from '../../data/mockData';

interface SidebarProps {
  user: User;
  activeView: string;
  onViewChange: (view: string) => void;
  pendingClientsCount: number;
  optedJobLinks?: boolean;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeView, onViewChange, pendingClientsCount, optedJobLinks, onLogout }) => {
  const permissions = rolePermissions[user.role];
  const [countdown, setCountdown] = useState('01:34:30');

  // Countdown timer for ATS Resume card
  useEffect(() => {
    let timeInSeconds = 1 * 3600 + 34 * 60 + 30; // 01:34:30

    const timer = setInterval(() => {
      if (timeInSeconds <= 0) {
        clearInterval(timer);
        return;
      }

      timeInSeconds--;
      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);
      const seconds = timeInSeconds % 60;

      setCountdown(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // console.log(permissions)
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'tickets',
      label: 'Tickets',
      icon: Ticket,
      show: !optedJobLinks,
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      show: permissions.canViewClients,
    },
    {
      id: 'profile',
      label: 'View Profile',
      icon: UserIcon,
      show: user.role === 'client' && !optedJobLinks,
    },
    {
      id: 'regular-applications',
      label: 'Career Portal Applications',
      icon: '/career-img.svg',
      isCustomImage: true,
      show: user.role === 'client',
    },
    // {
    //   id: 'easy-apply',
    //   label: 'Easy Apply',
    //   icon: Zap,
    //   show: (user.role === 'client') && (!optedJobLinks),
    // },
    {
      id: 'linkedin-easy-apply',
      label: 'Quick Apply via LinkedIn',
      icon: Linkedin,
      show: user.role === 'client',
    },
    {
      id: 'indeed-easy-apply',
      label: 'Quick Apply via Indeed',
      icon: Briefcase,
      show: optedJobLinks,
    },
    {
      id: 'staffing-agencies',
      label: 'Staffing Agencies',
      icon: '/staff-img.svg',
      isCustomImage: true,
      show: user.role === 'client',
    },
    {
      id: 'contract-jobs-c2c',
      label: 'C2C',
      icon: '/c2c-img.svg',
      isCustomImage: true,
      show: user.role === 'client',
    },
    {
      id: 'contract-jobs-w2',
      label: 'W2',
      icon: DollarSign,
      show: user.role === 'client',
    },
    // {
    //   id: 'contract-jobs-c2c-w2',
    //   label: 'C2C,W2',
    //   icon: RefreshCw,
    //   show: optedJobLinks,
    // },
    {
      id: "pending_onboarding",
      label: "Pending Onboarding",
      icon: UserPlus,
      show: ["cro", "ceo", "coo", "resume_team_head", "ca_team_lead", "account_manager"].includes(user.role),
      hasNotification: pendingClientsCount > 0,
    },
    {
      id: 'reports',
      label: 'Report',
      icon: BarChart3,
      show: permissions.canViewReports,
    },
    // {
    //   id: 'sla-monitor',
    //   label: 'SLA Monitor',
    //   icon: Clock,
    //   show: ['cro', 'coo', 'ceo', 'cro_manager'].includes(user.role),
    // },
    {
      id: 'escalations',
      label: 'Escalations',
      icon: AlertTriangle,
      show: ['cro', 'coo', 'ceo'].includes(user.role),
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: UserPlus,
      show: permissions.canManageUsers,
    },
    {
      id: 'applied-jobs',
      label: 'Applied Jobs',
      icon: CheckCircle,
      show: user.role === 'client',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      show: user.role === 'system_admin',
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <div className="w-72 h-screen sticky top-0 overflow-y-auto rounded-r-2xl flex flex-col" style={{ backgroundColor: '#F1FFF3' }}>
      <div className="p-4 flex-1">
        {/* Menu Items */}
        <div className="space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const hasNotification = item.hasNotification;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 relative
                  ${isActive
                    ? 'bg-white text-black'
                    : 'text-gray-600 hover:bg-white hover:text-black'
                  }
                  ${hasNotification ? 'border border-red-200' : ''}
                `}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {item.isCustomImage ? (
                    <img src={item.icon as string} alt="" className={`h-5 w-5 flex-shrink-0 ${isActive ? 'brightness-0' : 'opacity-60'}`} />
                  ) : (
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-black-600' : 'text-gray-400'}`} />
                  )}
                  <span className="font-medium text-sm break-words">{item.label}</span>
                </div>
                {hasNotification && (
                  <span className="h-2 w-2 bg-red-500 rounded-full flex-shrink-0 ml-2"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* ATS Resume Card */}
        <div
          className="mt-4 rounded-lg p-2 cursor-pointer hover:opacity-90 transition-all"
          style={{
            background: 'linear-gradient(90deg, #171717 0%, #171717 30%, #816D46 50%, #171717 70%, #3F3F3F 100%)',
            backgroundSize: '200% 100%',
            animation: 'shine 3s ease-in-out infinite'
          }}
          onClick={() => {
            // Add navigation logic here
            console.log('Navigate to ATS Resume');
          }}
        >
          <div className="flex items-center justify-between rounded-lg p-3" >
            <div>
              <h3 className="text-white font-semibold text-sm">ATS RESUME</h3>
              <p className="text-gray-300 text-xs mt-1">Offer ends in {countdown}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="mt-3 w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 text-gray-600 hover:bg-white hover:text-black"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
};
