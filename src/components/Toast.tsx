import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type, onClose }: { message: string, type: 'success' | 'info' | 'warning' | 'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styleMap = {
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    error: 'bg-rose-50 text-rose-900 border-rose-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    info: 'bg-blue-50 text-blue-900 border-blue-200',
  };
  
  const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  };
  
  const selectedStyle = styleMap[type];
  const Icon = iconMap[type];

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-lg border flex items-center gap-3 z-[100] ${selectedStyle} min-w-[300px]`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-grow text-sm font-medium">{message}</span>
      <button onClick={onClose} className="hover:bg-black/5 p-1 rounded-full shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
