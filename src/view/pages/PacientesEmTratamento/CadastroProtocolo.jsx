// CadastroProtocolo.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProtocolo } from '../../../context/ProtocoloContext';
import { 
  Plus, Edit, Trash2, Search, X, Save, ArrowUpWideNarrow, 
  ArrowDownWideNarrow, Database, ChevronDown, ChevronRight, Check
} from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import DataRefreshButton from '../../../components/DataRefreshButton';
import './PacientesEstilos.css';

const API_BASE_URL = "http://localhost/backend-php/api/PacientesEmTratamento";

const CadastroProtocolo = () => {
  // Contexto
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
    protocoloServicos,
    loadProtocoloServicos,
    loadProtocoloDetails,
    addServicoToProtocolo,
    deleteServicoFromProtocolo,
    updateServicoProtocolo
  } = useProtocolo();
  
  // Estado para controle da UI
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Protocolo_Nome");
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [searchType, setSearchType] = useState("nome");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [addingServiceToRow, setAddingServiceToRow] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [viasAdministracao, setViasAdministracao] = useState([]);
  const [servicosLoading, setServicosLoading] = useState({});
  
  // Novos estados para edição de serviços
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editServiceForm, setEditServiceForm] = useState({
    id_servico: '',
    Servico_Codigo: '',
    Dose: '',
    Dose_M: '',
    Dose_Total: '',
    Dias_de_Aplic: '',
    Via_de_Adm: '',
    observacoes: ''
  });
  
  // Refs
  const searchInputRef = useRef(null);
  const loadedProtocolIds = useRef(new Set());
  
  // Estado para formulários
  const [formData, setFormData] = useState({
    Protocolo_Nome: '',
    Protocolo_Sigla: '',
    Protocolo_Dose_M: '',
    Protocolo_Dose_Total: '',
    Protocolo_Dias_de_Aplicacao: '',
    CID: '',
    Protocolo_ViaAdm: '',
    Linha: ''
  });
  
  // Estado para formulário de serviço (Nomes atualizados para corresponder ao banco de dados)
  const [servicoForm, setServicoForm] = useState({
    id_servico: 1,
    Servico_Codigo: '',
    Dose: '',        // Campo adicional
    Dose_M: '',
    Dose_Total: '',
    Dias_de_Aplic: '',
    Via_de_Adm: '',
    observacoes: ''  // Campo adicional para Observacoes
  });
  
  // Estados para ordenação personalizada
  const [orderedProtocolos, setOrderedProtocolos] = useState([]);
  
  // Efeito para ordenar protocolos
  useEffect(() => {
    if (!filteredProtocolos || filteredProtocolos.length === 0) return;
    
    const sorted = [...filteredProtocolos].sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      const numericFields = ['id', 'Protocolo_Dose_M', 'Protocolo_Dose_Total'];
      
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
    
    setOrderedProtocolos(sorted);
  }, [filteredProtocolos, sortField, sortOrder]);
  
  // Carregar vias de administração
  useEffect(() => {
    loadViasAdministracao();
  }, []);
  
  // Efeito para carregar serviços de protocolos expandidos (CORRIGIDO)
  useEffect(() => {
    Object.keys(expandedRows).forEach(protocoloId => {
      const protocolIdNum = Number(protocoloId);
      
      // Só carrega se estiver expandido e não foi carregado anteriormente
      if (expandedRows[protocoloId].expanded && 
          !loadedProtocolIds.current.has(protocolIdNum)) {
        
        // Marca este protocolo como já carregado
        loadedProtocolIds.current.add(protocolIdNum);
        
        // Carrega os serviços
        fetchServicos(protocolIdNum);
      }
    });
    
    // Limpeza de IDs que não estão mais expandidos
    const expandedIds = new Set(Object.keys(expandedRows).map(Number));
    Array.from(loadedProtocolIds.current).forEach(id => {
      if (!expandedIds.has(id)) {
        loadedProtocolIds.current.delete(id);
      }
    });
  }, [expandedRows]);
  
  // Função para carregar serviços (CORRIGIDA)
  const fetchServicos = useCallback(async (protocoloId) => {
    if (!protocoloId) return;
    
    try {
      setServicosLoading(prev => ({ ...prev, [protocoloId]: true }));
      const servicos = await loadProtocoloServicos(protocoloId);
      
      setExpandedRows(prev => {
        // Se o nó não existe mais, não faz nada
        if (!prev[protocoloId]) return prev;
        
        return {
          ...prev,
          [protocoloId]: {
            ...prev[protocoloId],
            servicos: servicos || []
          }
        };
      });
      
    } catch (error) {
      console.error(`Erro ao carregar serviços para protocolo ${protocoloId}:`, error);
      showErrorAlert("Erro", `Não foi possível carregar os serviços: ${error.message}`);
    } finally {
      setServicosLoading(prev => ({ ...prev, [protocoloId]: false }));
    }
  }, [loadProtocoloServicos]);
  
  // Função para alternar a expansão de uma linha (CORRIGIDA)
  const toggleRowExpansion = useCallback((protocoloId) => {
    // Se estiver em modo de edição ou adição, não permitir expandir
    if (isEditing || isAdding) return;
    
    setExpandedRows(prev => {
      const newState = { ...prev };
      
      if (newState[protocoloId]) {
        // Se já estiver expandido, recolher
        delete newState[protocoloId];
      } else {
        // Se não estiver expandido, expandir e inicializar
        newState[protocoloId] = {
          expanded: true,
          servicos: [],
          isAddingService: false
        };
      }
      
      return newState;
    });
    
    // Atualizar a seleção se necessário
    if (!selectedRows.has(protocoloId)) {
      setSelectedRows(new Set([protocoloId]));
      selectProtocolo(protocoloId);
    }
  }, [isEditing, isAdding, selectedRows, selectProtocolo]);
  
  // Reset dos formulários
  const resetForm = () => {
    setFormData({
      Protocolo_Nome: '',
      Protocolo_Sigla: '',
      Protocolo_Dose_M: '',
      Protocolo_Dose_Total: '',
      Protocolo_Dias_de_Aplicacao: '',
      CID: '',
      Protocolo_ViaAdm: '',
      Linha: ''
    });
    setUpdateError(null);
  };

  const resetServicoForm = () => {
    setServicoForm({
      id_servico: 1,
      Servico_Codigo: '',
      Dose: '',
      Dose_M: '',
      Dose_Total: '',
      Dias_de_Aplic: '',
      Via_de_Adm: '',
      observacoes: ''
    });
  };
  
  // Funções para gerenciar serviços
  const startAddService = (protocoloId, e) => {
    if (e) e.stopPropagation();
    
    setExpandedRows(prev => ({
      ...prev,
      [protocoloId]: {
        ...prev[protocoloId],
        isAddingService: true
      }
    }));
    
    setAddingServiceToRow(protocoloId);
    resetServicoForm();
  };

  const cancelAddService = (protocoloId, e) => {
    if (e) e.stopPropagation();
    
    setExpandedRows(prev => ({
      ...prev,
      [protocoloId]: {
        ...prev[protocoloId],
        isAddingService: false
      }
    }));
    
    setAddingServiceToRow(null);
    resetServicoForm();
  };

  const saveNewService = useCallback(async (protocoloId, e) => {
    if (e) e.preventDefault();
    
    if (!servicoForm.Servico_Codigo) {
      showWarningAlert("Dados incompletos", "Por favor, informe pelo menos o código do serviço.");
      return;
    }
    
    try {
      setLocalLoading(true);
      
      // Chamar API para adicionar serviço
      await addServicoToProtocolo(protocoloId, servicoForm);
      
      // Recarregar serviços
      await fetchServicos(protocoloId);
      
      // Resetar estados
      resetServicoForm();
      setExpandedRows(prev => ({
        ...prev,
        [protocoloId]: {
          ...prev[protocoloId],
          isAddingService: false
        }
      }));
      
      setAddingServiceToRow(null);
      showSuccessAlert("Sucesso", "Serviço adicionado com sucesso.");
      
    } catch (error) {
      console.error("Erro ao adicionar serviço:", error);
      showErrorAlert("Erro", `Não foi possível adicionar o serviço: ${error.message}`);
    } finally {
      setLocalLoading(false);
    }
  }, [servicoForm, addServicoToProtocolo, fetchServicos]);
  
  // Novas funções para edição de serviços
  const startEditService = (protocoloId, servico, e) => {
    if (e) e.stopPropagation();
    
    // Cancelar qualquer edição em andamento
    if (editingServiceId) {
      cancelEditService(e);
    }
    
    setEditingServiceId(servico.id);
    setEditServiceForm({
      id_servico: servico.id_servico || '',
      Servico_Codigo: servico.Servico_Codigo || '',
      Dose: servico.Dose || '',
      Dose_M: servico.Dose_M || servico.dose_m || '',
      Dose_Total: servico.Dose_Total || servico.dose_total || '',
      Dias_de_Aplic: servico.Dias_de_Aplic || servico.dias_aplicacao || '',
      Via_de_Adm: servico.Via_de_Adm || servico.via_administracao || '',
      observacoes: servico.observacoes || ''
    });
  };
  
  const cancelEditService = (e) => {
    if (e) e.stopPropagation();
    setEditingServiceId(null);
  };
  
  const handleEditServiceInputChange = (e) => {
    const { name, value } = e.target;
    setEditServiceForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Função para salvar as alterações de um serviço
  const saveServiceChanges = useCallback(async (protocoloId, servicoId, e) => {
    if (e) e.stopPropagation();
    
    try {
      setLocalLoading(true);
      
      // Preparar os dados para envio, garantindo que todos os campos necessários estejam presentes
      const data = {
        ...editServiceForm,
        id: servicoId,
        id_protocolo: protocoloId
      };
      
      console.log("Enviando dados para atualização:", data);
      
      // Usar a função do contexto para atualizar o serviço
      if (updateServicoProtocolo) {
        await updateServicoProtocolo(protocoloId, servicoId, data);
      } else {
        // Fallback para o caso da função não existir no contexto
        const response = await axios.put(
          `${API_BASE_URL}/update_servico_protocolo.php?id_protocolo=${protocoloId}&id=${servicoId}`, 
          data
        );
        console.log("Resposta do servidor:", response.data);
      }
      
      // Recarregar serviços para atualizar a UI
      await fetchServicos(protocoloId);
      
      // Resetar o modo de edição
      setEditingServiceId(null);
      
      showSuccessAlert("Sucesso", "Serviço atualizado com sucesso.");
      
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      console.error("Detalhes do erro:", error.response?.data || "Sem detalhes adicionais");
      showErrorAlert("Erro", `Não foi possível atualizar o serviço: ${error.message}`);
    } finally {
      setLocalLoading(false);
    }
  }, [editServiceForm, fetchServicos, updateServicoProtocolo]);

  const removeService = useCallback(async (protocoloId, servicoId, e) => {
    if (e) e.stopPropagation();
    
    const confirmed = await showConfirmAlert(
      "Confirmar exclusão", 
      "Tem certeza que deseja excluir este serviço do protocolo?"
    );
    
    if (confirmed) {
      try {
        setLocalLoading(true);
        
        // Chamar API para remover serviço
        await deleteServicoFromProtocolo(protocoloId, servicoId);
        
        // Recarregar serviços
        await fetchServicos(protocoloId);
        
        showSuccessAlert("Sucesso", "Serviço removido com sucesso.");
        
      } catch (error) {
        console.error("Erro ao remover serviço:", error);
        showErrorAlert("Erro", `Não foi possível remover o serviço: ${error.message}`);
      } finally {
        setLocalLoading(false);
      }
    }
  }, [deleteServicoFromProtocolo, fetchServicos]);
  
  // Handlers para formulários e pesquisa
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    
    if (searchTerm && searchTerm.trim().length >= 2) {
      setLocalLoading(true);
      searchProtocolos(searchTerm, type)
        .finally(() => setLocalLoading(false));
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
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleServicoInputChange = (e) => {
    const { name, value } = e.target;
    setServicoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const showCacheRefreshIndicator = () => {
    setCacheRefreshed(true);
    setTimeout(() => setCacheRefreshed(false), 3000);
  };
  
  const refreshDataAfterModification = async () => {
    try {
      setLocalLoading(true);
      const selectedProtocoloId = selectedProtocolo?.id;
      await loadProtocolos(true);
      
      if (selectedProtocoloId) {
        selectProtocolo(selectedProtocoloId);
      }
      
      showCacheRefreshIndicator();
    } catch (error) {
      console.error("Erro ao atualizar dados após modificação:", error);
      showErrorAlert("Falha ao atualizar os dados", "Tente atualizar manualmente.");
    } finally {
      setLocalLoading(false);
    }
  };
  
  const validateFormData = (data) => {
    if (!data.Protocolo_Nome || !data.Protocolo_Sigla) {
      return { valid: false, message: "Nome e Sigla são campos obrigatórios" };
    }
    
    const numericData = { ...data };
    
    if (numericData.Protocolo_Dose_M !== undefined && numericData.Protocolo_Dose_M !== '') {
      numericData.Protocolo_Dose_M = parseFloat(numericData.Protocolo_Dose_M);
    } else {
      numericData.Protocolo_Dose_M = null;
    }
    
    if (numericData.Protocolo_Dose_Total !== undefined && numericData.Protocolo_Dose_Total !== '') {
      numericData.Protocolo_Dose_Total = parseFloat(numericData.Protocolo_Dose_Total);
    } else {
      numericData.Protocolo_Dose_Total = null;
    }
    
    if (numericData.Protocolo_Dias_de_Aplicacao !== undefined && numericData.Protocolo_Dias_de_Aplicacao !== '') {
      numericData.Protocolo_Dias_de_Aplicacao = parseInt(numericData.Protocolo_Dias_de_Aplicacao, 10);
    } else {
      numericData.Protocolo_Dias_de_Aplicacao = null;
    }
    
    if (numericData.Protocolo_ViaAdm !== undefined && numericData.Protocolo_ViaAdm !== '') {
      numericData.Protocolo_ViaAdm = parseInt(numericData.Protocolo_ViaAdm, 10);
    } else {
      numericData.Protocolo_ViaAdm = null;
    }
    
    if (numericData.Linha !== undefined && numericData.Linha !== '') {
      numericData.Linha = parseInt(numericData.Linha, 10);
    } else {
      numericData.Linha = null;
    }
    
    return { valid: true, data: numericData };
  };
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setUpdateError(null);
    
    const validation = validateFormData(formData);
    if (!validation.valid) {
      showErrorAlert("Validação falhou", validation.message);
      return;
    }
    
    const validatedData = validation.data;
    
    if (isEditing && selectedProtocolo) {
      try {
        setLocalLoading(true);
        
        // Usar o id_protocolo para a atualização
        const protocoloId = selectedProtocolo.id_protocolo || selectedProtocolo.id;
        console.log("Atualizando protocolo ID:", protocoloId);
        
        await updateProtocolo(protocoloId, validatedData);
        setIsEditing(false);
        showSuccessAlert("Protocolo atualizado com sucesso!");
        await refreshDataAfterModification();
      } catch (error) {
        setUpdateError(error.message);
        showErrorAlert("Erro ao atualizar protocolo", error.message);
      } finally {
        setLocalLoading(false);
      }
    } else if (isAdding) {
      try {
        setLocalLoading(true);
        const newId = await addProtocolo(validatedData);
        setIsAdding(false);
        showSuccessAlert("Protocolo adicionado com sucesso!");
        await refreshDataAfterModification();
      } catch (error) {
        setUpdateError(error.message);
        showErrorAlert("Erro ao adicionar protocolo", error.message);
      } finally {
        setLocalLoading(false);
      }
    }
    
    resetForm();
  };
  
  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };
  
  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  const handleResetSort = () => {
    setSortField('Protocolo_Nome');
    setSortOrder('asc');
  };
  
  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRows(new Set());
    setExpandedRows({});
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
    
    // O ID a ser usado para a atualização deve ser o id_protocolo
    const protocoloId = currentProtocolo.id_protocolo || currentProtocolo.id;
    
    console.log("Editando protocolo:", currentProtocolo);
    console.log("ID a ser usado para atualização:", protocoloId);
    
    setFormData({
      Protocolo_Nome: currentProtocolo.Protocolo_Nome || '',
      Protocolo_Sigla: currentProtocolo.Protocolo_Sigla || '',
      Protocolo_Dose_M: currentProtocolo.Protocolo_Dose_M || '',
      Protocolo_Dose_Total: currentProtocolo.Protocolo_Dose_Total || '',
      Protocolo_Dias_de_Aplicacao: currentProtocolo.Protocolo_Dias_de_Aplicacao || '',
      CID: currentProtocolo.CID || '',
      Protocolo_ViaAdm: currentProtocolo.Protocolo_ViaAdm || '',
      Linha: currentProtocolo.Linha || ''
    });
    
    setIsEditing(true);
    setIsAdding(false);
    setExpandedRows({});
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
        await deleteProtocolo(selectedProtocolo.id);
        showSuccessAlert("Protocolo excluído com sucesso!");
        setSelectedRows(new Set());
        setExpandedRows({});
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
  
  const handleCancelAdd = () => handleCancel();
  const handleSaveNew = () => handleSubmit();
  const handleSave = () => handleSubmit();
  
  const handleRowClick = (protocoloId) => {
    if (isEditing || isAdding) return;
    
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(protocoloId)) {
        newSet.clear();
        newSet.add(protocoloId);
      }
      return newSet;
    });
    
    selectProtocolo(protocoloId);
    
    if (protocoloId && loadProtocoloDetails) {
      loadProtocoloDetails(protocoloId).catch(console.error);
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
  
  const handleInput = () => {
    if (searchInputRef.current) {
      searchProtocolos(searchInputRef.current.value, searchType);
    }
  };
  
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

  // Carregar vias de administração
  const loadViasAdministracao = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_vias_administracao.php`);
      if (!response.ok) {
        throw new Error(`Erro ao carregar vias de administração: ${response.status}`);
      }
      const data = await response.json();
      setViasAdministracao(data);
    } catch (error) {
      console.error("Erro ao carregar vias de administração:", error);
    }
  };
  
  // Renderização de componentes UI - Modificado para incluir edição
  const renderServicoRow = (servico, protocoloId) => {
    const servicoId = servico.id; // Usar 'id' como chave primária
    const isEditing = editingServiceId === servicoId;
    
    // Se estiver em modo de edição, exibe campos editáveis
    if (isEditing) {
      return (
        <tr key={`servico-${servicoId}`} className="border-b border-gray-100 bg-blue-50">
          <td className="py-2 px-3">
            <input
              type="text"
              name="Servico_Codigo"
              value={editServiceForm.Servico_Codigo}
              onChange={handleEditServiceInputChange}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="py-2 px-3">
            <input
              type="number"
              name="Dose"
              value={editServiceForm.Dose}
              onChange={handleEditServiceInputChange}
              className="w-full p-1 border rounded text-sm"
              step="0.01"
            />
          </td>
          <td className="py-2 px-3">
            <input
              type="number"
              name="Dose_M"
              value={editServiceForm.Dose_M}
              onChange={handleEditServiceInputChange}
              className="w-full p-1 border rounded text-sm"
              step="0.01"
            />
          </td>
          <td className="py-2 px-3">
            <input
              type="number"
              name="Dose_Total"
              value={editServiceForm.Dose_Total}
              onChange={handleEditServiceInputChange}
              className="w-full p-1 border rounded text-sm"
              step="0.01"
            />
          </td>
          <td className="py-2 px-3">
            <input
              type="number"
              name="Dias_de_Aplic"
              value={editServiceForm.Dias_de_Aplic}
              onChange={handleEditServiceInputChange}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="py-2 px-3">
            <input
              type="text"
              name="Via_de_Adm"
              value={editServiceForm.Via_de_Adm}
              onChange={handleEditServiceInputChange}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="py-2 px-3">
            <textarea
              name="observacoes"
              value={editServiceForm.observacoes}
              onChange={handleEditServiceInputChange}
              className="w-full p-1 border rounded text-sm"
              rows="1"
            ></textarea>
          </td>
          <td className="py-2 px-3 text-center">
            <div className="flex justify-center space-x-2">
              <button 
                onClick={(e) => saveServiceChanges(protocoloId, servicoId, e)}
                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-100"
                title="Salvar alterações"
                disabled={localLoading}
              >
                <Check size={16} />
              </button>
              <button 
                onClick={cancelEditService}
                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100"
                title="Cancelar edição"
              >
                <X size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    }
    
    // Renderização normal (não está em edição)
    return (
      <tr key={`servico-${servicoId}`} className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-2 px-3 text-sm">{servico.Servico_Codigo || servico.id_servico || 'N/D'}</td>
        <td className="py-2 px-3 text-sm">{servico.Dose || 'N/D'}</td>
        <td className="py-2 px-3 text-sm">{servico.Dose_M || servico.dose_m || 'N/D'}</td>
        <td className="py-2 px-3 text-sm">{servico.Dose_Total || servico.dose_total || 'N/D'}</td>
        <td className="py-2 px-3 text-sm">{servico.Dias_de_Aplic || servico.dias_aplicacao || 'N/D'}</td>
        <td className="py-2 px-3 text-sm">{servico.Via_de_Adm || servico.via_administracao || 'N/D'}</td>
        <td className="py-2 px-3 text-sm">{servico.observacoes || 'N/D'}</td>
        <td className="py-2 px-3 text-center">
          <div className="flex justify-center space-x-2">
            <button 
              onClick={(e) => startEditService(protocoloId, servico, e)}
              className="text-blue-600 hover:text-blue-900 mx-1 p-1 rounded hover:bg-blue-50"
              title="Editar serviço"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={(e) => removeService(protocoloId, servicoId, e)}
              className="text-red-600 hover:text-red-900 mx-1 p-1 rounded hover:bg-red-50"
              title="Excluir serviço"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderAddServiceRow = (protocoloId) => {
    return (
      <tr key={`add-service-${protocoloId}`} className="bg-green-50">
        <td className="py-2 px-3">
          <input
            type="text"
            name="Servico_Codigo"
            value={servicoForm.Servico_Codigo}
            onChange={handleServicoInputChange}
            className="w-full p-1 border rounded text-sm"
            placeholder="Código"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            name="Dose"
            value={servicoForm.Dose}
            onChange={handleServicoInputChange}
            className="w-full p-1 border rounded text-sm"
            placeholder="Dose"
            step="0.01"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            name="Dose_M"
            value={servicoForm.Dose_M}
            onChange={handleServicoInputChange}
            className="w-full p-1 border rounded text-sm"
            placeholder="Dose M"
            step="0.01"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            name="Dose_Total"
            value={servicoForm.Dose_Total}
            onChange={handleServicoInputChange}
            className="w-full p-1 border rounded text-sm"
            placeholder="Dose Total"
            step="0.01"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="number"
            name="Dias_de_Aplic"
            value={servicoForm.Dias_de_Aplic}
            onChange={handleServicoInputChange}
            className="w-full p-1 border rounded text-sm"
            placeholder="Dias"
          />
        </td>
        <td className="py-2 px-3">
          <input
            type="text"
            name="Via_de_Adm"
            value={servicoForm.Via_de_Adm}
            onChange={handleServicoInputChange}
            className="w-full p-1 border rounded text-sm"
            placeholder="Via"
          />
        </td>
        <td className="py-2 px-3">
          <textarea
            name="observacoes"
            value={servicoForm.observacoes}
            onChange={handleServicoInputChange}
            className="w-full p-1 border rounded text-sm"
            placeholder="Observações"
            rows="1"
          ></textarea>
        </td>
        <td className="py-2 px-3 text-center">
          <div className="flex justify-center space-x-2">
            <button
              onClick={(e) => saveNewService(protocoloId, e)}
              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-100"
              title="Salvar"
              disabled={localLoading}
            >
              <Check size={16} />
            </button>
            <button
              onClick={(e) => cancelAddService(protocoloId, e)}
              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderExpandedContent = (protocolo) => {
    const protocoloId = protocolo.id;
    const rowData = expandedRows[protocoloId] || {};
    const { servicos = [], isAddingService = false } = rowData;
    const isLoading = servicosLoading[protocoloId];

    return (
      <tr className="expanded-content">
        <td colSpan="8" className="p-0 border-b border-gray-200">
          <div className="bg-gray-50 p-3 pb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                Serviços do Protocolo: {protocolo.Protocolo_Nome}
              </h4>
              
              {!isAddingService && (
                <button 
                  className="px-2 py-1 bg-green-600 text-white rounded-md flex items-center text-xs"
                  onClick={(e) => startAddService(protocoloId, e)}
                >
                  <Plus size={14} className="mr-1" /> Adicionar Serviço
                </button>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-4">
                <img src="/images/loadingcorreto-semfundo.gif" alt="Carregando..." className="w-8 h-8" />
              </div>
            ) : servicos.length > 0 || isAddingService ? (
              <div className="overflow-x-auto border rounded bg-white">
                <table className="min-w-full text-gray-600">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                    <th className="py-2 px-3 text-left">Serviço</th>
                    <th className="py-2 px-3 text-left">Dose</th>
                    <th className="py-2 px-3 text-left">Dose M</th>
                    <th className="py-2 px-3 text-left">Dose Total</th>
                    <th className="py-2 px-3 text-left">Dias Aplic.</th>
                    <th className="py-2 px-3 text-left">Via Adm.</th>
                    <th className="py-2 px-3 text-left">Observações</th>
                    <th className="py-2 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                  <tbody>
                    {servicos.map(servico => renderServicoRow(servico, protocoloId))}
                    {isAddingService && renderAddServiceRow(protocoloId)}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-3 bg-white border rounded text-gray-500 text-sm">
                Nenhum serviço cadastrado para este protocolo.
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Renderização principal
  return (
    <div className="patient-container">
      <div className="mb-6 flex justify-between items-center encimatabela">
        {/* Área de ordenação */}
        <div className="organize-container">
          <h2 className="organize-text">Ordenação</h2>
          <div className="custom-select">
            <select 
              className="select-style" 
              value={sortOrder} 
              onChange={handleSortChange}
            >
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </select>
          </div>
        </div>
        
        {/* Mostrar informação sobre ordenação atual */}
        {sortField !== 'Protocolo_Nome' && (
          <div className="px-3 py-1 rounded-md flex items-center ordenacao" style={{color: '#575654', background: '#E4E9C0'}}>
            <span className="text-sm">
              Ordenado por: <strong style={{color: '#f26b6b'}} >{sortField}</strong> ({sortOrder === 'asc' ? 'crescente' : 'decrescente'})
            </span>
            <button 
              className="ml-2 text-blue-600 hover:text-blue-800" 
              onClick={handleResetSort}
              title="Resetar ordenação"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          {/* Área de pesquisa */}
          <div className="flex flex-col">
            <div className="search-container">
              <div className="search-bar">
                <button
                  onClick={executeSearch}
                  className={`pesquisa-icone ${searchTerm ? 'search-icon-blinking' : ''}`}
                  title="Clique para pesquisar"
                >
                  <Search size={18} />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={`Pesquisar por ${getSearchTypeName(searchType)}...`}
                  className="border pesquisa"
                  defaultValue={searchTerm}
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                />
                {searchTerm && (
                  <button 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={handleClearSearch}
                    title="Limpar pesquisa"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {/* Botão para expandir/recolher opções de pesquisa */}
              <button 
                onClick={() => setIsSearchExpanded(!isSearchExpanded)} 
                className="text-xs text-gray-600 mt-1 ml-2 hover:text-green-700 flex items-center"
              >
                <span>{isSearchExpanded ? 'Ocultar opções' : 'Opções de busca'}</span>
                <ChevronDown size={14} className={`ml-1 transform transition-transform ${isSearchExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Seletor do tipo de pesquisa - mostrar apenas quando expandido */}
              {isSearchExpanded && (
                <div className="search-type-selector mt-2 flex items-center">
                  <div className="text-xs mr-2 text-gray-600">Buscar por:</div>
                  <div className="flex flex-wrap space-x-3">
                    <label className={`cursor-pointer flex items-center ${searchType === 'nome' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="nome"
                        checked={searchType === 'nome'}
                        onChange={() => handleSearchTypeChange('nome')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">Nome</span>
                    </label>
                    
                    <label className={`cursor-pointer flex items-center ${searchType === 'sigla' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="sigla"
                        checked={searchType === 'sigla'}
                        onChange={() => handleSearchTypeChange('sigla')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">Sigla</span>
                    </label>
                    
                    <label className={`cursor-pointer flex items-center ${searchType === 'cid' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="cid"
                        checked={searchType === 'cid'}
                        onChange={() => handleSearchTypeChange('cid')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">CID</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {/* Indicador de resultados da pesquisa */}
            {searchTerm && (
              <div className="text-xs text-gray-600 mt-1 ml-2 pesquisatinha">
                {filteredProtocolos.length === 0 ? (
                  <span className="text-red-500">Nenhum resultado encontrado. Tente refinar sua busca.</span>
                ) : (
                  <span>
                    {`${filteredProtocolos.length} resultados encontrados para "${searchTerm}"`}
                    <span className="search-type-badge search-type-${searchType}">
                      {getSearchTypeName(searchType)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Botões de ação (Adicionar, Editar, Excluir) */}
          <div className="button-container">
            {selectedRows.size > 0 ? (
              <>
                {isEditing ? (
                  <button 
                    className="btn btn-danger" 
                    onClick={handleCancel}
                    disabled={localLoading}
                  >
                    Cancelar
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDelete}
                    disabled={localLoading}
                  >
                    <Trash2 className="w-5 h-5" /> Excluir
                  </button>
                )}
                {isEditing ? (
                  <button 
                    className="btn btn-success" 
                    onClick={handleSave}
                    disabled={localLoading}
                  >
                    {localLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                ) : (
                  <button 
                    className="btn btn-warning" 
                    onClick={handleEdit}
                    disabled={localLoading}
                  >
                    <Edit className="w-5 h-5" /> Alterar
                  </button>
                )}
              </>
            ) : (
              isAdding ? (
                <>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleCancelAdd}
                    disabled={localLoading}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleSaveNew}
                    disabled={localLoading}
                  >
                    {localLoading ? (
                      <>
                        <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                        Salvando...
                      </>
                    ) : 'Salvar'}
                  </button>
                </>
              ) : (
                <button 
                  className="button buttontxt btn-primary" 
                  onClick={handleAdd}
                  disabled={localLoading}
                >
                  <Plus /> Adicionar
                </button>
              )
            )}
          </div>
        </div>
      </div>
      
      {/* Formulário de edição/adição */}
      {(isAdding || isEditing) && (
        <form onSubmit={handleSubmit} className="patient-form bg-white p-4 rounded-lg mb-4">
          {/* Mensagem de erro de atualização, se houver */}
          {updateError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              <p className="font-semibold">Erro ao processar dados:</p>
              <p>{updateError}</p>
            </div>
          )}
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="protocoloNome" className="form-label">Nome do Protocolo</label>
              <input 
                type="text"
                id="protocoloNome"
                name="Protocolo_Nome"
                value={formData.Protocolo_Nome}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="protocoloSigla" className="form-label">Sigla</label>
              <input 
                type="text"
                id="protocoloSigla"
                name="Protocolo_Sigla"
                value={formData.Protocolo_Sigla}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="cid" className="form-label">CID Associado</label>
              <input 
                type="text"
                id="cid"
                name="CID"
                value={formData.CID}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Pode ser mais de um, separados por vírgula"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="linha" className="form-label">Linha</label>
              <input 
                type="number"
                id="linha"
                name="Linha"
                value={formData.Linha}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="protocoloDoseM" className="form-label">Dose M</label>
              <input 
                type="number"
                id="protocoloDoseM"
                name="Protocolo_Dose_M"
                value={formData.Protocolo_Dose_M}
                onChange={handleInputChange}
                className="form-input"
                step="0.01"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="protocoloDoseTotal" className="form-label">Dose Total</label>
              <input 
                type="number"
                id="protocoloDoseTotal"
                name="Protocolo_Dose_Total"
                value={formData.Protocolo_Dose_Total}
                onChange={handleInputChange}
                className="form-input"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="protocoloDiasAplicacao" className="form-label">Dias de Aplicação</label>
              <input 
                type="number"
                id="protocoloDiasAplicacao"
                name="Protocolo_Dias_de_Aplicacao"
                value={formData.Protocolo_Dias_de_Aplicacao}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="protocoloViaAdm" className="form-label">Via de Administração</label>
              <select
                id="protocoloViaAdm"
                name="Protocolo_ViaAdm"
                value={formData.Protocolo_ViaAdm || ''}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Selecione uma via</option>
                {viasAdministracao.map(via => (
                  <option key={via.id} value={via.id}>
                    {via.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      )}
      
      {/* Lista de protocolos */}
      {!isAdding && !isEditing && (
        <div className="table-container h-[calc(100vh-250px)] overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <img src="/images/loadingcorreto-semfundo.gif" alt="Carregando..." className="w-12 h-12" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-500">Erro: {error}</p>
              <button
                onClick={() => loadProtocolos(true)}
                className="button buttontxt flex items-center gap-2"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredProtocolos.length > 0 ? (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'id' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'id' ? '#f26b6b' : 'inherit' }}>
                        ID
                      </span>
                      {sortField === 'id' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Protocolo_Nome')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_Nome' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_Nome' ? '#f26b6b' : 'inherit' }}>
                        Nome
                      </span>
                      {sortField === 'Protocolo_Nome' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Protocolo_Sigla')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_Sigla' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_Sigla' ? '#f26b6b' : 'inherit' }}>
                        Sigla
                      </span>
                      {sortField === 'Protocolo_Sigla' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                
                  <th onClick={() => handleSort('Protocolo_Dose_M')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_Dose_M' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_Dose_M' ? '#f26b6b' : 'inherit' }}>
                        Dose M
                      </span>
                      {sortField === 'Protocolo_Dose_M' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Protocolo_Dose_Total')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_Dose_Total' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_Dose_Total' ? '#f26b6b' : 'inherit' }}>
                        Dose Total
                      </span>
                      {sortField === 'Protocolo_Dose_Total' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Protocolo_Dias_de_Aplicacao')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_Dias_de_Aplicacao' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_Dias_de_Aplicacao' ? '#f26b6b' : 'inherit' }}>
                        Dias Aplicação
                      </span>
                      {sortField === 'Protocolo_Dias_de_Aplicacao' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Protocolo_ViaAdm')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_ViaAdm' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_ViaAdm' ? '#f26b6b' : 'inherit' }}>
                        Via Adm.
                      </span>
                      {sortField === 'Protocolo_ViaAdm' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('CID')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'CID' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'CID' ? '#f26b6b' : 'inherit' }}>
                        CID
                      </span>
                      {sortField === 'CID' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                </tr> 
              </thead>
              <tbody>
                {(orderedProtocolos.length > 0 ? orderedProtocolos : filteredProtocolos).map((protocolo, index) => {
                  const protocoloId = protocolo.id;
                  const isExpanded = Boolean(expandedRows[protocoloId]);
                  
                  return (
                    <React.Fragment key={protocoloId || `protocolo-${index}`}>
                      <tr 
                        onClick={() => handleRowClick(protocoloId)}
                        className={`cursor-pointer ${selectedProtocolo?.id === protocoloId ? 'selected' : ''}`}
                      >
                        <td className="relative">
                          <div className="flex items-center">
                            <button 
                              className="mr-2 text-gray-500 hover:text-gray-800 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(protocoloId);
                              }}
                            >
                              {isExpanded ? 
                                <ChevronDown size={18} className="text-green-600" /> : 
                                <ChevronRight size={18} />
                              }
                            </button>
                            {protocolo.id}
                          </div>
                        </td>
                        <td>{protocolo.Protocolo_Nome}</td>
                        <td>{protocolo.Protocolo_Sigla}</td>
                        <td>{protocolo.Protocolo_Dose_M || 'N/D'}</td>
                        <td>{protocolo.Protocolo_Dose_Total || 'N/D'}</td>
                        <td>{protocolo.Protocolo_Dias_de_Aplicacao || 'N/D'}</td>
                        <td>
                          {protocolo.Via_administracao ? 
                            protocolo.Via_administracao : 
                            (protocolo.Protocolo_ViaAdm ? protocolo.Protocolo_ViaAdm : 'N/D')}
                        </td>
                        <td>{protocolo.CID || 'N/D'}</td>
                      </tr>
                      
                      {isExpanded && renderExpandedContent(protocolo)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-gray-500">
                {searchTerm ? "Nenhum resultado encontrado para esta pesquisa" : "Não há protocolos cadastrados"}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Indicador de atualização de cache */}
      {cacheRefreshed && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in">
          <Database size={16} className="mr-2" />
          <span>Dados atualizados com sucesso</span>
        </div>
      )}
    </div>
  );
};

export default CadastroProtocolo;