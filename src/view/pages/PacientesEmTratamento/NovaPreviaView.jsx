import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../context/PatientContext';
import { useToast } from '../../../components/ui/Toast';
import CIDSelection from '../../../components/pacientes/CIDSelection';
import ProtocoloSelection from '../../../components/pacientes/ProtocoloSelection';
import {
  Search, X, UserPlus, Save, Paperclip, Download, Trash2, Eye,
  Upload, Calendar, BarChart3, Clock, PlusCircle, ChevronDown,
  FilePlus, Clock8, FileText, CheckCircle, AlertCircle, 
  AlertTriangle, HelpCircle, Check
} from 'lucide-react';
import './NovaPreviaView.css';
import { previasService } from '../../../services/previasService';

const NovaPreviaView = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Estados para controle dos modais
  const [showSearchModal, setShowSearchModal] = useState(true);
  const [showWeightDetailPopout, setShowWeightDetailPopout] = useState(false);
  
  // Estado local para o termo de pesquisa
  const [localSearchTerm, setLocalSearchTerm] = useState("");

  // Adicionar estados para controlar carregamento
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);

  const handlePreviewAttachment = (file) => {
    setPreviewImage(file);
  };
  
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
    ciclo: '',
    dia: '',
    dataSolicitacao: '',
    parecer: '',
    peso: '',
    altura: '',
    parecerGuia: '',
    inconsistencia: '',
    cicloDiaEntries: [{ id: 1, ciclo: '', dia: '', protocolo: '' }]
  });
  
  // Estado para anexos
  const [attachments, setAttachments] = useState([]);
  
  // Estado para o detalhe do peso
  const [selectedWeightDetail, setSelectedWeightDetail] = useState(null);
  
  // Estado para o histórico do paciente
  const [patientHistory, setPatientHistory] = useState({
    ultimaAnalise: '',
    quantidadeGuias: 0,
    protocolosDiferentes: 0,
    pesos: []
  });
  
  // Estado para a página atual do histórico
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para dados de consultas anteriores
  const [previousConsultations, setPreviousConsultations] = useState([]);
  
  // Estado para controlar data de parecer e calcular tempo
  const [dataParecerRegistrado, setDataParecerRegistrado] = useState(null);
  const [tempoParaAnalise, setTempoParaAnalise] = useState(null);
  
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
      loadPatientData(selectedPatient.id);
    }
  }, [selectedPatient]);

  const loadPatientData = async (patientId) => {
    setIsLoadingPatient(true);
    try {
      // Buscar as prévias do paciente
      const previas = await previasService.getPreviasDoPatient(patientId);
      
      // Atualizar o estado de consultas anteriores
      if (previas && previas.length > 0) {
        setPreviousConsultations(previas);
        
        // Extrair dados para o histórico
        setPatientHistory({
          ultimaAnalise: previas[0]?.data_criacao ? formatDate(new Date(previas[0].data_criacao)) : '',
          quantidadeGuias: previas.length,
          protocolosDiferentes: [...new Set(previas.map(p => p.protocolo))].length,
          pesos: [] // Iremos popular isso depois ao carregar os detalhes
        });
        
        // Carregar histórico de pesos (se necessário)
        loadWeightHistory(previas);
      } else {
        // Se não houver prévias, limpar o histórico
        setPatientHistory({
          ultimaAnalise: '',
          quantidadeGuias: 0,
          protocolosDiferentes: 0,
          pesos: []
        });
        setPreviousConsultations([]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do paciente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico do paciente",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPatient(false);
    }
  };

  const loadWeightHistory = async (previas) => {
    try {
      // Limitamos a 5 prévias para o histórico de pesos
      const recentPrevias = previas.slice(0, 5);
      
      // Criar o array de pesos a partir das prévias
      const weightHistory = recentPrevias.map(previa => ({
        id: previa.id,
        date: formatDateShort(new Date(previa.data_criacao)),
        weight: previa.peso,
        protocolo: previa.protocolo,
        ciclo: previa.ciclo || '',
        dia: previa.dia || '',
        parecer: previa.parecer || ''
      }));
      
      setPatientHistory(prev => ({
        ...prev,
        pesos: weightHistory
      }));
    } catch (error) {
      console.error("Erro ao carregar histórico de pesos:", error);
    }
  };
  
  // Efeito para calcular tempo entre solicitação e parecer
  useEffect(() => {
    if (formData.dataSolicitacao && dataParecerRegistrado) {
      calculateProcessingTime(formData.dataSolicitacao, dataParecerRegistrado);
    }
  }, [formData.dataSolicitacao, dataParecerRegistrado]);
  
  // Função para formatar data
  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Função para converter string de data para objeto Date
  function parseDate(dateString) {
    if (!dateString) return null;
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    return new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
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
          parecer: i === 0 ? 'Paciente demonstrou melhora nos sintomas' : ''
        });
      }
      
      setPatientHistory({
        ultimaAnalise: formatDate(lastDate),
        quantidadeGuias: Math.floor(Math.random() * 10) + 5,
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
          ciclo: Math.floor(i / 2) + 1,
          dia: (i % 7) + 1,
          dataSolicitacao: formatDate(date),
          peso: (65 + Math.random() * 15).toFixed(1),
          altura: (1.6 + Math.random() * 0.3).toFixed(2),
          parecer: i === 0 
            ? 'Paciente com boa resposta ao tratamento, manter esquema terapêutico'
            : 'Seguir protocolo conforme prescrito',
          parecerGuia: ["Favorável", "Desfavorável", "Inconclusivo", "Pendente"][i % 4],
          inconsistencia: ["Completa", "Dados Faltantes", "Requer Análise", "Informações Inconsistentes"][i % 4]
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
  
  // Função para calcular o tempo entre solicitação e parecer
  const calculateProcessingTime = (startDate, endDate) => {
    if (!startDate || !endDate) return;
    
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    if (start && end) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setTempoParaAnalise(diffDays);
      
      // Adicionar ao formData para persistência
      setFormData(prev => ({
        ...prev,
        tempoAnalise: diffDays,
        dataParecerRegistrado: endDate
      }));
    }
  };
  
  // Função para lidar com mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Se está alterando o campo de parecer da guia, registrar a data atual
    if (name === 'parecerGuia' && value && value !== 'Pendente') {
      const currentDate = formatDate(new Date());
      setDataParecerRegistrado(currentDate);
      
      // Calcular o tempo de análise
      calculateProcessingTime(formData.dataSolicitacao, currentDate);
    }
  };
  
  // Função para lidar com upload de arquivos
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Verificar se estamos em modo de edição (prévia existente)
    if (!formData.id) {
      // Se não temos ID, estamos criando uma nova prévia
      // Armazenar os arquivos localmente até salvar a prévia
      const newAttachments = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        file: file // Mantemos o arquivo para upload posterior
      }));
      
      setAttachments(prev => [...prev, ...newAttachments]);
    } else {
      // Se temos ID, podemos fazer upload direto
      for (const file of files) {
        try {
          // Mostrar feedback de carregando
          toast({
            title: "Enviando arquivo",
            description: `Enviando ${file.name}...`,
            variant: "default"
          });
          
          // Fazer upload do arquivo
          const result = await previasService.uploadAnexo(formData.id, file);
          
          // Adicionar o arquivo ao state de anexos
          const newAttachment = {
            id: result.id,
            name: result.nome_arquivo,
            size: result.tamanho,
            type: result.tipo,
            download_url: `/api/previas/download_anexo.php?id=${result.id}`
          };
          
          setAttachments(prev => [...prev, newAttachment]);
          
          toast({
            title: "Arquivo enviado",
            description: `${file.name} enviado com sucesso`,
            variant: "success"
          });
        } catch (error) {
          console.error("Erro ao fazer upload:", error);
          toast({
            title: "Erro no upload",
            description: `Não foi possível enviar ${file.name}`,
            variant: "destructive"
          });
        }
      }
    }
  };
  
  // Função para excluir um anexo
  const handleDeleteAttachment = async (id) => {
    // Verificar se o anexo é do banco de dados ou local
    const isFromDB = typeof id === 'number' && !String(id).includes('.');
    
    if (isFromDB && formData.id) {
      try {
        // Se for do banco, chamar API para excluir
        await previasService.deleteAnexo(id);
        
        setAttachments(prev => prev.filter(file => file.id !== id));
        
        toast({
          title: "Anexo excluído",
          description: "Anexo removido com sucesso",
          variant: "success"
        });
      } catch (error) {
        console.error("Erro ao excluir anexo:", error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o anexo",
          variant: "destructive"
        });
      }
    } else {
      // Se for local, apenas remover do state
      setAttachments(prev => prev.filter(file => file.id !== id));
    }
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
  const handleSavePrevia = async () => {
    // Validar os campos essenciais
    if (!formData.guia || !formData.protocolo || !formData.cid) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha os campos Guia, Protocolo e CID para continuar",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      // Preparar dados para envio
      const dadosPrevia = {
        // Incluir id apenas se estiver editando
        ...(formData.id ? { id: formData.id } : {}),
        paciente_id: selectedPatient.id,
        guia: formData.guia,
        protocolo: formData.protocolo,
        cid: formData.cid,
        data_solicitacao: formData.dataSolicitacao,
        parecer: formData.parecer || '',
        peso: formData.peso ? parseFloat(formData.peso) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        parecer_guia: formData.parecerGuia || '',
        inconsistencia: formData.inconsistencia || '',
        data_parecer_registrado: dataParecerRegistrado || null,
        tempo_analise: tempoParaAnalise || 0,
        ciclos_dias: formData.cicloDiaEntries.map(entry => ({
          ciclo: entry.ciclo || '',
          dia: entry.dia || '',
          protocolo: entry.protocolo || '',
          is_full_cycle: entry.fullCycle ? 1 : 0
        }))
      };
      
      let response;
      
      // Determinar se é uma criação ou atualização
      if (formData.id) {
        // Atualizar prévia existente
        response = await previasService.updatePrevia(dadosPrevia);
      } else {
        // Criar nova prévia
        response = await previasService.createPrevia(dadosPrevia);
        
        // Se a criação for bem-sucedida e tivermos anexos locais, fazer o upload
        if (response.id && attachments.length > 0) {
          for (const attachment of attachments) {
            if (attachment.file) {
              await previasService.uploadAnexo(response.id, attachment.file);
            }
          }
        }
      }
      
      toast({
        title: "Prévia salva",
        description: "A prévia foi salva com sucesso",
        variant: "success"
      });
      
      // Recarregar os dados do paciente para atualizar o histórico
      loadPatientData(selectedPatient.id);
      
      // Se for uma nova prévia, limpar o formulário
      if (!formData.id) {
        // Limpar o formulário ou navegar para outra página
        setFormData({
          guia: '',
          protocolo: '',
          cid: '',
          ciclo: '',
          dia: '',
          dataSolicitacao: formatDate(new Date()),
          parecer: '',
          peso: '',
          altura: '',
          parecerGuia: '',
          inconsistencia: '',
          cicloDiaEntries: [{ id: 1, ciclo: '', dia: '', protocolo: '' }]
        });
        
        setAttachments([]);
        setDataParecerRegistrado(null);
        setTempoParaAnalise(null);
      }
      
      // Opcional: Redirecionar após salvar
      // navigate('/PacientesEmTratamento');
    } catch (error) {
      console.error("Erro ao salvar prévia:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a prévia",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para carregar uma página de consulta anterior
  const handleLoadPreviousPage = async (pageNumber) => {
    setCurrentPage(pageNumber);
    
    // Verificar se temos prévias disponíveis
    if (previousConsultations.length >= pageNumber) {
      const previaId = previousConsultations[pageNumber - 1].id;
      
      try {
        // Carregar detalhes da prévia
        const previaDetails = await previasService.getPrevia(previaId);
        
        // Carregar ciclos/dias associados
        const ciclosDias = await previasService.getCiclosDias(previaId);
        
        // Carregar anexos
        const anexos = await previasService.getAnexos(previaId);
        
        // Atualizar o formulário com os dados carregados
        setFormData({
          id: previaDetails.id,
          paciente_id: previaDetails.paciente_id,
          guia: previaDetails.guia,
          protocolo: previaDetails.protocolo,
          cid: previaDetails.cid,
          ciclo: ciclosDias.length > 0 ? ciclosDias[0].ciclo : '',
          dia: ciclosDias.length > 0 ? ciclosDias[0].dia : '',
          dataSolicitacao: formatDateFromDB(previaDetails.data_solicitacao),
          parecer: previaDetails.parecer,
          peso: previaDetails.peso,
          altura: previaDetails.altura,
          parecerGuia: previaDetails.parecer_guia,
          inconsistencia: previaDetails.inconsistencia,
          cicloDiaEntries: ciclosDias
        });
        
        // Atualizar anexos
        const formattedAnexos = anexos.map(anexo => ({
          id: anexo.id,
          name: anexo.nome_arquivo,
          size: anexo.tamanho,
          type: anexo.tipo,
          download_url: anexo.download_url
        }));
        
        setAttachments(formattedAnexos);
        
        // Configurar data de parecer registrado
        if (previaDetails.data_parecer_registrado) {
          setDataParecerRegistrado(formatDateFromDB(previaDetails.data_parecer_registrado));
          setTempoParaAnalise(previaDetails.tempo_analise);
        } else {
          setDataParecerRegistrado(null);
          setTempoParaAnalise(null);
        }
        
      } catch (error) {
        console.error("Erro ao carregar detalhes da prévia:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes do atendimento",
          variant: "destructive"
        });
      }
    }
  };

  // Função para formatar data do banco para exibição
  const formatDateFromDB = (dbDate) => {
    if (!dbDate) return '';
    
    // Formato esperado do banco: YYYY-MM-DD
    const parts = dbDate.split('-');
    if (parts.length !== 3) return dbDate;
    
    // Converter para DD/MM/YYYY
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
      </div>
    );
  };
  
  // Componente para inputs dinâmicos de Ciclo/Dia
  const CicloDiaInputs = ({ value, onChange }) => {
    // Estado para controlar os múltiplos ciclos/dias
    const [cicloDiaEntries, setCicloDiaEntries] = useState([
      { id: 1, ciclo: '', dia: '', protocolo: '' }
    ]);
    
    // Estado para controlar o tipo de solicitação
    const [requestType, setRequestType] = useState('single'); // 'single', 'multiple', ou 'fullCycle'
    
    // Efeito para inicializar a partir de valores existentes
    useEffect(() => {
      if (value && Array.isArray(value) && value.length > 0) {
        setCicloDiaEntries(value);
        
        // Determinar o tipo de solicitação
        if (value.length > 1) {
          setRequestType('multiple');
        } else if (value.length === 1 && value[0].fullCycle) {
          setRequestType('fullCycle');
        } else {
          setRequestType('single');
        }
      }
    }, [value]);
    
    // Função para adicionar uma nova entrada
    const addEntry = () => {
      const newEntry = {
        id: Date.now(),
        ciclo: '',
        dia: '',
        protocolo: ''
      };
      
      const updatedEntries = [...cicloDiaEntries, newEntry];
      setCicloDiaEntries(updatedEntries);
      
      // Notificar o componente pai
      if (onChange) {
        onChange(updatedEntries);
      }
    };
    
    // Função para remover uma entrada
    const removeEntry = (id) => {
      if (cicloDiaEntries.length <= 1) return;
      
      const updatedEntries = cicloDiaEntries.filter(entry => entry.id !== id);
      setCicloDiaEntries(updatedEntries);
      
      // Notificar o componente pai
      if (onChange) {
        onChange(updatedEntries);
      }
    };
    
    // Função para atualizar uma entrada
    const updateEntry = (id, field, value) => {
      const updatedEntries = cicloDiaEntries.map(entry => {
        if (entry.id === id) {
          return { ...entry, [field]: value };
        }
        return entry;
      });
      
      setCicloDiaEntries(updatedEntries);
      
      // Notificar o componente pai
      if (onChange) {
        onChange(updatedEntries);
      }
    };
    
    // Função para alternar entre ciclos completos ou dias específicos
    const handleRequestTypeChange = (type) => {
      // Primeiro atualizamos o estado de tipo
      setRequestType(type);
      
      // Depois atualizamos as entradas de acordo com o tipo selecionado
      if (type === 'fullCycle') {
        // Manter apenas a primeira entrada e marcar como ciclo completo
        const updatedEntry = {
          ...(cicloDiaEntries[0] || { id: 1, ciclo: '', dia: '' }),
          fullCycle: true,
          dia: '' // Dia não é necessário para ciclo completo
        };
        
        setCicloDiaEntries([updatedEntry]);
        
        // Notificar o componente pai
        if (onChange) {
          onChange([updatedEntry]);
        }
      } else if (type === 'multiple') {
        // Se já temos entradas, mantemos, senão adicionamos uma nova
        if (cicloDiaEntries.length === 1) {
          // Adicionar uma segunda entrada para começar com múltiplos
          const currentEntry = {
            ...cicloDiaEntries[0],
            fullCycle: false
          };
          
          const newEntry = {
            id: Date.now(),
            ciclo: '',
            dia: '',
            protocolo: ''
          };
          
          const updatedEntries = [currentEntry, newEntry];
          setCicloDiaEntries(updatedEntries);
          
          // Notificar o componente pai
          if (onChange) {
            onChange(updatedEntries);
          }
        } else {
          // Remover a flag de ciclo completo
          const updatedEntries = cicloDiaEntries.map(entry => ({
            ...entry,
            fullCycle: false
          }));
          
          setCicloDiaEntries(updatedEntries);
          
          // Notificar o componente pai
          if (onChange) {
            onChange(updatedEntries);
          }
        }
      } else if (type === 'single') {
        // Manter apenas a primeira entrada e remover flag de ciclo completo
        const updatedEntry = {
          ...(cicloDiaEntries[0] || { id: 1, ciclo: '', dia: '' }),
          fullCycle: false
        };
        
        setCicloDiaEntries([updatedEntry]);
        
        // Notificar o componente pai
        if (onChange) {
          onChange([updatedEntry]);
        }
      }
    };
    
    // Função para obter a classe CSS com base no tipo
    const getTypeButtonClass = (type) => {
      return `px-4 py-2 text-sm rounded-md transition-all ${
        requestType === type 
          ? 'bg-[#8cb369] text-white font-medium shadow-md' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`;
    };
    
    return (
      <div className="ciclo-dia-container">
        {/* Header melhorado para Tipo de solicitação */}
        <div className="ciclo-dia-header">
          <h4 className="ciclo-dia-title">Selecione o tipo de solicitação:</h4>
          
          <div className="request-type-selector">
            <button
              type="button"
              className={getTypeButtonClass('single')}
              onClick={() => handleRequestTypeChange('single')}
            >
              <Calendar size={16} className="inline-block mr-2" />
              Dia específico
            </button>
            
            <button
              type="button"
              className={getTypeButtonClass('multiple')}
              onClick={() => handleRequestTypeChange('multiple')}
            >
              <FilePlus size={16} className="inline-block mr-2" />
              Múltiplos dias
            </button>
            
            <button
              type="button"
              className={getTypeButtonClass('fullCycle')}
              onClick={() => handleRequestTypeChange('fullCycle')}
            >
              <Clock size={16} className="inline-block mr-2" />
              Ciclo completo
            </button>
          </div>
        </div>
        
        {/* Mensagem explicativa */}
        <div className="ciclo-dia-explanation">
          {requestType === 'single' && (
            <p>Informe um ciclo e dia específico para esta solicitação.</p>
          )}
          {requestType === 'multiple' && (
            <p>Adicione múltiplos ciclos e dias para esta solicitação.</p>
          )}
          {requestType === 'fullCycle' && (
            <p>Informe o número do ciclo completo a ser solicitado.</p>
          )}
        </div>
        
        {/* Entradas dinâmicas para Ciclo/Dia */}
        <div className="ciclo-dia-entries">
          {cicloDiaEntries.map((entry, index) => (
            <div 
              key={entry.id} 
              className="ciclo-dia-entry"
            >
              <div className="entry-header">
                <h5 className="entry-title">
                  {requestType === 'multiple' 
                    ? `Item ${index + 1}` 
                    : requestType === 'fullCycle'
                    ? 'Ciclo completo'
                    : 'Ciclo e dia'}
                </h5>
                
                {/* Botão para remover entrada (apenas em múltiplos e se tiver mais de um) */}
                {requestType === 'multiple' && cicloDiaEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="entry-remove-button"
                    title="Remover este item"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div className="entry-fields">
                <div className="entry-field">
                  <label className="form-label">Ciclo</label>
                  <input
                    type="text"
                    value={entry.ciclo}
                    onChange={(e) => updateEntry(entry.id, 'ciclo', e.target.value)}
                    className="form-input"
                    placeholder="Ciclo"
                  />
                </div>
                
                {/* Campo de Dia (apenas se não for ciclo completo) */}
                {requestType !== 'fullCycle' && (
                  <div className="entry-field">
                    <label className="form-label">Dia</label>
                    <input
                      type="text"
                      value={entry.dia}
                      onChange={(e) => updateEntry(entry.id, 'dia', e.target.value)}
                      className="form-input"
                      placeholder="Dia"
                    />
                  </div>
                )}
                
                {/* Protocolo associado (apenas em modo múltiplo) */}
                {requestType === 'multiple' && (
                  <div className="entry-field">
                    <label className="form-label">Protocolo</label>
                    <input
                      type="text"
                      value={entry.protocolo}
                      onChange={(e) => updateEntry(entry.id, 'protocolo', e.target.value)}
                      className="form-input"
                      placeholder="(Opcional)"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Botão para adicionar mais entradas (apenas no modo múltiplo) */}
        {requestType === 'multiple' && (
          <button
            type="button"
            onClick={addEntry}
            className="add-entry-button"
          >
            <PlusCircle size={16} />
            <span>Adicionar item</span>
          </button>
        )}
      </div>
    );
  };
  
  // Componente melhorado para registro de status
  const StatusRegistrationSection = () => {
    // Opções para os campos de status
    const parecerGuiaOptions = [
      { value: "Favorável", icon: <Check size={18} className="text-green-600" />, color: "bg-green-100 border-green-200" },
      { value: "Desfavorável", icon: <X size={18} className="text-red-600" />, color: "bg-red-100 border-red-200" },
      { value: "Inconclusivo", icon: <HelpCircle size={18} className="text-yellow-600" />, color: "bg-yellow-100 border-yellow-200" },
      { value: "Pendente", icon: <Clock size={18} className="text-blue-600" />, color: "bg-blue-100 border-blue-200" }
    ];
    
    const inconsistenciaOptions = [
      { value: "Completa", icon: <CheckCircle size={18} className="text-green-600" />, color: "bg-green-50 border-green-200" },
      { value: "Dados Faltantes", icon: <AlertCircle size={18} className="text-orange-600" />, color: "bg-orange-50 border-orange-200" },
      { value: "Requer Análise", icon: <Search size={18} className="text-blue-600" />, color: "bg-blue-50 border-blue-200" },
      { value: "Informações Inconsistentes", icon: <AlertTriangle size={18} className="text-red-600" />, color: "bg-red-50 border-red-200" }
    ];
    
    // Função para lidar com a seleção do status por cartão
    const handleStatusCardSelect = (name, value) => {
      // Simulamos um evento para usar a mesma função de manipulação
      const syntheticEvent = {
        target: {
          name,
          value
        }
      };
      
      handleInputChange(syntheticEvent);
    };
    
    // Componente para exibir métricas de tempo
    const TempoAnaliseMetrics = () => {
      // Definir cores com base no tempo de análise
      const getStatusColor = (dias) => {
        if (dias <= 2) return 'text-green-600 bg-green-100'; // Rápido
        if (dias <= 5) return 'text-yellow-600 bg-yellow-100'; // Médio
        return 'text-red-600 bg-red-100'; // Demorado
      };
      
      if (!dataParecerRegistrado) return null;
      
      return (
        <div className="tempo-analise-metrics">
          <h4 className="status-section-subtitle">Métricas de Tempo</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="metric-item">
              <span className="text-xs text-gray-500">Data Solicitação:</span>
              <span className="block text-sm font-medium">{formData.dataSolicitacao}</span>
            </div>
            
            <div className="metric-item">
              <span className="text-xs text-gray-500">Data Parecer:</span>
              <span className="block text-sm font-medium">{dataParecerRegistrado}</span>
            </div>
          </div>
          
          {tempoParaAnalise !== null && (
            <div className="mt-3 flex items-center justify-between tempo-indicator">
              <div className="flex items-center">
                <Clock8 size={16} className="text-gray-500 mr-2" />
                <span className="text-sm font-medium">Tempo para análise:</span>
              </div>
              
              <div className={`tempo-badge ${getStatusColor(tempoParaAnalise)}`}>
                {tempoParaAnalise} {tempoParaAnalise === 1 ? 'dia' : 'dias'}
              </div>
            </div>
          )}
        </div>
      );
    };
    
    return (
      <div className="registro-status-section card">
        <div className="card-header">
          <h3>Registro de Status</h3>
        </div>
        
        <div className="status-section-content">
          {/* Seleção de Parecer da Guia */}
          <div className="status-section-group">
            <h4 className="status-section-subtitle">Parecer da Guia</h4>
            
            <div className="status-cards-container">
              {parecerGuiaOptions.map(option => (
                <div 
                  key={option.value}
                  className={`status-card ${option.color} ${formData.parecerGuia === option.value ? 'status-card-selected' : ''}`}
                  onClick={() => handleStatusCardSelect('parecerGuia', option.value)}
                >
                  <div className="status-card-icon">
                    {option.icon}
                  </div>
                  <div className="status-card-label">
                    {option.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Seleção de Status de Consistência */}
          <div className="status-section-group">
            <h4 className="status-section-subtitle">Status de Consistência</h4>
            
            <div className="status-cards-container">
              {inconsistenciaOptions.map(option => (
                <div 
                  key={option.value}
                  className={`status-card ${option.color} ${formData.inconsistencia === option.value ? 'status-card-selected' : ''}`}
                  onClick={() => handleStatusCardSelect('inconsistencia', option.value)}
                >
                  <div className="status-card-icon">
                    {option.icon}
                  </div>
                  <div className="status-card-label">
                    {option.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Métricas de tempo de análise */}
          <TempoAnaliseMetrics />
        </div>
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
              
              {selectedWeightDetail.parecer && (
                <div className="detail-item mt-4">
                  <span className="detail-label">Parecer</span>
                  <span className="detail-value">{selectedWeightDetail.parecer}</span>
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
                <span className="info-label-previa">Data Nascimento</span>
                <span className="info-value-previa">{selectedPatient.Nascimento || 'N/A'}</span>
              </div>
              
              <div className="patient-info-item">
                <span className="info-label-previa">Idade Atual</span>
                <div className="flex flex-col items-center">
                  <span className="info-value-previa">{calculateAge()}</span>
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
                  <span className="historico-item-value">{patientHistory.ultimaAnalise}</span>
                </div>
                
                <div className="historico-item">
                  <div className="historico-item-icon">
                    <FilePlus size={18} />
                  </div>
                  <span className="historico-item-label">Quantidade Atendimentos:</span>
                  <span className="historico-item-value">{patientHistory.quantidadeGuias}</span>
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
                <ProtocoloSelection 
                  value={formData.protocolo}
                  onChange={(selectedProtocolo) => {
                    // Se receber um objeto protocolo, extrair o nome
                    if (selectedProtocolo && typeof selectedProtocolo === 'object') {
                      setFormData(prev => ({ 
                        ...prev, 
                        protocolo: selectedProtocolo.nome 
                      }));
                    } else {
                      // Se receber outro formato (string ou null), usar como está
                      setFormData(prev => ({ 
                        ...prev, 
                        protocolo: selectedProtocolo 
                      }));
                    }
                  }}
                  placeholder="Selecione o Protocolo..."
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="cid" className="form-label">CID</label>
                <CIDSelection 
                  value={formData.cid}
                  onChange={(selectedCids) => {
                    if (Array.isArray(selectedCids)) {
                      // Cria uma string com códigos separados por vírgula para o formData
                      const cidString = selectedCids.map(cid => cid.codigo).join(', ');
                      setFormData(prev => ({ ...prev, cid: cidString }));
                      
                      // Ou se preferir armazenar como array de objetos:
                      // setFormData(prev => ({ ...prev, cid: selectedCids }));
                    } else {
                      // Fallback para outros formatos
                      setFormData(prev => ({ ...prev, cid: selectedCids }));
                    }
                  }}
                  patientCID={selectedPatient?.CID || null}
                  placeholder="Selecione o CID..."
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
            
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="peso" className="form-label">Peso (kg)</label>
                <input 
                  type="text"
                  id="peso"
                  name="peso"
                  value={formData.peso}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Peso em kg"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="altura" className="form-label">Altura (m)</label>
                <input 
                  type="text"
                  id="altura"
                  name="altura"
                  value={formData.altura}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Altura em metros"
                />
              </div>
            </div>

            {/* Nova implementação de Ciclo/Dia */}
            <div className="form-field mt-4">
              <label className="form-label">Ciclo / Dia</label>
              <CicloDiaInputs
                value={formData.cicloDiaEntries}
                onChange={(entries) => {
                  setFormData(prev => ({
                    ...prev,
                    cicloDiaEntries: entries,
                    // Opcionalmente, manter os campos simples para compatibilidade com código existente
                    ciclo: entries[0]?.ciclo || '',
                    dia: entries[0]?.dia || ''
                  }));
                }}
              />
            </div>
            
            
            <div className="form-field">
              <label htmlFor="parecer" className="form-label">Parecer</label>
              <textarea 
                id="parecer"
                name="parecer"
                value={formData.parecer}
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
                        {file.download_url && (
                          <a 
                            href={file.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-action-button"
                            title="Baixar anexo"
                          >
                            <Download size={16} />
                          </a>
                        )}
                        {file.type && file.type.startsWith('image/') && file.download_url && (
                          <button 
                            className="file-action-button"
                            onClick={() => handlePreviewAttachment(file)}
                            title="Visualizar imagem"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button 
                          className="file-action-button"
                          onClick={() => handleDeleteAttachment(file.id)}
                          title="Remover anexo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {previewImage && (
                    <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
                      <div className="attachment-preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                          <h3>{previewImage.name}</h3>
                          <button className="close-button" onClick={() => setPreviewImage(null)}>
                            <X size={20} />
                          </button>
                        </div>
                        <div className="modal-body">
                          <img src={previewImage.download_url} alt={previewImage.name} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Nova seção de Registro de Status */}
          <StatusRegistrationSection />
          
          {/* Footer com paginação e botões de ação */}
          <div className="form-footer">
            <div className="pagination">
              {[...Array(Math.max(3, previousConsultations.length))].map((_, index) => (
                <button 
                  key={index}
                  className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                  onClick={() => handleLoadPreviousPage(index + 1)}
                >
                  Atendimento {index + 1}
                </button>
              ))}
            </div>
            
            <div className="button-group">
              <button 
                className="btn-primary-previa" 
                onClick={handleSavePrevia}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NovaPreviaView;