'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

const typeBorderColors: Record<ToastProps['type'], string> = {
  success: 'border-l-green-400',
  error: 'border-l-red-400',
  info: 'border-l-blue-400',
};

const typeTextColors: Record<ToastProps['type'], string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

const typeIcons: Record<ToastProps['type'], string> = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
};

export default function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 border-l-4 shadow-2xl min-w-[220px] max-w-sm bg-[#0d1b2a] border border-[#1e3a5f] ${
        typeBorderColors[type]
      }`}
      role="alert"
      aria-live="polite"
    >
      <span className={`text-base font-bold ${typeTextColors[type]}`}>{typeIcons[type]}</span>
      <span className="text-[10px] font-mono text-[#e2f4ff] leading-relaxed flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
