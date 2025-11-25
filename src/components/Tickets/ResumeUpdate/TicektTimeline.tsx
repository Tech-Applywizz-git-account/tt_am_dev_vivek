
// TicketTimeline.tsx
import React from 'react';
import TimelineItem from './TimelineItem';
import { Ticket } from '../../../types';

interface StatusStep {
    id: string;
    title: string;
    description: string;
    date?: Date;
    isAttentionNeeded?: boolean;
}

interface TicketTimelineProps {
    ticket: Ticket;
}

// Define a functional component called TicketTimeline which takes in a prop called ticket
const TicketTimeline: React.FC<TicketTimelineProps> = ({ ticket }) => {
    const getStatusSequence = (): StatusStep[] => {
        const baseSequence: StatusStep[] = [
            {
        id: 'open',
        title: 'Ticket Created',
        description: 'Client initiated the ticket',
        date: ticket.createdat,
      },
      {
        id: 'forwarded',
        title: 'Forwarded to Team',
        description: 'Assigned to resume team ',
      },
      {
        id: 'replied',
        title: 'Team Responded',
        description: 'Updated resume submitted by team',
      },
      {
        id: 'pending_client_review',
        title: 'Client Review',
        description: 'Awaiting client response',
      },
      {
        id: 'resolved',
        title: 'Resolved',
        description: 'Ticket closed upon client approval',
      },
    ];
       if (ticket.status === 'reopen') {
      baseSequence.splice(0, 1, {
        id: 'reopen',
        title: 'Reopened',
        description: 'Ticket reopened for more changes',
      });
    }
    if (ticket.status === 'resolved') {
            baseSequence.push({
                id: 'resolved',
                title: 'Resolved',
                description: 'Ticket fully resolved',
            });
        }


        // If ticket is resolved finally
       
        return baseSequence;
    };

    const statusSteps = getStatusSequence();
    const currentStatusIndex = statusSteps.findIndex(step => 
    step.id === ticket.status || 
    (ticket.status === 'closed' && step.id === 'closed')
);

    // console.log('Current Status Index:', currentStatusIndex);
    // console.log('Status Steps:', statusSteps);
    const isResolved = ticket.status === 'resolved';
    // console.log('resolved:', isResolved);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ticket Status Timeline</h2>
            <div className="space-y-2">
                {statusSteps.map((step, index) => (
                    <TimelineItem
                        isResolved={isResolved}
                        key={step.id}
                        status={step.title}
                        description={step.description}
                        isCompleted={ticket.status === 'open' ? index < currentStatusIndex + 1 : index < currentStatusIndex}
                        isCurrent={ticket.status === 'open' ? index === currentStatusIndex + 1 : index === currentStatusIndex}
                        isAttentionNeeded={step.isAttentionNeeded}
                        date={step.date ? new Date(step.date).toLocaleString() : undefined}
                    />
                ))}
            </div>
        </div>
    );
};

export default TicketTimeline;