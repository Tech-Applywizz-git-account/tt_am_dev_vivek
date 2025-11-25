import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

import { Ticket } from '../../../types';

interface TimelineItemProps {
  isResolved: boolean;
  status: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isAttentionNeeded?: boolean;
  date?: string;
}

interface TicketlineItem {
  ticket: Ticket;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  isResolved,
  status,
  description,
  isCompleted,
  isCurrent,
  isAttentionNeeded=false,
  date
}) => {
  const getIcon = () => {
  if (isResolved) return <Check className="h-4 w-4 text-green-500" />;
  if (isAttentionNeeded) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  if (isCurrent) return <Clock className="h-4 w-4 text-blue-500" />;
  if (isCompleted) return <Check className="h-4 w-4 text-green-500" />;
  return <div className="w-2 h-2 bg-gray-300 rounded-full" />;
};


  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center mr-4">
        <div className={`p-2 rounded-full ${
          isAttentionNeeded ? 'bg-yellow-100' :
          isCurrent ? 'bg-blue-100' : 
          isCompleted ? 'bg-green-100' : 'bg-gray-100'
        }`} >
          {getIcon()}
        </div>
        <div className={`w-0.5 h-full ${
          isCompleted ? 'bg-green-500' : 'bg-gray-200'
        }`}></div>
      </div>
      
      <div className={`pb-6 ${
        isAttentionNeeded ? 'text-yellow-600' :
        isCurrent ? 'text-blue-600' : ''
      } font-medium`}>
        <div className="flex items-center gap-2">
          <h3 className="text-lg">{status}</h3>
          {isCurrent && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              isAttentionNeeded ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              Current
            </span>
          )}
        </div>
        <p className="text-gray-600">{description}</p>
        {date && <p className="text-sm text-gray-500 mt-1">{date}</p>}
      </div>
    </div>
  );
};

export default TimelineItem;
