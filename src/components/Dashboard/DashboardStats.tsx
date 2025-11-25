import React from 'react';
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';
import { DashboardStats as Stats } from '../../types';

interface DashboardStatsProps {
  stats: Stats;
  userRole: string;
  onTotalTicketsClick?: () => void;
  onOpenTicketsClick?: () => void;
  onResolvedTicketsClick?: () => void;
  onCriticalTicketsClick?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> =({ stats, userRole, onTotalTicketsClick, onOpenTicketsClick, onResolvedTicketsClick,onCriticalTicketsClick }) => {
  const isExecutive = ['ceo', 'coo', 'cro'].includes(userRole);

  const statCards = [
    {
      label: 'Total Tickets',
      value: stats.totalTickets,
      icon: Ticket,
      color: 'blue',
      change: '+12%',
      show: true,
      onClick: onTotalTicketsClick,
    },
    {
      label: 'Open Tickets',
      value: stats.openTickets,
      icon: Clock,
      color: 'orange',
      change: '+5%',
      show: true,
      onClick:onOpenTicketsClick
    },
    {
      label: 'Critical Tickets',
      value: stats.criticalTickets,
      icon: AlertTriangle,
      color: 'red',
      change: '-2%',
      show: true,
      onClick: () => {
        if (onCriticalTicketsClick) {
          onCriticalTicketsClick();
        }
      }
    },
    {
      label: 'Resolved Tickets',
      value: stats.resolvedTickets,
      icon: CheckCircle,
      color: 'green',
      change: '+8%',
      show: true,
      onClick:onResolvedTicketsClick
    },
    // {
    //   label: 'SLA Breaches',
    //   value: stats.slaBreaches,
    //   icon: Calendar,
    //   color: 'red',
    //   change: '-15%',
    //   show: isExecutive,
    // },
    // {
    //   label: 'Avg Resolution (hrs)',
    //   value: stats.avgResolutionTime,
    //   icon: BarChart3,
    //   color: 'purple',
    //   change: '-10%',
    //   show: isExecutive,
    // },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  const visibleStats = statCards.filter(stat => stat.show);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {visibleStats.map((stat, index) => {
        const Icon = stat.icon;
        const isPositiveChange = stat.change.startsWith('+');

        return (
          <div key={index} className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow ${stat.onClick ? 'cursor-pointer hover:bg-blue-50' : ''
            }`}
            onClick={stat.onClick}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg border ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                <Icon className="h-6 w-6" />
              </div>
              {/* <div className={`text-sm font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </div> */}
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};