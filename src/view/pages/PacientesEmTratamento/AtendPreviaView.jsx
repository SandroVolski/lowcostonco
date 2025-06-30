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
  const [sortField, setSortField] = useState("paciente_nome"); // ALTERADO: ordenação alfabética por padrão
  const [sortOrder, setSortOrder] = useState("asc"); // ALTERADO: ordem ascendente por padrão
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
  
  // NOVA FUNÇÃO: Ordenar prévias alfabeticamente
  const sortPrevias = useCallback((previas, field = "paciente_nome", order = "asc") => {
    if (!previas || !Array.isArray(previas)) return [];
    
    return [...previas].sort((a, b) => {
      let aValue = a[field] || '';
      let bValue = b[field] || '';
      
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
        search_type: searchType
      });
      
      // Se for uma busca por status, adicionar o parâmetro de status
      if (searchType.startsWith('status_parecer_')) {
        const status = searchType.replace('status_parecer_', '');
        // Adicionar o status para parecer e finalização
        params.append('status', status);
      }
      
      const response = await fetch(`${API_BASE_URL}/${API_ENDPOINT}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
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
        
        filteredData = filteredData.filter(previa => 
          previa.parecer_guia === statusFormatted || previa.finalizacao === statusFormatted
        );
      }
      
      setPrevias(filteredData);
      setFilteredPrevias(filteredData);
      
      // NOVO: Aplicar ordenação aos dados carregados
      const sortedData = sortPrevias(filteredData, sortField, sortOrder);
      setOrderedPrevias(sortedData);
      
      setCurrentPage(data.pagination?.current_page || 1);
      setTotalPages(data.pagination?.total_pages || 0);
      setTotalRecords(filteredData.length);
      
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
    console.log("Navegando para prévia:", previa);
    
    // Verificar se temos os dados necessários
    if (!previa || !previa.id || !previa.paciente_id) {
      console.error("Dados da prévia inválidos:", previa);
      toast({
        title: "Erro",
        description: "Não foi possível identificar a prévia selecionada",
        variant: "destructive"
      });
      return;
    }
    
    // Construir URL com parâmetros corretos
    const url = `/PacientesEmTratamento?tab=nova-previa&patientId=${previa.paciente_id}&previaId=${previa.id}`;
    
    console.log("Navegando para URL:", url);
    
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
    const parecerColors = getStatusColor(previa.parecer_guia);
    const finalizacaoColors = getStatusColor(previa.finalizacao);
    
    return (
      <div className="protocol-card" onClick={() => handleViewPrevia(previa)}>
        <div className="card-inner">
          <div className="card-front">
            <div className="card-header">
              <div className="protocol-code">Atend. {previa.numero_sequencial || previa.id}</div>
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
            
            {/* Status cards */}
            <div style={statusStyles.statusIndicators}>
              <div style={statusStyles.statusItem}>
                <span style={statusStyles.statusLabel}>Parecer:</span>
                <div 
                  style={{ 
                    ...statusStyles.statusBadge,
                    backgroundColor: parecerColors.bg, 
                    color: parecerColors.text 
                  }}
                >
                  {getStatusIcon(previa.parecer_guia)}
                  <span>{previa.parecer_guia || 'Pendente'}</span>
                </div>
              </div>
              
              <div style={statusStyles.statusItem}>
                <span style={statusStyles.statusLabel}>Finalização:</span>
                <div 
                  style={{ 
                    ...statusStyles.statusBadge,
                    backgroundColor: finalizacaoColors.bg, 
                    color: finalizacaoColors.text 
                  }}
                >
                  {getStatusIcon(previa.finalizacao)}
                  <span>{previa.finalizacao || 'Pendente'}</span>
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
    const parecerColors = getStatusColor(previa.parecer_guia);
    const finalizacaoColors = getStatusColor(previa.finalizacao);
    
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

    // Função para renderizar status badge com abreviação
    const renderStatusBadge = (status, colors) => {
      const displayText = status || 'Pendente';
      let shortText = displayText;
      
      // Abreviações inteligentes para status longos
      const abbreviations = {
        'Favorável com Inconsistência': 'Fav. c/ Incons.',
        'Favorável': 'Favorável',
        'Inconclusivo': 'Inconclusivo',
        'Desfavorável': 'Desfavorável',
        'Pendente': 'Pendente'
      };
      
      shortText = abbreviations[displayText] || displayText;
      
      return (
        <div 
          className="status-badge-wrapper"
          title={displayText}
        >
          <div 
            className="status-badge-custom"
            style={{
              backgroundColor: colors.bg, 
              color: colors.text,
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${colors.text}30`,
              fontWeight: '500',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: '75px',
              maxWidth: '110px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {shortText}
          </div>
        </div>
      );
    };
    
    return (
      <div className="patient-list-item previa-list-row" onClick={() => handleViewPrevia(previa)}>
        <div className="list-item-code">
          {previa.numero_sequencial || previa.id}
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
          {renderStatusBadge(previa.parecer_guia, parecerColors)}
        </div>
        <div className="list-item-first-request">
          {renderStatusBadge(previa.finalizacao, finalizacaoColors)}
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
              <option value="paciente_nome">Nome do Paciente</option>
              <option value="data_criacao">Data de Criação</option>
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
                    className={`list-header-code sortable ${sortField === 'numero_sequencial' ? 'active' : ''}`}
                    onClick={() => handleSortChange('numero_sequencial')}
                  >
                    Atend.
                    {sortField === 'numero_sequencial' && (
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

/* ESTILOS COMPLEMENTARES PARA CONTROLES DE ORDENAÇÃO */
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