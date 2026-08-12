'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── types ── */

export interface TaskComment {
  id:        string;
  author:    string;
  initials:  string;
  text:      string;
  createdAt: Date;
}

interface Props {
  open:     boolean;
  onClose:  () => void;
  taskName: string;
  comments: TaskComment[];
  onAdd:    (text: string) => void;
}

/* ── avatar colors — deterministic by author name ── */

const AVATAR_PALETTE = [
  { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { bg: 'bg-rose-100',    text: 'text-rose-600'    },
  { bg: 'bg-cyan-100',    text: 'text-cyan-700'    },
  { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  { bg: 'bg-teal-100',    text: 'text-teal-700'    },
  { bg: 'bg-pink-100',    text: 'text-pink-700'    },
  { bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/* ── helpers ── */

function fmtDateTime(d: Date): string {
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return `${date}, ${time}`;
}

/* ── drawer ── */

export function TaskCommentsDrawer({ open, onClose, taskName, comments, onAdd }: Props) {
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  /* scroll to bottom when a new comment is appended */
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [comments.length, open]);

  /* focus textarea when drawer opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    } else {
      setText('');
    }
  }, [open]);

  /* prevent body scroll while drawer is open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      onAdd(trimmed);
      setText('');
      setSubmitting(false);
    }, 220);
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/25 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Panel ── */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">Comments</span>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {comments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <MessageSquare size={22} className="text-gray-300" />
              </div>
              <p className="mt-1 text-[13px] font-medium text-gray-500">No comments yet</p>
              <p className="text-[12px] text-gray-400">Be the first to leave a comment below.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {comments.map(c => {
                const col = avatarColor(c.author);
                return (
                <div key={c.id} className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ring-[1.5px] ring-white', col.bg)}>
                    <span className={cn('text-[10px] font-semibold leading-none select-none', col.text)}>
                      {c.initials}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[12.5px] font-semibold text-gray-900">{c.author}</span>
                      <span className="text-[11px] text-gray-400">{fmtDateTime(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {c.text}
                    </p>
                  </div>
                </div>
              );
              })}
              <div ref={threadEndRef} />
            </div>
          )}
        </div>

        {/* Compose footer */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-5 py-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            placeholder="Write a comment…"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">⌘ + Enter to submit</span>
            <button
              type="button"
              disabled={!text.trim() || submitting}
              onClick={handleSubmit}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[12.5px] font-medium text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={11} className="flex-shrink-0" />
              {submitting ? 'Adding…' : 'Add Comment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
