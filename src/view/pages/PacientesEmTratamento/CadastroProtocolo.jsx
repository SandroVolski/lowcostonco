import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProtocolo } from '../../../context/ProtocoloContext';
import { 
  Plus, Edit, Trash2, Search, X, Save, 
  ArrowUpWideNarrow, ArrowDownWideNarrow, Database, 
  ChevronDown, ChevronRight, Calendar, Grid, List, 
  Filter, Pill, Clock, Droplet, Activity, Bookmark,
  Info, User, SlidersHorizontal, ArrowLeft
} from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import CIDSelection from '../../../components/pacientes/CIDSelection';
import CacheService from '../../../services/CacheService';
import DataRefreshButton from '../../../components/DataRefreshButton';
import DiasAdministracaoSelector from '../../../components/pacientes/DiasAdministracaoSelector';
import './PacientesEstilos.css';
import ProtocoloFlipCard from '../../../components/pacientes/ProtocoloFlipCard';
import '../../../components/pacientes/ProtocoloFlipCard.css';

// Definições das constantes para as opções predefinidas
const UNIDADES_MEDIDA_PREDEFINIDAS = [
  { id: 'Mg', sigla: 'Mg', nome: 'Miligrama' },
  { id: 'Mgm2', sigla: 'Mgm2', nome: 'Miligrama por m2' }, 
  { id: 'MgKg', sigla: 'MgKg', nome: 'Miligrama por quilograma' },
  { id: 'AUC', sigla: 'AUC', nome: 'Área sob a curva' },
  { id: 'UI', sigla: 'UI', nome: 'Unidade Internacional' }, // Nova unidade
  { id: 'mcg', sigla: 'mcg', nome: 'Micrograma' } // Nova unidade
];

const FREQUENCIAS_ADMINISTRACAO = [
  { value: '1x', label: '1x' },
  { value: '2x', label: '2x' },
  { value: '3x', label: '3x' },
  { value: '4x', label: '4x' },
  { value: '5x', label: '5x' }
];

// Chaves para cache dos medicamentos
const CACHE_KEYS = {
  MEDICAMENTOS_CACHE: 'cached_medicamentos_por_protocolo',
  MEDICAMENTO_CACHE_PREFIX: 'cached_medicamento_protocolo_',
  MEDICAMENTOS_TIMESTAMP: 'medicamentos_last_update'
};

