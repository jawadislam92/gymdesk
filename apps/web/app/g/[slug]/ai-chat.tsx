'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}
interface ChatResponse {
  enabled: boolean;
  reply: string;
  leadCaptured: boolean;
}

/**
 * Floating AI receptionist widget for the public gym page.
 * Renders nothing unless the backend reports the assistant is configured
 * (i.e. the gym's owner has added an Anthropic key) — same dormant-until-keyed
 * pattern as the Stripe "Pay by card" button.
 */
export function AiChat({ slug, gymName }: { slug: string; gymName: string }) {
  const [open, setOpen] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: `Hi! 👋 I'm the ${gymName} assistant. Ask me about plans, classes, or booking a free trial — I'm happy to help.`,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const statusQ = useQuery({
    queryKey: ['ai-status', slug],
    queryFn: () =>
      apiFetch<{ enabled: boolean; gymName: string }>(`/public/gyms/${slug}/ai/status`, { auth: false }),
  });

  const send = useMutation({
    mutationFn: (convo: Msg[]) =>
      apiFetch<ChatResponse>(`/public/gyms/${slug}/ai/chat`, {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ messages: convo }),
      }),
    onSuccess: (r) => {
      setMessages((m) => [...m, { role: 'assistant', content: r.reply }]);
      if (r.leadCaptured) setCaptured(true);
    },
    onError: () =>
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sorry, something went wrong — please try again in a moment.' },
      ]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, send.isPending]);

  if (!statusQ.data?.enabled) return null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('msg') as HTMLInputElement;
    const text = input.value.trim();
    if (!text || send.isPending) return;
    input.value = '';
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    // Drop the seeded greeting so the payload starts with a user turn; cap length
    // to stay within the backend's per-request message limit.
    let convo = next.slice(1).slice(-20);
    if (convo[0]?.role === 'assistant') convo = convo.slice(1);
    send.mutate(convo);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div>
              <div className="text-sm font-semibold">{gymName} assistant</div>
              <div className="text-[11px] text-white/80">Ask us anything — replies in seconds</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-brand text-white' : 'bg-white text-slate-700 shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {send.isPending && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
                </div>
              </div>
            )}
            {captured && (
              <div className="text-center text-[11px] font-medium text-green-600">
                ✓ Your details were shared with the team
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
            <input
              name="msg"
              autoComplete="off"
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={send.isPending}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:bg-brand-dark hover:shadow-xl"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
