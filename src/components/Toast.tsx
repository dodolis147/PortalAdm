import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Toast({ message, type, onClose }: { message: string, type: 'success' | 'info' | 'warning', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass = type === 'success' ? 'bg-emerald-600' : type === 'warning' ? 'bg-amber-600' : 'bg-blue-600';

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center gap-3 z-[100] ${bgClass} text-white`}>
      <AlertCircle className="w-5 h-5"/>
      {message}
    </div>
  );
}
