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

const JobBoardTicketTimeline: React.FC<TicketTimelineProps> = ({ ticket }) => {
    const getStatusSequence = (): StatusStep[] => {
        const baseSequence: StatusStep[] = [
            {
                id: 'open',
                title: 'Ticket Created',
                description: 'Client created the ticket',
                date: ticket.createdat
            },
            {
                id: 'forwarded',
                title: 'Forwarded',
                description: 'Ticket assigned to sales representative',
            },
            {
                id: 'closed',
                title: 'Closed',
                description: 'Team provided a resolution',
            },
            {
                id: 'resolved',
                title: 'Resolved',
                description: 'Client confirmed the resolution',
            }
        ];
        return baseSequence;
    };

    const statusSteps = getStatusSequence();
    const currentStatusIndex = statusSteps.findIndex(
        step => step.id === ticket.status
    );
    const isResolved = ticket.status === 'resolved';

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
                        isCompleted={index < currentStatusIndex}
                        isCurrent={index === currentStatusIndex}
                        date={step.date ? new Date(step.date).toLocaleString() : undefined}
                    />
                ))}
            </div>
        </div>
    );
};

export default JobBoardTicketTimeline;
