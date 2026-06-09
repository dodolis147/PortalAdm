import React from 'react';
import { Guest, Booking } from '../types';

export default function GuestManager({
  booking,
  currentUser,
  onUpdateGuestStatus,
}: {
  booking: Booking;
  currentUser: any;
  onUpdateGuestStatus: (bookingId: string, guestIndex: number, newStatus: 'Entrada Liberada' | 'Presente') => void;
}) {
  return (
    <div className="mt-2 text-xs space-y-2">
      {Array.isArray(booking.guests) && booking.guests.length > 0 ? (
        booking.guests.map((guest, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100">
            <span className={guest.status === 'Pendente' ? 'text-gray-700' : 'text-emerald-700 font-semibold'}>
              {guest.name}
            </span>
            <div className="flex gap-2">
              {guest.status === 'Pendente' && (currentUser?.role === 'Porteiro' || currentUser?.role === 'Administrador' || currentUser?.role === 'MASTER') && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdateGuestStatus(booking.id, index, 'Entrada Liberada'); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                >
                  Liberar Entrada
                </button>
              )}
              {guest.status === 'Entrada Liberada' && (currentUser?.role === 'Porteiro' || currentUser?.role === 'Administrador' || currentUser?.role === 'MASTER') && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdateGuestStatus(booking.id, index, 'Presente'); }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                >
                  Confirmar Presença
                </button>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                guest.status === 'Pendente' ? 'bg-gray-100' :
                guest.status === 'Entrada Liberada' ? 'bg-emerald-100 text-emerald-800' :
                guest.status === 'Presente' ? 'bg-purple-100 text-purple-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {guest.status}
              </span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-xs text-gray-400">Nenhum convidado listado.</p>
      )}
    </div>
  );
}
