import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Clock, Check, CheckCircle2, Calendar, User, Upload, X, 
  FileText, Camera, Building, Filter, Inbox, ArrowRight, CornerDownLeft, 
  Image as ImageIcon, Lock, Trash2, AlertTriangle, LayoutGrid, List, Shield, 
  HelpCircle, FileSpreadsheet, Printer, RotateCcw, Bell, ChevronRight, CheckCircle, 
  RefreshCw, Award, Info
} from 'lucide-react';
import { Resident, AchadosPerdidos, AchadosPerdidosFoto, AchadosPerdidosHistorico } from '../types';

interface AchadosPerdidosViewProps {
  items: AchadosPerdidos[];
  photos: AchadosPerdidosFoto[];
  history: AchadosPerdidosHistorico[];
  residents: Resident[];
  operatorName: string;
  currentUser: { id: string; name: string; unit?: string; role: 'MASTER' | 'Administrador' | 'Porteiro' | 'Morador' };
  onAddItem: (item: AchadosPerdidos, filePhotos: string[], hist: AchadosPerdidosHistorico) => void;
  onUpdateItem: (item: AchadosPerdidos, hist?: AchadosPerdidosHistorico) => void;
  onRemoveItem: (id: string, reason: string) => void;
  onAddFoto: (foto: AchadosPerdidosFoto) => void;
  onRemoveFoto: (id: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Documentos & Carteiras',
  'Chaves',
  'Eletrônicos (Celulares, Fones, etc.)',
  'Vestuário & Calçados',
  'Acessórios (Óculos, Joias, Relógios)',
  'Brinquedos & Jogos',
  'Pets / Artigos para Animais',
  'Outros'
];

const DEFAULT_LOCATIONS = [
  'Garagem / Estacionamento',
  'Salão de Festas / Churrasqueira',
  'Academia / Fitness',
  'Elevadores',
  'Hall de Entrada / Portaria',
  'Piscina / Deck',
  'Quadra Poliesportiva',
  'Playground / Espaço Kids',
  'Escadas / Corredores',
  'Área Externa / Jardins',
  'Outro'
];

export default function AchadosPerdidosView({
  items = [],
  photos = [],
  history = [],
  residents = [],
  operatorName,
  currentUser,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onAddFoto,
  onRemoveFoto
}: AchadosPerdidosViewProps) {
  const isMorador = currentUser.role === 'Morador';
  const isAdmin = currentUser.role === 'Administrador' || currentUser.role === 'MASTER';
  const isPorteiro = currentUser.role === 'Porteiro';

  // Dynamic lists in state
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('achados_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [locations, setLocations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('achados_locations');
      return saved ? JSON.parse(saved) : DEFAULT_LOCATIONS;
    } catch {
      return DEFAULT_LOCATIONS;
    }
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('achados_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('achados_locations', JSON.stringify(locations));
  }, [locations]);

