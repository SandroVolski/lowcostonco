import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePatient } from '../../../context/PatientContext';
import { 
  Plus, Edit, Trash2, Search, X, Save, 
  ArrowUpWideNarrow, ArrowDownWideNarrow, Database, 
  ChevronDown, Calendar, Grid, List, Filter, User,
  Activity, Bookmark, Clock, Users, Info, SlidersHorizontal
} from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import DataRefreshButton from '../../../components/DataRefreshButton';
import PrestadorSearch from '../../../components/pacientes/PrestadorSearch';
import PatientProtocoloCacheControl from '../../../components/PatientProtocoloCacheControl';
import CIDSelection from '../../../components/pacientes/CIDSelection';
import './PacientesEstilos.css';
import Pagination from '../../../components/Pagination';

const CadastroPaciente = () => {
  const { 
    // Propriedades existentes
    filteredPatients, 
    loading, 
    error, 
    addPatient, 
    updatePatient, 
    deletePatient, 
    selectPatient,
    selectedPatient,
    searchPatients,
    searchTerm,
    operadoras,
    prestadores,
    loadPatients,
    
    // Novas propriedades relacionadas ao cache
    isCacheEnabled,
    dataSource: contextDataSource,
    totalRecords,
    toggleCache,
    clearCache,
    forceRevalidation,
    reloadAllData,
    refreshDataAfterModification: contextRefreshData,
    
    // NOVO: Propriedades de paginação
    currentPage,
    pageSize,
    totalPages,
    changePage,
    changePageSize
  } = usePatient();
  
  // Estados para controle da UI
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Nome");
  const [searchType, setSearchType] = useState("nome");
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Novos estados para cache
  const [showCacheControl, setShowCacheControl] = useState(false);
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [dataSource, setDataSource] = useState('');
  
  // Referência para o input de pesquisa
  const searchInputRef = useRef(null);
  
  // Estado para formulários
  const [formData, setFormData] = useState({
    Operadora: '',
    Prestador: '',
    Paciente_Codigo: '',
    Nome: '',
    Sexo: '',
    Nascimento: '',
    Data_Inicio_Tratamento: '',
    CID: ''
  });
  
  // Estados para datas em formato texto (para permitir colar)
  const [nascimentoText, setNascimentoText] = useState('');
  const [dataInicioText, setDataInicioText] = useState('');
  
  // Estados para ordenação personalizada
  const [orderedPatients, setOrderedPatients] = useState([]);
  
  // Sincronizar o dataSource do contexto
  useEffect(() => {
    if (contextDataSource) {
      setDataSource(contextDataSource);
    }
  }, [contextDataSource]);
  
  // Carregar dados de referência se estiverem vazios
  useEffect(() => {
    if (!prestadores || prestadores.length === 0) {
      console.log("Carregando dados de referência porque prestadores está vazio");
      loadPatients(true);
    }
  }, [prestadores, loadPatients]);
  
  // Efeito para converter entre as datas de texto e o formato do formulário
  useEffect(() => {
    // Ao mudar o texto da data, atualizar o formData
    if (nascimentoText) {
      try {
        const formattedDate = formatDateStringToYYYYMMDD(nascimentoText);
        if (formattedDate) {
          setFormData(prev => ({...prev, Nascimento: formattedDate}));
        }
      } catch (e) {
        // Não fazer nada se a data for inválida
      }
    }
    
    if (dataInicioText) {
      try {
        const formattedDate = formatDateStringToYYYYMMDD(dataInicioText);
        if (formattedDate) {
          setFormData(prev => ({...prev, Data_Inicio_Tratamento: formattedDate}));
        }
      } catch (e) {
        // Não fazer nada se a data for inválida
      }
    }
  }, [nascimentoText, dataInicioText]);
  
  // Efeito para ordenar pacientes quando o sortField ou sortOrder mudar
  useEffect(() => {
    if (!filteredPatients || filteredPatients.length === 0) return;
    
    const sorted = [...filteredPatients].sort((a, b) => {
      // Extrair os valores a serem comparados
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Tratamento especial para campo Prestador (pode estar em Prestador_Nome_Fantasia)
      if (sortField === 'Prestador') {
        aValue = a.Prestador || a.Prestador_Nome_Fantasia || '';
        bValue = b.Prestador || b.Prestador_Nome_Fantasia || '';
      }
      
      // Valores vazios ou nulos sempre vão para o final
      if (aValue === null || aValue === undefined || aValue === '') return sortOrder === 'asc' ? 1 : -1;
      if (bValue === null || bValue === undefined || bValue === '') return sortOrder === 'asc' ? -1 : 1;
      
      // Verificar se estamos ordenando campos numéricos
      const numericFields = ['id', 'Idade'];
      
      if (numericFields.includes(sortField) && !isNaN(aValue) && !isNaN(bValue)) {
        // Comparação numérica
        const numA = Number(aValue);
        const numB = Number(bValue);
        const comparison = numA - numB;
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        // Comparação de strings para ordem alfabética
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });
    
    setOrderedPatients(sorted);
  }, [filteredPatients, sortField, sortOrder]);
  
  // Reset do formulário
  const resetForm = () => {
    setFormData({
      Operadora: '',
      Prestador: '',
      Paciente_Codigo: '',
      Nome: '',
      Sexo: '',
      Nascimento: '',
      Data_Inicio_Tratamento: '',
      CID: ''
    });
    setNascimentoText('');
    setDataInicioText('');
  };
  
  // Função para converter qualquer formato de data em YYYY-MM-DD
  const formatDateStringToYYYYMMDD = (dateStr) => {
    if (!dateStr) return '';
    
    // Se já estiver no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Tentar diferentes formatos
    const formats = [
      // DD/MM/YYYY
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        format: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
      },
      // DD-MM-YYYY
      {
        regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        format: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
      },
      // DD.MM.YYYY
      {
        regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
        format: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
      }
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format.regex);
      if (match) {
        return format.format(match);
      }
    }
    
    // Tentar usar Date.parse como último recurso
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignorar erros da conversão
    }
    
    return '';
  };
  
  // Função para converter YYYY-MM-DD para DD/MM/YYYY (para exibição)
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    
    // Se já estiver no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Se já estiver no formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    return dateStr;
  };
  
  // Função para lidar com a colagem de texto nos campos de data
  const handleDatePaste = (e, setter) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Tentar formatar a data colada
    const formattedDate = formatDateStringToYYYYMMDD(pastedText);
    if (formattedDate) {
      // Atualizar o estado de texto
      setter(formatDateForDisplay(formattedDate));
    } else {
      // Se não for possível formatar, manter o texto original
      setter(pastedText);
    }
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
      
      // Usar a função do contexto para atualizar os dados
      await contextRefreshData();
      
      // Mostrar indicador de atualização
      showCacheRefreshIndicator();
      
    } catch (error) {
      console.error("Erro ao atualizar dados após modificação:", error);
      showErrorAlert("Falha ao atualizar os dados", "Tente atualizar manualmente.");
    } finally {
      setLocalLoading(false);
    }
  };
  
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      
      if (value.length >= 2) {
        setLocalLoading(true);
        searchPatients(value, type, 1, pageSize)
          .finally(() => {
            setLocalLoading(false);
          });
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

  const getSearchTypeName = (type) => {
    switch(type) {
      case 'nome': return 'Nome';
      case 'codigo': return 'Código';
      case 'cid': return 'CID';
      case 'operadora': return 'Operadora';
      case 'prestador': return 'Prestador';
      default: return 'Nome';
    }
  };
  
  // Handler para mudança no campo de prestador
  const handlePrestadorSelect = (selectedPrestadorName) => {
    setFormData(prev => ({
      ...prev,
      Prestador: selectedPrestadorName
    }));
  };

  // Handler para mudança nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Formatar datas para o formato que a API espera (DD/MM/YYYY)
  const formatDatesForApi = (data) => {
    const formatted = { ...data };
    
    // Converter Nascimento se estiver no formato YYYY-MM-DD
    if (formatted.Nascimento && /^\d{4}-\d{2}-\d{2}$/.test(formatted.Nascimento)) {
      const [year, month, day] = formatted.Nascimento.split('-');
      formatted.Nascimento = `${day}/${month}/${year}`;
    }
    
    // Converter Data_Inicio_Tratamento se estiver no formato YYYY-MM-DD
    if (formatted.Data_Inicio_Tratamento && /^\d{4}-\d{2}-\d{2}$/.test(formatted.Data_Inicio_Tratamento)) {
      const [year, month, day] = formatted.Data_Inicio_Tratamento.split('-');
      formatted.Data_Inicio_Tratamento = `${day}/${month}/${year}`;
    }
    
    return formatted;
  };
  
  // Submissão de formulário - Versão com cache
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Formatar datas para o formato que a API espera
    const formattedData = formatDatesForApi(formData);
    
    if (isEditing && selectedPatient) {
      try {
        setLocalLoading(true);
        await updatePatient(selectedPatient.id, formattedData);
        setIsEditing(false);
        showSuccessAlert("Paciente atualizado com sucesso!");
        
        // Usar a função de atualização que lida com o cache
        await refreshDataAfterModification();
      } catch (error) {
        showErrorAlert("Erro ao atualizar paciente", error.message);
      } finally {
        setLocalLoading(false);
      }
    } else if (isAdding) {
      try {
        setLocalLoading(true);
        
        // Se o cache estiver habilitado, marcar para revalidação
        if (isCacheEnabled) {
          forceRevalidation();
        }
        
        const newId = await addPatient(formattedData);
        setIsAdding(false);
        showSuccessAlert("Paciente adicionado com sucesso!");
        
        // Usar a função de atualização que lida com o cache
        await refreshDataAfterModification();
      } catch (error) {
        showErrorAlert("Erro ao adicionar paciente", error.message);
      } finally {
        setLocalLoading(false);
      }
    }
    
    resetForm();
  };
  
  // Funções para alternância da ordenação
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
  
  // Handler para adicionar
  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRows(new Set());
    selectPatient(null);
    
    // Se o cache estiver habilitado, marcar para revalidação
    if (isCacheEnabled) {
      forceRevalidation();
    }
  };
  
  // Handler para editar
  const handleEdit = () => {
    if (!selectedPatient) {
      showErrorAlert("Selecione um paciente", "Você precisa selecionar um paciente para editar.");
      return;
    }
    
    // Buscar o paciente mais atualizado da lista filteredPatients
    const currentPatient = filteredPatients.find(p => p.id === selectedPatient.id) || selectedPatient;
    
    // Extrair as datas para os campos de texto
    const nascimento = currentPatient.Nascimento || currentPatient.Data_Nascimento || '';
    const dataInicio = currentPatient.Data_Inicio_Tratamento || '';
    
    // Atualizar os estados de texto das datas
    setNascimentoText(nascimento);
    setDataInicioText(dataInicio);
    
    // Usar o paciente atualizado para preencher o formulário
    setFormData({
      Operadora: currentPatient.Operadora || '',
      Prestador: currentPatient.Prestador_Nome_Fantasia || currentPatient.Prestador || '',
      Paciente_Codigo: currentPatient.Paciente_Codigo || currentPatient.Codigo || '',
      Nome: currentPatient.Nome || currentPatient.Paciente_Nome || '',
      Sexo: currentPatient.Sexo || '',
      Nascimento: formatDateStringToYYYYMMDD(nascimento),
      Data_Inicio_Tratamento: formatDateStringToYYYYMMDD(dataInicio),
      CID: currentPatient.CID || currentPatient.Cid_Diagnostico || ''
    });
    
    setIsEditing(true);
    setIsAdding(false);
    setIsDetailsOpen(false);
  };
  
  // Handler para deletar - Versão com cache
  const handleDelete = async () => {
    if (!selectedPatient) {
      showErrorAlert("Selecione um paciente", "Você precisa selecionar um paciente para excluir.");
      return;
    }
    
    const confirmed = await showConfirmAlert(
      "Confirmar exclusão", 
      `Tem certeza que deseja excluir o paciente ${selectedPatient.Nome}?`
    );
    
    if (confirmed) {
      try {
        setLocalLoading(true);
        
        // Se o cache estiver habilitado, marcar para revalidação
        if (isCacheEnabled) {
          forceRevalidation();
        }
        
        await deletePatient(selectedPatient.id);
        showSuccessAlert("Paciente excluído com sucesso!");
        setSelectedRows(new Set());
        selectPatient(null);
        
        // Usar a função de atualização que lida com o cache
        await refreshDataAfterModification();
      } catch (error) {
        showErrorAlert("Erro ao excluir paciente", error.message);
      } finally {
        setLocalLoading(false);
      }
    }
  };
  
  // Handler para cancelar
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
  
  // Handler para seleção de paciente
  const handleSelectPatient = (patientId) => {
    // Se clicar no mesmo paciente, desselecioná-lo
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedRows(new Set());
      selectPatient(null);
      setIsDetailsOpen(false);
    } else {
      setSelectedRows(new Set([patientId]));
      selectPatient(patientId);
    }
  };
  
  // Handler para mostrar detalhes do paciente
  const showPatientDetails = (patientId) => {
    selectPatient(patientId);
    setIsDetailsOpen(true);
  };
  
  // Handler para pesquisa
  const executeSearch = () => {
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      
      if (value.length >= 2 || value.length === 0) {
        // Atualizar estado local
        setLocalLoading(true);
        
        // Executar a pesquisa com o tipo atual e na primeira página
        searchPatients(value, searchType, 1, pageSize)
          .finally(() => {
            setLocalLoading(false);
          });
      } else {
        showWarningAlert("Pesquisa muito curta", "Digite pelo menos 2 caracteres para pesquisar.");
      }
    }
  };
  
  // Manipulador de evento de input
  const handleInput = useCallback(
    debounce((value) => {
      if (value.length >= 2 || value.length === 0) {
        searchPatients(value, searchType, 1, pageSize);
      }
    }, 500),
    [searchType, pageSize, searchPatients]
  );
  
  // Manipulador para evento de Enter no input
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };
  
  // Handler para limpar pesquisa
  const handleClearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    setSearchType("nome"); // Redefinir para o tipo padrão
    searchPatients('', 'nome', 1, pageSize);
  };

  const handlePageChange = (page) => {
    setLocalLoading(true);
    
    if (searchTerm) {
      // Se houver um termo de busca ativo, usar a função de busca com a nova página
      searchPatients(searchTerm, searchType, page, pageSize)
        .finally(() => setLocalLoading(false));
    } else {
      // Caso contrário, carregar a nova página normalmente
      loadPatients(false, page, pageSize)
        .finally(() => setLocalLoading(false));
    }
  };

  const handlePageSizeChange = (newSize) => {
    setLocalLoading(true);
    changePageSize(newSize)
      .finally(() => setLocalLoading(false));
  };
  
  // Handler para recarregar prestadores manualmente
  const handleRefreshPrestadores = async () => {
    try {
      setLocalLoading(true);
      await loadPatients(true);
      showSuccessAlert("Lista de prestadores atualizada");
    } catch (error) {
      showErrorAlert("Erro ao atualizar prestadores", error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEditFixed = (patientToEdit) => {
    if (!patientToEdit) {
      showErrorAlert("Selecione um paciente", "Você precisa selecionar um paciente para editar.");
      return;
    }
    
    // Selecionar o paciente no contexto global
    selectPatient(patientToEdit.id);
    
    // Extrair as datas para os campos de texto
    const nascimento = patientToEdit.Nascimento || patientToEdit.Data_Nascimento || '';
    const dataInicio = patientToEdit.Data_Inicio_Tratamento || '';
    
    // Atualizar os estados de texto das datas
    setNascimentoText(nascimento);
    setDataInicioText(dataInicio);
    
    // Usar o paciente passado para preencher o formulário
    setFormData({
      Operadora: patientToEdit.Operadora || '',
      Prestador: patientToEdit.Prestador_Nome_Fantasia || patientToEdit.Prestador || '',
      Paciente_Codigo: patientToEdit.Paciente_Codigo || patientToEdit.Codigo || '',
      Nome: patientToEdit.Nome || patientToEdit.Paciente_Nome || '',
      Sexo: patientToEdit.Sexo || '',
      Nascimento: formatDateStringToYYYYMMDD(nascimento),
      Data_Inicio_Tratamento: formatDateStringToYYYYMMDD(dataInicio),
      CID: patientToEdit.CID || patientToEdit.Cid_Diagnostico || ''
    });
    
    setIsEditing(true);
    setIsAdding(false);
    setIsDetailsOpen(false);
  };

  // Componente de Card para cada paciente
  const PatientCard = ({ patient }) => {
    const isSelected = selectedPatient && selectedPatient.id === patient.id;
    
    const getGenderIcon = (gender) => {
      if (gender === 'M') return <div className="gender-icon male"><User size={14} /></div>;
      if (gender === 'F') return <div className="gender-icon female"><User size={14} /></div>;
      return null;
    };
    
    return (
      <div 
        className={`patient-card ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSelectPatient(patient.id)}
      >
        <div className="card-header">
          <div className="patient-code">{patient.Paciente_Codigo}</div>
          {getGenderIcon(patient.Sexo)}
        </div>
        
        <div className="patient-name">{patient.Nome}</div>
        
        <div className="patient-info">
          <div className="info-row">
            <Calendar size={14} />
            <span>{patient.Nascimento} {patient.Idade ? `(${patient.Idade} anos)` : ''}</span>
          </div>
          <div className="info-row">
            <Activity size={14} />
            <span>CID: {patient.CID}</span>
          </div>
          <div className="info-row">
            <Bookmark size={14} />
            <span>{patient.Operadora}</span>
          </div>
          <div className="info-row">
            <Clock size={14} />
            <span>Início: {patient.Data_Inicio_Tratamento || 'N/D'}</span>
          </div>
        </div>
        
        <div className="card-actions">
          <button 
            className="action-button-pacientes info"
            onClick={(e) => { e.stopPropagation(); showPatientDetails(patient.id); }}
            title="Ver detalhes"
          >
            <Info size={16} />
          </button>
          <button 
            className="action-button-pacientes edit"
            onClick={(e) => { 
              e.stopPropagation(); 
              handleEditFixed(patient); // Passar o paciente explicitamente
            }}
            title="Editar paciente"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>
    );
  };

  const handleSelectPatientFixed = (patient) => {
    const patientId = patient.id;
    
    // Se clicar no mesmo paciente, desselecioná-lo
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedRows(new Set());
      selectPatient(null);
      setIsDetailsOpen(false);
    } else {
      setSelectedRows(new Set([patientId]));
      selectPatient(patientId);
    }
  };
  
  // Componente de linha para visão de lista (atualizado com todos os campos)
  const PatientListItem = ({ patient }) => {
    const isSelected = selectedPatient && selectedPatient.id === patient.id;
    
    return (
      <div 
        className={`patient-list-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSelectPatient(patient.id)}
      >
        <div className="list-item-code">{patient.Paciente_Codigo}</div>
        <div className="list-item-name">{patient.Nome}</div>
        <div className="list-item-prestador">{patient.Prestador_Nome_Fantasia || patient.Prestador || 'N/D'}</div>
        <div className="list-item-gender">{patient.Sexo}</div>
        <div className="list-item-birthday">{patient.Nascimento}</div>
        <div className="list-item-age">{patient.Idade || 'N/D'}</div>
        <div className="list-item-provider">{patient.Operadora}</div>
        <div className="list-item-first-request">{patient.Data_Inicio_Tratamento || 'N/D'}</div>
        <div className="list-item-cid">{patient.CID}</div>
        
        <div className="list-item-actions">
          <button 
            className="action-button-pacientes info"
            onClick={(e) => { e.stopPropagation(); showPatientDetails(patient.id); }}
            title="Ver detalhes"
          >
            <Info size={16} />
          </button>
          <button 
            className="action-button-pacientes edit"
            onClick={(e) => { 
              e.stopPropagation(); 
              handleEditFixed(patient); // Passar o paciente explicitamente
            }}
            title="Editar paciente"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>
    );
  };
  
  // Modal de detalhes do paciente
  const PatientDetails = () => {
    if (!selectedPatient || !isDetailsOpen) return null;
    
    const currentPatient = filteredPatients.find(p => p.id === selectedPatient.id) || selectedPatient;
    
    return (
      <div className="modal-overlay" onClick={() => setIsDetailsOpen(false)}>
        <div className="patient-details-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Detalhes do Paciente</h2>
            <button className="close-button" onClick={() => setIsDetailsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="details-content">
            <div className="patient-avatar">
              <div className="avatar-placeholder">
                <User size={48} />
              </div>
              <h3>{currentPatient.Nome}</h3>
              <div className="patient-id">{currentPatient.Paciente_Codigo}</div>
            </div>
            
            <div className="details-grid">
              <div className="detail-group">
                <div className="detail-label">Operadora</div>
                <div className="detail-value">{currentPatient.Operadora}</div>
              </div>
              
              <div className="detail-group">
                <div className="detail-label">Prestador</div>
                <div className="detail-value">{currentPatient.Prestador_Nome_Fantasia || currentPatient.Prestador || 'N/D'}</div>
              </div>
              
              <div className="detail-group">
                <div className="detail-label">Sexo</div>
                <div className="detail-value">{currentPatient.Sexo === 'M' ? 'Masculino' : 'Feminino'}</div>
              </div>
              
              <div className="detail-group">
                <div className="detail-label">Data de Nascimento</div>
                <div className="detail-value">{currentPatient.Nascimento}</div>
              </div>
              
              <div className="detail-group">
                <div className="detail-label">Idade</div>
                <div className="detail-value">{currentPatient.Idade ? `${currentPatient.Idade} anos` : 'N/D'}</div>
              </div>
              
              <div className="detail-group">
                <div className="detail-label">CID</div>
                <div className="detail-value">{currentPatient.CID}</div>
              </div>
              
              <div className="detail-group">
                <div className="detail-label">Data da Primeira Solicitação</div>
                <div className="detail-value">{currentPatient.Data_Inicio_Tratamento || 'N/D'}</div>
              </div>
              
              <div className="detail-group">
                <div className="detail-label">ID Interno</div>
                <div className="detail-value">{currentPatient.id}</div>
              </div>
            </div>
            
            <div className="details-actions">
              <button 
                className="edit-button"
                onClick={() => { 
                  setIsDetailsOpen(false); 
                  handleEditFixed(currentPatient); // Passar o paciente explicitamente
                }}
              >
                <Edit size={16} /> Editar
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

  const InfoBarSelected = () => {
    return (
      <div className="selected-info">
        <span>Selecionado:</span>
        <strong>{selectedPatient.Nome}</strong>
        <div className="selected-actions">
          <button 
            className="action-button-pacientes"
            onClick={() => {
              if (selectedPatient) {
                handleEditFixed(selectedPatient); // Passar o paciente explicitamente
              }
            }}
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
    );
  };
  
  // Renderização do formulário de adição/edição
  const renderPatientForm = () => {
    if (!isAdding && !isEditing) return null;
    
    return (
      <div className="modal-overlay" onClick={handleCancel}>
        <div className="patient-form-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{isEditing ? 'Editar Paciente' : 'Adicionar Paciente'}</h2>
            <button className="close-button" onClick={handleCancel}>
              <X size={20} />
            </button>
          </div>
          
          <div className="form-container">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="operadora">Operadora</label>
                <select
                  id="operadora"
                  name="Operadora"
                  value={formData.Operadora}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione uma operadora</option>
                  {operadoras.map(op => (
                    <option key={op.id} value={op.nome}>{op.nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group prestador-container">
                <label htmlFor="prestador">Prestador</label>
                <div className="prestador-wrapper">
                  <PrestadorSearch 
                    prestadores={prestadores}
                    selectedPrestador={formData.Prestador}
                    onSelect={handlePrestadorSelect}
                    required={true}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="codigo">Código do Paciente</label>
                <input
                  type="text"
                  id="codigo"
                  name="Paciente_Codigo"
                  value={formData.Paciente_Codigo}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="nome">Nome do Paciente</label>
                <input
                  type="text"
                  id="nome"
                  name="Nome"
                  value={formData.Nome}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="sexo">Sexo</label>
                <select
                  id="sexo"
                  name="Sexo"
                  value={formData.Sexo}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="dataNascimento">Data de Nascimento</label>
                <div className="date-input-container">
                  <input 
                    type="text"
                    id="dataNascimentoText"
                    value={nascimentoText}
                    onChange={(e) => setNascimentoText(e.target.value)}
                    onPaste={(e) => handleDatePaste(e, setNascimentoText)}
                    placeholder="DD/MM/AAAA"
                    className="date-input"
                  />
                  <input 
                    type="date"
                    id="dataNascimento"
                    name="Nascimento"
                    value={formData.Nascimento}
                    onChange={(e) => {
                      // Atualiza o formData
                      handleInputChange(e);
                      // Atualiza também o campo de texto visível com o formato DD/MM/YYYY
                      const dateValue = e.target.value; // Formato YYYY-MM-DD
                      if (dateValue) {
                        const [year, month, day] = dateValue.split('-');
                        setNascimentoText(`${day}/${month}/${year}`);
                      } else {
                        setNascimentoText('');
                      }
                    }}
                    className="date-input-hidden"
                  />
                  <button 
                    type="button"
                    className="date-picker-button"
                    onClick={() => document.getElementById('dataNascimento').showPicker()}
                  >
                    <Calendar size={18} />
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="dataInicioTratamento">Data da Primeira Solicitação</label>
                <div className="date-input-container">
                  <input 
                    type="text"
                    id="dataInicioTratamentoText"
                    value={dataInicioText}
                    onChange={(e) => setDataInicioText(e.target.value)}
                    onPaste={(e) => handleDatePaste(e, setDataInicioText)}
                    placeholder="DD/MM/AAAA"
                    className="date-input"
                  />
                  <input 
                    type="date"
                    id="dataInicioTratamento"
                    name="Data_Inicio_Tratamento"
                    value={formData.Data_Inicio_Tratamento}
                    onChange={(e) => {
                      // Atualiza o formData
                      handleInputChange(e);
                      // Atualiza também o campo de texto visível
                      const dateValue = e.target.value;
                      if (dateValue) {
                        const [year, month, day] = dateValue.split('-');
                        setDataInicioText(`${day}/${month}/${year}`);
                      } else {
                        setDataInicioText('');
                      }
                    }}
                    className="date-input-hidden"
                  />
                  <button 
                    type="button"
                    className="date-picker-button"
                    onClick={() => document.getElementById('dataInicioTratamento').showPicker()}
                  >
                    <Calendar size={18} />
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="cid">CID</label>
                <CIDSelection
                  value={formData.CID}
                  onChange={(selectedCIDs) => {
                    // Handle single or multiple CIDs
                    if (Array.isArray(selectedCIDs) && selectedCIDs.length > 0) {
                      // If it's an array of objects with codigo property
                      const cidValues = selectedCIDs.map(cid => 
                        typeof cid === 'string' ? cid : cid.codigo
                      ).join(',');
                      
                      setFormData(prev => ({
                        ...prev,
                        CID: cidValues
                      }));
                    } else if (selectedCIDs === null || selectedCIDs.length === 0) {
                      // Clear the CID value
                      setFormData(prev => ({
                        ...prev,
                        CID: ''
                      }));
                    }
                  }}
                  placeholder="Selecione o CID..."
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={handleCancel}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="save-button" 
                onClick={handleSubmit}
                disabled={localLoading}
              >
                {localLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    {isEditing ? 'Atualizando...' : 'Salvando...'}
                  </>
                ) : (
                  isEditing ? 'Atualizar' : 'Salvar'
                )}
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
              onInput={handleInput}
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
              <label className={searchType === 'codigo' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'codigo'} 
                  onChange={() => handleSearchTypeChange('codigo')} 
                />
                <span>Código</span>
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
              <option value="Nome">Nome</option>
              <option value="Idade">Idade</option>
              <option value="Nascimento">Data de Nascimento</option>
              <option value="Data_Inicio_Tratamento">Data Início</option>
              <option value="Operadora">Operadora</option>
              <option value="CID">CID</option>
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
          <DataRefreshButton contextType="patient" />
          
          <button className="add-patient-button" onClick={handleAdd}>
            <Plus size={16} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>
      
      {/* Barra de informações */}
      <div className="info-bar">
        <div className="patient-count">
          <Users size={16} />
          <span>
            {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
            {searchTerm && ` encontrado${filteredPatients.length === 1 ? '' : 's'} para "${searchTerm}"`}
          </span>
        </div>
        
        {selectedPatient && (
          <div className="selected-info">
            <span>Selecionado:</span>
            <strong>{selectedPatient.Nome}</strong>
            <div className="selected-actions">
              <button 
                className="action-button-pacientes"
                onClick={() => {
                  if (selectedPatient) {
                    handleEditFixed(selectedPatient);
                  }
                }}
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
      
      {/* Lista de pacientes - visão de grid ou lista */}
      <div className="patients-container">
        {loading || localLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando pacientes...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">Erro: {error}</p>
            <button className="reload-button" onClick={() => loadPatients(true)}>
              Tentar novamente
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>Nenhum paciente encontrado</p>
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
                {(orderedPatients.length > 0 ? orderedPatients : filteredPatients).map(patient => (
                  <PatientCard key={patient.id} patient={patient} />
                ))}
              </div>
            ) : (
              <div className="patients-list">
                <div className="list-header">
                  <div className="list-header-code">Código</div>
                  <div className="list-header-name">Nome</div>
                  <div className="list-header-prestador">Prestador</div>
                  <div className="list-header-gender">Sexo</div>
                  <div className="list-header-birthday">Data Nasc.</div>
                  <div className="list-header-age">Idade</div>
                  <div className="list-header-provider">Operadora</div>
                  <div className="list-header-first-request">1ª Solic.</div>
                  <div className="list-header-cid">CID</div>
                  <div className="list-header-actions">Ações</div>
                </div>
                
                <div className="list-body">
                  {(orderedPatients.length > 0 ? orderedPatients : filteredPatients).map(patient => (
                    <PatientListItem key={patient.id} patient={patient} />
                  ))}
                </div>
              </div>
            )}
            
            {/* NOVO: Componente de paginação */}
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              disabled={loading || localLoading}
            />
          </>
        )}
      </div>
      
      {/* Formulário modal */}
      {renderPatientForm()}
      
      {/* Modal de detalhes */}
      <PatientDetails />
      
      {/* Modal de controle de cache */}
      {showCacheControl && (
        <PatientProtocoloCacheControl 
          onClose={() => setShowCacheControl(false)}
          type="patient"
        />
      )}
      
      {/* Indicador de atualização de cache */}
      {cacheRefreshed && (
        <div className="cache-updated-indicator">
          <Database size={16} />
          <span>Dados atualizados com sucesso</span>
        </div>
      )}
    </div>
  );
};

export default CadastroPaciente;