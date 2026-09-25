"use client";

import { useEffect, useMemo, useState } from "react";

type InboundMessage = {
  id: string;
  type: string;
  text: string | null;
  receivedAt: string;
};

type OutboundMessage = {
  id: string;
  text: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
};

type Conversation = {
  id: string;
  customerPhone: string;
  status: string;
  lastIntent: string | null;
  lastMessageAt: string;
  messages: InboundMessage[];
  replies: OutboundMessage[];
};

type WhatsAppInboxProps = {
  canWrite: boolean;
  initialConversations: Conversation[];
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Automático",
  HANDED_OFF: "Atendimento humano",
  COMPLETED: "Concluída",
  EXPIRED: "Expirada",
};

export function WhatsAppInbox({
  canWrite,
  initialConversations,
}: WhatsAppInboxProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(
    initialConversations[0]?.id ?? null,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/whatsapp/conversations", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = (await response.json()) as { data: Conversation[] };
    setConversations(body.data);
    setSelectedId((current) =>
      current && body.data.some((entry) => entry.id === current)
        ? current
        : (body.data[0]?.id ?? null),
    );
  }

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const selected =
    conversations.find((entry) => entry.id === selectedId) ?? null;
  const timeline = useMemo(() => {
    if (!selected) return [];
    return [
      ...selected.messages.map((entry) => ({
        id: entry.id,
        direction: "in" as const,
        text: entry.text ?? "Mensagem não textual",
        at: entry.receivedAt,
        status: null,
      })),
      ...selected.replies.map((entry) => ({
        id: entry.id,
        direction: "out" as const,
        text: entry.text,
        at: entry.sentAt ?? entry.createdAt,
        status: entry.status,
      })),
    ].sort(
      (left, right) =>
        new Date(left.at).getTime() - new Date(right.at).getTime(),
    );
  }, [selected]);

  async function sendMessage() {
    if (!selected || !message.trim() || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/whatsapp/conversations/${selected.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Falha ao enviar mensagem.");
      setMessage("");
      setFeedback("Mensagem adicionada à fila de envio.");
      await refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Falha ao enviar mensagem.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resumeAutomation() {
    if (!selected || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/whatsapp/conversations/${selected.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resume" }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Falha ao retomar automação.");
      setFeedback("Conversa devolvida ao atendimento automático.");
      await refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Falha ao retomar automação.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hf-wa-inbox">
      <aside className="hf-wa-list">
        {conversations.length === 0 ? (
          <div className="hf-wa-empty">Nenhuma conversa recebida.</div>
        ) : (
          conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={conversation.id === selectedId ? "is-active" : ""}
              onClick={() => {
                setSelectedId(conversation.id);
                setFeedback(null);
              }}
            >
              <strong>+{conversation.customerPhone}</strong>
              <span>
                {statusLabels[conversation.status] ?? conversation.status}
              </span>
              <time>
                {new Date(conversation.lastMessageAt).toLocaleString("pt-BR")}
              </time>
            </button>
          ))
        )}
      </aside>

      <div className="hf-wa-chat">
        {!selected ? (
          <div className="hf-wa-empty">Selecione uma conversa.</div>
        ) : (
          <>
            <header>
              <div>
                <strong>+{selected.customerPhone}</strong>
                <span>{statusLabels[selected.status] ?? selected.status}</span>
              </div>
              {canWrite && selected.status === "HANDED_OFF" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={resumeAutomation}
                >
                  Retomar automação
                </button>
              )}
            </header>

            <div className="hf-wa-timeline">
              {timeline.map((entry) => (
                <article
                  key={`${entry.direction}-${entry.id}`}
                  className={`is-${entry.direction}`}
                >
                  <p>{entry.text}</p>
                  <small>
                    {new Date(entry.at).toLocaleString("pt-BR")}
                    {entry.status ? ` · ${entry.status}` : ""}
                  </small>
                </article>
              ))}
            </div>

            {canWrite && selected.status === "HANDED_OFF" && (
              <footer>
                <textarea
                  value={message}
                  maxLength={1_000}
                  placeholder="Digite a resposta do atendimento..."
                  onChange={(event) => setMessage(event.target.value)}
                />
                <button
                  type="button"
                  disabled={busy || !message.trim()}
                  onClick={sendMessage}
                >
                  {busy ? "Enviando..." : "Enviar"}
                </button>
              </footer>
            )}
            {feedback && <p className="hf-wa-feedback">{feedback}</p>}
          </>
        )}
      </div>
    </section>
  );
}
