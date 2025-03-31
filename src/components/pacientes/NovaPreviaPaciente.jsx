import React, { useState, useEffect } from 'react';
import { usePatient } from '../../context/PatientContext';
import { Search, X, Plus, Trash2, Save, Calculator } from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '../../utils/CustomAlerts';

const NovaPreviaPaciente = () => {
  const { 
    filteredPatients, 
    searchPatients, 
    searchTerm, 
    selectedPatient, 
    selectPatient 
  } = usePatient();
  
  // Estados para a criação da prévia
  const [protocoloSelecionado, setProtocoloSelecionado] = useState('');
  const [dataPrevia, setDataPrevia] = useState('');
  const [itensPrevia, setItensPrevia] = useState([]);
  const [valorTotal, setValorTotal] = useState(0);
  
  // Dados simulados de protocolos disponíveis
  const [protocolosDisponiveis, setProtocolosDisponiveis] = useState([
    { id: 1, nome: 'Protocolo A', descricao: 'Protocolo para câncer de mama' },
    { id: 2, nome: 'Protocolo B', descricao: 'Protocolo para câncer de pulmão' },
    { id: 3, nome: 'Protocolo C', descricao: 'Protocolo para câncer colorretal' }
  ]);
  
  // Dados simulados de medicamentos/serviços disponíveis
  const [servicosDisponiveis, setServicosDisponiveis] = useState([
    { id: 1, codigo: 'MED001', descricao: 'Medicamento Oncológico A', valorUnitario: 4235.75 },
    { id: 2, codigo: 'MED002', descricao: 'Medicamento de Suporte B', valorUnitario: 986.30 },
    { id: 3, codigo: 'TAXA001', descricao: 'Taxa de Infusão', valorUnitario: 950.00 },
    { id: 4, codigo: 'MAT001', descricao: 'Material para Infusão', valorUnitario: 249.75 },
    { id: 5, codigo: 'MED003', descricao: 'Medicamento Oncológico C', valorUnitario: 3875.50 },
    { id: 6, codigo: 'MED004', descricao: 'Medicamento de Suporte D', valorUnitario: 759.90 }
  ]);
  
  // Inicializar data atual
  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setDataPrevia(`${day}/${month}/${year}`);
  }, []);
  
  // Recalcular valor total quando itens mudarem
  useEffect(() => {
    const total = itensPrevia.reduce((sum, item) => sum + item.valorTotal, 0);
    setValorTotal(total);
  }, [itensPrevia]);
  
  // Funções para manipular a busca de pacientes
  const handleSearch = (e) => {
    searchPatients(e.target.value);
  };
  
  const handleClearSearch = () => {
    searchPatients('');
  };
  
  const handlePatientSelect = (patientId) => {
    selectPatient(patientId);
  };
  
  // Função para adicionar item à prévia
  const handleAddItem = () => {
    const newItem = {
      id: Date.now(), // ID temporário baseado no timestamp
      codigo: '',
      descricao: '',
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0
    };
    
    setItensPrevia([...itensPrevia, newItem]);
  };
  
  // Função para remover item da prévia
  const handleRemoveItem = (itemId) => {
    setItensPrevia(itensPrevia.filter(item => item.id !== itemId));
  };
  
  // Função para atualizar item da prévia
  const handleItemChange = (itemId, field, value) => {
    const updatedItems = itensPrevia.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Se o campo for código, buscar informações do serviço
        if (field === 'codigo') {
          const servico = servicosDisponiveis.find(s => s.codigo === value);
          if (servico) {
            updatedItem.descricao = servico.descricao;
            updatedItem.valorUnitario = servico.valorUnitario;
            updatedItem.valorTotal = servico.valorUnitario * updatedItem.quantidade;
          }
        }
        
        // Se for quantidade ou valor unitário, recalcular o valor total
        if (field === 'quantidade' || field === 'valorUnitario') {
          const quantidade = field === 'quantidade' ? value : item.quantidade;
          const valorUnitario = field === 'valorUnitario' ? value : item.valorUnitario;
          updatedItem.valorTotal = quantidade * valorUnitario;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setItensPrevia(updatedItems);
  };
  
  // Função para salvar a prévia
  const handleSavePrevia = () => {
    // Validar se paciente foi selecionado
    if (!selectedPatient) {
      showErrorAlert("Erro", "Selecione um paciente para criar a prévia");
      return;
    }
    
    // Validar se protocolo foi selecionado
    if (!protocoloSelecionado) {
      showErrorAlert("Erro", "Selecione um protocolo para a prévia");
      return;
    }
    
    // Validar se há itens na prévia
    if (itensPrevia.length === 0) {
      showErrorAlert("Erro", "Adicione pelo menos um item à prévia");
      return;
    }
    
    // Validar se todos os itens estão preenchidos corretamente
    const itemInvalido = itensPrevia.find(item => 
      !item.codigo || !item.descricao || !item.quantidade || item.quantidade <= 0
    );
    
    if (itemInvalido) {
      showErrorAlert("Erro", "Preencha corretamente todos os campos dos itens");
      return;
    }
    
    // Simular salvamento da prévia
    showSuccessAlert(
      "Prévia criada com sucesso!", 
      `Prévia para ${selectedPatient.Nome} criada com valor total de R$ ${valorTotal.toFixed(2)}`
    );
    
    // Limpar formulário após salvar
    setProtocoloSelecionado('');
    setItensPrevia([]);
  };
  
  return (
    <div className="nova-previa-container">
      <div className="previa-grid">
        {/* Painel de seleção de paciente */}
        <div className="patient-selection-panel">
          <h3 className="panel-title">Selecionar Paciente</h3>
          
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
          
          <div className="patients-list">
            {filteredPatients.length > 0 ? (
              <ul className="patient-list">
                {filteredPatients.map(patient => (
                  <li 
                    key={patient.id}
                    className={selectedPatient?.id === patient.id ? 'selected' : ''}
                    onClick={() => handlePatientSelect(patient.id)}
                  >
                    <div className="patient-list-item">
                      <span className="patient-name">{patient.Nome}</span>
                      <span className="patient-code">{patient.Paciente_Codigo}</span>
                      <span className="patient-operator">{patient.Operadora}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-patients">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Não há pacientes cadastrados'}
              </div>
            )}
          </div>
        </div>
        
        {/* Formulário da nova prévia */}
        <div className="nova-previa-form">
          <h3 className="panel-title">Nova Prévia</h3>
          
          {selectedPatient ? (
            <div className="previa-form-content">
              <div className="selected-patient-info">
                <h4>Paciente: {selectedPatient.Nome}</h4>
                <div className="patient-details">
                  <div className="detail-item">
                    <span className="detail-label">Código:</span>
                    <span className="detail-value">{selectedPatient.Paciente_Codigo}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Operadora:</span>
                    <span className="detail-value">{selectedPatient.Operadora}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">CID:</span>
                    <span className="detail-value">{selectedPatient.CID || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="data" className="form-label">Data da Prévia</label>
                  <input 
                    type="text"
                    id="data"
                    value={dataPrevia}
                    onChange={(e) => setDataPrevia(e.target.value)}
                    className="form-input"
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="protocolo" className="form-label">Protocolo</label>
                  <select 
                    id="protocolo"
                    value={protocoloSelecionado}
                    onChange={(e) => setProtocoloSelecionado(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Selecione um protocolo</option>
                    {protocolosDisponiveis.map(protocolo => (
                      <option key={protocolo.id} value={protocolo.nome}>
                        {protocolo.nome} - {protocolo.descricao}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Itens da prévia */}
              <div className="previa-items-section">
                <div className="section-header">
                  <h4>Itens da Prévia</h4>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleAddItem}
                  >
                    <Plus size={16} /> Adicionar Item
                  </button>
                </div>
                
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Quantidade</th>
                      <th>Valor Unitário</th>
                      <th>Valor Total</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensPrevia.length > 0 ? (
                      itensPrevia.map(item => (
                        <tr key={item.id}>
                          <td>
                            <select 
                              value={item.codigo}
                              onChange={(e) => handleItemChange(item.id, 'codigo', e.target.value)}
                              className="form-select"
                            >
                              <option value="">Selecione</option>
                              {servicosDisponiveis.map(servico => (
                                <option key={servico.id} value={servico.codigo}>
                                  {servico.codigo}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input 
                              type="text"
                              value={item.descricao}
                              onChange={(e) => handleItemChange(item.id, 'descricao', e.target.value)}
                              className="form-input"
                              readOnly
                            />
                          </td>
                          <td>
                            <input 
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => handleItemChange(item.id, 'quantidade', parseInt(e.target.value) || 0)}
                              className="form-input"
                              min="1"
                            />
                          </td>
                          <td>
                            <input 
                              type="number"
                              value={item.valorUnitario}
                              onChange={(e) => handleItemChange(item.id, 'valorUnitario', parseFloat(e.target.value) || 0)}
                              className="form-input"
                              step="0.01"
                              min="0"
                              readOnly
                            />
                          </td>
                          <td>
                            <input 
                              type="number"
                              value={item.valorTotal}
                              className="form-input"
                              readOnly
                            />
                          </td>
                          <td>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          Nenhum item adicionado. Clique no botão "Adicionar Item" acima.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="total-label">Valor Total da Prévia:</td>
                      <td colSpan="2" className="total-value">R$ {valorTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Botões de ação */}
              <div className="previa-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleSavePrevia}
                  disabled={!selectedPatient || !protocoloSelecionado || itensPrevia.length === 0}
                >
                  <Save size={16} /> Salvar Prévia
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => alert("Abrir calculadora")}
                >
                  <Calculator size={16} /> Calculadora
                </button>
              </div>
            </div>
          ) : (
            <div className="no-patient-selected">
              <p>Selecione um paciente para criar uma nova prévia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovaPreviaPaciente;