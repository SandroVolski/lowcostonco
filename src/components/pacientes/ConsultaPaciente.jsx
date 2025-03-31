import React, { useState } from 'react';
import { usePatient } from '../../context/PatientContext';
import { Search, X, FileText, Calendar, BarChart3, Clock } from 'lucide-react';

const ConsultaPaciente = () => {
  const { 
    filteredPatients, 
    searchPatients, 
    searchTerm, 
    selectedPatient, 
    selectPatient,
    loadPatients
  } = usePatient();
  
  const [detailView, setDetailView] = useState('historico'); // historico, guia, ciclo
  
  // Dados simulados de atendimentos para o paciente selecionado
  const [atendimentos, setAtendimentos] = useState([
    {
      id: 1,
      data: '15/02/2025',
      protocolo: 'Protocolo A',
      ciclo: 3,
      dia: 1,
      guia: 'G12345',
      observacoes: 'Paciente relatou melhora dos sintomas'
    },
    {
      id: 2,
      data: '05/03/2025',
      protocolo: 'Protocolo A',
      ciclo: 3,
      dia: 8,
      guia: 'G12346',
      observacoes: 'Mantido esquema terapêutico'
    }
  ]);
  
  // Estados simulados para dados históricos
  const [historicoAtendimentos, setHistoricoAtendimentos] = useState(8);
  const [dataUltimoAtendimento, setDataUltimoAtendimento] = useState('05/03/2025');
  const [qtdProtocolosDiferentes, setQtdProtocolosDiferentes] = useState(2);
  const [historicoPesos, setHistoricoPesos] = useState([72.5, 72.0, 71.8, 71.5, 71.0]);
  
  // Função para lidar com a busca
  const handleSearch = (e) => {
    searchPatients(e.target.value);
  };
  
  // Função para limpar a busca
  const handleClearSearch = () => {
    searchPatients('');
  };
  
  // Manipular clique na linha de paciente
  const handleRowClick = (patientId) => {
    selectPatient(patientId);
    
    // Simular carregamento de dados históricos para este paciente
    // Em uma implementação real, esses dados viriam do servidor
    setHistoricoAtendimentos(Math.floor(Math.random() * 10) + 5);
    setDataUltimoAtendimento('05/03/2025');
    setQtdProtocolosDiferentes(Math.floor(Math.random() * 3) + 1);
    
    // Gerar dados de peso aleatórios para o gráfico
    const pesos = [];
    const baseWeight = 70 + Math.random() * 10;
    for (let i = 0; i < 5; i++) {
      pesos.push(baseWeight - (Math.random() * i));
    }
    setHistoricoPesos(pesos);
  };
  
  // Calcular idade com base na data de nascimento
  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return '';
    
    // Converter string de data no formato DD/MM/AAAA para objeto Date
    const parts = dataNascimento.split('/');
    if (parts.length !== 3) return '';
    
    const birthDate = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Calcular dias desde o último aniversário
    const lastBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (lastBirthday > today) {
      lastBirthday.setFullYear(lastBirthday.getFullYear() - 1);
    }
    
    const diffTime = Math.abs(today - lastBirthday);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${age} anos, ${diffDays} dias`;
  };
  
  return (
    <div className="consulta-container">
      {/* Barra de busca para pacientes */}
      <div className="search-bar-container">
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
      </div>
      
      {/* Grid com tabela de pacientes e detalhes */}
      <div className="consulta-grid">
        {/* Lista de pacientes */}
        <div className="patients-list-container">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Operadora</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map(patient => (
                  <tr 
                    key={patient.id}
                    onClick={() => handleRowClick(patient.id)}
                    className={selectedPatient?.id === patient.id ? 'selected' : ''}
                  >
                    <td>{patient.Nome}</td>
                    <td>{patient.Paciente_Codigo}</td>
                    <td>{patient.Operadora}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center">
                    {searchTerm ? 'Nenhum paciente encontrado' : 'Não há pacientes cadastrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Detalhes do paciente selecionado */}
        {selectedPatient && (
          <div className="patient-details">
            {/* Cabeçalho com dados do paciente */}
            <div className="patient-details-header">
              <h3>{selectedPatient.Nome}</h3>
              
              <div className="patient-quick-info">
                <div className="quick-info-item">
                  <span className="info-label">Código:</span>
                  <span className="info-value">{selectedPatient.Paciente_Codigo}</span>
                </div>
                
                <div className="quick-info-item">
                  <span className="info-label">Operadora:</span>
                  <span className="info-value">{selectedPatient.Operadora}</span>
                </div>
                
                <div className="quick-info-item">
                  <span className="info-label">Prestador:</span>
                  <span className="info-value">{selectedPatient.Prestador}</span>
                </div>
                
                <div className="quick-info-item">
                  <span className="info-label">CID:</span>
                  <span className="info-value">{selectedPatient.CID}</span>
                </div>
                
                <div className="quick-info-item">
                  <span className="info-label">Sexo:</span>
                  <span className="info-value">{selectedPatient.Sexo}</span>
                </div>
              </div>
              
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => alert("Abrir detalhes completos do paciente")}
              >
                Abrir Dados do Paciente
              </button>
              
              {selectedPatient.Nascimento && (
                <div className="patient-age">
                  <Clock size={16} className="inline-icon" />
                  <span>Idade: {calcularIdade(selectedPatient.Nascimento)}</span>
                </div>
              )}
            </div>
            
            {/* Navegação entre visualizações */}
            <div className="details-nav">
              <button 
                className={`details-nav-btn ${detailView === 'historico' ? 'active' : ''}`}
                onClick={() => setDetailView('historico')}
              >
                <Calendar size={16} />
                <span>Histórico</span>
              </button>
              <button 
                className={`details-nav-btn ${detailView === 'guia' ? 'active' : ''}`}
                onClick={() => setDetailView('guia')}
              >
                <FileText size={16} />
                <span>Guia/Protocolo</span>
              </button>
              <button 
                className={`details-nav-btn ${detailView === 'ciclo' ? 'active' : ''}`}
                onClick={() => setDetailView('ciclo')}
              >
                <BarChart3 size={16} />
                <span>CID/Ciclo/Dia</span>
              </button>
            </div>
            
            {/* Conteúdo da visualização selecionada */}
            <div className="details-content">
              {detailView === 'historico' && (
                <div className="historico-view">
                  <h4>Histórico:</h4>
                  <div className="historico-grid">
                    <div className="historico-item">
                      <span className="historico-label">Quantidade de Atendimentos:</span>
                      <span className="historico-value">{historicoAtendimentos}</span>
                    </div>
                    
                    <div className="historico-item">
                      <span className="historico-label">Data do Último Atendimento:</span>
                      <span className="historico-value">{dataUltimoAtendimento}</span>
                    </div>
                    
                    <div className="historico-item">
                      <span className="historico-label">Qtd. Protocolos Diferentes:</span>
                      <span className="historico-value">{qtdProtocolosDiferentes}</span>
                    </div>
                  </div>
                  
                  {/* Gráfico simples de peso */}
                  <div className="weight-chart">
                    <h5>Histórico de Peso (5 últimos):</h5>
                    <div className="chart-container">
                      {historicoPesos.map((peso, index) => (
                        <div 
                          key={index} 
                          className="chart-bar" 
                          style={{ 
                            height: `${(peso - 60) * 5}px`,
                            backgroundColor: index === 0 ? '#f26b6b' : '#8cb369'
                          }}
                          title={`${peso.toFixed(1)} kg`}
                        >
                          <span className="chart-label">{peso.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {detailView === 'guia' && (
                <div className="guia-view">
                  <h4>Guia/Protocolo:</h4>
                  <table className="atendimentos-table">
                    <thead>
                      <tr>
                        <th>Guia</th>
                        <th>Protocolo</th>
                        <th>Data</th>
                        <th>Ciclo/Dia</th>
                        <th>Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atendimentos.map(atendimento => (
                        <tr key={atendimento.id}>
                          <td>{atendimento.guia}</td>
                          <td>{atendimento.protocolo}</td>
                          <td>{atendimento.data}</td>
                          <td>{atendimento.ciclo}/{atendimento.dia}</td>
                          <td>{atendimento.observacoes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {atendimentos.length === 0 && (
                    <div className="empty-message">
                      Não há atendimentos registrados para este paciente.
                    </div>
                  )}
                </div>
              )}
              
              {detailView === 'ciclo' && (
                <div className="ciclo-view">
                  <h4>CID/Ciclo/Dia:</h4>
                  <div className="ciclo-grid">
                    <div className="ciclo-item">
                      <span className="ciclo-label">CID:</span>
                      <span className="ciclo-value">{selectedPatient.CID}</span>
                    </div>
                    
                    <div className="ciclo-item">
                      <span className="ciclo-label">Indicação Clínica:</span>
                      <span className="ciclo-value">{selectedPatient.Indicao_Clinica || '-'}</span>
                    </div>
                    
                    <div className="ciclo-item">
                      <span className="ciclo-label">Estadiamento:</span>
                      <span className="ciclo-value">
                        T: {selectedPatient.T || '-'}, N: {selectedPatient.N || '-'}, M: {selectedPatient.M || '-'}
                      </span>
                    </div>
                    
                    <div className="ciclo-item">
                      <span className="ciclo-label">Estadio:</span>
                      <span className="ciclo-value">{selectedPatient.Estadio || '-'}</span>
                    </div>
                    
                    <div className="ciclo-item">
                      <span className="ciclo-label">Finalidade:</span>
                      <span className="ciclo-value">{selectedPatient.Finalidade || '-'}</span>
                    </div>
                    
                    <div className="ciclo-item">
                      <span className="ciclo-label">Local das Metástases:</span>
                      <span className="ciclo-value">{selectedPatient.Local_das_Metastases || '-'}</span>
                    </div>
                  </div>
                  
                  {/* Histórico de ciclos (simulado) */}
                  <div className="ciclos-historico">
                    <h5>Histórico de Ciclos:</h5>
                    <table className="ciclos-table">
                      <thead>
                        <tr>
                          <th>Ciclo</th>
                          <th>Início</th>
                          <th>Fim</th>
                          <th>Protocolo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>3</td>
                          <td>15/02/2025</td>
                          <td>08/03/2025</td>
                          <td>Protocolo A</td>
                        </tr>
                        <tr>
                          <td>2</td>
                          <td>15/01/2025</td>
                          <td>08/02/2025</td>
                          <td>Protocolo A</td>
                        </tr>
                        <tr>
                          <td>1</td>
                          <td>15/12/2024</td>
                          <td>08/01/2025</td>
                          <td>Protocolo A</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {/* Área para visualização de registros anteriores */}
            <div className="previous-records">
              <h4>Registros Anteriores:</h4>
              <div className="previous-buttons">
                <button className="previous-btn">Anterior 1</button>
                <button className="previous-btn">Anterior 2</button>
                <button className="previous-btn">Anterior 3</button>
                <button className="previous-btn">Anterior 4</button>
              </div>
              
              <div className="observations-area">
                <label htmlFor="observacoes" className="form-label">Observações:</label>
                <textarea 
                  id="observacoes"
                  className="form-textarea"
                  rows="3"
                  placeholder="Adicionar observações..."
                ></textarea>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultaPaciente;