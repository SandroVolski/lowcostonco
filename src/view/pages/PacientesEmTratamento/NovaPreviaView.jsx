import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePatient } from '../../../context/PatientContext';
import { usePrevias } from '../../../context/PreviasContext'; // New import for cache context
import { useToast } from '../../../components/ui/Toast';
import CIDSelection from '../../../components/pacientes/CIDSelection';
import ProtocoloSelection from '../../../components/pacientes/ProtocoloSelection';
import PreviasCacheControl from '../../../components/PreviasCacheControl'; // New import for cache control component
import { useAuth } from '../../../auth/AuthProvider';

import {
  Search, X, UserPlus, Save, Paperclip, Download, Trash2, Eye,
  Upload, Calendar, BarChart3, Clock, PlusCircle, ChevronDown,
  FilePlus, Clock8, FileText, CheckCircle, AlertCircle, 
  AlertTriangle, HelpCircle, Check, ChevronLeft, ChevronRight,
  File, Info, Database, User, Plus // ADICIONAR Plus AQUI
} from 'lucide-react';
import './NovaPreviaView.css';
// Import previasService as a fallback
import { previasService } from '../../../services/previasService';

const StatusRegistrationSection = ({ 
  formData, 
  handleInputChange, 
  selectedPatient: currentPatient, 
  currentPage, 
  loadingSection, 
  dataParecerRegistrado, 
  tempoParaAnalise 
}) => {
  // Opções para os campos de status (mesmas para ambos os campos)
  const statusOptions = [
    { value: "Favorável", icon: <Check size={18} className="text-green-600" />, color: "bg-green-100 border-green-200" },
    { value: "Favorável com Inconsistência", icon: <AlertCircle size={18} className="text-orange-600" />, color: "bg-orange-100 border-orange-200" },
    { value: "Inconclusivo", icon: <HelpCircle size={18} className="text-yellow-600" />, color: "bg-yellow-100 border-yellow-200" },
    { value: "Desfavorável", icon: <X size={18} className="text-red-600" />, color: "bg-red-100 border-red-200" }
  ];
  
  // LIMITE MÁXIMO DE REGISTROS
  const MAX_REGISTROS = 5;
  
  // Função para calcular diferença de dias entre duas datas
  const calculateDaysDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    
    const parseDate = (dateString) => {
      if (!dateString) return null;
      const parts = dateString.split('/');
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    };
    
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    if (start && end) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    
    return null;
  };
  
  // Função para formatar data atual no formato DD/MM/YYYY
  const getCurrentDateFormatted = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Função para lidar com a seleção do status por cartão
  const handleStatusCardSelect = (name, value) => {
    const syntheticEvent = {
      target: { name, value }
    };
    handleInputChange(syntheticEvent);
  };

  // Função para adicionar novo registro
  const handleAddParecerRegistro = () => {
    if (formData.parecerRegistros.length >= MAX_REGISTROS) {
      alert(`Limite máximo de ${MAX_REGISTROS} registros de parecer atingido.`);
      return;
    }
    
    const currentScrollPosition = window.scrollY;
    
    const newId = Math.max(...formData.parecerRegistros.map(r => r.id), 0) + 1;
    const newRegistro = {
      id: newId,
      parecer: '',
      parecerGuia: '',
      finalizacao: '',
      dataSolicitacao: formData.dataSolicitacao || '', // Data vem do formulário principal
      dataParecer: '',
      tempoAnalise: null,
      observacoes: ''
    };

    const syntheticEvent = {
      target: {
        name: 'parecerRegistros',
        value: [...formData.parecerRegistros, newRegistro]
      }
    };
    
    handleInputChange(syntheticEvent);
    
    setTimeout(() => {
      window.scrollTo(0, currentScrollPosition);
    }, 0);
  };

  const handleRemoveParecerRegistro = (registroId) => {
    if (formData.parecerRegistros.length <= 1) {
      return;
    }

    const updatedRegistros = formData.parecerRegistros.filter(r => r.id !== registroId);
    
    const syntheticEvent = {
      target: {
        name: 'parecerRegistros',
        value: updatedRegistros
      }
    };
    
    handleInputChange(syntheticEvent);
  };

  // CORREÇÃO PRINCIPAL: Função para alterar dados do registro
  const handleParecerRegistroChange = (registroId, field, value) => {
    console.log(`🔧 Alterando registro ${registroId}, campo ${field}, valor:`, value);
    
    const updatedRegistros = formData.parecerRegistros.map(registro => {
      if (registro.id === registroId) {
        const updatedRegistro = { 
          ...registro, 
          [field]: value 
        };
        
        // NOVO: Lógica para calcular tempo de análise automaticamente
        if (field === 'dataParecer' && value) {
          const dataSolicitacao = registro.dataSolicitacao || formData.dataSolicitacao;
          if (dataSolicitacao) {
            const tempoCalculado = calculateDaysDifference(dataSolicitacao, value);
            updatedRegistro.tempoAnalise = tempoCalculado;
          }
        }
        
        // NOVO: Quando finalização é preenchida, auto-preencher data do parecer se vazia
        if (field === 'finalizacao' && value && !registro.dataParecer) {
          const currentDate = getCurrentDateFormatted();
          updatedRegistro.dataParecer = currentDate;
          
          // Calcular tempo de análise
          const dataSolicitacao = registro.dataSolicitacao || formData.dataSolicitacao;
          if (dataSolicitacao) {
            const tempoCalculado = calculateDaysDifference(dataSolicitacao, currentDate);
            updatedRegistro.tempoAnalise = tempoCalculado;
          }
        }
        
        console.log(`✅ Registro ${registroId} atualizado:`, updatedRegistro);
        return updatedRegistro;
      }
      return registro;
    });

    console.log("📋 Todos os registros atualizados:", updatedRegistros);

    const syntheticEvent = {
      target: {
        name: 'parecerRegistros',
        value: updatedRegistros
      }
    };
    
    handleInputChange(syntheticEvent);
  };

  // Função específica para status cards
  const handleStatusCardSelectForRegistro = (registroId, field, value) => {
    console.log(`🎯 Selecionando ${field} = ${value} para registro ${registroId}`);
    handleParecerRegistroChange(registroId, field, value);
  };

  // NOVA: Função para aplicar máscara de data
  const applyDateMask = (value) => {
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.substring(0, 8);
    
    if (limitedNumbers.length <= 2) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 4) {
      return `${limitedNumbers.substring(0, 2)}/${limitedNumbers.substring(2)}`;
    } else {
      return `${limitedNumbers.substring(0, 2)}/${limitedNumbers.substring(2, 4)}/${limitedNumbers.substring(4)}`;
    }
  };

  // NOVA: Handler para campos de data com máscara
  const handleDateChange = (registroId, value) => {
    const maskedValue = applyDateMask(value);
    handleParecerRegistroChange(registroId, 'dataParecer', maskedValue);
  };

  // Componente para exibir métricas de tempo
  const TempoAnaliseMetrics = ({ registro }) => {
    const getStatusColor = (dias) => {
      if (dias <= 2) return 'text-green-600 bg-green-100';
      if (dias <= 5) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    };
    
    const dataSolicitacao = registro.dataSolicitacao || formData.dataSolicitacao;
    
    if (!dataSolicitacao) return null;
    
    return (
      <div className="tempo-analise-metrics">
        <h4 className="status-section-subtitle">Métricas de Tempo</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="metric-item">
            <span className="text-xs text-gray-500">Data Solicitação:</span>
            <span className="block text-sm font-medium">{dataSolicitacao}</span>
          </div>
          
          <div className="metric-item">
            <span className="text-xs text-gray-500">Data Parecer:</span>
            <span className="block text-sm font-medium">{registro.dataParecer || 'Não informado'}</span>
          </div>
        </div>
        
        {registro.tempoAnalise !== null && registro.tempoAnalise !== undefined && (
          <div className="mt-3 flex items-center justify-between tempo-indicator">
            <div className="flex items-center">
              <Clock8 size={16} className="text-gray-500 mr-2" />
              <span className="text-sm font-medium">Tempo para análise:</span>
            </div>
            
            <div className={`tempo-badge ${getStatusColor(registro.tempoAnalise)}`}>
              {registro.tempoAnalise} {registro.tempoAnalise === 1 ? 'dia' : 'dias'}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Componente para renderizar um registro individual
  const ParecerRegistroItem = ({ registro, index }) => {
    console.log(`📝 Renderizando registro ${registro.id}:`, registro);
    
    return (
      <div className="parecer-registro-item border border-gray-200 rounded-lg p-4 mb-4 bg-white">
        {/* Cabeçalho do registro */}
        <div className="flex justify-between items-center mb-4">
          <h4 className="status-section-subtitle flex items-center">
            <FileText size={16} className="mr-2" />
            Registro de Parecer #{index + 1}
            <span className="ml-2 text-xs text-gray-500">
              ({index + 1}/{MAX_REGISTROS})
            </span>
          </h4>
          
          {formData.parecerRegistros.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemoveParecerRegistro(registro.id)}
              className="text-red-500 hover:text-red-700 p-1 rounded"
              title="Remover este registro"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* SEÇÃO: Parecer Técnico - CORRIGIDA */}
        <div className="status-section-group mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Parecer Técnico</h5>
          <div className="form-field">
            <textarea 
              value={registro.parecer || ''}
              onChange={(e) => {
                // CORREÇÃO: Usar handleParecerRegistroChange diretamente
                handleParecerRegistroChange(registro.id, 'parecer', e.target.value);
              }}
              className="form-textarea w-full"
              placeholder="Digite o parecer técnico detalhado sobre a análise da solicitação..."
              rows="3"
              style={{
                minHeight: '80px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
          </div>
        </div>

        {/* SEÇÃO: Parecer da Guia - CORRIGIDA (removido debug text) */}
        <div className="status-section-group mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Parecer da Guia</h5>
          
          <div className="status-cards-container">
            {statusOptions.map(option => {
              const isSelected = registro.parecerGuia === option.value;
              
              return (
                <div 
                  key={`parecer-${registro.id}-${option.value}`}
                  className={`status-card ${option.color} ${isSelected ? 'status-card-selected' : ''}`}
                  onClick={() => {
                    console.log(`🖱️ Clicando em ${option.value} para registro ${registro.id}`);
                    handleStatusCardSelectForRegistro(registro.id, 'parecerGuia', option.value);
                  }}
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #8cb369' : '2px solid transparent'
                  }}
                >
                  <div className="status-card-icon">
                    {option.icon}
                  </div>
                  <div className="status-card-label">
                    {option.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* SEÇÃO: Finalização - CORRIGIDA (removido debug text) */}
        <div className="status-section-group mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Finalização</h5>
          
          <div className="status-cards-container">
            {statusOptions.map(option => {
              const isSelected = registro.finalizacao === option.value;
              
              return (
                <div 
                  key={`finalizacao-${registro.id}-${option.value}`}
                  className={`status-card ${option.color} ${isSelected ? 'status-card-selected' : ''}`}
                  onClick={() => {
                    console.log(`🖱️ Clicando em Finalização ${option.value} para registro ${registro.id}`);
                    handleStatusCardSelectForRegistro(registro.id, 'finalizacao', option.value);
                  }}
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #8cb369' : '2px solid transparent'
                  }}
                >
                  <div className="status-card-icon">
                    {option.icon}
                  </div>
                  <div className="status-card-label">
                    {option.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NOVA SEÇÃO: Campos de Data */}
        <div className="status-section-group mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Datas e Tempo de Análise</h5>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="form-field">
              <label className="form-label text-xs">Data Solicitação</label>
              <input
                type="text"
                value={registro.dataSolicitacao || formData.dataSolicitacao || ''}
                readOnly
                className="form-input bg-gray-100 text-gray-600 cursor-not-allowed"
                placeholder="DD/MM/AAAA"
                style={{
                  backgroundColor: '#f9fafb',
                  color: '#6b7280'
                }}
              />
              <span className="text-xs text-gray-500 mt-1">Preenchido automaticamente</span>
            </div>
            
            <div className="form-field">
              <label className="form-label text-xs">Data Parecer</label>
              <input
                type="text"
                value={registro.dataParecer || ''}
                onChange={(e) => handleDateChange(registro.id, e.target.value)}
                className="form-input"
                placeholder="DD/MM/AAAA"
                maxLength="10"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #d1d5db'
                }}
              />
              <span className="text-xs text-gray-500 mt-1">Preenchido automaticamente ao finalizar</span>
            </div>
          </div>
        </div>
        
        {/* Métricas de tempo de análise */}
        <TempoAnaliseMetrics registro={registro} />
        
        {/* Botão para adicionar novo registro */}
        {index === formData.parecerRegistros.length - 1 && formData.parecerRegistros.length < MAX_REGISTROS && (
          <div className="status-section-group mt-4 pt-4 border-t border-gray-200 flex justify-center">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleAddParecerRegistro();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 border border-green-200 transition-colors shadow-sm"
            >
              <Plus size={16} />
              <span>Adicionar Registro ({formData.parecerRegistros.length}/{MAX_REGISTROS})</span>
            </button>
          </div>
        )}
        
        {/* Aviso quando atingir o limite */}
        {index === formData.parecerRegistros.length - 1 && formData.parecerRegistros.length >= MAX_REGISTROS && (
          <div className="status-section-group mt-4 pt-4 border-t border-gray-200 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md border border-yellow-200">
              <AlertTriangle size={16} />
              <span>Limite máximo de {MAX_REGISTROS} registros atingido</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="registro-status-section card relative">
      <AnimatePresence>
        {loadingSection && (
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
        )}
      </AnimatePresence>
      
      <div className="card-header">
        <h3>Parecer/Registro de Status</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {formData.parecerRegistros.length}/{MAX_REGISTROS} registros
        </span>
      </div>
      
      <div className="status-section-content">
        {/* Lista de registros de parecer */}
        <div className="parecer-registros-list">
          {formData.parecerRegistros.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <FileText size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Nenhum registro de parecer adicionado</p>
              <p className="text-sm text-gray-400 mb-4">
                Adicione pelo menos um registro de parecer para continuar
              </p>
              <button 
                type="button"
                onClick={handleAddParecerRegistro}
                className="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
              >
                <Plus size={14} className="mr-1" />
                Adicionar Primeiro Registro
              </button>
            </div>
          ) : (
            formData.parecerRegistros.map((registro, index) => (
              <ParecerRegistroItem 
                key={`registro-${registro.id}-${currentPage}`} 
                registro={registro} 
                index={index}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const NovaPreviaView = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const { userId, userName } = useAuth();
  
  // Efeito para rolar a página para o topo quando o componente for montado
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
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
  const [showSearchModal, setShowSearchModal] = useState(() => {
    // Verificar se há um patientId na URL
    const searchParams = new URLSearchParams(location.search);
    return !searchParams.has('patientId');
  });
  const [showWeightDetailPopout, setShowWeightDetailPopout] = useState(false);
  
  // Estado local para o termo de pesquisa
  const [localSearchTerm, setLocalSearchTerm] = useState("");

  // Adicionar estados para controlar carregamento
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loadingSection, setLoadingSection] = useState(false); // Para animação de carregamento nas seções

  const [diferencaDias, setDiferencaDias] = useState(null);

  const [previewImage, setPreviewImage] = useState(null);

  // Estados para navegação dos botões de atendimento
  const [visibleButtonsStart, setVisibleButtonsStart] = useState(0);
  
  // Estados para dados do paciente
  const { 
    patients, 
    searchPatients,
    selectedPatient,
    selectPatient,
    loading: patientContextLoading,
    pageSize: contextPageSize,
    changePage
  } = usePatient();

  // Função para mapear status para cores
  const getStatusColor = (status) => {
    switch (status) {
      case 'Favorável':
        return '#DCFCE7'; // Verde
      case 'Favorável com Inconsistência':
        return '#FFEDD5'; // Laranja
      case 'Inconclusivo':
        return '#FEF9C3'; // Amarelo
      case 'Desfavorável':
        return '#FECACA'; // Vermelho
      default:
        return '#F1F1F1'; // Cinza padrão
    }
  };

  // Função para obter cor mais clara para o fundo
  const getStatusLightColor = (status) => {
    switch (status) {
      case 'Favorável':
        return '#d1fae5'; // Verde claro
      case 'Favorável com Inconsistência':
        return '#fed7aa'; // Laranja claro
      case 'Inconclusivo':
        return '#fef3c7'; // Amarelo claro
      case 'Desfavorável':
        return '#fee2e2'; // Vermelho claro
      default:
        return '#f3f4f6'; // Cinza claro padrão
    }
  };

  const [previaUserInfo, setPreviaUserInfo] = useState({
    usuario_criacao: null,
    usuario_alteracao: null,
    data_criacao: null,
    data_atualizacao: null
  });

  const PatientSearchLoading = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
      <div className="patient-search-loading-overlay">
        <div className="loading-content">
          <img 
            src="/images/loadingcorreto-semfundo.gif" 
            alt="Carregando..." 
            className="loading-gif"
          />
          <p className="loading-text">Procurando pacientes...</p>
        </div>
      </div>
    );
  };

  // NOVO: Componente UserInfoDisplay inline (mais compacto)
  const UserInfoInline = () => {
    // Se estivermos criando uma nova prévia
    if (currentPage > previousConsultations.length) {
      return (
        <div className="user-info-inline new-record">
          <User size={14} className="user-icon" />
          <span className="user-text">
            Criando: <strong>{userName}</strong>
          </span>
        </div>
      );
    }

    // Se estivermos visualizando uma prévia existente
    if (previaUserInfo.usuario_criacao || previaUserInfo.usuario_alteracao) {
      return (
        <div className="user-info-inline existing-record">
          <div className="user-info-row">
            {previaUserInfo.usuario_criacao && (
              <>
                <div className="user-indicator created"></div>
                <span className="user-text">
                  Por: <strong>{previaUserInfo.usuario_criacao}</strong>
                </span>
                {(previaUserInfo.data_criacao || previaUserInfo.data_atualizacao) && (
                  <span className="user-timestamp">
                    {previaUserInfo.data_atualizacao ? 
                      new Date(previaUserInfo.data_atualizacao).toLocaleDateString('pt-BR') :
                      new Date(previaUserInfo.data_criacao).toLocaleDateString('pt-BR')
                    }
                  </span>
                )}
              </>
            )}
            
            {previaUserInfo.usuario_alteracao && (
              <>
                <div className="user-indicator modified"></div>
                <span className="user-text user-text-secondary">
                  Editado: <strong>{previaUserInfo.usuario_alteracao}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Efeito para verificar se há um patientId na URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const patientId = searchParams.get('patientId');
    
    if (patientId) {
      // Se tiver um patientId na URL, buscar o paciente e selecioná-lo
      const fetchAndSelectPatient = async () => {
        try {
          setIsLoadingPatient(true);
          
          console.log("Carregando paciente da URL:", patientId);
          
          // MÉTODO 1: Tentar buscar na lista local primeiro (mais rápido)
          const localPatient = patients.find(p => p.id === parseInt(patientId));
          
          if (localPatient) {
            console.log("Paciente encontrado na lista local:", localPatient.Nome);
            await handleSelectPatient(localPatient);
          } else {
            // MÉTODO 2: Buscar diretamente da API
            console.log("Paciente não encontrado localmente, buscando na API...");
            const apiPatient = await fetchPatientFromAPI(parseInt(patientId));
            
            if (apiPatient) {
              console.log("Paciente encontrado na API:", apiPatient.Nome);
              // Converter formato da API para formato esperado
              const patient = {
                id: apiPatient.id,
                Nome: apiPatient.Nome,
                Paciente_Codigo: apiPatient.Paciente_Codigo,
                Nascimento: apiPatient.Nascimento_Formatado || apiPatient.Nascimento,
                Sexo: apiPatient.Sexo,
                Operadora: apiPatient.Operadora,
                CID: apiPatient.Cid_Diagnostico || '',
                cid: apiPatient.Cid_Diagnostico || ''
              };
              await handleSelectPatient(patient);
            } else {
              console.error("Paciente não encontrado na API");
              toast({
                title: "Erro",
                description: "Paciente não encontrado.",
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error("Erro ao carregar paciente:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do paciente.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingPatient(false);
        }
      };
      
      fetchAndSelectPatient();
    }
  }, [location.search]);
  
  // Adicionar estados para controlar carregamento
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
    ciclos_previstos: '',
    ciclo: '',
    dia: '',
    dataEmissaoGuia: '',
    dataEncaminhamentoAF: '',
    dataSolicitacao: '',
    parecer: '',
    comentario: '',
    peso: '',
    altura: '',
    parecerGuia: '',
    finalizacao: '',
    inconsistencia: '',
    cicloDiaEntries: [{ id: 1, ciclo: '', dia: '', protocolo: '' }],
    // NOVO: Array para múltiplos registros de parecer/status
    parecerRegistros: [{ 
      id: 1, 
      parecer: '', 
      parecerGuia: '', 
      finalizacao: '', 
      dataParecer: '',
      tempoAnalise: null,
      observacoes: ''
    }]
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
      
      // IMPORTANTE: NÃO resetar o form aqui se acabamos de trocar de paciente
      // O form já foi limpo no useEffect de mudança de paciente
      console.log("Configurando página 'Novo' para paciente carregado");
    }
  }, [previousConsultations.length]);
  
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

  
  // Componente de Loading simples apenas para área de resultados
  const ResultsAreaLoading = () => {
    return (
      <div className="results-loading-container">
        <img 
          src="/images/loadingcorreto-semfundo.gif" 
          alt="Carregando..." 
          className="results-loading-gif"
        />
      </div>
    );
  };

  const SearchIndicator = ({ isSearching }) => {
    if (!isSearching) return null;
    
    return (
      <div className="search-indicator">
        <div className="search-indicator-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  };

  const LoadingOverlayWithGif = ({ isVisible, message, size = "large" }) => {
    if (!isVisible) return null;

    const getSizeClass = () => {
      switch(size) {
        case "small": return "loading-small";
        case "medium": return "loading-medium"; 
        case "large": return "loading-large";
        default: return "loading-large";
      }
    };

    return (
      <div className="custom-loading-overlay">
        <div className="custom-loading-content">
          <img 
            src="/images/loadingcorreto-semfundo.gif" 
            alt="Carregando..." 
            className={`loading-gif ${getSizeClass()}`}
          />
          <p className="custom-loading-text">{message}</p>
        </div>
      </div>
    );
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

  // NOVA: Função para buscar dados do paciente da API
  const fetchPatientFromAPI = async (patientId) => {
    try {
      const response = await fetch(`https://api.lowcostonco.com.br/backend-php/api/Previas/get_patient_by_id.php?id=${patientId}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const patientData = await response.json();
      
      if (patientData.error) {
        throw new Error(patientData.error);
      }
      
      return patientData;
    } catch (error) {
      console.error("Erro ao buscar paciente da API:", error);
      return null;
    }
  };

  // Modificado para usar o contexto com cache
  const loadPatientData = async (patientId) => {
    setIsLoadingPatient(true);
    try {
      // Primeiro, buscar dados do paciente
      const patientData = await fetchPatientFromAPI(patientId);
      
      if (!patientData) {
        throw new Error("Paciente não encontrado na API");
      }
      
      // Buscar as prévias do paciente usando o contexto com cache
      const previas = await getPreviasDoPatient(patientId);
      
      // Atualizar o estado de consultas anteriores COM OS STATUS
      if (previas && previas.length > 0) {
        // Enriquecer as consultas com dados detalhados se necessário
        const consultasComStatus = await Promise.all(
          previas.map(async (previa) => {
            // Se já temos os dados de status, usar; senão buscar detalhes
            if (previa.parecer_guia !== undefined && previa.finalizacao !== undefined) {
              return previa;
            } else {
              // Buscar detalhes da prévia se não temos os status
              try {
                const detalhes = await getPrevia(previa.id);
                return {
                  ...previa,
                  parecer_guia: detalhes.parecer_guia,
                  finalizacao: detalhes.finalizacao
                };
              } catch (error) {
                console.warn(`Erro ao buscar detalhes da prévia ${previa.id}:`, error);
                return previa; // Retorna a prévia original se houver erro
              }
            }
          })
        );
        
        setPreviousConsultations(consultasComStatus);
        
        // Resto da lógica permanece igual...
        setPatientHistory({
          ultimaAnalise: previas[0]?.data_criacao ? formatDate(new Date(previas[0].data_criacao)) : '',
          quantidadeGuias: previas.length,
          protocolosDiferentes: [...new Set(previas.map(p => p.protocolo))].length,
          pesos: [],
          allPesos: []
        });
        
        loadWeightHistory(previas);
      } else {
        setPatientHistory({
          ultimaAnalise: '',
          quantidadeGuias: 0,
          protocolosDiferentes: 0,
          pesos: [],
          allPesos: []
        });
        setPreviousConsultations([]);
      }
      
      // IMPORTANTE: Retornar os dados do paciente
      return patientData;
      
    } catch (error) {
      console.error("Erro ao carregar dados do paciente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico do paciente",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoadingPatient(false);
    }
  };


  // Componente para renderizar botão com status dividido
  const StatusSplitButton = ({ consultation, atendimentoNumero, numeroExibido, currentPage, onClick }) => {
    const parecerGuiaColor = getStatusColor(consultation.parecer_guia);
    const finalizacaoColor = getStatusColor(consultation.finalizacao);
    
    const isActive = currentPage === atendimentoNumero;
    
    // Verificar se os status são "não definidos" (vazios ou nulos)
    const isParecerGuiaUndefined = !consultation.parecer_guia || consultation.parecer_guia === '';
    const isFinalizacaoUndefined = !consultation.finalizacao || consultation.finalizacao === '';
    
    return (
      <button 
        key={consultation.id}
        className={`pagination-button status-split-button ${isActive ? 'active' : ''}`}
        onClick={onClick}
      >
        {/* Fundo dividido */}
        <div 
          className={`status-background-left ${isParecerGuiaUndefined ? 'status-undefined' : ''}`}
          style={{
            backgroundColor: parecerGuiaColor,
          }}
        />
        <div 
          className={`status-background-right ${isFinalizacaoUndefined ? 'status-undefined' : ''}`}
          style={{
            backgroundColor: finalizacaoColor,
          }}
        />
        
        {/* Linha divisória */}
        <div className="status-divider" />
        
        {/* Texto */}
        <span className="status-button-text">
          Atend. {numeroExibido}
        </span>
        
        {/* Tooltip com informações dos status */}
        <div className="status-tooltip">
          <div>Parecer: {consultation.parecer_guia || 'Não definido'}</div>
          <div>Finalização: {consultation.finalizacao || 'Não definido'}</div>
          <div className="status-tooltip-arrow" />
        </div>
      </button>
    );
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
  const handleSelectPatient = async (patient) => {
    console.log("Selecionando paciente:", patient);
    
    // Se recebeu apenas um ID, buscar os dados do paciente
    if (typeof patient === 'object' && patient.id && !patient.Nome) {
      try {
        setIsLoadingPatient(true);
        
        // Buscar dados do paciente no servidor
        const patientData = await loadPatientData(patient.id);
        
        if (!patientData) {
          // Se não conseguiu carregar do servidor, tentar buscar na lista local
          const localPatient = patients.find(p => p.id === patient.id);
          if (localPatient) {
            patient = localPatient;
          } else {
            // ÚLTIMO RECURSO: Buscar diretamente da API sem usar loadPatientData
            const apiPatient = await fetchPatientFromAPI(patient.id);
            if (apiPatient) {
              // Converter formato da API para formato esperado
              patient = {
                id: apiPatient.id,
                Nome: apiPatient.Nome,
                Paciente_Codigo: apiPatient.Paciente_Codigo,
                Nascimento: apiPatient.Nascimento_Formatado || apiPatient.Nascimento,
                Sexo: apiPatient.Sexo,
                Operadora: apiPatient.Operadora,
                CID: apiPatient.Cid_Diagnostico || '',
                cid: apiPatient.Cid_Diagnostico || ''
              };
            } else {
              throw new Error(`Paciente com ID ${patient.id} não encontrado`);
            }
          }
        } else {
          // Se loadPatientData retornou dados, usar esses dados
          // Converter formato da API para formato esperado
          patient = {
            id: patientData.id,
            Nome: patientData.Nome,
            Paciente_Codigo: patientData.Paciente_Codigo,
            Nascimento: patientData.Nascimento_Formatado || patientData.Nascimento,
            Sexo: patientData.Sexo,
            Operadora: patientData.Operadora,
            CID: patientData.Cid_Diagnostico || '',
            cid: patientData.Cid_Diagnostico || ''
          };
        }
      } catch (error) {
        console.error("Erro ao buscar dados do paciente:", error);
        toast({
          title: "Erro",
          description: "Não foi possível encontrar os dados do paciente",
          variant: "destructive"
        });
        return;
      } finally {
        setIsLoadingPatient(false);
      }
    }
    
    // Verificar se temos um objeto de paciente válido
    if (!patient || !patient.id) {
      console.error("Dados do paciente inválidos:", patient);
      return;
    }
    
    console.log("Selecionando paciente com dados completos:", patient.Nome || `ID: ${patient.id}`);
    
    // Ativar loading
    setIsLoadingPatient(true);
    
    try {
      // Determinar CID do paciente
      const patientCID = patient?.CID || patient?.cid || null;
      
      // Preparar dados iniciais limpos para o novo paciente
      const initialFormData = {
        guia: '',
        protocolo: '',
        cid: patientCID && patientCID.trim() !== '' ? patientCID : '',
        ciclos_previstos: '',
        ciclo: '',
        dia: '',
        dataEmissaoGuia: '',
        dataEncaminhamentoAF: '',
        dataSolicitacao: formatDate(new Date()),
        parecer: '',
        comentario: '',
        peso: '',
        altura: '',
        parecerGuia: '',
        finalizacao: '',
        inconsistencia: '',
        cicloDiaEntries: [{ id: 1, ciclo: '', dia: '', protocolo: '' }],
        // NOVO: Incluir parecerRegistros
        parecerRegistros: [{ 
          id: 1, 
          parecer: '', 
          parecerGuia: '', 
          finalizacao: '', 
          dataParecer: '',
          tempoAnalise: null,
          observacoes: ''
        }]
      };
      
      // Verificar se já não é o paciente atual (evitar recarregamento desnecessário)
      if (selectedPatient && selectedPatient.id === patient.id) {
        console.log("Paciente já está selecionado, apenas atualizando dados");
        setIsLoadingPatient(false);
        return;
      }
      
      // Limpar dados do paciente anterior ANTES de selecionar o novo
      setFormData(initialFormData);
      setAttachments([]);
      setDataParecerRegistrado(null);
      setTempoParaAnalise(null);
      setPreviousConsultations([]);
      setCurrentPage(0);
      setDiferencaDias(null);
      
      // Selecionar o novo paciente
      selectPatient(patient.id);
      setLocalPatientId(patient.id);
      
      // Pequeno delay para dar tempo da animação de loading aparecer
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fechar modal de busca se estiver aberto
      setShowSearchModal(false);
      
      console.log("Paciente selecionado e dados configurados com CID:", patientCID);
      
    } catch (error) {
      console.error("Erro ao selecionar paciente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível selecionar o paciente",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPatient(false);
    }
  };

  const clearPatientSpecificCache = (patientId) => {
    // Limpar caches específicos do paciente anterior
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      // Limpar caches de CID e protocolo que podem estar "grudados"
      if (key.includes('cached_cids') || 
          key.includes('cached_protocolos') ||
          key.includes(`cached_previas_by_patient_${patientId}`)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log(`Cache específico limpo para paciente ${patientId}`);
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

  // Componente para exibir diferença entre datas
  const DateDifferenceIndicator = () => {
    if (diferencaDias === null) return (
      <div className="form-field">
        <label className="form-label-datas">Diferença entre datas</label>
        <div className="p-3 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center date-difference-indicator">
          <span className="text-sm">Preencha ambas as datas</span>
        </div>
      </div>
    );
    
    // Definir cor com base na quantidade de dias
    const getColorClass = (dias) => {
      if (dias <= 1) return 'text-green-600 bg-green-100 border-green-200';
      if (dias <= 3) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      return 'text-red-600 bg-red-100 border-red-200';
    };
    
    return (
      <div className="form-field">
        <label className="form-label-datas">Diferença entre datas</label>
        <div className={`p-3 rounded-md border flex items-center justify-between date-difference-indicator ${getColorClass(diferencaDias)}`}>
          <div className="flex items-center">
            <Clock size={16} className="mr-2" />
            <span className="font-medium">
              {diferencaDias} {diferencaDias === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          <span className="text-xs">
            Entre emissão e encaminhamento
          </span>
        </div>
      </div>
    );
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
    
    // Log para debug
    console.log(`🔄 handleInputChange - Campo: ${name}, Valor:`, value);
    
    // Validação específica para ciclos_previstos
    if (name === 'ciclos_previstos') {
      // Permitir apenas números inteiros positivos ou campo vazio
      if (value !== '' && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 100)) {
        return; // Não atualiza se for inválido
      }
    }
    
    // CORREÇÃO ESPECIAL: Tratar parecerRegistros separadamente
    if (name === 'parecerRegistros') {
      console.log('📋 Atualizando parecerRegistros:', value);
      
      setFormData(prev => ({
        ...prev,
        parecerRegistros: Array.isArray(value) ? value : prev.parecerRegistros
      }));
      return;
    }
    
    // Para outros campos, comportamento normal
    setFormData(prev => ({
      ...prev,
      [name]: value === undefined ? '' : value // CORREÇÃO: garantir que nunca seja undefined
    }));
    
    // Se está alterando o campo de parecer da guia, registrar a data atual
    if (name === 'parecerGuia' && value && value !== 'Pendente') {
      const currentDate = formatDate(new Date());
      setDataParecerRegistrado(currentDate);
      
      // Calcular o tempo de análise
      calculateProcessingTime(formData.dataSolicitacao, currentDate);
    }
  };

  // ADICIONAL: Debug para verificar o estado atual dos registros
  useEffect(() => {
    console.log('🔍 Estado atual dos parecerRegistros:', formData.parecerRegistros);
  }, [formData.parecerRegistros]);
  
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
            download_url: `https://api.lowcostonco.com.br/backend-php/api/Previas/download_anexo.php?id=${result.id}` //AQUI MUDAR
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

    if (!selectedPatient || !selectedPatient.id) {
      toast({
        title: "Erro de dados",
        description: "Não foi possível identificar o paciente selecionado. Por favor, selecione o paciente novamente.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se temos o ID do usuário
    if (!userId) {
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível identificar o usuário logado. Por favor, faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // CORREÇÃO: Processar ciclos_previstos de forma mais robusta
      let ciclosPrevistos = null;
      if (formData.ciclos_previstos !== undefined && formData.ciclos_previstos !== null && formData.ciclos_previstos !== '') {
        const ciclosNum = parseInt(formData.ciclos_previstos);
        if (!isNaN(ciclosNum) && ciclosNum > 0) {
          ciclosPrevistos = ciclosNum;
        }
      }

      // Preparar dados para envio
      const dadosPrevia = {
        // Incluir id apenas se estiver editando
        ...(formData.id ? { id: formData.id } : {}),
        paciente_id: (selectedPatient && selectedPatient.id) || localPatientId,
        guia: formData.guia,
        protocolo: formData.protocolo,
        cid: formData.cid,
        
        // CORREÇÃO: Garantir que ciclos_previstos seja enviado corretamente
        ciclos_previstos: ciclosPrevistos, // Enviar como número ou null
        
        // CAMPOS DE DATA
        data_emissao_guia: formData.dataEmissaoGuia,
        data_encaminhamento_af: formData.dataEncaminhamentoAF,
        data_solicitacao: formData.dataSolicitacao,
        
        parecer: formData.parecer || '',
        comentario: formData.comentario || '',
        peso: formData.peso ? parseFloat(formData.peso) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        parecer_guia: formData.parecerGuia || '',
        finalizacao: formData.finalizacao || '',
        inconsistencia: formData.inconsistencia || '',
        data_parecer_registrado: dataParecerRegistrado || null,
        tempo_analise: tempoParaAnalise || 0,
        
        // NOVO: Incluir dados de parecerRegistros
        parecer_registros: formData.parecerRegistros.map(registro => ({
          id: registro.id,
          parecer: registro.parecer || '',
          // CORREÇÃO: Mapear corretamente o parecerGuia
          parecerGuia: registro.parecerGuia || '', // Frontend usa parecerGuia
          parecer_guia: registro.parecerGuia || '', // Backend pode esperar parecer_guia
          finalizacao: registro.finalizacao || '',
          dataParecer: registro.dataParecer || null,
          data_parecer: registro.dataParecer || null, // Compatibilidade
          tempoAnalise: registro.tempoAnalise || null,
          tempo_analise: registro.tempoAnalise || null, // Compatibilidade
          observacoes: registro.observacoes || ''
        })),
        
        // Adicionar IDs dos usuários
        ...(formData.id 
          ? { usuario_alteracao_id: userId } // Se está editando, usar usuario_alteracao_id
          : { usuario_criacao_id: userId }   // Se está criando, usar usuario_criacao_id
        ),
        
        ciclos_dias: formData.cicloDiaEntries.map(entry => ({
          ciclo: entry.ciclo || '',
          dia: entry.dia || '',
          protocolo: entry.protocolo || '',
          is_full_cycle: entry.fullCycle ? 1 : 0
        }))
      };

      // CORREÇÃO: Log detalhado para debug
      console.log("Dados enviados (incluindo ciclos_previstos):", {
        ...dadosPrevia,
        ciclos_previstos_original: formData.ciclos_previstos,
        ciclos_previstos_processado: ciclosPrevistos
      });
      
      let response;
      const isCreating = !formData.id; // Flag para saber se está criando
      
      // Determinar se é uma criação ou atualização
      if (formData.id) {
        // Atualizar prévia existente
        response = await updatePrevia(dadosPrevia);
        
        toast({
          title: "Sucesso",
          description: "Prévia atualizada com sucesso!",
          variant: "success"
        });
      } else {
        // Criar nova prévia
        response = await createPrevia(dadosPrevia);
        
        // Se a criação for bem-sucedida e tivermos anexos locais, fazer o upload
        if (response.id && attachments.length > 0) {
          for (const attachment of attachments) {
            if (attachment.file) {
              try {
                await uploadAnexo(response.id, attachment.file);
              } catch (uploadError) {
                console.error("Erro ao fazer upload de anexo:", uploadError);
                toast({
                  title: "Aviso",
                  description: `Prévia salva, mas houve erro no upload de ${attachment.name}`,
                  variant: "warning"
                });
              }
            }
          }
        }
        
        toast({
          title: "Sucesso",
          description: "Prévia criada com sucesso!",
          variant: "success"
        });
      }
      
      // Recarregar dados do paciente para atualizar a lista de consultas
      console.log("Recarregando dados do paciente após salvar...");
      
      // Aguardar um momento para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recarregar dados do paciente
      await loadPatientData(selectedPatient.id);
      
      // Se foi uma criação, ir para página "Novo" (formulário limpo)
      if (isCreating && response.id) {
        console.log("Nova prévia criada, indo para página 'Novo'...");
        
        // Aguardar um momento para os dados serem carregados
        setTimeout(() => {
          // Calcular a posição da página "Novo" (sempre última + 1)
          const newPage = previousConsultations.length + 1;
          console.log(`Indo para página 'Novo' (posição ${newPage})`);
          
          // Ir para página "Novo"
          setCurrentPage(newPage);
          handleLoadPreviousPage(newPage);
        }, 800);
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
      setLoadingSection(true);
      setTimeout(() => setLoadingSection(false), 300);
      
      // NOVO: Limpar informações do usuário para novo atendimento
      setPreviaUserInfo({
        usuario_criacao: null,
        usuario_alteracao: null,
        data_criacao: null,
        data_atualizacao: null
      });
      
      // Limpar o formulário para um novo atendimento
      setFormData({
        guia: '',
        protocolo: '',
        cid: '',
        ciclos_previstos: '',
        ciclo: '',
        dia: '',
        dataSolicitacao: formatDate(new Date()),
        parecer: '',
        comentario: '',
        peso: '',
        altura: '',
        parecerGuia: '',
        inconsistencia: '',
        cicloDiaEntries: [{ id: 1, ciclo: '', dia: '', protocolo: '' }],
        // NOVO: Incluir parecerRegistros com dataSolicitacao
        parecerRegistros: [{ 
          id: 1, 
          parecer: '', 
          parecerGuia: '', 
          finalizacao: '', 
          dataSolicitacao: formatDate(new Date()), // NOVO CAMPO
          dataParecer: '',
          tempoAnalise: null,
          observacoes: ''
        }]
      });
      
      setAttachments([]);
      setDataParecerRegistrado(null);
      setTempoParaAnalise(null);
      return;
    }
    
    // Se não for um novo atendimento, carregar os dados da prévia existente
    try {
      setLoadingSection(true);
      
      if (!previousConsultations || previousConsultations.length === 0) {
        throw new Error('Nenhuma consulta anterior disponível');
      }
      
      if (pageNumber <= 0 || pageNumber > previousConsultations.length) {
        throw new Error(`Índice inválido: ${pageNumber}`);
      }

      const consultation = previousConsultations[pageNumber - 1];
      if (!consultation || typeof consultation.id === 'undefined') {
        throw new Error(`Consulta inválida no índice ${pageNumber - 1}`);
      }

      const previaId = consultation.id;
      const numeroExibido = previousConsultations.length - pageNumber + 1;
      
      toast({
        title: "Carregando atendimento",
        description: `Carregando dados do atendimento ${numeroExibido}...`,
        variant: "default"
      });
      
      // Carregar dados da prévia
      const previaDetails = await getPrevia(previaId);
      const ciclosDias = await getCiclosDias(previaId);
      const anexos = await getAnexos(previaId);
      
      // NOVO: Atualizar informações do usuário
      setPreviaUserInfo({
        usuario_criacao: previaDetails.nome_usuario_criacao,
        usuario_alteracao: previaDetails.nome_usuario_alteracao,
        data_criacao: previaDetails.data_criacao,
        data_atualizacao: previaDetails.data_atualizacao
      });
      
      // *** CORREÇÃO PRINCIPAL: Processar múltiplos registros de parecer com novos campos ***
      let parecerRegistrosProcessados = [];

      // 1. Primeiro, tentar carregar do campo JSON parecer_registros_processed (que vem do backend melhorado)
      if (previaDetails.parecer_registros_processed && Array.isArray(previaDetails.parecer_registros_processed)) {
        parecerRegistrosProcessados = previaDetails.parecer_registros_processed.map((registro, index) => ({
          id: registro.id || (index + 1),
          parecer: registro.parecer || '',
          parecerGuia: registro.parecerGuia || '',
          finalizacao: registro.finalizacao || '',
          dataSolicitacao: registro.dataSolicitacao || formatDateFromDB(previaDetails.data_solicitacao) || '', // NOVO CAMPO
          dataParecer: registro.dataParecer || '',
          tempoAnalise: registro.tempoAnalise || null,
          observacoes: registro.observacoes || ''
        }));
        
        console.log(`✅ Carregados ${parecerRegistrosProcessados.length} registros do backend melhorado`);
      }
      // 2. Fallback: tentar carregar do campo JSON parecer_registros original
      else if (previaDetails.parecer_registros) {
        try {
          const registrosFromJSON = JSON.parse(previaDetails.parecer_registros);
          
          if (Array.isArray(registrosFromJSON) && registrosFromJSON.length > 0) {
            parecerRegistrosProcessados = registrosFromJSON.map((registro, index) => ({
              id: registro.id || (index + 1),
              parecer: registro.parecer || '',
              parecerGuia: registro.parecerGuia || registro.parecer_guia || '',
              finalizacao: registro.finalizacao || '',
              dataSolicitacao: registro.dataSolicitacao || formatDateFromDB(previaDetails.data_solicitacao) || '', // NOVO CAMPO
              dataParecer: registro.dataParecer || registro.data_parecer || '',
              tempoAnalise: registro.tempoAnalise || registro.tempo_analise || null,
              observacoes: registro.observacoes || ''
            }));
            
            console.log(`✅ Carregados ${parecerRegistrosProcessados.length} registros do JSON original`);
          }
        } catch (jsonError) {
          console.error("Erro ao fazer parse do JSON parecer_registros:", jsonError);
          parecerRegistrosProcessados = [];
        }
      }
      
      // 3. Se não há registros do JSON, usar campos antigos como fallback
      if (parecerRegistrosProcessados.length === 0) {
        console.log("📄 Usando campos antigos como fallback");
        
        if (previaDetails.parecer || previaDetails.parecer_guia || previaDetails.finalizacao) {
          parecerRegistrosProcessados = [{
            id: 1,
            parecer: previaDetails.parecer || '',
            parecerGuia: previaDetails.parecer_guia || '',
            finalizacao: previaDetails.finalizacao || '',
            dataSolicitacao: formatDateFromDB(previaDetails.data_solicitacao) || '', // NOVO CAMPO
            dataParecer: previaDetails.data_parecer_registrado ? formatDateFromDB(previaDetails.data_parecer_registrado) : '',
            tempoAnalise: previaDetails.tempo_analise || null,
            observacoes: ''
          }];
        } else {
          parecerRegistrosProcessados = [{
            id: 1,
            parecer: '',
            parecerGuia: '',
            finalizacao: '',
            dataSolicitacao: formatDateFromDB(previaDetails.data_solicitacao) || '', // NOVO CAMPO
            dataParecer: '',
            tempoAnalise: null,
            observacoes: ''
          }];
        }
      }
      
      // 4. Se ainda não temos registros, criar um padrão
      if (parecerRegistrosProcessados.length === 0) {
        parecerRegistrosProcessados = [{
          id: 1,
          parecer: '',
          parecerGuia: '',
          finalizacao: '',
          dataSolicitacao: formatDateFromDB(previaDetails.data_solicitacao) || '', // NOVO CAMPO
          dataParecer: '',
          tempoAnalise: null,
          observacoes: ''
        }];
      }
      
      console.log("📋 Registros finais carregados:", parecerRegistrosProcessados);
      
      // Atualizar o formulário com os dados carregados
      setFormData({
        id: previaDetails.id,
        paciente_id: previaDetails.paciente_id,
        guia: previaDetails.guia,
        protocolo: previaDetails.protocolo,
        cid: previaDetails.cid,
        ciclos_previstos: previaDetails.ciclos_previstos || '',
        ciclo: ciclosDias.length > 0 ? ciclosDias[0].ciclo : '',
        dia: ciclosDias.length > 0 ? ciclosDias[0].dia : '',
        dataEmissaoGuia: formatDateFromDB(previaDetails.data_emissao_guia),
        dataEncaminhamentoAF: formatDateFromDB(previaDetails.data_encaminhamento_af),
        dataSolicitacao: formatDateFromDB(previaDetails.data_solicitacao),
        parecer: previaDetails.parecer,
        comentario: previaDetails.comentario || '',
        peso: previaDetails.peso,
        altura: previaDetails.altura,
        parecerGuia: previaDetails.parecer_guia,
        finalizacao: previaDetails.finalizacao,
        inconsistencia: previaDetails.inconsistencia,
        cicloDiaEntries: ciclosDias.length > 0 ? ciclosDias : [{ id: 1, ciclo: '', dia: '', protocolo: '' }],
        // *** CORREÇÃO: Usar os registros processados com os novos campos ***
        parecerRegistros: parecerRegistrosProcessados
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
      
      // Configurar data de parecer registrado (usar do primeiro registro se disponível)
      const primeiroRegistro = parecerRegistrosProcessados[0];
      if (primeiroRegistro && primeiroRegistro.dataParecer) {
        setDataParecerRegistrado(primeiroRegistro.dataParecer);
        setTempoParaAnalise(primeiroRegistro.tempoAnalise);
      } else if (previaDetails.data_parecer_registrado) {
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
    } finally {
      setLoadingSection(false);
    }
  }; 

  const UserInfoDisplay = () => {
    // Se estivermos visualizando uma prévia existente
    

    return null;
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
      return `https://api.lowcostonco.com.br/backend-php/api/Previas/view_anexo.php?id=${id}`; //AQUI MUDAR
    };
    
    const getDownloadUrl = (id) => {
      return `https://api.lowcostonco.com.br/backend-php/api/Previas/download_anexo.php?id=${id}`; //AQUI MUDAR
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

  const calculateDateDifference = useCallback((dataEmissao, dataEncaminhamento) => {
    if (!dataEmissao || !dataEncaminhamento) {
      setDiferencaDias(null);
      return;
    }
    
    // Converter strings DD/MM/YYYY para objetos Date
    const parseDate = (dateString) => {
      if (!dateString) return null;
      const parts = dateString.split('/');
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    };
    
    const dataEmissaoDate = parseDate(dataEmissao);
    const dataEncaminhamentoDate = parseDate(dataEncaminhamento);
    
    if (dataEmissaoDate && dataEncaminhamentoDate) {
      // Calcular diferença em dias
      const diffTime = Math.abs(dataEncaminhamentoDate - dataEmissaoDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDiferencaDias(diffDays);
      
      console.log(`Diferença calculada: ${diffDays} dias entre ${dataEmissao} e ${dataEncaminhamento}`);
    } else {
      setDiferencaDias(null);
    }
  }, []);

  useEffect(() => {
    calculateDateDifference(formData.dataEmissaoGuia, formData.dataEncaminhamentoAF);
  }, [formData.dataEmissaoGuia, formData.dataEncaminhamentoAF, calculateDateDifference]);
  
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

  // Função para máscara de data automática
  const applyDateMask = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 8 dígitos (DDMMAAAA)
    const limitedNumbers = numbers.substring(0, 8);
    
    // Aplica a máscara baseada na quantidade de dígitos
    if (limitedNumbers.length <= 2) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 4) {
      return `${limitedNumbers.substring(0, 2)}/${limitedNumbers.substring(2)}`;
    } else {
      return `${limitedNumbers.substring(0, 2)}/${limitedNumbers.substring(2, 4)}/${limitedNumbers.substring(4)}`;
    }
  };

  // Função para validar data enquanto digita
  const validateDateOnType = (value) => {
    const numbers = value.replace(/\D/g, '');
    
    // Validações básicas durante a digitação
    if (numbers.length >= 2) {
      const day = parseInt(numbers.substring(0, 2));
      if (day > 31 || day === 0) {
        return false; // Dia inválido
      }
    }
    
    if (numbers.length >= 4) {
      const month = parseInt(numbers.substring(2, 4));
      if (month > 12 || month === 0) {
        return false; // Mês inválido
      }
    }
    
    return true; // Válido até agora
  };

  // Handler personalizado para campos de data
  const handleDateInputChange = (fieldName, inputValue) => {
    // Validar se a entrada é permitida
    if (!validateDateOnType(inputValue)) {
      return; // Não atualiza se for inválido
    }
    
    // Aplicar máscara
    const maskedValue = applyDateMask(inputValue);
    
    // Atualizar o campo
    setFormData(prev => ({
      ...prev,
      [fieldName]: maskedValue
    }));
  };

  // Função para validação completa da data (opcional - para uso futuro)
  const isValidDate = (dateString) => {
    if (dateString.length !== 10) return false;
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    // Verificações básicas
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Criar objeto Date para validação mais rigorosa
    const date = new Date(year, month - 1, day);
    
    return date.getFullYear() === year && 
          date.getMonth() === month - 1 && 
          date.getDate() === day;
  };

  // Handler para teclas especiais (permitir backspace, delete, etc.)
  const handleDateKeyDown = (e) => {
    // Permitir: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
      // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Permitir: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)) {
      return; // Deixa passar
    }
    
    // Garantir que é um número
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
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
  
  useEffect(() => {
    if (selectedPatient) {
      console.log("Paciente mudou, limpando formulário e configurando CID...");
      
      // Determinar CID do paciente (pode estar em diferentes campos)
      const patientCID = selectedPatient?.CID || selectedPatient?.cid || null;
      
      // Preparar dados iniciais do formulário - INCLUINDO FINALIZACAO
      const initialFormData = {
        guia: '',
        protocolo: '',
        cid: patientCID && patientCID.trim() !== '' ? patientCID : '',
        ciclos_previstos: '', // ✓ Adicionar se não existir
        ciclo: '',
        dia: '',
        dataEmissaoGuia: '',
        dataEncaminhamentoAF: '',
        dataSolicitacao: formatDate(new Date()),
        parecer: '',
        comentario: '',
        peso: '',
        altura: '',
        parecerGuia: '',
        finalizacao: '',
        inconsistencia: '',
        cicloDiaEntries: [{ id: 1, ciclo: '', dia: '', protocolo: '' }],
        // NOVO: Incluir parecerRegistros
        parecerRegistros: [{ 
          id: 1, 
          parecer: '', 
          parecerGuia: '', 
          finalizacao: '', 
          dataParecer: '',
          tempoAnalise: null,
          observacoes: ''
        }]
      };

      // Aplicar dados iniciais ao formulário
      setFormData(initialFormData);
      
      // Limpar diferença de dias
      setDiferencaDias(null);
      
      // Limpar anexos
      setAttachments([]);
      
      // Limpar dados de parecer
      setDataParecerRegistrado(null);
      setTempoParaAnalise(null);
      
      // Resetar para página "Novo" 
      setCurrentPage(0);

      setPreviaUserInfo({
        usuario_criacao: null,
        usuario_alteracao: null,
        data_criacao: null,
        data_atualizacao: null
      });
      
      console.log("Formulário configurado para novo paciente:", selectedPatient.Nome, "CID:", patientCID);
    }
  }, [selectedPatient?.id]);

  useEffect(() => {
    if (selectedPatient) {
      const patientCID = selectedPatient?.CID || selectedPatient?.cid || null;
      console.log("Debug - Paciente atual:", selectedPatient.Nome);
      console.log("Debug - CID do paciente:", patientCID);
      console.log("Debug - CID no formData:", formData.cid);
    }
  }, [selectedPatient, formData.cid]);

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

  // Efeito para carregar a prévia específica quando previaId estiver presente
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const previaId = searchParams.get('previaId');
    const patientId = searchParams.get('patientId');
    
    if (previaId && patientId) {
      const loadSpecificPrevia = async () => {
        try {
          setLoadingSection(true);
          
          // Primeiro, garantir que o paciente está carregado
          if (!selectedPatient || selectedPatient.id !== parseInt(patientId)) {
            await handleSelectPatient({ id: parseInt(patientId) });
          }
          
          // Aguardar um momento para garantir que o paciente foi selecionado
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Depois carregar os dados da prévia
          const previaData = await getPrevia(previaId);
          const ciclosDiasData = await getCiclosDias(previaId);
          const anexosData = await getAnexos(previaId);
          
          // Atualizar informações do usuário
          setPreviaUserInfo({
            usuario_criacao: previaData.nome_usuario_criacao,
            usuario_alteracao: previaData.nome_usuario_alteracao,
            data_criacao: previaData.data_criacao,
            data_atualizacao: previaData.data_atualizacao
          });
          
          // CORRIGIDO: Usar previaData em vez de previaDetails
          setFormData(prevData => ({
            ...prevData,
            id: previaData.id,                    // CORRIGIDO
            paciente_id: previaData.paciente_id,  // CORRIGIDO
            guia: previaData.guia || '',          // CORRIGIDO
            protocolo: previaData.protocolo || '', // CORRIGIDO
            cid: previaData.cid || '',            // CORRIGIDO
            ciclos_previstos: previaData.ciclos_previstos || '', // CORRIGIDO
            ciclo: ciclosDiasData.length > 0 ? ciclosDiasData[0].ciclo : '',
            dia: ciclosDiasData.length > 0 ? ciclosDiasData[0].dia : '',
            dataEmissaoGuia: formatDateFromDB(previaData.data_emissao_guia),
            dataEncaminhamentoAF: formatDateFromDB(previaData.data_encaminhamento_af),
            dataSolicitacao: formatDateFromDB(previaData.data_solicitacao),
            parecer: previaData.parecer,
            comentario: previaData.comentario || '',
            peso: previaData.peso,
            altura: previaData.altura,
            parecerGuia: previaData.parecer_guia,
            finalizacao: previaData.finalizacao,
            inconsistencia: previaData.inconsistencia,
            cicloDiaEntries: ciclosDiasData.length > 0 ? ciclosDiasData : [{ id: 1, ciclo: '', dia: '', protocolo: '' }]
          }));
          
          // Atualizar anexos
          const formattedAnexos = anexosData.map(anexo => ({
            id: anexo.id,
            name: anexo.nome_arquivo,
            size: anexo.tamanho,
            type: anexo.tipo,
            download_url: anexo.download_url
          }));
          
          setAttachments(formattedAnexos);
          
          // Configurar data de parecer registrado
          if (previaData.data_parecer_registrado) {
            setDataParecerRegistrado(formatDateFromDB(previaData.data_parecer_registrado));
            setTempoParaAnalise(previaData.tempo_analise);
          } else {
            setDataParecerRegistrado(null);
            setTempoParaAnalise(null);
          }

          // CORRIGIDO: Aguardar que previousConsultations seja carregado antes de definir currentPage
          // Usar um timeout para garantir que os dados foram processados
          setTimeout(() => {
            // Encontrar o índice da prévia na lista de consultas anteriores
            if (previousConsultations && previousConsultations.length > 0) {
              const previaIndex = previousConsultations.findIndex(cons => cons.id === parseInt(previaId));
              if (previaIndex !== -1) {
                setCurrentPage(previaIndex + 1);
                console.log(`Navegando para prévia ${previaId}, página ${previaIndex + 1}`);
              } else {
                console.warn(`Prévia ${previaId} não encontrada na lista de consultas`);
                // Se não encontrar, ir para a primeira página
                setCurrentPage(1);
              }
            }
          }, 1000); // Aguardar 1 segundo para dados serem carregados
          
        } catch (error) {
          console.error("Erro ao carregar prévia específica:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os detalhes da prévia",
            variant: "destructive"
          });
        } finally {
          setLoadingSection(false);
        }
      };

      // Usar um flag para evitar múltiplas execuções
      let isMounted = true;
      if (isMounted) {
        loadSpecificPrevia();
      }
      return () => {
        isMounted = false;
      };
    }
  }, [location.search, getPrevia, getCiclosDias, getAnexos, selectedPatient?.id, previousConsultations.length]); // Dependências corrigidas

  // Efeito para evitar que o formulário seja limpo quando o paciente é carregado
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const previaId = searchParams.get('previaId');
    
    // Se tiver previaId na URL, não limpar o formulário
    if (previaId) {
      return;
    }
    
    // Se não tiver previaId, seguir o comportamento normal de limpar o formulário
    if (selectedPatient) {
      setFormData(prevData => ({
        ...prevData,
        paciente_id: selectedPatient.id,
        cid: selectedPatient.cid || '',
        protocolo: '',
        guia: '',
        ciclos_previstos: '', // ✓ Adicionar esta linha
        ciclo: '',
        dia: '',
        dataEmissaoGuia: '',
        dataEncaminhamentoAF: '',
        dataSolicitacao: formatDate(new Date()),
        parecer: '',
        comentario: '',
        peso: '',
        altura: '',
        parecerGuia: '',
        finalizacao: '',
        inconsistencia: '',
        cicloDiaEntries: [{ id: 1, ciclo: '', dia: '', protocolo: '' }],
        // NOVO: Incluir parecerRegistros
        parecerRegistros: [{ 
          id: 1, 
          parecer: '', 
          parecerGuia: '', 
          finalizacao: '', 
          dataParecer: '',
          tempoAnalise: null,
          observacoes: ''
        }]
      }));
    }
  }, [selectedPatient, location.search]);
  
  // Função para visualizar anexo
  const handlePreviewAttachment = (attachment) => {
    setPreviewImage(attachment);
  };
  
  return (
    <motion.div 
      className="nova-previa-container"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.3 }
      }}
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
                  // REMOVIDO: disabled={isSearching} - agora pode sempre digitar
                />
                {/* Indicador sutil de que está buscando */}
                <SearchIndicator isSearching={isSearching} />
              </div>
              
              {/* Área de resultados com loading condicional */}
              <div className="results-area">
                {isSearching ? (
                  <ResultsAreaLoading />
                ) : filteredPatients.length > 0 ? (
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
                ) : localSearchTerm && !isSearching ? (
                  // Só mostra "não encontrado" se não estiver buscando
                  <p className="text-center text-gray-500 mt-4">
                    Nenhum paciente encontrado com este termo.
                  </p>
                ) : !localSearchTerm ? (
                  // Mensagem inicial quando não há termo de busca
                  <p className="text-center text-gray-400 mt-4">
                    Digite para começar a buscar...
                  </p>
                ) : null}

                {/* Botão para carregar mais resultados */}
                {!isSearching && searchResults.length > 0 && searchPage < searchTotalPages && (
                  <button 
                    className="w-full py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 mt-4"
                    onClick={loadMoreResults}
                  >
                    Carregar mais resultados
                  </button>
                )}
              </div>
              
              <button 
                className="new-patient-button"
                onClick={handleNewPatient}
                // Só desabilita se estiver carregando dados do paciente, não durante busca
                disabled={isLoadingPatient}
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
              {loadingSection && (
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
              )}
            </AnimatePresence>
            
            <div className="card-header-with-user">
              <h3 className="card-title">Registro</h3>
              <UserInfoInline />
            </div>

            <UserInfoDisplay />
            
            {/* PRIMEIRA LINHA: Guia e CID (2 colunas) */}
            <div className="form-grid-2-cols">
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
                  key={`guia-${selectedPatient?.id}-${currentPage}`}
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="cid" className="form-label">CID</label>
                <CIDSelection 
                  key={`cid-${selectedPatient?.id}-${currentPage}`}
                  value={formData.cid}
                  onChange={(selectedCids) => {
                    if (Array.isArray(selectedCids)) {
                      const cidString = selectedCids.map(cid => cid.codigo).join(', ');
                      setFormData(prev => ({ ...prev, cid: cidString }));
                    } else {
                      setFormData(prev => ({ ...prev, cid: selectedCids }));
                    }
                  }}
                  patientCID={selectedPatient?.CID || null}
                  placeholder="Selecione o CID..."
                />
              </div>
            </div>

            {/* SEGUNDA LINHA: Protocolo (largura completa) */}
            <div className="form-grid-1-col">
              <div className="form-field">
                <label htmlFor="protocolo" className="form-label">Protocolo</label>
                <ProtocoloSelection 
                  key={`protocolo-${selectedPatient?.id}-${currentPage}`}
                  value={formData.protocolo}
                  onChange={(selectedProtocolo) => {
                    if (selectedProtocolo && typeof selectedProtocolo === 'object') {
                      setFormData(prev => ({ 
                        ...prev, 
                        protocolo: selectedProtocolo.nome 
                      }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        protocolo: selectedProtocolo 
                      }));
                    }
                  }}
                  placeholder="Selecione o Protocolo..."
                />
              </div>
            </div>

            {/* TERCEIRA LINHA: Datas (3 colunas - perfeitamente preenchidas) */}
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="dataEmissaoGuia" className="form-label">Data de Emissão da Guia</label>
                <input 
                  type="text"
                  id="dataEmissaoGuia"
                  name="dataEmissaoGuia"
                  value={formData.dataEmissaoGuia}
                  onChange={(e) => handleDateInputChange('dataEmissaoGuia', e.target.value)}
                  onKeyDown={handleDateKeyDown}
                  className="form-input"
                  placeholder="DD/MM/AAAA"
                  maxLength="10"
                  autoComplete="off"
                  key={`dataEmissaoGuia-${selectedPatient?.id}-${currentPage}`}
                />
                {/* Indicador visual opcional */}
                {formData.dataEmissaoGuia && formData.dataEmissaoGuia.length === 10 && (
                  <div className="text-xs text-green-600 mt-1 flex items-center">
                    <Check size={12} className="mr-1" />
                    Data válida
                  </div>
                )}
              </div>
              
              <div className="form-field">
                <label htmlFor="dataEncaminhamentoAF" className="form-label">Data de Encaminhamento AF</label>
                <input 
                  type="text"
                  id="dataEncaminhamentoAF"
                  name="dataEncaminhamentoAF"
                  value={formData.dataEncaminhamentoAF}
                  onChange={(e) => handleDateInputChange('dataEncaminhamentoAF', e.target.value)}
                  onKeyDown={handleDateKeyDown}
                  className="form-input"
                  placeholder="DD/MM/AAAA"
                  maxLength="10"
                  autoComplete="off"
                  key={`dataEncaminhamentoAF-${selectedPatient?.id}-${currentPage}`}
                />
                {/* Indicador visual opcional */}
                {formData.dataEncaminhamentoAF && formData.dataEncaminhamentoAF.length === 10 && (
                  <div className="text-xs text-green-600 mt-1 flex items-center">
                    <Check size={12} className="mr-1" />
                    Data válida
                  </div>
                )}
              </div>
              
              {/* COMPONENTE PARA MOSTRAR A DIFERENÇA */}
              <DateDifferenceIndicator />
            </div>

            
            {/* QUARTA LINHA: Peso e Altura (2 colunas) */}
            <div className="form-grid-2-cols">
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
                  key={`peso-${selectedPatient?.id}-${currentPage}`}
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
                  key={`altura-${selectedPatient?.id}-${currentPage}`}
                />
              </div>
            </div>

            {/* QUINTA LINHA: Ciclo/Dia (largura completa) */}
            <div className="form-field mt-4">
              <label className="form-label-datas">Ciclos Previstos (Opcional)</label>
              <input 
                type="number"
                id="ciclos_previstos"
                name="ciclos_previstos"
                value={formData.ciclos_previstos || ''} // CORREÇÃO: garantir string vazia se undefined
                onChange={handleInputChange}
                className="form-input"
                placeholder="Número de ciclos previstos para o tratamento"
                min="1"
                max="100"
                style={{
                  marginBottom: '16px',
                  backgroundColor: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
                key={`ciclos-previstos-${selectedPatient?.id}-${currentPage}`}
              />
              
              {/* Indicador visual quando preenchido */}
              {formData.ciclos_previstos && (
                <div className="text-xs text-green-600 mt-1 flex items-center">
                  <Check size={12} className="mr-1" />
                  {formData.ciclos_previstos} {formData.ciclos_previstos === '1' ? 'ciclo previsto' : 'ciclos previstos'}
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="form-label-datas">Ciclo / Dia</label>
              <CicloDiaInputs
                key={`ciclodia-${selectedPatient?.id}-${currentPage}`}
                value={formData.cicloDiaEntries}
                onChange={(entries) => {
                  setFormData(prev => ({
                    ...prev,
                    cicloDiaEntries: entries,
                    ciclo: entries[0]?.ciclo || '',
                    dia: entries[0]?.dia || ''
                  }));
                }}
              />
            </div>
            
            {/* SEXTA LINHA: Comentário (largura completa) - CAMPO ALTERADO */}
            <div className="form-field">
              <label htmlFor="comentario" className="form-label-datas">Comentário</label>
              <textarea 
                id="comentario"
                name="comentario"
                value={formData.comentario || ''} // GARANTIR QUE NUNCA SEJA UNDEFINED
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Adicione comentários ou observações gerais sobre este atendimento..."
                rows="3"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>
            
            {/* Seção para anexos */}
            <div className="form-field mt-4">
              <label className="form-label-datas">Anexos</label>
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
          <StatusRegistrationSection 
            formData={formData}
            handleInputChange={handleInputChange}
            selectedPatient={selectedPatient}
            currentPage={currentPage}
            loadingSection={loadingSection}
            dataParecerRegistrado={dataParecerRegistrado}
            tempoParaAnalise={tempoParaAnalise}
          />
          
          {/* Footer com paginação e botões de ação */}
          <div className="form-footer">
            {/* Container dos botões de navegação */}
            <div className="pagination-buttons-container">
              {/* Seta para esquerda (anterior) */}
              {visibleButtonsStart > 0 && (
                <button 
                  className="pagination-nav-button"
                  onClick={navigateButtonsPrev}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              
              <div className="flex">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={visibleButtonsStart}
                    className="flex"
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -100, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Botão "Novo" sempre primeiro */}
                    {visibleButtonsStart === 0 && (
                      <button 
                        className={`pagination-button bg-green-100 hover:bg-green-200 border-green-300 text-green-800 flex items-center justify-center ${
                          currentPage === previousConsultations.length + 1 ? 'active' : ''
                        }`}
                        onClick={() => handleLoadPreviousPage(previousConsultations.length + 1)}
                      >
                        <PlusCircle size={14} className="mr-1" />
                        Novo
                      </button>
                    )}
                    
                    {/* Botões de atendimento com status colorido */}
                    {[...previousConsultations]
                      .slice(visibleButtonsStart, visibleButtonsStart + Math.min(3, previousConsultations.length))
                      .map((consultation, index) => {
                        const atendimentoNumero = index + visibleButtonsStart + 1;
                        const numeroExibido = previousConsultations.length - atendimentoNumero + 1;
                        
                        return (
                          <StatusSplitButton
                            key={consultation.id}
                            consultation={consultation}
                            atendimentoNumero={atendimentoNumero}
                            numeroExibido={numeroExibido}
                            currentPage={currentPage}
                            onClick={() => handleLoadPreviousPage(atendimentoNumero)}
                          />
                        );
                      })
                    }
                  </motion.div>
                </AnimatePresence>
              </div>
              
              {/* Seta para direita (próximo) */}
              {visibleButtonsStart < Math.max(0, previousConsultations.length - 3) && (
                <button 
                  className="pagination-nav-button"
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

        .form-grid-1-col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .form-grid-2-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        /* Grid original de 3 colunas (para as datas) */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }
        
        /* Responsividade melhorada */
        @media (max-width: 1024px) {
          .form-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .form-grid .form-field:nth-child(3) {
            grid-column: 1 / -1; /* Diferença de datas ocupa linha inteira em tablets */
          }
        }
        
        @media (max-width: 768px) {
          .form-grid,
          .form-grid-2-cols {
            grid-template-columns: 1fr;
          }
        }
        
        /* Melhorar aparência do indicador de diferença */
        .date-difference-indicator {
          display: flex;
          align-items: center;
          min-height: 38px; /* Mesma altura dos inputs */
        }
        
        /* Garantir que todos os form-fields tenham a mesma altura base */
        .form-field {
          display: flex;
          flex-direction: column;
          min-height: 70px; /* Altura mínima para consistência */
        }
        
        .form-input,
        .form-select,
        .form-textarea {
          flex: 1;
        }
          
        .pagination-button-custom:hover .status-tooltip {
          opacity: 1;
          visibility: visible;
        }
        
        .pagination-button-custom:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .pagination-button-custom.active {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
          border-color: #6b7280;
        }

        /* NOVOS ESTILOS PARA PARECER REGISTROS */
        .card-header-with-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .parecer-registro-item {
          transition: all 0.2s ease;
        }

        .parecer-registro-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .parecer-registros-list {
          padding: 1rem;
        }

        .status-section-group {
          margin-bottom: 1rem;
        }

        .status-section-subtitle {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .status-cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .status-card {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          border: 2px solid transparent;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 60px;
        }

        .status-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .status-card-selected {
          border-color: #8cb369;
          box-shadow: 0 0 0 1px #8cb369;
        }

        .status-card-icon {
          margin-right: 0.5rem;
          flex-shrink: 0;
        }

        .status-card-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          line-height: 1.2;
        }

        .tempo-analise-metrics {
          margin-top: 1rem;
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .metric-item {
          margin-bottom: 0.5rem;
        }

        .tempo-indicator {
          padding: 0.5rem;
          border-radius: 0.375rem;
          background-color: #f3f4f6;
        }

        .tempo-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          line-height: 1.5;
          resize: vertical;
          transition: border-color 0.2s ease;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #8cb369;
          box-shadow: 0 0 0 3px rgba(140, 179, 105, 0.1);
        }

        /* Responsividade para os status cards */
        @media (max-width: 768px) {
          .status-cards-container {
            grid-template-columns: 1fr;
          }
          
          .card-header-with-actions {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          
          .card-header-with-actions button {
            align-self: flex-start;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default NovaPreviaView;