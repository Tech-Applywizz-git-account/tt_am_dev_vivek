import React, { useState } from 'react';
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
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { User } from '../../types';
import { rolePermissions } from '../../data/mockData';

interface SidebarProps {
  user: User;
  activeView: string;
  onViewChange: (view: string) => void;
  pendingClientsCount: number;
  optedJobLinks?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeView, onViewChange, pendingClientsCount, optedJobLinks }) => {
  const permissions = rolePermissions[user.role];
  const [contractJobsExpanded, setContractJobsExpanded] = useState(true); // Expanded by default
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
      show: user.role === 'client',
    },
    {
      id: 'regular-applications',
      label: 'Career Portal Applications',
      icon: Briefcase,
      show: user.role === 'client',
    },
    {
      id: 'easy-apply',
      label: 'Easy Apply',
      icon: Zap,
      show: user.role === 'client',
    },
    {
      id: 'applied-jobs',
      label: 'Applied Jobs',
      icon: CheckCircle,
      show: user.role === 'client',
    },
    {
      id: 'staffing-agencies',
      label: 'Staffing Agencies',
      icon: Building2,
      show: user.role === 'client',
    },
    {
      id: 'contract-jobs',
      label: 'Contract Jobs',
      icon: FileText,
      show: user.role === 'client',
      isExpandable: true,
      children: [
        {
          id: 'contract-jobs-c2c',
          label: 'C2C',
          icon: DollarSign,
        },
        {
          id: 'contract-jobs-w2',
          label: 'W2',
          icon: Briefcase,
        },
        {
          id: 'contract-jobs-c2c-w2',
          label: 'C2C,W2',
          icon: RefreshCw,
        },
      ],
    },
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
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      show: user.role === 'system_admin',
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <div className="space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const hasNotification = item.hasNotification;
            const isExpandable = item.isExpandable;
            const isExpanded = contractJobsExpanded && item.id === 'contract-jobs';

            return (
              <div key={item.id}>
                {/* Parent Menu Item */}
                <button
                  onClick={() => {
                    if (isExpandable) {
                      setContractJobsExpanded(!contractJobsExpanded);
                    } else {
                      onViewChange(item.id);
                    }
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-200 relative
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${hasNotification ? 'border border-red-200' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {hasNotification && (
                    <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                  {isExpandable && (
                    isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                  )}
                </button>

                {/* Child Menu Items (for expandable menus) */}
                {isExpandable && isExpanded && item.children && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child: any) => {
                      const ChildIcon = child.icon;
                      const isChildActive = activeView === child.id;

                      return (
                        <button
                          key={child.id}
                          onClick={() => onViewChange(child.id)}
                          className={`
                            w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200
                            ${isChildActive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }
                          `}
                        >
                          <ChildIcon className={`h-4 w-4 ${isChildActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="font-medium text-sm">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
