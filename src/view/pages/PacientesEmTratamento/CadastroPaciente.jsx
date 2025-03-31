import React, { useState, useEffect, useRef } from 'react';
import { usePatient } from '../../../context/PatientContext';
import { Plus, Edit, Trash2, Search, X, Save } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../../utils/CustomAlerts';
import DataRefreshButton from '../../../components/DataRefreshButton';

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
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Nome");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const searchInputRef = useRef(null);
  
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
  
  // Reset form data
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
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isEditing && selectedPatient) {
      try {
        setLocalLoading(true);
        await updatePatient(selectedPatient.id, formData);
        setIsEditing(false);
        showSuccessAlert("Paciente atualizado com sucesso!");
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
      } catch (error) {
        showErrorAlert("Erro ao adicionar paciente", error.message);
      } finally {
        setLocalLoading(false);
      }
    }
    
    resetForm();
  };
  
  // Função para alterar ordenação
  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };
  
  // Função para resetar ordenação
  const handleResetSort = () => {
    setSortField('Nome');
    setSortOrder('asc');
  };
  
  // Handle add button click
  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRows(new Set());
  };
  
  // Handle edit button click
  const handleEdit = () => {
    if (!selectedPatient) {
      showErrorAlert("Selecione um paciente", "Você precisa selecionar um paciente para editar.");
      return;
    }
    
    setFormData({
      Operadora: selectedPatient.Operadora || '',
      Prestador: selectedPatient.Prestador || '',
      Paciente_Codigo: selectedPatient.Paciente_Codigo || '',
      Nome: selectedPatient.Nome || '',
      Sexo: selectedPatient.Sexo || '',
      Nascimento: selectedPatient.Nascimento || '',
      Indicao_Clinica: selectedPatient.Indicao_Clinica || '',
      CID: selectedPatient.CID || '',
      T: selectedPatient.T || '',
      N: selectedPatient.N || '',
      M: selectedPatient.M || '',
      Estadio: selectedPatient.Estadio || '',
      Finalidade: selectedPatient.Finalidade || '',
      CRM_Medico: selectedPatient.CRM_Medico || '',
      Local_das_Metastases: selectedPatient.Local_das_Metastases || ''
    });
    
    setIsEditing(true);
    setIsAdding(false);
  };
  
  // Handle delete button click
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
      } catch (error) {
        showErrorAlert("Erro ao excluir paciente", error.message);
      } finally {
        setLocalLoading(false);
      }
    }
  };
  
  // Handle cancel button click
  const handleCancel = async () => {
    // Se estiver editando, confirmar com o usuário antes de cancelar
    if (isEditing || isAdding) {
      const confirmCancel = await showConfirmAlert(
        "Deseja cancelar a edição?",
        "Todas as alterações feitas serão perdidas."
      );
      
      if (!confirmCancel) {
        return; // Usuário não quer cancelar a edição
      }
    }
    
    setIsEditing(false);
    setIsAdding(false);
    resetForm();
  };
  
  const handleCancelAdd = () => handleCancel();
  
  const handleSaveNew = () => handleSubmit(new Event('submit'));
  const handleSave = () => handleSubmit(new Event('submit'));
  
  // Handle row selection
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
  
  // Manipulador de evento de input básico para manter o estado sincronizado
  const handleInput = () => {
    if (searchInputRef.current) {
      searchPatients(searchInputRef.current.value);
    }
  };

  // Manipulador para evento de Enter no input
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };

  // Executar pesquisa
  const executeSearch = () => {
    if (searchInputRef.current) {
      searchPatients(searchInputRef.current.value);
    }
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    searchPatients('');
  };
  
  return (
    <div className="patient-container">
      <div className="mb-6 flex justify-between items-center encimatabela">
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
          <div className="flex flex-col">
            <div className="search-container">
              <div className="search-bar">
                <DataRefreshButton />
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
                  placeholder="Pesquisar paciente..."
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
            </div>
            
            {/* Indicador de resultados da pesquisa */}
            {searchTerm && (
              <div className="text-xs text-gray-600 mt-1 ml-2 pesquisatinha">
                {filteredPatients.length === 0 ? (
                  <span className="text-red-500">Nenhum resultado encontrado. Tente refinar sua busca.</span>
                ) : (
                  <span>
                    {`${filteredPatients.length} resultados encontrados para "${searchTerm}"`}
                  </span>
                )}
              </div>
            )}
          </div>
          
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
      
      {/* Exibir formulário apenas quando estiver adicionando ou editando */}
      {(isAdding || isEditing) && (
        <form onSubmit={handleSubmit} className="patient-form bg-white p-4 rounded-lg shadow mb-4">
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
            <table className="patients-table w-full">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Código</th>
                  <th>Operadora</th>
                  <th>Prestador</th>
                  <th>CID</th>
                  <th>Sexo</th>
                  <th>Finalidade</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => (
                  <tr 
                    key={patient.id}
                    onClick={() => handleRowClick(patient.id)}
                    className={selectedPatient?.id === patient.id ? 'selected' : ''}
                  >
                    <td>{patient.Nome}</td>
                    <td>{patient.Paciente_Codigo}</td>
                    <td>{patient.Operadora}</td>
                    <td>{patient.Prestador}</td>
                    <td>{patient.CID}</td>
                    <td>{patient.Sexo}</td>
                    <td>{patient.Finalidade}</td>
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
    </div>
  );
};

export default CadastroPaciente;