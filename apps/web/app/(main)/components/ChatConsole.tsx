'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dictionary } from '../../lib/i18n';

type ChatMessage = {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: string;
};

type ChatThread = {
  id: string;
  sessionId: string;
  customerName: string;
  phone: string;
  lastMessage: string;
  unread: number;
  updatedAt: string;
  messages: ChatMessage[];
  profile: {
    branch: string;
    tags: string[];
  };
  ticket?: {
    id: string;
    status: string;
    assignee: string;
    lastUpdate: string;
  };
  aiSuggestions: string[];
};

type Metrics = {
  queueDepth: number;
  sendRate: number;
};

type WsEvent =
  | { type: 'qr'; sessionId: string; qr: string }
  | { type: 'connected'; id: string }
  | { type: 'status'; sessionId: string; state: string };

type ChatConsoleProps = {
  threads: ChatThread[];
  dict: Dictionary;
  wsUrl: string;
  metrics: Metrics;
};

type QREntry = {
  sessionId: string;
  content: string;
  receivedAt: string;
};

export function ChatConsole({ threads, dict, wsUrl, metrics }: ChatConsoleProps) {
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(threads[0] ?? null);
  const [wsState, setWsState] = useState<'connected' | 'disconnected'>('disconnected');
  const [qrFeed, setQrFeed] = useState<QREntry[]>([]);

  useEffect(() => {
    if (!wsUrl) {
      return;
    }
    let active = true;
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      if (!active) return;
      setWsState('connected');
    };
    socket.onclose = () => {
      if (!active) return;
      setWsState('disconnected');
    };
    socket.onerror = () => {
      if (!active) return;
      setWsState('disconnected');
    };
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WsEvent;
        if (payload.type === 'qr') {
          setQrFeed((prev) => [
            {
              sessionId: payload.sessionId,
              content: payload.qr,
              receivedAt: new Date().toISOString()
            },
            ...prev
          ]);
        }
      } catch (error) {
        console.warn('[ws] unable to parse', error);
      }
    };

    return () => {
      active = false;
      socket.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    if (!selectedThread && threads.length > 0) {
      setSelectedThread(threads[0]);
    }
  }, [threads, selectedThread]);

  const ticketBadgeClass = useMemo(() => {
    if (!selectedThread?.ticket) return 'badge';
    return `badge status-${selectedThread.ticket.status.toLowerCase()}`;
  }, [selectedThread]);

  return (
    <div className="chat-console">
      <aside className="chat-column">
        <header className="card" style={{ borderRadius: 0 }}>
          <strong>Sessions ({threads.length})</strong>
          <small>
            {dict.wsConnected}: {metrics.sendRate.toFixed(1)} msg/s · Queue {metrics.queueDepth}
          </small>
          <small>{wsState === 'connected' ? dict.wsConnected : dict.wsDisconnected}</small>
        </header>
        <ul className="chat-list scrollable">
          {threads.map((thread) => {
            const isActive = selectedThread?.id === thread.id;
            return (
              <li
                key={thread.id}
                className={`chat-list__item${isActive ? ' active' : ''}`}
                onClick={() => setSelectedThread(thread)}
              >
                <strong>{thread.customerName}</strong>
                <div>{thread.lastMessage}</div>
                <small>
                  {new Date(thread.updatedAt).toLocaleTimeString('ms-MY', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {thread.unread > 0 ? ` · ${thread.unread} new` : ''}
                </small>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="chat-column">
        {selectedThread ? (
          <div className="chat-messages">
            {selectedThread.messages.map((message) => (
              <div
                key={message.id}
                className={`chat-bubble${message.fromMe ? ' me' : ''}`}
                title={new Date(message.timestamp).toLocaleString('ms-MY')}
              >
                {message.text}
              </div>
            ))}
          </div>
        ) : (
          <div className="chat-messages flex flex-center">
            <p>{dict.selectThread}</p>
          </div>
        )}
      </section>

      <aside className="chat-column chat-profile">
        {selectedThread ? (
          <>
            <div>
              <h3 className="section-heading">{dict.profile}</h3>
              <p>{selectedThread.customerName}</p>
              <small>{selectedThread.phone}</small>
              <small>Branch: {selectedThread.profile.branch}</small>
              <div className="language-group" style={{ marginTop: '0.5rem' }}>
                {selectedThread.profile.tags.map((tag) => (
                  <span key={tag} className="badge">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="section-heading">{dict.linkedTicket}</h3>
              {selectedThread.ticket ? (
                <div className="ticket-card">
                  <span className="ticket-card__id">{selectedThread.ticket.id}</span>
                  <span className={ticketBadgeClass}>{selectedThread.ticket.status}</span>
                  <div className="ticket-card__meta">
                    <span>
                      {dict.assignedTo}: {selectedThread.ticket.assignee}
                    </span>
                    <span>
                      {dict.lastUpdated}:{' '}
                      {new Date(selectedThread.ticket.lastUpdate).toLocaleDateString('ms-MY', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <small>{dict.openTickets}: 0</small>
              )}
            </div>
            <div>
              <h3 className="section-heading">{dict.aiSuggestions}</h3>
              <ul className="list">
                {selectedThread.aiSuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
        <div>
          <h3 className="section-heading">{dict.qrFeed}</h3>
          <div className="qr-feed">
            {qrFeed.length === 0 && <small>{dict.wsDisconnected}</small>}
            {qrFeed.map((entry, index) => (
              <div key={index} className="qr-feed__item">
                <strong>{entry.sessionId}</strong>
                <code>{entry.content}</code>
                <small>{new Date(entry.receivedAt).toLocaleTimeString('ms-MY')}</small>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
