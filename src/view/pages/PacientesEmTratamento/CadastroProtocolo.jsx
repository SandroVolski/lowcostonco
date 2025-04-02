// CadastroProtocolo.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useProtocolo } from '../../../context/ProtocoloContext';
import { Plus, Edit, Trash2, Search, X, Save, ArrowUpWideNarrow, ArrowDownWideNarrow, Database, ChevronDown, ChevronRight } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import DataRefreshButton from '../../../components/DataRefreshButton';
import './PacientesEstilos.css';

const API_BASE_URL = "http://localhost/backend-php/api/PacientesEmTratamento";

const CadastroProtocolo = () => {
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
    loadProtocoloDetails, // Add this missing function
    addServicoToProtocolo, // Add this for the service form
    deleteServicoFromProtocolo // Add this for service deletion
  } = useProtocolo();
  
  // Estados para controle da UI
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Protocolo_Nome");
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [searchType, setSearchType] = useState("nome"); // 'nome', 'codigo', 'cid', etc.
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [servicosData, setServicosData] = useState([]);
  const [updateError, setUpdateError] = useState(null); // Add this to track update errors
  const [viasAdministracao, setViasAdministracao] = useState([]);
  
  // Referência para o input de pesquisa
  const searchInputRef = useRef(null);
  
  // Estado para formulários
  const [formData, setFormData] = useState({
    Protocolo_Nome: '',
    Protocolo_Sigla: '',
    Protocolo_Dose_M: '',
    Protocolo_Dose_Total: '',
    Protocolo_Dias_de_Aplicacao: '',
    CID: '',
    Protocolo_ViaAdm: '',
    Linha: '' // Add this as it's required in the backend
  });
  
  // Estado para formulário de serviço
  const [servicoForm, setServicoForm] = useState({
    Servico_Codigo: '',
    Dose_M: '',
    Dose_Total: '',
    Dias_de_Aplic: '',
    Via_de_Adm: ''
  });
  
  // Estados para ordenação personalizada
  const [orderedProtocolos, setOrderedProtocolos] = useState([]);
  
  // Colunas de ordenação - definir as colunas que podem ser ordenadas
  const orderableColumns = [
    { field: 'id', label: 'ID' },
    { field: 'Protocolo_Nome', label: 'Nome' },
    { field: 'Protocolo_Sigla', label: 'Sigla' },
    { field: 'Protocolo_Dose_M', label: 'Dose M' },
    { field: 'Protocolo_Dose_Total', label: 'Dose Total' },
    { field: 'Protocolo_Dias_de_Aplicacao', label: 'Dias Aplicação' },
    { field: 'Protocolo_ViaAdm', label: 'Via Adm.' },
    { field: 'CID', label: 'CID' }
  ];
  
  // Efeito para ordenar protocolos quando o sortField ou sortOrder mudar
  useEffect(() => {
    if (!filteredProtocolos || filteredProtocolos.length === 0) return;
    
    const sorted = [...filteredProtocolos].sort((a, b) => {
      // Extrair os valores a serem comparados
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      // Verificar se estamos ordenando campos numéricos
      const numericFields = ['id', 'Protocolo_Dose_M', 'Protocolo_Dose_Total'];
      
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
    
    setOrderedProtocolos(sorted);
  }, [filteredProtocolos, sortField, sortOrder]);
  
  // Efeito para carregar os serviços associados ao protocolo selecionado
  useEffect(() => {
    if (selectedProtocolo && expandedView) {
      setServicosData([]); // Garantir que comece com uma matriz vazia
      loadProtocoloServicos(selectedProtocolo.id)
        .then(data => {
          // Garantir que os dados são uma matriz
          setServicosData(Array.isArray(data) ? data : []);
        })
        .catch(error => {
          console.error("Erro ao carregar serviços do protocolo:", error);
          setServicosData([]); // Em caso de erro, definir como matriz vazia
        });
    }
  }, [selectedProtocolo, expandedView, loadProtocoloServicos]);
  
  // Reset do formulário
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
    setUpdateError(null); // Clear any update errors when resetting form
  };

  const resetServicoForm = () => {
    setServicoForm({
      Servico_Codigo: '',
      Dose_M: '',
      Dose_Total: '',
      Dias_de_Aplic: '',
      Via_de_Adm: ''
    });
  };

  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    
    // Se já existe um termo de pesquisa, refazer a pesquisa com o novo tipo
    if (searchTerm && searchTerm.trim().length >= 2) {
      // Atualizar estado local
      setLocalLoading(true);
      
      // Executar a pesquisa com o novo tipo
      searchProtocolos(searchTerm, type)
        .finally(() => {
          setLocalLoading(false);
        });
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
  
  // Handler para mudança nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handler para mudança nos campos do formulário de serviço
  const handleServicoInputChange = (e) => {
    const { name, value } = e.target;
    setServicoForm(prev => ({
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
  
  // Atualização de dados após modificação
  const refreshDataAfterModification = async () => {
    try {
      setLocalLoading(true);
      
      // Salvar o ID do protocolo selecionado antes de recarregar
      const selectedProtocoloId = selectedProtocolo?.id;
      
      // Recarregar dados
      await loadProtocolos(true);
      
      // Reselecionar explicitamente o protocolo atualizado
      if (selectedProtocoloId) {
        selectProtocolo(selectedProtocoloId);
      }
      
      // Mostrar indicador de atualização
      showCacheRefreshIndicator();
      
    } catch (error) {
      console.error("Erro ao atualizar dados após modificação:", error);
      showErrorAlert("Falha ao atualizar os dados", "Tente atualizar manualmente.");
    } finally {
      setLocalLoading(false);
    }
  };
  
  // Função de validação de dados
  const validateFormData = (data) => {
    // Verificar campos obrigatórios
    if (!data.Protocolo_Nome || !data.Protocolo_Sigla) {
      return { valid: false, message: "Nome e Sigla são campos obrigatórios" };
    }
    
    // Converter campos numéricos (para garantir formato correto)
    const numericData = { ...data };
    
    // Tratar campos numéricos
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
  
  // Submissão de formulário
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setUpdateError(null);
    
    // Validar dados do formulário
    const validation = validateFormData(formData);
    if (!validation.valid) {
      showErrorAlert("Validação falhou", validation.message);
      return;
    }
    
    const validatedData = validation.data;
    console.log("Enviando dados validados:", validatedData); // Log para debug
    
    if (isEditing && selectedProtocolo) {
      try {
        setLocalLoading(true);
        await updateProtocolo(selectedProtocolo.id, validatedData);
        setIsEditing(false);
        showSuccessAlert("Protocolo atualizado com sucesso!");
        await refreshDataAfterModification();
      } catch (error) {
        console.error("Detalhes do erro de atualização:", error);
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
  
  // Submissão do formulário de serviço
  const handleServicoSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProtocolo) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para adicionar o serviço.");
      return;
    }
    
    try {
      setLocalLoading(true);
      await addServicoToProtocolo(selectedProtocolo.id, servicoForm);
      resetServicoForm();
      showSuccessAlert("Serviço adicionado com sucesso!");
      
      // Recarregar serviços do protocolo
      const updatedServicos = await loadProtocoloServicos(selectedProtocolo.id);
      setServicosData(updatedServicos);
    } catch (error) {
      showErrorAlert("Erro ao adicionar serviço", error.message);
    } finally {
      setLocalLoading(false);
    }
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
    setSortField('Protocolo_Nome');
    setSortOrder('asc');
  };
  
  // Handler para adicionar
  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRows(new Set());
    setExpandedView(false);
  };
  
  // Handler para editar
  const handleEdit = () => {
    if (!selectedProtocolo) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para editar.");
      return;
    }
    
    // Buscar o protocolo mais atualizado da lista filteredProtocolos
    const currentProtocolo = filteredProtocolos.find(p => p.id === selectedProtocolo.id) || selectedProtocolo;
    
    // Usar o protocolo atualizado para preencher o formulário
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
    setExpandedView(false);
  };
  
  // Handler para deletar
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
        setExpandedView(false);
        await refreshDataAfterModification();
      } catch (error) {
        showErrorAlert("Erro ao excluir protocolo", error.message);
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
  const handleSaveNew = () => handleSubmit();
  const handleSave = () => handleSubmit();
  
  // Handler para seleção de linha
  const handleRowClick = (protocoloId) => {
    if (isEditing || isAdding) return; // Não permite selecionar durante a edição/adição
    
    // Atualizar o estado local
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(protocoloId)) {
        newSet.delete(protocoloId);
        setExpandedView(false);
      } else {
        newSet.clear();
        newSet.add(protocoloId);
        setExpandedView(true);
      }
      return newSet;
    });
    
    // Selecionar o protocolo (sincronamente)
    selectProtocolo(protocoloId);
    
    // Carregar detalhes (assincronamente)
    if (protocoloId) {
      // Certifique-se de que loadProtocoloDetails existe antes de chamá-lo
      if (loadProtocoloDetails) {
        loadProtocoloDetails(protocoloId).catch(console.error);
      } else {
        console.error("Função loadProtocoloDetails não está disponível");
      }
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
        searchProtocolos(value, searchType)
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
      searchProtocolos(searchInputRef.current.value, searchType);
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
    searchProtocolos('', 'nome');
  };

  // Adicione esta função para carregar as vias de administração
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
  // Adicione este useEffect para carregar as vias quando o componente montar
  useEffect(() => {
    loadViasAdministracao();
  }, []);


  
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
            <>
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
                  {(orderedProtocolos.length > 0 ? orderedProtocolos : filteredProtocolos).map((protocolo, index) => (
                    <tr 
                      key={protocolo.id || `protocolo-${index}`}
                      onClick={() => handleRowClick(protocolo.id)}
                      className={selectedProtocolo?.id === protocolo.id ? 'selected' : ''}
                    >
                      <td>{protocolo.id}</td>
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
                  ))}
                </tbody>
              </table>
        
              
              {/* Seção expandida para mostrar serviços do protocolo selecionado */}
              {expandedView && selectedProtocolo && (
                <div className="expanded-view mt-4 bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      Serviços do Protocolo: {selectedProtocolo.Protocolo_Nome}
                    </h3>
                    <button 
                      className="px-2 py-1 bg-green-600 text-white rounded-md flex items-center text-sm"
                      onClick={() => {
                        resetServicoForm();
                        // Aqui você poderia abrir um modal ou um formulário para adicionar serviço
                      }}
                    >
                      <Plus size={16} className="mr-1" /> Adicionar Serviço
                    </button>
                  </div>
                  
                  {servicosData && Array.isArray(servicosData) && servicosData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white">
                        <thead>
                          <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                            <th className="py-3 px-4 text-center">Serviço</th>
                            <th className="py-3 px-4 text-center">Dose M</th>
                            <th className="py-3 px-4 text-center">Dose Total</th>
                            <th className="py-3 px-4 text-center">Dias de Aplic.</th>
                            <th className="py-3 px-4 text-center">Via de Adm.</th>
                            <th className="py-3 px-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                          {servicosData.map((servico, index) => (
                            <tr key={servico.id || servico.id_servico || `servico-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-3 px-4 text-center">{servico.Servico_Codigo}</td>
                              <td className="py-3 px-4 text-center">{servico.Dose_M}</td>
                              <td className="py-3 px-4 text-center">{servico.Dose_Total}</td>
                              <td className="py-3 px-4 text-center">{servico.Dias_de_Aplic}</td>
                              <td className="py-3 px-4 text-center">{servico.Via_de_Adm}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex justify-center items-center">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Lógica para editar serviço
                                    }}
                                    className="text-blue-600 hover:text-blue-900 mx-1"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteServicoFromProtocolo(selectedProtocolo.id, servico.id_servico);
                                    }}
                                    className="text-red-600 hover:text-red-900 mx-1"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Nenhum serviço cadastrado para este protocolo.
                    </div>
                  )}
                  
                  {/* Formulário para adicionar novo serviço */}
                  <div className="mt-4 p-4 border rounded-lg">
                    <h4 className="text-md font-medium mb-2">Adicionar Novo Serviço</h4>
                    <form onSubmit={handleServicoSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Serviço</label>
                        <input
                          type="text"
                          name="Servico_Codigo"
                          value={servicoForm.Servico_Codigo}
                          onChange={handleServicoInputChange}
                          className="w-full p-2 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Dose M</label>
                        <input
                          type="number"
                          name="Dose_M"
                          value={servicoForm.Dose_M}
                          onChange={handleServicoInputChange}
                          className="w-full p-2 border rounded"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Dose Total</label>
                        <input
                          type="number"
                          name="Dose_Total"
                          value={servicoForm.Dose_Total}
                          onChange={handleServicoInputChange}
                          className="w-full p-2 border rounded"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Dias de Aplicação</label>
                        <input
                          type="number"
                          name="Dias_de_Aplic"
                          value={servicoForm.Dias_de_Aplic}
                          onChange={handleServicoInputChange}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Via de Adm.</label>
                        <input
                          type="number"
                          name="Via_de_Adm"
                          value={servicoForm.Via_de_Adm}
                          onChange={handleServicoInputChange}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div className="md:col-span-5 flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          disabled={localLoading}
                        >
                          {localLoading ? 'Salvando...' : 'Adicionar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
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