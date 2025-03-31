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
      {/* Barra de busca para pacientes - Estilizada como na página Serviços */}
      <div className="flex justify-between items-center mb-4">
        <div className="search-bar">
          <button className="pesquisa-icone" title="Clique para pesquisar">
            <Search size={16} />
          </button>
          <input 
            type="text"
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={handleSearch}
            className="pesquisa"
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="clear-search absolute right-2 top-1/2 transform -translate-y-1/2">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Grid com tabela de pacientes e detalhes */}
      <div className="consulta-grid grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lista de pacientes */}
        <div className="patients-list-container md:col-span-1">
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
          <div className="patient-details bg-white rounded-lg shadow md:col-span-2">
            {/* Cabeçalho com dados do paciente */}
            <div className="patient-details-header border-b pb-4 mb-4">
              <h3 className="text-xl font-bold text-[#35524a]">{selectedPatient.Nome}</h3>
              
              <div className="patient-quick-info grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                <div className="quick-info-item">
                  <span className="info-label font-semibold text-sm">Código:</span>
                  <span className="info-value ml-1">{selectedPatient.Paciente_Codigo}</span>
                </div>
                
                <div className="quick-info-item">
                  <span className="info-label font-semibold text-sm">Operadora:</span>
                  <span className="info-value ml-1">{selectedPatient.Operadora}</span>
                </div>
                
                <div className="quick-info-item">
                  <span className="info-label font-semibold text-sm">Prestador:</span>
                  <span className="info-value ml-1">{selectedPatient.Prestador}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => alert("Abrir detalhes completos do paciente")}
                >
                  Abrir Dados do Paciente
                </button>
                
                {selectedPatient.Nascimento && (
                  <div className="patient-age flex items-center text-sm text-gray-600">
                    <Clock size={16} className="inline-icon mr-1" />
                    <span>Idade: {calcularIdade(selectedPatient.Nascimento)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Navegação entre visualizações */}
            <div className="details-nav flex gap-2 mb-4">
              <button 
                className={`details-nav-btn px-3 py-1 rounded flex items-center gap-1 ${detailView === 'historico' ? 'bg-[#c6d651] text-[#35524a]' : 'bg-gray-100'}`}
                onClick={() => setDetailView('historico')}
              >
                <Calendar size={16} />
                <span>Histórico</span>
              </button>
              <button 
                className={`details-nav-btn px-3 py-1 rounded flex items-center gap-1 ${detailView === 'guia' ? 'bg-[#c6d651] text-[#35524a]' : 'bg-gray-100'}`}
                onClick={() => setDetailView('guia')}
              >
                <FileText size={16} />
                <span>Guia/Protocolo</span>
              </button>
              <button 
                className={`details-nav-btn px-3 py-1 rounded flex items-center gap-1 ${detailView === 'ciclo' ? 'bg-[#c6d651] text-[#35524a]' : 'bg-gray-100'}`}
                onClick={() => setDetailView('ciclo')}
              >
                <BarChart3 size={16} />
                <span>CID/Ciclo/Dia</span>
              </button>
            </div>
            
            {/* Conteúdo da visualização selecionada */}
            <div className="details-content p-4 bg-gray-50 rounded">
              {/* Conteúdo específico para cada visualização... */}
              {/* Manter o conteúdo original de cada visualização */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultaPaciente;