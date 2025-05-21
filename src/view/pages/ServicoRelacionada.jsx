import React, { useState, useEffect, useRef } from "react";
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import PageTransition from "../../components/PageTransition";
import { useServiceData } from '../../components/ServiceContext';
import { DropdownOptionsProvider, useDropdownOptions } from '../../components/DropdownOptionsContext';
import CacheControl from '../../components/CacheControl';
import DataRefreshButton from '../../components/DataRefreshButton';
import ScrollableTabs from '../../components/ScrollableTabs'; // Ajuste o caminho conforme sua estrutura de pastas

import '../../App.css';
import './ServicoRelacionada.css';
import '../../utils/CustomAlerts.css';

import { Search, Plus, Trash2, Edit, RefreshCw, X, Save, Database, Info, Filter } from "lucide-react";
import { 
  showSuccessAlert, 
  showErrorAlert, 
  showWarningAlert, 
  showInfoAlert, 
  showConfirmAlert,
  showSuccessPopup 
} from '../../utils/CustomAlerts';

export default function ServicoRelacionada() {
  return (
    <DropdownOptionsProvider>
      <ServicoRelacionadaContent />
    </DropdownOptionsProvider>
  );
}

function ServicoRelacionadaContent() {
  // Estados existentes
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("auto");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('geral');
  const [updateCounter, setUpdateCounter] = useState(0);
  const [showCacheControl, setShowCacheControl] = useState(false);
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [updatingRows, setUpdatingRows] = useState(new Set());
  const [enhancedData, setEnhancedData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);

  const API_BASE_URL = "https://api.lowcostonco.com.br/backend-php/api/ServicoRelacionada"; //AQUI MUDAR

  // Referências
  const dataTableRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Função para limpar o estado do serviço
  const resetNewServiceData = () => {
    return {
      Cod: '',
      Codigo_TUSS: '',
      Codigo_Celos: '',
      Descricao_Padronizada: '',
      Descricao_Resumida: '',
      Descricao_Comercial: '',
      Descricao_Comercial_Completa: '',
      Descricao_TUSS: '',
      Concentracao: '',
      Fracionamento: '',
      Laboratorio: '',
      Uso: '',
      Revisado_Farma: 0,
      Revisado_ADM: 0,
      
      // Campos de RegistroVisa
      RegistroVisa: '',
      Cod_Ggrem: '',
      Principio_Ativo: '',
      Lab: '',
      cnpj_lab: '',
      Classe_Terapeutica: '',
      Tipo_Porduto: '',
      Regime_Preco: '',
      Restricao_Hosp: '',
      Cap: '',
      Confaz87: '',
      Icms0: '',
      Lista: '',
      Status: '',
      
      // Campos de Tabela
      tabela: '',
      tabela_classe: '',
      tabela_tipo: '',
      classe_Jaragua_do_sul: '',
      classificacao_tipo: '',
      finalidade: '',
      objetivo: '',
      
      // IDs para relacionamentos
      idRegistroVisa: null,
      idViaAdministracao: null,
      idClasseFarmaceutica: null,
      idPrincipioAtivo: null,
      idArmazenamento: null,
      idMedicamento: null,
      idUnidadeFracionamento: null,
      idFatorConversao: null,
      idTaxas: null,
      idTabela: null,
  
      // Outros campos
      Via_administracao: '',
      ViaAdministracao: '',
      Via_Administração: '',
      ClasseFarmaceutica: '',
      Classe_Farmaceutica: '',
      PrincipioAtivo: '',
      Princípio_Ativo: '',
      PrincipioAtivoClassificado: '',
      Princípio_Ativo_Classificado: '',
      FaseUGF: '',
      FaseuGF: '',
      Armazenamento: '',
      tipo_medicamento: '',
      Medicamento: '',
      
      // Unidade de Fracionamento
      UnidadeFracionamento: '',
      Unidade_Fracionamento: '',
      UnidadeFracionamentoDescricao: '',
      Descricao: '',
      Divisor: '',
      
      // Taxas
      tipo_taxa: '',
      'tipo taxa': '',
      TaxaFinalidade: '',
      'ID Taxa': '',
      'Tempo infusão': '',
      tempo_infusao: '',
      fator: '',
      Fator_Conversão: '',
      
      // NOVOS CAMPOS - Aba Entrada
      Unidade_Entrada: '',
      Quantidade_Entrada: '',
      Unidade_Entrada_Convertida: '',
      Quantidade_Convertida: '',
      
      // NOVOS CAMPOS - Aba Pagamento
      Unidade_Pagamento_Nao_Fracionado: '',
      Quantidade_Pagamento_Nao_Fracionado: '',
      Unidade_Pagamento_Fracionado: '',
      Quantidade_Pagamento_Fracionado: ''
    };
  };

  const [newServiceData, setNewServiceData] = useState(resetNewServiceData());

  // Usando o contexto de serviços
  const { 
    serviceData, 
    loading, 
    error, 
    hasMore, 
    sortOrder, 
    sortField,
    setSortOrder,
    setSortField,
    changeSort,
    loadMore,
    updateService,
    deleteService,
    loadServiceData,
    initialized,
    addService,
    isCacheEnabled,
    clearCache: clearServicesCache,
    searchTerm: apiSearchTerm,
    searchType: apiSearchType,
    isSearching,
    totalResults,
    searchServiceData,
    clearSearch
  } = useServiceData();

  const { dropdownOptions } = useDropdownOptions();

  // Função para acessar valores em objetos de forma segura
  const getSafeValue = (obj, path, defaultValue = '-') => {
    if (!obj) return defaultValue;
    
    const keys = Array.isArray(path) ? path : [path];
    
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        return obj[key];
      }
    }
    
    return defaultValue;
  };

  // Função para melhorar os dados do serviço selecionado com dados relacionados
  const enhanceSelectedService = (service) => {
    if (!service) return null;

    console.log("Iniciando aprimoramento do serviço:", service);
    console.log("Codigo_TUSS recebido:", service.Codigo_TUSS || service.codigoTUSS, 
      typeof (service.Codigo_TUSS || service.codigoTUSS));
    
    const enhanced = { ...service };
    
    // Garantir que Codigo_TUSS esteja corretamente definido
    if (enhanced.codigoTUSS !== undefined && enhanced.Codigo_TUSS === undefined) {
      enhanced.Codigo_TUSS = enhanced.codigoTUSS;
    }
    // Verificar e preencher campos relacionados aos IDs
    if (enhanced.idPrincipioAtivo && dropdownOptions.principioAtivo) {
      const principio = dropdownOptions.principioAtivo.find(
        item => String(item.idPrincipioAtivo) === String(enhanced.idPrincipioAtivo)
      );
      
      if (principio) {
        enhanced.PrincipioAtivo = principio.PrincipioAtivo;
        enhanced.Principio_Ativo = principio.PrincipioAtivo;
        // Remove the fallbacks to PrincipioAtivo here:
        enhanced.PrincipioAtivoClassificado = principio.PrincipioAtivoClassificado || '';
        enhanced.Princípio_Ativo_Classificado = principio.PrincipioAtivoClassificado || '';
        enhanced.FaseUGF = principio.FaseUGF || '';
        enhanced.FaseuGF = principio.FaseUGF || '';
      }
    }
    
    if (enhanced.idViaAdministracao && dropdownOptions.viaAdministracao) {
      const via = dropdownOptions.viaAdministracao.find(
        item => String(item.idviaadministracao) === String(enhanced.idViaAdministracao)
      );
      
      if (via) {
        enhanced.ViaAdministracao = via.Via_administracao;
        enhanced.Via_Administração = via.Via_administracao;
        enhanced.Via_administracao = via.Via_administracao;
      }
    }
    
    if (enhanced.idClasseFarmaceutica && dropdownOptions.classeFarmaceutica) {
      const classe = dropdownOptions.classeFarmaceutica.find(
        item => String(item.id_medicamento) === String(enhanced.idClasseFarmaceutica)
      );
      
      if (classe) {
        enhanced.ClasseFarmaceutica = classe.ClasseFarmaceutica;
        enhanced.Classe_Farmaceutica = classe.ClasseFarmaceutica;
      }
    }
    
    if (enhanced.idArmazenamento && dropdownOptions.armazenamento) {
      const armazenamento = dropdownOptions.armazenamento.find(
        item => String(item.idArmazenamento) === String(enhanced.idArmazenamento)
      );
      
      if (armazenamento) {
        enhanced.Armazenamento = armazenamento.Armazenamento;
      }
    }
    
    if (enhanced.idMedicamento && dropdownOptions.tipoMedicamento) {
      const medicamento = dropdownOptions.tipoMedicamento.find(
        item => String(item.id_medicamento) === String(enhanced.idMedicamento)
      );
      
      if (medicamento) {
        enhanced.tipo_medicamento = medicamento.tipo_medicamento;
        enhanced.Medicamento = medicamento.tipo_medicamento;
      }
    }
    
    if (enhanced.idUnidadeFracionamento && dropdownOptions.unidadeFracionamento) {
      const unidade = dropdownOptions.unidadeFracionamento.find(
        item => String(item.id_unidadefracionamento) === String(enhanced.idUnidadeFracionamento)
      );
      
      if (unidade) {
        enhanced.UnidadeFracionamento = unidade.UnidadeFracionamento;
        enhanced.Unidade_Fracionamento = unidade.UnidadeFracionamento;
        enhanced.UnidadeFracionamentoDescricao = unidade.Descricao || '';
        enhanced.Descricao = unidade.Descricao || '';
        enhanced.Divisor = unidade.Divisor || '';
      }
    }
    
    if (enhanced.idTaxas && dropdownOptions.taxas) {
      const taxa = dropdownOptions.taxas.find(
        item => String(item.id_taxas) === String(enhanced.idTaxas)
      );
      
      if (taxa) {
        enhanced.TaxaFinalidade = taxa.finalidade;
        enhanced.finalidade = taxa.finalidade;
        enhanced.tipo_taxa = taxa.tipo_taxa || '';
        enhanced['tipo taxa'] = taxa.tipo_taxa || '';
        enhanced.tempo_infusao = taxa.tempo_infusao || '';
        enhanced['Tempo infusão'] = taxa.tempo_infusao || '';
        enhanced.id_taxa = taxa.id_taxas;
        enhanced['ID Taxa'] = taxa.id_taxas;
      }
    }
    
    if (enhanced.idTabela && dropdownOptions.tabela) {
      const tabela = dropdownOptions.tabela.find(
        item => String(item.id_tabela) === String(enhanced.idTabela)
      );
      
      if (tabela) {
        enhanced.tabela = tabela.tabela;
        enhanced.tabela_classe = tabela.tabela_classe || '';
        enhanced.tabela_tipo = tabela.tabela_tipo || '';
        enhanced.classe_Jaragua_do_sul = tabela.classe_Jaragua_do_sul || '';
        enhanced.classificacao_tipo = tabela.classificacao_tipo || '';
        enhanced.finalidade = tabela.finalidade || '';
        enhanced.objetivo = tabela.objetivo || '';
      }
    }
    
    if (enhanced.idFatorConversao && dropdownOptions.fatorConversao) {
      const fator = dropdownOptions.fatorConversao.find(
        item => String(item.id_fatorconversao) === String(enhanced.idFatorConversao)
      );
      
      if (fator) {
        enhanced.Fator_Conversão = fator.fator;
        enhanced.fator = fator.fator;
      }
    }
    
    return enhanced;
  };

  // Efeito para atualizar os dados aprimorados quando o serviço selecionado muda
  useEffect(() => {
    const selectedService = selectedRows.size > 0 ? 
      serviceData.find(service => service.id === Array.from(selectedRows)[0]) : 
      null;
        
    if (selectedService) {
      console.log("Serviço selecionado (dados brutos):", selectedService);
      
      // Aplicar normalização antes de aprimorar os dados
      const normalizedService = normalizeServiceData(selectedService);
      console.log("Serviço normalizado:", normalizedService);
      
      const enhanced = enhanceSelectedService(normalizedService);
      console.log("Serviço aprimorado:", enhanced);
      setEnhancedData(enhanced);
    } else {
      setEnhancedData(null);
    }
  }, [selectedRows, serviceData, dropdownOptions]);

  // Inicialização de dados
  useEffect(() => {
    if (!initialized && !loading && serviceData.length === 0) {
      loadServiceData(1, true, true, true);
    }
  }, [initialized, loading, serviceData.length, loadServiceData]);

  // Fechar sugestões quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrar sugestões de princípio ativo com base no texto digitado
  const filterSuggestions = (text) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Filtrar baseado no texto digitado, ignorando case
    const filtered = dropdownOptions.principioAtivo
      .filter(item => item.PrincipioAtivo.toLowerCase().includes(text.toLowerCase()))
      .slice(0, 10); // Limite para 10 sugestões
    
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  // Manipulador para evento de input e tecla enter
  const handleInput = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterSuggestions(value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };

  // Executar busca de texto
  const executeSearch = () => {
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      
      if (value.length >= 2) {
        setSearchTerm(value);
        setLocalLoading(true);
        searchServiceData(value, searchType)
          .finally(() => setLocalLoading(false));
        setShowSuggestions(false);
      } else if (value.length === 0) {
        setSearchTerm("");
        setLocalLoading(true);
        clearSearch()
          .finally(() => setLocalLoading(false));
      } else {
        showWarningAlert("Pesquisa curta", "Digite pelo menos 2 caracteres para pesquisar.");
      }
    }
  };

  // Selecionar uma sugestão
  const selectSuggestion = (suggestion) => {
    if (searchInputRef.current) {
      searchInputRef.current.value = suggestion.PrincipioAtivo;
      setSearchTerm(suggestion.PrincipioAtivo);
    }
    setShowSuggestions(false);
    executeSearch();
  };

  // Limpar pesquisa
  const handleClearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    
    setSearchTerm("");
    setSearchType("auto");
    setLocalLoading(true);
    clearSearch()
      .finally(() => setLocalLoading(false));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Alternar seleção de linha
  const toggleRowSelection = (rowId) => {
    if (isEditing) return;
  
    const adjustedRowId = Number(rowId);
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adjustedRowId)) {
        newSet.delete(adjustedRowId);
      } else {
        newSet.clear();
        newSet.add(adjustedRowId);
        
        // Adicione esta linha para inspecionar o serviço selecionado
        const selectedService = serviceData.find(service => service.id === adjustedRowId);
        if (selectedService) {
          debugServiceFields(selectedService);
        }
      }
      return newSet;
    });
  };

  // Carregar dados
  const handleLoadData = () => {
    if (isSearching) {
      clearSearch();
      setSearchTerm("");
    } else {
      loadServiceData(1, true);
    }
  };

  // Atualizar dados após modificação
  const refreshDataAfterModification = async () => {
    try {
      setLocalLoading(true);
      
      if (typeof forceRevalidation === 'function') {
        forceRevalidation();
      }
      
      clearServicesCache();
      await loadServiceData(1, true);
      
      setDataSource('server');
      showCacheRefreshIndicator();
      
    } catch (error) {
      console.error("Erro ao atualizar dados após modificação:", error);
      showErrorAlert("Falha ao atualizar os dados", "Tente atualizar manualmente.");
    } finally {
      setLocalLoading(false);
    }
  };

  // Função para excluir um serviço
  const handleDelete = async () => {
    const selectedRowId = Array.from(selectedRows)[0];
    if (!selectedRowId) return;
  
    const confirmResult = await showConfirmAlert(
      "Tem certeza que deseja excluir este serviço?", 
      "Esta ação não pode ser desfeita."
    );
    
    if (!confirmResult) return;
  
    try {
      setLocalLoading(true);
      
      const response = await fetch(
        `${API_BASE_URL}/delete_service.php?id=${selectedRowId}`,
        { method: 'DELETE' }
      );
  
      if (!response.ok) {
        throw new Error("Erro ao excluir o serviço");
      }
  
      deleteService(selectedRowId);
      setSelectedRows(new Set());
      showSuccessAlert("Serviço excluído com sucesso!");
      await refreshDataAfterModification();
      
    } catch (error) {
      console.error("Erro ao excluir o serviço:", error);
      showErrorAlert("Falha ao excluir", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  // Função para preencher IDs ausentes com base nos textos disponíveis
  const fillMissingIds = (data) => {
    const result = { ...data };
    
    // Preencher idViaAdministracao se tiver o texto mas não o ID
    if (!result.idViaAdministracao && 
        (result.Via_administracao || result.ViaAdministracao || result.Via_Administração) && 
        dropdownOptions.viaAdministracao) {
      const matchVia = dropdownOptions.viaAdministracao.find(item => 
        item.Via_administracao === result.Via_administracao || 
        item.Via_administracao === result.ViaAdministracao || 
        item.Via_administracao === result.Via_Administração
      );
      if (matchVia) {
        result.idViaAdministracao = String(matchVia.idviaadministracao);
        console.log('Preenchido idViaAdministracao:', result.idViaAdministracao);
      }
    }
    
    // Preencher idClasseFarmaceutica se tiver o texto mas não o ID
    if (!result.idClasseFarmaceutica && 
        (result.ClasseFarmaceutica || result.Classe_Farmaceutica) && 
        dropdownOptions.classeFarmaceutica) {
      const matchClasse = dropdownOptions.classeFarmaceutica.find(item => 
        item.ClasseFarmaceutica === result.ClasseFarmaceutica || 
        item.ClasseFarmaceutica === result.Classe_Farmaceutica
      );
      if (matchClasse) {
        result.idClasseFarmaceutica = String(matchClasse.id_medicamento);
        console.log('Preenchido idClasseFarmaceutica:', result.idClasseFarmaceutica);
      }
    }
    
    // Preencher idArmazenamento se tiver o texto mas não o ID
    if (!result.idArmazenamento && result.Armazenamento && dropdownOptions.armazenamento) {
      const matchArm = dropdownOptions.armazenamento.find(item => 
        item.Armazenamento === result.Armazenamento
      );
      if (matchArm) {
        result.idArmazenamento = String(matchArm.idArmazenamento);
        console.log('Preenchido idArmazenamento:', result.idArmazenamento);
      }
    }
    
    // Preencher idMedicamento se tiver o texto mas não o ID
    if (!result.idMedicamento && 
        (result.tipo_medicamento || result.Medicamento) && 
        dropdownOptions.tipoMedicamento) {
      const matchMed = dropdownOptions.tipoMedicamento.find(item => 
        item.tipo_medicamento === result.tipo_medicamento || 
        item.tipo_medicamento === result.Medicamento
      );
      if (matchMed) {
        result.idMedicamento = String(matchMed.id_medicamento);
        console.log('Preenchido idMedicamento:', result.idMedicamento);
      }
    }
    
    // Preencher idFatorConversao se tiver o texto mas não o ID
    if (!result.idFatorConversao && 
        (result.Fator_Conversão || result.fator) && 
        dropdownOptions.fatorConversao) {
      const matchFator = dropdownOptions.fatorConversao.find(item => 
        item.fator === result.Fator_Conversão || 
        item.fator === result.fator
      );
      if (matchFator) {
        result.idFatorConversao = String(matchFator.id_fatorconversao);
        console.log('Preenchido idFatorConversao:', result.idFatorConversao);
      }
    }
    
    // Preencher idTabela se tiver o texto mas não o ID
    if (!result.idTabela && result.tabela && dropdownOptions.tabela) {
      const matchTabela = dropdownOptions.tabela.find(item => 
        item.tabela === result.tabela
      );
      if (matchTabela) {
        result.idTabela = String(matchTabela.id_tabela);
        console.log('Preenchido idTabela:', result.idTabela);
      }
    }
    
    // Preencher idUnidadeFracionamento se tiver o texto mas não o ID
    if (!result.idUnidadeFracionamento && 
        (result.UnidadeFracionamento || result.Unidade_Fracionamento) && 
        dropdownOptions.unidadeFracionamento) {
      const matchUnidade = dropdownOptions.unidadeFracionamento.find(item => 
        item.UnidadeFracionamento === result.UnidadeFracionamento || 
        item.UnidadeFracionamento === result.Unidade_Fracionamento
      );
      if (matchUnidade) {
        result.idUnidadeFracionamento = String(matchUnidade.id_unidadefracionamento);
        console.log('Preenchido idUnidadeFracionamento:', result.idUnidadeFracionamento);
      }
    }
    
    // Preencher idTaxas se tiver o texto mas não o ID
    if (!result.idTaxas && 
        (result.TaxaFinalidade || result.finalidade) && 
        dropdownOptions.taxas) {
      const matchTaxa = dropdownOptions.taxas.find(item => 
        item.finalidade === result.TaxaFinalidade || 
        item.finalidade === result.finalidade
      );
      if (matchTaxa) {
        result.idTaxas = String(matchTaxa.id_taxas);
        console.log('Preenchido idTaxas:', result.idTaxas);
      }
    }
    
    return result;
  };

  const handleEdit = () => {
    const selectedRowId = Array.from(selectedRows)[0];
    if (!selectedRowId) {
      showWarningAlert("Selecione um serviço", "Você precisa selecionar um serviço para editar.");
      return;
    }
  
    // Use enhanced data when available
    const rowToEdit = enhancedData || serviceData.find(item => item.id === selectedRowId);
    
    if (!rowToEdit) {
      showErrorAlert("Serviço não encontrado", "O serviço selecionado não foi encontrado.");
      return;
    }
  
    console.log("Dados originais para edição:", rowToEdit);
    
    // Make sure IDs are converted to strings for select elements to work properly
    const preparedData = { ...rowToEdit };
    
    // Ensure all ID fields are strings for comparison in select elements
    if (preparedData.idPrincipioAtivo) preparedData.idPrincipioAtivo = String(preparedData.idPrincipioAtivo);
    if (preparedData.idUnidadeFracionamento) preparedData.idUnidadeFracionamento = String(preparedData.idUnidadeFracionamento);
    if (preparedData.idTaxas) preparedData.idTaxas = String(preparedData.idTaxas);
    if (preparedData.idTabela) preparedData.idTabela = String(preparedData.idTabela);
    if (preparedData.idViaAdministracao) preparedData.idViaAdministracao = String(preparedData.idViaAdministracao);
    if (preparedData.idClasseFarmaceutica) preparedData.idClasseFarmaceutica = String(preparedData.idClasseFarmaceutica);
    if (preparedData.idArmazenamento) preparedData.idArmazenamento = String(preparedData.idArmazenamento);
    if (preparedData.idMedicamento) preparedData.idMedicamento = String(preparedData.idMedicamento);
    if (preparedData.idFatorConversao) preparedData.idFatorConversao = String(preparedData.idFatorConversao);
  
    // Preencher IDs ausentes com base nos textos disponíveis
    const completeData = fillMissingIds(preparedData);
  
    // Log de depuração para verificar valores dos IDs
    console.log("Dados preparados para modo de edição:", {
      idPrincipioAtivo: completeData.idPrincipioAtivo,
      idUnidadeFracionamento: completeData.idUnidadeFracionamento,
      idTaxas: completeData.idTaxas,
      idTabela: completeData.idTabela,
      idViaAdministracao: completeData.idViaAdministracao,
      idClasseFarmaceutica: completeData.idClasseFarmaceutica,
      idArmazenamento: completeData.idArmazenamento,
      idMedicamento: completeData.idMedicamento,
      idFatorConversao: completeData.idFatorConversao
    });
  
    setEditingRow(selectedRowId);
    setEditedData(completeData);
    setIsEditing(true);
    setActiveSection('geral');
  };
  
  // Cancelar edição
  const handleCancel = async () => {
    if (isEditing) {
      const confirmCancel = await showConfirmAlert(
        "Deseja cancelar a edição?",
        "Todas as alterações feitas serão perdidas."
      );
      
      if (!confirmCancel) {
        return;
      }
    }
    
    setEditingRow(null);
    setEditedData({});
    setIsEditing(false);
  };

  // Adicionar novo serviço
  const handleAdd = () => {
    if (dataTableRef.current && typeof dataTableRef.current.collapseAllHeaders === 'function') {
      dataTableRef.current.collapseAllHeaders();
    }
    
    setIsAdding(true);
    setNewServiceData(resetNewServiceData());
    setSelectedRows(new Set());
    setActiveSection('geral');
  };

  // Cancelar adição
  const handleCancelAdd = async () => {
    const hasData = Object.entries(newServiceData).some(([key, value]) => {
      return !key.startsWith('id') && 
             typeof value === 'string' && 
             value.trim() !== '' && 
             key !== 'Revisado_Farma' &&
             key !== 'Revisado_ADM';
    });
    
    if (hasData) {
      const confirmCancel = await showConfirmAlert(
        "Deseja cancelar a adição?",
        "Todas as informações preenchidas serão perdidas."
      );
      
      if (!confirmCancel) {
        return;
      }
    }
    
    setIsAdding(false);
    setNewServiceData(resetNewServiceData());
  };

  // Salvar novo serviço
  const handleSaveNew = async () => {
    // Validação básica
    if (!newServiceData.Cod) {
      showWarningAlert("Campo obrigatório", "Por favor, preencha o Código.");
      return;
    }
  
    // Verificar campos de RegistroVisa
    const hasRegistroVisaFields = [
      'Cod_Ggrem', 'Lab', 'cnpj_lab', 'Classe_Terapeutica', 
      'Tipo_Porduto', 'Regime_Preco', 'Restricao_Hosp', 'Cap', 
      'Confaz87', 'Icms0', 'Lista', 'Status', 'Principio_Ativo'
    ].some(field => newServiceData[field] && newServiceData[field].trim() !== '');
    
    if (hasRegistroVisaFields && (!newServiceData.RegistroVisa || newServiceData.RegistroVisa.trim() === '')) {
      showWarningAlert(
        "Campo obrigatório", 
        "Você preencheu campos do Registro Visa, mas o campo 'RegistroVisa' é obrigatório."
      );
      
      if (dataTableRef.current && typeof dataTableRef.current.expandHeader === 'function') {
        dataTableRef.current.expandHeader("Registro Visa");
      }
      
      return;
    }
    
    // Preparar dados para envio - MANTENHA ESTA LINHA
    const dataToSend = { ...newServiceData };
    
    // Verificar e corrigir campos relacionados
    if (!dataToSend.UnidadeFracionamentoDescricao && dataToSend.Descricao) {
      dataToSend.UnidadeFracionamentoDescricao = dataToSend.Descricao;
    } else if (dataToSend.UnidadeFracionamentoDescricao && !dataToSend.Descricao) {
      dataToSend.Descricao = dataToSend.UnidadeFracionamentoDescricao;
    }
    
    // Limpar campos duplicados baseados em IDs
    if (dataToSend.idPrincipioAtivo) {
      delete dataToSend.PrincipioAtivo;
      delete dataToSend.Principio_Ativo;
    }
    
    if (dataToSend.idViaAdministracao) {
      delete dataToSend.ViaAdministracao;
      delete dataToSend.Via_Administração;
      delete dataToSend.Via_administracao;
    }
    
    if (dataToSend.idClasseFarmaceutica) {
      delete dataToSend.ClasseFarmaceutica;
      delete dataToSend.Classe_Farmaceutica;
    }
    
    if (dataToSend.idTaxas) {
      delete dataToSend.TaxaFinalidade;
      delete dataToSend.finalidade;
      delete dataToSend["tipo taxa"];
      delete dataToSend.tipo_taxa;
      delete dataToSend["Tempo infusão"];
      delete dataToSend.tempo_infusao;
    }
    
    if (dataToSend.idMedicamento) {
      delete dataToSend.tipo_medicamento;
      delete dataToSend.Medicamento;
    }
    
    if (dataToSend.idFatorConversao) {
      delete dataToSend.Fator_Conversão;
      delete dataToSend.fator;
    }
    
    // Verificar se os campos numéricos são válidos
    if (dataToSend.Codigo_TUSS) {
      const numValue = parseInt(dataToSend.Codigo_TUSS, 10);
      if (isNaN(numValue) || numValue > 2147483647) {
        showWarningAlert("Valor inválido", "O Código TUSS deve ser um número válido.");
        return;
      }
      dataToSend.Codigo_TUSS = numValue; // Converter para número
    }
    
    try {
      setLocalLoading(true);
      
      console.log("Enviando dados para criar novo serviço:", dataToSend);
      
      // Usar uma abordagem mais simples para criar o serviço
      try {
        // Tentar o método normal primeiro
        const serviceId = await addService(dataToSend);
        
        setIsAdding(false);
        setNewServiceData(resetNewServiceData());
        
        if (serviceId) {
          showSuccessPopup({ id: serviceId, cod: dataToSend.Cod }, false, 3000);
        } else {
          showSuccessAlert("Serviço adicionado com sucesso!");
        }
        
        await refreshDataAfterModification();
        
      } catch (apiError) {
        // Verificar se a resposta contém HTML
        if (typeof apiError.message === 'string' && 
            (apiError.message.includes('<br />') || 
             apiError.message.includes('Fatal error'))) {
          
          console.error('Resposta HTML recebida do servidor:', apiError.message);
          
          // Se o erro for de contagem de parâmetros, tente uma abordagem alternativa com campos mínimos
          if (apiError.message.includes('ArgumentCountError')) {
            showErrorAlert(
              "Erro de parâmetros", 
              "Há um problema com os campos enviados. Tentando abordagem alternativa..."
            );
            
            // Preparar apenas os campos essenciais
            const essentialData = {
              Cod: dataToSend.Cod || '',
              Codigo_TUSS: dataToSend.Codigo_TUSS,
              Codigo_Celos: dataToSend.Codigo_Celos || '',
              Descricao_Padronizada: dataToSend.Descricao_Padronizada || '',
              Descricao_Resumida: dataToSend.Descricao_Resumida || '',
              Descricao_Comercial: dataToSend.Descricao_Comercial || ''
            };
            
            const response = await fetch(`${API_BASE_URL}/insert_service.php`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(essentialData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error("Erro na abordagem alternativa:", errorText);
              throw new Error(`Não foi possível adicionar o serviço: ${response.status}`);
            }
            
            showSuccessAlert("Serviço adicionado com sucesso (método alternativo)!");
            setIsAdding(false);
            setNewServiceData(resetNewServiceData());
            await refreshDataAfterModification();
          } else {
            // Outro tipo de erro HTML
            showErrorAlert(
              "Erro no servidor", 
              "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde."
            );
          }
        } else {
          // Erro normal
          throw apiError;
        }
      }
      
    } catch (error) {
      console.error("Erro ao adicionar o serviço:", error);
      showErrorAlert("Falha ao adicionar serviço", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  // Manipulador de alteração de input para novo serviço
  const handleNewInputChange = (e, field) => {
    const { value } = e.target;
    
    console.log(`Novo serviço - Campo alterado: ${field}, Valor: ${value}, Tipo: ${typeof value}`);
    
    setNewServiceData(prevData => {
      const updatedData = {
        ...prevData,
        [field]: value
      };
      
      // NOVO: Sincronizar o campo Lab com Laboratorio
      if (field === 'Lab') {
        updatedData.Laboratorio = value;
      }
      // NOVO: E vice-versa se necessário
      else if (field === 'Laboratorio') {
        updatedData.Lab = value;
      }
      
      // NOVO: Sincronização dos campos da aba Entrada com Pagamento
      // Quando campos da aba Entrada são alterados, atualiza automaticamente os da aba Pagamento
      if (field === 'Unidade_Entrada') {
        updatedData.Unidade_Pagamento_Nao_Fracionado = value;
      }
      else if (field === 'Quantidade_Entrada') {
        updatedData.Quantidade_Pagamento_Nao_Fracionado = value;
      }
      else if (field === 'Unidade_Entrada_Convertida') {
        updatedData.Unidade_Pagamento_Fracionado = value;
      }
      else if (field === 'Quantidade_Convertida') {
        updatedData.Quantidade_Pagamento_Fracionado = value;
      }
      
      console.log("Novo serviço - Dados atualizados:", updatedData);
      return updatedData;
    });
  };
  
  // Manipulador de alteração de input para edição
  const handleInputChange = (e, field) => {
    const { value } = e.target;
    
    console.log(`Campo alterado: ${field}, Valor: ${value}, Tipo: ${typeof value}`);
    
    setEditedData(prevData => {
      const updatedData = {
        ...prevData,
        [field]: value
      };
      
      // NOVO: Sincronizar o campo Lab com Laboratorio
      if (field === 'Lab') {
        updatedData.Laboratorio = value;
      }
      // NOVO: E vice-versa se necessário
      else if (field === 'Laboratorio') {
        updatedData.Lab = value;
      }
      
      // NOVO: Sincronização dos campos da aba Entrada com Pagamento
      // Quando campos da aba Entrada são alterados, atualiza automaticamente os da aba Pagamento
      if (field === 'Unidade_Entrada') {
        updatedData.Unidade_Pagamento_Nao_Fracionado = value;
      }
      else if (field === 'Quantidade_Entrada') {
        updatedData.Quantidade_Pagamento_Nao_Fracionado = value;
      }
      else if (field === 'Unidade_Entrada_Convertida') {
        updatedData.Unidade_Pagamento_Fracionado = value;
      }
      else if (field === 'Quantidade_Convertida') {
        updatedData.Quantidade_Pagamento_Fracionado = value;
      }
      
      console.log("Dados atualizados:", updatedData);
      return updatedData;
    });
  };

  // Manipulador de alteração do tipo de pesquisa
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    if (searchTerm.trim().length >= 2) {
      searchServiceData(searchTerm.trim(), type);
    }
    setShowSearchFilters(false); // Fechar o painel após seleção
  };

  // Manipulador para dropdowns de novos serviços
  const handleNewDropdownChange = (e, field) => {
    const value = e.target.value;
    const selectedId = value ? parseInt(value, 10) : null;
    
    // Cópia do estado atual
    const updatedData = { ...newServiceData };
    
    // Atualizar campos relacionados baseado no tipo de dropdown
    switch(field) {
      case 'PrincipioAtivo':
        if (value) {
          const selectedPrincipio = dropdownOptions.principioAtivo.find(
            p => String(p.idPrincipioAtivo) === String(value)
          );
          
          if (selectedPrincipio) {
            updatedData.idPrincipioAtivo = selectedId;
            updatedData.PrincipioAtivo = selectedPrincipio.PrincipioAtivo;
            updatedData.Principio_Ativo = selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivoClassificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.Princípio_Ativo_Classificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.FaseUGF = selectedPrincipio.FaseUGF || '';
            updatedData.FaseuGF = selectedPrincipio.FaseUGF || '';
          }
        } else {
          updatedData.idPrincipioAtivo = null;
          updatedData.PrincipioAtivo = '';
          updatedData.Principio_Ativo = '';
          updatedData.PrincipioAtivoClassificado = '';
          updatedData.Princípio_Ativo_Classificado = '';
          updatedData.FaseUGF = '';
          updatedData.FaseuGF = '';
        }
        break;
        
      case 'UnidadeFracionamento':
        if (value) {
          const selectedUnidade = dropdownOptions.unidadeFracionamento.find(
            u => String(u.id_unidadefracionamento) === String(value)
          );
          
          if (selectedUnidade) {
            updatedData.idUnidadeFracionamento = selectedId;
            updatedData.UnidadeFracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.Unidade_Fracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.UnidadeFracionamentoDescricao = selectedUnidade.Descricao || '';
            updatedData.Descricao = selectedUnidade.Descricao || '';
            updatedData.Divisor = selectedUnidade.Divisor || '';
          }
        } else {
          updatedData.idUnidadeFracionamento = null;
          updatedData.UnidadeFracionamento = '';
          updatedData.Unidade_Fracionamento = '';
          updatedData.UnidadeFracionamentoDescricao = '';
          updatedData.Descricao = '';
          updatedData.Divisor = '';
        }
        break;
        
      // Outros casos para diferentes tipos de dropdown
      case 'Taxas':
        if (value) {
          const selectedTaxa = dropdownOptions.taxas.find(
            t => String(t.id_taxas) === String(value)
          );
          
          if (selectedTaxa) {
            updatedData.idTaxas = selectedId;
            updatedData.TaxaFinalidade = selectedTaxa.finalidade;
            updatedData.finalidade = selectedTaxa.finalidade;
            updatedData.tipo_taxa = selectedTaxa.tipo_taxa || '';
            updatedData["tipo taxa"] = selectedTaxa.tipo_taxa || '';
            updatedData.tempo_infusao = selectedTaxa.tempo_infusao || '';
            updatedData["Tempo infusão"] = selectedTaxa.tempo_infusao || '';
            updatedData.id_taxa = selectedTaxa.id_taxas;
            updatedData["ID Taxa"] = selectedTaxa.id_taxas;
          }
        } else {
          updatedData.idTaxas = null;
          updatedData.TaxaFinalidade = '';
          updatedData.finalidade = '';
          updatedData.tipo_taxa = '';
          updatedData["tipo taxa"] = '';
          updatedData.tempo_infusao = '';
          updatedData["Tempo infusão"] = '';
          updatedData.id_taxa = '';
          updatedData["ID Taxa"] = '';
        }
        break;
        
      case 'ViaAdministracao':
        if (value) {
          const selectedVia = dropdownOptions.viaAdministracao.find(
            v => String(v.idviaadministracao) === String(value)
          );
          
          if (selectedVia) {
            updatedData.idViaAdministracao = selectedId;
            updatedData.ViaAdministracao = selectedVia.Via_administracao;
            updatedData.Via_Administração = selectedVia.Via_administracao;
            updatedData.Via_administracao = selectedVia.Via_administracao;
          }
        } else {
          updatedData.idViaAdministracao = null;
          updatedData.ViaAdministracao = '';
          updatedData.Via_Administração = '';
          updatedData.Via_administracao = '';
        }
        break;
        
      case 'ClasseFarmaceutica':
        if (value) {
          const selectedClasse = dropdownOptions.classeFarmaceutica.find(
            c => String(c.id_medicamento) === String(value)
          );
          
          if (selectedClasse) {
            updatedData.idClasseFarmaceutica = selectedId;
            updatedData.ClasseFarmaceutica = selectedClasse.ClasseFarmaceutica;
            updatedData.Classe_Farmaceutica = selectedClasse.ClasseFarmaceutica;
          }
        } else {
          updatedData.idClasseFarmaceutica = null;
          updatedData.ClasseFarmaceutica = '';
          updatedData.Classe_Farmaceutica = '';
        }
        break;
        
      case 'Armazenamento':
        if (value) {
          const selectedArm = dropdownOptions.armazenamento.find(
            a => String(a.idArmazenamento) === String(value)
          );
          
          if (selectedArm) {
            updatedData.idArmazenamento = selectedId;
            updatedData.Armazenamento = selectedArm.Armazenamento;
          }
        } else {
          updatedData.idArmazenamento = null;
          updatedData.Armazenamento = '';
        }
        break;
        
      case 'tipo_medicamento':
        if (value) {
          const selectedMed = dropdownOptions.tipoMedicamento.find(
            m => String(m.id_medicamento) === String(value)
          );
          
          if (selectedMed) {
            updatedData.idMedicamento = selectedId;
            updatedData.tipo_medicamento = selectedMed.tipo_medicamento;
            updatedData.Medicamento = selectedMed.tipo_medicamento;
          }
        } else {
          updatedData.idMedicamento = null;
          updatedData.tipo_medicamento = '';
          updatedData.Medicamento = '';
        }
        break;
        
      case 'FatorConversao':
        if (value) {
          const selectedFator = dropdownOptions.fatorConversao.find(
            f => String(f.id_fatorconversao) === String(value)
          );
          
          if (selectedFator) {
            updatedData.idFatorConversao = selectedId;
            updatedData.Fator_Conversão = selectedFator.fator;
            updatedData.fator = selectedFator.fator;
          }
        } else {
          updatedData.idFatorConversao = null;
          updatedData.Fator_Conversão = '';
          updatedData.fator = '';
        }
        break;

      case 'Tabela':
        if (value) {
          const selectedTabela = dropdownOptions.tabela.find(
            t => String(t.id_tabela) === String(value)
          );
          
          if (selectedTabela) {
            updatedData.idTabela = selectedId;
            updatedData.tabela = selectedTabela.tabela;
            updatedData.tabela_classe = selectedTabela.tabela_classe || '';
            updatedData.tabela_tipo = selectedTabela.tabela_tipo || '';
            updatedData.classe_Jaragua_do_sul = selectedTabela.classe_Jaragua_do_sul || '';
            updatedData.classificacao_tipo = selectedTabela.classificacao_tipo || '';
            updatedData.finalidade = selectedTabela.finalidade || '';
            updatedData.objetivo = selectedTabela.objetivo || '';
          }
        } else {
          updatedData.idTabela = null;
          updatedData.tabela = '';
          updatedData.tabela_classe = '';
          updatedData.tabela_tipo = '';
          updatedData.classe_Jaragua_do_sul = '';
          updatedData.classificacao_tipo = '';
          updatedData.finalidade = '';
          updatedData.objetivo = '';
        }
        break;
        
      default:
        console.error(`Campo não reconhecido: ${field}`);
    }
    
    // Atualizar o estado
    setNewServiceData(updatedData);
    setUpdateCounter(prev => prev + 1);
  };

  // Manipulador para dropdowns em modo de edição
  const handleDropdownChange = (e, field) => {
    const value = e.target.value;
    const selectedId = value ? parseInt(value, 10) : null;
    
    const updatedData = { ...editedData };
    
    // Lógica similar ao handleNewDropdownChange, para diferentes tipos de dropdown
    switch(field) {
      case 'ViaAdministracao':
        if (value) {
          const selectedVia = dropdownOptions.viaAdministracao.find(
            v => String(v.idviaadministracao) === String(value)
          );
          
          if (selectedVia) {
            updatedData.idViaAdministracao = selectedId;
            updatedData.Via_Administração = selectedVia.Via_administracao;
            updatedData.ViaAdministracao = selectedVia.Via_administracao;
            updatedData.Via_administracao = selectedVia.Via_administracao;
          }
        } else {
          updatedData.idViaAdministracao = null;
          updatedData.Via_Administração = '';
          updatedData.ViaAdministracao = '';
          updatedData.Via_administracao = '';
        }
        break;
        
      // Outros casos similares para outros tipos de dropdown
      case 'ClasseFarmaceutica':
        if (value) {
          const selectedClasse = dropdownOptions.classeFarmaceutica.find(
            c => String(c.id_medicamento) === String(value)
          );
          
          if (selectedClasse) {
            updatedData.idClasseFarmaceutica = selectedId;
            updatedData.Classe_Farmaceutica = selectedClasse.ClasseFarmaceutica;
            updatedData.ClasseFarmaceutica = selectedClasse.ClasseFarmaceutica;
          }
        } else {
          updatedData.idClasseFarmaceutica = null;
          updatedData.Classe_Farmaceutica = '';
          updatedData.ClasseFarmaceutica = '';
        }
        break;
        
      case 'PrincipioAtivo':
        if (value) {
          const selectedPrincipio = dropdownOptions.principioAtivo.find(
            p => String(p.idPrincipioAtivo) === String(value)
          );
          
          if (selectedPrincipio) {
            updatedData.idPrincipioAtivo = selectedId;
            updatedData["Princípio Ativo"] = selectedPrincipio.PrincipioAtivo;
            updatedData.Principio_Ativo = selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivo = selectedPrincipio.PrincipioAtivo;
            updatedData.Princípio_Ativo_Classificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivoClassificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.FaseuGF = selectedPrincipio.FaseUGF || '';
            updatedData.FaseUGF = selectedPrincipio.FaseUGF || '';
          }
        } else {
          updatedData.idPrincipioAtivo = null;
          updatedData["Princípio Ativo"] = '';
          updatedData.Principio_Ativo = '';
          updatedData.PrincipioAtivo = '';
          updatedData.Princípio_Ativo_Classificado = '';
          updatedData.PrincipioAtivoClassificado = '';
          updatedData.FaseuGF = '';
          updatedData.FaseUGF = '';
        }
        break;

      case 'UnidadeFracionamento':
        if (value) {
          const selectedUnidade = dropdownOptions.unidadeFracionamento.find(
            u => String(u.id_unidadefracionamento) === String(value)
          );
          
          if (selectedUnidade) {
            updatedData.idUnidadeFracionamento = selectedId;
            updatedData.UnidadeFracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.Unidade_Fracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.UnidadeFracionamentoDescricao = selectedUnidade.Descricao || '';
            updatedData.Descricao = selectedUnidade.Descricao || '';
            updatedData.Divisor = selectedUnidade.Divisor || '';
          }
        } else {
          updatedData.idUnidadeFracionamento = null;
          updatedData.UnidadeFracionamento = '';
          updatedData.Unidade_Fracionamento = '';
          updatedData.UnidadeFracionamentoDescricao = '';
          updatedData.Descricao = '';
          updatedData.Divisor = '';
        }
        break;

      case 'Taxas':
        if (value) {
          const selectedTaxa = dropdownOptions.taxas.find(
            t => String(t.id_taxas) === String(value)
          );
          
          if (selectedTaxa) {
            updatedData.idTaxas = selectedId;
            updatedData.TaxaFinalidade = selectedTaxa.finalidade;
            updatedData.finalidade = selectedTaxa.finalidade;
            updatedData.tipo_taxa = selectedTaxa.tipo_taxa || '';
            updatedData["tipo taxa"] = selectedTaxa.tipo_taxa || '';
            updatedData.tempo_infusao = selectedTaxa.tempo_infusao || '';
            updatedData["Tempo infusão"] = selectedTaxa.tempo_infusao || '';
            updatedData.id_taxa = selectedTaxa.id_taxas;
            updatedData["ID Taxa"] = selectedTaxa.id_taxas;
          }
        } else {
          updatedData.idTaxas = null;
          updatedData.TaxaFinalidade = '';
          updatedData.finalidade = '';
          updatedData.tipo_taxa = '';
          updatedData["tipo taxa"] = '';
          updatedData.tempo_infusao = '';
          updatedData["Tempo infusão"] = '';
          updatedData.id_taxa = '';
          updatedData["ID Taxa"] = '';
        }
        break;

      case 'Tabela':
        if (value) {
          const selectedTabela = dropdownOptions.tabela.find(
            t => String(t.id_tabela) === String(value)
          );
          
          if (selectedTabela) {
            updatedData.idTabela = selectedId;
            updatedData.tabela = selectedTabela.tabela;
            updatedData.tabela_classe = selectedTabela.tabela_classe || '';
            updatedData.tabela_tipo = selectedTabela.tabela_tipo || '';
            updatedData.classe_Jaragua_do_sul = selectedTabela.classe_Jaragua_do_sul || '';
            updatedData.classificacao_tipo = selectedTabela.classificacao_tipo || '';
            updatedData.finalidade = selectedTabela.finalidade || '';
            updatedData.objetivo = selectedTabela.objetivo || '';
          }
        } else {
          updatedData.idTabela = null;
          updatedData.tabela = '';
          updatedData.tabela_classe = '';
          updatedData.tabela_tipo = '';
          updatedData.classe_Jaragua_do_sul = '';
          updatedData.classificacao_tipo = '';
          updatedData.finalidade = '';
          updatedData.objetivo = '';
        }
        break;

      case 'Armazenamento':
        if (value) {
          const selectedArm = dropdownOptions.armazenamento.find(
            a => String(a.idArmazenamento) === String(value)
          );
          
          if (selectedArm) {
            updatedData.idArmazenamento = selectedId;
            updatedData.Armazenamento = selectedArm.Armazenamento;
          }
        } else {
          updatedData.idArmazenamento = null;
          updatedData.Armazenamento = '';
        }
        break;

      case 'tipo_medicamento':
        if (value) {
          const selectedMed = dropdownOptions.tipoMedicamento.find(
            m => String(m.id_medicamento) === String(value)
          );
          
          if (selectedMed) {
            updatedData.idMedicamento = selectedId;
            updatedData.tipo_medicamento = selectedMed.tipo_medicamento;
            updatedData.Medicamento = selectedMed.tipo_medicamento;
          }
        } else {
          updatedData.idMedicamento = null;
          updatedData.tipo_medicamento = '';
          updatedData.Medicamento = '';
        }
        break;

      case 'FatorConversao':
        if (value) {
          const selectedFator = dropdownOptions.fatorConversao.find(
            f => String(f.id_fatorconversao) === String(value)
          );
          
          if (selectedFator) {
            updatedData.idFatorConversao = selectedId;
            updatedData.Fator_Conversão = selectedFator.fator;
            updatedData.fator = selectedFator.fator;
          }
        } else {
          updatedData.idFatorConversao = null;
          updatedData.Fator_Conversão = '';
          updatedData.fator = '';
        }
        break;
      
      default:
        console.error(`Campo não reconhecido: ${field}`);
    }
    
    setEditedData(updatedData);
  };

  const inspectServiceData = (service) => {
    if (!service) return;
    
    console.group('Inspeção detalhada do serviço');
    console.log('ID:', service.id);
    console.log('Código:', service.Cod);
    console.log('Código TUSS:', service.Codigo_TUSS, typeof service.Codigo_TUSS);
    console.log('Descrição Apresentação:', service.Descricao_Padronizada);
    console.log('Descrição Resumida:', service.Descricao_Resumida);
    console.log('Descrição Comercial:', service.Descricao_Comercial);
    console.log('Concentração:', service.Concentracao);
    console.log('Unidade Fracionamento:', service.UnidadeFracionamento);
    console.log('Fracionamento:', service.Fracionamento);
    console.log('Laboratório:', service.Laboratorio);
    console.log('Uso:', service.Uso);
    console.log('Revisado Farma:', service.Revisado_Farma, typeof service.Revisado_Farma);
    console.log('Revisado ADM:', service.Revisado_ADM, typeof service.Revisado_ADM);
    console.log('ID Princípio Ativo:', service.idPrincipioAtivo);
    console.log('Princípio Ativo:', service.PrincipioAtivo);
    console.log('Via Administração:', service.Via_administracao);
    console.log('Classe Farmacêutica:', service.ClasseFarmaceutica);
    console.log('Tabela:', service.tabela);
    console.groupEnd();
  };

  // Indicador de atualização do cache
  const showCacheRefreshIndicator = () => {
    setCacheRefreshed(true);
    setTimeout(() => setCacheRefreshed(false), 3000);
  };

  // Função para salvar serviço editado
  const handleSave = async () => {
    if (!editingRow) return;
  
    try {
      setLocalLoading(true);
      
      // Criar uma cópia dos dados editados
      const dataToSend = { ...editedData };
      
      // 1. Tratar campo Codigo_TUSS - deve ser um INT válido
      if (dataToSend.Codigo_TUSS) {
        // Converter para número
        const numValue = parseInt(dataToSend.Codigo_TUSS, 10);
        // Verificar se está no intervalo válido para INT no MySQL (2147483647 máximo)
        if (!isNaN(numValue) && numValue <= 2147483647) {
          dataToSend.Codigo_TUSS = numValue;
        } else {
          // Se for inválido, é melhor não enviar do que causar erro
          delete dataToSend.Codigo_TUSS;
        }
      }
      
      // Remover codigoTUSS para evitar conflitos
      delete dataToSend.codigoTUSS;
      
      // 2. Garantir que Laboratorio esteja correto
      dataToSend.Laboratorio = dataToSend.Laboratorio || dataToSend.Laboratório || '';
      // Remover a versão com acento para evitar confusão
      delete dataToSend.Laboratório;
      
      // 3. Tratar Revisado_Farma e Revisado_ADM como strings (conforme schema)
      if (dataToSend.Revisado_Farma !== undefined && dataToSend.Revisado_Farma !== null) {
        // Converter para string em vez de número
        dataToSend.Revisado_Farma = String(dataToSend.Revisado_Farma);
      }
      
      if (dataToSend.Revisado_ADM !== undefined && dataToSend.Revisado_ADM !== null) {
        // Converter para string em vez de número
        dataToSend.Revisado_ADM = String(dataToSend.Revisado_ADM);
      }
      
      // 4. Tratar idMedicamento como string (conforme schema)
      if (dataToSend.idMedicamento !== undefined && dataToSend.idMedicamento !== null) {
        dataToSend.idMedicamento = String(dataToSend.idMedicamento);
      }
      
      // 5. Garantir que UnidadeFracionamento seja inteiro
      if (dataToSend.UnidadeFracionamento) {
        const numValue = parseInt(dataToSend.UnidadeFracionamento, 10);
        if (!isNaN(numValue)) {
          dataToSend.UnidadeFracionamento = numValue;
        } else {
          delete dataToSend.UnidadeFracionamento;
        }
      }
      
      // 6. Tratar campos de RegistroVisa se estiverem presentes
      if (dataToSend.RegistroVisa) {
        // Garantir que seja string (conforme schema)
        dataToSend.RegistroVisa = String(dataToSend.RegistroVisa);
        dataToSend.idRegistroVisa = dataToSend.RegistroVisa; // Importante: conecta as duas tabelas
      }
      
      // 7. Garantir que os outros IDs sejam enviados como inteiros (conforme schema)
      const intIdFields = [
        'idPrincipioAtivo',
        'idViaAdministracao',
        'idClasseFarmaceutica',
        'idArmazenamento',
        'idUnidadeFracionamento',
        'idFatorConversao',
        'idTaxas',
        'idTabela'
      ];
      
      intIdFields.forEach(field => {
        if (dataToSend[field] !== undefined && dataToSend[field] !== null && dataToSend[field] !== '') {
          dataToSend[field] = parseInt(dataToSend[field], 10);
        }
      });
      
      console.log("Dados formatados para envio (baseados no schema):", dataToSend);
      
      // Voltar a usar o endpoint que sabemos que funciona
      const apiUrl = `${API_BASE_URL}/update_service_simple.php`;
      console.log("Enviando requisição para:", apiUrl);
  
      // Fazer a requisição
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });
      
      console.log("Status da resposta:", response.status);
      
      // Capturar a resposta como texto primeiro
      const responseText = await response.text();
      console.log("Resposta crua do servidor:", responseText);
      
      let responseData;
      
      // Tentar converter para JSON apenas se for um JSON válido
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
        console.log("Resposta processada:", responseData);
      } catch (parseError) {
        console.error("Erro ao fazer parse da resposta como JSON:", parseError);
        throw new Error(`Resposta não é um JSON válido: ${responseText.substring(0, 150)}...`);
      }
  
      // Verificar se a resposta indica sucesso
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || `Erro ao atualizar o serviço (Status: ${response.status})`);
      }
  
      // Limpar estados de edição
      setEditingRow(null);
      setEditedData({});
      setIsEditing(false);
  
      showSuccessAlert("Serviço atualizado com sucesso!");
      
      await refreshDataAfterModification();
      
    } catch (error) {
      console.error("Erro ao atualizar o serviço:", error);
      showErrorAlert("Falha ao atualizar", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  // Função para alternar tipo de ordenação
  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  // Resetar ordenação
  const handleResetSort = () => {
    setSortField('id');
    setSortOrder('asc');
  };

  // Formatar texto de resultados de pesquisa
  const searchResultInfo = isSearching
    ? `${serviceData.length} resultados encontrados para "${searchTerm}"`
    : null;
    
  // Obter nome do tipo de pesquisa
  const getSearchTypeName = (type) => {
    switch(type) {
      case 'code': return 'Código';
      case 'active': return 'Princípio Ativo';
      case 'active_visa': return 'P. Ativo (Registro Visa)';
      case 'description': return 'Descrição';
      case 'all': return 'Todos os campos';
      case 'auto': 
        if (/^[0-9.]+$/.test(searchTerm)) {
          return 'Código (auto)';
        } else {
          return 'Princípio Ativo (auto)';
        }
      default: return 'Desconhecido';
    }
  };

  // Obter serviço selecionado
  const selectedService = selectedRows.size > 0 ? 
    serviceData.find(service => service.id === Array.from(selectedRows)[0]) : 
    null;
    
  // Função para manipular alteração de select
  const handleSelectChange = (e, field) => {
    if (isEditing) {
      handleDropdownChange(e, field);
    } else if (isAdding) {
      handleNewDropdownChange(e, field);
    }
  };

  // Adicione isso dentro do componente ServicoRelacionadaContent, antes do return
  useEffect(() => {
    console.log('Opções de Classe Farmacêutica:', dropdownOptions?.classeFarmaceutica);
    console.log('Opções de Armazenamento:', dropdownOptions?.armazenamento);
  }, [dropdownOptions]);

  // Adicione esta função ao seu componente para normalizar os dados recebidos da API
  const normalizeServiceData = (serviceData) => {
    if (!serviceData) return serviceData;
    
    // Crie uma cópia profunda dos dados para não modificar o original
    const normalizedData = JSON.parse(JSON.stringify(serviceData));
    
    console.log("Normalizando dados do serviço:", normalizedData);
    
    // Convert ID fields to strings
    const idFields = [
      'idPrincipioAtivo',
      'idUnidadeFracionamento',
      'idTaxas',
      'idTabela',
      'idViaAdministracao',
      'idClasseFarmaceutica', 
      'idArmazenamento',
      'idMedicamento',
      'idFatorConversao'
    ];
    
    idFields.forEach(field => {
      if (normalizedData[field] !== undefined && normalizedData[field] !== null) {
        normalizedData[field] = String(normalizedData[field]);
      }
    });

    // Mapeamento de campos inconsistentes
    const fieldMappings = {
      // Campo Codigo_TUSS
      'codigoTUSS': 'Codigo_TUSS',
      'Codigo_Celos': 'Codigo_Celos', // Adicionado
      // Campo Descricao_Padronizada (anteriormente Descricao_Apresentacao)
      'Descricao_Abreviada': 'Descricao_Padronizada',
      'Descricao_Apresentacao': 'Descricao_Padronizada',
      
      // Novos campos
      'Descricao_Comercial_Completa': 'Descricao_Comercial_Completa',
      'Descricao_TUSS': 'Descricao_TUSS',
      
      // Campos de Tabela
      'Tabela': 'tabela',
      'Tabela Classe': 'tabela_classe',
      'Tabela tipo': 'tabela_tipo',
      'Classe JaraguaSul': 'classe_Jaragua_do_sul',
      'Classificação tipo': 'classificacao_tipo',
      
      // Campos de Registro Visa
      'Cód GGrem': 'Cod_Ggrem',
      'Princípio_Ativo_RegistroVisa': 'Principio_Ativo',
      'CNPJ Lab': 'cnpj_lab',
      'Classe Terapêutica': 'Classe_Terapeutica',
      'Tipo do Produto': 'Tipo_Porduto',
      'Regime Preço': 'Regime_Preco',
      'Restrição Hosp': 'Restricao_Hosp',
      'ICMS0': 'Icms0',
      
      // Via Administração
      'Via_Administração': 'Via_administracao',
      
      // Outros campos
      'Laboratório': 'Laboratorio',
      'Princípio_Ativo': 'PrincipioAtivo',
      'Princípio_Ativo_Classificado': 'PrincipioAtivoClassificado',
      'Medicamento': 'tipo_medicamento',
      'ID Taxa': 'id_taxas',
      'Fator_Conversão': 'id_fatorconversao',
      'Tempo infusão': 'tempo_infusao',

      'Objetivo': 'objetivo',
      'Finalidade': 'finalidade',
      'laboratório': 'Lab',
      'lab': 'Lab',
      'laboratorio_registro': 'Lab',
      'laboratorio_visa': 'Lab'
    };
    
    // Iterar sobre o mapeamento e normalizar os campos
    Object.entries(fieldMappings).forEach(([sourceField, targetField]) => {
      try {
        if (normalizedData[sourceField] !== undefined && 
            normalizedData[targetField] === undefined) {
          normalizedData[targetField] = normalizedData[sourceField];
          console.log(`Campo normalizado: ${sourceField} -> ${targetField} = ${normalizedData[targetField]}`);
        }
      } catch (error) {
        console.warn(`Erro ao normalizar campo ${sourceField}:`, error);
      }
    });
    
    // Add special handling for Lab field
    if ((normalizedData.Lab === undefined || normalizedData.Lab === '') && 
        normalizedData.Laboratorio !== undefined && 
        normalizedData.Laboratorio !== '') {
      normalizedData.Lab = normalizedData.Laboratorio;
      console.log(`Campo especial Lab normalizado de Laboratorio: ${normalizedData.Lab}`);
    }
    
    // Add special handling for objetivo field
    if (normalizedData.objetivo === undefined) {
      if (normalizedData.Objetivo !== undefined) {
        normalizedData.objetivo = normalizedData.Objetivo;
      } else if (normalizedData.idTabela && normalizedData.tabela) {
        // If we have tabela info but no objetivo, make sure it's at least initialized
        normalizedData.objetivo = normalizedData.objetivo || '';
      }
    }
    
    return normalizedData;
  };

  const debugServiceFields = (service) => {
    if (!service) return;
    
    console.group('DEBUG - Campos do Serviço');
    
    // Geral
    console.group('Geral');
    console.log('Cod:', service.Cod);
    console.log('Codigo_TUSS:', service.Codigo_TUSS, '| codigoTUSS:', service.codigoTUSS);
    console.log('Via_administracao:', service.Via_administracao, '| Via_Administração:', service.Via_Administração);
    console.log('ClasseFarmaceutica:', service.ClasseFarmaceutica, '| Classe_Farmaceutica:', service.Classe_Farmaceutica);
    console.log('Armazenamento:', service.Armazenamento);
    console.log('tipo_medicamento:', service.tipo_medicamento, '| Medicamento:', service.Medicamento);
    console.log('id_fatorconversao:', service.id_fatorconversao, '| Fator_Conversão:', service.Fator_Conversão);
    console.log('Concentracao:', service.Concentracao);
    console.log('Fracionamento:', service.Fracionamento);
    console.log('Laboratorio:', service.Laboratorio, '| Laboratório:', service.Laboratório);
    console.log('Uso:', service.Uso);
    console.log('Revisado_Farma:', service.Revisado_Farma);
    console.log('Revisado_ADM:', service.Revisado_ADM);
    console.group('Problematic Fields Detail');
    console.log('Objetivo original:', service.Objetivo);
    console.log('objetivo normalizado:', service.objetivo);
    console.log('Lab original:', service.Lab);
    console.log('Laboratorio campo:', service.Laboratorio);
    console.log('PrincipioAtivoClassificado vs PrincipioAtivo:', 
                service.PrincipioAtivoClassificado, 
                service.PrincipioAtivo);
    console.groupEnd();
    console.groupEnd();
    
    // Descrições
    console.group('Descrições');
    console.log('Descricao_Padronizada:', service.Descricao_Padronizada);
    console.log('Descricao_Resumida:', service.Descricao_Resumida);
    console.log('Descricao_Comercial:', service.Descricao_Comercial);
    console.groupEnd();
    
    // Tabela
    console.group('Tabela');
    console.log('tabela:', service.tabela, '| Tabela:', service.Tabela);
    console.log('tabela_classe:', service.tabela_classe, '| Tabela Classe:', service['Tabela Classe']);
    console.log('tabela_tipo:', service.tabela_tipo, '| Tabela tipo:', service['Tabela tipo']);
    console.log('classe_Jaragua_do_sul:', service.classe_Jaragua_do_sul, '| Classe JaraguaSul:', service['Classe JaraguaSul']);
    console.log('classificacao_tipo:', service.classificacao_tipo, '| Classificação tipo:', service['Classificação tipo']);
    console.log('finalidade:', service.finalidade, '| Finalidade:', service.Finalidade);
    console.log('objetivo:', service.objetivo, '| Objetivo:', service.Objetivo);
    console.groupEnd();
    
    // Princípio Ativo
    console.group('Princípio Ativo');
    console.log('PrincipioAtivo:', service.PrincipioAtivo, '| Principio_Ativo:', service.Principio_Ativo, '| Princípio_Ativo:', service.Princípio_Ativo);
    console.log('PrincipioAtivoClassificado:', service.PrincipioAtivoClassificado, '| Princípio_Ativo_Classificado:', service.Princípio_Ativo_Classificado);
    console.log('FaseUGF:', service.FaseUGF, '| FaseuGF:', service.FaseuGF);
    console.groupEnd();
    
    // Registro Visa
    console.group('Registro Visa');
    console.log('RegistroVisa:', service.RegistroVisa);
    console.log('Cod_Ggrem:', service.Cod_Ggrem, '| Cód GGrem:', service['Cód GGrem']);
    console.log('Principio_Ativo_RegistroVisa:', service.Principio_Ativo_RegistroVisa, '| Princípio_Ativo_RegistroVisa:', service.Princípio_Ativo_RegistroVisa);
    console.log('Lab:', service.Lab);
    console.log('cnpj_lab:', service.cnpj_lab, '| CNPJ Lab:', service['CNPJ Lab']);
    console.log('Classe_Terapeutica:', service.Classe_Terapeutica, '| Classe Terapêutica:', service['Classe Terapêutica']);
    console.log('Tipo_Porduto:', service.Tipo_Porduto, '| Tipo do Produto:', service['Tipo do Produto']);
    console.log('Regime_Preco:', service.Regime_Preco, '| Regime Preço:', service['Regime Preço']);
    console.log('Restricao_Hosp:', service.Restricao_Hosp, '| Restrição Hosp:', service['Restrição Hosp']);
    console.log('Cap:', service.Cap);
    console.log('Confaz87:', service.Confaz87);
    console.log('Icms0:', service.Icms0, '| ICMS0:', service.ICMS0);
    console.log('Lista:', service.Lista);
    console.log('Status:', service.Status);
    console.groupEnd();
    
    // Unidade Fracionamento
    console.group('Unidade Fracionamento');
    console.log('UnidadeFracionamento:', service.UnidadeFracionamento, '| Unidade_Fracionamento:', service.Unidade_Fracionamento);
    console.log('UnidadeFracionamentoDescricao:', service.UnidadeFracionamentoDescricao, '| Descricao:', service.Descricao);
    console.log('Divisor:', service.Divisor);
    console.groupEnd();
    
    // Taxas
    console.group('Taxas');
    console.log('id_taxas:', service.id_taxas, '| ID Taxa:', service['ID Taxa']);
    console.log('tipo_taxa:', service.tipo_taxa, '| tipo taxa:', service['tipo taxa']);
    console.log('TaxaFinalidade:', service.TaxaFinalidade, '| finalidade (taxa):', service.finalidade);
    console.log('tempo_infusao:', service.tempo_infusao, '| Tempo infusão:', service['Tempo infusão']);
    console.groupEnd();
    
    console.groupEnd();
  };

  // Renderizar campos da seção ativa
  const renderSectionFields = () => {
    // Se não houver dados para exibir, não renderiza nada
    if (!selectedService && !isEditing && !isAdding) return null;
    
    // Define o modo (visualização, edição ou adição)
    const mode = isEditing ? 'edit' : (isAdding ? 'add' : 'view');
    
    // Flag para controlar se os campos são editáveis
    const isEditable = mode === 'edit' || mode === 'add';
    
    // Dados a serem exibidos - Usa os dados aprimorados quando disponíveis
    let displayData = isEditing ? editedData : 
                 (isAdding ? newServiceData : 
                  (enhancedData || selectedService));

    // Aplicar normalização se houver dados
    if (displayData) {
      displayData = normalizeServiceData(displayData);
    }

    // Campo Laboratório - Verifica se existe em displayData, senão usa valor padrão
    const laboratorio = displayData && displayData.Laboratorio ? displayData.Laboratorio : '';
    
    // Campo Código TUSS - Verifica se existe em displayData, senão usa valor padrão
    const codigoTuss = (() => {
      if (!displayData) return '';
      
      if (displayData.Codigo_TUSS !== undefined) {
        return String(displayData.Codigo_TUSS);
      }
      
      if (displayData.codigoTUSS !== undefined) {
        return String(displayData.codigoTUSS);
      }
      
      return '';
    })();
    
    switch (activeSection) {
      // Modificação na aba 'geral' dentro da função renderSectionFields()
      case 'geral':
        return (
          <div className="sr-section-fields">
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Código</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Cod || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Cod') : handleInputChange(e, 'Cod')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Cod || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Código TUSS</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={codigoTuss}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Codigo_TUSS') : handleInputChange(e, 'Codigo_TUSS')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{codigoTuss || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Tabela Celos</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Codigo_Celos || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Codigo_Celos') : handleInputChange(e, 'Codigo_Celos')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Codigo_Celos || '-'}</div>
                )}
              </div>
            </div>
            
            {/* O restante do código para a aba Geral permanece o mesmo */}
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Classe Farmacêutica</label>
                {isEditable ? (
                  <select
                    value={displayData.idClasseFarmaceutica || ''}
                    onChange={(e) => handleSelectChange(e, 'ClasseFarmaceutica')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    {(displayData.idClasseFarmaceutica === undefined || 
                      displayData.idClasseFarmaceutica === null || 
                      displayData.idClasseFarmaceutica === '') && 
                      <option value="">Selecione...</option>}
                    {dropdownOptions?.classeFarmaceutica?.map(item => (
                      <option key={item.id_medicamento} value={item.id_medicamento}>
                        {item.ClasseFarmaceutica}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['ClasseFarmaceutica', 'Classe_Farmaceutica'])}
                  </div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Armazenamento</label>
                {isEditable ? (
                  <select
                    value={displayData.idArmazenamento || ''}
                    onChange={(e) => handleSelectChange(e, 'Armazenamento')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    {(displayData.idArmazenamento === undefined || 
                      displayData.idArmazenamento === null || 
                      displayData.idArmazenamento === '') && 
                      <option value="">Selecione...</option>}
                    {dropdownOptions.armazenamento?.map(item => (
                      <option key={item.idArmazenamento} value={item.idArmazenamento}>
                        {item.Armazenamento}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Armazenamento || '-'}
                  </div>
                )}
              </div>

              <div className="sr-field-container">
                <label>Medicamento</label>
                {isEditable ? (
                  <select
                    value={displayData.idMedicamento || ''}
                    onChange={(e) => handleSelectChange(e, 'tipo_medicamento')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    {(displayData.idMedicamento === undefined || 
                      displayData.idMedicamento === null || 
                      displayData.idMedicamento === '') && 
                      <option value="">Selecione...</option>}
                    {dropdownOptions.tipoMedicamento?.map(item => (
                      <option key={item.id_medicamento} value={item.id_medicamento}>
                        {item.tipo_medicamento}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['tipo_medicamento', 'Medicamento'])}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Fator Conversão</label>
                {isEditable ? (
                  <select
                    value={displayData.idFatorConversao || ''}
                    onChange={(e) => handleSelectChange(e, 'FatorConversao')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    {(displayData.idFatorConversao === undefined || 
                      displayData.idFatorConversao === null || 
                      displayData.idFatorConversao === '') && 
                      <option value="">Selecione...</option>}
                    {dropdownOptions.fatorConversao?.map(item => (
                      <option key={item.id_fatorconversao} value={item.id_fatorconversao}>
                        {item.fator}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['Fator_Conversão', 'fator'])}
                  </div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Concentração</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Concentracao || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Concentracao') : handleInputChange(e, 'Concentracao')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Concentracao || '-'}
                  </div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Fracionamento</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Fracionamento || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Fracionamento') : handleInputChange(e, 'Fracionamento')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Fracionamento || '-'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">  {/* Removi a classe sr-full-width aqui */}
                <label>Uso</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Uso || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Uso') : handleInputChange(e, 'Uso')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Uso || '-'}
                  </div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Via Administração</label>
                {isEditable ? (
                  <select
                    value={displayData.idViaAdministracao || ''}
                    onChange={(e) => handleSelectChange(e, 'ViaAdministracao')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    {(displayData.idViaAdministracao === undefined || 
                      displayData.idViaAdministracao === null || 
                      displayData.idViaAdministracao === '') && 
                      <option value="">Selecione...</option>}
                    {dropdownOptions.viaAdministracao?.map(item => (
                      <option key={item.idviaadministracao} value={item.idviaadministracao}>
                        {item.Via_administracao}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['ViaAdministracao', 'Via_administracao', 'Via_Administração'])}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Revisão Administrativa</label> {/* Renomeado de "Revisado ADM" */}
                {isEditable ? (
                  <select
                    value={displayData.Revisado_ADM === null ? '' : displayData.Revisado_ADM}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      if (isEditing) {
                        setEditedData(prev => ({...prev, Revisado_ADM: value}));
                      } else {
                        setNewServiceData(prev => ({...prev, Revisado_ADM: value}));
                      }
                    }}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    <option value="">Não definido</option>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Revisado_ADM === 1 ? 'Sim' : 
                    (displayData.Revisado_ADM === 0 ? 'Não' : 
                    (displayData.Revisado_ADM === null ? 'Não definido' : String(displayData.Revisado_ADM)))}
                  </div>
                )}
              </div>
            
              <div className="sr-field-container">
                <label>Revisão Farmacêutico</label> {/* Renomeado de "Revisado Farma" */}
                {isEditable ? (
                  <select
                    value={displayData.Revisado_Farma === null ? '' : displayData.Revisado_Farma}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      if (isEditing) {
                        setEditedData(prev => ({...prev, Revisado_Farma: value}));
                      } else {
                        setNewServiceData(prev => ({...prev, Revisado_Farma: value}));
                      }
                    }}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    <option value="">Não definido</option>
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Revisado_Farma === 1 ? 'Ativo' : 
                    (displayData.Revisado_Farma === 0 ? 'Inativo' : 'Não definido')}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      // Modificação na aba 'descricoes' dentro da função renderSectionFields()
      case 'descricoes':
        return (
          <div className="sr-section-fields">
            <div className="sr-field-row">
              <div className="sr-field-container sr-full-width">
                <label>Descrição Resumida</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Descricao_Resumida || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Descricao_Resumida') : handleInputChange(e, 'Descricao_Resumida')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Descricao_Resumida || '-'}</div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container sr-full-width">
                <label>Descrição Padronizada</label> {/* Mantém Descricao_Padronizada no banco */}
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Descricao_Padronizada || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Descricao_Padronizada') : handleInputChange(e, 'Descricao_Padronizada')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Descricao_Padronizada || '-'}</div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container sr-full-width">
                <label>Descrição Comercial Resumida</label> {/* Mantém Descricao_Comercial no banco */}
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Descricao_Comercial || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Descricao_Comercial') : handleInputChange(e, 'Descricao_Comercial')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Descricao_Comercial || '-'}</div>
                )}
              </div>
            </div>
            
            {/* Novo campo: Descrição Comercial Completa */}
            <div className="sr-field-row">
              <div className="sr-field-container sr-full-width">
                <label>Descrição Comercial Completa</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Descricao_Comercial_Completa || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Descricao_Comercial_Completa') : handleInputChange(e, 'Descricao_Comercial_Completa')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Descricao_Comercial_Completa || '-'}</div>
                )}
              </div>
            </div>
            
            {/* Novo campo: Descrição TUSS */}
            <div className="sr-field-row">
              <div className="sr-field-container sr-full-width">
                <label>Descrição TUSS</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Descricao_TUSS || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Descricao_TUSS') : handleInputChange(e, 'Descricao_TUSS')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Descricao_TUSS || '-'}</div>
                )}
              </div>
            </div>
          </div>
        );
        
        case 'tabela':
          return (
            <div className="sr-section-fields">
              <div className="sr-field-row">
                <div className="sr-field-container">
                  <label>Tabela</label>
                  {isEditable ? (
                    <select
                      value={displayData.idTabela || ''}
                      onChange={(e) => handleSelectChange(e, 'Tabela')}
                      className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                    >
                      {(displayData.idTabela === undefined || 
                        displayData.idTabela === null || 
                        displayData.idTabela === '') && 
                        <option value="">Selecione...</option>}
                      {dropdownOptions.tabela?.map(item => (
                        <option key={item.id_tabela} value={item.id_tabela}>
                          {item.tabela}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="sr-field-value sr-read-only">
                      {displayData.tabela || '-'}
                    </div>
                  )}
                </div>
                
                <div className="sr-field-container">
                  <label>Classe</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={displayData.tabela_classe || ''}
                      onChange={(e) => isAdding ? handleNewInputChange(e, 'tabela_classe') : handleInputChange(e, 'tabela_classe')}
                      className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                    />
                  ) : (
                    <div className="sr-field-value sr-read-only">
                      {displayData.tabela_classe || '-'}
                    </div>
                  )}
                </div>
                
                <div className="sr-field-container">
                  <label>Tipo</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={displayData.tabela_tipo || ''}
                      onChange={(e) => isAdding ? handleNewInputChange(e, 'tabela_tipo') : handleInputChange(e, 'tabela_tipo')}
                      className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                    />
                  ) : (
                    <div className="sr-field-value sr-read-only">
                      {displayData.tabela_tipo || '-'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="sr-field-row">
                <div className="sr-field-container">
                  <label>Classe Jaraguá do Sul</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={displayData.classe_Jaragua_do_sul || ''}
                      onChange={(e) => isAdding ? handleNewInputChange(e, 'classe_Jaragua_do_sul') : handleInputChange(e, 'classe_Jaragua_do_sul')}
                      className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                    />
                  ) : (
                    <div className="sr-field-value sr-read-only">
                      {displayData.classe_Jaragua_do_sul || '-'}
                    </div>
                  )}
                </div>
                
                <div className="sr-field-container">
                  <label>Classificação Tipo</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={displayData.classificacao_tipo || ''}
                      onChange={(e) => isAdding ? handleNewInputChange(e, 'classificacao_tipo') : handleInputChange(e, 'classificacao_tipo')}
                      className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                    />
                  ) : (
                    <div className="sr-field-value sr-read-only">
                      {displayData.classificacao_tipo || '-'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="sr-field-row">
                <div className="sr-field-container">
                  <label>Finalidade</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={displayData.finalidade || ''}
                      onChange={(e) => isAdding ? handleNewInputChange(e, 'finalidade') : handleInputChange(e, 'finalidade')}
                      className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                    />
                  ) : (
                    <div className="sr-field-value sr-read-only">
                      {displayData.finalidade || '-'}
                    </div>
                  )}
                </div>
                
                <div className="sr-field-container">
                  <label>Objetivo</label>
                  {isEditable ? (
                    <input
                      type="text"
                      value={getSafeValue(displayData, ['objetivo', 'Objetivo']) || ''}
                      onChange={(e) => isAdding ? handleNewInputChange(e, 'objetivo') : handleInputChange(e, 'objetivo')}
                      className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                    />
                  ) : (
                    <div className="sr-field-value sr-read-only">
                      {getSafeValue(displayData, ['objetivo', 'Objetivo']) || '-'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        
          case 'principio_ativo':
            return (
              <div className="sr-section-fields">
                <div className="sr-field-row">
                  <div className="sr-field-container">
                    <label>Princípio Ativo</label>
                    {isEditable ? (
                      <select
                        value={displayData.idPrincipioAtivo || ''}
                        onChange={(e) => handleSelectChange(e, 'PrincipioAtivo')}
                        className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                      >
                        {!displayData.idPrincipioAtivo && <option value="">Selecione...</option>}
                        {dropdownOptions.principioAtivo?.map(item => (
                          <option key={item.idPrincipioAtivo} value={item.idPrincipioAtivo}>
                            {item.PrincipioAtivo}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="sr-field-value sr-read-only">
                        {getSafeValue(displayData, ['PrincipioAtivo', 'Principio_Ativo', 'Princípio_Ativo'])}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="sr-field-row">
                  <div className="sr-field-container">
                    <label>Princípio Ativo Classificado</label>
                    {isEditable ? (
                      <input
                        type="text"
                        value={getSafeValue(displayData, ['PrincipioAtivoClassificado', 'Princípio_Ativo_Classificado']) || ''}
                        onChange={(e) => isAdding ? handleNewInputChange(e, 'PrincipioAtivoClassificado') : handleInputChange(e, 'PrincipioAtivoClassificado')}
                        className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                      />
                    ) : (
                      <div className="sr-field-value sr-read-only">
                        {getSafeValue(displayData, ['PrincipioAtivoClassificado', 'Princípio_Ativo_Classificado'])}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="sr-field-row">
                  <div className="sr-field-container">
                    <label>Fase UGF</label>
                    {isEditable ? (
                      <input
                        type="text"
                        value={getSafeValue(displayData, ['FaseUGF', 'FaseuGF']) || ''}
                        onChange={(e) => isAdding ? handleNewInputChange(e, 'FaseUGF') : handleInputChange(e, 'FaseUGF')}
                        className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                      />
                    ) : (
                      <div className="sr-field-value sr-read-only">
                        {getSafeValue(displayData, ['FaseUGF', 'FaseuGF'])}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
        
      case 'registro_visa':
        return (
          <div className="sr-section-fields">
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Registro Visa</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.RegistroVisa || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'RegistroVisa') : handleInputChange(e, 'RegistroVisa')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.RegistroVisa || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Cód GGrem</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Cod_Ggrem || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Cod_Ggrem') : handleInputChange(e, 'Cod_Ggrem')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Cod_Ggrem || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Laboratório</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={getSafeValue(displayData, ['Lab', 'Laboratorio', 'Laboratório']) || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Lab') : handleInputChange(e, 'Lab')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['Lab', 'Laboratorio', 'Laboratório']) || '-'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>CNPJ Lab</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.cnpj_lab || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'cnpj_lab') : handleInputChange(e, 'cnpj_lab')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.cnpj_lab || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Princípio Ativo (Registro)</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Principio_Ativo || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Principio_Ativo') : handleInputChange(e, 'Principio_Ativo')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Principio_Ativo || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Status</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Status || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Status') : handleInputChange(e, 'Status')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Status || '-'}</div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Classe Terapêutica</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Classe_Terapeutica || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Classe_Terapeutica') : handleInputChange(e, 'Classe_Terapeutica')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Classe_Terapeutica || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Tipo do Produto</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Tipo_Porduto || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Tipo_Porduto') : handleInputChange(e, 'Tipo_Porduto')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Tipo_Porduto || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Regime Preço</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Regime_Preco || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Regime_Preco') : handleInputChange(e, 'Regime_Preco')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Regime_Preco || '-'}</div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Restrição Hosp</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Restricao_Hosp || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Restricao_Hosp') : handleInputChange(e, 'Restricao_Hosp')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Restricao_Hosp || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Cap</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Cap || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Cap') : handleInputChange(e, 'Cap')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Cap || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Confaz87</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Confaz87 || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Confaz87') : handleInputChange(e, 'Confaz87')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Confaz87 || '-'}</div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>ICMS0</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Icms0 || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Icms0') : handleInputChange(e, 'Icms0')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Icms0 || '-'}</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Lista</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Lista || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Lista') : handleInputChange(e, 'Lista')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">{displayData.Lista || '-'}</div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'unidade_fracionamento':
        return (
          <div className="sr-section-fields">
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Unidade Fracionamento</label>
                {isEditable ? (
                  <select
                    value={displayData.idUnidadeFracionamento || ''}
                    onChange={(e) => handleSelectChange(e, 'UnidadeFracionamento')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    {(displayData.idUnidadeFracionamento === undefined || 
                      displayData.idUnidadeFracionamento === null || 
                      displayData.idUnidadeFracionamento === '') && 
                      <option value="">Selecione...</option>}
                    {dropdownOptions.unidadeFracionamento?.map(item => (
                      <option key={item.id_unidadefracionamento} value={item.id_unidadefracionamento}>
                        {item.UnidadeFracionamento} - {item.Descricao || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.UnidadeFracionamento || displayData.Unidade_Fracionamento || '-'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Descrição</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Descricao || displayData.UnidadeFracionamentoDescricao || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Descricao') : handleInputChange(e, 'Descricao')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Descricao || displayData.UnidadeFracionamentoDescricao || '-'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Divisor</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={displayData.Divisor || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Divisor') : handleInputChange(e, 'Divisor')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Divisor || '-'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'taxas':
        return (
          <div className="sr-section-fields">
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Taxas</label>
                {isEditable ? (
                  <select
                    value={displayData.idTaxas || ''}
                    onChange={(e) => handleSelectChange(e, 'Taxas')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    {(displayData.idTaxas === undefined || 
                      displayData.idTaxas === null || 
                      displayData.idTaxas === '') && 
                      <option value="">Selecione...</option>}
                    {dropdownOptions.taxas?.map(item => (
                      <option key={item.id_taxas} value={item.id_taxas}>
                        {item.finalidade}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['TaxaFinalidade', 'finalidade'])}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>ID Taxa</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={getSafeValue(displayData, ['id_taxa', 'ID Taxa']) || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'id_taxa') : handleInputChange(e, 'id_taxa')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['id_taxa', 'ID Taxa'])}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Tipo Taxa</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={getSafeValue(displayData, ['tipo_taxa', 'tipo taxa']) || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'tipo_taxa') : handleInputChange(e, 'tipo_taxa')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['tipo_taxa', 'tipo taxa'])}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Tempo Infusão</label>
                {isEditable ? (
                  <input
                    type="text"
                    value={getSafeValue(displayData, ['tempo_infusao', 'Tempo infusão']) || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'tempo_infusao') : handleInputChange(e, 'tempo_infusao')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {getSafeValue(displayData, ['tempo_infusao', 'Tempo infusão'])}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'entrada':
        return (
          <div className="sr-section-fields">
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Unidade de Entrada</label>
                {isEditable ? (
                  <select
                    value={displayData.Unidade_Entrada || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Unidade_Entrada') : handleInputChange(e, 'Unidade_Entrada')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    <option value="">Selecione...</option>
                    {dropdownOptions.unidadeFracionamento?.map(item => (
                      <option key={item.id_unidadefracionamento} value={item.UnidadeFracionamento}>
                        {item.UnidadeFracionamento} - {item.Descricao || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Unidade_Entrada || '-'}
                  </div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Quantidade de Entrada</label>
                {isEditable ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={displayData.Quantidade_Entrada || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Quantidade_Entrada') : handleInputChange(e, 'Quantidade_Entrada')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Quantidade_Entrada || '-'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Unidade de Entrada Convertida</label>
                {isEditable ? (
                  <select
                    value={displayData.Unidade_Entrada_Convertida || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Unidade_Entrada_Convertida') : handleInputChange(e, 'Unidade_Entrada_Convertida')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    <option value="">Selecione...</option>
                    {dropdownOptions.unidadeFracionamento?.map(item => (
                      <option key={item.id_unidadefracionamento} value={item.UnidadeFracionamento}>
                        {item.UnidadeFracionamento} - {item.Descricao || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Unidade_Entrada_Convertida || '-'}
                  </div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Quantidade Convertida</label>
                {isEditable ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={displayData.Quantidade_Convertida || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Quantidade_Convertida') : handleInputChange(e, 'Quantidade_Convertida')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Quantidade_Convertida || '-'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'pagamento':
        return (
          <div className="sr-section-fields">
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Unidade de Pagamento Não Fracionado</label>
                {isEditable ? (
                  <select
                    value={displayData.Unidade_Pagamento_Nao_Fracionado || displayData.Unidade_Entrada || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Unidade_Pagamento_Nao_Fracionado') : handleInputChange(e, 'Unidade_Pagamento_Nao_Fracionado')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    <option value="">Selecione...</option>
                    {dropdownOptions.unidadeFracionamento?.map(item => (
                      <option key={item.id_unidadefracionamento} value={item.UnidadeFracionamento}>
                        {item.UnidadeFracionamento} - {item.Descricao || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Unidade_Pagamento_Nao_Fracionado || displayData.Unidade_Entrada || '-'}
                  </div>
                )}
                {!isEditable && (
                  <div className="sr-field-info">(Igual à Unidade de Entrada)</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Quantidade de Pagamento Não Fracionado</label>
                {isEditable ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={displayData.Quantidade_Pagamento_Nao_Fracionado || displayData.Quantidade_Entrada || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Quantidade_Pagamento_Nao_Fracionado') : handleInputChange(e, 'Quantidade_Pagamento_Nao_Fracionado')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Quantidade_Pagamento_Nao_Fracionado || displayData.Quantidade_Entrada || '-'}
                  </div>
                )}
                {!isEditable && (
                  <div className="sr-field-info">(Igual à Quantidade de Entrada)</div>
                )}
              </div>
            </div>
            
            <div className="sr-field-row">
              <div className="sr-field-container">
                <label>Unidade de Pagamento Fracionado</label>
                {isEditable ? (
                  <select
                    value={displayData.Unidade_Pagamento_Fracionado || displayData.Unidade_Entrada_Convertida || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Unidade_Pagamento_Fracionado') : handleInputChange(e, 'Unidade_Pagamento_Fracionado')}
                    className={`sr-form-select ${isEditable ? 'sr-editing' : ''}`}
                  >
                    <option value="">Selecione...</option>
                    {dropdownOptions.unidadeFracionamento?.map(item => (
                      <option key={item.id_unidadefracionamento} value={item.UnidadeFracionamento}>
                        {item.UnidadeFracionamento} - {item.Descricao || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Unidade_Pagamento_Fracionado || displayData.Unidade_Entrada_Convertida || '-'}
                  </div>
                )}
                {!isEditable && (
                  <div className="sr-field-info">(Igual à Unidade de Entrada Convertida)</div>
                )}
              </div>
              
              <div className="sr-field-container">
                <label>Quantidade de Pagamento Fracionado</label>
                {isEditable ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={displayData.Quantidade_Pagamento_Fracionado || displayData.Quantidade_Convertida || ''}
                    onChange={(e) => isAdding ? handleNewInputChange(e, 'Quantidade_Pagamento_Fracionado') : handleInputChange(e, 'Quantidade_Pagamento_Fracionado')}
                    className={`sr-form-input ${isEditable ? 'sr-editing' : ''}`}
                  />
                ) : (
                  <div className="sr-field-value sr-read-only">
                    {displayData.Quantidade_Pagamento_Fracionado || displayData.Quantidade_Convertida || '-'}
                  </div>
                )}
                {!isEditable && (
                  <div className="sr-field-info">(Igual à Quantidade Convertida)</div>
                )}
              </div>
            </div>
          </div>
        );
        
        
      default:
        return null;
    }
  };

  // Renderizar lista de serviços
  const renderServiceList = () => {
    return (
      <div className="sr-service-list-container">
        <h3 className="sr-service-list-title">Serviços</h3>
        
        {loading ? (
          <div className="sr-loading-indicator">
            <img src="/images/loadingcorreto-semfundo.gif" alt="Carregando..." className="sr-loading-img" />
          </div>
        ) : error ? (
          <div className="sr-error-message">
            Erro ao carregar dados: {error}
          </div>
        ) : serviceData.length === 0 ? (
          <div className="sr-empty-data-message">
            {isSearching ? "Nenhum resultado encontrado" : "Nenhum serviço disponível"}
          </div>
        ) : (
          <>
            <div className="sr-service-list">
              {serviceData.map(service => (
                <div 
                  key={service.id}
                  className={`sr-service-item ${selectedRows.has(service.id) ? 'sr-selected' : ''}`}
                  onClick={() => toggleRowSelection(service.id)}
                >
                  <div className="sr-service-item-code">{service.Cod}</div>
                  <div className="sr-service-item-desc">
                    {service.PrincipioAtivo || service.Principio_Ativo || '-'}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Botão "Carregar mais" */}
            {hasMore && !localLoading && (
              <div className="sr-load-more-container">
                <button 
                  className="sr-load-more-button"
                  onClick={() => loadMore()}
                  disabled={loading}
                >
                  {loading ? 'Carregando...' : 'Carregar mais serviços'}
                </button>
              </div>
            )}
            
            {/* Indicador de carregamento ao carregar mais */}
            {localLoading && (
              <div className="sr-load-more-container">
                <img src="/images/loadingcorreto-semfundo.gif" alt="Carregando..." className="sr-loading-img-small" />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderSortingOptions = () => {
    return (
      <div className="sr-sorting-container">
        <div className="sr-sorting-header">
          <h4>Ordenar por</h4>
        </div>
        <div className="sr-sorting-options">
          <select 
            className="sr-sort-select" 
            value={`${sortField}-${sortOrder}`} 
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              changeSort(field, order);
            }}
          >
            <option value="id-desc">Mais recentes</option>
            <option value="id-asc">Mais antigos</option>
            <option value="Cod-asc">Código (A-Z)</option>
            <option value="Cod-desc">Código (Z-A)</option>
            <option value="PrincipioAtivo-asc">Princípio Ativo (A-Z)</option>
            <option value="PrincipioAtivo-desc">Princípio Ativo (Z-A)</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="container">
        <Sidebar />
        
        <div className="main-content">
          <Header />
          
          <main>
            <div className="sr-styled-container sr-centered">
              {/* Área de pesquisa */}
              <div className="sr-search-container">
                <div className="sr-search-bar-container">
                  <div className="sr-search-bar">
                    <button
                      onClick={executeSearch}
                      className="sr-search-button"
                      title="Pesquisar"
                    >
                      <Search size={18} />
                    </button>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Buscar por Princípio Ativo ou Código..."
                      className="sr-search-input"
                      defaultValue={searchTerm}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      autoComplete="off"
                    />
                    {isSearching && (
                      <button 
                        className="sr-clear-search-button"
                        onClick={handleClearSearch}
                        title="Limpar pesquisa"
                      >
                        <X size={16} />
                      </button>
                    )}
                    
                    {/* Lista de sugestões */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="sr-suggestions-dropdown" ref={suggestionsRef}>
                        {suggestions.map((item) => (
                          <div 
                            key={item.idPrincipioAtivo} 
                            className="sr-suggestion-item"
                            onClick={() => selectSuggestion(item)}
                          >
                            <span className="sr-suggestion-icon">
                              <Search size={14} />
                            </span>
                            {item.PrincipioAtivo}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Status da pesquisa abaixo do campo de busca */}
                  {isSearching && searchTerm && (
                    <div className="sr-search-status">
                      {serviceData.length} resultado(s) encontrado(s) para "{searchTerm}"
                    </div>
                  )}
                </div>
                
                {/* Seletor de ordenação ao lado do campo de busca */}
                <div className="sr-search-controls">
                  <DataRefreshButton />
                  <div className="sr-sort-container">
                    <select 
                      className="sr-sort-select" 
                      value={`${sortField}-${sortOrder}`} 
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        changeSort(field, order);
                      }}
                      title="Ordenar por"
                    >
                      <option value="id-desc">Mais recentes</option>
                      <option value="id-asc">Mais antigos</option>
                      <option value="Cod-asc">Código (A-Z)</option>
                      <option value="Cod-desc">Código (Z-A)</option>
                      <option value="PrincipioAtivo-asc">Princípio Ativo (A-Z)</option>
                      <option value="PrincipioAtivo-desc">Princípio Ativo (Z-A)</option>
                    </select>
                  </div>
                  
                </div>
              </div>

              {/* Destaque para Princípio Ativo e Código quando selecionado */}
              {selectedService && !isEditing && !isAdding && (
                <div className="sr-selected-service-highlight">
                  <div className="sr-highlight-content">
                    <div className="sr-highlight-code">
                      <span className="sr-highlight-label">Código: </span>
                      <span className="sr-highlight-value">{selectedService.Cod}</span>
                    </div>
                    <div className="sr-highlight-name">
                      <span className="sr-highlight-label">Princípio Ativo: </span>
                      <span className="sr-highlight-value">
                        {getSafeValue(
                          enhancedData || selectedService, 
                          ['PrincipioAtivo', 'Principio_Ativo', 'Princípio_Ativo'], 
                          'Não informado'
                        )}
                      </span>
                      <div className="sr-highlight-description">
                        {enhancedData?.Descricao_Comercial || enhancedData?.Descricao_Padronizada || '-'}
                      </div>
                    </div>
                    <div className="sr-highlight-info">
                      <Info size={16} className="sr-info-icon" />
                      <span>Serviço selecionado</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Área de conteúdo principal */}
              <div className="sr-content-container">
                {/* Lista de serviços (somente no modo de visualização) */}
                {!isEditing && !isAdding && renderServiceList()}
                
                {/* Área de detalhes/edição/adição */}
                <div className="sr-details-container">
                  {/* Botões de navegação entre seções (apenas quando há serviço selecionado) */}
                  {(selectedService || isEditing || isAdding) && (
                    <ScrollableTabs 
                      activeSection={activeSection}
                      setActiveSection={setActiveSection}
                      isEditing={isEditing}
                      isAdding={isAdding}
                    />
                  )}
                  
                  {/* Campos da seção ativa */}
                  <div className="sr-section-content">
                    {renderSectionFields()}
                    {!selectedService && !isEditing && !isAdding && (
                      <div className="sr-no-selection-message">
                        <p>Selecione um serviço para visualizar detalhes ou clique em "Adicionar" para criar um novo.</p>
                        <img src="/images/GifLogo.gif" alt="Carregando..." className="sr-loading-gif" />
                      </div>
                    )}
                  </div>
                  
                  {/* Botões de ação */}
                  <div className="sr-action-buttons">
                    {isEditing || isAdding ? (
                      <>
                        <button 
                          className="sr-action-button sr-cancel-button" 
                          onClick={isEditing ? handleCancel : handleCancelAdd}
                        >
                          Cancelar
                        </button>
                        <button 
                          className="sr-action-button sr-save-button" 
                          onClick={isEditing ? handleSave : handleSaveNew}
                          disabled={localLoading}
                        >
                          {localLoading ? 'Salvando...' : 'Salvar'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="sr-action-button sr-add-button" 
                          onClick={handleAdd}
                          disabled={localLoading}
                        >
                          <Plus size={16} />
                          Adicionar
                        </button>
                        
                        {selectedRows.size > 0 && (
                          <>
                            <button 
                              className="sr-action-button sr-edit-button" 
                              onClick={handleEdit}
                              disabled={localLoading}
                            >
                              <Edit size={16} />
                              Alterar
                            </button>
                            
                            <button 
                              className="sr-action-button sr-delete-button" 
                              onClick={handleDelete}
                              disabled={localLoading}
                            >
                              <Trash2 size={16} />
                              Excluir
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Modal de controle de cache */}
      {showCacheControl && (
        <CacheControl onClose={() => setShowCacheControl(false)} />
      )}
      
      {/* Indicador de atualização de cache */}
      {cacheRefreshed && (
        <div className="sr-cache-refresh-indicator">
          <RefreshCw size={16} className="sr-refresh-icon" />
          <span>Cache atualizado com sucesso</span>
        </div>
      )}
    </PageTransition>
  );
}