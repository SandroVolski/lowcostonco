import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Eye, Filter, Calendar, User, FileText, 
  ArrowUpWideNarrow, ArrowDownWideNarrow, Grid, List, 
  SlidersHorizontal, Clock, Activity, CheckCircle, 
  AlertCircle, AlertTriangle, HelpCircle, Database,
  RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import DataRefreshButton from '../../../components/DataRefreshButton';
import Pagination from '../../../components/Pagination'; // Importar o componente Pagination
import './PacientesEstilos.css';
import './AtendPreviaView.css'; // Estilos específicos para a visualização em lista

// API base URL - usando versão completa
const API_BASE_URL = "https://api.lowcostonco.com.br/backend-php/api/Previas"; 
const API_ENDPOINT = "get_all_previas.php"; // Versão completa com dados de pacientes

const AtendPreviaView = () => {
  const navigate = useNavigate();
  
  // Estados principais
  const [previas, setPrevias] = useState([]);
  const [filteredPrevias, setFilteredPrevias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para controle da UI
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("patient_name"); // Voltando para busca por paciente
  const [sortField, setSortField] = useState("data_criacao"); // ALTERADO: ordenação por data de criação por padrão
  const [sortOrder, setSortOrder] = useState("desc"); // ALTERADO: ordem decrescente para mostrar mais recentes primeiro
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  
  // NOVO: Estados para ordenação local
  const [orderedPrevias, setOrderedPrevias] = useState([]);
  
  // Estados para paginação - ALTERADO: pageSize inicial para 50
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(50); // MUDADO DE 20 PARA 50
  
  // Refs
  const searchInputRef = useRef(null);
  
  // NOVA FUNÇÃO: Ordenar prévias (padrão: data de criação decrescente)
  const sortPrevias = useCallback((previas, field = "data_criacao", order = "desc") => {
    if (!previas || !Array.isArray(previas)) return [];
    
    return [...previas].sort((a, b) => {
      let aValue, bValue;
      
      // TRATAMENTO ESPECIAL para campos de status - usar último registro
      if (field === 'parecer_guia' || field === 'finalizacao') {
        const ultimoRegistroA = getLastParecerRegistro(a);
        const ultimoRegistroB = getLastParecerRegistro(b);
        
        if (field === 'parecer_guia') {
          aValue = ultimoRegistroA.parecerGuia || '';
          bValue = ultimoRegistroB.parecerGuia || '';
        } else {
          aValue = ultimoRegistroA.finalizacao || '';
          bValue = ultimoRegistroB.finalizacao || '';
        }
      } else if (field === 'titulo_atendimento') {
        // TRATAMENTO ESPECIAL para título_atendimento - usar fallback para ordenação
        aValue = a[field] || `Atend. ${a.numero_sequencial || a.id}`;
        bValue = b[field] || `Atend. ${b.numero_sequencial || b.id}`;
      } else {
        aValue = a[field] || '';
        bValue = b[field] || '';
      }
      
      // Valores vazios sempre vão para o final
      if (!aValue && bValue) return order === 'asc' ? 1 : -1;
      if (aValue && !bValue) return order === 'asc' ? -1 : 1;
      if (!aValue && !bValue) return 0;
      
      // Verificar se são campos numéricos
      const numericFields = ['id', 'numero_sequencial', 'paciente_id', 'ciclos_previstos'];
      
      if (numericFields.includes(field) && !isNaN(aValue) && !isNaN(bValue)) {
        const numA = Number(aValue);
        const numB = Number(bValue);
        const comparison = numA - numB;
        return order === 'asc' ? comparison : -comparison;
      }
      
      // Verificar se são campos de data
      const dateFields = ['data_criacao', 'data_atualizacao', 'data_solicitacao'];
      
      if (dateFields.includes(field)) {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        const comparison = dateA - dateB;
        return order === 'asc' ? comparison : -comparison;
      }
      
      // Comparação alfabética para outros campos
      const comparison = String(aValue).localeCompare(String(bValue), 'pt-BR', { 
        numeric: true, 
        sensitivity: 'base' 
      });
      return order === 'asc' ? comparison : -comparison;
    });
  }, []);

  // NOVA FUNÇÃO: Handler para mudança de ordenação
  const handleSortChange = (field) => {
    if (field === sortField) {
      // Se é o mesmo campo, inverte a ordem
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, começa com ascendente
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  // Função para carregar prévias da API
  const loadPrevias = useCallback(async (page = 1, search = '', searchType = 'patient_name') => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search: search,
        search_type: searchType,
        // SOLICITAR DADOS COMPLETOS DOS REGISTROS DE PARECER
        include_parecer_registros: 'true'
      });
      
      // Se for uma busca por status, adicionar o parâmetro de status
      if (searchType.startsWith('status_parecer_')) {
        const status = searchType.replace('status_parecer_', '');
        // Adicionar o status para parecer e finalização
        params.append('status', status);
      }
      
      console.log(`🌐 [AtendPrevia] Fazendo requisição para: ${API_BASE_URL}/${API_ENDPOINT}?${params}`);
      console.log(`📋 [AtendPrevia] Parâmetros enviados:`, Object.fromEntries(params));
      
      const response = await fetch(`${API_BASE_URL}/${API_ENDPOINT}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log("📡 [AtendPrevia] Resposta da API:", {
        total_previas: data.data?.length || 0,
        primeira_previa: data.data?.[0] ? {
          id: data.data[0].id,
          paciente_nome: data.data[0].paciente_nome,
          parecer_guia: data.data[0].parecer_guia,
          finalizacao: data.data[0].finalizacao,
          tem_parecer_registros: !!data.data[0].parecer_registros,
          tipo_parecer_registros: typeof data.data[0].parecer_registros,
          parecer_registros_raw: data.data[0].parecer_registros,
          tem_parecer_registros_processed: !!data.data[0].parecer_registros_processed,
          tipo_parecer_registros_processed: typeof data.data[0].parecer_registros_processed,
          parecer_registros_processed_raw: data.data[0].parecer_registros_processed
        } : 'nenhuma prévia'
      });
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Filtrar os resultados para mostrar apenas os que têm o status selecionado
      let filteredData = data.data || [];
      if (searchType.startsWith('status_parecer_')) {
        const status = searchType.replace('status_parecer_', '');
        // Converter o status para o formato correto
        let statusFormatted = status;
        if (status === 'favoravel') statusFormatted = 'Favorável';
        if (status === 'favoravel_inconsistencia') statusFormatted = 'Favorável com Inconsistência';
        if (status === 'inconclusivo') statusFormatted = 'Inconclusivo';
        if (status === 'desfavoravel') statusFormatted = 'Desfavorável';
        
        // FILTRAR USANDO ÚLTIMO REGISTRO DE PARECER
        filteredData = filteredData.filter(previa => {
          const ultimoRegistro = getLastParecerRegistro(previa);
          return ultimoRegistro.parecerGuia === statusFormatted || ultimoRegistro.finalizacao === statusFormatted;
        });
      }
      
      setPrevias(filteredData);
      setFilteredPrevias(filteredData);
      
      // NOVO: Aplicar ordenação aos dados carregados
      const sortedData = sortPrevias(filteredData, sortField, sortOrder);
      setOrderedPrevias(sortedData);
      
      setCurrentPage(data.pagination?.current_page || 1);
      setTotalPages(data.pagination?.total_pages || 0);
      setTotalRecords(filteredData.length);
      
      // INSTRUÇÕES PARA DEBUG
      console.log(`
🔎 INSTRUÇÕES PARA DEBUG:
1. Verifique se 'include_parecer_registros: true' está sendo enviado para a API
2. Veja se na resposta da API aparecem 'parecer_registros' ou 'parecer_registros_processed'
3. Se não aparecerem, o backend não está retornando os dados completos
4. Se aparecerem, veja se a função getLastParecerRegistro está processando corretamente
5. Para testar: clique em uma prévia e veja se navega corretamente

🎯 Total de prévias carregadas: ${filteredData.length}
📊 Primeira prévia tem registros múltiplos? ${data.data?.[0]?.parecer_registros ? 'SIM' : 'NÃO'}
      `);
      
    } catch (error) {
      console.error("Erro ao carregar prévias:", error);
      setError(error.message);
      showErrorAlert("Erro", `Não foi possível carregar os atendimentos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [pageSize, sortField, sortOrder, sortPrevias]);
  
  // Carregar dados iniciais
  useEffect(() => {
    loadPrevias();
  }, [loadPrevias]);
  
  // NOVO: Efeito para reordenar quando mudam os critérios de ordenação
  useEffect(() => {
    if (filteredPrevias && filteredPrevias.length > 0) {
      const sorted = sortPrevias(filteredPrevias, sortField, sortOrder);
      setOrderedPrevias(sorted);
    }
  }, [filteredPrevias, sortField, sortOrder, sortPrevias]);
  
  // Função para buscar com debounce
  const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };
  
  const debouncedSearch = useCallback(
    debounce((term, type) => {
      loadPrevias(1, term, type);
    }, 500),
    [loadPrevias]
  );
  
  // Handler para mudança na pesquisa
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    
    // Verifica se o valor contém números
    const hasNumbers = /\d/.test(value);
    const searchType = hasNumbers ? 'guia' : 'patient_name';
    setSearchType(searchType);
    
    debouncedSearch(value, searchType);
  };
  
  // Handler para mudança no tipo de pesquisa
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    setCurrentPage(1);
    
    // Se for um filtro de status, aplicar automaticamente sem precisar de texto
    if (type.startsWith('status_')) {
      setSearchTerm('');
      loadPrevias(1, '', type);
    } else {
      // Para outros tipos, usar o termo de busca atual
      loadPrevias(1, searchTerm, type);
    }
  };
  
  // Handler para limpar pesquisa
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchType('patient_name'); // Voltando para patient_name
    setCurrentPage(1);
    loadPrevias(1, '', 'patient_name'); // Voltando para patient_name
  };
  
  // NOVO: Handler para mudança de página
  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadPrevias(page, searchTerm, searchType);
  };
  
  // NOVO: Handler para mudança no tamanho da página
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    loadPrevias(1, searchTerm, searchType);
  };
  
  // Função para navegar para uma prévia específica
  const handleViewPrevia = (previa) => {
    console.log("🔄 Navegando para prévia:", previa.id, "do paciente:", previa.paciente_id);
    
    // Verificar se temos os dados necessários
    if (!previa || !previa.id || !previa.paciente_id) {
      console.error("❌ Dados da prévia inválidos:", previa);
      showErrorAlert("Erro", "Não foi possível identificar a prévia selecionada");
      return;
    }
    
    // DEBUG: Verificar se temos dados dos registros de parecer antes de navegar
    console.log("📋 Dados da prévia antes de navegar:", {
      id: previa.id,
      paciente_id: previa.paciente_id,
      tem_parecer_registros: !!previa.parecer_registros,
      tem_parecer_registros_processed: !!previa.parecer_registros_processed,
      parecer_direto: previa.parecer_guia,
      finalizacao_direto: previa.finalizacao
    });
    
    // Construir URL com parâmetros corretos
    const url = `/PacientesEmTratamento?tab=nova-previa&patientId=${previa.paciente_id}&previaId=${previa.id}`;
    
    console.log("🌐 Navegando para URL:", url);
    
    // Navegar para a página
    navigate(url);
  };
  
  // Função para obter cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'Favorável':
        return { bg: '#DCFCE7', text: '#15803d' }; // Verde
      case 'Favorável com Inconsistência':
        return { bg: '#FFEDD5', text: '#ea580c' }; // Laranja
      case 'Inconclusivo':
        return { bg: '#FEF9C3', text: '#ca8a04' }; // Amarelo
      case 'Desfavorável':
        return { bg: '#FECACA', text: '#dc2626' }; // Vermelho
      default:
        return { bg: '#F1F5F9', text: '#64748b' }; // Cinza
    }
  };
  
  // Função para obter ícone do status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Favorável':
        return <CheckCircle size={16} />;
      case 'Favorável com Inconsistência':
        return <AlertCircle size={16} />;
      case 'Inconclusivo':
        return <HelpCircle size={16} />;
      case 'Desfavorável':
        return <AlertTriangle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };
  
  // Função para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/D';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'N/D';
    }
  };
  
  // Função para calcular idade
  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/D';
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} anos`;
    } catch {
      return 'N/D';
    }
  };

  // FUNÇÃO: Obter o último registro de parecer de uma prévia (igual aos botões de atendimento)
  const getLastParecerRegistro = (previa) => {
    // Verificação básica
    if (!previa) {
      console.warn("⚠️ getLastParecerRegistro: prévia é null/undefined");
      return { parecerGuia: '', finalizacao: '', totalRegistros: 1 };
    }

    console.log(`🔍 [AtendPrevia] Analisando prévia ${previa.id}:`, {
      tem_parecer_registros_processed: !!previa.parecer_registros_processed,
      tipo_parecer_registros_processed: typeof previa.parecer_registros_processed,
      tem_parecer_registros: !!previa.parecer_registros,
      tipo_parecer_registros: typeof previa.parecer_registros,
      parecer_guia_direto: previa.parecer_guia,
      finalizacao_direto: previa.finalizacao
    });

    let registros = [];
    let fonteUsada = '';
    
    // 1. Tentar parecer_registros_processed primeiro
    if (previa.parecer_registros_processed && Array.isArray(previa.parecer_registros_processed)) {
      registros = previa.parecer_registros_processed;
      fonteUsada = 'parecer_registros_processed';
      console.log(`✅ [AtendPrevia] Usando parecer_registros_processed: ${registros.length} registros`, registros);
    }
    // 2. Tentar parecer_registros como JSON
    else if (previa.parecer_registros) {
      try {
        const parsed = JSON.parse(previa.parecer_registros);
        if (Array.isArray(parsed)) {
          registros = parsed;
          fonteUsada = 'parecer_registros (JSON)';
          console.log(`✅ [AtendPrevia] Usando parecer_registros JSON: ${registros.length} registros`, registros);
        }
      } catch (error) {
        console.warn("❌ [AtendPrevia] Erro ao fazer parse dos parecer_registros:", error);
        registros = [];
      }
    }
    
    // Se temos registros, pegar o último (maior ID ou último do array)
    if (Array.isArray(registros) && registros.length > 0) {
      console.log(`📊 [AtendPrevia] TODOS os registros da prévia ${previa.id}:`, registros.map((r, i) => ({
        indice: i,
        id: r.id,
        parecerGuia: r.parecerGuia || r.parecer_guia,
        finalizacao: r.finalizacao
      })));
      
      // Ordenar por ID para garantir que pegamos o último
      const sortedRegistros = [...registros].sort((a, b) => {
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA; // Ordem decrescente (maior ID primeiro)
      });
      
      const ultimoRegistro = sortedRegistros[0];
      
      console.log(`🎯 [AtendPrevia] ÚLTIMO registro selecionado da prévia ${previa.id}:`, {
        id: ultimoRegistro.id,
        parecerGuia: ultimoRegistro.parecerGuia || ultimoRegistro.parecer_guia,
        finalizacao: ultimoRegistro.finalizacao,
        fonte: fonteUsada,
        total: registros.length
      });
      
      return {
        parecerGuia: ultimoRegistro.parecerGuia || ultimoRegistro.parecer_guia || '',
        finalizacao: ultimoRegistro.finalizacao || '',
        totalRegistros: registros.length
      };
    }
    
    // Fallback: usar campos antigos diretamente da prévia
    console.log(`📄 [AtendPrevia] FALLBACK para prévia ${previa.id} - usando campos diretos:`, {
      parecer_guia: previa.parecer_guia,
      finalizacao: previa.finalizacao
    });
    
    return {
      parecerGuia: previa.parecer_guia || '',
      finalizacao: previa.finalizacao || '',
      totalRegistros: 1
    };
  };
  
  // CSS inline styles para status - OTIMIZADO PARA CARDS DE 320px
  const statusStyles = {
    statusIndicators: {
      padding: '10px 16px', // Espaçamento adequado
      display: 'flex',
      flexDirection: 'column',
      gap: '10px', // Espaçamento entre os status
      borderTop: '1px solid #e5e7eb',
      marginTop: 'auto', // Sempre no final do card
      backgroundColor: '#f8fafc', // Fundo sutil
      minHeight: '70px' // Altura mínima garantida
    },
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      minHeight: '28px' // Altura mínima para cada status
    },
    statusLabel: {
      fontSize: '11px',
      color: '#6b7280',
      fontWeight: '600', // Mais bold
      textTransform: 'uppercase',
      letterSpacing: '0.3px'
    },
    statusBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '5px 10px', // Padding otimizado
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '500',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', // Sombra sutil
      transition: 'all 0.2s ease'
    },
    statusBadgeSmall: {
      display: 'inline-block',
      borderRadius: '8px',
      fontWeight: '500',
      textAlign: 'center',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    },
    animateSpin: {
      animation: 'spin 1s linear infinite'
    }
  };
  
  // Componente de Card para visualização em grade
  const PreviaCard = ({ previa }) => {
    // USAR O ÚLTIMO REGISTRO DE PARECER (igual aos botões de atendimento)
    const ultimoRegistro = getLastParecerRegistro(previa);
    
    const parecerColors = getStatusColor(ultimoRegistro.parecerGuia);
    const finalizacaoColors = getStatusColor(ultimoRegistro.finalizacao);
    
    // Função para obter o título do atendimento
    const getTituloAtendimento = () => {
      if (previa.titulo_atendimento && previa.titulo_atendimento.trim()) {
        // Truncar se for muito longo (máximo 25 caracteres para cards)
        const titulo = previa.titulo_atendimento.trim();
        return titulo.length > 25 ? `${titulo.substring(0, 22)}...` : titulo;
      }
      // Fallback para o formato antigo
      return `Atend. ${previa.numero_sequencial || previa.id}`;
    };
    
    return (
      <div className="protocol-card" onClick={() => handleViewPrevia(previa)}>
        <div className="card-inner">
          <div className="card-front">
            <div className="card-header">
              <div 
                className="protocol-code"
                title={previa.titulo_atendimento && previa.titulo_atendimento.trim() ? 
                  previa.titulo_atendimento : 
                  `Atendimento ${previa.numero_sequencial || previa.id}`
                }
              >
                {getTituloAtendimento()}
                {/* Indicador de múltiplos registros - Design melhorado */}
                {ultimoRegistro.totalRegistros > 1 && (
                  <span 
                    style={{
                      fontSize: '9px',
                      backgroundColor: '#8cb369',
                      color: 'white',
                      padding: '3px 6px',
                      borderRadius: '12px',
                      marginLeft: '6px',
                      fontWeight: '700',
                      border: '1px solid rgba(255,255,255,0.3)',
                      boxShadow: '0 2px 4px rgba(140, 179, 105, 0.3)',
                      minWidth: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1'
                    }}
                    title={`${ultimoRegistro.totalRegistros} registros de parecer`}
                  >
                    {ultimoRegistro.totalRegistros}
                  </span>
                )}
              </div>
              <div className="protocol-cid">{previa.cid || 'N/D'}</div>
            </div>
            
            <div className="protocol-name">{previa.paciente_nome || 'Paciente não identificado'}</div>
            
            <div className="protocol-info">
              <div className="info-row">
                <User size={14} />
                <span>Código: {previa.paciente_codigo || 'N/D'}</span>
              </div>
              <div className="info-row">
                <FileText size={14} />
                <span>Protocolo: {previa.protocolo || 'N/D'}</span>
              </div>
              <div className="info-row">
                <Calendar size={14} />
                <span>Criado: {formatDate(previa.data_criacao)}</span>
              </div>
              <div className="info-row">
                <Activity size={14} />
                <span>Guia: {previa.guia || 'N/D'}</span>
              </div>
            </div>
            
            {/* Status cards - USANDO ÚLTIMO REGISTRO */}
            <div style={statusStyles.statusIndicators}>
              <div style={statusStyles.statusItem}>
                <span style={statusStyles.statusLabel}>
                  Parecer{ultimoRegistro.totalRegistros > 1 ? ' (Último):' : ':'}
                </span>
                <div 
                  style={{ 
                    ...statusStyles.statusBadge,
                    backgroundColor: parecerColors.bg, 
                    color: parecerColors.text,
                    borderRadius: '16px',
                    padding: '6px 12px',
                    border: `1px solid ${parecerColors.text}20`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontWeight: '600'
                  }}
                  title={ultimoRegistro.totalRegistros > 1 ? 
                    `Último de ${ultimoRegistro.totalRegistros} registros: ${ultimoRegistro.parecerGuia || 'Pendente'}` : 
                    ultimoRegistro.parecerGuia || 'Pendente'
                  }
                >
                  {getStatusIcon(ultimoRegistro.parecerGuia)}
                  <span style={{ marginLeft: '4px' }}>
                    {ultimoRegistro.parecerGuia === 'Favorável com Inconsistência' ? 'Fav. c/ Inc.' : (ultimoRegistro.parecerGuia || 'Pendente')}
                  </span>
                </div>
              </div>
              
              <div style={statusStyles.statusItem}>
                <span style={statusStyles.statusLabel}>
                  Finalização{ultimoRegistro.totalRegistros > 1 ? ' (Último):' : ':'}
                </span>
                <div 
                  style={{ 
                    ...statusStyles.statusBadge,
                    backgroundColor: finalizacaoColors.bg, 
                    color: finalizacaoColors.text,
                    borderRadius: '16px',
                    padding: '6px 12px',
                    border: `1px solid ${finalizacaoColors.text}20`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontWeight: '600'
                  }}
                  title={ultimoRegistro.totalRegistros > 1 ? 
                    `Último de ${ultimoRegistro.totalRegistros} registros: ${ultimoRegistro.finalizacao || 'Pendente'}` : 
                    ultimoRegistro.finalizacao || 'Pendente'
                  }
                >
                  {getStatusIcon(ultimoRegistro.finalizacao)}
                  <span style={{ marginLeft: '4px' }}>
                    {ultimoRegistro.finalizacao === 'Favorável com Inconsistência' ? 'Fav. c/ Inc.' : (ultimoRegistro.finalizacao || 'Pendente')}
                  </span>
                </div>
              </div>
            </div>
            

          </div>
        </div>
      </div>
    );
  };
  
  // Componente para visualização em lista
  const PreviaListItem = ({ previa }) => {
    // USAR O ÚLTIMO REGISTRO DE PARECER (igual aos botões de atendimento)
    const ultimoRegistro = getLastParecerRegistro(previa);
    
    const parecerColors = getStatusColor(ultimoRegistro.parecerGuia);
    const finalizacaoColors = getStatusColor(ultimoRegistro.finalizacao);
    
    // Função para truncar texto e mostrar tooltip
    const renderTruncatedText = (text, maxLength = 20, className = "") => {
      const displayText = text || 'N/D';
      const isTruncated = displayText.length > maxLength;
      const truncatedText = isTruncated ? `${displayText.substring(0, maxLength)}...` : displayText;
      
      return (
        <div 
          className={`truncated-cell ${className}`} 
          title={isTruncated ? displayText : ''}
        >
          {truncatedText}
        </div>
      );
    };

    // Função para renderizar status badge com abreviação melhorada
    const renderStatusBadge = (status, colors, totalRegistros = 1) => {
      const displayText = status || 'Pendente';
      let shortText = displayText;
      
      // Abreviações melhoradas para status longos
      const abbreviations = {
        'Favorável com Inconsistência': 'Fav. c/ Inc.',
        'Favorável': 'Favorável',
        'Inconclusivo': 'Inconclusivo',
        'Desfavorável': 'Desfavorável',
        'Pendente': 'Pendente'
      };
      
      shortText = abbreviations[displayText] || displayText;
      
      // Tooltip melhorado para múltiplos registros
      const tooltipText = totalRegistros > 1 ? 
        `Último de ${totalRegistros} registros: ${displayText}` : 
        displayText;
      
      return (
        <div 
          className="status-badge-wrapper"
          title={tooltipText}
          style={{
            position: 'relative',
            display: 'inline-block',
            // CORREÇÃO: Adicionar padding para acomodar a bolinha
            padding: totalRegistros > 1 ? '10px 10px 0 0' : '0'
          }}
        >
          <div 
            className="status-badge-custom"
            style={{
              backgroundColor: colors.bg, 
              color: colors.text,
              fontSize: '10px',
              padding: '6px 10px',
              borderRadius: '16px',
              border: `1px solid ${colors.text}20`,
              fontWeight: '600',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: '80px',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              position: 'relative',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            {shortText}
          </div>
          {/* CORREÇÃO: Mover indicador para fora do badge */}
          {totalRegistros > 1 && (
            <span 
              style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                fontSize: '9px',
                backgroundColor: '#8cb369',
                color: 'white',
                padding: '3px 6px',
                borderRadius: '12px',
                lineHeight: '1',
                fontWeight: '700',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(140, 179, 105, 0.4)',
                minWidth: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
              title={`${totalRegistros} registros de parecer`}
            >
              {totalRegistros}
            </span>
          )}
        </div>
      );
    };
    
    // Função para obter o título do atendimento para lista
    const getTituloAtendimentoLista = () => {
      if (previa.titulo_atendimento && previa.titulo_atendimento.trim()) {
        // Para lista, usar até 20 caracteres
        const titulo = previa.titulo_atendimento.trim();
        return titulo.length > 20 ? `${titulo.substring(0, 17)}...` : titulo;
      }
      // Fallback para o formato antigo
      return previa.numero_sequencial || previa.id;
    };
    
    return (
      <div className="patient-list-item previa-list-row" onClick={() => handleViewPrevia(previa)}>
        <div 
          className="list-item-code"
          title={previa.titulo_atendimento && previa.titulo_atendimento.trim() ? 
            previa.titulo_atendimento : 
            `Atendimento ${previa.numero_sequencial || previa.id}`
          }
        >
          {getTituloAtendimentoLista()}
          {/* Indicador de múltiplos registros para o código - Design melhorado */}
          {ultimoRegistro.totalRegistros > 1 && (
            <span 
              style={{
                fontSize: '8px',
                backgroundColor: '#8cb369',
                color: 'white',
                padding: '2px 5px',
                borderRadius: '10px',
                marginLeft: '6px',
                fontWeight: '700',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 1px 3px rgba(140, 179, 105, 0.3)',
                minWidth: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1'
              }}
              title={`${ultimoRegistro.totalRegistros} registros de parecer`}
            >
              {ultimoRegistro.totalRegistros}
            </span>
          )}
        </div>
        <div className="list-item-name">
          {renderTruncatedText(previa.paciente_nome || 'Paciente não identificado', 30)}
        </div>
        <div className="list-item-provider">
          {previa.paciente_codigo || 'N/D'}
        </div>
        <div className="list-item-prestador">
          {renderTruncatedText(previa.protocolo, 20)}
        </div>
        <div className="list-item-cid">
          {previa.cid || 'N/D'}
        </div>
        <div className="list-item-gender">
          {renderTruncatedText(previa.guia, 18)}
        </div>
        <div className="list-item-age">
          {formatDate(previa.data_criacao)}
        </div>
        <div className="list-item-birthday">
          {renderStatusBadge(ultimoRegistro.parecerGuia, parecerColors, ultimoRegistro.totalRegistros)}
        </div>
        <div className="list-item-first-request">
          {renderStatusBadge(ultimoRegistro.finalizacao, finalizacaoColors, ultimoRegistro.totalRegistros)}
        </div>

      </div>
    );
  };
  
  return (
    <div className="patient-dashboard">
      
      {/* Barra superior com ações */}
      <div className="dashboard-header">
        <div className="view-toggle">
          <button 
            className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Visualização em grade"
          >
            <Grid size={18} />
          </button>
          <button 
            className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Visualização em lista"
          >
            <List size={18} />
          </button>
        </div>
        
        <div className="search-container-pacientes">
          <div className="search-bar-pacientes">
            <Search size={18} className="search-icon-pacientes" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Digite o nome do paciente ou número da guia..."
              value={searchTerm}
              onChange={handleSearchChange}
              disabled={searchType.startsWith('status_')}
              style={searchType.startsWith('status_') ? {
                backgroundColor: '#f3f4f6',
                cursor: 'not-allowed',
                color: '#6b7280'
              } : {}}
            />
            {searchTerm && (
              <button className="clear-search-pacientes" onClick={handleClearSearch}>
                <X size={16} />
              </button>
            )}
            {searchType.startsWith('status_') && (
              <button 
                className="clear-search-pacientes" 
                onClick={handleClearSearch}
                title="Limpar filtro"
                style={{right: '8px'}}
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="search-options">
            <div className="search-types">
              <label className={searchType === 'status_parecer_favoravel' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'status_parecer_favoravel'} 
                  onChange={() => handleSearchTypeChange('status_parecer_favoravel')} 
                />
                <span>Favorável</span>
              </label>
              <label className={searchType === 'status_parecer_favoravel_inconsistencia' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'status_parecer_favoravel_inconsistencia'} 
                  onChange={() => handleSearchTypeChange('status_parecer_favoravel_inconsistencia')} 
                />
                <span>Fav. c/ Inconsistência</span>
              </label>
              <label className={searchType === 'status_parecer_inconclusivo' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'status_parecer_inconclusivo'} 
                  onChange={() => handleSearchTypeChange('status_parecer_inconclusivo')} 
                />
                <span>Inconclusivo</span>
              </label>
              <label className={searchType === 'status_parecer_desfavoravel' ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="searchType" 
                  checked={searchType === 'status_parecer_desfavoravel'} 
                  onChange={() => handleSearchTypeChange('status_parecer_desfavoravel')} 
                />
                <span>Desfavorável</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* NOVO: Controles de ordenação */}
        <div className="sort-container-pacientes">
          <div className="sort-label">
            <SlidersHorizontal size={14} /> Ordenar por
          </div>
          <div className="sort-options">
            <select 
              value={sortField}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="data_criacao">Data de Criação</option>
              <option value="titulo_atendimento">Título do Atendimento</option>
              <option value="paciente_nome">Nome do Paciente</option>
              <option value="protocolo">Protocolo</option>
              <option value="guia">Guia</option>
              <option value="cid">CID</option>
              <option value="parecer_guia">Parecer</option>
              <option value="finalizacao">Finalização</option>
              <option value="numero_sequencial">Número Atendimento</option>
            </select>
            <button 
              className="sort-order-button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <ArrowUpWideNarrow size={16} /> : <ArrowDownWideNarrow size={16} />}
            </button>
          </div>
        </div>
        
        <div className="controls-container">
          <button 
            className="cache-button" 
            onClick={() => loadPrevias(currentPage, searchTerm, searchType)}
            disabled={loading}
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>
      
      {/* Barra de informações */}
      <div className="info-bar">
        <div className="patient-count">
          <Activity size={16} />
          <span>
            {totalRecords} {totalRecords === 1 ? 'atendimento' : 'atendimentos'}
            {searchTerm && (
              <>
                {` encontrado${totalRecords === 1 ? '' : 's'} para "${searchTerm}"`}
                {searchType === 'guia' ? ' (busca por número da guia)' : ' (busca por nome do paciente)'}
              </>
            )}
            {searchType.startsWith('status_parecer_') && !searchTerm && ` com status ${searchType.replace('status_parecer_', '')} no Parecer ou Finalização`}
          </span>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="patients-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando atendimentos...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">Erro: {error}</p>
            <button className="reload-button" onClick={() => loadPrevias()}>
              Tentar novamente
            </button>
          </div>
        ) : filteredPrevias.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} />
            <p>Nenhum atendimento encontrado</p>
            {searchTerm && (
              <button className="clear-search-button" onClick={handleClearSearch}>
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="patients-grid">
                {(orderedPrevias.length > 0 ? orderedPrevias : filteredPrevias).map(previa => (
                  <PreviaCard key={`${previa.id}-${previa.paciente_id}`} previa={previa} />
                ))}
              </div>
            ) : (
              <div className="patients-list">
                <div className="list-header">
                  <div 
                    className={`list-header-code sortable ${sortField === 'titulo_atendimento' ? 'active' : sortField === 'numero_sequencial' ? 'active' : ''}`}
                    onClick={() => handleSortChange('titulo_atendimento')}
                    title="Ordenar por Título do Atendimento"
                  >
                    Título
                    {(sortField === 'titulo_atendimento' || sortField === 'numero_sequencial') && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-name sortable ${sortField === 'paciente_nome' ? 'active' : ''}`}
                    onClick={() => handleSortChange('paciente_nome')}
                  >
                    Paciente
                    {sortField === 'paciente_nome' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-provider sortable ${sortField === 'paciente_codigo' ? 'active' : ''}`}
                    onClick={() => handleSortChange('paciente_codigo')}
                  >
                    Código
                    {sortField === 'paciente_codigo' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-prestador sortable ${sortField === 'protocolo' ? 'active' : ''}`}
                    onClick={() => handleSortChange('protocolo')}
                  >
                    Protocolo
                    {sortField === 'protocolo' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-cid sortable ${sortField === 'cid' ? 'active' : ''}`}
                    onClick={() => handleSortChange('cid')}
                  >
                    CID
                    {sortField === 'cid' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-gender sortable ${sortField === 'guia' ? 'active' : ''}`}
                    onClick={() => handleSortChange('guia')}
                  >
                    Guia
                    {sortField === 'guia' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-age sortable ${sortField === 'data_criacao' ? 'active' : ''}`}
                    onClick={() => handleSortChange('data_criacao')}
                  >
                    Data Criação
                    {sortField === 'data_criacao' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-birthday sortable ${sortField === 'parecer_guia' ? 'active' : ''}`}
                    onClick={() => handleSortChange('parecer_guia')}
                  >
                    Parecer
                    {sortField === 'parecer_guia' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>
                  <div 
                    className={`list-header-first-request sortable ${sortField === 'finalizacao' ? 'active' : ''}`}
                    onClick={() => handleSortChange('finalizacao')}
                  >
                    Finalização
                    {sortField === 'finalizacao' && (
                      sortOrder === 'asc' ? <ArrowUpWideNarrow size={12} /> : <ArrowDownWideNarrow size={12} />
                    )}
                  </div>

                </div>
                
                <div className="list-body">
                  {(orderedPrevias.length > 0 ? orderedPrevias : filteredPrevias).map(previa => (
                    <PreviaListItem key={`${previa.id}-${previa.paciente_id}`} previa={previa} />
                  ))}
                </div>
              </div>
            )}
            
            {/* ALTERADO: Usar o componente Pagination igual ao CadastroPaciente */}
            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                disabled={loading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AtendPreviaView;

/*
🚨 INSTRUÇÕES PARA DEBUG DOS REGISTROS DE PARECER:

📍 PROBLEMA IDENTIFICADO:
O usuário relata que quando clica numa prévia no AtendPreviaView para navegar para 
a página de edição, apenas o primeiro registro de parecer é carregado.

🔍 COMO FAZER DEBUG:

1. ABRA O DEVTOOLS (F12) e vá para a aba CONSOLE

2. RECARREGUE A PÁGINA AtendPreviaView 

3. VERIFIQUE OS LOGS:
   ✅ "Fazendo requisição para..." - deve mostrar include_parecer_registros=true
   ✅ "Parâmetros enviados" - deve incluir include_parecer_registros: 'true'
   ✅ "Resposta da API" - deve mostrar se tem parecer_registros na primeira prévia
   ✅ "Analisando prévia X" - deve mostrar se encontrou registros múltiplos

4. SE NÃO APARECER include_parecer_registros=true:
   - O problema está na requisição
   - Verificar se o parâmetro está sendo adicionado corretamente

5. SE APARECER include_parecer_registros=true MAS "parecer_registros" for null:
   - O problema está no BACKEND
   - A API não está processando o parâmetro include_parecer_registros
   - Precisa verificar get_all_previas.php

6. SE APARECER parecer_registros MAS getLastParecerRegistro usar FALLBACK:
   - O problema está no parsing dos dados
   - Verificar o formato dos dados retornados

7. TESTE DE NAVEGAÇÃO:
   - Clique numa prévia que deveria ter múltiplos registros
   - Veja se navega corretamente para NovaPreviaView
   - Verifique se todos os registros são carregados na página de edição

📧 REPORTE O PROBLEMA COM ESTES LOGS DO CONSOLE
*/

/* ESTILOS COMPLEMENTARES PARA CONTROLES DE ORDENAÇÃO E DESIGN MELHORADO */
const addSortingStyles = () => {
  const styleId = 'atend-previa-sorting-styles';
  
  // Verificar se o estilo já foi adicionado
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Estilos para controles de ordenação */
    .sort-container-pacientes {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .sort-label {
      font-size: 12px;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .sort-options {
      display: flex;
      align-items: center;
      background-color: #f9fafb;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .sort-options select {
      border: none;
      background: none;
      padding: 6px 12px;
      font-size: 13px;
      color: #374151;
      outline: none;
      cursor: pointer;
    }
    
    .sort-order-button {
      background: none;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 10px;
      color: #6b7280;
      cursor: pointer;
      transition: color 0.2s;
    }
    
    .sort-order-button:hover {
      color: #374151;
    }
    
    /* Centralização dos headers para lista sem ações */
    .patients-list .list-header .sortable {
      justify-content: center;
      text-align: center;
    }
    
    /* NOVOS ESTILOS: Design melhorado para badges e indicadores */
    .status-badge-custom:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
    }
    
    .protocol-card:hover .status-badge-custom {
      box-shadow: 0 3px 6px rgba(0,0,0,0.12) !important;
    }
    
    /* Animação para indicadores de múltiplos registros */
    @keyframes pulse-indicator {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    .protocol-card:hover span[title*="registros de parecer"] {
      animation: pulse-indicator 2s ease-in-out infinite;
    }
    
    /* CORREÇÃO: Estilos para evitar corte dos indicadores nas listas */
    .list-item-birthday,
    .list-item-first-request {
      overflow: visible !important;
      position: relative;
      padding-top: 12px !important;
      padding-bottom: 12px !important;
    }
    
    .status-badge-wrapper {
      overflow: visible !important;
    }
    
    /* Garantir que as células da lista tenham altura suficiente */
    .previa-list-row {
      min-height: 60px;
      align-items: center;
    }
    
    .previa-list-row > div {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
    }

    /* Melhor responsividade para textos longos */
    @media (max-width: 1200px) {
      .status-badge-custom {
        max-width: 100px !important;
        font-size: 9px !important;
      }
      
      /* Reduzir padding em telas menores */
      .status-badge-wrapper {
        padding: 8px 8px 0 0 !important;
      }
    }
    
    @media (max-width: 900px) {
      .status-badge-custom {
        max-width: 85px !important;
        font-size: 8px !important;
        padding: 4px 8px !important;
      }
      
      /* Padding ainda menor para mobile */
      .status-badge-wrapper {
        padding: 6px 6px 0 0 !important;
      }
      
      .list-item-birthday,
      .list-item-first-request {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }
    }
    
    /* Responsividade dos controles */
    @media (max-width: 1024px) {
      .dashboard-header {
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .sort-container-pacientes {
        order: 2;
        width: auto;
      }
      
      .controls-container {
        order: 3;
      }
    }
    
    @media (max-width: 768px) {
      .sort-container-pacientes {
        width: 100%;
        justify-content: flex-end;
      }
      
      .sort-label {
        display: none;
      }
    }
  `;
  
  document.head.appendChild(style);
};

// Adicionar os estilos quando o componente for carregado
if (typeof document !== 'undefined') {
  addSortingStyles();
}