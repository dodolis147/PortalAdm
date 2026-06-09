import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { Resident } from '../types';

interface PrintResidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  residents: Resident[];
  activeFilters: {
    searchQuery: string;
    filterStatus: 'All' | 'Ativo' | 'Inativo' | 'Bloqueado';
    selectedTower: string;
  };
  condoName: string;
  towerNames?: string[];
  isSyncing?: boolean; // Added prop
}

export default function PrintResidentsModal({
  isOpen,
  onClose,
  residents,
  activeFilters,
  condoName,
  towerNames = ['Torre 1', 'Torre 2', 'Torre 3'],
  isSyncing = false // Added prop
}: PrintResidentsModalProps) {
  
  if (!isOpen) return null;

  const handlePrint = () => {
    if (isSyncing) {
        if (!confirm("O sistema ainda está sincronizando dados com o servidor. Deseja imprimir assim mesmo com os dados locais atuais?")) {
            return;
        }
    }
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-gray-950/85 backdrop-blur-sm print:static print:bg-white print:p-0 print:z-auto print:block print:overflow-visible print-area-container print-active-dialog-root">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl relative print:hidden no-print"
        >
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-slate-800 gap-4 no-print shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                <h2 className="text-lg font-black text-white uppercase tracking-wider font-sans">
                  Prévia de Impressão A4
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Abaixo está a visualização exata do arquivo para impressão em papel A4 ou exportação para PDF.
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto self-end">
              {isSyncing && (
                  <span className="text-[10px] text-amber-500 font-bold bg-amber-950 px-2 py-1 rounded">Sincronizando...</span>
              )}
              <button 
                onClick={handlePrint} 
                className="flex-1 sm:flex-initial py-2 px-5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-950/20"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
              <button 
                onClick={onClose} 
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                title="Fechar"
              > 
                <X className="w-5 h-5" /> 
              </button>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="mb-4" />

          {/* Interactive Document Preview Container */}
          <div className="flex-1 overflow-y-auto bg-slate-950/50 rounded-xl p-4 md:p-8 border border-slate-850 flex justify-center no-print scroll-smooth">
            <div 
              className="bg-white text-slate-900 p-8 shadow-2xl rounded-sm w-[210mm] min-h-[297mm] h-fit flex flex-col justify-between font-sans border border-gray-200 select-all" 
              id="a4-sheet-preview"
            >
              {/* Paper Content Header */}
              <div>
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
                  <div>
                    <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-930">{condoName}</h1>
                    <p className="text-[10px] font-bold text-sky-800 uppercase tracking-widest mt-0.5">Mural Central & Controle de Acesso</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-mono uppercase">Relatório de Moradores Ativos</p>
                  </div>
                  <div className="text-right font-mono text-[9px] text-slate-500 space-y-0.5">
                    <p>Emissão: <strong>{currentDate} {currentTime}</strong></p>
                    <p>Filtros aplicados:</p>
                    <p className="font-bold text-slate-805">
                      Status: {activeFilters.filterStatus === 'All' ? 'Todos' : activeFilters.filterStatus}
                    </p>
                    <p className="font-bold text-slate-805">
                      Torre/Bloco: {activeFilters.selectedTower === 'Todas' ? 'Todas' : activeFilters.selectedTower}
                    </p>
                    {activeFilters.searchQuery && (
                      <p className="font-bold text-slate-805 max-w-[200px] truncate">
                        Busca: &quot;{activeFilters.searchQuery}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 border border-slate-150 p-2.5 rounded-lg mb-4 text-[10px] font-mono">
                  <div>
                    <span>Total de moradores listados: <strong>{residents.length}</strong></span>
                  </div>
                  <div>
                    <span>Documento Oficial do Condomínio</span>
                  </div>
                </div>

                {/* Printable Table */}
                <table className="w-full text-slate-900 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-700 uppercase tracking-wider text-[9px] font-bold">
                      <th className="py-2 px-3 text-left w-[12%] py-2 text-[9px] font-bold text-slate-通 bg-slate-50/20 border-b-2 border-slate-300">Unidade</th>
                      <th className="py-2 px-3 text-left w-[38%] py-2 text-[9px] font-bold text-slate-通 bg-slate-50/20 border-b-2 border-slate-300">Nome Completo / Contatos</th>
                      <th className="py-2 px-3 text-left w-[12%] py-2 text-[9px] font-bold text-slate-通 bg-slate-50/20 border-b-2 border-slate-300">Status</th>
                      <th className="py-2 px-3 text-left w-[18%] py-2 text-[9px] font-bold text-slate-通 bg-slate-50/20 border-b-2 border-slate-300">Co-residentes</th>
                      <th className="py-2 px-3 text-left w-[20%] py-2 text-[9px] font-bold text-slate-通 bg-slate-50/20 border-b-2 border-slate-300">Veículos Registrados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400 italic font-medium">
                          Nenhum morador corresponde aos filtros ativos.
                        </td>
                      </tr>
                    ) : (
                      residents.map((resident) => (
                        <tr key={resident.id} className="border-b border-slate-100 hover:bg-slate-50/50 break-inside-avoid">
                          {/* Unit info */}
                          <td className="py-2 px-3 font-mono font-black text-[11px] text-slate-950 align-top">
                            {resident.unit}
                          </td>
                          {/* Name / Contact info */}
                          <td className="py-2 px-3 align-top">
                            <span className="font-extrabold text-[11px] text-slate-900 block leading-tight">
                              {resident.name}
                            </span>
                            <div className="flex flex-col gap-0.5 mt-0.5 text-[9px] text-slate-500 font-mono">
                              {resident.phone && (
                                <span className="block">Tel: {resident.phone}</span>
                              )}
                              {resident.email && (
                                <span className="block truncate max-w-[240px]">E-mail: {resident.email}</span>
                              )}
                            </div>
                          </td>
                          {/* Status */}
                          <td className="py-2 px-3 align-top">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              resident.status === 'Ativo' 
                                ? 'bg-emerald-100 text-emerald-805 border border-emerald-200' 
                                : resident.status === 'Inativo'
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              {resident.status}
                            </span>
                          </td>
                          {/* Co-Residents */}
                          <td className="py-2 px-3 align-top text-[10px] text-slate-600 leading-tight">
                            {resident.members && resident.members.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {resident.members.map((m, mIdx) => (
                                  <span key={mIdx} className="block">• {m}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[9px]">-</span>
                            )}
                          </td>
                          {/* Vehicle Plate/Model */}
                          <td className="py-2 px-3 align-top">
                            {resident.vehicles && resident.vehicles.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {resident.vehicles.map((v, vIdx) => (
                                  <div key={vIdx} className="text-[9px] font-mono leading-tight">
                                    <span className="inline-block border border-slate-400 px-1 py-0.5 rounded-sm bg-slate-50 font-extrabold text-slate-950 mr-1 select-all">
                                      {v.plate}
                                    </span>
                                    <span className="text-slate-600 block sm:inline italic text-[8.5px]">
                                      ({v.brandModel || 'Sem modelo' } - {v.color || 'Sem cor'})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[9px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Page footer */}
              <div className="border-t border-slate-200 pt-3 mt-4 flex justify-between items-center text-[8.5px] text-slate-400 font-mono uppercase tracking-wider shrink-0">
                <div>
                  Relatório Emissor • Sistema {condoName}
                </div>
                <div>
                  Página 1 de 1
                </div>
              </div>
            </div>
          </div>

          {/* Real Fullscreen Printing Container Wrapper (visible ONLY during browser media print) */}
          <div className="print-area-wrapper hidden print:block bg-white text-slate-950 p-0 m-0 w-full font-sans">
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">{condoName}</h1>
                <p className="text-[10px] font-extrabold text-sky-800 uppercase tracking-widest mt-0.5">Mural Central & Controle de Acesso</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded">DOCUMENTO DE CIRCULAÇÃO INTERNA</span>
                </div>
              </div>
              <div className="text-right font-mono text-[9px] text-slate-500 space-y-0.5">
                <p>Emissão: <strong>{currentDate} {currentTime}</strong></p>
                <p>Registros impressos: <strong>{residents.length}</strong></p>
                <p className="font-bold text-slate-805">
                  Filtros: Status ({activeFilters.filterStatus === 'All' ? 'Todos' : activeFilters.filterStatus}) • Bloco ({activeFilters.selectedTower === 'Todas' ? 'Todas' : activeFilters.selectedTower})
                  {activeFilters.searchQuery && ` • Busca ("${activeFilters.searchQuery}")`}
                </p>
              </div>
            </div>

            {/* Print Table */}
            <table className="w-full text-slate-900 border-collapse" id="actual-print-table">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-700 uppercase tracking-wider text-[9px] font-bold">
                  <th className="py-2 px-3 text-left w-[12%] bg-slate-100 text-slate-950 font-black border border-slate-200">Unidade</th>
                  <th className="py-2 px-3 text-left w-[36%] bg-slate-100 text-slate-950 font-black border border-slate-200">Nome do Morador / Contatos</th>
                  <th className="py-2 px-3 text-left w-[12%] bg-slate-100 text-slate-950 font-black border border-slate-200">Status</th>
                  <th className="py-2 px-3 text-left w-[18%] bg-slate-100 text-slate-950 font-black border border-slate-200">Co-residentes</th>
                  <th className="py-2 px-3 text-left w-[22%] bg-slate-100 text-slate-950 font-black border border-slate-200">Veículos Registrados</th>
                </tr>
              </thead>
              <tbody>
                {residents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400 italic">
                      Nenhum morador corresponde aos filtros ativos.
                    </td>
                  </tr>
                ) : (
                  residents.map((resident) => (
                    <tr key={resident.id} className="border-b border-slate-250 break-inside-avoid">
                      <td className="py-2.5 px-3 font-mono font-black text-[11px] text-slate-950 align-top border border-slate-200">
                        {resident.unit}
                      </td>
                      <td className="py-2.5 px-3 align-top border border-slate-200">
                        <span className="font-bold text-[11px] text-slate-950 block leading-tight">
                          {resident.name}
                        </span>
                        <div className="flex flex-col gap-0.5 mt-1 text-[9px] text-slate-600 font-mono">
                          {resident.phone && (
                            <span className="block">WhatsApp: {resident.phone}</span>
                          )}
                          {resident.email && (
                            <span className="block truncate max-w-[230px]">Email: {resident.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top text-center border border-slate-200">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${
                          resident.status === 'Ativo' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : resident.status === 'Inativo'
                              ? 'bg-slate-50 text-slate-650 border-slate-300'
                              : 'bg-red-50 text-red-850 border-red-300'
                        }`}>
                          {resident.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 align-top text-[10px] text-slate-700 leading-tight border border-slate-200">
                        {resident.members && resident.members.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {resident.members.map((m, mIdx) => (
                              <span key={mIdx} className="block font-medium">• {m}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top border border-slate-200">
                        {resident.vehicles && resident.vehicles.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {resident.vehicles.map((v, vIdx) => (
                              <div key={vIdx} className="text-[9px] font-mono leading-tight">
                                <span className="inline-block border border-slate-950 px-1.5 py-0.5 rounded-sm bg-slate-50 font-extrabold text-slate-950 mr-1.5">
                                  {v.plate}
                                </span>
                                <span className="text-slate-800 block sm:inline italic text-[8.5px]">
                                  ({v.brandModel || 'N/I'} • {v.color || 'N/I'})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="no-print border-none">
                  <td colSpan={5} className="py-4 border-none"></td>
                </tr>
              </tfoot>
            </table>

            {/* Consistent Page Footer (visible on actual print) */}
            <div className="mt-8 border-t-2 border-slate-900 pt-3 flex justify-between items-center text-[9px] text-slate-550 font-mono uppercase tracking-widest">
              <div>
                Emissor Oficial {condoName} Condomínio Inteligente
              </div>
              <div className="text-right font-black">
                Pág. 1 / 1
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
