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
  CreditCard,
  ArrowRight,
  LogOut,
  ChevronDown,
  ChevronUp,
  Headphones,
  Phone,
  UserX,
  CalendarDays,
  Activity
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
  onOpenSupport: (type: 'call' | 'cancel') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeView, onViewChange, pendingClientsCount, optedJobLinks, onLogout, onOpenSupport }) => {
  const permissions = rolePermissions[user.role];
  const [countdown, setCountdown] = useState('01:34:30');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

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
    // {
    //   id: 'indeed-easy-apply',
    //   label: 'Quick Apply via Indeed',
    //   icon: Briefcase,
    //   show: user.role === 'client',
    // },
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
      id: 'am-call-calendar',
      label: 'Call Calendar',
      icon: CalendarDays,
      show: user.role === 'account_manager',
    },
    {
      id: 'call-monitoring',
      label: 'Call Monitoring',
      icon: Activity,
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
      id: 'job-tracking',
      label: 'Job Tracking',
      icon: Briefcase,
      show: user.role === 'client' && !optedJobLinks,
    },
    {
      id: 'pricing',
      label: 'Pricing Plan',
      icon: CreditCard,
      show: (user.role === 'client') && (optedJobLinks),
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


        {/* JobBoard Analytics Module */}
        {['cro', 'coo', 'ceo', 'system_admin'].includes(user.role) && (
          <div className="mt-4 px-3">
            <button
              onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
              className="w-full flex items-center justify-between py-2 text-gray-600 hover:text-black transition-colors"
            >
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-sm">JobBoard Analytics</span>
              </div>
              {isAnalyticsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isAnalyticsOpen && (
              <div className="mt-1 ml-8 space-y-1 animate-in slide-in-from-top-1 duration-200">
                <button
                  onClick={() => onViewChange('jobboard-dashboard')}
                  className={`w-full flex items-center space-x-3 py-2 text-sm transition-colors ${activeView === 'jobboard-dashboard' ? 'text-black font-medium' : 'text-gray-500 hover:text-black'}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => onViewChange('jobboard-tickets')}
                  className={`w-full flex items-center space-x-3 py-2 text-sm transition-colors ${activeView === 'jobboard-tickets' ? 'text-black font-medium' : 'text-gray-500 hover:text-black'}`}
                >
                  <Ticket className="h-4 w-4" />
                  <span>JobBoard tickets</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Support Module removed and moved to FeedbackButton */}

        {/* ATS Resume Card */}
        {(user.role === 'client') && (optedJobLinks) && (
          <div
            className="mt-4 rounded-lg p-2 cursor-pointer hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #171717 0%, #171717 30%, #816D46 50%, #171717 70%, #3F3F3F 100%)',
              backgroundSize: '200% 100%',
              animation: 'shine 3s ease-in-out infinite'
            }}
            onClick={() => {
              window.open('https://atsresume.apply-wizz.me/', '_blank');
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
        )}

        {/* Logout Button */}
        {onLogout && (
          <div className="mt-16">
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 text-gray-600 hover:bg-white hover:text-black"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