  // Inline inputs for new categories/locations
  const [addCategoryMode, setAddCategoryMode] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [addLocationMode, setAddLocationMode] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [locationFilter, setLocationFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'gallery'>('grid');

  // Modals / forms state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AchadosPerdidos | null>(null);

  // Form registration state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(() => categories[0] || 'Outros');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemLoc, setNewItemLoc] = useState(() => locations[0] || 'Outro');
  const [newItemDate, setNewItemDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().substring(0, 16);
  });
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemPhotos, setNewItemPhotos] = useState<string[]>([]); // Array of Optimized Base64 URLs

  // Claim/Solicitation form state (For residents)
  const [claimJustification, setClaimJustification] = useState('');
  const [claimDocFile, setClaimDocFile] = useState<string>('');

  // Delivery form state
  const [deliveryOwnerName, setDeliveryOwnerName] = useState('');
  const [deliveryOwnerUnit, setDeliveryOwnerUnit] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().substring(0, 16);
  });
  const [deliveryStaff, setDeliveryStaff] = useState(currentUser.name);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Camera capture states
  const [activeCameraType, setActiveCameraType] = useState<'new-item' | 'delivery' | 'claim' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Notifications simulation history
  const [notificationLogs, setNotificationLogs] = useState<{ id: string; time: string; channel: string; msg: string }[]>([]);

  // Expand item photo preview
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  // Trigger system warning
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const displayToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setLocalToast({ message, type });
    setTimeout(() => {
      setLocalToast(null);
    }, 5000);
  };

  const handleSaveCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (!trimmed) {
      displayToast('Digite um nome para a categoria.', 'error');
      return;
    }
    if (categories.some(cat => cat.toLowerCase() === trimmed.toLowerCase())) {
      displayToast('Esta categoria já existe.', 'error');
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewItemCategory(trimmed);
    setCustomCategory('');
    setAddCategoryMode(false);
    displayToast('Nova categoria adicionada com sucesso!', 'success');
  };

  const handleSaveCustomLocation = () => {
    const trimmed = customLocation.trim();
    if (!trimmed) {
      displayToast('Digite um nome para o local.', 'error');
      return;
    }
    if (locations.some(loc => loc.toLowerCase() === trimmed.toLowerCase())) {
      displayToast('Este local já existe.', 'error');
      return;
    }
    const updated = [...locations, trimmed];
    setLocations(updated);
    setNewItemLoc(trimmed);
    setCustomLocation('');
    setAddLocationMode(false);
    displayToast('Novo local adicionado com sucesso!', 'success');
  };

  // Helper compression function using Canvas
  const handleCompressFile = (file: File, callback: (base64: string) => void) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      displayToast('Formato inválido. Use JPG, JPEG, PNG ou WEBP.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      displayToast('Arquivo muito grande. Limite de 8MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Force maximum dimension of 800px to optimize storage & state sync speed
        const MAX_DIM = 800;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          callback(compressedBase64);
        } else {
          callback(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Process file upload dynamically
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, targetMode: 'new-item' | 'delivery' | 'claim') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      handleCompressFile(files[i], (compressedBase64) => {
        if (targetMode === 'new-item') {
          setNewItemPhotos(prev => [...prev, compressedBase64]);
        } else if (targetMode === 'delivery') {
          setDeliveryPhoto(compressedBase64);
        } else if (targetMode === 'claim') {
          setClaimDocFile(compressedBase64);
        }
      });
    }
    // Clean input
    e.target.value = '';
  };

  // HTML5 Native Camera Stream Activator
  const startCamera = async (type: 'new-item' | 'delivery' | 'claim') => {
    setActiveCameraType(type);
    setCameraActive(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        displayToast('Câmera não disponível no iframe. Por favor use o Upload.', 'info');
        setCameraActive(false);
        setActiveCameraType(null);
      }
    }, 200);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        if (activeCameraType === 'new-item') {
          setNewItemPhotos(prev => [...prev, dataUrl]);
        } else if (activeCameraType === 'delivery') {
          setDeliveryPhoto(dataUrl);
        } else if (activeCameraType === 'claim') {
          setClaimDocFile(dataUrl);
        }
        
        displayToast('Foto capturada com sucesso!');
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setActiveCameraType(null);
  };

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    const pos = getCoordinates(e, canvas);
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCoordinates(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // Simulated notifications sender
  const dispatchNotification = (channel: 'Sistema' | 'E-mail' | 'WhatsApp', recipientUnit: string, msg: string) => {
    const newLog = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString('pt-BR'),
      channel,
      msg: `[Apto ${recipientUnit}] ${msg}`
    };
    setNotificationLogs(prev => [newLog, ...prev]);
  };

  // Registration handler
  const handleAddNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemLoc.trim()) {
      displayToast('Por favor preencha o nome do objeto e o local encontrado.', 'error');
      return;
    }

    const itemId = crypto.randomUUID();
    const createdDate = new Date().toISOString();

    const preparedItem: AchadosPerdidos = {
      id: itemId,
      nome: newItemName.trim(),
      categoria: newItemCategory,
      descricao: newItemDesc.trim(),
      local_encontrado: newItemLoc.trim(),
      data_encontrado: new Date(newItemDate).toISOString(),
      status: 'Encontrado',
      createdBy: currentUser.name,
      created_by: currentUser.name,
      criado_por: currentUser.name,
      created_at: createdDate,
      updated_at: createdDate
    };

    const initialHistory: AchadosPerdidosHistorico = {
      id: crypto.randomUUID(),
      objeto_id: itemId,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name,
      acao: 'Cadastro',
      observacao: `Objeto cadastrado inicialmente na categoria "${newItemCategory}" pelo local "${newItemLoc}". Observações: ${newItemNotes}`,
      created_at: createdDate
    };

    // Feed to Parent App state
    onAddItem(preparedItem, newItemPhotos, initialHistory);

    // Simulated alerts
    dispatchNotification('Sistema', 'TODOS', `Um novo objeto encontrado foi cadastrado: ${preparedItem.nome} (${preparedItem.categoria}) no local ${preparedItem.local_encontrado}`);
    dispatchNotification('WhatsApp', 'TODOS', `Alerta de Achados: "${preparedItem.nome}" localizado em: "${preparedItem.local_encontrado}". Consulte painel.`);

    displayToast('Novo objeto registrado com sucesso!');
    setShowAddModal(false);

    // Reset fields
    setNewItemName('');
    setNewItemDesc('');
    setNewItemCategory(categories[0] || 'Outros');
    setNewItemLoc(locations[0] || 'Outro');
    setNewItemNotes('');
    setNewItemPhotos([]);
  };

  // Claims submission (Morador claim)
  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!claimJustification.trim()) {
      displayToast('Por favor descreva os detalhes de identificação do objeto.', 'error');
      return;
    }

    const updatedDate = new Date().toISOString();
    const updated: AchadosPerdidos = {
      ...selectedItem,
      status: 'Aguardando identificação',
      updated_at: updatedDate,
      comprovacao_posse: claimJustification.trim(),
      documento_comprovatorio: claimDocFile || undefined,
      solicitante_id: currentUser.id,
      solicitante_nome: currentUser.name,
      solicitante_unidade: currentUser.unit || 'Minha Unidade',
      solicitado_em: updatedDate
    };

    const histItem: AchadosPerdidosHistorico = {
      id: crypto.randomUUID(),
      objeto_id: selectedItem.id,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name,
      acao: 'Solicitação de devolução',
      observacao: `Morador ${currentUser.name} (Unidade ${currentUser.unit}) solicitou a devolução justificando: "${claimJustification.trim()}"`,
      created_at: updatedDate
    };

    onUpdateItem(updated, histItem);

    // Simulated notices
    dispatchNotification('Sistema', 'Portaria', `Solicitação de devolução criada para o objeto ${selectedItem.nome} pela unidade ${currentUser.unit}`);
    dispatchNotification('E-mail', 'Portaria', `O morador ${currentUser.name} enviou uma justificativa de posse para o item: ${selectedItem.nome}`);

    displayToast('Solicitação de posse realizada! Aguarde avaliação da portaria.');
    setShowClaimModal(false);
    setSelectedItem(updated);
    setClaimJustification('');
    setClaimDocFile('');
  };

  // Approve claim handler (Portaria/Admin reserves item)
  const handleApproveClaim = () => {
    if (!selectedItem) return;
    const updatedDate = new Date().toISOString();
    
    const updated: AchadosPerdidos = {
      ...selectedItem,
      status: 'Reservado para retirada',
      updated_at: updatedDate
    };

    const hist: AchadosPerdidosHistorico = {
      id: crypto.randomUUID(),
      objeto_id: selectedItem.id,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name,
      acao: 'Aprovação',
      observacao: `Solicitação aprovada pelo operador. Objeto reservado para entrega à unidade: ${selectedItem.solicitante_unidade || 'Desconhecido'}`,
      created_at: updatedDate
    };

    onUpdateItem(updated, hist);

    // Notices
    if (selectedItem.solicitante_unidade) {
      dispatchNotification('WhatsApp', selectedItem.solicitante_unidade, `Olá! Sua solicitação de devolução do item "${selectedItem.nome}" foi APROVADA. Apresente-se à portaria para retirada.`);
      dispatchNotification('Sistema', selectedItem.solicitante_unidade, `Sua reivindicação de posse sobre o item "${selectedItem.nome}" foi aceita. O item está aguardando sua retirada.`);
    }

    displayToast('Solicitação homologada com sucesso! Pronto para retirada.');
    setSelectedItem(updated);
  };

  // Delivery receipt form confirmation submit
  const handleDeliverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!deliveryOwnerName.trim()) {
      displayToast('Informe o nome do proprietário que está retirando.', 'error');
      return;
    }

    // Capture Signature from drawing Pad
    let base64Signature = '';
    const canvas = canvasRef.current;
    if (canvas) {
      // Check if signature was drawn (not entirely blank canvas)
      // We can grab canvas base64 directly
      base64Signature = canvas.toDataURL();
    }

    const updatedDate = new Date().toISOString();
    const updated: AchadosPerdidos = {
      ...selectedItem,
      status: 'Devolvido ao proprietário',
      updated_at: updatedDate,
      proprietario_nome: deliveryOwnerName.trim(),
      proprietario_unidade: deliveryOwnerUnit.trim(),
      data_retirada: new Date(deliveryDate).toISOString(),
      responsavel_entrega: deliveryStaff.trim(),
      assinatura_digital: base64Signature || undefined,
      foto_entrega: deliveryPhoto || undefined
    };

    const hist: AchadosPerdidosHistorico = {
      id: crypto.randomUUID(),
      objeto_id: selectedItem.id,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name,
      acao: 'Entrega',
      observacao: `Objeto entregue a ${deliveryOwnerName.trim()} (Unidade ${deliveryOwnerUnit.trim()}). Entregue por ${deliveryStaff.trim()}`,
      created_at: updatedDate
    };

    onUpdateItem(updated, hist);

    dispatchNotification('Sistema', deliveryOwnerUnit, `O item "${selectedItem.nome}" foi retirado na portaria hoje às ${new Date().toLocaleTimeString('pt-BR')}`);
    dispatchNotification('WhatsApp', deliveryOwnerUnit, `Recibo de Entrega: Item "${selectedItem.nome}" devidamente retirado e assinado digitalmente.`);

    displayToast('Entrega efetuada e recibo assinado!');
    setShowDeliverModal(false);
    setSelectedItem(updated);

    // Reset delivery forms
    setDeliveryOwnerName('');
    setDeliveryOwnerUnit('');
    setDeliveryPhoto('');
  };

  // Direct cancel or close action
  const handleCloseItemDirectly = () => {
    if (!selectedItem) return;
    if (!window.confirm('Tem certeza que deseja encerrar o fluxo deste item diretamente? O status passará para "Encerrado".')) return;

    const updatedDate = new Date().toISOString();
    const updated: AchadosPerdidos = {
      ...selectedItem,
      status: 'Encerrado',
      updated_at: updatedDate
    };

    const hist: AchadosPerdidosHistorico = {
      id: crypto.randomUUID(),
      objeto_id: selectedItem.id,
      usuario_id: currentUser.id,
      usuario_nome: currentUser.name,
      acao: 'Encerramento',
      observacao: `Objeto encerrado administrativamente devido a expiração ou arquivamento voluntário.`,
      created_at: updatedDate
    };

    onUpdateItem(updated, hist);
    displayToast('Item arquivado e encerrado.', 'info');
    setSelectedItem(updated);
  };

  // Soft delete item
  const handleDeleteItem = () => {
    if (!selectedItem) return;
    const reason = window.prompt('Informe o motivo de exclusão/desativação deste objeto:', 'Cadastro incorreto ou duplicidade') || 'Excluído administrativamente';
    onRemoveItem(selectedItem.id, reason);
    displayToast('Item removido com sucesso!', 'success');
    setShowDetailsModal(false);
    setSelectedItem(null);
  };

  // Dynamic Metrics & Reports calculation
  const totalFound = items.length;
  const totalReturned = items.filter(i => i.status === 'Devolvido ao proprietário').length;
  const totalReserved = items.filter(i => i.status === 'Reservado para retirada').length;
  const totalPendente = items.filter(i => i.status === 'Encontrado' || i.status === 'Aguardando identificação').length;
  
  // Calculate Avg time in hours / days to return
  const avgReturnTimeDays = React.useMemo(() => {
    const returnedItems = items.filter(i => i.status === 'Devolvido ao proprietário' && i.data_retirada);
    if (returnedItems.length === 0) return 0;

    let aggregateTimeMs = 0;
    returnedItems.forEach(item => {
      const foundMs = new Date(item.data_encontrado).getTime();
      const returnMs = new Date(item.data_retirada!).getTime();
      if (returnMs > foundMs) {
        aggregateTimeMs += (returnMs - foundMs);
      }
    });

    const avgMs = aggregateTimeMs / returnedItems.length;
    const avgDays = avgMs / (1000 * 60 * 60 * 24);
    return Math.round(avgDays * 10) / 10; // decimal 1 place
  }, [items]);

  // Filters calculation
  const filteredItems = items.filter(val => {
    const term = searchTerm.toLowerCase();
    const nameMatch = val.nome.toLowerCase().includes(term) || val.descricao.toLowerCase().includes(term);
    const catMatch = categoryFilter === 'Todas' || val.categoria === categoryFilter;
    const locMatch = locationFilter === 'Todos' || val.local_encontrado === locationFilter;
    const statMatch = statusFilter === 'Todos' || val.status === statusFilter;
    
    let dateMatch = true;
    if (dateFilter) {
      const itemDate = val.data_encontrado.split('T')[0];
      dateMatch = itemDate === dateFilter;
    }

    return nameMatch && catMatch && locMatch && statMatch && dateMatch;
  });

  // Export dynamically to CSV (opens beautifully in Excel)
  const handleExportExcel = () => {
    let csvContent = "\uFEFF"; // BOM for UTF-8 compatibility
    csvContent += "ID;Nome do Objeto;Categoria;Local Encontrado;Data Encontrado;Status;Criado Por;Proprietário;Unidade;Data Retirada;Responsável Entrega\n";

    filteredItems.forEach(i => {
      const histRecord = history?.find(h => h.objetoId === i.id || h.objeto_id === i.id);
      const creatorName = i.createdBy || i.created_by || i.criado_por || histRecord?.usuarioNome || histRecord?.usuario_nome || 'N/A';
      csvContent += `"${i.id}";"${i.nome}";"${i.categoria}";"${i.local_encontrado}";"${new Date(i.data_encontrado).toLocaleDateString('pt-BR')}";"${i.status}";"${creatorName}";"${i.proprietario_nome || 'N/A'}";"${i.proprietario_unidade || 'N/A'}";"${i.data_retirada ? new Date(i.data_retirada).toLocaleDateString('pt-BR') : 'N/A'}";"${i.responsavel_entrega || 'N/A'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `achados_perdidos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    displayToast('Relatório Excel (CSV) baixado com sucesso!');
  };

  // Printable Report Layout for printing directly to PDF
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      displayToast('Bloqueador de popups impediu abertura do relatório.', 'error');
      return;
    }

    const recordsHtml = filteredItems.map((val, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px; font-weight: bold;">#${idx+1}</td>
        <td style="padding: 6px;">${val.nome}</td>
        <td style="padding: 6px;">${val.categoria}</td>
        <td style="padding: 6px;">${val.local_encontrado}</td>
        <td style="padding: 6px;">${new Date(val.data_encontrado).toLocaleDateString('pt-BR')}</td>
        <td style="padding: 6px;">
          <span style="
            background: ${val.status === 'Devolvido ao proprietário' ? '#d1fae5' : val.status === 'Reservado para retirada' ? '#fef3c7' : '#e2e8f0'};
            color: ${val.status === 'Devolvido ao proprietário' ? '#065f46' : val.status === 'Reservado para retirada' ? '#92400e' : '#1e293b'};
            padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;
          ">${val.status}</span>
        </td>
        <td style="padding: 6px;">${val.proprietario_nome || 'N/A'} ${val.proprietario_unidade ? `(Apt ${val.proprietario_unidade})` : ''}</td>
        <td style="padding: 6px;">${val.data_retirada ? new Date(val.data_retirada).toLocaleDateString('pt-BR') : '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório - Achados e Perdidos</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 40px; }
            h1 { font-size: 22px; margin-bottom: 5px; color: #0f172a; }
            p { margin: 2px 0; font-size: 12px; }
            .header-info { border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; }
            .summary-cards { display: flex; gap: 12px; margin-bottom: 20px; }
            .card { flex: 1; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
            .card-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
            .card-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; font-size: 12px; background: #f1f5f9; }
            td { text-align: left; padding: 8px; }
            .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>Soberano Residencial - Relatório Oficial</h1>
            <p><strong>Módulo:</strong> Achados e Perdidos</p>
            <p><strong>Data de Emissão:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Filtro Corrente:</strong> Pesquisa: ${searchTerm || 'Nenhuma'}, Categoria: ${categoryFilter}, Status: ${statusFilter}</p>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Registrados</div>
              <div class="card-val">${totalFound}</div>
            </div>
            <div class="card">
              <div class="card-title font-medium text-emerald-700">Devolvidos</div>
              <div class="card-val text-emerald-800">${totalReturned}</div>
            </div>
            <div class="card">
              <div class="card-title text-amber-700">Aguardando/Pendentes</div>
              <div class="card-val text-amber-800">${totalPendente}</div>
            </div>
            <div class="card">
              <div class="card-title text-indigo-700">Tempo Médio Devolução</div>
              <div class="card-val text-indigo-800">${avgReturnTimeDays} dias</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Objeto</th>
                <th>Categoria</th>
                <th>Local Onde Encontrou</th>
                <th>Data Ocorrência</th>
                <th>Status Atual</th>
                <th>Proprietário Reclamante</th>
                <th>Data Saída</th>
              </tr>
            </thead>
            <tbody>
              ${recordsHtml || `<tr><td colspan="8" style="text-align:center; padding: 20px; color: #64748b;">Nenhum registro encontrado com os filtros aplicados.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            Soberano Residencial - Controle Eletrônico Integrado e Auditoria Condominial Automática
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper to resolve main display photo for an item
  const getItemMainFoto = (itemId: string) => {
    const firstMatch = photos.find(p => p.objeto_id === itemId);
    if (firstMatch) return firstMatch.url_foto;
    return null;
  };

  // Get list of photos for active item
  const getItemFotos = (itemId: string) => {
    return photos.filter(p => p.objeto_id === itemId).map(p => p.url_foto);
  };

  return (
    <div className="flex flex-col gap-6" id="achados-perdidos-view">
      
      {/* Local floating Toast warning */}
      <AnimatePresence>
        {localToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium flex items-center gap-2 ${
              localToast.type === 'error' ? 'bg-rose-600' : localToast.type === 'info' ? 'bg-slate-700' : 'bg-emerald-600'
            }`}
          >
            {localToast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            <span>{localToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Module Header & Bento Stats Grid */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-3xs border border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-6 h-6" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Achados e Perdidos</h1>
          </div>
          <p className="text-slate-500 text-xs">Acompanhamento, rastreabilidade, controle de recebimento e entrega de pertences no condomínio.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-slate-700 shadow-3xs"
            id="ap-export-excel-btn"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Planilha
          </button>
          <button 
            type="button"
            onClick={handlePrintPDF}
            className="px-3.5 py-2 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-slate-700 shadow-3xs"
            id="ap-print-pdf-btn"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" /> Emitir PDF
          </button>

          {!isMorador && (
            <button 
              type="button"
              onClick={() => setShowManageModal(true)}
              className="px-3.5 py-2 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-slate-700 shadow-3xs"
              id="ap-manage-lists-btn"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin-slow" /> Configurar Categorias/Locais
            </button>
          )}

          {!isMorador && (
            <button 
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-sm shadow-indigo-500/20"
              id="ap-register-btn"
            >
              <Plus className="w-4 h-4" /> Registrar Objeto
            </button>
          )}
        </div>
      </div>

      {/* Reports Metrics Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="ap-metrics-panel">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Localizados</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{totalFound}</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-600 font-semibold">Itens</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Devolvidos ao Dono</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600">{totalReturned}</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-600 font-semibold">
              {totalFound > 0 ? Math.round((totalReturned/totalFound)*100) : 0}% taxa
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Aguardando Resgate</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-600">{totalPendente}</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-600 font-semibold">{totalReserved} Reservado</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Tempo Médio Devolução</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{avgReturnTimeDays} <span className="text-xs font-normal text-slate-500">Dias</span></span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-50 text-slate-500 font-semibold">Foco Agilidade</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters Block */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3">
          
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou detalhes do objeto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-lg text-xs transition-colors bg-slate-50/50"
              id="ap-search-input"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 outline-none p-2 bg-slate-50/50 rounded-lg focus:border-indigo-500 bg-white"
                id="ap-category-select"
              >
                <option value="Todas">🧬 Todas Categorias</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <select 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 outline-none p-2 bg-slate-50/50 rounded-lg focus:border-indigo-500 bg-white"
                id="ap-location-select"
              >
                <option value="Todos">📍 Todos os Locais</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 outline-none p-2 bg-slate-50/50 rounded-lg focus:border-indigo-500"
                id="ap-status-select"
              >
                <option value="Todos">🎯 Todos Status</option>
                <option value="Encontrado">Encontrado (Ativo)</option>
                <option value="Aguardando identificação">Aguardando Identificação</option>
                <option value="Reservado para retirada">Reservado para Retirada</option>
                <option value="Devolvido ao proprietário">Devolvido ao Dono</option>
                <option value="Encerrado">Encerrado</option>
              </select>
            </div>

            <div>
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 outline-none p-2 bg-slate-50/50 rounded-lg focus:border-indigo-500"
                id="ap-date-picker"
              />
            </div>
          </div>

        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Exibindo <strong>{filteredItems.length}</strong> pertences filtrados</span>
          <div className="flex items-center border border-slate-100 p-0.5 rounded-lg bg-slate-50">
            <button 
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="Cards Grid"
              id="view-grid-btn"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="Lista Detalhada"
              id="view-list-btn"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('gallery')}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'gallery' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="Galeria Visual"
              id="view-gallery-btn"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Items Listing Block */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-3xs flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-slate-50 text-slate-350 rounded-full">
            <Inbox className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Nenhum pertence condiz com a busca</h3>
            <p className="text-slate-500 text-xs mt-1">Experimente remover alguns filtros ou expandir os termos pesquisados.</p>
          </div>
          {searchTerm || categoryFilter !== 'Todas' || statusFilter !== 'Todos' || dateFilter ? (
            <button 
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('Todas');
                setLocationFilter('Todos');
                setStatusFilter('Todos');
                setDateFilter('');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* VIEW MODE: CARDS GRID */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="ap-grid-container">
              {filteredItems.map(item => {
                const mainFoto = getItemMainFoto(item.id);
                return (
                  <motion.div 
                    layout
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setShowDetailsModal(true); }}
                    className="group bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 shadow-3xs hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
                  >
                    {/* Item Card Cover Image */}
                    <div className="h-44 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                      {mainFoto ? (
                        <img 
                          src={mainFoto} 
                          alt={item.nome} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-550">
                          <ImageIcon className="w-10 h-10 stroke-[1.2]" />
                          <span className="text-[10px] font-medium uppercase tracking-wider">Sem Imagem</span>
                        </div>
                      )}

                      {/* Status Tag on Cover */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-sm ${
                          item.status === 'Devolvido ao proprietário' ? 'bg-emerald-600' :
                          item.status === 'Reservado para retirada' ? 'bg-amber-500' :
                          item.status === 'Aguardando identificação' ? 'bg-teal-500 animate-pulse' :
                          item.status === 'Encerrado' ? 'bg-slate-600' : 'bg-indigo-600'
                        }`}>
                          {item.status === 'Devolvido ao proprietário' ? 'Devolvido' :
                           item.status === 'Reservado para retirada' ? 'Reservado' : item.status}
                        </span>
                      </div>
                    </div>

                    {/* Card details */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{item.categoria}</span>
                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors mt-0.5 line-clamp-1">{item.nome}</h3>
                        <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">{item.descricao || 'Nenhuma descrição fornecida.'}</p>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>Onde: <strong>{item.local_encontrado}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Em: <strong>{new Date(item.data_encontrado).toLocaleString('pt-BR')}</strong></span>
                        </div>
                        {item.proprietario_unidade && (
                          <div className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Retirado por Apt {item.proprietario_unidade}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE: DETAILED TABULAR LIST */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden" id="ap-list-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Pertence</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Local Encontrado</th>
                      <th className="p-4">Registrado Em</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Proprietário / Solicitante</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredItems.map(item => (
                      <tr 
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer text-xs text-slate-600"
                        onClick={() => { setSelectedItem(item); setShowDetailsModal(true); }}
                      >
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            {getItemMainFoto(item.id) ? (
                              <img src={getItemMainFoto(item.id)!} alt="" className="w-8 h-8 rounded-md object-cover border border-slate-100" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><ImageIcon className="w-4 h-4" /></div>
                            )}
                            <span>{item.nome}</span>
                          </div>
                        </td>
                        <td className="p-4">{item.categoria}</td>
                        <td className="p-4">{item.local_encontrado}</td>
                        <td className="p-4">{new Date(item.data_encontrado).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            item.status === 'Devolvido ao proprietário' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            item.status === 'Reservado para retirada' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            item.status === 'Aguardando identificação' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            item.status === 'Encerrado' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {item.proprietario_nome ? (
                            <span className="font-semibold text-slate-700">{item.proprietario_nome} (Apt {item.proprietario_unidade})</span>
                          ) : item.solicitante_nome ? (
                            <span className="text-teal-600 font-medium">Reclamado por {item.solicitante_nome} (Apt {item.solicitante_unidade})</span>
                          ) : (
                            <span className="text-slate-400">Nenhum</span>
                          )}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => { setSelectedItem(item); setShowDetailsModal(true); }}
                            className="p-1 px-3 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer border border-slate-100"
                            id={`action-detail-${item.id}`}
                          >
                            Analisar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE: COHESIVE VISUAL GALLERY */}
          {viewMode === 'gallery' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs" id="ap-gallery-container">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map(item => {
                  const mainFoto = getItemMainFoto(item.id);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setShowDetailsModal(true); }}
                      className="group relative h-40 bg-slate-900 rounded-xl overflow-hidden cursor-pointer shadow-3xs hover:shadow-md border border-slate-50"
                      title={item.nome}
                    >
                      {mainFoto ? (
                        <img 
                          src={mainFoto} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-500 p-2">
                          <ImageIcon className="w-6 h-6 stroke-[1.2]" />
                          <span className="text-[8px] uppercase tracking-wider text-center line-clamp-1">{item.nome}</span>
                        </div>
                      )}
                      
                      {/* Ambient hover slate label */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                        <span className="text-[9px] font-extrabold uppercase text-white/90 truncate">{item.categoria}</span>
                        <h4 className="text-[11px] font-bold text-white truncate">{item.nome}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* AUX CONTAINER: MOCK NOTIFICATIONS DISPATCH JOURNAL (Realism & audit assurance) */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-3xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Bell className="w-4 h-4 text-indigo-500 animate-pulse" />
            <h4 className="text-xs font-bold">Monitor de Notificações Condominiais (E-mail & WhatsApp)</h4>
          </div>
          <button 
            type="button" 
            onClick={() => setNotificationLogs([])}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Limpar Registro
          </button>
        </div>
        <p className="text-slate-500 text-[10px] mb-3">Logs em tempo real de mensagens de WhatsApp e alertas eletrônicos disparadas para garantir que o proprietário saiba que seu objeto foi resgatado.</p>
        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
          {notificationLogs.length === 0 ? (
            <span className="text-slate-400 text-[10px] italic">Aguardando novos eventos para disparos automáticos...</span>
          ) : (
            notificationLogs.map(log => (
              <div key={log.id} className="bg-white p-2 rounded-lg border border-slate-100 text-[10px] flex items-center justify-between gap-4 font-mono text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[8px] font-bold uppercase">{log.channel}</span>
                  <span className="truncate">{log.msg}</span>
                </div>
                <span className="text-slate-400">{log.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: REGISTRAR NOVO OBJETO (Portaria & Admin only) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="ap-register-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/20">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-600 text-white rounded-xl">
                    <Plus className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-tight">Cadastrar Pertence Encontrado</h2>
                    <p className="text-slate-500 text-[10px]">Gere um novo assentamento no livro eletrônico de Achados e Perdidos.</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => { stopCamera(); setShowAddModal(false); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddNewItemSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome do Objeto */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Objeto *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Chaveiro com controle Alarme"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 outline-none rounded-lg focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Categoria *</label>
                    {addCategoryMode ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Nova categoria..."
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="flex-1 text-xs p-2 border border-indigo-400 outline-none rounded-lg focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomCategory}
                          className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Ok
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddCategoryMode(false); setCustomCategory(''); }}
                          className="px-2 border border-slate-200 hover:bg-slate-50 text-slate-550 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <select 
                          value={newItemCategory}
                          onChange={(e) => setNewItemCategory(e.target.value)}
                          className="flex-1 text-xs p-2.5 border border-slate-200 outline-none rounded-lg focus:border-indigo-500 bg-white"
                        >
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => setAddCategoryMode(true)}
                          className="px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer min-h-[38px]"
                          title="Nova Categoria"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Descrição Detalhada */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Descrição Detalhada *</label>
                  <textarea 
                    placeholder="Descreva detalhes como cor, marcas de uso, gravuras, adesivos etc. Isso evita fraudes e facilita comprovações."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2.5 border border-slate-200 outline-none rounded-lg focus:border-indigo-500 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local Onde Encontrou */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Local onde foi Encontrado *</label>
                    {addLocationMode ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Novo local analógico..."
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          className="flex-1 text-xs p-2 border border-indigo-400 outline-none rounded-lg focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomLocation}
                          className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Ok
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddLocationMode(false); setCustomLocation(''); }}
                          className="px-2 border border-slate-200 hover:bg-slate-50 text-slate-550 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <select 
                          value={newItemLoc}
                          onChange={(e) => setNewItemLoc(e.target.value)}
                          className="flex-1 text-xs p-2.5 border border-slate-200 outline-none rounded-lg focus:border-indigo-500 bg-white"
                        >
                          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => setAddLocationMode(true)}
                          className="px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer min-h-[38px]"
                          title="Novo Local"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Data e Hora */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Data/Hora Encontrado *</label>
                    <input 
                      type="datetime-local" 
                      value={newItemDate}
                      onChange={(e) => setNewItemDate(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 outline-none rounded-lg focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                {/* Fotos upload, compress and smartphone camera stream integration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Anexar Imagens do Pertence (PNG, JPG, WEBP)</label>
                  
                  <div className="flex flex-col md:flex-row gap-3 items-stretch">
                    
                    {/* Source Selector Option: Câmera ou Arquivos */}
                    <div className="flex-1 flex flex-col justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 p-4 rounded-xl text-center bg-slate-50 transition-colors relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={(e) => onFileChange(e, 'new-item')}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-xs font-bold text-slate-600 block">Pesquisar na Galeria</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Clique ou arraste até aqui</span>
                    </div>

                    <button 
                      type="button"
                      onClick={() => startCamera('new-item')}
                      className="px-6 py-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-center flex flex-col justify-center items-center gap-1.5 transition-colors cursor-pointer text-slate-700"
                    >
                      <Camera className="w-8 h-8 text-indigo-600" />
                      <span className="text-xs font-bold">Capturar pela Câmera</span>
                      <span className="text-[9px] text-slate-400">Ativa stream móvel</span>
                    </button>
                    
                  </div>

                  {/* HTML5 Native Interactive Stream Overlay directly in view */}
                  {cameraActive && activeCameraType === 'new-item' && (
                    <div className="bg-slate-900 p-3 rounded-xl mt-3 flex flex-col items-center gap-2 relative border border-slate-800">
                      <video ref={videoRef} className="w-full max-h-56 object-cover rounded-lg bg-black"></video>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button" 
                          onClick={capturePhoto} 
                          className="px-4 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" /> Tirar Foto
                        </button>
                        <button 
                          type="button" 
                          onClick={stopCamera} 
                          className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Uploaded Base64 previews */}
                  {newItemPhotos.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] uppercase font-black text-slate-400 block mb-2">Miniaturas Carregadas ({newItemPhotos.length})</span>
                      <div className="flex flex-wrap gap-2.5">
                        {newItemPhotos.map((url, i) => (
                          <div key={i} className="group relative w-16 h-16 rounded-lg bg-slate-200 overflow-hidden border border-slate-350 shadow-3xs">
                            <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setNewItemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                              title="Excluir"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações Adicionais */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notas Internas de Controle (Opcional)</label>
                  <textarea 
                    placeholder="Ex: Objeto envelopado e guardado no armário B3 da zeladoria."
                    value={newItemNotes}
                    onChange={(e) => setNewItemNotes(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2.5 border border-slate-200 outline-none rounded-lg focus:border-indigo-500 resize-none"
                  />
                  <span className="text-slate-400 text-[10px] mt-1 block">Esta informação é mostrada apenas para portaria e administração.</span>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                  <button 
                    type="button" 
                    onClick={() => { stopCamera(); setShowAddModal(false); }}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm cursor-pointer shadow-indigo-500/20"
                    id="submit-new-item"
                  >
                    Homologar Registro
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ANALISAR DETALHES DO ITEM & TIMELINE */}
      <AnimatePresence>
        {showDetailsModal && selectedItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="ap-detail-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">{selectedItem.categoria}</span>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">{selectedItem.nome}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase ${
                    selectedItem.status === 'Devolvido ao proprietário' ? 'bg-emerald-600' :
                    selectedItem.status === 'Reservado para retirada' ? 'bg-amber-500' :
                    selectedItem.status === 'Aguardando identificação' ? 'bg-teal-500' :
                    selectedItem.status === 'Encerrado' ? 'bg-slate-600' : 'bg-indigo-600'
                  }`}>
                    {selectedItem.status}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowDetailsModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Core Contents */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">

                {/* Photos Slider */}
                {getItemFotos(selectedItem.id).length > 0 ? (
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-2">Imagens Anexadas</span>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x">
                      {getItemFotos(selectedItem.id).map((url, index) => (
                        <div 
                          key={index} 
                          onClick={() => setZoomedPhoto(url)}
                          className="relative w-36 h-28 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-3xs cursor-zoom-in group shrink-0 snap-start"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 p-6 rounded-xl text-center border border-dashed border-slate-200">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1 stroke-[1.2]" />
                    <span className="text-xs text-slate-500">Nenhuma foto desse pertence cadastrada.</span>
                  </div>
                )}

                {/* Left/Right core specifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide block">Local onde Encontrou</span>
                      <span className="font-bold text-slate-800">{selectedItem.local_encontrado}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide block">Registrado por</span>
                      <span className="font-medium text-slate-700">
                        {(() => {
                          const histRecord = history?.find(h => h.objetoId === selectedItem.id || h.objeto_id === selectedItem.id);
                          return selectedItem.createdBy || selectedItem.created_by || selectedItem.criado_por || histRecord?.usuarioNome || histRecord?.usuario_nome || 'N/A';
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide block">Data/Hora Log</span>
                      <span className="font-bold text-slate-800">{new Date(selectedItem.data_encontrado).toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide block">Última Modificação</span>
                      <span className="font-medium text-slate-700">{new Date(selectedItem.updated_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                {/* Descrição Detalhada */}
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide block">Descrição Detalhada do Objeto</span>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed font-sans shadow-3xs">
                    {selectedItem.descricao}
                  </div>
                </div>

                {/* Claim Claiming / Identification Details (if created) */}
                {selectedItem.comprovacao_posse && (
                  <div className="bg-teal-50/40 p-4 rounded-xl border border-teal-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-teal-600 text-white rounded-md"><Info className="w-3.5 h-3.5" /></span>
                      <h4 className="font-bold text-teal-800 text-xs">Reivindicação de Posse Ativa</h4>
                    </div>
                    <div className="text-xs space-y-2">
                      <p className="text-slate-600">Reclamado por: <strong>{selectedItem.solicitante_nome} (Apt {selectedItem.solicitante_unidade})</strong> em {new Date(selectedItem.solicitado_em || selectedItem.updated_at).toLocaleDateString('pt-BR')}</p>
                      <div className="bg-white p-2.5 rounded-lg border border-teal-100 text-teal-950 font-sans italic">
                        &ldquo;{selectedItem.comprovacao_posse}&ldquo;
                      </div>
                      
                      {selectedItem.documento_comprovatorio && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-teal-700 block mb-1">Cópia do Documento / Comprovante fiscal</span>
                          <button 
                            type="button"
                            onClick={() => setZoomedPhoto(selectedItem.documento_comprovatorio!)}
                            className="bg-white border border-teal-200 rounded-lg p-2 flex items-center gap-2 text-teal-850 hover:bg-teal-50 text-[10px] font-bold cursor-pointer transition-colors shadow-3xs"
                          >
                            <ImageIcon className="w-4 h-4 text-teal-600" /> Analisar Documento Anexo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery details if already finalized */}
                {selectedItem.status === 'Devolvido ao proprietário' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-xs">Termo Eletrônico de Entrega Homologado</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div>
                        <p>Proprietário: <strong>{selectedItem.proprietario_nome}</strong></p>
                        <p>Apartamento: <strong>{selectedItem.proprietario_unidade}</strong></p>
                        <p>Data Entrega: <strong>{selectedItem.data_retirada ? new Date(selectedItem.data_retirada).toLocaleString('pt-BR') : '-'}</strong></p>
                        <p>Quem Devolveu: <strong>{selectedItem.responsavel_entrega}</strong></p>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3 items-start md:items-stretch">
                        {/* Digital physical signature image */}
                        {selectedItem.assinatura_digital && (
                          <div className="flex-1 bg-white p-2 rounded-lg border border-slate-200 flex flex-col justify-between items-center h-24">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Assinatura Digital</span>
                            <img src={selectedItem.assinatura_digital} alt="Signature" className="max-h-16 max-w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {/* Handover delivery photo */}
                        {selectedItem.foto_entrega && (
                          <div 
                            onClick={() => setZoomedPhoto(selectedItem.foto_entrega!)}
                            className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in relative bg-slate-900 shadow-3xs"
                          >
                            <img src={selectedItem.foto_entrega} alt="Handover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Tracker / Histórico de Movimentações */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide block">Histórico de Movimentações (Trilha de Auditoria)</span>
                    <button 
                      type="button" 
                      onClick={() => setShowTimelineModal(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      Ver com detalhes
                    </button>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {history.filter(h => h.objeto_id === selectedItem.id).length === 0 ? (
                      <span className="text-slate-400 text-xs italic">Nenhum histórico estruturado para este item.</span>
                    ) : (
                      history
                        .filter(h => h.objeto_id === selectedItem.id)
                        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // latest first
                        .map(h => (
                          <div key={h.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] font-sans flex items-start gap-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 mt-0.5 text-white ${
                              h.acao === 'Cadastro' ? 'bg-indigo-600' :
                              h.acao === 'Solicitação de devolução' ? 'bg-teal-600' :
                              h.acao === 'Aprovação' ? 'bg-amber-600' :
                              h.acao === 'Entrega' ? 'bg-emerald-600' : 'bg-slate-600'
                            }`}>
                              {h.acao}
                            </span>
                            <div className="flex-1 space-y-0.5">
                              <p className="text-slate-700">{h.observacao || 'Nenhum detalhe.'}</p>
                              <div className="flex items-center gap-1.5 text-slate-400 text-[9px]">
                                <span>Por: <strong>{h.usuario_nome}</strong></span>
                                <span>•</span>
                                <span>{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer contextual actions based on permission roles */}
                <div className="p-6 border-t border-slate-100 gap-3 flex flex-wrap justify-end items-center bg-slate-50/50">
                  <div className="flex-1 flex gap-2">
                    {/* Excluir/Soft Delete for Master/Admin */}
                    {isAdmin && (
                      <button 
                        type="button" 
                        onClick={handleDeleteItem}
                        className="px-3.5 py-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-xs font-semibold cursor-pointer border border-transparent transition-all text-slate-400"
                        title="Remover definitivamente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Direct closing / override for Admin */}
                    {isAdmin && (selectedItem.status !== 'Devolvido ao proprietário' && selectedItem.status !== 'Encerrado') && (
                      <button 
                        type="button" 
                        onClick={handleCloseItemDirectly}
                        className="px-3 py-2 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer transition-colors"
                      >
                        Encerrar Objeto
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200 transition-colors"
                    >
                      Fechar
                    </button>

                    {/* claim action for morador */}
                    {isMorador && (selectedItem.status === 'Encontrado' || selectedItem.status === 'Aguardando identificação' || !selectedItem.comprovacao_posse) && (
                      <button 
                        type="button"
                        onClick={() => { setShowClaimModal(true); }}
                        className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                        id="recuperar-objeto-btn"
                      >
                        Este objeto é meu
                      </button>
                    )}

                    {/* Evaluates Claim for Portaria/Admin */}
                    {!isMorador && selectedItem.status === 'Aguardando identificação' && selectedItem.comprovacao_posse && (
                      <button 
                        type="button"
                        onClick={handleApproveClaim}
                        className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                        id="approve-claim-btn"
                      >
                        Aprovar Posse & Reservar
                      </button>
                    )}

                    {/* Perform Deliver/Entrega for Portaria/Admin */}
                    {!isMorador && (selectedItem.status === 'Encontrado' || selectedItem.status === 'Aguardando identificação' || selectedItem.status === 'Reservado para retirada') && (
                      <button 
                        type="button"
                        onClick={() => { 
                          setDeliveryOwnerName(selectedItem.solicitante_nome || '');
                          setDeliveryOwnerUnit(selectedItem.solicitante_unidade || '');
                          setShowDeliverModal(true); 
                        }}
                        className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow-sm"
                        id="deliver-action-btn"
                      >
                        Registrar Entrega
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: SOLICITAR DEVOLUÇÃO (Morador claim modal) */}
      <AnimatePresence>
        {showClaimModal && selectedItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto" id="ap-claim-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-teal-50/10">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-teal-600 text-white rounded-lg font-black text-xs font-sans">REIVINDICAR</span>
                  <h3 className="text-sm font-bold text-slate-900">Reivindicação de Propriedade</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowClaimModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleClaimSubmit} className="p-5 space-y-4">
                <p className="text-[10px] text-slate-500 leading-relaxed">Para segurança de todos, forneça detalhes, características exclusivas, notas fiscais ou fotos comprovatórias do bem para que a portaria autorize a liberação com respaldo legal.</p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Características Comprobatórias *</label>
                  <textarea 
                    placeholder="Descreva detalhes como arranhões, chaveiros, marcas, senhas de bloqueio de eletrônico ou o que mais prove que este objeto é seu."
                    value={claimJustification}
                    onChange={(e) => setClaimJustification(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2 border border-slate-200 outline-none rounded-lg focus:border-indigo-500 resize-none font-sans"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Anexar Comprovante / Foto de propriedade (Opcional)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 p-3 rounded-xl text-center transition-colors">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => onFileChange(e, 'claim')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                      <span className="text-[10px] font-bold text-slate-500 block mt-1">Carregar Documento</span>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => startCamera('claim')}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                      title="Câmera do Celular"
                    >
                      <Camera className="w-5 h-5 text-indigo-600" />
                    </button>
                  </div>

                  {claimDocFile && (
                    <div className="mt-2.5 p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] text-teal-600 font-bold truncate">Anexo selecionado</span>
                      <button 
                        type="button" 
                        onClick={() => setClaimDocFile('')}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {cameraActive && activeCameraType === 'claim' && (
                    <div className="bg-slate-900 p-2 rounded-xl mt-3 flex flex-col items-center gap-2 relative">
                      <video ref={videoRef} className="w-full max-h-40 object-cover rounded-md bg-black"></video>
                      <button type="button" onClick={capturePhoto} className="px-3 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-md">Capturar Foto</button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => { stopCamera(); setShowClaimModal(false); }}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg cursor-pointer"
                    id="submit-claim-claim"
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: REGISTRAR ENTREGA / CONTROLE DE RETIRADA (Portaria & Admin) */}
      <AnimatePresence>
        {showDeliverModal && selectedItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto" id="ap-deliver-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/10">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 text-xs font-black bg-emerald-600 text-white rounded-md tracking-wider">RETIRADA</span>
                  <h3 className="text-sm font-bold text-slate-900">Protocolar Devolução do Bem</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => { stopCamera(); setShowDeliverModal(false); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleDeliverSubmit} className="p-5 space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Proprietário *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Júlio César Silveira"
                      value={deliveryOwnerName}
                      onChange={(e) => setDeliveryOwnerName(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 outline-none rounded-lg focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unidade / Apartamento *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Torre A - Apt 104"
                      value={deliveryOwnerUnit}
                      onChange={(e) => setDeliveryOwnerUnit(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 outline-none rounded-lg focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Data/Hora da Retirada *</label>
                    <input 
                      type="datetime-local" 
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 outline-none rounded-lg focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Operador Responsável *</label>
                    <input 
                      type="text" 
                      value={deliveryStaff}
                      onChange={(e) => setDeliveryStaff(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 outline-none rounded-lg focus:border-indigo-500 bg-slate-50"
                      disabled
                      required
                    />
                  </div>
                </div>

                {/* Handover delivery photo (opcional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Anexar Foto da Entrega / Entrega física do bem (Opcional)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 p-2 rounded-xl text-center transition-colors">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => onFileChange(e, 'delivery')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-4 h-4 text-slate-400 mx-auto" />
                      <span className="text-[9px] font-bold text-slate-500 block">Carregar Foto</span>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => startCamera('delivery')}
                      className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 bg-white cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>

                  {deliveryPhoto && (
                    <div className="mt-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                      <span className="text-[9px] text-emerald-600 font-bold truncate">Imagem de entrega anexada</span>
                      <button 
                        type="button" 
                        onClick={() => setDeliveryPhoto('')}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {cameraActive && activeCameraType === 'delivery' && (
                    <div className="bg-slate-900 p-2 rounded-xl mt-3 flex flex-col items-center gap-2 relative">
                      <video ref={videoRef} className="w-full max-h-40 object-cover rounded-md bg-black"></video>
                      <button type="button" onClick={capturePhoto} className="px-3 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-md">Capturar Foto</button>
                    </div>
                  )}
                </div>

                {/* Interactive signature drawing canvas screen representation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assinatura Digital do Proprietário * (Desenhe com cursor / dedo)</label>
                  <div className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden relative shadow-inner">
                    <canvas 
                      ref={canvasRef}
                      width={520}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 block bg-white cursor-crosshair touch-none"
                    />
                    <button 
                      type="button"
                      onClick={clearSignature}
                      className="absolute bottom-2 right-2 px-2.5 py-1 text-[9px] font-black text-slate-500 hover:bg-slate-100 bg-white border border-slate-200 rounded-md shadow-3xs cursor-pointer"
                    >
                      Refazer Assinatura
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => { stopCamera(); setShowDeliverModal(false); }}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-sm"
                    id="submit-delivery-final"
                  >
                    Finalizar Entrega & Gravar Protocolo
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: TIMELINE INTEIRA EXPANDIDA (Foco em auditoria profunda) */}
      <AnimatePresence>
        {showTimelineModal && selectedItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto" id="ap-timeline-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Histórico de Rastreabilidade Completo</h3>
                <button 
                  type="button" 
                  onClick={() => setShowTimelineModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-[10px] text-slate-500">Mapeamento cronológico rígido exigido pela administração a fim de garantir a custódia íntegra de todos os objetos esquecidos.</p>
                
                <div className="relative border-l-2 border-slate-100 pl-4 space-y-6">
                  {history
                    .filter(h => h.objeto_id === selectedItem.id)
                    .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // chronological order
                    .map((h, i) => (
                      <div key={h.id} className="relative">
                        {/* Circle bullet on timeline line */}
                        <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border bg-white border-indigo-600" />
                        
                        <div className="text-xs">
                          <span className="text-[10px] font-bold text-slate-400 block">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                          <span className="font-extrabold text-indigo-700 uppercase text-[9px] mt-0.5 tracking-wide block">{h.acao}</span>
                          <p className="text-slate-700 mt-1 font-sans font-medium">{h.observacao || 'Modificação efetuada.'}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">Autor: <strong>{h.usuario_nome}</strong></span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                <button 
                  type="button" 
                  onClick={() => setShowTimelineModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: LIGHTBOX DE AMPLIAÇÃO DA FOTO (Visual Ampliada) */}
      <AnimatePresence>
        {zoomedPhoto && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-60" 
            onClick={() => setZoomedPhoto(null)}
            id="ap-lightbox-modal"
          >
            <div className="relative max-w-4xl max-h-screen">
              <img 
                src={zoomedPhoto} 
                alt="Ampliando pertença" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg border border-slate-800"
                referrerPolicy="no-referrer"
              />
              <button 
                type="button"
                onClick={() => setZoomedPhoto(null)} 
                className="absolute -top-12 right-0 p-2 text-white hover:text-slate-200 bg-white/10 rounded-full cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <p className="text-center text-slate-400 text-xs mt-3 select-none">Clique em qualquer parte preta externa para sair</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: CONFIGURAR CATEGORIAS & LOCAIS (Portaria & Admin only) */}
      <AnimatePresence>
        {showManageModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="ap-manage-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/20">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-600 text-white rounded-xl animate-pulse">
                    <RefreshCw className="w-5 h-5 animate-spin-slow" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-tight">Configurar Categorias & Locais</h2>
                    <p className="text-slate-500 text-[10px]">Adicione, filtre ou remova termos pré-definidos de categorias e locais de ocorrência no condomínio.</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowManageModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                {/* Column 1: Categories */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col h-[50vh]">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    🧬 Categorias Disponíveis ({categories.length})
                  </h3>
                  
                  {/* Inline Add */}
                  <div className="flex gap-1.5 mb-4">
                    <input
                      type="text"
                      placeholder="Adicionar nova categoria..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="flex-1 text-xs p-2 border border-slate-200 outline-none rounded-lg focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveCustomCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomCategory}
                      className="px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  {/* Scroller list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {categories.map((cat) => (
                      <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
                        <span className="text-xs font-medium text-slate-700">{cat}</span>
                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja remover a categoria "${cat}" do catálogo de opções de cadastro? Seus itens atuais não serão afetados.`)) {
                                const updated = categories.filter(c => c !== cat);
                                setCategories(updated);
                                if (newItemCategory === cat) setNewItemCategory(updated[0] || '');
                                displayToast(`Categoria "${cat}" removida.`, 'info');
                              }
                            }}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            title="Excluir Categoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Locations */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col h-[50vh]">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    📍 Locais Registrados ({locations.length})
                  </h3>
                  
                  {/* Inline Add */}
                  <div className="flex gap-1.5 mb-4">
                    <input
                      type="text"
                      placeholder="Adicionar novo local..."
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="flex-1 text-xs p-2 border border-slate-200 outline-none rounded-lg focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveCustomLocation();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomLocation}
                      className="px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  {/* Scroller list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {locations.map((loc) => (
                      <div key={loc} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
                        <span className="text-xs font-medium text-slate-700">{loc}</span>
                        {locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja remover o local "${loc}" do catálogo de locais disponíveis?`)) {
                                const updated = locations.filter(l => l !== loc);
                                setLocations(updated);
                                if (newItemLoc === loc) setNewItemLoc(updated[0] || '');
                                displayToast(`Local "${loc}" removido.`, 'info');
                              }
                            }}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            title="Excluir Local"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <button 
                  type="button" 
                  onClick={() => setShowManageModal(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors"
                >
                  Concluir e Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
