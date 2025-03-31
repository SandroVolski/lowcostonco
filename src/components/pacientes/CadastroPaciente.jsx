import React, { useState, useEffect } from 'react';
import { usePatient } from '../../context/PatientContext';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { showConfirmAlert } from '../../utils/CustomAlerts';

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
      await updatePatient(selectedPatient.id, formData);
      setIsEditing(false);
    } else if (isAdding) {
      await addPatient(formData);
      setIsAdding(false);
    }
    
    resetForm();
  };
  
  // Handle add button click
  const handleAddClick = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
  };
  
  // Handle edit button click
  const handleEditClick = () => {
    if (!selectedPatient) return;
    
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
  const handleDeleteClick = async () => {
    if (!selectedPatient) return;
    
    const confirmed = await showConfirmAlert(
      "Confirmar exclusão", 
      `Tem certeza que deseja excluir o paciente ${selectedPatient.Nome}?`
    );
    
    if (confirmed) {
      await deletePatient(selectedPatient.id);
    }
  };
  
  // Handle cancel button click
  const handleCancelClick = () => {
    setIsAdding(false);
    setIsEditing(false);
    resetForm();
  };
  
  // Handle row selection
  const handleRowClick = (patientId) => {
    selectPatient(patientId);
  };
  
  // Handle search
  const handleSearch = (e) => {
    searchPatients(e.target.value);
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    searchPatients('');
  };
  
  return (
    <div className="patient-container">
      {/* Barra de ações */}
      <div className="action-bar">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar paciente..." 
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="action-buttons">
          {!isAdding && !isEditing && (
            <>
              <button onClick={handleAddClick} className="btn btn-primary">
                <Plus size={16} /> Incluir
              </button>
              <button 
                onClick={handleEditClick} 
                className="btn btn-secondary"
                disabled={!selectedPatient}
              >
                <Edit size={16} /> Editar
              </button>
              <button 
                onClick={handleDeleteClick} 
                className="btn btn-danger"
                disabled={!selectedPatient}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </>
          )}
          
          {(isAdding || isEditing) && (
            <button onClick={handleCancelClick} className="btn btn-secondary">
              <X size={16} /> Cancelar
            </button>
          )}
        </div>
      </div>
      
      {/* Exibir formulário apenas quando estiver adicionando ou editando */}
      {(isAdding || isEditing) && (
        <form onSubmit={handleSubmit} className="patient-form">
          <div className="form-row">
            <div className="form-group">
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
            
            <div className="form-group">
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
            
            <div className="form-group">
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
          
          <div className="form-row">
            <div className="form-group">
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
            
            <div className="form-group">
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
            
            <div className="form-group">
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
          
          <div className="form-row">
            <div className="form-group">
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
            
            <div className="form-group">
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
          
          <div className="form-row">
            <div className="form-group">
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
            
            <div className="form-group">
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
            
            <div className="form-group">
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
            
            <div className="form-group">
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
          
          <div className="form-row">
            <div className="form-group">
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
            
            <div className="form-group">
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
          
          <div className="form-row">
            <div className="form-group">
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
          
          <div className="button-group">
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
      
      {/* Lista de pacientes */}
      {!isAdding && !isEditing && (
        <div className="patients-table-container">
          {loading ? (
            <div className="loading-message">Carregando pacientes...</div>
          ) : error ? (
            <div className="error-message">
              Erro ao carregar pacientes: {error}
              <button onClick={() => loadPatients(true)} className="retry-button">
                Tentar novamente
              </button>
            </div>
          ) : filteredPatients.length > 0 ? (
            <table className="patients-table">
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
            <div className="empty-message">
              {searchTerm ? 'Nenhum paciente encontrado para esta busca.' : 'Não há pacientes cadastrados.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CadastroPaciente;