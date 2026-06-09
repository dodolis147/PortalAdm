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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{incident.title}</h2>
            <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">Unidade: {incident.unit} | Status: {incident.status}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          {incident.description && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Descrição</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap">{incident.description}</p>
            </div>
          )}

          {incident.photoUrls && incident.photoUrls.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4" /> Fotos / Evidências ({incident.photoUrls.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {incident.photoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-full aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                    <img src={url} alt={`Evidência ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4" /> Tratativas
            </h4>
            <div className="space-y-3">
              {incident.replies.length === 0 ? (
                <p className="text-sm italic text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">Nenhuma tratativa registrada ainda.</p>
              ) : (
                incident.replies.map((reply) => (
                  <div key={reply.id} className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-sky-900">{reply.author} <span className="text-sky-600 font-normal">({reply.role})</span></span>
                      <span className="text-[10px] uppercase font-semibold text-sky-700">{new Date(reply.date).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-sm text-sky-800 whitespace-pre-wrap mt-2">{reply.content}</p>
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
