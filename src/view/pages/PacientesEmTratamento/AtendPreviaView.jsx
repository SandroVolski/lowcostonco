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
import './PacientesEstilos.css';

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
  const [sortField, setSortField] = useState("data_criacao");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  // Refs
  const searchInputRef = useRef(null);
  
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
  }, [pageSize]);
  
  // Carregar dados iniciais
  useEffect(() => {
    loadPrevias();
  }, [loadPrevias]);
  
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
  
  // Handler para mudança de página
  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadPrevias(page, searchTerm, searchType);
  };
  
  // Handler para mudança no tamanho da página
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    loadPrevias(1, searchTerm, searchType);
  };
  
  // Função para navegar para uma prévia específica
  const handleViewPrevia = (previa) => {
    const url = `/PacientesEmTratamento?tab=nova-previa&patientId=${previa.paciente_id}&previaId=${previa.id}`;
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
  
  // CSS inline styles para status (substituindo o styled-jsx)
  const statusStyles = {
    statusIndicators: {
      padding: '8px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      borderTop: '1px solid #e5e7eb'
    },
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px'
    },
    statusLabel: {
      fontSize: '11px',
      color: '#6b7280',
      fontWeight: '500'
    },
    statusBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '500',
      border: '1px solid rgba(0, 0, 0, 0.1)'
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
              <div className="protocol-code">Atend. {previa.numero_sequencial}</div>
              <div className="protocol-cid">{previa.cid || 'N/D'}</div>
            </div>
            
            <div className="protocol-name">{previa.paciente_nome}</div>
            
            <div className="protocol-info">
              <div className="info-row">
                <User size={14} />
                <span>Código: {previa.paciente_codigo}</span>
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
              {/* ✓ NOVO: Exibir ciclos previstos se preenchido */}
              {previa.ciclos_previstos && (
                <div className="info-row">
                  <Clock size={14} />
                  <span>Ciclos Previstos: {previa.ciclos_previstos}</span>
                </div>
              )}
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
            
            <div className="card-actions">
              <button 
                className="action-button-pacientes info"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleViewPrevia(previa); 
                }}
                title="Ver prévia"
              >
                <Eye size={16} />
              </button>
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
    
    return (
      <div className="patient-list-item" onClick={() => handleViewPrevia(previa)}>
        <div className="list-item-code">Atend. {previa.numero_sequencial}</div>
        <div className="list-item-name">{previa.paciente_nome}</div>
        <div className="list-item-provider">{previa.paciente_codigo}</div>
        <div className="list-item-prestador">{previa.protocolo || 'N/D'}</div>
        <div className="list-item-cid">{previa.cid || 'N/D'}</div>
        <div className="list-item-gender">{previa.guia || 'N/D'}</div>
        <div className="list-item-age">{formatDate(previa.data_criacao)}</div>
        <div className="list-item-birthday">
          <div 
            style={{
              ...statusStyles.statusBadgeSmall,
              backgroundColor: parecerColors.bg, 
              color: parecerColors.text,
              fontSize: '10px',
              padding: '2px 6px'
            }}
          >
            {previa.parecer_guia || 'Pendente'}
          </div>
        </div>
        <div className="list-item-first-request">
          <div 
            style={{
              ...statusStyles.statusBadgeSmall,
              backgroundColor: finalizacaoColors.bg, 
              color: finalizacaoColors.text,
              fontSize: '10px',
              padding: '2px 6px'
            }}
          >
            {previa.finalizacao || 'Pendente'}
          </div>
        </div>
        <div className="list-item-actions">
          <button 
            className="action-button-pacientes info"
            onClick={(e) => { 
              e.stopPropagation(); 
              handleViewPrevia(previa); 
            }}
            title="Ver prévia"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>
    );
  };
  
  // Componente de paginação
  const PaginationControls = () => {
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="pagination-container">
        <div className="pagination-info">
          <span className="pagination-status">
            Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalRecords)} de {totalRecords} registros
          </span>
          
          <div className="page-size-selector">
            <label>Itens por página:</label>
            <select 
              value={pageSize} 
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="pagination-controls">
          <button 
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft size={16} />
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              className={`pagination-button ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}
          
          <button 
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight size={16} />
          </button>
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
                {filteredPrevias.map(previa => (
                  <PreviaCard key={`${previa.id}-${previa.paciente_id}`} previa={previa} />
                ))}
              </div>
            ) : (
              <div className="patients-list">
                <div className="list-header">
                  <div className="list-header-code">Atend.</div>
                  <div className="list-header-name">Paciente</div>
                  <div className="list-header-provider">Código</div>
                  <div className="list-header-prestador">Protocolo</div>
                  <div className="list-header-cid">CID</div>
                  <div className="list-header-gender">Guia</div>
                  <div className="list-header-age">Data Criação</div>
                  <div className="list-header-birthday">Parecer</div>
                  <div className="list-header-first-request">Finalização</div>
                  <div className="list-header-actions">Ações</div>
                </div>
                
                <div className="list-body">
                  {filteredPrevias.map(previa => (
                    <PreviaListItem key={`${previa.id}-${previa.paciente_id}`} previa={previa} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Paginação */}
            {totalPages > 1 && <PaginationControls />}
          </>
        )}
      </div>
    </div>
  );
};

export default AtendPreviaView;