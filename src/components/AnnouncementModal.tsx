import React from 'react';
import { Megaphone, X, CheckCircle2 } from 'lucide-react';
import { Announcement } from '../types';
import { isImageUrl } from '../lib/utils';

interface AnnouncementModalProps {
  announcement: Announcement;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AnnouncementModal({ announcement, onClose, onConfirm }: AnnouncementModalProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in slide-in-from-right-10 fade-in duration-300">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Megaphone className="w-6 h-6 text-indigo-700" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Novo Comunicado</h2>
        </div>

        <div className="max-h-[50vh] overflow-y-auto mb-6 pr-2">
          {announcement.attachmentUrl && isImageUrl(announcement.attachmentUrl) && (
            <div className="mb-4 rounded-xl overflow-hidden border border-gray-100">
                <img src={announcement.attachmentUrl} alt="Anexo" className="w-full h-32 object-cover" />
            </div>
          )}
          <h3 className="text-md font-semibold text-gray-950 mb-2">{announcement.title}</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
        </div>

        <button
          onClick={onConfirm}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          Confirmar que visualizei
        </button>
    </div>
  );
}
