import React, { useState, useEffect, useRef } from 'react';
import { usePatient } from '../../../context/PatientContext';
import { Plus, Edit, Trash2, Search, X, Save, ArrowUpWideNarrow, ArrowDownWideNarrow, Database, ChevronDown, Calendar } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import DataRefreshButton from '../../../components/DataRefreshButton';
import PrestadorSearch from '../../../components/pacientes/PrestadorSearch';
import PatientProtocoloCacheControl from '../../../components/PatientProtocoloCacheControl';
import CIDSelection from '../../../components/pacientes/CIDSelection';
import './PacientesEstilos.css';

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
    refreshDataAfterModification: contextRefreshData
  } = usePatient();
  
  // Estados para controle da UI
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Nome");
  const [searchType, setSearchType] = useState("nome");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
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
    
    if (searchTerm && searchTerm.trim().length >= 2) {
      setLocalLoading(true);
      searchPatients(searchTerm, type)
        .finally(() => {
          setLocalLoading(false);
        });
    }
  };

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
    e.preventDefault();
    
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
  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };
  
  const handleSort = (field) => {
    // Se o campo já está selecionado, inverte a direção
    if (field === sortField) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, começa com ascendente
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  const handleResetSort = () => {
    setSortField('Nome');
    setSortOrder('asc');
  };
  
  // Handler para adicionar
  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRows(new Set());
    
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
  
  // Aliases para simplificar
  const handleCancelAdd = () => handleCancel();
  const handleSaveNew = () => handleSubmit(new Event('submit'));
  const handleSave = () => handleSubmit(new Event('submit'));
  
  // Handler para seleção de linha
  const handleRowClick = (patientId) => {
    if (isEditing || isAdding) return; // Não permite selecionar durante a edição/adição
    
    // Se clicar na linha já selecionada, desselecioná-la
    if (selectedRows.has(patientId) && selectedPatient?.id === patientId) {
      setSelectedRows(new Set()); // Limpa o conjunto de linhas selecionadas
      selectPatient(null); // Importante: limpa a seleção no contexto
    } else {
      // Caso contrário, selecionar a linha
      setSelectedRows(new Set([patientId]));
      selectPatient(patientId);
    }
  };
  
  // Handler para pesquisa
  const executeSearch = () => {
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      
      if (value.length >= 2 || value.length === 0) {
        // Atualizar estado local
        setLocalLoading(true);
        
        // Executar a pesquisa com o tipo atual
        searchPatients(value, searchType)
          .finally(() => {
            setLocalLoading(false);
          });
      } else {
        showWarningAlert("Pesquisa muito curta", "Digite pelo menos 2 caracteres para pesquisar.");
      }
    }
  };
  
  // Manipulador de evento de input
  const handleInput = () => {
    if (searchInputRef.current) {
      searchPatients(searchInputRef.current.value, searchType);
    }
  };
  
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
    searchPatients('', 'nome');
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
        {sortField !== 'Nome' && (
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
                  
                  <label className={`cursor-pointer flex items-center ${searchType === 'codigo' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                    <input
                      type="radio"
                      name="searchType"
                      value="codigo"
                      checked={searchType === 'codigo'}
                      onChange={() => handleSearchTypeChange('codigo')}
                      className="mr-1 h-3 w-3"
                    />
                    <span className="text-xs">Código</span>
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
                {filteredPatients.length === 0 ? (
                  <span className="text-red-500">Nenhum resultado encontrado. Tente refinar sua busca.</span>
                ) : (
                  <span>
                    {`${filteredPatients.length} resultados encontrados para "${searchTerm}"`}
                    <span className="search-type-badge search-type-${searchType}">
                      {getSearchTypeName(searchType)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Controles de cache 
          <div className="flex items-center gap-3 mr-4">*/}
            {/* Botão de controle de cache 
            <button
              onClick={() => setShowCacheControl(true)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center"
              title="Gerenciar Cache"
            >
              <Database size={16} className="text-gray-600 mr-1" />
              <span className="text-xs text-gray-600">Cache</span>
            </button>*/}
            
            {/* Indicador de fonte de dados
            {dataSource && (
              <div className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-500">
                Fonte: <span className={dataSource === 'cache' ? 'text-green-600' : 'text-blue-600'}>
                  {dataSource === 'cache' ? 'Cache' : 'Servidor'}
                </span>
              </div>
            )}*/}
            
            {/* Botão de atualização de dados 
            <DataRefreshButton />
          </div>*/}
          
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
      
      {/* Formulário de edição/adição SIMPLIFICADO */}
      {(isAdding || isEditing) && (
        <form onSubmit={handleSubmit} className="patient-form bg-white p-4 rounded-lg mb-4">
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="operadora" className="form-label">Operadora</label>
              <select 
                id="operadora"
                name="Operadora"
                value={formData.Operadora}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Selecione uma operadora</option>
                {operadoras.map(op => (
                  <option key={op.id} value={op.nome}>{op.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="prestador" className="form-label flex justify-between">
                <span>Prestador</span>
                {prestadores.length > 0 && (
                  <button 
                    type="button" 
                    onClick={handleRefreshPrestadores}
                    className="text-xs text-blue-500 hover:text-blue-700"
                    title="Atualizar lista de prestadores"
                  >
                    Atualizar lista
                  </button>
                )}
              </label>
              {/* Novo componente de pesquisa de prestadores */}
              <PrestadorSearch 
                prestadores={prestadores}
                selectedPrestador={formData.Prestador}
                onSelect={handlePrestadorSelect}
                required={true}
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="codigoPaciente" className="form-label">Código do Paciente</label>
              <input 
                type="text"
                id="codigoPaciente"
                name="Paciente_Codigo"
                value={formData.Paciente_Codigo}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="nomePaciente" className="form-label">Nome do Paciente</label>
              <input 
                type="text"
                id="nomePaciente"
                name="Nome"
                value={formData.Nome}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="sexo" className="form-label">Sexo</label>
              <select 
                id="sexo"
                name="Sexo"
                value={formData.Sexo}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Selecione</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="dataNascimento" className="form-label">Data de Nascimento</label>
              <div className="relative flex">
                {/* Campo de texto para permitir colar */}
                <input 
                  type="text"
                  id="dataNascimentoText"
                  value={nascimentoText}
                  onChange={(e) => setNascimentoText(e.target.value)}
                  onPaste={(e) => handleDatePaste(e, setNascimentoText)}
                  className="form-input pr-12"
                  placeholder="DD/MM/AAAA"
                />
                {/* Campo date oculto que mantém o valor para o formulário */}
                <input 
                  type="date"
                  id="dataNascimento"
                  name="Nascimento"
                  value={formData.Nascimento}
                  onChange={handleInputChange}
                  className="absolute w-0 h-0 opacity-0"
                />
                <button 
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => document.getElementById('dataNascimento').showPicker()}
                  title="Abrir calendário"
                >
                  <Calendar size={18} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="dataInicioTratamento" className="form-label">Data de Início do Tratamento</label>
              <div className="relative flex">
                {/* Campo de texto para permitir colar */}
                <input 
                  type="text"
                  id="dataInicioTratamentoText"
                  value={dataInicioText}
                  onChange={(e) => setDataInicioText(e.target.value)}
                  onPaste={(e) => handleDatePaste(e, setDataInicioText)}
                  className="form-input pr-12"
                  placeholder="DD/MM/AAAA"
                />
                {/* Campo date oculto que mantém o valor para o formulário */}
                <input 
                  type="date"
                  id="dataInicioTratamento"
                  name="Data_Inicio_Tratamento"
                  value={formData.Data_Inicio_Tratamento}
                  onChange={handleInputChange}
                  className="absolute w-0 h-0 opacity-0"
                />
                <button 
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => document.getElementById('dataInicioTratamento').showPicker()}
                  title="Abrir calendário"
                >
                  <Calendar size={18} />
                </button>
              </div>
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="cid" className="form-label">CID</label>
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
        </form>
      )}
      
      {/* Lista de pacientes */}
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
                onClick={() => loadPatients(true)}
                className="button buttontxt flex items-center gap-2"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredPatients.length > 0 ? (
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
                  <th onClick={() => handleSort('Operadora')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Operadora' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Operadora' ? '#f26b6b' : 'inherit' }}>
                        Operadora
                      </span>
                      {sortField === 'Operadora' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Prestador_Nome_Fantasia')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Prestador_Nome_Fantasia' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Prestador_Nome_Fantasia' ? '#f26b6b' : 'inherit' }}>
                        Prestador
                      </span>
                      {sortField === 'Prestador_Nome_Fantasia' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Paciente_Codigo')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Paciente_Codigo' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Paciente_Codigo' ? '#f26b6b' : 'inherit' }}>
                        Código
                      </span>
                      {sortField === 'Paciente_Codigo' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Nome')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Nome' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Nome' ? '#f26b6b' : 'inherit' }}>
                        Nome
                      </span>
                      {sortField === 'Nome' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Nascimento')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Nascimento' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Nascimento' ? '#f26b6b' : 'inherit' }}>
                        Data Nasc.
                      </span>
                      {sortField === 'Nascimento' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Idade')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Idade' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Idade' ? '#f26b6b' : 'inherit' }}>
                        Idade
                      </span>
                      {sortField === 'Idade' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Sexo')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Sexo' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Sexo' ? '#f26b6b' : 'inherit' }}>
                        Sexo
                      </span>
                      {sortField === 'Sexo' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Data_Inicio_Tratamento')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Data_Inicio_Tratamento' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Data_Inicio_Tratamento' ? '#f26b6b' : 'inherit' }}>
                        Início Trat.
                      </span>
                      {sortField === 'Data_Inicio_Tratamento' && (
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
                {(orderedPatients.length > 0 ? orderedPatients : filteredPatients).map(patient => (
                  <tr 
                    key={patient.id}
                    onClick={() => handleRowClick(patient.id)}
                    className={selectedPatient?.id === patient.id ? 'selected' : ''}
                  >
                    <td>{patient.id}</td>
                    <td>{patient.Operadora}</td>
                    <td>{patient.Prestador_Nome_Fantasia || patient.Prestador || 'N/D'}</td>
                    <td>{patient.Paciente_Codigo}</td>
                    <td>{patient.Nome}</td>
                    <td>{patient.Nascimento}</td>
                    <td>{patient.Idade || 'N/D'}</td>
                    <td>{patient.Sexo}</td>
                    <td>{patient.Data_Inicio_Tratamento || 'N/D'}</td>
                    <td>{patient.CID}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-gray-500">
                {searchTerm ? "Nenhum resultado encontrado para esta pesquisa" : "Não há pacientes cadastrados"}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Modal de controle de cache */}
      {showCacheControl && (
        <PatientProtocoloCacheControl 
          onClose={() => setShowCacheControl(false)}
          type="patient"
        />
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

export default CadastroPaciente;