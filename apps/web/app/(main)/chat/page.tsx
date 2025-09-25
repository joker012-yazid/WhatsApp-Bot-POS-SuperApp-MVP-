'use client';

import { useMemo, useState } from 'react';

type Conversation = {
  customer: string;
  lastMessage: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  updatedAt: string;
};

const initialConversations: Conversation[] = [
  {
    customer: 'Aina',
    lastMessage: 'Boleh saya dapatkan status pesanan?',
    sentiment: 'Neutral',
    updatedAt: '09:20'
  },
  {
    customer: 'Daniel',
    lastMessage: 'Terima kasih! Barang dah sampai.',
    sentiment: 'Positive',
    updatedAt: '08:55'
  }
];

export default function ChatPage() {
  const [conversations, setConversations] = useState(initialConversations);

  const totals = useMemo(() => {
    const counts = conversations.reduce(
      (acc, item) => {
        acc[item.sentiment] += 1;
        return acc;
      },
      { Positive: 0, Neutral: 0, Negative: 0 }
    );

    return counts;
  }, [conversations]);

  const addDummyInbound = () => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    setConversations((current) => [
      {
        customer: `Guest ${current.length + 1}`,
        lastMessage: 'Hello! Saya mahu tahu promosi terbaru.',
        sentiment: 'Neutral',
        updatedAt: time
      },
      ...current
    ]);
  };

  return (
    <div className="stats-grid" style={{ gap: '1.5rem' }}>
      <section>
        <h2 className="heading">Chat Operations</h2>
        <p className="subheading">
          Monitor multi-session WhatsApp engagements dan tambah mesej inbound dummy untuk ujian
          aliran e2e.
        </p>
        <button
          type="button"
          className="button-primary"
          onClick={addDummyInbound}
          data-testid="chat-add-dummy"
        >
          Tambah Dummy Inbound
        </button>
      </section>

      <section className="stat-card">
        <h3 className="heading">Sentiment Snapshot</h3>
        <ul className="list">
          <li>Positive: {totals.Positive}</li>
          <li>Neutral: {totals.Neutral}</li>
          <li>Negative: {totals.Negative}</li>
        </ul>
      </section>

      <section>
        <table className="table" data-testid="chat-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Last Message</th>
              <th>Sentiment</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((conversation) => (
              <tr key={`${conversation.customer}-${conversation.updatedAt}`}>
                <td>{conversation.customer}</td>
                <td>{conversation.lastMessage}</td>
                <td>{conversation.sentiment}</td>
                <td>{conversation.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
