import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  message: string;
  className?: string;
}

export function Alert({ type = 'error', message, className = '' }: AlertProps) {
  if (!message) return null;

  const styles = {
    error: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  return (
    <div
      className={`p-4 rounded-xl border flex items-start gap-3 text-sm font-medium ${styles[type]} ${className}`}
      role="alert"
    >
      {icons[type]}
      <div className="flex-1">{message}</div>
    </div>
  );
}
