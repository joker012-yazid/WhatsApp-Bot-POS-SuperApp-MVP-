'use client';

import type { Dictionary } from '../../lib/i18n';

type Ticket = {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignee: string;
  updatedAt: string;
};

type TicketBoardProps = {
  tickets: Ticket[];
  dict: Dictionary;
};

const columns: Ticket['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function TicketBoard({ tickets, dict }: TicketBoardProps) {
  return (
    <div className="ticket-board">
      {columns.map((status) => {
        const grouped = tickets.filter((ticket) => ticket.status === status);
        return (
          <div key={status} className="ticket-column">
            <h3 className="section-heading">{status.replace('_', ' ')}</h3>
            {grouped.length === 0 && <small>{dict.openTickets}: 0</small>}
            {grouped.map((ticket) => (
              <article key={ticket.id} className="ticket-card">
                <span className="ticket-card__id">{ticket.id}</span>
                <span className={`badge status-${status.toLowerCase()}`}>{status}</span>
                <p>{ticket.subject}</p>
                <div className="ticket-card__meta">
                  <span>
                    {dict.assignedTo}: {ticket.assignee}
                  </span>
                  <span>
                    {dict.lastUpdated}:{' '}
                    {new Date(ticket.updatedAt).toLocaleDateString('ms-MY', {
                      day: '2-digit',
                      month: 'short'
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        );
      })}
    </div>
  );
}
