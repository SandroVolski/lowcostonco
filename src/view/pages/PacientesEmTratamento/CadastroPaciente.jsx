import React, { useState, useEffect, useRef } from 'react';
import { usePatient } from '../../../context/PatientContext';
import { Plus, Edit, Trash2, Search, X, Save, ArrowUpWideNarrow, ArrowDownWideNarrow, Database, ChevronDown } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import DataRefreshButton from '../../../components/DataRefreshButton';
import './PacientesEstilos.css';

const CadastroPaciente = () => {
  const { 
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
    loadPatients
  } = usePatient();
  
  // Estados para controle da UI
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Nome");
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [searchType, setSearchType] = useState("nome"); // 'nome', 'codigo', 'cid', 'operadora', etc.
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
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
    Indicao_Clinica: '',
    CID: '',
    T: '',
    N: '',
    M: '',
    Estadio: '',
    Finalidade: '',
    CRM_Medico: '',
    Local_das_Metastases: ''
  });
  
  // Estados para ordenação personalizada
  const [orderedPatients, setOrderedPatients] = useState([]);
  
  // Colunas de ordenação - definir as colunas que podem ser ordenadas
  const orderableColumns = [
    { field: 'id', label: 'ID' },
    { field: 'Operadora', label: 'Operadora' },
    { field: 'Prestador', label: 'Prestador' },
    { field: 'Crm_Nome', label: 'Médico' },
    { field: 'Paciente_Codigo', label: 'Código' },
    { field: 'Nome', label: 'Nome' },
    { field: 'Nascimento', label: 'Data Nasc.' },
    { field: 'Idade', label: 'Idade' },
    { field: 'Sexo', label: 'Sexo' },
    { field: 'Data_Inicio_Tratamento', label: 'Início Trat.' },
    { field: 'CID', label: 'CID' }
  ];
  
  // Efeito para ordenar pacientes quando o sortField ou sortOrder mudar
  useEffect(() => {
    if (!filteredPatients || filteredPatients.length === 0) return;
    
    const sorted = [...filteredPatients].sort((a, b) => {
      // Extrair os valores a serem comparados
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      // Verificar se estamos ordenando campos numéricos
      const numericFields = ['id', 'Idade', 'CRM_Medico'];
      
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
      Indicao_Clinica: '',
      CID: '',
      T: '',
      N: '',
      M: '',
      Estadio: '',
      Finalidade: '',
      CRM_Medico: '',
      Local_das_Metastases: ''
    });
  };

  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    
    // Se já existe um termo de pesquisa, refazer a pesquisa com o novo tipo
    if (searchTerm && searchTerm.trim().length >= 2) {
      // Atualizar estado local
      setLocalLoading(true);
      
      // Executar a pesquisa com o novo tipo
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
      case 'finalidade': return 'Finalidade';
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
      
      // Salvar o ID do paciente selecionado antes de recarregar
      const selectedPatientId = selectedPatient?.id;
      
      // Recarregar dados
      await loadPatients(true);
      
      // Reselecionar explicitamente o paciente atualizado
      if (selectedPatientId) {
        selectPatient(selectedPatientId);
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
  
  // Submissão de formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isEditing && selectedPatient) {
      try {
        setLocalLoading(true);
        await updatePatient(selectedPatient.id, formData);
        setIsEditing(false);
        showSuccessAlert("Paciente atualizado com sucesso!");
        await refreshDataAfterModification();
      } catch (error) {
        showErrorAlert("Erro ao atualizar paciente", error.message);
      } finally {
        setLocalLoading(false);
      }
    } else if (isAdding) {
      try {
        setLocalLoading(true);
        const newId = await addPatient(formData);
        setIsAdding(false);
        showSuccessAlert("Paciente adicionado com sucesso!");
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
  };
  
  // Handler para editar
  const handleEdit = () => {
    if (!selectedPatient) {
      showErrorAlert("Selecione um paciente", "Você precisa selecionar um paciente para editar.");
      return;
    }
    
    // Buscar o paciente mais atualizado da lista filteredPatients
    const currentPatient = filteredPatients.find(p => p.id === selectedPatient.id) || selectedPatient;
    
    // Usar o paciente atualizado para preencher o formulário
    setFormData({
      Operadora: currentPatient.Operadora || '',
      Prestador: currentPatient.Prestador || '',
      Paciente_Codigo: currentPatient.Paciente_Codigo || '',
      Nome: currentPatient.Nome || '',
      Sexo: currentPatient.Sexo || '',
      Nascimento: currentPatient.Nascimento || '',
      Indicao_Clinica: currentPatient.Indicao_Clinica || '',
      CID: currentPatient.CID || '',
      T: currentPatient.T || '',
      N: currentPatient.N || '',
      M: currentPatient.M || '',
      Estadio: currentPatient.Estadio || '',
      Finalidade: currentPatient.Finalidade || '',
      CRM_Medico: currentPatient.CRM_Medico || '',
      Local_das_Metastases: currentPatient.Local_das_Metastases || ''
    });
    
    setIsEditing(true);
    setIsAdding(false);
  };
  
  // Handler para deletar
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
        await deletePatient(selectedPatient.id);
        showSuccessAlert("Paciente excluído com sucesso!");
        setSelectedRows(new Set());
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
    
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.clear();
        newSet.add(patientId);
      }
      
      // Também atualiza o paciente selecionado no contexto
      selectPatient(patientId);
      return newSet;
    });
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
                {/* <DataRefreshButton /> */}
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
                    
                    {/*<label className={`cursor-pointer flex items-center ${searchType === 'operadora' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="operadora"
                        checked={searchType === 'operadora'}
                        onChange={() => handleSearchTypeChange('operadora')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">Operadora</span>
                    </label>
                    
                    <label className={`cursor-pointer flex items-center ${searchType === 'prestador' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="prestador"
                        checked={searchType === 'prestador'}
                        onChange={() => handleSearchTypeChange('prestador')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">Prestador</span>
                    </label>*/}
                    
                    
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
        <form onSubmit={handleSubmit} className="patient-form bg-white p-4 rounded-lg  mb-4">
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
              <label htmlFor="prestador" className="form-label">Prestador</label>
              <select 
                id="prestador"
                name="Prestador"
                value={formData.Prestador}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Selecione um prestador</option>
                {prestadores.map(pr => (
                  <option key={pr.id} value={pr.nome}>{pr.nome}</option>
                ))}
              </select>
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
              <input 
                type="text"
                id="dataNascimento"
                name="Nascimento"
                value={formData.Nascimento}
                onChange={handleInputChange}
                className="form-input"
                placeholder="DD/MM/AAAA"
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="indicacaoClinica" className="form-label">Indicação Clínica</label>
              <input 
                type="text"
                id="indicacaoClinica"
                name="Indicao_Clinica"
                value={formData.Indicao_Clinica}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="cid" className="form-label">CID</label>
              <input 
                type="text"
                id="cid"
                name="CID"
                value={formData.CID}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[100px]">
              <label htmlFor="t" className="form-label">T</label>
              <input 
                type="text"
                id="t"
                name="T"
                value={formData.T}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[100px]">
              <label htmlFor="n" className="form-label">N</label>
              <input 
                type="text"
                id="n"
                name="N"
                value={formData.N}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[100px]">
              <label htmlFor="m" className="form-label">M</label>
              <input 
                type="text"
                id="m"
                name="M"
                value={formData.M}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="estadio" className="form-label">Estadio</label>
              <input 
                type="text"
                id="estadio"
                name="Estadio"
                value={formData.Estadio}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="finalidade" className="form-label">Finalidade</label>
              <input 
                type="text"
                id="finalidade"
                name="Finalidade"
                value={formData.Finalidade}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group flex-1 min-w-[250px]">
              <label htmlFor="crmMedico" className="form-label">CRM Médico</label>
              <input 
                type="text"
                id="crmMedico"
                name="CRM_Medico"
                value={formData.CRM_Medico}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row flex flex-wrap gap-4 mb-4">
            <div className="form-group flex-1">
              <label htmlFor="localMetastases" className="form-label">Local das Metástases</label>
              <input 
                type="text"
                id="localMetastases"
                name="Local_das_Metastases"
                value={formData.Local_das_Metastases}
                onChange={handleInputChange}
                className="form-input"
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
                  <th onClick={() => handleSort('Prestador')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Prestador' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Prestador' ? '#f26b6b' : 'inherit' }}>
                        Prestador
                      </span>
                      {sortField === 'Prestador' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Crm_Nome')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Crm_Nome' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Crm_Nome' ? '#f26b6b' : 'inherit' }}>
                        Médico
                      </span>
                      {sortField === 'Crm_Nome' && (
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
                    <td>{patient.Prestador}</td>
                    <td>{patient.Crm_Nome || 'N/D'}</td>
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