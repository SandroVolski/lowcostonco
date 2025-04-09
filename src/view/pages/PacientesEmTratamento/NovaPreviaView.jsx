import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../context/PatientContext';
import { useToast } from '../../../components/ui/Toast';
import {
  Search, X, UserPlus, Save, Paperclip, Download, Trash2, Eye,
  Upload, Calendar, BarChart3, Clock, PlusCircle, ChevronDown,
  FilePlus, Clock8, FileText
} from 'lucide-react';
import './NovaPreviaView.css';

const NovaPreviaView = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Estados para controle dos modais
  const [showSearchModal, setShowSearchModal] = useState(true);
  const [showWeightDetailPopout, setShowWeightDetailPopout] = useState(false);
  
  // Estado local para o termo de pesquisa
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  
  // Estados para dados do paciente
  const { 
    patients, 
    searchPatients, 
    selectedPatient,
    selectPatient
  } = usePatient();
  
  // Estado para filtragem de pacientes
  const [filteredPatients, setFilteredPatients] = useState([]);
  
  // Estado para os campos do formulário
  const [formData, setFormData] = useState({
    guia: '',
    protocolo: '',
    cid: '',
    cicloDia: '',
    dataSolicitacao: '',
    observacoes: ''
  });
  
  // Estado para anexos
  const [attachments, setAttachments] = useState([]);
  
  // Estado para o detalhe do peso
  const [selectedWeightDetail, setSelectedWeightDetail] = useState(null);
  
  // Estado para o histórico do paciente
  const [patientHistory, setPatientHistory] = useState({
    ultimoAtendimento: '',
    quantidadeAtendimentos: 0,
    protocolosDiferentes: 0,
    pesos: []
  });
  
  // Estado para a página atual do histórico
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para dados de consultas anteriores
  const [previousConsultations, setPreviousConsultations] = useState([]);
  
  // Inicializar data atual para o formulário
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      dataSolicitacao: formatDate(new Date())
    }));
  }, []);
  
  // Efeito para filtrar pacientes quando o termo de busca muda
  useEffect(() => {
    if (localSearchTerm.trim() === '') {
      setFilteredPatients([]);
      return;
    }
    
    // Removida a chamada para searchPatients para evitar o loop infinito
    // searchPatients já altera o estado do contexto, causando rerenderizações
    
    const normalizedSearchTerm = localSearchTerm.toLowerCase();
    const filtered = patients.filter(patient => 
      (patient.Nome && patient.Nome.toLowerCase().includes(normalizedSearchTerm)) ||
      (patient.Paciente_Codigo && String(patient.Paciente_Codigo).includes(normalizedSearchTerm))
    );
    
    setFilteredPatients(filtered);
  }, [localSearchTerm, patients]);
  
  // Efeito para carregar histórico do paciente quando um paciente é selecionado
  useEffect(() => {
    if (selectedPatient) {
      // Simular busca de histórico do paciente
      // Em um caso real, isso seria uma chamada API
      simulateLoadPatientHistory(selectedPatient.id);
      simulateLoadPreviousConsultations(selectedPatient.id);
    }
  }, [selectedPatient]);
  
  // Função para formatar data
  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Função para simular carregamento do histórico do paciente
  const simulateLoadPatientHistory = (patientId) => {
    // Em um ambiente real, isso seria uma chamada API
    setTimeout(() => {
      // Gerar dados simulados de histórico
      const lastDate = new Date();
      lastDate.setDate(lastDate.getDate() - Math.floor(Math.random() * 30));
      
      const weightHistory = [];
      const baseWeight = 70 + Math.random() * 10;
      
      // Gerar histórico de peso para os últimos 5 atendimentos
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 30));
        
        // Peso varia aleatoriamente, mas com tendência a diminuir com o tempo
        const weight = baseWeight - (Math.random() * i);
        
        weightHistory.push({
          id: i + 1,
          date: formatDateShort(date),
          weight: weight.toFixed(1),
          protocolo: `Protocolo ${String.fromCharCode(65 + (i % 3))}`,
          ciclo: Math.floor(i / 2) + 1,
          dia: (i % 7) + 1,
          observacoes: i === 0 ? 'Paciente demonstrou melhora nos sintomas' : ''
        });
      }
      
      setPatientHistory({
        ultimoAtendimento: formatDate(lastDate),
        quantidadeAtendimentos: Math.floor(Math.random() * 10) + 5,
        protocolosDiferentes: Math.floor(Math.random() * 3) + 1,
        pesos: weightHistory
      });
    }, 500);
  };
  
  // Função para formatar data curta (DD/MM/AA)
  function formatDateShort(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(2);
    return `${day}/${month}/${year}`;
  }
  
  // Função para simular carregamento das consultas anteriores
  const simulateLoadPreviousConsultations = (patientId) => {
    // Em um ambiente real, isso seria uma chamada API
    setTimeout(() => {
      const consultations = [];
      
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() - ((i + 1) * 15));
        
        consultations.push({
          id: i + 1,
          guia: `G${Math.floor(10000 + Math.random() * 90000)}`,
          protocolo: `Protocolo ${String.fromCharCode(65 + (i % 3))}`,
          cid: ['C50', 'C34', 'C18'][i % 3],
          cicloDia: `${Math.floor(i / 2) + 1}/${(i % 7) + 1}`,
          dataSolicitacao: formatDate(date),
          observacoes: i === 0 
            ? 'Paciente com boa resposta ao tratamento, manter esquema terapêutico'
            : 'Seguir protocolo conforme prescrito'
        });
      }
      
      setPreviousConsultations(consultations);
    }, 700);
  };
  
  // Função para lidar com a seleção de um paciente
  const handleSelectPatient = (patient) => {
    selectPatient(patient.id);
    setShowSearchModal(false);
  };
  
  // Função para redirecionar para cadastro de novo paciente
  const handleNewPatient = () => {
    navigate('/PacientesEmTratamento?tab=cadastro');
  };
  
  // Função para abrir modal de detalhes do peso
  const handleOpenWeightDetail = (weightData) => {
    setSelectedWeightDetail(weightData);
    setShowWeightDetailPopout(true);
  };
  
  // Função para calcular idade com base na data de nascimento
  const calculateAge = () => {
    if (!selectedPatient?.Nascimento) return '';
    
    // Converter string de data no formato DD/MM/AAAA para objeto Date
    const parts = selectedPatient.Nascimento.split('/');
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
  
  // Função para lidar com mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Função para lidar com upload de arquivos
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Processar cada arquivo
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      file: file
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };
  
  // Função para excluir um anexo
  const handleDeleteAttachment = (id) => {
    setAttachments(prev => prev.filter(file => file.id !== id));
  };
  
  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Função para salvar a prévia
  const handleSavePrevia = () => {
    // Validar os campos essenciais
    if (!formData.guia || !formData.protocolo || !formData.cid) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha os campos Guia, Protocolo e CID para continuar",
        variant: "destructive"
      });
      return;
    }
    
    // Aqui seria a lógica para salvar no banco de dados
    toast({
      title: "Prévia salva",
      description: "A prévia foi salva com sucesso",
      variant: "success"
    });
    
    // Redireciona para a página de consulta após salvar
    // navigate('/PacientesEmTratamento');
  };
  
  // Função para carregar uma página de consulta anterior
  const handleLoadPreviousPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    
    // Carregar dados da consulta anterior
    if (previousConsultations.length >= pageNumber) {
      const previousConsultation = previousConsultations[pageNumber - 1];
      
      // Atualizar o formulário com os dados da consulta anterior
      setFormData(previousConsultation);
    }
  };
  
  // Variantes para animações com Framer Motion
  const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { 
        duration: 0.2 
      }
    }
  };
  
  // Componente para o gráfico de peso
  const WeightChart = ({ weightData }) => {
    if (!weightData || weightData.length === 0) return null;
    
    // Em um caso real, usaríamos uma biblioteca como recharts
    // Este é um gráfico simplificado para visualização
    const maxWeight = Math.max(...weightData.map(d => parseFloat(d.weight))) + 2;
    const minWeight = Math.min(...weightData.map(d => parseFloat(d.weight))) - 2;
    const range = maxWeight - minWeight;
    
    return (
      <div className="chart-container">
        {/* Eixo Y */}
        <div className="y-axis" style={{ position: 'absolute', left: '20px', top: '10px', bottom: '30px', width: '30px' }}>
          <div style={{ position: 'absolute', top: '0', left: '0' }}>{parseFloat(maxWeight).toFixed(1)}</div>
          <div style={{ position: 'absolute', bottom: '0', left: '0' }}>{parseFloat(minWeight).toFixed(1)}</div>
        </div>
        
        {/* Área do gráfico */}
        <div className="chart-area" style={{ position: 'absolute', left: '60px', right: '20px', top: '10px', bottom: '30px', borderLeft: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
          {/* Desenhar SVG com linhas conectando pontos */}
          <svg 
            width="100%" 
            height="100%" 
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          >
            {weightData.slice(0, -1).map((point, index) => {
              const currentWeight = parseFloat(point.weight);
              const nextWeight = parseFloat(weightData[index + 1].weight);
              
              // Calcular posições verticais normalizadas (y cresce para baixo no SVG)
              const y1 = (1 - ((currentWeight - minWeight) / range)) * 100;
              const y2 = (1 - ((nextWeight - minWeight) / range)) * 100;
              
              // Calcular posições horizontais
              const x1 = (index / (weightData.length - 1)) * 100;
              const x2 = ((index + 1) / (weightData.length - 1)) * 100;
              
              return (
                <line
                  key={index}
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="#8cb369"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
          
          {/* Pontos do gráfico */}
          {weightData.map((point, index) => {
            const weight = parseFloat(point.weight);
            // Calcular posição vertical normalizada
            const normalizedY = 1 - ((weight - minWeight) / range);
            // Calcular posição horizontal baseada no índice
            const x = (index / (weightData.length - 1)) * 100;
            
            return (
              <div 
                key={index}
                className="weight-point"
                style={{
                  position: 'absolute',
                  bottom: `calc(${(1 - normalizedY) * 100}% - 6px)`,
                  left: `calc(${x}% - 6px)`,
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#8cb369',
                  border: '2px solid #fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  zIndex: 10
                }}
                onClick={() => handleOpenWeightDetail(point)}
              >
                <div className="weight-tooltip">
                  <div className="weight-tooltip-title">{point.date}</div>
                  <div className="weight-tooltip-content">
                    <span className="weight-tooltip-label">Peso:</span>
                    <span className="weight-tooltip-value">{point.weight} kg</span>
                  </div>
                  <div className="weight-tooltip-content">
                    <span className="weight-tooltip-label">Ciclo/Dia:</span>
                    <span className="weight-tooltip-value">{point.ciclo}/{point.dia}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Eixo X (datas) */}
        <div className="x-axis" style={{ position: 'absolute', left: '60px', right: '20px', bottom: '10px', height: '20px' }}>
          {weightData.map((point, index) => {
            // Calcular posição horizontal baseada no índice
            const x = (index / (weightData.length - 1)) * 100;
            
            return (
              <div 
                key={index}
                style={{
                  position: 'absolute',
                  left: `calc(${x}% - 20px)`,
                  bottom: '0',
                  width: '40px',
                  textAlign: 'center',
                  fontSize: '10px'
                }}
              >
                {point.date}
              </div>
            );
          })}
        </div>
        
        {/* Legenda no canto inferior esquerdo
        <div className="axis-legend">kg/data</div>*/}
      </div>
    );
  };
  
  return (
    <motion.div 
      className="nova-previa-container"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      {/* Botão de buscar novo paciente - agora fixo no canto superior direito, fora do retângulo */}
      {selectedPatient && (
        <button 
          className="search-new-patient"
          onClick={() => setShowSearchModal(true)}
        >
          <Search size={16} />
          Buscar Paciente
        </button>
      )}

      {/* Modal de pesquisa de paciente */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="modal-overlay">
            <motion.div 
              className="patient-search-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h2 className="modal-title-previa">Buscar Paciente</h2>
              <p className="modal-description-previa">
                Digite o nome ou código do paciente para continuar com a Nova Prévia
              </p>
              
              <div className="search-container">
                <Search size={18} className="search-icon" />
                <input 
                  type="text"
                  placeholder="Digite o nome ou código do paciente..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  className="search-input"
                  autoFocus
                />
              </div>
              
              {filteredPatients.length > 0 ? (
                <div className="patient-list">
                  {filteredPatients.map(patient => (
                    <div 
                      key={patient.id} 
                      className="patient-item"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div className="patient-item-name">{patient.Nome}</div>
                      <div className="patient-item-info">
                        Código: {patient.Paciente_Codigo} | 
                        Operadora: {patient.Operadora || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : localSearchTerm ? (
                <p className="text-center text-gray-500 mt-4">
                  Nenhum paciente encontrado com este termo.
                </p>
              ) : null}
              
              <button 
                className="new-patient-button"
                onClick={handleNewPatient}
              >
                <UserPlus size={18} />
                Cadastrar Novo Paciente
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Popout de detalhes do peso */}
      <AnimatePresence>
        {showWeightDetailPopout && selectedWeightDetail && (
          <div className="modal-overlay">
            <motion.div 
              className="weight-detail-popout"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="popout-header">
                <h3 className="popout-title">Detalhes do Atendimento</h3>
                <button 
                  className="close-button"
                  onClick={() => setShowWeightDetailPopout(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="detail-content">
                <div className="detail-item">
                  <span className="detail-label">Data</span>
                  <span className="detail-value">{selectedWeightDetail.date}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Peso</span>
                  <span className="detail-value">{selectedWeightDetail.weight} kg</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Protocolo</span>
                  <span className="detail-value">{selectedWeightDetail.protocolo}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Ciclo/Dia</span>
                  <span className="detail-value">{selectedWeightDetail.ciclo}/{selectedWeightDetail.dia}</span>
                </div>
              </div>
              
              {selectedWeightDetail.observacoes && (
                <div className="detail-item mt-4">
                  <span className="detail-label">Observações</span>
                  <span className="detail-value">{selectedWeightDetail.observacoes}</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Conteúdo principal (visível após selecionar um paciente) */}
      {selectedPatient && (
        <div className="nova-previa-grid">
          {/* Cabeçalho com informações do paciente */}
          <div className="patient-header">
            <div className="patient-name-container">
              <h2 className="patient-name">{selectedPatient.Nome}</h2>
            </div>
            
            <div className="patient-info">
              <div className="patient-info-item">
                <span className="info-label-previa">Código</span>
                <span className="info-value-previa">{selectedPatient.Paciente_Codigo || 'N/A'}</span>
              </div>
              
              <div className="patient-info-item">
                <span className="info-label-previa">Operadora</span>
                <span className="info-value-previa">{selectedPatient.Operadora || 'N/A'}</span>
              </div>
              
              <div className="patient-info-item">
                <span className="info-label-previa">Prestador</span>
                <span className="info-value-previa">{selectedPatient.Prestador_Nome_Fantasia || 'N/A'}</span>
              </div>
              
              <div className="patient-info-item">
                <span className="info-label-previa">Nascimento</span>
                <div className="flex flex-col items-center">
                  <span className="info-value-previa">{selectedPatient.Nascimento || 'N/A'}</span>
                  {selectedPatient.Nascimento && (
                    <button className="age-calculator mt-2" title="Calcular idade">
                      <Clock8 size={14} />
                      {calculateAge()}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Seção de histórico e gráfico */}
          <div className="historico-section">
            {/* Card com dados históricos */}
            <div className="historico-card">
              <h3 className="historico-title">Histórico:</h3>
              
              <div className="historico-content">
                <div className="historico-item">
                  <div className="historico-item-icon">
                    <Calendar size={18} />
                  </div>
                  <span className="historico-item-label">Data Último Atendimento:</span>
                  <span className="historico-item-value">{patientHistory.ultimoAtendimento}</span>
                </div>
                
                <div className="historico-item">
                  <div className="historico-item-icon">
                    <FilePlus size={18} />
                  </div>
                  <span className="historico-item-label">Quantidade Atendimentos:</span>
                  <span className="historico-item-value">{patientHistory.quantidadeAtendimentos}</span>
                </div>
                
                <div className="historico-item">
                  <div className="historico-item-icon">
                    <FileText size={18} />
                  </div>
                  <span className="historico-item-label">Quantidade Protoc. Diferentes:</span>
                  <span className="historico-item-value">{patientHistory.protocolosDiferentes}</span>
                </div>
              </div>
            </div>
            
            {/* Card com gráfico de peso */}
            <div className="grafico-card">
              <h3 className="grafico-title">Histórico dos últimos 5 pesos</h3>
              <WeightChart weightData={patientHistory.pesos} />
            </div>
          </div>
          
          {/* Seção de registro */}
          <div className="registro-section card">
            <div className="card-header">
              <h3>Registro</h3>
            </div>
            
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="guia" className="form-label">Guia</label>
                <input 
                  type="text"
                  id="guia"
                  name="guia"
                  value={formData.guia}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Número da guia"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="protocolo" className="form-label">Protocolo</label>
                <input 
                  type="text"
                  id="protocolo"
                  name="protocolo"
                  value={formData.protocolo}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Protocolo"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="cid" className="form-label">CID</label>
                <input 
                  type="text"
                  id="cid"
                  name="cid"
                  value={formData.cid}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="CID"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="cicloDia" className="form-label">Ciclo/Dia</label>
                <input 
                  type="text"
                  id="cicloDia"
                  name="cicloDia"
                  value={formData.cicloDia}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Ciclo/Dia"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="dataSolicitacao" className="form-label">Data Solicitação</label>
                <input 
                  type="text"
                  id="dataSolicitacao"
                  name="dataSolicitacao"
                  value={formData.dataSolicitacao}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="DD/MM/AAAA"
                />
              </div>
            </div>
            
            <div className="form-field">
              <label htmlFor="observacoes" className="form-label">Observações...</label>
              <textarea 
                id="observacoes"
                name="observacoes"
                value={formData.observacoes}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Adicione observações sobre o atendimento..."
              />
            </div>
            
            {/* Seção para anexos */}
            <div className="form-field mt-4">
              <label className="form-label">Anexos</label>
              <div 
                className="attachment-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={24} color="#8cb369" />
                <span className="attachment-text">
                  Clique para adicionar arquivos ou arraste e solte aqui
                </span>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  style={{ display: 'none' }}
                />
              </div>
              
              {/* Lista de arquivos anexados */}
              {attachments.length > 0 && (
                <div className="attachment-preview">
                  {attachments.map(file => (
                    <div key={file.id} className="attachment-file">
                      <div className="file-info">
                        <Paperclip size={16} />
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{file.size}</span>
                      </div>
                      <div className="file-actions">
                        <button 
                          className="file-action-button"
                          onClick={() => handleDeleteAttachment(file.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer com paginação e botões de ação */}
          <div className="form-footer">
            <div className="pagination">
              {[...Array(Math.max(3, previousConsultations.length))].map((_, index) => (
                <button 
                  key={index}
                  className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                  onClick={() => handleLoadPreviousPage(index + 1)}
                >
                  Anterior {index + 1}
                </button>
              ))}
            </div>
            
            <div className="button-group">
              <button className="btn-primary-previa" onClick={handleSavePrevia}>
                <Save size={18} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NovaPreviaView;