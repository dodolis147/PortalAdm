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

        <div className="flex flex-col items-center justify-center p-5 bg-[#f5efe9] rounded-2xl">
           <ProceduralQRCode value={resident.qrCodeValue || ''} size={110} />
           
           <div className="mt-4 p-3 bg-white rounded-xl border border-[#ebd8c8] shadow-sm text-center w-full relative">
             <p className="text-[9px] uppercase font-bold text-[#8a5a44] tracking-widest mb-1.5 opacity-80">
               CÓDIGO DE ACESSO
             </p>
             <div className="flex justify-center items-center gap-2">
               <p className="text-lg font-black font-mono tracking-[0.25em] text-[#2d3748]">
                 {resident.qrCodeValue || 'N/A'}
               </p>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(resident.qrCodeValue || '');
                 }}
                 className="p-1 hover:bg-[#f5efe9] rounded-md transition-colors text-[#8a5a44] opacity-80 hover:opacity-100"
                 title="Copiar código de acesso"
               >
                 <Copy className="w-4 h-4" />
               </button>
             </div>
           </div>
        </div>

        <div className="flex gap-3 justify-center mt-6">
          <button onClick={printIdentification} className="flex flex-1 items-center justify-center gap-2 px-4 py-2 border border-[#fbd38d] bg-white text-[#8a5a44] rounded-lg text-sm font-semibold hover:bg-[#fefcfa] transition-colors shadow-sm">
            <Printer className="w-4 h-4" /> Impressão
          </button>
          <button onClick={downloadResidentDetails} className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-[#ed7b31] text-white rounded-lg text-sm font-semibold hover:bg-[#de6c22] transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}