// Componente Principal do Cadastro de Protocolo
function ProtocoloForm() {
  // Contexto com todas as propriedades necessárias
  const { 
    filteredProtocolos, 
    loading, 
    error, 
    addProtocolo, 
    updateProtocolo, 
    deleteProtocolo, 
    selectProtocolo,
    selectedProtocolo,
    searchProtocolos,
    searchTerm,
    loadProtocolos,
    viasAdministracao,
    loadProtocoloServicos,
    loadProtocoloDetails,
    addServicoToProtocolo,
    deleteServicoFromProtocolo,
    updateServicoProtocolo,
    
    // Propriedades de cache (se necessário)
    isCacheEnabled,
    dataSource: contextDataSource,
    totalRecords,
    toggleCache,
    clearCache,
    forceRevalidation,
    reloadAllData,
    refreshDataAfterModification: contextRefreshData
  } = useProtocolo();

  // Estados para controle da UI
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Protocolo_Nome");
  const [searchType, setSearchType] = useState("nome");
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [updateError, setUpdateError] = useState(null);
  const [servicosLoading, setServicosLoading] = useState({});
  const [dataSource, setDataSource] = useState('');
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [orderedProtocolos, setOrderedProtocolos] = useState([]);
  const [cardFlipped, setCardFlipped] = useState({});
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Estados específicos da tela de protocolos
  const [unidadesMedida, setUnidadesMedida] = useState(UNIDADES_MEDIDA_PREDEFINIDAS);
  const [allMedicamentosLoaded, setAllMedicamentosLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [medicamentosCache, setMedicamentosCache] = useState({});
  const [expandedRows, setExpandedRows] = useState({});

  // Refs
  const searchInputRef = useRef(null);
  const loadedProtocolIds = useRef(new Set());
  const medicamentosLoadingPromise = useRef(null);

  // Estado para o formulário expandido com medicamentos
  const [formData, setFormData] = useState({
    Protocolo_Nome: '',
    Protocolo_Sigla: '',
    CID: '',
    Intervalo_Ciclos: '',
    Ciclos_Previstos: '',
    Linha: '',
    medicamentos: [] // Iniciar como array vazio
  });

  // Funções para gerenciar o cache de medicamentos
  const saveMedicamentosToCache = (medicamentosData) => {
    if (!isCacheEnabled) return;
    
    try {
      // Armazenar o timestamp da última atualização
      localStorage.setItem(CACHE_KEYS.MEDICAMENTOS_TIMESTAMP, Date.now().toString());
      
      // Armazenar o mapeamento de medicamentos por protocolo
      localStorage.setItem(CACHE_KEYS.MEDICAMENTOS_CACHE, JSON.stringify(medicamentosData));
      
      console.log(`Cache de medicamentos atualizado: ${Object.keys(medicamentosData).length} protocolos`);
    } catch (error) {
      console.error("Erro ao salvar medicamentos no cache:", error);
    }
  };

  const loadMedicamentosFromCache = () => {
    if (!isCacheEnabled) return null;
    
    try {
      // Verificar se o cache existe
      const cachedData = localStorage.getItem(CACHE_KEYS.MEDICAMENTOS_CACHE);
      if (!cachedData) return null;
      
      // Verificar se o cache está obsoleto
      const lastUpdate = localStorage.getItem(CACHE_KEYS.MEDICAMENTOS_TIMESTAMP);
      const lastWrite = CacheService.getLastWriteTimestamp();
      
      // Se o timestamp de escrita global for mais recente que a última atualização do cache,
      // considerar o cache obsoleto
      if (lastWrite && lastUpdate && parseInt(lastWrite) > parseInt(lastUpdate)) {
        console.log("Cache de medicamentos está obsoleto devido a modificações recentes");
        return null;
      }
      
      const parsedData = JSON.parse(cachedData);
      console.log(`Carregado cache de medicamentos: ${Object.keys(parsedData).length} protocolos`);
      
      return parsedData;
    } catch (error) {
      console.error("Erro ao carregar medicamentos do cache:", error);
      return null;
    }
  };

  const invalidateMedicamentosCache = () => {
    try {
      localStorage.removeItem(CACHE_KEYS.MEDICAMENTOS_CACHE);
      console.log("Cache de medicamentos invalidado");
    } catch (error) {
      console.error("Erro ao invalidar cache de medicamentos:", error);
    }
  };

  // Nova função para verificar se há medicamentos no cache
  const getMedicamentosFromCache = (protocoloId) => {
    return medicamentosCache[protocoloId] || null;
  };

  // Carrega dados iniciais
  useEffect(() => {
    const initializeData = async () => {
      try {
        setInitialLoading(true);
        
        // Inicializar o serviço de cache
        CacheService.init();
        
        // Verificar se há medicamentos em cache
        const cachedMedicamentos = loadMedicamentosFromCache();
        
        if (cachedMedicamentos) {
          // Se tiver cache, usar diretamente
          setMedicamentosCache(cachedMedicamentos);
          setAllMedicamentosLoaded(true);
          console.log("Usando medicamentos do cache");
        }
        
        // Carregar protocolos
        const protocolData = await loadProtocolos();
        
        // Se não tiver cache de medicamentos, carregar todos
        if (!cachedMedicamentos) {
          await loadAllMedicamentos(protocolData);
        }
      } catch (error) {
        console.error("Erro durante inicialização:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    initializeData();
  }, [loadProtocolos]);

  // Função para carregar todos os medicamentos de uma vez
  const loadAllMedicamentos = async (protocolos) => {
    if (!protocolos || protocolos.length === 0 || allMedicamentosLoaded) {
      return;
    }
    
    // Se já houver um carregamento em andamento, aguardar
    if (medicamentosLoadingPromise.current) {
      await medicamentosLoadingPromise.current;
      return;
    }
    
    try {
      console.log("Carregando medicamentos para todos os protocolos...");
      
      // Criar e armazenar a promessa de carregamento
      const loadPromise = (async () => {
        // Array para armazenar as promessas de carregamento
        const loadPromises = [];
        
        // Armazenar medicamentos por ID de protocolo
        const medicamentosPorProtocolo = {};
        
        // Para cada protocolo, criar uma promessa para carregar seus medicamentos
        protocolos.forEach(protocolo => {
          const protocoloId = protocolo.id;
          
          // Adicionar ID ao conjunto de IDs carregados
          loadedProtocolIds.current.add(protocoloId);
          
          // Criar promessa para carregar medicamentos
          loadPromises.push(
            loadProtocoloServicos(protocoloId)
              .then(servicos => {
                // Armazenar medicamentos no dicionário
                medicamentosPorProtocolo[protocoloId] = servicos || [];
                return { id: protocoloId, medicamentos: servicos || [] };
              })
              .catch(error => {
                console.error(`Erro ao carregar serviços para protocolo ${protocoloId}:`, error);
                medicamentosPorProtocolo[protocoloId] = [];
                return { id: protocoloId, medicamentos: [] };
              })
          );
        });
        
        // Executar todas as promessas em paralelo
        const results = await Promise.all(loadPromises);
        
        // Atualizar o cache de medicamentos
        setMedicamentosCache(medicamentosPorProtocolo);
        
        // Salvar no cache
        saveMedicamentosToCache(medicamentosPorProtocolo);
        
        // Atualizar os protocolos com os medicamentos carregados
        const updatedProtocolos = protocolos.map(protocolo => {
          const result = results.find(r => r.id === protocolo.id);
          if (result) {
            return {
              ...protocolo,
              medicamentos: result.medicamentos
            };
          }
          return protocolo;
        });
        
        // Atualizar o estado com os protocolos atualizados
        setOrderedProtocolos(updatedProtocolos);
        setAllMedicamentosLoaded(true);
        console.log("Todos os medicamentos carregados com sucesso!");
        
        // Limpar a referência da promessa
        medicamentosLoadingPromise.current = null;
      })();
      
      // Armazenar a promessa para poder aguardar se necessário
      medicamentosLoadingPromise.current = loadPromise;
      
      // Aguardar a conclusão
      await loadPromise;
      
    } catch (error) {
      console.error("Erro ao carregar todos os medicamentos:", error);
      medicamentosLoadingPromise.current = null;
    }
  };

  // Sincronizar dataSource do contexto
  useEffect(() => {
    if (contextDataSource) {
      setDataSource(contextDataSource);
    }
  }, [contextDataSource]);

  // Efeito para ordenar protocolos
  useEffect(() => {
    if (!filteredProtocolos || !Array.isArray(filteredProtocolos) || filteredProtocolos.length === 0) return;
  
    const sorted = [...filteredProtocolos].sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      const numericFields = ['id', 'Protocolo_Dose_M', 'Protocolo_Dose_Total', 'Intervalo_Ciclos', 'Ciclos_Previstos', 'Linha'];
      
      if (numericFields.includes(sortField) && !isNaN(aValue) && !isNaN(bValue)) {
        const numA = Number(aValue);
        const numB = Number(bValue);
        const comparison = numA - numB;
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });
    
    // IMPORTANTE: Preservar medicamentos que já estavam nos protocolos anteriores
    const sortedWithMedicamentos = sorted.map(protocolo => {
      // Buscar medicamentos em várias fontes e garantir que sejam preservados
      
      // 1. Verificar no orderedProtocolos atual
      const protocoloAnterior = orderedProtocolos.find(p => p.id === protocolo.id);
      if (protocoloAnterior && protocoloAnterior.medicamentos && protocoloAnterior.medicamentos.length > 0) {
        return { ...protocolo, medicamentos: protocoloAnterior.medicamentos };
      }
      
      // 2. Verificar no cache de medicamentos
      const cachedMedicamentos = getMedicamentosFromCache(protocolo.id);
      if (cachedMedicamentos && cachedMedicamentos.length > 0) {
        return { ...protocolo, medicamentos: cachedMedicamentos };
      }
      
      // 3. Usar medicamentos do próprio protocolo se disponíveis
      if (protocolo.medicamentos && protocolo.medicamentos.length > 0) {
        return protocolo;
      }
      
      // 4. Como último recurso, retornar o protocolo sem medicamentos
      return protocolo;
    });
    
    setOrderedProtocolos(sortedWithMedicamentos);
  }, [filteredProtocolos, sortField, sortOrder, medicamentosCache]);

  // Função para carregar serviços de um protocolo específico
  const fetchServicos = useCallback(async (protocoloId) => {
    if (!protocoloId) return;
    
    // Verificar se já temos os medicamentos no cache
    if (medicamentosCache[protocoloId]) {
      console.log(`Usando medicamentos em cache para protocolo ${protocoloId}`);
      
      // Atualizar expandedRows com os medicamentos do cache
      setExpandedRows(prev => {
        if (!prev[protocoloId]) return prev;
        
        return {
          ...prev,
          [protocoloId]: {
            ...prev[protocoloId],
            expanded: true,
            servicos: medicamentosCache[protocoloId],
            medicamentos: medicamentosCache[protocoloId]
          }
        };
      });
      
      return medicamentosCache[protocoloId];
    }
    
    try {
      setServicosLoading(prev => ({ ...prev, [protocoloId]: true }));
      
      const servicos = await loadProtocoloServicos(protocoloId);
      
      // Atualizar o cache de medicamentos
      setMedicamentosCache(prev => {
        const newCache = { ...prev, [protocoloId]: servicos || [] };
        // Salvar no cache local
        saveMedicamentosToCache(newCache);
        return newCache;
      });
      
      // Atualizar expandedRows com os serviços carregados
      setExpandedRows(prev => {
        if (!prev[protocoloId]) return prev;
        
        return {
          ...prev,
          [protocoloId]: {
            ...prev[protocoloId],
            expanded: true,
            servicos: servicos || [],
            medicamentos: servicos || []
          }
        };
      });
      
      // Atualizar os protocolos exibidos com os medicamentos
      setOrderedProtocolos(prev => 
        prev.map(p => {
          if (p.id == protocoloId || p.id_protocolo == protocoloId) {
            return {...p, medicamentos: servicos || []};
          }
          return p;
        })
      );
      
      return servicos;
    } catch (error) {
      console.error(`Erro ao carregar serviços para protocolo ${protocoloId}:`, error);
      return [];
    } finally {
      setServicosLoading(prev => ({ ...prev, [protocoloId]: false }));
    }
  }, [loadProtocoloServicos, medicamentosCache]);

  // Função para alternar a expansão de uma linha (modo lista)
  const toggleRowExpansion = useCallback((protocoloId) => {
    // Se estiver em modo de edição ou adição, não permitir expandir
    if (isEditing || isAdding) return;
    
    setExpandedRows(prev => {
      const wasExpanded = prev[protocoloId] && prev[protocoloId].expanded;
      
      // Se a linha já estava expandida, apenas a feche
      if (wasExpanded) {
        return {};
      } else {
        // Caso contrário, feche todas as outras e expanda apenas a selecionada
        // Verificar se temos medicamentos no cache para este protocolo
        const cachedMedicamentos = getMedicamentosFromCache(protocoloId);
        
        return {
          [protocoloId]: {
            expanded: true,
            servicos: cachedMedicamentos || prev[protocoloId]?.servicos || [],
            medicamentos: cachedMedicamentos || prev[protocoloId]?.medicamentos || [],
            isAddingMed: prev[protocoloId]?.isAddingMed || false
          }
        };
      }
    });
    
    // Atualizar a seleção se necessário
    if (!selectedRows.has(protocoloId)) {
      setSelectedRows(new Set([protocoloId]));
      selectProtocolo(protocoloId);
    }
    
    // Como já carregamos todos os medicamentos anteriormente, na maioria dos casos
    // não precisamos fazer nova chamada. Apenas se não encontrarmos no cache.
    if (!getMedicamentosFromCache(protocoloId) && !allMedicamentosLoaded) {
      // Carregar medicamentos se não estiverem no cache
      fetchServicos(protocoloId);
    }
  }, [isEditing, isAdding, selectedRows, selectProtocolo, fetchServicos, allMedicamentosLoaded, medicamentosCache]);

  // Função para alternar a virada do card (modo grid)
  const toggleCardFlip = (protocoloId, e) => {
    if (e) {
      e.stopPropagation(); // Impedir propagação do evento
    }
    
    // Se estiver em modo de edição ou adição, não permitir virar
    if (isEditing || isAdding) return;
    
    // Verificar se protocoloId existe
    if (!protocoloId) return;
    
    // Obter referência ao elemento do card
    const cardElement = document.querySelector(`[data-protocol-id="${protocoloId}"]`);
    if (cardElement) {
      // Ajustar altura do card baseado no conteúdo do verso
      const frontElement = cardElement.querySelector('.card-front');
      const backElement = cardElement.querySelector('.card-back');
      
      // Verificar o estado atual
      const isCurrentlyFlipped = cardFlipped[protocoloId];
      
      if (!isCurrentlyFlipped && backElement) {
        // Se estamos virando para o verso, ajustar altura
        const backHeight = backElement.scrollHeight;
        cardElement.style.height = `${Math.max(280, backHeight + 20)}px`;
      } else if (frontElement) {
        // Se estamos voltando para a frente, restaurar altura padrão
        cardElement.style.height = '280px';
      }
    }
    
    // Atualizar o estado de flipped para este card SEM resetar os outros
    setCardFlipped(prev => {
      // Se prev não for um objeto, inicializar como objeto vazio
      const currentState = prev || {};
      return {
        ...currentState,
        [protocoloId]: !currentState[protocoloId]
      };
    });
    
    // Carregar medicamentos se necessário
    if (!cardFlipped[protocoloId] && 
        typeof getMedicamentosFromCache === 'function' && 
        !getMedicamentosFromCache(protocoloId) && 
        !allMedicamentosLoaded && 
        typeof fetchServicos === 'function') {
      fetchServicos(protocoloId);
    }
  };

  useEffect(() => {
    // Se cardFlipped for undefined ou null, reinicializar como objeto vazio
    if (!cardFlipped) {
      setCardFlipped({});
    }
  }, [cardFlipped]);


  // Funções para gerenciar medicamentos no formulário
  const handleAddMedicamento = () => {
    setFormData(prev => ({
      ...prev,
      medicamentos: [
        ...prev.medicamentos, 
        { nome: '', dose: '', unidade_medida: '', via_adm: '', dias_adm: '', frequencia: '' }
      ]
    }));
  };

  const handleRemoveMedicamento = (index) => {
    setFormData(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.filter((_, i) => i !== index)
    }));
  };

  const handleMedicamentoChange = (index, field, value) => {
    setFormData(prev => {
      const updatedMedicamentos = [...prev.medicamentos];
      updatedMedicamentos[index] = {
        ...updatedMedicamentos[index],
        [field]: value
      };
      return {
        ...prev,
        medicamentos: updatedMedicamentos
      };
    });
  };

  // Handler para mudança nos campos principais
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para mostrar o indicador de atualização do cache
  const showCacheRefreshIndicator = () => {
    setCacheRefreshed(true);
    // Esconder após 3 segundos
    setTimeout(() => setCacheRefreshed(false), 3000);
  };
  
  // Atualização de dados após modificação - Versão com cache
  const refreshDataAfterModification = async () => {
    try {
      setLocalLoading(true);
      
      // Invalidar o cache de medicamentos
      invalidateMedicamentosCache();
      
      // Atualizar o timestamp de escrita global
      CacheService.updateWriteTimestamp();
      
      // Usar a função do contexto para atualizar os dados
      await contextRefreshData();
      
      // Mostrar indicador de atualização
      showCacheRefreshIndicator();
      
      // Resetar o estado de carregamento de medicamentos
      setAllMedicamentosLoaded(false);
      setMedicamentosCache({});
      loadedProtocolIds.current.clear();
      
      // Recarregar protocolos e medicamentos
      const protocolos = await loadProtocolos();
      await loadAllMedicamentos(protocolos);
      
    } catch (error) {
      console.error("Erro ao atualizar dados após modificação:", error);
      showErrorAlert("Falha ao atualizar os dados", "Tente atualizar manualmente.");
    } finally {
      setLocalLoading(false);
    }
  };

  // Validação do formulário
  const validateFormData = (data) => {
    if (!data.Protocolo_Nome || !data.Protocolo_Sigla) {
      return { valid: false, message: "Nome e Sigla são campos obrigatórios" };
    }
    
    // Verificar apenas medicamentos que tenham algum dado preenchido
    if (data.medicamentos && data.medicamentos.length > 0) {
      // Filtrar medicamentos que tenham pelo menos um campo preenchido
      const medicamentosPreenchidos = data.medicamentos.filter(med => 
        (med.nome && med.nome.trim() !== '') || 
        (med.dose && med.dose !== '') || 
        (med.unidade_medida && med.unidade_medida !== '') || 
        (med.via_adm && med.via_adm !== '') || 
        (med.dias_adm && med.dias_adm !== '') || 
        (med.frequencia && med.frequencia !== '')
      );
      
      // Se houver medicamentos parcialmente preenchidos, validar que tenham pelo menos o nome
      if (medicamentosPreenchidos.length > 0) {
        const medicamentosSemNome = medicamentosPreenchidos.some(med => !med.nome || med.nome.trim() === '');
        if (medicamentosSemNome) {
          return { valid: false, message: "Medicamentos preenchidos precisam ter um nome" };
        }
      }
    }
    
    // Conversão de valores numéricos
    const numericData = { ...data };
    
    if (numericData.Intervalo_Ciclos !== undefined && numericData.Intervalo_Ciclos !== '') {
      numericData.Intervalo_Ciclos = parseInt(numericData.Intervalo_Ciclos, 10);
    } else {
      numericData.Intervalo_Ciclos = null;
    }
    
    if (numericData.Ciclos_Previstos !== undefined && numericData.Ciclos_Previstos !== '') {
      numericData.Ciclos_Previstos = parseInt(numericData.Ciclos_Previstos, 10);
    } else {
      numericData.Ciclos_Previstos = null;
    }
    
    if (numericData.Linha !== undefined && numericData.Linha !== '') {
      numericData.Linha = parseInt(numericData.Linha, 10);
    } else {
      numericData.Linha = null;
    }
    
    // Processar medicamentos (se existirem)
    if (numericData.medicamentos && numericData.medicamentos.length > 0) {
      numericData.medicamentos = numericData.medicamentos.map(med => {
        const processedMed = { ...med };
        
        // Pular processamento de medicamentos vazios
        if (!processedMed.nome || processedMed.nome.trim() === '') {
          return processedMed;
        }
        
        if (processedMed.dose !== undefined && processedMed.dose !== '') {
          processedMed.dose = parseFloat(processedMed.dose);
        } else {
          processedMed.dose = null;
        }
        
        return processedMed;
      });
      
      // Filtrar apenas medicamentos com nome para envio ao servidor
      numericData.medicamentos = numericData.medicamentos.filter(
        med => med.nome && med.nome.trim() !== ''
      );
    }
    
    return { valid: true, data: numericData };
  };

  // Reset do formulário
  const resetForm = () => {
    setFormData({
      Protocolo_Nome: '',
      Protocolo_Sigla: '',
      CID: '',
      Intervalo_Ciclos: '',
      Ciclos_Previstos: '',
      Linha: '',
      medicamentos: [] // Array vazio ao resetar
    });
    setUpdateError(null);
  };

  // Submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateError(null);
    
    const validation = validateFormData(formData);
    if (!validation.valid) {
      showErrorAlert("Validação falhou", validation.message);
      return;
    }
    
    const validatedData = validation.data;
    
    try {
      setLocalLoading(true);
      
      if (isEditing && selectedProtocolo) {
        // Obter o ID correto do protocolo
        const protocoloId = selectedProtocolo.id_protocolo || selectedProtocolo.id;
        
        // 1. Primeiro atualizar os dados do protocolo (sem medicamentos)
        const protocoloSemMedicamentos = { ...validatedData };
        delete protocoloSemMedicamentos.medicamentos;
        
        console.log("Atualizando dados principais do protocolo ID:", protocoloId);
        await updateProtocolo(protocoloId, protocoloSemMedicamentos);
        
        // 2. Carregar medicamentos existentes
        console.log("Carregando medicamentos existentes para o protocolo ID:", protocoloId);
        const medicamentosAtuais = await loadProtocoloServicos(protocoloId);
        console.log("Medicamentos existentes:", medicamentosAtuais);
        
        // 3. Processar cada medicamento do formulário
        for (const med of validatedData.medicamentos) {
          if (!med.nome) continue; // Pular medicamentos sem nome
          
          // Buscar medicamento existente com o mesmo nome
          const medExistente = medicamentosAtuais.find(m => m.nome === med.nome);
          
          // Converter a sigla de unidade de medida de volta para o ID antes de enviar
          let unidadeMedidaId = med.unidade_medida;
          
          // Se for uma sigla (texto), converter para ID
          if (isNaN(unidadeMedidaId)) {
            const unidade = UNIDADES_MEDIDA_PREDEFINIDAS.find(u => u.sigla === med.unidade_medida);
            unidadeMedidaId = unidade ? unidade.id : '';
          }
          
          // Preparar dados do medicamento com o ID da unidade
          const dadosMedicamento = {
            nome: med.nome,
            dose: med.dose,
            unidade_medida: unidadeMedidaId, // Enviar o ID, não a sigla
            via_adm: med.via_adm,
            dias_adm: med.dias_adm, // Manter como está por enquanto
            frequencia: med.frequencia,
            observacoes: med.observacoes || ''
          };
          
          // Enviar dados para API
          if (medExistente) {
            try {
              const resultado = await updateServicoProtocolo(
                protocoloId, 
                medExistente.id, 
                dadosMedicamento
              );
              console.log("Medicamento atualizado com sucesso:", resultado);
            } catch (medError) {
              console.error("Erro ao atualizar medicamento:", medError);
            }
          } else {
            try {
              const resultado = await addServicoToProtocolo(protocoloId, dadosMedicamento);
              console.log("Novo medicamento adicionado:", resultado);
            } catch (addError) {
              console.error("Erro ao adicionar medicamento:", addError);
            }
          }
        }
        
        // 4. Verificar se algum medicamento foi removido
        for (const medExistente of medicamentosAtuais) {
          // Verificar se este medicamento ainda existe no formulário
          const aindaExiste = validatedData.medicamentos.some(m => m.nome === medExistente.nome);
          
          if (!aindaExiste) {
            // Medicamento foi removido, excluir do banco
            console.log("Medicamento removido, excluindo:", medExistente.nome);
            try {
              await deleteServicoFromProtocolo(protocoloId, medExistente.id);
              console.log("Medicamento excluído com sucesso");
            } catch (deleteError) {
              console.error("Erro ao excluir medicamento:", deleteError);
            }
          }
        }
        
        setIsEditing(false);
        showSuccessAlert("Protocolo e medicamentos atualizados com sucesso!");
      } else if (isAdding) {
        // Lógica existente para adicionar novo protocolo
        if (isCacheEnabled) {
          forceRevalidation();
        }
        
        await addProtocolo(validatedData);
        setIsAdding(false);
        showSuccessAlert("Protocolo adicionado com sucesso!");
      }
      
      // Atualizar cache e dados
      await refreshDataAfterModification();
      
      // Resetar formulário
      resetForm();
      
    } catch (error) {
      setUpdateError(error.message);
      showErrorAlert("Erro ao salvar protocolo", error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  // Funções para ordenação
  const handleSortChange = (field) => {
    // Se o campo já está selecionado, inverte a direção
    if (field === sortField) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, começa com ascendente
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Handlers para CRUD de protocolos
  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRows(new Set());
    setExpandedRows({});
    setCardFlipped({});
    setIsDetailsOpen(false);
    
    // Se o cache estiver habilitado, marcar para revalidação
    if (isCacheEnabled) {
      forceRevalidation();
    }
  };
  
  const handleEdit = () => {
    if (!selectedProtocolo) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para editar.");
      return;
    }
    
    // Garantir que estamos usando o ID correto (id_protocolo)
    const currentProtocolo = filteredProtocolos.find(p => 
      p.id === selectedProtocolo.id || 
      p.id_protocolo === selectedProtocolo.id ||
      p.id === selectedProtocolo.id_protocolo
    ) || selectedProtocolo;
    
    // Buscar medicamentos do cache, se disponíveis
    const protocoloId = currentProtocolo.id || currentProtocolo.id_protocolo;
    const cachedMedicamentos = getMedicamentosFromCache(protocoloId) || currentProtocolo.medicamentos || [];
    
    // Converter o protocolo atual para o novo formato
    setFormData({
      Protocolo_Nome: currentProtocolo.Protocolo_Nome || '',
      Protocolo_Sigla: currentProtocolo.Protocolo_Sigla || '',
      CID: currentProtocolo.CID || '',
      Intervalo_Ciclos: currentProtocolo.Intervalo_Ciclos || '',
      Ciclos_Previstos: currentProtocolo.Ciclos_Previstos || '',
      Linha: currentProtocolo.Linha || '',
      medicamentos: cachedMedicamentos.length > 0 
        ? cachedMedicamentos.map(med => {
            // Encontrar a unidade pelo ID e obter a sigla, se disponível
            let unidadeMedida = med.unidade_medida || '';
            // Se a unidade_medida for um ID (numérico), tente convertê-la para sigla
            if (unidadeMedida && !isNaN(unidadeMedida)) {
              const unidadeEncontrada = UNIDADES_MEDIDA_PREDEFINIDAS.find(u => u.id === unidadeMedida);
              if (unidadeEncontrada) {
                unidadeMedida = unidadeEncontrada.sigla;
              }
            }
            
            return {
              nome: med.nome || '',
              dose: med.dose || med.dose_m2 || '',
              unidade_medida: unidadeMedida,
              via_adm: med.via_adm || med.via_administracao || '',
              dias_adm: med.dias_adm || med.dias_aplicacao || '',
              frequencia: med.frequencia || ''
            };
          }) 
        : [{ 
            nome: '', 
            dose: '', 
            unidade_medida: '', 
            via_adm: '', 
            dias_adm: '', 
            frequencia: '' 
          }]
    });
    
    setIsEditing(true);
    setIsAdding(false);
    setExpandedRows({});
    setCardFlipped({});
    setIsDetailsOpen(false);
  };
  
  const handleDelete = async () => {
    if (!selectedProtocolo) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para excluir.");
      return;
    }
    
    const confirmed = await showConfirmAlert(
      "Confirmar exclusão", 
      `Tem certeza que deseja excluir o protocolo ${selectedProtocolo.Protocolo_Nome}?`
    );
    
    if (confirmed) {
      try {
        setLocalLoading(true);
        
        // Se o cache estiver habilitado, marcar para revalidação
        if (isCacheEnabled) {
          forceRevalidation();
        }
        
        await deleteProtocolo(selectedProtocolo.id);
        showSuccessAlert("Protocolo excluído com sucesso!");
        setSelectedRows(new Set());
        setExpandedRows({});
        setCardFlipped({});
        setIsDetailsOpen(false);
        
        // Usar a função de atualização que lida com o cache
        await refreshDataAfterModification();
      } catch (error) {
        showErrorAlert("Erro ao excluir protocolo", error.message);
      } finally {
        setLocalLoading(false);
      }
    }
  };
  
  const handleCancel = async () => {
    if (isEditing || isAdding) {
      const confirmCancel = await showConfirmAlert(
        "Deseja cancelar a edição?",
        "Todas as alterações feitas serão perdidas."
      );
      
      if (!confirmCancel) {
        return;
      }
    }
    
    setIsEditing(false);
    setIsAdding(false);
    resetForm();
  };

  // Handler para seleção de protocolo
  const handleSelectProtocolo = (protocoloId) => {
    // Se estiver em modo de edição ou adição, não permitir seleção
    if (isEditing || isAdding) return;
    
    // Selecionar o protocolo
    setSelectedRows(new Set([protocoloId]));
    selectProtocolo(protocoloId);
    
    // No modo lista, expandir a linha ao selecionar
    if (viewMode === 'list') {
      toggleRowExpansion(protocoloId);
    }
    
    // NÃO resetar cardFlipped aqui!
  };

  // Função para mostrar detalhes do protocolo
  const showProtocoloDetails = (protocoloId) => {
    selectProtocolo(protocoloId);
    setSelectedRows(new Set([protocoloId]));
    setIsDetailsOpen(true);
    
    // Fechar qualquer card virado
    setCardFlipped(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = false;
      });
      return newState;
    });
  };

  // Handlers para pesquisa
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      
      if (value.length >= 2) {
        setLocalLoading(true);
        searchProtocolos(value, type)
          .finally(() => setLocalLoading(false));
      }
    }
  };

  const getSearchTypeName = (type) => {
    switch(type) {
      case 'nome': return 'Nome';
      case 'sigla': return 'Sigla';
      case 'cid': return 'CID';
      default: return 'Nome';
    }
  };
  
  const executeSearch = () => {
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      
      if (value.length >= 2 || value.length === 0) {
        setLocalLoading(true);
        searchProtocolos(value, searchType)
          .finally(() => setLocalLoading(false));
      } else {
        showWarningAlert("Pesquisa muito curta", "Digite pelo menos 2 caracteres para pesquisar.");
      }
    }
  };
  
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  const handleInput = useCallback(
    debounce((value) => {
      if (value.length >= 2 || value.length === 0) {
        searchProtocolos(value, searchType);
      }
    }, 500),
    [searchType, searchProtocolos]
  );
  
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };
  
  const handleClearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    setSearchType("nome");
    searchProtocolos('', 'nome');
  };

  // Função auxiliar para formatar dias de administração
  const formatDiasAdministracao = (dias, options = {}) => {
    if (!dias) return 'N/D';
    
    // Opções padrão
    const opts = {
      maxDiasVisíveis: 3,        // Máximo de dias visíveis antes de truncar
      mostrarTooltip: true,      // Se deve incluir o tooltip com todos os dias
      formatoIntervalo: true,    // Se deve formatar intervalos consecutivos (D1-D5)
      ...options
    };
    
    // Verifica se é um intervalo simples (contém hífen)
    if (dias.includes('-') && !dias.includes(',')) {
      const [inicio, fim] = dias.split('-');
      return `${inicio} a ${fim}`;
    }
    
    // Se é uma lista de dias separados por vírgula
    if (dias.includes(',')) {
      const diasArray = dias.split(',').map(d => d.trim());
      
      // Analisar e agrupar dias consecutivos
      if (opts.formatoIntervalo) {
        const diasAgrupados = agruparDiasConsecutivos(diasArray);
        
        // Se temos muitos dias/grupos, truncar a lista
        if (diasAgrupados.length > opts.maxDiasVisíveis) {
          const visíveis = diasAgrupados.slice(0, opts.maxDiasVisíveis);
          const resto = diasAgrupados.length - opts.maxDiasVisíveis;
          
          // Criar versão truncada para exibição
          const diasExibidos = visíveis.join(', ');
          
          // Se devemos mostrar o tooltip, incluir um span com title contendo todos os dias
          if (opts.mostrarTooltip) {
            return (
              <span title={diasAgrupados.join(', ')}>
                {diasExibidos} <span className="text-xs text-green-600">+{resto} mais</span>
              </span>
            );
          } else {
            return `${diasExibidos} +${resto} mais`;
          }
        }
        
        // Se não precisamos truncar, apenas retorne os dias agrupados
        return diasAgrupados.join(', ');
      }
      
      // Sem agrupamento, apenas truncar se necessário
      if (diasArray.length > opts.maxDiasVisíveis) {
        const visíveis = diasArray.slice(0, opts.maxDiasVisíveis);
        const resto = diasArray.length - opts.maxDiasVisíveis;
        
        // Versão truncada
        const diasExibidos = visíveis.join(', ');
        
        // Com tooltip se necessário
        if (opts.mostrarTooltip) {
          return (
            <span title={diasArray.join(', ')}>
              {diasExibidos} <span className="text-xs text-green-600">+{resto} mais</span>
            </span>
          );
        } else {
          return `${diasExibidos} +${resto} mais`;
        }
      }
      
      // Se não precisamos truncar, retorne todos os dias
      return diasArray.join(', ');
    }
    
    // Caso contrário, retorna os dias como estão
    return dias;
  };

  const agruparDiasConsecutivos = (diasArray) => {
    // Primeiro, vamos ordenar os dias
    const diasOrdenados = [...diasArray].sort((a, b) => {
      // Extrair os números dos dias (ex: 'D1' -> 1)
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numA - numB;
    });
    
    if (diasOrdenados.length <= 1) return diasOrdenados;
    
    const resultado = [];
    let inicioIntervalo = diasOrdenados[0];
    let fimIntervalo = inicioIntervalo;
    let emIntervalo = false;
    
    // Usar regex para extrair o prefixo (ex: 'D') e o número
    const regex = /([^\d]*)(\d+)/;
    
    for (let i = 1; i < diasOrdenados.length; i++) {
      const diaAtual = diasOrdenados[i];
      const diaAnterior = diasOrdenados[i-1];
      
      // Extrair prefixo e número do dia atual e anterior
      const matchAtual = diaAtual.match(regex);
      const matchAnterior = diaAnterior.match(regex);
      
      if (!matchAtual || !matchAnterior) {
        // Se não conseguimos extrair o padrão, apenas adicione o dia como está
        if (emIntervalo) {
          // Finalizar intervalo anterior
          if (inicioIntervalo !== fimIntervalo) {
            resultado.push(`${inicioIntervalo}-${fimIntervalo}`);
          } else {
            resultado.push(inicioIntervalo);
          }
          emIntervalo = false;
        }
        resultado.push(diaAtual);
        continue;
      }
      
      const [, prefixoAtual, numAtualStr] = matchAtual;
      const [, prefixoAnterior, numAnteriorStr] = matchAnterior;
      
      const numAtual = parseInt(numAtualStr);
      const numAnterior = parseInt(numAnteriorStr);
      
      // Verificar se os dias são consecutivos e têm o mesmo prefixo
      if (prefixoAtual === prefixoAnterior && numAtual === numAnterior + 1) {
        // Dias consecutivos, continuar o intervalo
        fimIntervalo = diaAtual;
        emIntervalo = true;
      } else {
        // Não consecutivo, finalizar o intervalo anterior (se houver)
        if (emIntervalo) {
          // Verificar se o intervalo tem mais de um dia
          if (inicioIntervalo !== fimIntervalo) {
            resultado.push(`${inicioIntervalo}-${fimIntervalo}`);
          } else {
            resultado.push(inicioIntervalo);
          }
        } else {
          // Não estava em um intervalo, adicionar o dia anterior
          resultado.push(diaAnterior);
        }
        
        // Iniciar potencialmente um novo intervalo
        inicioIntervalo = diaAtual;
        fimIntervalo = diaAtual;
        emIntervalo = false;
      }
    }
    
    // Verificar o último intervalo/dia
    if (emIntervalo) {
      if (inicioIntervalo !== fimIntervalo) {
        resultado.push(`${inicioIntervalo}-${fimIntervalo}`);
      } else {
        resultado.push(inicioIntervalo);
      }
    } else {
      // Adicionar o último dia se não estava em um intervalo
      resultado.push(diasOrdenados[diasOrdenados.length - 1]);
    }
    
    return resultado;
  };

  // 1. Componente de botão "Editar" corrigido que seleciona o protocolo correto
  const EditButtonFixed = ({ protocolo, onEdit }) => {
    return (
      <button 
        className="action-button-pacientes edit"
        onClick={(e) => { 
          e.stopPropagation();
          // Execute diretamente o callback com este protocolo, sem depender do contexto
          onEdit(protocolo);
        }}
        title="Editar protocolo"
      >
        <Edit size={16} />
      </button>
    );
  };

  // 2. Função handleEdit modificada para receber o protocolo explicitamente
  const handleEditFixed = (protocoloToEdit) => {
    if (!protocoloToEdit) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para editar.");
      return;
    }
    
    // Garantir que estamos usando o protocolo correto do parâmetro
    selectProtocolo(protocoloToEdit.id);
    
    // Buscar medicamentos do cache, se disponíveis
    const protocoloId = protocoloToEdit.id || protocoloToEdit.id_protocolo;
    const cachedMedicamentos = getMedicamentosFromCache(protocoloId) || protocoloToEdit.medicamentos || [];
    
    // Converter o protocolo atual para o novo formato
    setFormData({
      Protocolo_Nome: protocoloToEdit.Protocolo_Nome || '',
      Protocolo_Sigla: protocoloToEdit.Protocolo_Sigla || '',
      CID: protocoloToEdit.CID || '',
      Intervalo_Ciclos: protocoloToEdit.Intervalo_Ciclos || '',
      Ciclos_Previstos: protocoloToEdit.Ciclos_Previstos || '',
      Linha: protocoloToEdit.Linha || '',
      medicamentos: cachedMedicamentos.length > 0 
        ? cachedMedicamentos.map(med => {
            // Encontrar a unidade pelo ID e obter a sigla, se disponível
            let unidadeMedida = med.unidade_medida || '';
            // Se a unidade_medida for um ID (numérico), tente convertê-la para sigla
            if (unidadeMedida && !isNaN(unidadeMedida)) {
              const unidadeEncontrada = UNIDADES_MEDIDA_PREDEFINIDAS.find(u => u.id === unidadeMedida);
              if (unidadeEncontrada) {
                unidadeMedida = unidadeEncontrada.sigla;
              }
            }
            
            return {
              nome: med.nome || '',
              dose: med.dose || med.dose_m2 || '',
              unidade_medida: unidadeMedida,
              via_adm: med.via_adm || med.via_administracao || '',
              dias_adm: med.dias_adm || med.dias_aplicacao || '',
              frequencia: med.frequencia || ''
            };
          }) 
        : [{ 
            nome: '', 
            dose: '', 
            unidade_medida: '', 
            via_adm: '', 
            dias_adm: '', 
            frequencia: '' 
          }]
    });
    
    setIsEditing(true);
    setIsAdding(false);
    setExpandedRows({});
    setCardFlipped({});
    setIsDetailsOpen(false);
  };

  const handleEditFixedWithSelection = (protocoloToEdit) => {
    if (!protocoloToEdit) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para editar.");
      return;
    }
    
    // Selecionar o protocolo no contexto global
    const protocoloId = protocoloToEdit.id || protocoloToEdit.id_protocolo;
    selectProtocolo(protocoloId);
    
    // Importante: Atualizar também o selectedRows para a interface visual refletir corretamente
    setSelectedRows(new Set([protocoloId]));
    
    // Buscar medicamentos do cache, se disponíveis
    const cachedMedicamentos = getMedicamentosFromCache(protocoloId) || protocoloToEdit.medicamentos || [];
    
    // Converter o protocolo atual para o novo formato
    setFormData({
      Protocolo_Nome: protocoloToEdit.Protocolo_Nome || '',
      Protocolo_Sigla: protocoloToEdit.Protocolo_Sigla || '',
      CID: protocoloToEdit.CID || '',
      Intervalo_Ciclos: protocoloToEdit.Intervalo_Ciclos || '',
      Ciclos_Previstos: protocoloToEdit.Ciclos_Previstos || '',
      Linha: protocoloToEdit.Linha || '',
      medicamentos: cachedMedicamentos.length > 0 
        ? cachedMedicamentos.map(med => {
            // Encontrar a unidade pelo ID e obter a sigla, se disponível
            let unidadeMedida = med.unidade_medida || '';
            // Se a unidade_medida for um ID (numérico), tente convertê-la para sigla
            if (unidadeMedida && !isNaN(unidadeMedida)) {
              const unidadeEncontrada = UNIDADES_MEDIDA_PREDEFINIDAS.find(u => u.id === unidadeMedida);
              if (unidadeEncontrada) {
                unidadeMedida = unidadeEncontrada.sigla;
              }
            }
            
            return {
              nome: med.nome || '',
              dose: med.dose || med.dose_m2 || '',
              unidade_medida: unidadeMedida,
              via_adm: med.via_adm || med.via_administracao || '',
              dias_adm: med.dias_adm || med.dias_aplicacao || '',
              frequencia: med.frequencia || ''
            };
          }) 
        : [{ 
            nome: '', 
            dose: '', 
            unidade_medida: '', 
            via_adm: '', 
            dias_adm: '', 
            frequencia: '' 
          }]
    });
    
    setIsEditing(true);
    setIsAdding(false);
    setExpandedRows({});
    setCardFlipped({});
    setIsDetailsOpen(false);
  };

  const handleSelectProtocoloFixed = (protocolo) => {
    // Se estiver em modo de edição ou adição, não permitir seleção
    if (isEditing || isAdding) return;
    
    const protocoloId = protocolo.id;
    
    // Selecionar o protocolo
    setSelectedRows(new Set([protocoloId]));
    selectProtocolo(protocoloId);
    
    // No modo lista, expandir a linha ao selecionar
    if (viewMode === 'list') {
      toggleRowExpansion(protocoloId);
    }
  };

  // Helper function para obter texto de unidade de medida
  const getUnidadeMedidaText = (valor) => {
    if (!valor) return 'N/D';
    
    // Se for um ID (numérico), tentar encontrar a sigla correspondente
    if (!isNaN(valor)) {
      const unidade = unidadesMedida.find(u => u.id === valor);
      return unidade ? unidade.sigla : 'N/D';
    }
    
    return valor; // Se já for a sigla, retornar como está
  };

  // Helper function para obter via de administração
  const getViaAdmText = (id) => {
    if (!id) return 'N/D';
    const via = viasAdministracao.find(v => v.id == id);
    return via ? via.nome : 'N/D';
  };

  // Renderização de medicamentos no formulário
  const renderMedicamentoRow = (med, index) => {
    return (
      <div key={`med-${index}`} className="medication-entry bg-white border border-gray-200 rounded-lg mb-4 shadow-sm overflow-hidden">
        {/* Cabeçalho do medicamento */}
        <div className="bg-gradient-to-r from-green-50 to-gray-50 p-3 flex justify-between items-center border-b border-gray-200">
          <h4 className="font-medium text-green-800 flex items-center">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-700 text-sm mr-2">
              {index + 1}
            </span>
            Medicamento
          </h4>
          <button 
            type="button" 
            onClick={async () => {
              const confirmed = await showConfirmAlert(
                "Confirmar exclusão", 
                "Tem certeza que deseja remover este medicamento?"
              );
              
              if (confirmed) {
                handleRemoveMedicamento(index);
              }
            }}
            className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Remover medicamento"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        {/* Corpo do medicamento */}
        <div className="p-4">
          {/* Linha 1: Nome e Dose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700 flex items-center">
                <span className="mr-1 text-red-500">*</span> Nome
              </label>
              <input 
                type="text"
                value={med.nome || ''}
                onChange={(e) => handleMedicamentoChange(index, 'nome', e.target.value)}
                className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Paclitaxel, Cisplatina..."
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700">Dose</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  value={med.dose || ''}
                  onChange={(e) => handleMedicamentoChange(index, 'dose', e.target.value)}
                  className="form-input flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="0.01"
                  placeholder="Quantidade"
                />
                <select
                  value={med.unidade_medida || ''}
                  onChange={(e) => handleMedicamentoChange(index, 'unidade_medida', e.target.value)}
                  className="form-select px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-w-[110px]"
                >
                  <option value="">Unidade</option>
                  {UNIDADES_MEDIDA_PREDEFINIDAS.map(unidade => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.sigla}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Linha 2: Frequência e Via */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700">Frequência de Administração</label>
              <select
                value={med.frequencia || ''}
                onChange={(e) => handleMedicamentoChange(index, 'frequencia', e.target.value)}
                className="form-select w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                {FREQUENCIAS_ADMINISTRACAO.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700">Via de Administração</label>
              <select
                value={med.via_adm || ''}
                onChange={(e) => handleMedicamentoChange(index, 'via_adm', e.target.value)}
                className="form-select w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                {viasAdministracao && viasAdministracao.length > 0 ? (
                  viasAdministracao.map(via => (
                    <option key={via.id} value={via.id}>{via.nome}</option>
                  ))
                ) : (
                  <option value="" disabled>Carregando...</option>
                )}
              </select>
            </div>
          </div>
          
          {/* Linha 3: Dias de Administração */}
          <div className="mt-2">
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700 mb-2">Dias de Administração</label>
              <DiasAdministracaoSelector
                value={med.dias_adm || ''}
                onChange={(diasValue) => handleMedicamentoChange(index, 'dias_adm', diasValue)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente de Card para cada protocolo
  // Componente ProtocoloCard revisado com animação de flip
const ProtocoloCard = ({ 
  protocolo, 
  isSelected,
  servicosLoading, 
  showProtocoloDetails, 
  handleSelectProtocolo,
  handleEditFixedWithSelection, 
  getMedicamentosFromCache, 
  fetchServicos, 
  allMedicamentosLoaded, 
  formatDiasAdministracao, 
  getUnidadeMedidaText, 
  isEditing, 
  isAdding
}) => {
  const protocoloId = protocolo?.id;
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardHeight, setCardHeight] = useState('280px');
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const cardRef = useRef(null);
  
  // Obter medicamentos do protocolo ou do cache
  const medicamentos = useMemo(() => {
    // Verificar medicamentos no protocolo
    if (protocolo?.medicamentos && protocolo.medicamentos.length > 0) {
      return protocolo.medicamentos;
    } 
    // Verificar no cache
    else if (typeof getMedicamentosFromCache === 'function') {
      const cachedMeds = getMedicamentosFromCache(protocoloId);
      if (cachedMeds && cachedMeds.length > 0) {
        return cachedMeds;
      }
    }
    return [];
  }, [protocolo, protocoloId, getMedicamentosFromCache]);

  // Estado de carregamento
  const isLoading = servicosLoading && servicosLoading[protocoloId];
  
  // Função para virar o card
  const handleFlip = (e) => {
    if (e) e.stopPropagation();
    
    // Se estiver em modo de edição ou adição, não permitir virar
    if (isEditing || isAdding) return;
    
    // Calcular a altura apropriada antes de fazer o flip
    if (!isFlipped && backRef.current) {
      // Se estamos virando para o verso, ajustar a altura com base no conteúdo do verso
      const backHeight = backRef.current.scrollHeight;
      setCardHeight(`${Math.max(280, backHeight + 20)}px`);
    } else if (frontRef.current) {
      // Se estamos voltando para a frente, restaurar a altura padrão
      setCardHeight('280px');
    }
    
    // Alternar o estado do flip
    setIsFlipped(!isFlipped);
    
    // Carregar medicamentos se virou o card e não estiverem no cache
    if (!isFlipped && medicamentos.length === 0) {
      if (typeof getMedicamentosFromCache === 'function' && 
          typeof fetchServicos === 'function' && 
          !allMedicamentosLoaded) {
        console.log("Carregando medicamentos para protocolo:", protocoloId);
        fetchServicos(protocoloId);
      }
    }
  };
  
  // Ajustar a altura quando o conteúdo do verso mudar
  useEffect(() => {
    if (isFlipped && backRef.current) {
      const backHeight = backRef.current.scrollHeight;
      setCardHeight(`${Math.max(280, backHeight + 20)}px`);
    }
  }, [isFlipped, medicamentos]);
  
  return (
    <div 
      className={`protocol-card ${isSelected ? 'selected' : ''}`}
      onClick={() => typeof handleSelectProtocolo === 'function' ? handleSelectProtocolo(protocoloId) : null}
      ref={cardRef}
      style={{ height: cardHeight, transition: 'height 0.3s ease-out' }}
    >
      <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Frente do card - Informações do protocolo */}
        <div className="card-front" ref={frontRef}>
          <div className="card-header">
            <div className="protocol-code">{protocolo?.Protocolo_Sigla || 'N/D'}</div>
            {protocolo?.CID && (
              <div className="protocol-cid">{protocolo.CID}</div>
            )}
          </div>
          
          <div className="protocol-name">{protocolo?.Protocolo_Nome || 'Sem nome'}</div>
          
          <div className="protocol-info">
            <div className="info-row">
              <Calendar size={14} />
              <span>Intervalo: {protocolo?.Intervalo_Ciclos || 'N/D'} dias</span>
            </div>
            <div className="info-row">
              <Activity size={14} />
              <span>Ciclos: {protocolo?.Ciclos_Previstos || 'N/D'}</span>
            </div>
            <div className="info-row">
              <Bookmark size={14} />
              <span>Linha: {protocolo?.Linha || 'N/D'}</span>
            </div>
            <div className="info-row">
              <Pill size={14} />
              <span>Medicamentos: {medicamentos.length}</span>
            </div>
          </div>
          
          <div className="card-actions" onClick={e => e.stopPropagation()}>
            <button 
              className="action-button-pacientes info"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof showProtocoloDetails === 'function') {
                  showProtocoloDetails(protocoloId); 
                }
              }}
              title="Ver detalhes"
            >
              <Info size={16} />
            </button>
            <button 
              className="action-button-pacientes edit"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof handleEditFixedWithSelection === 'function') {
                  handleEditFixedWithSelection(protocolo);
                }
              }}
              title="Editar protocolo"
            >
              <Edit size={16} />
            </button>
            <button 
              className="action-button-pacientes flip"
              onClick={handleFlip}
              title="Ver medicamentos"
            >
              <Database size={16} />
            </button>
          </div>
        </div>
        
        {/* Verso do card - Medicamentos */}
        <div className="card-back" ref={backRef}>
          <div className="card-header">
            <h3 className="text-sm font-medium text-green-600">Medicamentos - {protocolo?.Protocolo_Sigla || 'N/D'}</h3>
            <button 
              className="action-button-pacientes flip-back"
              onClick={handleFlip}
              title="Voltar"
            >
              <ArrowLeft size={16} />
            </button>
          </div>
          
          <div className="medicamentos-container">
            {isLoading ? (
              <div className="loading-indicator">
                <div className="spinner-small"></div>
                <span>Carregando...</span>
              </div>
            ) : medicamentos.length > 0 ? (
              <div className="medicamentos-list">
                {medicamentos.map((med, idx) => (
                  <div key={idx} className="medicamento-item">
                    <div className="medicamento-nome">
                      <Pill size={16} className="med-icon" />
                      {med.nome || 'N/D'}
                    </div>
                    <div className="medicamento-details">
                      <span className="pill-detail">
                        <Droplet size={12} />
                        {(med.dose || med.Dose) ? 
                          `${med.dose || med.Dose} ${typeof getUnidadeMedidaText === 'function' ? getUnidadeMedidaText(med.unidade_medida) : med.unidade_medida || 'N/D'}` : 
                          'N/D'
                        }
                      </span>
                      <span className="pill-detail">
                        <Calendar size={12} />
                        {typeof formatDiasAdministracao === 'function' ? 
                          formatDiasAdministracao(med.dias_adm || med.dias_aplicacao || 'N/D', {
                            maxDiasVisíveis: 5,
                            mostrarTooltip: true,
                            formatoIntervalo: true
                          }) : 
                          med.dias_adm || med.dias_aplicacao || 'N/D'
                        }
                      </span>
                      <span className="pill-detail">
                        <Clock size={12} />
                        {med.frequencia || 'N/D'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-medicamentos">
                <Pill size={32} className="text-gray-300 mb-2" />
                <p>Nenhum medicamento cadastrado</p>
                <p className="text-xs text-gray-400 mt-1">Você pode adicionar medicamentos editando este protocolo</p>
              </div>
            )}
          </div>
          
          <div className="card-actions back" onClick={e => e.stopPropagation()}>
            <button 
              className="detail-button"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof showProtocoloDetails === 'function') {
                  showProtocoloDetails(protocoloId);
                }
              }}
            >
              <Info size={14} /> Ver detalhes
            </button>
            <button 
              className="edit-button"
              onClick={(e) => { 
                e.stopPropagation();
                if (typeof handleEditFixedWithSelection === 'function') {
                  handleEditFixedWithSelection(protocolo);
                }
              }}
            >
              <Edit size={14} /> Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  const ProtocoloCardFixed = ({ 
    protocolo, 
    servicosLoading, 
    showProtocoloDetails, 
    handleEditFixedWithSelection, 
    getMedicamentosFromCache, 
    fetchServicos, 
    allMedicamentosLoaded, 
    formatDiasAdministracao, 
    getUnidadeMedidaText, 
    isEditing, 
    isAdding,
    selectedRows,
    cardFlipped,
    toggleCardFlip,
    handleSelectProtocolo,
    selectProtocolo,
    handleEdit
  }) => {
    // Adicionar verificações de segurança
    const protocoloId = protocolo?.id;
    // Verificar se selectedRows existe e é um objeto Set antes de chamar .has()
    const isSelected = selectedRows && typeof selectedRows.has === 'function' ? selectedRows.has(protocoloId) : false;
    // Verificar se cardFlipped existe
    const isFlipped = cardFlipped && cardFlipped[protocoloId] ? true : false;
  
    const [cardHeight, setCardHeight] = useState('280px');
    const frontRef = useRef(null);
    const backRef = useRef(null);
    const cardRef = useRef(null);
    
    // Obter medicamentos de múltiplas fontes possíveis
    let medicamentos = [];
    // 1. Verificar se o protocolo tem medicamentos
    if (protocolo?.medicamentos && protocolo.medicamentos.length > 0) {
      medicamentos = protocolo.medicamentos;
    } 
    // 2. Verificar no cache
    else if (typeof getMedicamentosFromCache === 'function') {
      const cachedMeds = getMedicamentosFromCache(protocoloId);
      if (cachedMeds && cachedMeds.length > 0) {
        medicamentos = cachedMeds;
      }
    }
  
    // Guardar medicamentos em um ref para preservá-los entre renderizações
    const medicamentosRef = useRef(medicamentos);
  
    // Atualizar medicamentos no ref apenas se houver novos medicamentos válidos
    useEffect(() => {
      if (medicamentos && medicamentos.length > 0) {
        medicamentosRef.current = medicamentos;
      }
    }, [medicamentos]);
  
    // Usar medicamentos do ref para renderização
    const medicamentosToRender = medicamentosRef.current || [];
    
    // Estado de carregamento
    const isLoading = servicosLoading && servicosLoading[protocoloId];
    
    // Função para alternar o estado de flip usando a função global
    const handleFlip = (e) => {
      if (e) e.stopPropagation();
      
      // Se estiver em modo de edição ou adição, não permitir virar
      if (isEditing || isAdding) return;
      
      // Calcular a altura apropriada antes de fazer o flip
      if (!isFlipped && backRef.current) {
        // Se estamos virando para o verso, ajustar a altura com base no conteúdo do verso
        const backHeight = backRef.current.scrollHeight;
        setCardHeight(`${Math.max(280, backHeight)}px`);
      } else if (frontRef.current) {
        // Se estamos voltando para a frente, restaurar a altura padrão
        setCardHeight('280px');
      }
      
      // Verificar se toggleCardFlip existe antes de chamar
      if (typeof toggleCardFlip === 'function') {
        toggleCardFlip(protocoloId, e);
      }
      
      // Carregar medicamentos se necessário
      // Se virar o card E medicamentos ainda não estiverem carregados
      if (!isFlipped && medicamentosToRender.length === 0) {
        if (typeof getMedicamentosFromCache === 'function' && 
            !getMedicamentosFromCache(protocoloId) && 
            !allMedicamentosLoaded && 
            typeof fetchServicos === 'function') {
          console.log("Carregando medicamentos para protocolo:", protocoloId);
          fetchServicos(protocoloId).then(meds => {
            if (meds && meds.length > 0) {
              medicamentosRef.current = meds; // Atualizar medicamentos no ref
            }
          });
        }
      }
    };
    
    // Ajustar a altura quando o conteúdo do verso mudar
    useEffect(() => {
      if (isFlipped && backRef.current) {
        const backHeight = backRef.current.scrollHeight;
        setCardHeight(`${Math.max(280, backHeight)}px`);
      }
    }, [isFlipped, medicamentosToRender]);
    
    // Função segura para selecionar um protocolo
    const handleSelectSafely = () => {
      if (typeof handleSelectProtocolo === 'function') {
        handleSelectProtocolo(protocoloId);
      }
    };
    
    return (
      <div 
        className={`protocol-card ${isSelected ? 'selected' : ''}`}
        onClick={handleSelectSafely}
        ref={cardRef}
        data-protocol-id={protocoloId} // Adicione esta linha
        style={{ height: cardHeight, transition: 'height 0.3s ease-out' }}
      >
        <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Frente do card - Informações do protocolo */}
          <div className="card-front" ref={frontRef}>
            <div className="card-header">
              <div className="protocol-code">{protocolo?.Protocolo_Sigla || 'N/D'}</div>
              {protocolo?.CID && (
                <div className="protocol-cid">{protocolo.CID}</div>
              )}
            </div>
            
            <div className="protocol-name">{protocolo?.Protocolo_Nome || 'Sem nome'}</div>
            
            <div className="protocol-info">
              <div className="info-row">
                <Calendar size={14} />
                <span>Intervalo: {protocolo?.Intervalo_Ciclos || 'N/D'} dias</span>
              </div>
              <div className="info-row">
                <Activity size={14} />
                <span>Ciclos: {protocolo?.Ciclos_Previstos || 'N/D'}</span>
              </div>
              <div className="info-row">
                <Bookmark size={14} />
                <span>Linha: {protocolo?.Linha || 'N/D'}</span>
              </div>
              <div className="info-row">
                <Pill size={14} />
                <span>Medicamentos: {medicamentosToRender.length}</span>
              </div>
            </div>
            
            <div className="card-actions" onClick={e => e.stopPropagation()}>
              <button 
                className="action-button-pacientes info"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (typeof showProtocoloDetails === 'function') {
                    showProtocoloDetails(protocoloId); 
                  }
                }}
                title="Ver detalhes"
              >
                <Info size={16} />
              </button>
              <button 
                className="action-button-pacientes edit"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (typeof handleEditFixedWithSelection === 'function') {
                    handleEditFixedWithSelection(protocolo);
                  }
                }}
                title="Editar protocolo"
              >
                <Edit size={16} />
              </button>
              <button 
                className="action-button-pacientes flip"
                onClick={handleFlip}
                title="Ver medicamentos"
              >
                <Database size={16} />
              </button>
            </div>
          </div>
          
          {/* Verso do card - Medicamentos */}
          <div className="card-back" ref={backRef}>
            <div className="card-header">
              <h3 className="text-sm font-medium text-green-600">Medicamentos - {protocolo?.Protocolo_Sigla || 'N/D'}</h3>
              <button 
                className="action-button-pacientes flip-back"
                onClick={handleFlip}
                title="Voltar"
              >
                <ArrowLeft size={16} />
              </button>
            </div>
            
            <div className="medicamentos-container">
              {isLoading ? (
                <div className="loading-indicator">
                  <div className="spinner-small"></div>
                  <span>Carregando...</span>
                </div>
              ) : medicamentosToRender.length > 0 ? (
                <div className="medicamentos-list">
                  {medicamentosToRender.map((med, idx) => (
                    <div key={idx} className="medicamento-item">
                      <div className="medicamento-nome">
                        <Pill size={16} className="med-icon" />
                        {med.nome || 'N/D'}
                      </div>
                      <div className="medicamento-details">
                        <span className="pill-detail">
                          <Droplet size={12} />
                          {(med.dose || med.Dose) ? 
                            `${med.dose || med.Dose} ${typeof getUnidadeMedidaText === 'function' ? getUnidadeMedidaText(med.unidade_medida) : med.unidade_medida || 'N/D'}` : 
                            'N/D'
                          }
                        </span>
                        <span className="pill-detail">
                          <Calendar size={12} />
                          {typeof formatDiasAdministracao === 'function' ? 
                            formatDiasAdministracao(med.dias_adm || med.dias_aplicacao || 'N/D', {
                              maxDiasVisíveis: 5,
                              mostrarTooltip: true,
                              formatoIntervalo: true
                            }) : 
                            med.dias_adm || med.dias_aplicacao || 'N/D'
                          }
                        </span>
                        <span className="pill-detail">
                          <Clock size={12} />
                          {med.frequencia || 'N/D'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-medicamentos">
                  <Pill size={32} className="text-gray-300 mb-2" />
                  <p>Nenhum medicamento cadastrado</p>
                  <p className="text-xs text-gray-400 mt-1">Você pode adicionar medicamentos editando este protocolo</p>
                </div>
              )}
            </div>
            
            <div className="card-actions back" onClick={e => e.stopPropagation()}>
              <button 
                className="detail-button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (typeof showProtocoloDetails === 'function') {
                    showProtocoloDetails(protocoloId);
                  }
                }}
              >
                <Info size={14} /> Ver detalhes
              </button>
              <button 
                className="edit-button"
                onClick={(e) => { 
                  e.stopPropagation();
                  if (typeof selectProtocolo === 'function') {
                    selectProtocolo(protocoloId);
                  }
                  if (typeof handleEdit === 'function') {
                    handleEdit();
                  }
                }}
              >
                <Edit size={14} /> Editar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Logging para ajudar a diagnosticar problemas com medicamentos
    console.log("Estado do cardFlipped:", cardFlipped);
    
    // Verificar se os medicamentos estão corretamente associados aos protocolos
    if (orderedProtocolos.length > 0) {
      const protocolosComMedicamentos = orderedProtocolos.filter(p => 
        p.medicamentos && p.medicamentos.length > 0
      );
      
      console.log(
        `Protocolos com medicamentos: ${protocolosComMedicamentos.length}/${orderedProtocolos.length}`,
        protocolosComMedicamentos.map(p => ({ 
          id: p.id, 
          nome: p.Protocolo_Nome, 
          numMeds: p.medicamentos.length 
        }))
      );
    }
    
    // Verificar o cache de medicamentos
    console.log("Tamanho do cache de medicamentos:", Object.keys(medicamentosCache).length);
  }, [orderedProtocolos, cardFlipped, medicamentosCache]);

  useEffect(() => {
    if (selectedProtocolo) {
      const protocoloId = selectedProtocolo.id || selectedProtocolo.id_protocolo;
      setSelectedRows(new Set([protocoloId]));
    }
  }, [selectedProtocolo]);

  useEffect(() => {
    if (filteredProtocolos && filteredProtocolos.length > 0 && selectedProtocolo) {
      // Forçar a recriação do ordenedProtocolos para atualizar a renderização
      const sorted = [...filteredProtocolos].sort((a, b) => {
        const aValue = a[sortField] || '';
        const bValue = b[sortField] || '';
        
        if (sortOrder === 'asc') {
          return String(aValue).localeCompare(String(bValue));
        } else {
          return String(bValue).localeCompare(String(aValue));
        }
      });
      
      setOrderedProtocolos(sorted);
    }
  }, [selectedProtocolo, filteredProtocolos]);
  
  
  // Componente de linha para visão de lista
  const ProtocoloListItem = ({ protocolo }) => {
    const protocoloId = protocolo.id;
    const isSelected = selectedRows.has(protocoloId);
    const isExpanded = expandedRows[protocoloId]?.expanded;
    
    return (
      <div 
        className={`protocol-list-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSelectProtocolo(protocoloId)}
      >
        <div className="list-item-code">
          <button 
            className="expand-button"
            onClick={(e) => { e.stopPropagation(); toggleRowExpansion(protocoloId); }}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {protocolo.id}
        </div>
        <div className="list-item-name">{protocolo.Protocolo_Nome}</div>
        <div className="list-item-sigla">{protocolo.Protocolo_Sigla}</div>
        <div className="list-item-intervalo">{protocolo.Intervalo_Ciclos || 'N/D'}</div>
        <div className="list-item-ciclos">{protocolo.Ciclos_Previstos || 'N/D'}</div>
        <div className="list-item-linha">{protocolo.Linha || 'N/D'}</div>
        <div className="list-item-cid">{protocolo.CID || 'N/D'}</div>
        
        <div className="list-item-actions">
          <button 
            className="action-button-pacientes info"
            onClick={(e) => { e.stopPropagation(); showProtocoloDetails(protocoloId); }}
            title="Ver detalhes"
          >
            <Info size={16} />
          </button>
          <button 
            className="action-button-pacientes edit"
            onClick={(e) => { e.stopPropagation(); selectProtocolo(protocoloId); handleEdit(); }}
            title="Editar protocolo"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Componente de linha expandida na visão de lista
  const ExpandedRow = ({ protocolo }) => {
    const protocoloId = protocolo.id;
    const rowData = expandedRows[protocoloId] || {};
    const isLoading = servicosLoading[protocoloId];
    
    // Obter medicamentos da melhor fonte disponível
    let medicamentos = [];
    
    // 1. Primeiro, verificar no cache de medicamentos
    const cachedMeds = getMedicamentosFromCache(protocoloId);
    if (cachedMeds && cachedMeds.length > 0) {
      medicamentos = cachedMeds;
    } 
    // 2. Verificar no protocolo
    else if (protocolo.medicamentos && protocolo.medicamentos.length > 0) {
      medicamentos = protocolo.medicamentos;
    } 
    // 3. Verificar nos dados expandidos
    else if (rowData.medicamentos && rowData.medicamentos.length > 0) {
      medicamentos = rowData.medicamentos;
    } 
    
    return (
      <div className="expanded-row">
        {isLoading ? (
          <div className="expanded-loading">
            <div className="spinner-small"></div>
            <span>Carregando medicamentos...</span>
          </div>
        ) : medicamentos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {medicamentos.map((med, index) => (
              <div key={index} className="med-card bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="med-card-header bg-gradient-to-r from-green-50 to-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                  <h5 className="font-medium text-green-800 flex items-center">
                    <Pill size={15} className="mr-2" />
                    Medicamento {index + 1}
                  </h5>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    {getViaAdmText(med.via_administracao || med.via_adm)}
                  </span>
                </div>
                <div className="med-card-body p-4">
                  <h6 className="text-lg font-bold text-gray-800 mb-3">{med.nome || 'N/D'}</h6>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                    <div className="info-item flex items-center">
                      <Droplet size={14} className="text-green-600 mr-1.5" />
                      <span className="text-gray-500 mr-1">Dose:</span>
                      <span className="font-medium text-gray-800">
                        {(med.dose || med.Dose) ? 
                          `${med.dose || med.Dose} ${getUnidadeMedidaText(med.unidade_medida)}` : 
                          'N/D'
                        }
                      </span>
                    </div>
                    
                    <div className="info-item flex items-center">
                      <Calendar size={14} className="text-green-600 mr-1.5" />
                      <span className="text-gray-500 mr-1">Dias:</span>
                      <span className="font-medium text-gray-800">
                        {med.dias_adm || med.dias_aplicacao ? (
                          <span className="inline-flex items-center">
                            {formatDiasAdministracao(med.dias_adm || med.dias_aplicacao, {
                              maxDiasVisíveis: 3,
                              mostrarTooltip: true,
                              formatoIntervalo: true
                            })}
                            {(med.dias_adm || med.dias_aplicacao).includes('-') && !med.dias_adm.includes(',') && (
                              <span className="ml-1 text-xs text-green-600 rounded-full bg-green-100 px-1.5 py-0.5">
                                Intervalo
                              </span>
                            )}
                          </span>
                        ) : 'N/D'}
                      </span>
                    </div>
                    
                    <div className="info-item col-span-2 flex items-center">
                      <Clock size={14} className="text-green-600 mr-1.5" />
                      <span className="text-gray-500 mr-1">Frequência:</span>
                      <span className="font-medium text-gray-800">{med.frequencia || 'N/D'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="expanded-empty">
            <p>Nenhum medicamento cadastrado para este protocolo.</p>
            <button 
              className="text-sm px-4 py-2 mt-3 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 transition-colors flex items-center"
              onClick={() => handleEdit()}
            >
              <Plus size={14} className="mr-1" />
              Adicionar Medicamento
            </button>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    console.log("Card flipped state:", cardFlipped);
  }, [cardFlipped]);

  // Modal de detalhes do protocolo melhorado
  const ProtocoloDetails = () => {
    if (!selectedProtocolo || !isDetailsOpen) return null;
    
    const currentProtocolo = filteredProtocolos.find(p => p.id === selectedProtocolo.id) || selectedProtocolo;
    const protocoloId = currentProtocolo.id || currentProtocolo.id_protocolo;
    const medicamentos = getMedicamentosFromCache(protocoloId) || currentProtocolo.medicamentos || [];
    
    return (
      <div className="modal-overlay" onClick={() => setIsDetailsOpen(false)}>
        <div className="protocolo-details-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Detalhes do Protocolo</h2>
            <button className="close-button" onClick={() => setIsDetailsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="details-content">
            {/* Cabeçalho com badge do protocolo */}
            <div className="protocolo-hero">
              <div className="protocolo-badge">
                <Activity size={24} className="protocolo-icon" />
              </div>
              <div className="protocolo-title">
                <h3>{currentProtocolo.Protocolo_Nome}</h3>
                <div className="protocolo-code">{currentProtocolo.Protocolo_Sigla}</div>
                {currentProtocolo.CID && (
                  <div className="protocolo-cid-badge">CID: {currentProtocolo.CID}</div>
                )}
              </div>
            </div>
            
            {/* Cards de informações básicas */}
            <div className="info-cards-grid">
              <div className="info-card">
                <div className="info-card-icon">
                  <Calendar />
                </div>
                <div className="info-card-content">
                  <h4>Intervalo entre Ciclos</h4>
                  <div className="info-card-value">{currentProtocolo.Intervalo_Ciclos ? `${currentProtocolo.Intervalo_Ciclos} dias` : 'Não definido'}</div>
                </div>
              </div>
              
              <div className="info-card">
                <div className="info-card-icon">
                  <Activity />
                </div>
                <div className="info-card-content">
                  <h4>Ciclos Previstos</h4>
                  <div className="info-card-value">{currentProtocolo.Ciclos_Previstos || 'Não definido'}</div>
                </div>
              </div>
              
              <div className="info-card">
                <div className="info-card-icon">
                  <Bookmark />
                </div>
                <div className="info-card-content">
                  <h4>Linha</h4>
                  <div className="info-card-value">{currentProtocolo.Linha || 'Não definido'}</div>
                </div>
              </div>
              
              <div className="info-card">
                <div className="info-card-icon">
                  <Database />
                </div>
                <div className="info-card-content">
                  <h4>Código Interno</h4>
                  <div className="info-card-value">{currentProtocolo.id}</div>
                </div>
              </div>
            </div>
            
            {/* Seção de medicamentos */}
            <div className="medicamentos-section">
              <div className="medicamentos-header">
                <h3>
                  <Pill size={16} className="mr-2" />
                  Medicamentos ({medicamentos.length})
                </h3>
              </div>
              
              {medicamentos.length > 0 ? (
                <div className="medicamentos-details-grid">
                  {medicamentos.map((med, idx) => (
                    <div key={idx} className="medicamento-details-card">
                      <div className="medicamento-details-header">
                        <h4>{med.nome || 'Sem nome'}</h4>
                        <div className="medicamento-via-badge">
                          {getViaAdmText(med.via_adm || med.via_administracao)}
                        </div>
                      </div>
                      
                      <div className="medicamento-details-body">
                        <div className="med-detail-item">
                          <div className="med-detail-icon">
                            <Droplet size={16} />
                          </div>
                          <div className="med-detail-content">
                            <div className="med-detail-label">Dose</div>
                            <div className="med-detail-value">
                              {(med.dose || med.Dose) ? 
                                `${med.dose || med.Dose} ${getUnidadeMedidaText(med.unidade_medida)}` : 
                                'Não definida'
                              }
                            </div>
                          </div>
                        </div>
                        
                        <div className="med-detail-item">
                          <div className="med-detail-icon">
                            <Calendar size={16} />
                          </div>
                          <div className="med-detail-content">
                            <div className="med-detail-label">Dias de Administração</div>
                            <div className="med-detail-value">
                              {formatDiasAdministracao(med.dias_adm || med.dias_aplicacao || 'Não definidos', {
                                maxDiasVisíveis: 5, // Mostrar mais dias nos detalhes
                                mostrarTooltip: true,
                                formatoIntervalo: true
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="med-detail-item">
                          <div className="med-detail-icon">
                            <Clock size={16} />
                          </div>
                          <div className="med-detail-content">
                            <div className="med-detail-label">Frequência</div>
                            <div className="med-detail-value">{med.frequencia || 'Não definida'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-medicamentos-state">
                  <Pill size={40} className="text-gray-300" />
                  <p>Nenhum medicamento cadastrado para este protocolo</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Você pode adicionar medicamentos ao editar este protocolo
                  </p>
                </div>
              )}
            </div>
            
            {/* Botões de ação */}
            <div className="details-actions">
              <button 
                className="edit-button"
                onClick={() => { setIsDetailsOpen(false); handleEdit(); }}
              >
                <Edit size={16} /> Editar Protocolo
              </button>
              <button 
                className="delete-button"
                onClick={() => { setIsDetailsOpen(false); handleDelete(); }}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderização do formulário de adição/edição
  const renderProtocoloForm = () => {
    if (!isAdding && !isEditing) return null;
    
    return (
      <div className="modal-overlay" onClick={handleCancel}>
        <div className="patient-form-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{isEditing ? 'Editar Protocolo' : 'Adicionar Protocolo'}</h2>
            <button className="close-button" onClick={handleCancel}>
              <X size={20} />
            </button>
          </div>
          
          <div className="form-container">
            {/* Mensagem de erro de atualização, se houver */}
            {updateError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                <p className="font-semibold">Erro ao processar dados:</p>
                <p>{updateError}</p>
              </div>
            )}
          
            {/* Seção principal do protocolo */}
            <div className="form-header border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-lg font-medium text-green-800 mb-3">Informações do Protocolo</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="protocoloNome" className="form-label text-sm font-medium text-gray-700 block mb-1">
                    Nome do Protocolo*
                  </label>
                  <input 
                    type="text"
                    id="protocoloNome"
                    name="Protocolo_Nome"
                    value={formData.Protocolo_Nome}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    placeholder="Nome do protocolo"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="protocoloSigla" className="form-label text-sm font-medium text-gray-700 block mb-1">
                    Descrição do Protocolo*
                  </label>
                  <input 
                    type="text"
                    id="protocoloSigla"
                    name="Protocolo_Sigla"
                    value={formData.Protocolo_Sigla}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    placeholder="Descrição do protocolo"
                  />
                </div>
              </div>
              
              <div className="mt-3">
                <label htmlFor="cid" className="form-label text-sm font-medium text-gray-700 block mb-1">
                  CID Associado
                </label>
                <CIDSelection
                  value={formData.CID}
                  onChange={(selectedCIDs) => {
                    if (Array.isArray(selectedCIDs) && selectedCIDs.length > 0) {
                      const cidValues = selectedCIDs.map(cid => 
                        typeof cid === 'string' ? cid : cid.codigo
                      ).join(',');
                      
                      setFormData(prev => ({
                        ...prev,
                        CID: cidValues
                      }));
                    } else if (selectedCIDs === null || selectedCIDs.length === 0) {
                      setFormData(prev => ({
                        ...prev,
                        CID: ''
                      }));
                    }
                  }}
                  placeholder="Selecione um ou mais CIDs..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="form-group">
                  <label htmlFor="intervaloCiclos" className="form-label text-sm font-medium text-gray-700 block mb-1">
                    Intervalo entre Ciclos (dias)
                  </label>
                  <input 
                    type="number"
                    id="intervaloCiclos"
                    name="Intervalo_Ciclos"
                    value={formData.Intervalo_Ciclos || ''}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="0"
                    placeholder="Dias entre ciclos"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="numerosCiclosPrevistos" className="form-label text-sm font-medium text-gray-700 block mb-1">
                    Número de Ciclos Previstos
                  </label>
                  <input 
                    type="number"
                    id="numerosCiclosPrevistos"
                    name="Ciclos_Previstos"
                    value={formData.Ciclos_Previstos || ''}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="0"
                    placeholder="Quantidade de ciclos"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="linha" className="form-label text-sm font-medium text-gray-700 block mb-1">
                    Linha
                  </label>
                  <input 
                    type="number"
                    id="linha"
                    name="Linha"
                    value={formData.Linha || ''}
                    onChange={handleInputChange}
                    className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Linha do protocolo"
                  />
                </div>
              </div>
            </div>

            {/* Seção de Medicamentos com estilo melhorado */}
            <div className="form-section mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-green-800 flex items-center">
                  <Pill size={18} className="mr-2" />
                  Medicamentos do Protocolo
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    Opcional
                  </span>
                </h3>
                <button 
                  type="button" 
                  onClick={handleAddMedicamento}
                  className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 border border-green-200 transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  <span>Adicionar Medicamento</span>
                </button>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                {formData.medicamentos.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">Nenhum medicamento adicionado</p>
                    <p className="text-sm text-gray-400 mb-3">
                      Você pode cadastrar o protocolo sem medicamentos ou adicionar medicamentos usando o botão abaixo
                    </p>
                    <button 
                      type="button" 
                      onClick={handleAddMedicamento}
                      className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-sm"
                    >
                      <Plus size={14} className="mr-1" />
                      Adicionar Medicamento (Opcional)
                    </button>
                  </div>
                ) : (
                  <div className="medication-list space-y-4">
                    {formData.medicamentos.map((med, index) => renderMedicamentoRow(med, index))}
                  </div>
                )}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                {localLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                    Salvando...
                  </span>
                ) : 'Salvar Protocolo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="patient-dashboard">
      {/* Barra superior com ações */}
      <div className="dashboard-header">
        <div className="view-toggle">
          <button 
            className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Visualização em grade"
          >
            <Grid size={18} />
          </button>
          <button 
            className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Visualização em lista"
          >
            <List size={18} />
          </button>
        </div>
        
        <div className="search-container-pacientes">
          <div className="search-bar-pacientes">
            <Search size={18} className="search-icon-pacientes" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={`Pesquisar por ${getSearchTypeName(searchType)}...`}
              defaultValue={searchTerm}
              onInput={(e) => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchTerm && (
              <button className="clear-search-pacientes" onClick={handleClearSearch}>
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="search-options">
            {/* Opções de pesquisa sempre visíveis */}
            <div className="search-types">
              <label className={searchType === 'nome' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'nome'} 
                  onChange={() => handleSearchTypeChange('nome')} 
                />
                <span>Nome</span>
              </label>
              <label className={searchType === 'sigla' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'sigla'} 
                  onChange={() => handleSearchTypeChange('sigla')} 
                />
                <span>Sigla</span>
              </label>
              <label className={searchType === 'cid' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'cid'} 
                  onChange={() => handleSearchTypeChange('cid')} 
                />
                <span>CID</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="sort-container-pacientes">
          <div className="sort-label">
            <SlidersHorizontal size={14} /> Ordenar por
          </div>
          <div className="sort-options">
            <select 
              value={sortField}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="Protocolo_Nome">Nome</option>
              <option value="Protocolo_Sigla">Sigla</option>
              <option value="CID">CID</option>
              <option value="Intervalo_Ciclos">Intervalo Ciclos</option>
              <option value="Ciclos_Previstos">Ciclos Previstos</option>
              <option value="Linha">Linha</option>
            </select>
            <button 
              className="sort-order-button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <ArrowUpWideNarrow size={16} /> : <ArrowDownWideNarrow size={16} />}
            </button>
          </div>
        </div>
        
        <div className="controls-container">
          <DataRefreshButton contextType="protocolo" />
          
          <button className="add-patient-button" onClick={handleAdd}>
            <Plus size={16} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>
      
      {/* Barra de informações */}
      <div className="info-bar">
        <div className="patient-count">
          <Activity size={16} />
          <span>
            {filteredProtocolos.length} {filteredProtocolos.length === 1 ? 'protocolo' : 'protocolos'}
            {searchTerm && ` encontrado${filteredProtocolos.length === 1 ? '' : 's'} para "${searchTerm}"`}
          </span>
        </div>
        
        {selectedProtocolo && (
          <div className="selected-info">
            <span>Selecionado:</span>
            <strong>{selectedProtocolo.Protocolo_Nome}</strong>
            <div className="selected-actions">
              <button 
                className="action-button-pacientes"
                onClick={handleEdit}
                disabled={isEditing}
              >
                <Edit size={16} /> Editar
              </button>
              <button 
                className="action-button-pacientes"
                onClick={handleDelete}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Lista de protocolos - visão de grid ou lista */}
      <div className="patients-container">
        {loading || localLoading || initialLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando protocolos...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">Erro: {error}</p>
            <button className="reload-button" onClick={() => loadProtocolos(true)}>
              Tentar novamente
            </button>
          </div>
        ) : filteredProtocolos.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} />
            <p>Nenhum protocolo encontrado</p>
            {searchTerm && (
              <button className="clear-search-button" onClick={handleClearSearch}>
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="patients-grid">
                {(orderedProtocolos.length > 0 ? orderedProtocolos : filteredProtocolos).map(protocolo => (
                  <ProtocoloFlipCard 
                  key={protocolo.id} 
                  protocolo={protocolo}
                  isSelected={selectedRows.has(protocolo.id)}
                  servicosLoading={servicosLoading}
                  handleSelectProtocolo={handleSelectProtocolo}
                  showProtocoloDetails={showProtocoloDetails}
                  handleEditFixedWithSelection={handleEditFixedWithSelection}
                  getMedicamentosFromCache={getMedicamentosFromCache}
                  fetchServicos={fetchServicos}
                  allMedicamentosLoaded={allMedicamentosLoaded}
                  formatDiasAdministracao={formatDiasAdministracao}
                  getUnidadeMedidaText={getUnidadeMedidaText}
                  isEditing={isEditing}
                  isAdding={isAdding}
                />
                ))}
              </div>
            ) : (
              <div className="protocols-list">
                <div className="list-header">
                  <div className="list-header-code">ID</div>
                  <div className="list-header-name">Nome</div>
                  <div className="list-header-sigla">Sigla</div>
                  <div className="list-header-intervalo">Intervalo</div>
                  <div className="list-header-ciclos">Ciclos</div>
                  <div className="list-header-linha">Linha</div>
                  <div className="list-header-cid">CID</div>
                  <div className="list-header-actions">Ações</div>
                </div>
                
                <div className="list-body">
                  {(orderedProtocolos.length > 0 ? orderedProtocolos : filteredProtocolos).map(protocolo => (
                    <React.Fragment key={protocolo.id}>
                      <ProtocoloListItem protocolo={protocolo} />
                      {expandedRows[protocolo.id]?.expanded && (
                        <ExpandedRow protocolo={protocolo} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Formulário modal */}
      {renderProtocoloForm()}
      
      {/* Modal de detalhes */}
      <ProtocoloDetails />
      
      {/* Indicador de atualização de cache */}
      {cacheRefreshed && (
        <div className="cache-updated-indicator">
          <Database size={16} />
          <span>Dados atualizados com sucesso</span>
        </div>
      )}
      
      {/* Estilos específicos para o card de protocolo com flipping */}
      <style jsx>{`
        /* Estilos para o flip card de protocolo */
        .protocol-card {
          position: relative;
          perspective: 1000px;
          height: 280px;
          width: 100%;
          cursor: pointer;
          margin-bottom: 16px;
        }
        
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: left;
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.3s ease-out;
          transform-style: preserve-3d;
          box-shadow: var(--shadow-sm);
          border-radius: var(--radius-md);
        }
        
        .protocol-card:hover .card-inner:not(.flipped) {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }
        
        .protocol-card.selected .card-inner {
          border: 2px solid var(--color-secondary);
          box-shadow: var(--shadow-lg);
        }
        
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .card-front {
          background-color: white;
          z-index: 2;
        }
        
        .card-back {
          background-color: white;
          transform: rotateY(180deg);
          display: flex;
          flex-direction: column;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: var(--color-bg-light);
          border-bottom: 1px solid var(--color-border);
        }
        
        .card-back .card-header {
          background: linear-gradient(to right, #edf8ed, #f8fafc);
        }
        
        .protocol-code {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary);
          display: flex;
          align-items: center;
        }
        
        .protocol-cid {
          background-color: var(--color-primary-light);
          color: var(--color-primary);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .protocol-name {
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-dark);
          border-bottom: 1px solid var(--color-bg-light);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .protocol-info {
          padding: 12px 16px;
          flex-grow: 1;
        }
        
        .info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 13px;
          color: var(--color-text-light);
        }
        
        .info-row:last-child {
          margin-bottom: 0;
        }
        
        .info-row svg {
          color: var(--color-primary);
        }
        
        .card-actions {
          padding: 12px 16px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          background-color: var(--color-bg-light);
          border-top: 1px solid var(--color-border);
        }
        
        .card-actions.back {
          margin-top: auto;
          justify-content: space-between;
          background: linear-gradient(to right, #f0f7f0, #f8fafc);
        }
        
        .card-actions .action-button-pacientes {
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: var(--color-text-light);
        }
        
        .card-actions .action-button-pacientes:hover {
          background-color: rgba(255, 255, 255, 0.8);
          color: var(--color-primary);
          transform: translateY(-2px);
        }
        
        .card-actions .action-button-pacientes.info {
          color: var(--color-info);
        }
        
        .card-actions .action-button-pacientes.edit {
          color: var(--color-primary);
        }
        
        .card-actions .action-button-pacientes.flip {
          color: var(--color-secondary);
          animation: pulse 2s infinite;
        }
        
        .card-actions .action-button-pacientes.flip-back {
          color: var(--color-text-dark);
          animation: pulse-small 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(198, 214, 81, 0.4);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(198, 214, 81, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(198, 214, 81, 0);
          }
        }
        
        @keyframes pulse-small {
          0% {
            box-shadow: 0 0 0 0 rgba(140, 179, 105, 0.3);
          }
          70% {
            box-shadow: 0 0 0 4px rgba(140, 179, 105, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(140, 179, 105, 0);
          }
        }
        
        /* Área de medicamentos no verso do card */
        .medicamentos-container {
          flex-grow: 1;
          overflow-y: auto;
          padding: 12px;
          background-color: white;
        }
        
        .medicamentos-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .medicamento-item {
          background-color: #f0f7f0;
          border-radius: 8px;
          padding: 12px;
          transition: transform 0.2s, background-color 0.2s;
          border-left: 3px solid var(--color-primary);
        }
        
        .medicamento-item:hover {
          background-color: #e6f3e6;
          transform: translateX(3px);
        }
        
        .medicamento-nome {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
          color: var(--color-text-dark);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .med-icon {
          color: var(--color-primary);
        }
        
        .medicamento-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .pill-detail {
          background-color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--color-text-dark);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .pill-detail svg {
          color: var(--color-primary);
        }
        
        .empty-medicamentos {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-light);
          font-size: 13px;
          padding: 24px 0;
        }
        
        .detail-button, .edit-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          transition: all 0.2s ease;
          border: 1px solid var(--color-border);
        }
        
        .detail-button {
          background-color: white;
          color: var(--color-info);
        }
        
        .detail-button:hover {
          background-color: var(--color-info);
          color: white;
          border-color: var(--color-info);
        }
        
        .edit-button {
          background-color: white;
          color: var(--color-primary);
        }
        
        .edit-button:hover {
          background-color: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        
        /* Efeito de brilho na animação de flip */
        @keyframes card-glow {
          0% { box-shadow: 0 0 5px rgba(140, 179, 105, 0.3); }
          50% { box-shadow: 0 0 20px rgba(140, 179, 105, 0.7); }
          100% { box-shadow: 0 0 5px rgba(140, 179, 105, 0.3); }
        }
        
        .card-inner.flipped {
          animation: card-glow 2s ease-in-out;
        }
        
        /* Estilos para o modo lista */
        .protocols-list {
          background-color: white;
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        
        .list-header {
          display: grid;
          grid-template-columns: 0.7fr 1.7fr 1.2fr 0.8fr 0.8fr 0.6fr 0.8fr 0.7fr;
          padding: 12px 16px;
          background-color: var(--color-bg-light);
          border-bottom: 1px solid var(--color-border);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-light);
        }
        
        .protocol-list-item {
          display: grid;
          grid-template-columns: 0.7fr 1.7fr 1.2fr 0.8fr 0.8fr 0.6fr 0.8fr 0.7fr;
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-bg-light);
          align-items: center;
          transition: var(--transition-default);
          cursor: pointer;
        }
        
        .protocol-list-item:hover {
          background-color: var(--color-bg-light);
        }
        
        .protocol-list-item.selected {
          background-color: rgba(198, 214, 81, 0.1);
          border-left: 3px solid var(--color-secondary);
        }
        
        .list-item-code {
          display: flex;
          align-items: center;
          font-weight: 500;
        }
        
        .expand-button {
          background: none;
          border: none;
          color: var(--color-text-light);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 2px;
          margin-right: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .expand-button:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: var(--color-text-dark);
        }
        
        .list-item-name, 
        .list-item-sigla, 
        .list-item-intervalo, 
        .list-item-ciclos, 
        .list-item-linha, 
        .list-item-cid {
          font-size: 12px;
          color: var(--color-text-light);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .list-item-name {
          font-weight: 500;
          color: var(--color-text-dark);
        }
        
        .list-item-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        
        .expanded-row {
          background-color: #f7fafc;
          padding: 16px;
          border-bottom: 1px solid var(--color-border);
          max-height: 500px;
          overflow-y: auto;
          animation: expandDown 0.3s ease-out forwards;
        }
        
        @keyframes expandDown {
          from {
            max-height: 0;
            opacity: 0;
            transform: translateY(-16px);
          }
          to {
            max-height: 500px;
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .expanded-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: var(--color-text-light);
          gap: 8px;
        }
        
        .expanded-empty {
          text-align: center;
          padding: 24px;
          color: var(--color-text-light);
        }
        
        /* Animação para bolhas no medicamento */
        @keyframes bubble-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        .medicamento-item {
          position: relative;
          overflow: hidden;
        }
        
        .medicamento-item::after {
          content: '';
          position: absolute;
          top: -5px;
          right: -5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: rgba(140, 179, 105, 0.3);
          animation: bubble-float 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Exportar o componente principal como default para resolver o problema de referência circular
const CadastroProtocolo = () => {
  return <ProtocoloForm />;
};

export default CadastroProtocolo;