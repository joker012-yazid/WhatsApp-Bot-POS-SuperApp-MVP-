'use client';

import { FormEvent, useState } from 'react';

type Ticket = {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignee: string;
};

const initialTickets: Ticket[] = [
  { id: 'TCK-001', subject: 'Permintaan invois', status: 'OPEN', assignee: 'Aida' },
  { id: 'TCK-002', subject: 'Isu pembayaran', status: 'IN_PROGRESS', assignee: 'Ravi' },
  { id: 'TCK-003', subject: 'Follow-up penghantaran', status: 'RESOLVED', assignee: 'Mei' }
];

const statuses: Ticket['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function TicketsPage() {
  const [tickets, setTickets] = useState(initialTickets);
  const [form, setForm] = useState({ subject: '', assignee: '', status: 'OPEN' as Ticket['status'] });
  const [lastCreated, setLastCreated] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.subject.trim() || !form.assignee.trim()) {
      return;
    }
    const id = `TCK-${(tickets.length + 1).toString().padStart(3, '0')}`;
    const ticket: Ticket = { id, subject: form.subject.trim(), status: form.status, assignee: form.assignee.trim() };
    setTickets((current) => [ticket, ...current]);
    setForm({ subject: '', assignee: '', status: 'OPEN' });
    setLastCreated(id);
  };

  return (
    <div className="stats-grid" style={{ gap: '1.5rem' }}>
      <section>
        <h2 className="heading">Tickets</h2>
        <p className="subheading">Status tiket pelanggan merentas saluran.</p>
      </section>

      <section className="stat-card">
        <h3 className="heading">Create Ticket</h3>
        <form className="stats-grid" style={{ gap: '0.75rem' }} onSubmit={handleSubmit} data-testid="ticket-form">
          <label className="label">
            Subject
            <input
              className="input"
              name="subject"
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              data-testid="ticket-subject"
            />
          </label>
          <label className="label">
            Assignee
            <input
              className="input"
              name="assignee"
              value={form.assignee}
              onChange={(event) => setForm((current) => ({ ...current, assignee: event.target.value }))}
              data-testid="ticket-assignee"
            />
          </label>
          <label className="label">
            Status
            <select
              className="input"
              name="status"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Ticket['status'] }))}
              data-testid="ticket-status"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="button-primary" data-testid="ticket-submit">
            Create Ticket
          </button>
        </form>
        {lastCreated ? <p className="subheading">Ticket {lastCreated} created.</p> : null}
      </section>

      <section>
        <table className="table" data-testid="tickets-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.id}</td>
                <td>{ticket.subject}</td>
                <td>{ticket.status}</td>
                <td>{ticket.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
