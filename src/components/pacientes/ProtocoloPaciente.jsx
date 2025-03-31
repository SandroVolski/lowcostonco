import React, { useState, useEffect } from 'react';
import { usePatient } from '../../context/PatientContext';
import { Plus, Edit, Trash2, Search, X, Save } from 'lucide-react';
import { showConfirmAlert } from '../../utils/CustomAlerts';

const ProtocoloPaciente = () => {
  const { selectedPatient } = usePatient();
  
  const [protocolos, setProtocolos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProtocolos, setFilteredProtocolos] = useState([]);
  const [selectedProtocolo, setSelectedProtocolo] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado para o formulário
  const [formData, setFormData] = useState({
    Protocolo_Nome: '',
    Protocolo_Sigla: '',
    Protocolo_Dose_M: '',
    Protocolo_Dose_Total: '',
    Protocolo_Dias_de_Aplicacao: '',
    Protocolo_ViaAdm: '',
    Linha: '',
    CIDAssociado: '',
    Intervalo: ''
  });
  
  // Dados simulados de serviços (medicamentos)
  const [servicos, setServicos] = useState([
    { id: 1, codigo: 'SRV001', nome: 'Medicamento A', principioAtivo: 'Substância X' },
    { id: 2, codigo: 'SRV002', nome: 'Medicamento B', principioAtivo: 'Substância Y' },
    { id: 3, codigo: 'SRV003', nome: 'Medicamento C', principioAtivo: 'Substância Z' }
  ]);
  
  // Serviços selecionados para o protocolo atual
  const [selectedServicos, setSelectedServicos] = useState([]);
  
  // Carregar protocolos (simulado)
  useEffect(() => {
    // Simulando dados de protocolos
    const mockProtocolos = [
      { 
        id: 1, 
        Protocolo_Nome: 'Protocolo A',
        Protocolo_Sigla: 'PA',
        Protocolo_Dose_M: '100mg',
        Protocolo_Dose_Total: 500,
        Protocolo_Dias_de_Aplicacao: '1-5',
        Protocolo_ViaAdm: 'Intravenosa',
        Linha: 1,
        CIDAssociado: 'C509',
        Intervalo: '21 dias'
      },
      { 
        id: 2, 
        Protocolo_Nome: 'Protocolo B',
        Protocolo_Sigla: 'PB',
        Protocolo_Dose_M: '75mg',
        Protocolo_Dose_Total: 375,
        Protocolo_Dias_de_Aplicacao: '1-3',
        Protocolo_ViaAdm: 'Oral',
        Linha: 2,
        CIDAssociado: 'C509,C349',
        Intervalo: '14 dias'
      }
    ];
    
    setProtocolos(mockProtocolos);
    setFilteredProtocolos(mockProtocolos);
  }, []);
  
  // Filtrar protocolos quando o termo de busca mudar
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProtocolos(protocolos);
      return;
    }
    
    const termLower = searchTerm.toLowerCase();
    const filtered = protocolos.filter(protocolo => 
      protocolo.Protocolo_Nome.toLowerCase().includes(termLower) ||
      protocolo.Protocolo_Sigla.toLowerCase().includes(termLower) ||
      protocolo.CIDAssociado.toLowerCase().includes(termLower)
    );
    
    setFilteredProtocolos(filtered);
  }, [searchTerm, protocolos]);
  
  // Manipuladores de eventos
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  const handleRowClick = (protocolo) => {
    setSelectedProtocolo(protocolo);
    // Simulando serviços associados a este protocolo
    setSelectedServicos([
      { 
        id: 1, 
        Servico_Cod: 'SRV001',
        Dose_M: '100mg',
        Dose_Total: 500,
        Dias_de_Aplic: '1-5',
        Via_de_Adm: 'Intravenosa'
      }
    ]);
  };
  
  const handleAddClick = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedServicos([]);
  };
  
  const handleEditClick = () => {
    if (!selectedProtocolo) return;
    
    setFormData({
      Protocolo_Nome: selectedProtocolo.Protocolo_Nome,
      Protocolo_Sigla: selectedProtocolo.Protocolo_Sigla,
      Protocolo_Dose_M: selectedProtocolo.Protocolo_Dose_M,
      Protocolo_Dose_Total: selectedProtocolo.Protocolo_Dose_Total,
      Protocolo_Dias_de_Aplicacao: selectedProtocolo.Protocolo_Dias_de_Aplicacao,
      Protocolo_ViaAdm: selectedProtocolo.Protocolo_ViaAdm,
      Linha: selectedProtocolo.Linha,
      CIDAssociado: selectedProtocolo.CIDAssociado,
      Intervalo: selectedProtocolo.Intervalo
    });
    
    setIsEditing(true);
    setIsAdding(false);
  };
  
  const handleDeleteClick = async () => {
    if (!selectedProtocolo) return;
    
    const confirmed = await showConfirmAlert(
      "Confirmar exclusão", 
      `Tem certeza que deseja excluir o protocolo ${selectedProtocolo.Protocolo_Nome}?`
    );
    
    if (confirmed) {
      // Simulando a exclusão
      setProtocolos(prev => prev.filter(p => p.id !== selectedProtocolo.id));
      setFilteredProtocolos(prev => prev.filter(p => p.id !== selectedProtocolo.id));
      setSelectedProtocolo(null);
    }
  };
  
  const handleCancelClick = () => {
    setIsAdding(false);
    setIsEditing(false);
    resetForm();
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isEditing && selectedProtocolo) {
      // Atualizar protocolo existente
      const updatedProtocolo = {
        ...selectedProtocolo,
        ...formData
      };
      
      setProtocolos(prev => prev.map(p => p.id === selectedProtocolo.id ? updatedProtocolo : p));
      setFilteredProtocolos(prev => prev.map(p => p.id === selectedProtocolo.id ? updatedProtocolo : p));
      setSelectedProtocolo(updatedProtocolo);
    } else if (isAdding) {
      // Adicionar novo protocolo
      const newProtocolo = {
        id: Math.max(0, ...protocolos.map(p => p.id)) + 1,
        ...formData
      };
      
      setProtocolos(prev => [...prev, newProtocolo]);
      setFilteredProtocolos(prev => [...prev, newProtocolo]);
    }
    
    setIsAdding(false);
    setIsEditing(false);
    resetForm();
  };
  
  // Função para adicionar serviço ao protocolo
  const handleAddServico = () => {
    setSelectedServicos(prev => [
      ...prev,
      { 
        id: Math.max(0, ...prev.map(s => s.id)) + 1,
        Servico_Cod: '',
        Dose_M: '',
        Dose_Total: '',
        Dias_de_Aplic: '',
        Via_de_Adm: ''
      }
    ]);
  };
  
  // Função para remover serviço do protocolo
  const handleRemoveServico = (servicoId) => {
    setSelectedServicos(prev => prev.filter(s => s.id !== servicoId));
  };
  
  // Função para atualizar dados de um serviço
  const handleServicoChange = (id, field, value) => {
    setSelectedServicos(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };
  
  // Reset form data
  const resetForm = () => {
    setFormData({
      Protocolo_Nome: '',
      Protocolo_Sigla: '',
      Protocolo_Dose_M: '',
      Protocolo_Dose_Total: '',
      Protocolo_Dias_de_Aplicacao: '',
      Protocolo_ViaAdm: '',
      Linha: '',
      CIDAssociado: '',
      Intervalo: ''
    });
  };
  
  return (
    <div className="protocol-container">
      {/* Barra de ações */}
      <div className="action-bar">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar protocolo..." 
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
                disabled={!selectedProtocolo}
              >
                <Edit size={16} /> Editar
              </button>
              <button 
                onClick={handleDeleteClick} 
                className="btn btn-danger"
                disabled={!selectedProtocolo}
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
        <form onSubmit={handleSubmit} className="protocol-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nome" className="form-label">Nome do Protocolo</label>
              <input 
                type="text"
                id="nome"
                name="Protocolo_Nome"
                value={formData.Protocolo_Nome}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="sigla" className="form-label">Sigla</label>
              <input 
                type="text"
                id="sigla"
                name="Protocolo_Sigla"
                value={formData.Protocolo_Sigla}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cidAssociado" className="form-label">CID Associado</label>
              <input 
                type="text"
                id="cidAssociado"
                name="CIDAssociado"
                value={formData.CIDAssociado}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Pode ser mais de 1"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="intervalo" className="form-label">Intervalo</label>
              <input 
                type="text"
                id="intervalo"
                name="Intervalo"
                value={formData.Intervalo}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
          
          {/* Tabela de Serviços */}
          <div className="servicos-section">
            <div className="section-header">
              <h3>Serviços</h3>
              <button 
                type="button"
                onClick={handleAddServico}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={14} /> Adicionar Serviço
              </button>
            </div>
            
            <table className="servicos-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Dose</th>
                  <th>Dose Total</th>
                  <th>Dias de Aplicação</th>
                  <th>Via de Administração</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {selectedServicos.length > 0 ? (
                  selectedServicos.map(servico => (
                    <tr key={servico.id}>
                      <td>
                        <select 
                          value={servico.Servico_Cod}
                          onChange={(e) => handleServicoChange(servico.id, 'Servico_Cod', e.target.value)}
                          className="form-select"
                        >
                          <option value="">Selecione</option>
                          {servicos.map(s => (
                            <option key={s.id} value={s.codigo}>{s.nome}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text"
                          value={servico.Dose_M}
                          onChange={(e) => handleServicoChange(servico.id, 'Dose_M', e.target.value)}
                          className="form-input"
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          value={servico.Dose_Total}
                          onChange={(e) => handleServicoChange(servico.id, 'Dose_Total', e.target.value)}
                          className="form-input"
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          value={servico.Dias_de_Aplic}
                          onChange={(e) => handleServicoChange(servico.id, 'Dias_de_Aplic', e.target.value)}
                          className="form-input"
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          value={servico.Via_de_Adm}
                          onChange={(e) => handleServicoChange(servico.id, 'Via_de_Adm', e.target.value)}
                          className="form-input"
                        />
                      </td>
                      <td>
                        <button 
                          type="button"
                          onClick={() => handleRemoveServico(servico.id)}
                          className="btn btn-danger btn-sm"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">Nenhum serviço adicionado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="button-group">
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> {isEditing ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
      
      {/* Lista de protocolos */}
      {!isAdding && !isEditing && (
        <div className="protocolos-table-container">
          {filteredProtocolos.length > 0 ? (
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Sigla</th>
                  <th>CID Associado</th>
                  <th>Linha</th>
                  <th>Intervalo</th>
                </tr>
              </thead>
              <tbody>
                {filteredProtocolos.map(protocolo => (
                  <tr 
                    key={protocolo.id}
                    onClick={() => handleRowClick(protocolo)}
                    className={selectedProtocolo?.id === protocolo.id ? 'selected' : ''}
                  >
                    <td>{protocolo.Protocolo_Nome}</td>
                    <td>{protocolo.Protocolo_Sigla}</td>
                    <td>{protocolo.CIDAssociado}</td>
                    <td>{protocolo.Linha}</td>
                    <td>{protocolo.Intervalo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-message">
              {searchTerm ? 'Nenhum protocolo encontrado para esta busca.' : 'Não há protocolos cadastrados.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProtocoloPaciente;