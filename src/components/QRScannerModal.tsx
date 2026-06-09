import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, CheckCircle, AlertTriangle, RefreshCw, Volume2, ShieldCheck, Sparkles, ArrowRight, UserCheck, Package, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string, confirmStep?: boolean, extraData?: any) => Promise<{ success: boolean; message: string; type: 'visitor' | 'package' | 'resident' | 'unknown'; data?: any }>;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanError, setScanError] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [manualModeActive, setManualModeActive] = useState<boolean>(false);
  const [pendingItem, setPendingItem] = useState<{ type: 'visitor' | 'package' | 'resident'; data: any; decodedText: string } | null>(null);
  const [confirmingLoading, setConfirmingLoading] = useState(false);
  
  const qrRef = useRef<Html5Qrcode | null>(null);
  const initializedRef = useRef<boolean>(false);

  // Clear states when closed or opened
  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      setScanResult(null);
      setScanError('');
      setManualCode('');
      setManualModeActive(false);
      setPendingItem(null);
      setConfirmingLoading(false);
      initializedRef.current = false;
      return;
    }

    discoverCameras();

    return () => {
      cleanupScanner();
    };
  }, [isOpen]);

  const handleManualCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    
    // Stop camera scan session to free resource
    cleanupScanner();
    setManualCode('');
    setScanResult(null);
    setScanError('');
    
    try {
      const result = await onScanSuccess(code, false, {});
      if (result.success && result.data) {
        setPendingItem({
          type: result.type as 'visitor' | 'package' | 'resident',
          data: result.data,
          decodedText: code
        });
      } else {
        setScanResult({ success: result.success, message: result.message });
      }
    } catch (err: any) {
      setScanError(err.message || 'Erro ao processar código de acesso.');
    }
  };

  const handleConfirmAccess = async () => {
    if (!pendingItem) return;
    setConfirmingLoading(true);
    setScanError('');
    try {
      const extraData = {};
      const result = await onScanSuccess(pendingItem.decodedText, true, extraData);
      setScanResult({ success: result.success, message: result.message });
      setPendingItem(null);
    } catch (err: any) {
      setScanError(err.message || 'Erro ao processar liberação final.');
    } finally {
      setConfirmingLoading(false);
    }
  };

  const cleanupScanner = () => {
    if (qrRef.current) {
      if (qrRef.current.isScanning) {
        qrRef.current.stop()
          .then(() => {
            console.log('[Portaria Express] Scanner parado com sucesso.');
          })
          .catch(err => {
            console.log('[Portaria Express] Erro ao parar scanner:', err);
          });
      }
      qrRef.current = null;
    }
    setIsScanning(false);
  };

  const discoverCameras = () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices) {
      console.log('[QRScanner] Navigator mediaDevices not supported in this browser environment.');
      setScanError('Câmera não suportada neste navegador / ambiente de testes.');
      return;
    }

    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Try to default to the back camera (rear-facing)
          const environmentCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('traseir') ||
            device.label.toLowerCase().includes('environment') ||
            device.label.toLowerCase().includes('trás')
          );
          const defaultId = environmentCamera ? environmentCamera.id : devices[0].id;
          setSelectedCameraId(defaultId);
        } else {
          setScanError('Nenhuma câmera encontrada no seu smartphone / computador.');
        }
      })
      .catch(err => {
        console.warn('[QRScanner] expected getCameras warning/rejection:', err);
        setScanError('Por favor, autorize a permissão de câmera. Caso use simulador, envie o código digitado.');
      });
  };

  const startScanning = (cameraId: string) => {
    if (!cameraId) return;
    setScanResult(null);
    setScanError('');

    const startSession = async () => {
      // 1. If currently scanning, stop it
      if (qrRef.current && qrRef.current.isScanning) {
        await qrRef.current.stop();
      }

      // 2. Create scanner instance
      const scannerInst = new Html5Qrcode("qr-reader-container");
      qrRef.current = scannerInst;

      setIsScanning(true);

      // 3. Start reading feed
      await scannerInst.start(
        cameraId,
        {
          fps: 12,
          qrbox: (width, height) => {
            const min = Math.min(width, height);
            const size = Math.floor(min * 0.75);
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          // Play a futuristic access beep sound using Web Audio API
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1150, audioCtx.currentTime); // Clean scan ping
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
          } catch (e) {
            console.log('Audio feedback not supported or blocked:', e);
          }

          // Stop scanner immediately on code found
          try {
            await scannerInst.stop();
          } catch (stopErr) {
            console.warn('Silent stop caution:', stopErr);
          }
          setIsScanning(false);

          // Process Scanned data
          try {
            const result = await onScanSuccess(decodedText, false, {});
            if (result.success && result.data) {
              setPendingItem({
                type: result.type as 'visitor' | 'package' | 'resident',
                data: result.data,
                decodedText
              });
            } else {
              setScanResult({ success: result.success, message: result.message });
            }
          } catch (err: any) {
            setScanError(err.message || 'Erro ao processar leitura do QR Code.');
          }
        },
        () => {
          // Quiet verbose debug frame scanning messages
        }
      );
    };

    startSession().catch(err => {
      console.warn('[Portaria Express] init simulation warning:', err);
      setIsScanning(false);
      setScanError(`Falha ao acessar camera e iniciar scanner: ${err.message || String(err)}`);
    });
  };

  const toggleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  useEffect(() => {
    if (selectedCameraId && isOpen) {
      // Let modal fully animate before starting feed to prevent WebRTC initialization viewport glitches
      const timer = setTimeout(() => {
        startScanning(selectedCameraId);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [selectedCameraId, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md select-none touch-none">
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          id="qr-scanner-modal-body"
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-mono text-zinc-250 flex items-center gap-1.5 leading-none">
                  Portaria Express <Sparkles className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-1">QRCode Integrado & Segurança Inteligente</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                cleanupScanner();
                onClose();
              }}
              className="p-1 px-2.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 rounded-xl text-xs font-mono transition-all duration-150 inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Fechar
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-5 overflow-y-auto min-h-[300px]">
            
            {pendingItem ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-4 font-sans text-left text-zinc-200"
              >
                {/* Visual Header indicating Stage 2 Confirmation */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 px-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded font-mono text-[9px] font-black uppercase tracking-widest leading-none select-none">
                      Etapa 2 / 2
                    </div>
                    <span className="text-[11px] uppercase font-black tracking-wider font-mono">Confirmar Entrada</span>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>

                {pendingItem.type === 'visitor' ? (
                  // Visitor Card details
                  <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-zinc-800 border border-zinc-750 text-zinc-300 rounded-xl">
                        <UserCheck className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Nome do Visitante</span>
                        <h4 className="text-sm font-black text-zinc-100 truncate mt-0.5">{pendingItem.data.name}</h4>
                        <span className="inline-block mt-1 font-mono text-[8px] px-1.5 py-0.5 bg-zinc-800 text-zinc-350 rounded border border-zinc-700 font-bold uppercase">
                          {pendingItem.data.type === 'Regular' ? 'Visitante Residencial' : pendingItem.data.type === 'Prestador' ? 'Prestador de Serviço' : 'Entregador Express'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/65 pt-3 text-xs leading-normal">
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Documento / CPF</span>
                        <span className="font-mono font-bold text-zinc-300">{pendingItem.data.document || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Contato</span>
                        <span className="text-zinc-300 text-[11px]">{pendingItem.data.phone || 'Sem telefone'}</span>
                      </div>
                      <div className="col-span-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/40 mt-1 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Unidade Destino</span>
                          <span className="text-zinc-200 font-extrabold">{pendingItem.data.unitToVisit}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Host / Anfitrião</span>
                          <span className="text-zinc-200 font-medium">{pendingItem.data.hostName}</span>
                        </div>
                      </div>
                      
                      {pendingItem.data.vehiclePlate && (
                        <div className="col-span-2">
                          <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono mb-1">Veículo Relacionado</span>
                          <div className="inline-block bg-white text-black font-black border-2 border-zinc-950 rounded p-1 px-4 text-center select-none shadow-sm shadow-black/20 font-mono tracking-widest text-xs uppercase leading-none">
                            <span className="block text-[6px] tracking-wider font-sans font-bold text-blue-800 mb-0.5 border-b border-gray-200 pb-0.5">BRASIL</span>
                            {pendingItem.data.vehiclePlate}
                          </div>
                        </div>
                      )}

                      {(pendingItem.data.notes || pendingItem.data.observacoes) && (
                        <div className="col-span-2 text-[10px] text-zinc-400 bg-zinc-900/40 border border-zinc-800/40 p-2 rounded-lg italic font-mono">
                          Obs: {pendingItem.data.notes || pendingItem.data.observacoes}
                        </div>
                      )}
                    </div>
                  </div>
                ) : pendingItem.type === 'resident' ? (
                  // Resident Card details
                  <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      {pendingItem.data.avatarUrl ? (
                        <img src={pendingItem.data.avatarUrl} alt={pendingItem.data.name} className="w-16 h-16 rounded-full object-cover border border-zinc-700" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                          <span className="text-2xl font-black text-zinc-500">{pendingItem.data.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Dados do Morador</span>
                        <h4 className="text-sm font-black text-zinc-100 truncate">{pendingItem.data.name}</h4>
                        <span className="inline-block mt-0.5 font-mono text-[8px] px-1.5 py-0.5 bg-zinc-800 text-zinc-350 rounded border border-zinc-700 font-bold uppercase">
                          {pendingItem.data.role || 'Morador'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/65 pt-3 text-xs leading-normal">
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Unidade</span>
                        <span className="font-mono font-bold text-zinc-300">{pendingItem.data.unit}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Contato</span>
                        <span className="text-zinc-300 text-[11px]">{pendingItem.data.phone}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Status</span>
                        <span className="text-zinc-300 text-[11px] font-bold">{pendingItem.data.status}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">CPF</span>
                        <span className="text-zinc-300 text-[11px] font-mono">{pendingItem.data.cpf || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Package details card
                  <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-zinc-800 border border-zinc-750 text-zinc-300 rounded-xl">
                        <Package className="w-6 h-6 text-yellow-500 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Retirada de Encomenda</span>
                        <h4 className="text-sm font-black text-zinc-100 truncate mt-0.5">{pendingItem.data.codigoRastreio}</h4>
                        <span className="inline-block mt-1 font-mono text-[8px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20 font-black">
                          PENDENTE RETIRADA
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/60 pt-3 text-xs leading-normal">
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Apartamento / Torre</span>
                        <span className="text-zinc-200 font-extrabold">{pendingItem.data.torre} - Apt {pendingItem.data.apartamento}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-bold text-zinc-550 block font-mono">Morador Destinatário</span>
                        <span className="text-zinc-200 font-bold">{pendingItem.data.moradorNome}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Important visual warning */}
                <span className="text-[10px] text-zinc-450 leading-relaxed block text-center max-w-sm px-2">
                  ℹ️ Verifique as credenciais acima. Ao confirmar, o acesso será marcado como "ENTRADA REALIZADA" e a cancela física será liberada.
                </span>

                {/* Action Buttons for Stage 2 */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingItem(null);
                      setScanResult(null);
                      setScanError('');
                      if (selectedCameraId) startScanning(selectedCameraId);
                    }}
                    className="py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-black text-xs uppercase tracking-wider rounded-xl transition-all font-mono border border-zinc-700 hover:text-white"
                  >
                    ❌ Rejeitar
                  </button>
                  <button
                    type="button"
                    disabled={confirmingLoading}
                    onClick={handleConfirmAccess}
                    className="py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 font-mono flex items-center justify-center gap-1.5"
                  >
                    {confirmingLoading ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processando...
                      </span>
                    ) : (
                      <>
                        ⚡ Liberar Entrada
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Real Camera Preview Frame */}
                <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-zinc-700 bg-black/55 shadow-inner flex items-center justify-center">
                  
                  {/* Scanning visual overlay targets */}
                  {isScanning && !scanResult && (
                    <>
                      {/* Laser Scanning Bar */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 animate-scannerLaser z-10"></div>
                      
                      {/* Neon Target Corners */}
                      <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl"></div>
                      <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr"></div>
                      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl"></div>
                      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br"></div>
                    </>
                  )}

                  {/* mounting target div for html5-qrcode library */}
                  <div id="qr-reader-container" className="w-full h-full object-cover"></div>

                  {/* Show Camera Off or Scan Results cover */}
                  {!isScanning && (
                    <div className="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center p-6 text-center">
                      {scanResult ? (
                        <motion.div 
                          initial={{ scale: 0.8 }} 
                          animate={{ scale: 1 }} 
                          className="space-y-4"
                        >
                          {scanResult.success ? (
                            <>
                              <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
                                <CheckCircle className="w-10 h-10 animate-bounce" />
                              </div>
                              <span className="text-emerald-400 font-extrabold text-sm uppercase tracking-wider block font-mono">AUTORIZADO</span>
                              <p className="text-xs text-zinc-300 leading-relaxed font-medium px-2">{scanResult.message}</p>
                            </>
                          ) : (
                            <>
                              <div className="mx-auto w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center border border-red-500/30">
                                <AlertTriangle className="w-10 h-10" />
                              </div>
                              <span className="text-red-400 font-extrabold text-sm uppercase tracking-wider block font-mono">ATENÇÃO / ERRO</span>
                              <p className="text-xs text-zinc-300 leading-relaxed font-medium px-2">{scanResult.message}</p>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (selectedCameraId) {
                                startScanning(selectedCameraId);
                              }
                            }}
                            className="mt-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl px-4 py-2 text-xs font-semibold hover:scale-105 active:scale-95 transition-all text-zinc-200"
                          >
                            Escanear Novamente
                          </button>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <Camera className="w-12 h-12 text-zinc-600 animate-pulse mx-auto" />
                          <p className="text-xs text-zinc-400">Leitor offline ou iniciando feed...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Error notifications */}
                {scanError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-3 text-xs flex items-start gap-2.5 max-w-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <p className="leading-relaxed font-mono text-left">{scanError}</p>
                  </div>
                )}

                {/* Camera Options & Tools */}
                <div className="w-full max-w-sm flex flex-col items-center gap-3">
                  {cameras.length > 1 && !manualModeActive && (
                    <button
                      onClick={toggleCamera}
                      className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 p-2.5 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                      title="Alternar entre câmeras frontal/traseira"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Alternar Câmera ({cameras.length})
                    </button>
                  )}

                  {/* Toggle manual mode button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (manualModeActive) {
                        setManualModeActive(false);
                        if (selectedCameraId) startScanning(selectedCameraId);
                      } else {
                        cleanupScanner();
                        setManualModeActive(true);
                      }
                      setScanResult(null);
                      setScanError('');
                    }}
                    className={`p-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase border transition-all ${
                      manualModeActive 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                    }`}
                  >
                    {manualModeActive ? '⚡ Usar Câmera / Scanner' : '⌨️ Digitar Código de Acesso'}
                  </button>

                  {/* Manual Input Form */}
                  {manualModeActive && (
                    <form onSubmit={handleManualCheck} className="w-full bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 space-y-3 mt-1">
                      <span className="text-[10px] text-zinc-450 uppercase font-bold tracking-wider block font-mono text-left">Teclado Central CondoAccess</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={40}
                          placeholder="Código de acesso..."
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 text-center font-mono font-black tracking-widest uppercase"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-bold font-mono transition-colors active:scale-95"
                        >
                          Validar
                        </button>
                      </div>
                      <span className="text-[9px] text-zinc-500 block leading-snug text-left">
                        Insira o código de acesso do visitante ou o código da encomenda.
                      </span>
                    </form>
                  )}

                  {/* Status and helpful instruction */}
                  <div className="text-center font-mono space-y-1 mt-1">
                    {isScanning ? (
                      <div className="text-[11px] text-emerald-450 uppercase font-black tracking-widest flex items-center gap-1 justify-center animate-pulse">
                        <Volume2 className="w-3 text-emerald-500" /> Aponte para o QRCode
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500 block">
                        {manualModeActive ? 'Pronto para digitação de código' : 'Aguardando scan de convite...'}
                      </span>
                    )}
                    <p className="text-[10px] text-zinc-500 max-w-[280px] leading-snug mx-auto pt-1 select-none">
                      O sistema reconhece tanto os convites QR ativos quanto as encomendas integradas.
                    </p>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Footer details */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/20 text-center flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-zinc-500">Tecnologia Digital &bull; Segurança Criptografada</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
