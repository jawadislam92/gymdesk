'use client';

import { useEffect } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { X } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/**
 * Consistent page heading: a bold title plus a one-line description of what the
 * page is for, with an optional actions slot on the right. Used on every screen
 * so staff and gym owners always know what a page does.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles: Record<string, string> = {
    primary: 'bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark active:scale-[.98] disabled:opacity-50',
    ghost: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:scale-[.98]',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[.98] disabled:opacity-50',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1.5 block font-medium text-slate-600">{label}</span>}
      <input
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/25"
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1.5 block font-medium text-slate-600">{label}</span>}
      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'green' | 'red' | 'amber' | 'slate' | 'brand' | 'blue';
}) {
  const tones: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
    brand: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Textarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1.5 block font-medium text-slate-600">{label}</span>}
      <textarea
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/25"
        {...props}
      />
    </label>
  );
}

/**
 * Centered modal dialog — the standard surface for create/edit forms across the
 * app. Closes on Escape or backdrop click; locks body scroll while open.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`my-4 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-slate-200/80 bg-white shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
