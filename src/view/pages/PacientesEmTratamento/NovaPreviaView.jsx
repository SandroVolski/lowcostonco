import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../context/PatientContext';
import { usePrevias } from '../../../context/PreviasContext'; // New import for cache context
import { useToast } from '../../../components/ui/Toast';
import CIDSelection from '../../../components/pacientes/CIDSelection';
import ProtocoloSelection from '../../../components/pacientes/ProtocoloSelection';
import PreviasCacheControl from '../../../components/PreviasCacheControl'; // New import for cache control component

import {
  Search, X, UserPlus, Save, Paperclip, Download, Trash2, Eye,
  Upload, Calendar, BarChart3, Clock, PlusCircle, ChevronDown,
  FilePlus, Clock8, FileText, CheckCircle, AlertCircle, 
  AlertTriangle, HelpCircle, Check, ChevronLeft, ChevronRight,
  File, Info, Database // Added Database icon for cache controls
} from 'lucide-react';
import './NovaPreviaView.css';
// Import previasService as a fallback
import { previasService } from '../../../services/previasService';

const NovaPreviaView = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Using the cache context instead of direct service calls
  const { 
    getPreviasDoPatient, 
    getPrevia, 
    getCiclosDias, 
    getAnexos,
    createPrevia, 
    updatePrevia, 
    uploadAnexo, 
    deleteAnexo,
    refreshDataAfterModification,
    isCacheEnabled,
    dataSource,
    totalRecords,
    loading: previasContextLoading
  } = usePrevias();
  
  // Estados para controle dos modais
  const [showSearchModal, setShowSearchModal] = useState(true);
  const [showWeightDetailPopout, setShowWeightDetailPopout] = useState(false);
  
  // Estado local para o termo de pesquisa
  const [localSearchTerm, setLocalSearchTerm] = useState("");

  // Adicionar estados para controlar carregamento
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loadingSection, setLoadingSection] = useState(false); // Para animação de carregamento nas seções

  const [previewImage, setPreviewImage] = useState(null);

  // Estados para navegação dos botões de atendimento
  const [visibleButtonsStart, setVisibleButtonsStart] = useState(0);
  
  // Novos estados para cache
  //const [showCacheControl, setShowCacheControl] = useState(false);
  //const [cacheRefreshed, setCacheRefreshed] = useState(false);

  const handlePreviewAttachment = (file) => {
    setPreviewImage(file);
  };
  
  // Estados para dados do paciente
  const { 
    patients, 
    searchPatients,  // Certifique-se de que isso esteja aqui
    selectedPatient,
    selectPatient,
    loading: patientContextLoading, // Adicione isto
    pageSize: contextPageSize,     // Adicione isto
    changePage                     // Adicione isto
  } = usePatient();
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);

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
    pesos: [],
    allPesos: [] // Para armazenar todos os pesos
  });
  
  // Estado para a página atual do histórico
  const [currentPage, setCurrentPage] = useState(0);
  
  // Estados para dados de consultas anteriores
  const [previousConsultations, setPreviousConsultations] = useState([]);

  useEffect(() => {
    // When previousConsultations are loaded, set current page to "Novo" 
    // (but only if currentPage is still at the initial value)
    if (previousConsultations.length > 0 && currentPage === 0) {
      // Set to the "Novo" button value
      setCurrentPage(previousConsultations.length + 1);
      
      // Reset the form to a clean state
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
  }, [previousConsultations, currentPage]);
  
  // Estado para controlar data de parecer e calcular tempo
  const [dataParecerRegistrado, setDataParecerRegistrado] = useState(null);
  const [tempoParaAnalise, setTempoParaAnalise] = useState(null);
  
  // Função para mostrar o indicador de atualização do cache
  /*const showCacheRefreshIndicator = () => {
    setCacheRefreshed(true);
    // Esconder após 3 segundos
    setTimeout(() => setCacheRefreshed(false), 3000);
  };*/
  
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
      setSearchResults([]);
      return;
    }
  
    // Debounce para não fazer muitas requisições
    const timer = setTimeout(() => {
      handleSearchPatients(localSearchTerm);
    }, 300);
  
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  const handleSearchPatients = async (term, page = 1) => {
    if (term.trim().length < 2) return;
    
    try {
      setIsSearching(true);
      // Buscar resultados da API
      const results = await searchPatients(term, 'nome', page, 1000);
      
      // Ordenar resultados por relevância
      const sortedResults = [...results].sort((a, b) => {
        const scoreA = calculateRelevanceScore(a, term);
        const scoreB = calculateRelevanceScore(b, term);
        return scoreB - scoreA; // Ordem decrescente de pontuação
      });
      
      // Se estamos carregando a primeira página, substituir completamente
      if (page === 1) {
        setSearchResults(sortedResults);
        setFilteredPatients(sortedResults);
      } else {
        // Se estamos carregando mais páginas, anexar aos resultados existentes
        // e reordenar tudo junto
        const allResults = [...searchResults, ...sortedResults];
        const uniqueResults = removeDuplicates(allResults, 'id');
        
        // Ordenar todos os resultados combinados
        const allSorted = uniqueResults.sort((a, b) => {
          const scoreA = calculateRelevanceScore(a, term);
          const scoreB = calculateRelevanceScore(b, term);
          return scoreB - scoreA;
        });
        
        setSearchResults(allSorted);
        setFilteredPatients(allSorted);
      }
      
      setSearchPage(page);
      setSearchTotalPages(results.totalPages || 1);
      
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar pacientes",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const removeDuplicates = (array, key) => {
    return array.filter((item, index, self) =>
      index === self.findIndex((t) => t[key] === item[key])
    );
  };
  
  const loadMoreResults = async () => {
    if (searchPage >= searchTotalPages) return;
    
    try {
      setIsSearching(true);
      const nextPage = searchPage + 1;
      const moreResults = await searchPatients(localSearchTerm, 'nome', nextPage, 1000);
      
      // Combinar resultados existentes com novos
      const combinedResults = [...searchResults, ...moreResults];
      
      // Remover duplicatas (caso existam)
      const uniqueResults = removeDuplicates(combinedResults, 'id');
      
      // Ordenar por relevância
      const sortedResults = uniqueResults.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a, localSearchTerm);
        const scoreB = calculateRelevanceScore(b, localSearchTerm);
        return scoreB - scoreA;
      });
      
      setSearchResults(sortedResults);
      setFilteredPatients(sortedResults);
      setSearchPage(nextPage);
    } catch (error) {
      console.error("Erro ao carregar mais resultados:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Efeito para carregar histórico do paciente quando um paciente é selecionado
  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient.id);
    }
  }, [selectedPatient]);

  // Modificado para usar o contexto com cache
  const loadPatientData = async (patientId) => {
    setIsLoadingPatient(true);
    try {
      // Buscar as prévias do paciente usando o contexto com cache
      const previas = await getPreviasDoPatient(patientId);
      
      // Atualizar o estado de consultas anteriores
      if (previas && previas.length > 0) {
        setPreviousConsultations(previas);
        
        // Extrair dados para o histórico
        setPatientHistory({
          ultimaAnalise: previas[0]?.data_criacao ? formatDate(new Date(previas[0].data_criacao)) : '',
          quantidadeGuias: previas.length,
          protocolosDiferentes: [...new Set(previas.map(p => p.protocolo))].length,
          pesos: [], // Será populado em loadWeightHistory
          allPesos: [] // Também será populado em loadWeightHistory
        });
        
        // Carregar histórico de pesos
        loadWeightHistory(previas);
      } else {
        // Se não houver prévias, limpar o histórico
        setPatientHistory({
          ultimaAnalise: '',
          quantidadeGuias: 0,
          protocolosDiferentes: 0,
          pesos: [],
          allPesos: []
        });
        setPreviousConsultations([]);
      }
      
      // Exibir indicador de cache se os dados vieram do cache
      //if (dataSource === 'cache') {
      //  showCacheRefreshIndicator();
      //}
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
      // Create weight data from all previas
      const allWeightHistory = previas
        .filter(previa => previa.peso) // filter only those with weight
        .map(previa => ({
          id: previa.id,
          date: formatDateShort(new Date(previa.data_criacao)),
          weight: previa.peso,
          protocolo: previa.protocolo,
          ciclo: previa.ciclo || '',
          dia: previa.dia || '',
          parecer: previa.parecer || '',
          // Store the original date object for sorting
          dateObj: new Date(previa.data_criacao)
        }))
        // Sort by date in ascending order (oldest to newest)
        .sort((a, b) => a.dateObj - b.dateObj);
  
      // Store all the data and show the oldest 5 initially
      setPatientHistory(prev => ({
        ...prev,
        allPesos: allWeightHistory,
        // Show the first 5 (oldest) points instead of most recent
        pesos: allWeightHistory.slice(0, Math.min(5, allWeightHistory.length))
      }));
    } catch (error) {
      console.error("Erro ao carregar histórico de pesos:", error);
    }
  };

  // Função para navegar entre grupos de pesos no gráfico
  const handleWeightHistoryNavigation = (direction) => {
    const { allPesos, pesos } = patientHistory;
    if (!allPesos || allPesos.length <= 5) return;
    
    // Find the first weight currently displayed
    const firstDisplayedIndex = allPesos.findIndex(p => p.id === pesos[0]?.id);
    if (firstDisplayedIndex === -1) return;
    
    if (direction === 'next' && firstDisplayedIndex + 5 < allPesos.length) {
      // Move forward 5 positions or to the end
      const newStartIndex = Math.min(firstDisplayedIndex + 5, allPesos.length - 5);
      setPatientHistory(prev => ({
        ...prev,
        pesos: allPesos.slice(newStartIndex, newStartIndex + 5)
      }));
    } else if (direction === 'prev' && firstDisplayedIndex > 0) {
      // Move back 5 positions or to the beginning
      const newStartIndex = Math.max(firstDisplayedIndex - 5, 0);
      setPatientHistory(prev => ({
        ...prev,
        pesos: allPesos.slice(newStartIndex, newStartIndex + 5)
      }));
    }
  };
  
  // Funções para navegar entre grupos de botões de atendimento
  const navigateButtonsNext = () => {
    setVisibleButtonsStart(prev => 
      Math.min(prev + 3, Math.max(0, previousConsultations.length - 2))
    );
  };

  const navigateButtonsPrev = () => {
    setVisibleButtonsStart(prev => Math.max(0, prev - 3));
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
  
  // Função para formatar data curta (DD/MM/AA)
  function formatDateShort(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(2);
    return `${day}/${month}/${year}`;
  }
  
  const [localPatientId, setLocalPatientId] = useState(null);

  // Função para lidar com a seleção de um paciente
  const handleSelectPatient = (patient) => {
    selectPatient(patient.id);
    setLocalPatientId(patient.id); // Guarda o ID localmente também
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
  
  // Modificado para usar o contexto com cache
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
          
          // Fazer upload do arquivo usando o contexto com cache
          const result = await uploadAnexo(formData.id, file);
          
          // Adicionar o arquivo ao state de anexos
          const newAttachment = {
            id: result.id,
            name: result.nome_arquivo,
            size: result.tamanho,
            type: result.tipo,
            download_url: `https://apiteste.lowcostonco.com.br/backend-php/api/Previas/download_anexo.php?id=${result.id}`
          };
          
          setAttachments(prev => [...prev, newAttachment]);
          
          toast({
            title: "Arquivo enviado",
            description: `${file.name} enviado com sucesso`,
            variant: "success"
          });
          
          // Exibir indicador de cache
          //showCacheRefreshIndicator();
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
  
  // Modificado para usar o contexto com cache
  const handleDeleteAttachment = async (id) => {
    // Verificar se o anexo é do banco de dados ou local
    const isFromDB = typeof id === 'number' && !String(id).includes('.');
    
    if (isFromDB && formData.id) {
      try {
        // Se for do banco, chamar API com contexto para excluir
        await deleteAnexo(id);
        
        setAttachments(prev => prev.filter(file => file.id !== id));
        
        toast({
          title: "Anexo excluído",
          description: "Anexo removido com sucesso",
          variant: "success"
        });
        
        // Exibir indicador de cache
        //showCacheRefreshIndicator();
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
  
  // Modificado para usar o contexto com cache
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

    // ADICIONAR ESTA VERIFICAÇÃO:
    if (!selectedPatient || !selectedPatient.id) {
      toast({
        title: "Erro de dados",
        description: "Não foi possível identificar o paciente selecionado. Por favor, selecione o paciente novamente.",
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
        paciente_id: (selectedPatient && selectedPatient.id) || localPatientId,
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

      console.log("Dados enviados:", dadosPrevia);
      
      let response;
      
      // Determinar se é uma criação ou atualização
      if (formData.id) {
        // Atualizar prévia existente usando o contexto com cache
        response = await updatePrevia(dadosPrevia);
      } else {
        // Criar nova prévia usando o contexto com cache
        response = await createPrevia(dadosPrevia);
        
        // Se a criação for bem-sucedida e tivermos anexos locais, fazer o upload
        if (response.id && attachments.length > 0) {
          for (const attachment of attachments) {
            if (attachment.file) {
              await uploadAnexo(response.id, attachment.file);
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
      // Usando a função do contexto para atualizar dados considerando o cache
      await refreshDataAfterModification(selectedPatient.id);
      await loadPatientData(selectedPatient.id);
      
      // Exibir indicador de cache
      //showCacheRefreshIndicator();
      
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

  // Adicione esta função antes do return do componente NovaPreviaView
  const handleAlturaChange = (e) => {
    // Obtém o valor digitado e remove qualquer caractere não numérico ou ponto
    let value = e.target.value.replace(/[^\d.]/g, '');
    
    // Remove pontos extras (mantém apenas o primeiro ponto)
    if (value.split('.').length > 2) {
      const parts = value.split('.');
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Caso especial: se for um valor como "190" (centímetros)
    if (!value.includes('.') && value.length >= 3 && parseFloat(value) > 3) {
      // Converte de centímetros para metros (ex: 190 -> 1.90)
      value = (parseFloat(value) / 100).toFixed(2);
    } 
    // Se for um valor de 2 dígitos sem ponto, adiciona o ponto após o primeiro dígito
    else if (!value.includes('.') && value.length === 2) {
      value = value.substring(0, 1) + '.' + value.substring(1);
    }
    // Se for um valor de 1 dígito, deixa como está
    
    // Limita a 2 casas decimais
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    
    // Atualiza o estado formData
    setFormData(prev => ({
      ...prev,
      altura: value
    }));
  };
  
  // Modificado para usar o contexto com cache
  const handleLoadPreviousPage = async (pageNumber) => {
    setCurrentPage(pageNumber);
    
    // Verificar se estamos criando um novo atendimento
    if (pageNumber > previousConsultations.length) {
      // Ativar animação de carregamento brevemente para feedback visual
      setLoadingSection(true);
      setTimeout(() => setLoadingSection(false), 300);
      
      // Limpar o formulário para um novo atendimento
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
      return;
    }
    
    // Se não for um novo atendimento, carregar os dados da prévia existente
    try {
      setLoadingSection(true); // Ativar animação de carregamento
      
      // Verificar se temos consultas anteriores
      if (!previousConsultations || previousConsultations.length === 0) {
        throw new Error('Nenhuma consulta anterior disponível');
      }
      
      // Verificar se o índice está dentro dos limites do array
      if (pageNumber <= 0 || pageNumber > previousConsultations.length) {
        throw new Error(`Índice inválido: ${pageNumber}`);
      }
  
      // Acessar com segurança o objeto da consulta
      const consultation = previousConsultations[pageNumber - 1];
      if (!consultation || typeof consultation.id === 'undefined') {
        throw new Error(`Consulta inválida no índice ${pageNumber - 1}`);
      }
  
      // Agora podemos acessar o ID com segurança
      const previaId = consultation.id;
      
      // Calcular o número exibido no botão (mesmo cálculo usado na renderização)
      const numeroExibido = previousConsultations.length - pageNumber + 1;
      
      // Mostrar feedback de carregamento com o número EXIBIDO, não o índice
      toast({
        title: "Carregando atendimento",
        description: `Carregando dados do atendimento ${numeroExibido}...`,
        variant: "default"
      });
      
      // Carregar dados da prévia usando o contexto com cache
      const previaDetails = await getPrevia(previaId);
      const ciclosDias = await getCiclosDias(previaId);
      const anexos = await getAnexos(previaId);
      
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
        cicloDiaEntries: ciclosDias.length > 0 ? ciclosDias : [{ id: 1, ciclo: '', dia: '', protocolo: '' }]
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
      
      // Exibir indicador de cache se os dados vieram do cache
      //if (dataSource === 'cache') {
      //  showCacheRefreshIndicator();
      //}
      
    } catch (error) {
      console.error("Erro ao carregar detalhes da prévia:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do atendimento",
        variant: "destructive"
      });
    } finally {
      setLoadingSection(false); // Desativar animação ao finalizar
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
  
  // Componente de overlay de carregamento
  const LoadingOverlay = ({ isLoading }) => {
    if (!isLoading) return null;
    
    return (
      <motion.div 
        className="absolute inset-0 bg-white bg-opacity-70 z-10 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col items-center">
          <div className="loading-spinner w-12 h-12 border-4 border-t-blue-500 mb-4"></div>
          <p className="text-gray-700 font-medium">Carregando dados...</p>
        </div>
      </motion.div>
    );
  };
  
  // Componente para o gráfico de peso com zoom
  const WeightChart = ({ weightData, allWeightData }) => {
    // Estado para controlar o nível de zoom (1 = zoom mínimo, 10 = zoom máximo)
    const [zoomLevel, setZoomLevel] = useState(5);
    const chartRef = useRef(null);
    
    // Calcular quantos pontos mostrar com base no zoom
    const pointsToShow = useMemo(() => {
      if (!weightData || weightData.length === 0) return [];
      
      // Se não temos todos os dados ou poucos pontos, usar os dados originais
      if (!allWeightData || allWeightData.length <= 5) return weightData;
      
      // Calcular quantos pontos mostrar com base no zoom
      const maxPoints = allWeightData.length;
      const minPoints = Math.min(3, maxPoints);
      const pointsCount = Math.max(
        minPoints,
        Math.floor(maxPoints * (11 - zoomLevel) / 10)
      );
      
      // Centralizar os pontos no meio do dataset
      const midPoint = Math.floor(allWeightData.length / 2);
      const startIndex = Math.max(0, midPoint - Math.floor(pointsCount / 2));
      const endIndex = Math.min(allWeightData.length, startIndex + pointsCount);
      
      return allWeightData.slice(startIndex, endIndex);
    }, [allWeightData, zoomLevel, weightData]);
    
    // Handler para o evento de scroll
    const handleWheel = useCallback((e) => {
      e.preventDefault();
      
      // Aumenta o zoom quando rola para cima, diminui quando rola para baixo
      setZoomLevel(prev => {
        const newZoom = e.deltaY > 0 
          ? Math.max(1, prev - 1) // Diminuir zoom (mais pontos)
          : Math.min(10, prev + 1); // Aumentar zoom (menos pontos)
        return newZoom;
      });
    }, []);
    
    // Adicionar e remover o event listener
    useEffect(() => {
      const currentRef = chartRef.current;
      if (currentRef) {
        currentRef.addEventListener('wheel', handleWheel, { passive: false });
      }
      
      return () => {
        if (currentRef) {
          currentRef.removeEventListener('wheel', handleWheel);
        }
      };
    }, [handleWheel]);
    
    // Se não houver dados, não renderizar o gráfico
    if (!pointsToShow || pointsToShow.length === 0) return null;
    
    // Cálculos para o gráfico
    const maxWeight = Math.max(...pointsToShow.map(d => parseFloat(d.weight || 0))) + 2;
    const minWeight = Math.min(...pointsToShow.map(d => parseFloat(d.weight || 0))) - 2;
    const range = maxWeight - minWeight;
    
    return (
      <div className="chart-container relative" ref={chartRef}>
        {/* Removido o indicador de zoom */}
        
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
            {pointsToShow.slice(0, -1).map((point, index) => {
              const currentWeight = parseFloat(point.weight || 0);
              const nextWeight = parseFloat(pointsToShow[index + 1].weight || 0);
              
              // Calcular posições verticais normalizadas (y cresce para baixo no SVG)
              const y1 = (1 - ((currentWeight - minWeight) / range)) * 100;
              const y2 = (1 - ((nextWeight - minWeight) / range)) * 100;
              
              // Calcular posições horizontais
              const x1 = (index / (pointsToShow.length - 1)) * 100;
              const x2 = ((index + 1) / (pointsToShow.length - 1)) * 100;
              
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
          {pointsToShow.map((point, index) => {
            const weight = parseFloat(point.weight || 0);
            // Calcular posição vertical normalizada
            const normalizedY = 1 - ((weight - minWeight) / range);
            // Calcular posição horizontal baseada no índice
            const x = (index / (pointsToShow.length - 1)) * 100;
            
            return (
              <div 
                key={`point-${point.id}-${index}`}
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
          {pointsToShow.map((point, index) => {
            // Calcular posição horizontal baseada no índice
            const x = (index / (pointsToShow.length - 1)) * 100;
            
            return (
              <div 
                key={`date-${point.id}-${index}`}
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
  
  // Componente para visualização de anexos
  const AttachmentViewer = ({ attachment, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewerType, setViewerType] = useState('iframe'); // iframe ou objectTag
    
    useEffect(() => {
      setLoading(true);
      setError(null);
      
      // Determinar o melhor visualizador com base no tipo de arquivo
      if (attachment && attachment.type === 'application/pdf') {
        // Tentar iframe primeiro, é mais compatível com a maioria dos navegadores
        setViewerType('iframe');
      }
      
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }, [attachment]);
    
    // Função para gerar URLs
    const getViewUrl = (id) => {
      return `https://apiteste.lowcostonco.com.br/backend-php/api/Previas/view_anexo.php?id=${id}`;
    };
    
    const getDownloadUrl = (id) => {
      return `https://apiteste.lowcostonco.com.br/backend-php/api/Previas/download_anexo.php?id=${id}`;
    };
    
    // Manipulação de erros
    const handleViewError = () => {
      if (viewerType === 'iframe') {
        // Se iframe falhou, tentar object tag
        console.log("Iframe falhou, tentando object tag");
        setViewerType('objectTag');
      } else {
        // Se ambos falharam, mostrar erro
        setError("Não foi possível visualizar este documento. Tente fazer download.");
      }
      setLoading(false);
    };
    
    // Renderizar conteúdo com base no tipo de arquivo
    const renderContent = () => {
      if (!attachment) return null;
      
      // URL para visualização
      const viewUrl = getViewUrl(attachment.id);
      const downloadUrl = getDownloadUrl(attachment.id);
      
      console.log("Tentando visualizar:", viewUrl);
      
      // Para imagens
      if (attachment.type && attachment.type.startsWith('image/')) {
        return (
          <div className="flex justify-center">
            <img 
              src={viewUrl} 
              alt={attachment.name}
              className="max-w-full max-h-[70vh] object-contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError("Não foi possível carregar esta imagem.");
              }}
            />
          </div>
        );
      }
      
      // Para PDFs
      if (attachment.type === 'application/pdf') {
        if (viewerType === 'iframe') {
          return (
            <div className="w-full h-[70vh]">
              <iframe
                src={viewUrl}
                className="w-full h-full border-0"
                title={attachment.name}
                onLoad={() => setLoading(false)}
                onError={handleViewError}
              />
            </div>
          );
        } else {
          return (
            <div className="w-full h-[70vh]">
              <object
                data={viewUrl}
                type="application/pdf"
                className="w-full h-full border-0"
                title={attachment.name}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError("Não foi possível visualizar este PDF.");
                }}
              >
                <div className="p-4 text-center">
                  <p>Seu navegador não consegue exibir PDFs diretamente.</p>
                  <a 
                    href={downloadUrl} 
                    download={attachment.name}
                    className="mt-4 inline-block py-2 px-4 bg-blue-500 text-white rounded"
                  >
                    Baixar arquivo
                  </a>
                </div>
              </object>
            </div>
          );
        }
      }
      
      // Para outros tipos de arquivo
      return (
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <File size={64} className="text-gray-400 mb-4" />
          <p className="text-lg font-medium">{attachment.name}</p>
          <p className="text-sm text-gray-500 mb-4">
            Este tipo de arquivo ({attachment.type || 'desconhecido'}) não pode ser visualizado diretamente.
          </p>
          <a 
            href={downloadUrl} 
            download={attachment.name}
            className="py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Baixar arquivo
          </a>
        </div>
      );
    };
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg w-11/12 max-w-4xl overflow-hidden relative">
          {/* Cabeçalho */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium truncate max-w-[80%]">
              {attachment?.name || 'Visualizar anexo'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Corpo */}
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                <div className="loading-spinner w-12 h-12 border-4 border-t-blue-500"></div>
              </div>
            )}
            
            {error ? (
              <div className="flex flex-col items-center justify-center p-8">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <p className="text-red-600 text-center">{error}</p>
                
                <a
                  href={attachment?.id ? getDownloadUrl(attachment.id) : '#'}
                  download={attachment?.name}
                  className="mt-4 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Baixar o arquivo
                </a>
              </div>
            ) : (
              <div className="p-4">
                {renderContent()}
              </div>
            )}
          </div>
          
          {/* Rodapé */}
          <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {attachment?.size && <span className="mr-4">Tamanho: {attachment.size}</span>}
              {attachment?.type && <span>Tipo: {attachment.type}</span>}
            </div>
            <div>
              <a
                href={attachment?.id ? getDownloadUrl(attachment.id) : '#'}
                download={attachment?.name}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 inline-flex items-center"
              >
                <Download size={16} className="mr-2" />
                Baixar
              </a>
            </div>
          </div>
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
        // Preservamos os valores de ciclo e dia mesmo no ciclo completo
        const updatedEntry = {
          ...(cicloDiaEntries[0] || { id: 1, ciclo: '', dia: '' }),
          fullCycle: true,
          // Não apagamos mais o valor do dia, apenas ocultamos o campo
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
      { value: "Favorável c/ inconsistência", icon: <AlertCircle size={18} className="text-orange-600" />, color: "bg-orange-100 border-orange-200" },
      { value: "Inconclusivo", icon: <HelpCircle size={18} className="text-yellow-600" />, color: "bg-yellow-100 border-yellow-200" },
      { value: "Desfavorável", icon: <X size={18} className="text-red-600" />, color: "bg-red-100 border-red-200" }
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
      <div className="registro-status-section card relative">
        <AnimatePresence>
          {loadingSection && <LoadingOverlay isLoading={true} />}
        </AnimatePresence>
        
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
          
          {/* Seção de Status de Consistência removida */}
          
          {/* Métricas de tempo de análise */}
          <TempoAnaliseMetrics />
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Check if there's cached form data from protocol registration navigation
    const cachedFormData = localStorage.getItem('previa_form_temp_data');
    
    if (cachedFormData && selectedPatient) {
      try {
        // Parse the cached form data
        const parsedData = JSON.parse(cachedFormData);
        
        // Update the form with the cached data
        setFormData(prev => ({
          ...prev,
          ...parsedData
        }));
        
        console.log('Restored form data from cache after protocol registration');
        
        // Clear the cache after restoration
        localStorage.removeItem('previa_form_temp_data');
      } catch (error) {
        console.error('Failed to restore cached form data:', error);
      }
    }
  }, [selectedPatient]);

  /**
   * Calcula a pontuação de relevância para um paciente com base no termo de busca
   * @param {Object} patient - O objeto do paciente
   * @param {string} searchTerm - O termo de busca
   * @returns {number} Pontuação de relevância (maior = mais relevante)
   */
  const calculateRelevanceScore = (patient, searchTerm) => {
    if (!patient || !searchTerm) return 0;
    
    const term = searchTerm.toLowerCase().trim();
    const name = (patient.Nome || '').toLowerCase();
    const code = (patient.Paciente_Codigo || '').toString().toLowerCase();
    
    // Pontuação inicial
    let score = 0;
    
    // Correspondência exata no nome completo (prioridade máxima)
    if (name === term) {
      score += 1000;
    }
    
    // Correspondência exata no código (alta prioridade)
    if (code === term) {
      score += 900;
    }
    
    // Nome começa com o termo (muito alta prioridade)
    if (name.startsWith(term)) {
      score += 800;
    }
    
    // Correspondência no início de qualquer palavra do nome (alta prioridade)
    const nameParts = name.split(' ');
    if (nameParts.some(part => part.startsWith(term))) {
      score += 700;
    }
    
    // Código começa com o termo (prioridade média-alta)
    if (code.startsWith(term)) {
      score += 600;
    }
    
    // Nome contém o termo como substring (prioridade média)
    if (name.includes(term)) {
      score += 500;
    }
    
    // Código contém o termo como substring (prioridade média-baixa)
    if (code.includes(term)) {
      score += 400;
    }
    
    // Penalidade baseada na diferença de comprimento entre o nome e o termo
    // (para favorecer correspondências mais próximas do tamanho do termo)
    const lengthDifference = Math.abs(name.length - term.length);
    score -= lengthDifference;
    
    return score;
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
              {isSearching && (
                <div className="flex justify-center my-4">
                  <div className="loading-spinner w-8 h-8 border-2 border-t-blue-500"></div>
                </div>
              )}

              {/* Botão para carregar mais resultados */}
              {!isSearching && searchResults.length > 0 && searchPage < searchTotalPages && (
                <button 
                  className="w-full py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 mt-4"
                  onClick={loadMoreResults}
                >
                  Carregar mais resultados
                </button>
              )}
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
      
      {/* Modal de controle de cache 
      {showCacheControl && (
        <PreviasCacheControl 
          onClose={() => setShowCacheControl(false)}
        />
      )}*/}
      
      {/* Indicador de atualização de cache 
      {cacheRefreshed && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in">
          <Database size={16} className="mr-2" />
          <span>Dados atualizados com sucesso</span>
        </div>
      )}*/}
      
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
                  <span className="historico-item-label">Data Última Solicitação:</span>
                  <span className="historico-item-value">{patientHistory.ultimaAnalise}</span>
                </div>
                
                <div className="historico-item">
                  <div className="historico-item-icon">
                    <FilePlus size={18} />
                  </div>
                  <span className="historico-item-label">Quantidade Solicitações:</span>
                  <span className="historico-item-value">{patientHistory.quantidadeGuias}</span>
                </div>
                
                <div className="historico-item">
                  <div className="historico-item-icon">
                    <FileText size={18} />
                  </div>
                  <span className="historico-item-label">Quantidade de Protoc. Diferentes:</span>
                  <span className="historico-item-value">{patientHistory.protocolosDiferentes}</span>
                </div>
              </div>
            </div>
            
            {/* Card com gráfico de peso */}
            <div className="grafico-card">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <h3 className="grafico-title">Histórico de pesos</h3>
                  <div className="relative ml-2 group flex items-center">
                    <Info size={16} className="text-gray-500 cursor-help translate-y-[-13px]" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 w-48 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      Use a roda do mouse para dar zoom no gráfico e visualizar mais detalhes
                    </div>
                  </div>
                </div>
              </div>
              
              <WeightChart 
                weightData={patientHistory.pesos} 
                allWeightData={patientHistory.allPesos}
              />
            </div>
          </div>
          
          {/* Seção de registro */}
          <div className="registro-section card relative">
            <AnimatePresence>
              {loadingSection && <LoadingOverlay isLoading={true} />}
            </AnimatePresence>
            
            <div className="card-header">
              <h3>Registro</h3>
              
              {/* Controle de cache adicionado ao cabeçalho */}
              {/*<button
                onClick={() => setShowCacheControl(true)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center"
                title="Gerenciar Cache"
              >
                <Database size={16} className="text-gray-600 mr-1" />
                <span className="text-xs text-gray-600">Cache</span>
              </button>*/}
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
                  onChange={handleAlturaChange}
                  className="form-input"
                  placeholder="Altura em metros (ex: 1.70)"
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
                          <>
                            <button 
                              className="file-action-button"
                              onClick={() => handlePreviewAttachment(file)}
                              title="Visualizar anexo"
                            >
                              <Eye size={16} />
                            </button>
                            <a 
                              href={file.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-action-button"
                              title="Baixar anexo"
                            >
                              <Download size={16} />
                            </a>
                          </>
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

                  {/* Visualizador de anexos avançado */}
                  {previewImage && (
                    <AttachmentViewer
                      attachment={previewImage}
                      onClose={() => setPreviewImage(null)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Nova seção de Registro de Status */}
          <StatusRegistrationSection />
          
          {/* Footer com paginação e botões de ação */}
          <div className="form-footer">
            <div className="pagination-container flex items-center">
              {/* Seta para esquerda (anterior) */}
              {visibleButtonsStart > 0 && (
                <button 
                  className="pagination-nav-button mr-2"
                  onClick={navigateButtonsPrev}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              
              <div className="pagination flex overflow-hidden relative">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div 
                    key={visibleButtonsStart}
                    className="flex"
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -100, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Botões para atendimentos visíveis em ordem decrescente */}
                    {[...previousConsultations]
                      .slice(visibleButtonsStart, visibleButtonsStart + Math.min(3, previousConsultations.length))
                      .map((consultation, index) => {
                        // Obter o índice real do atendimento (em ordem crescente, onde 1 é o primeiro)
                        const atendimentoNumero = index + visibleButtonsStart + 1;
                        
                        // Calcular o número invertido para exibição
                        const numeroExibido = previousConsultations.length - atendimentoNumero + 1;
                        
                        // Adicionar botão "+ Novo" ao lado do primeiro botão
                        if (index === 0 && visibleButtonsStart === 0) {
                          return (
                            <React.Fragment key={`fragment-${consultation.id}`}>
                              <button 
                                className={`pagination-button bg-green-100 hover:bg-green-200 border-green-300 text-green-800 flex items-center justify-center ${
                                  currentPage === previousConsultations.length + 1 ? 'active' : ''
                                }`}
                                onClick={() => handleLoadPreviousPage(previousConsultations.length + 1)}
                              >
                                <PlusCircle size={14} className="mr-1" />
                                Novo
                              </button>
                              <button 
                                key={consultation.id}
                                className={`pagination-button ${currentPage === atendimentoNumero ? 'active' : ''}`}
                                onClick={() => handleLoadPreviousPage(atendimentoNumero)}
                              >
                                Atend. {numeroExibido}
                              </button>
                            </React.Fragment>
                          );
                        }
                        
                        return (
                          <button 
                            key={consultation.id}
                            className={`pagination-button ${currentPage === atendimentoNumero ? 'active' : ''}`}
                            onClick={() => handleLoadPreviousPage(atendimentoNumero)}
                          >
                            Atend. {numeroExibido}
                          </button>
                        );
                      })
                    }
                  </motion.div>
                </AnimatePresence>
              </div>
              
              {/* Seta para direita (próximo) */}
              {visibleButtonsStart < Math.max(0, previousConsultations.length - 3) && (
                <button 
                  className="pagination-nav-button ml-2"
                  onClick={navigateButtonsNext}
                >
                  <ChevronRight size={20} />
                </button>
              )}
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

      {/* CSS para elementos adicionados */}
      <style jsx>{`
        .pagination-container {
          display: flex;
          align-items: center;
        }
        
        .pagination {
          display: flex;
          overflow: hidden;
          width: auto;
        }
        
        .pagination-button {
          min-width: 72px;
          margin: 0 4px;
          margin-bottom: 25px
        }
        
        .pagination-nav-button {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .pagination-nav-button:hover {
          background-color: #e5e7eb;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
          margin-right: 8px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .zoom-indicator {
          position: absolute;
          top: 5px;
          right: 5px;
          padding: 4px 8px;
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          z-index: 5;
        }
        
        /* Animação para o indicador de atualização do cache */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </motion.div>
  );
};

export default NovaPreviaView;