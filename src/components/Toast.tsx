import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type, onClose }: { message: string, type: 'success' | 'info' | 'warning' | 'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : type === 'warning' ? 'bg-amber-600' : 'bg-blue-600';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : type === 'warning' ? AlertCircle : Info;

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl flex items-center gap-3 z-[100] ${bgColor} text-white min-w-[300px]`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-grow text-sm font-medium">{message}</span>
      <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
