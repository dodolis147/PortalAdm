import React, { useRef } from 'react';
import { X, Printer, Download, Copy } from 'lucide-react';
import { Resident } from '../types';
import ProceduralQRCode from './QRCodeDisplay';
import html2canvas from 'html2canvas';

interface ResidentDetailsModalProps {
  resident: Resident;
  onClose: () => void;
}

export default function ResidentDetailsModal({ resident, onClose }: ResidentDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const downloadResidentDetails = async () => {
    if (modalRef.current) {
      const canvas = await html2canvas(modalRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `detalhes_morador_${resident.name.replace(/\s+/g, '_')}.png`;
      link.click();
    }
  };

  const printIdentification = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-xl relative animate-fadeIn">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-3">Detalhes do Morador</h2>

        <div className="flex flex-col items-center mb-4">
           {resident.avatarUrl ? (
             <img src={resident.avatarUrl} alt={resident.name} className="w-20 h-20 rounded-full object-cover mb-2" />
           ) : (
             <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-2">
               <span className="text-xl font-bold text-gray-500">{resident.name.charAt(0)}</span>
             </div>
           )}
           <h3 className="text-md font-semibold">{resident.name}</h3>
           <span className="text-xs text-gray-500">{resident.unit}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-2 bg-gray-50 rounded-lg">
          <p><strong>CPF:</strong> {resident.cpf || 'N/A'}</p>
          <p><strong>RG:</strong> {resident.rg || 'N/A'}</p>
          <p><strong>Tel:</strong> {resident.phone}</p>
          <p><strong>E-mail:</strong> {resident.email || 'N/A'}</p>
          <p><strong>Status:</strong> {resident.status}</p>
          <p><strong>Cad:</strong> {resident.createdAt ? resident.createdAt.slice(0, 10) : 'N/A'}</p>
        </div>

        <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl">
           <ProceduralQRCode value={resident.qrCodeValue || ''} size={110} />
           
           <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm text-center w-full">
             <p className="text-[10px] text-gray-500 mb-0.5">Código de Acesso</p>
             <div className="flex justify-center items-center gap-2">
               <p className="text-xl font-bold font-mono tracking-widest" style={{ color: '#1e293b' }}>
                 {resident.qrCodeValue?.slice(-4).toUpperCase()}
               </p>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(resident.qrCodeValue?.slice(-4).toUpperCase() || '');
                 }}
                 className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-slate-800"
                 title="Copiar código de acesso"
               >
                 <Copy className="w-4 h-4" />
               </button>
             </div>
           </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <button onClick={printIdentification} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5" /> Impressão
          </button>
          <button onClick={downloadResidentDetails} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-black">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}
