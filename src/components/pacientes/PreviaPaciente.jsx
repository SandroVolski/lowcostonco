import React, { useState } from 'react';
import { usePatient } from '../../context/PatientContext';
import { Search, X, FileText, Calendar, Send, Download } from 'lucide-react';

const PreviaPaciente = () => {
  const { 
    filteredPatients, 
    searchPatients, 
    searchTerm, 
    selectedPatient, 
    selectPatient 
  } = usePatient();
  
  // Estados para prévias simuladas
  const [previas, setPrevias] = useState([
    {
      id: 1,
      paciente: 'Rosani Anita Gabriel',
      operadora: 'Casacaresc',
      data: '15/02/2025',
      protocolo: 'Protocolo A',
      status: 'Autorizada',
      valorTotal: 12879.90
    },
    {
      id: 2,
      paciente: 'Luciano Ferreira',
      operadora: 'Casacaresc',
      data: '18/02/2025',
      protocolo: 'Protocolo B',
      status: 'Aguardando',
      valorTotal: 9542.75
    }
  ]);
  
  const [selectedPrevia, setSelectedPrevia] = useState(null);
  const [itensPrevia, setItensPrevia] = useState([]);
  
  // Função para lidar com a busca
  const handleSearch = (e) => {
    searchPatients(e.target.value);
  };
  
  // Função para limpar a busca
  const handleClearSearch = () => {
    searchPatients('');
  };
  
  // Selecionar paciente
  const handlePatientSelect = (patientId) => {
    selectPatient(patientId);
    
    // Filtrar prévias para o paciente selecionado (simulado)
    const pacienteSelecionado = filteredPatients.find(p => p.id === patientId);
    if (pacienteSelecionado) {
      const previasFiltradas = previas.filter(
        prev => prev.paciente === pacienteSelecionado.Nome
      );
      setPrevias(previasFiltradas.length > 0 ? previasFiltradas : []);
    }
  };
  
  // Selecionar prévia
  const handlePreviaSelect = (previa) => {
    setSelectedPrevia(previa);
    
    // Dados simulados de itens da prévia
    setItensPrevia([
      {
        id: 1,
        codigo: 'MED001',
        descricao: 'Medicamento Oncológico A',
        quantidade: 2,
        valorUnitario: 4235.75,
        valorTotal: 8471.50
      },
      {
        id: 2,
        codigo: 'MED002',
        descricao: 'Medicamento de Suporte B',
        quantidade: 3,
        valorUnitario: 986.30,
        valorTotal: 2958.90
      },
      {
        id: 3,
        codigo: 'TAXA001',
        descricao: 'Taxa de Infusão',
        quantidade: 1,
        valorUnitario: 950.00,
        valorTotal: 950.00
      },
      {
        id: 4,
        codigo: 'MAT001',
        descricao: 'Material para Infusão',
        quantidade: 2,
        valorUnitario: 249.75,
        valorTotal: 499.50
      }
    ]);
  };
  
  // Simulação de envio de prévia
  const handleSendPrevia = () => {
    if (selectedPrevia) {
      alert(`Prévia #${selectedPrevia.id} enviada com sucesso!`);
    }
  };
  
  // Simulação de download de prévia
  const handleDownloadPrevia = () => {
    if (selectedPrevia) {
      alert(`Download da prévia #${selectedPrevia.id} iniciado`);
    }
  };
  
  return (
    <div className="previa-container">
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
        
        {/* Painel de prévias disponíveis */}
        <div className="previas-panel">
          <h3 className="panel-title">Prévias Disponíveis</h3>
          
          {previas.length > 0 ? (
            <div className="previas-list">
              <table className="previas-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Protocolo</th>
                    <th>Status</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {previas.map(previa => (
                    <tr 
                      key={previa.id}
                      className={selectedPrevia?.id === previa.id ? 'selected' : ''}
                      onClick={() => handlePreviaSelect(previa)}
                    >
                      <td>{previa.data}</td>
                      <td>{previa.protocolo}</td>
                      <td>
                        <span className={`status-badge status-${previa.status.toLowerCase()}`}>
                          {previa.status}
                        </span>
                      </td>
                      <td>R$ {previa.valorTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-previas">
              {selectedPatient 
                ? 'Não há prévias para este paciente' 
                : 'Selecione um paciente para ver as prévias disponíveis'}
            </div>
          )}
          
          {/* Botões de ação para prévias */}
          {selectedPrevia && (
            <div className="previa-actions">
              <button 
                className="btn btn-primary" 
                onClick={handleSendPrevia}
              >
                <Send size={16} /> Enviar Prévia
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleDownloadPrevia}
              >
                <Download size={16} /> Download
              </button>
            </div>
          )}
        </div>
        
        {/* Detalhes da prévia selecionada */}
        {selectedPrevia && (
          <div className="previa-details">
            <h3 className="panel-title">
              Detalhes da Prévia
              <span className="previa-id">#{selectedPrevia.id}</span>
            </h3>
            
            <div className="previa-info">
              <div className="info-group">
                <span className="info-label">Paciente:</span>
                <span className="info-value">{selectedPrevia.paciente}</span>
              </div>
              
              <div className="info-group">
                <span className="info-label">Operadora:</span>
                <span className="info-value">{selectedPrevia.operadora}</span>
              </div>
              
              <div className="info-group">
                <span className="info-label">Data:</span>
                <span className="info-value">{selectedPrevia.data}</span>
              </div>
              
              <div className="info-group">
                <span className="info-label">Protocolo:</span>
                <span className="info-value">{selectedPrevia.protocolo}</span>
              </div>
              
              <div className="info-group">
                <span className="info-label">Status:</span>
                <span className={`status-badge status-${selectedPrevia.status.toLowerCase()}`}>
                  {selectedPrevia.status}
                </span>
              </div>
            </div>
            
            <div className="previa-items">
              <h4>Itens da Prévia</h4>
              
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Quantidade</th>
                    <th>Valor Unitário</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itensPrevia.map(item => (
                    <tr key={item.id}>
                      <td>{item.codigo}</td>
                      <td>{item.descricao}</td>
                      <td>{item.quantidade}</td>
                      <td>R$ {item.valorUnitario.toFixed(2)}</td>
                      <td>R$ {item.valorTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="total-label">Total da Prévia:</td>
                    <td className="total-value">R$ {selectedPrevia.valorTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviaPaciente;