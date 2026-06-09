import React from 'react';
import { X, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { Incident } from '../types';

interface IncidentDetailsModalProps {
  incident: Incident;
  onClose: () => void;
}

export default function IncidentDetailsModal({ incident, onClose }: IncidentDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{incident.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          {incident.description && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase">Descrição</h4>
              <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl">{incident.description}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Tratativas
            </h4>
            <div className="mt-2 space-y-3">
              {incident.replies.length === 0 ? (
                <p className="text-sm italic text-gray-500">Nenhuma tratativa registrada ainda.</p>
              ) : (
                incident.replies.map((reply) => (
                  <div key={reply.id} className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-sky-900">{reply.author}</span>
                      <span className="text-[10px] text-sky-700">{new Date(reply.date).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-sm text-sky-800">{reply.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
