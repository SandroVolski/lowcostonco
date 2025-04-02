import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

// Criando o contexto
const ServiceContext = createContext();
import CacheService from "../services/CacheService";

// Tempo de expiração do cache em ms (30 minutos - reduzido para evitar dados obsoletos)
const CACHE_EXPIRY = 30 * 60 * 1000;

// Tempo mínimo entre atualizações automáticas (em milissegundos)
const AUTO_REFRESH_COOLDOWN = 3 * 60 * 1000; // 3 minutos (reduzido para detectar mudanças mais rápido)

// Tempo máximo que o cache deve ser considerado válido sem verificação (em milissegundos)
const CACHE_MAX_AGE_WITHOUT_VALIDATION = 10 * 60 * 1000; // 10 minutos (reduzido)

// Hook personalizado para facilitar o uso do contexto
export const useServiceData = () => useContext(ServiceContext);

// Provider do contexto
export const ServiceProvider = ({ children }) => {
  const [serviceData, setServiceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("id"); // Estado para o campo de ordenação
  const [initialized, setInitialized] = useState(false);
  
  // Estados para pesquisa
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("auto"); // Tipo de pesquisa (auto, code, active, description, all)
  const [totalResults, setTotalResults] = useState(0);

  // Estados para cache
  const [isCacheEnabled, setIsCacheEnabled] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dataSource, setDataSource] = useState(''); // 'cache' ou 'server'
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [needsRevalidation, setNeedsRevalidation] = useState(false);
  
  // Política de atualização automática
  const [autoRefreshPolicy, setAutoRefreshPolicy] = useState({
    enabled: true,              // Se a atualização automática está habilitada
    validateOnFocus: true,      // Verificar dados quando a aba receber foco
    refreshAfterCRUD: true,     // Atualizar após operações de criação/edição/exclusão
    maxAge: CACHE_MAX_AGE_WITHOUT_VALIDATION    // Idade máxima do cache
  });

  const API_BASE_URL = "http://localhost/backend-php/api/ServicoRelacionada";

  // Inicializar o cache
  useEffect(() => {
    CacheService.init();
  }, []);

  // Função para alternar o cache
  const toggleCache = (enabled = true) => {
    setIsCacheEnabled(enabled);
    if (!enabled) {
      // Se estiver desativando o cache, limpa os dados em cache
      CacheService.clearAllCache();
    }
  };

  // Função para limpar o cache manualmente
  const clearCache = () => {
    CacheService.clearServiceDataOnly();
    console.log("Cache de serviços limpo manualmente");
  };

  // Função para carregar todos os dados (usado no gerenciador de cache)
  const reloadAllData = async () => {
    return loadServiceData(1, true);
  };

  // Função para determinar se devemos atualizar os dados
  const shouldRefreshData = () => {
    // Se a atualização automática estiver desabilitada, nunca atualizar automaticamente
    if (!autoRefreshPolicy.enabled) return false;
    
    const now = Date.now();
    
    // Verificar se passou tempo suficiente desde a última atualização
    const timeSinceLastRefresh = now - lastRefreshTime;
    if (timeSinceLastRefresh < AUTO_REFRESH_COOLDOWN) {
      console.log(`Atualização automática em cooldown (${Math.round((AUTO_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000)}s restantes)`);
      return false;
    }
    
    // Verificar se o cache é muito antigo e precisa ser validado
    if (timeSinceLastRefresh > autoRefreshPolicy.maxAge) {
      console.log(`Cache muito antigo (${Math.round(timeSinceLastRefresh / 60000)}min), forçando validação`);
      return true;
    }
    
    // Verificar se temos uma flag de revalidação necessária
    if (needsRevalidation) {
      console.log("Revalidação solicitada, atualizando dados");
      return true;
    }
    
    return false;
  };

  // Função para verificar se devemos atualizar os dados quando a aba recebe foco
  const handleAppFocus = () => {
    if (!autoRefreshPolicy.validateOnFocus) return;
    
    if (shouldRefreshData()) {
      console.log("Validando dados ao voltar para a aba");
      
      // Atualizar os dados em segundo plano
      loadServiceData(1, true, false); // O terceiro parâmetro indica que não deve mostrar loading
    }
  };

  // Registrar o evento de foco da janela
  useEffect(() => {
    const handleFocus = () => {
      handleAppFocus();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [lastRefreshTime, autoRefreshPolicy, needsRevalidation]);

  // Função para ordenar os dados
  const changeSort = (field) => {
    // Se clicar no mesmo campo, inverte a direção
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Se clicar em um novo campo, configura para ordenação ascendente
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Função para carregar os dados da API
  const loadServiceData = async (pageNum = 1, reset = false, showLoading = true) => {
    try {
      const requestParams = {
        page: pageNum,
        limit: 150,
        order: sortOrder,
        orderBy: sortField,
        search: searchTerm,
        searchType: searchType
      };

      // Gerar uma chave única para este conjunto específico de parâmetros
      const cacheKey = generateCacheKey(requestParams);
      
      // NOVA VERIFICAÇÃO: Se o cache foi marcado para revalidação, forçamos uma nova requisição
      const forceRevalidation = needsRevalidation;
      
      // Verificar se temos dados em cache e se o cache está habilitado
      if (isCacheEnabled && !searchTerm && !forceRevalidation) {
        // Verificar se temos dados em cache para esta requisição específica
        const cachedData = CacheService.getCache(cacheKey);
        
        if (cachedData) {
          console.log(`Usando dados em cache para ${cacheKey}`);
          
          // Usar os dados do cache
          const result = cachedData.data;
          
          // Verificar se o cache está marcado como "obsoleto" (stale)
          const isStale = cachedData.isStale;
          
          // Mapear e processar os dados como você fazia antes
          const mappedData = mapApiDataToServiceData(result);
          
          if (reset) {
            setServiceData(mappedData);
          } else {
            setServiceData(prev => [...prev, ...mappedData]);
          }
          
          setTotalResults(mappedData.length);
          setInitialized(true);
          
          // Definir a fonte de dados como cache
          setDataSource('cache');
          
          // Disparar evento personalizado para indicar fonte dos dados
          if (typeof window.dispatchEvent === 'function') {
            const event = new CustomEvent('data-source-changed', { detail: { source: 'cache' } });
            window.dispatchEvent(event);
          }
          
          // NOVA LÓGICA: Se o cache está marcado como obsoleto, disparar uma atualização em segundo plano
          if (isStale) {
            console.log("Cache está obsoleto, atualizando em segundo plano...");
            setTimeout(() => {
              backgroundRefresh(requestParams);
            }, 100);
          }
          
          // Limpar flag de necessidade de revalidação
          if (needsRevalidation) {
            setNeedsRevalidation(false);
          }
          
          // Retornar para encerrar a função aqui
          return;
        }
      }
      
      // Se não tiver cache ou o cache estiver desabilitado, continua com a requisição
      if (showLoading) {
        setLoading(true);
      }
      
      // Construir URL de base
      let apiUrl = `${API_BASE_URL}/get_services.php?page=${pageNum}&limit=150&order=${sortOrder}&orderBy=${sortField}&_t=${Date.now()}`;
      
      // Adicionar parâmetro de pesquisa se existir
      if (searchTerm) {
        apiUrl += `&search=${encodeURIComponent(searchTerm)}&searchType=${searchType}`;
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }
      
      console.log("Fazendo requisição para:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
          // Removidos os headers problemáticos:
          // 'Cache-Control': 'no-cache',
          // 'Pragma': 'no-cache'
        },
        mode: 'cors'
      });
      
      // Logging detalhado da resposta
      console.log("Status da resposta:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Detalhes do erro:", errorText);
        throw new Error(`Erro ao carregar os dados: ${response.status} - ${response.statusText}`);
      }
  
      const result = await response.json();
  
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são uma lista válida");
      }
  
      if (result.length === 0) {
        setHasMore(false);
      } else {
        // Mapeia os dados da API para o formato esperado
        const mappedData = mapApiDataToServiceData(result);
        
        // Armazenar o total de registros para exibição no CacheControl
        setTotalRecords(mappedData.length);

        if (reset) {
          setServiceData(mappedData);
        } else {
          setServiceData(prev => [...prev, ...mappedData]);
        }
        
        // Se o cache estiver habilitado e não for uma pesquisa, armazene em cache
        if (isCacheEnabled && !searchTerm) {
          console.log(`Armazenando dados em cache para ${cacheKey}`);
          CacheService.setCache(cacheKey, result, { requestParams }, CACHE_EXPIRY);
        }
        
        setInitialized(true);
        
        // Definir a fonte de dados como servidor
        setDataSource('server');
        
        // Atualizar o timestamp da última atualização
        setLastRefreshTime(Date.now());
        
        // Limpar flag de necessidade de revalidação
        if (needsRevalidation) {
          setNeedsRevalidation(false);
        }
        
        // Disparar evento personalizado para indicar fonte dos dados
        if (typeof window.dispatchEvent === 'function') {
          const event = new CustomEvent('data-source-changed', { detail: { source: 'server' } });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar os serviços:", error);
      setError(error.message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Função para atualização em segundo plano
  const backgroundRefresh = async (requestParams) => {
    try {
      // Construir URL de base
      let apiUrl = `${API_BASE_URL}/get_services.php?page=${requestParams.page}&limit=${requestParams.limit}&order=${requestParams.order}&orderBy=${requestParams.orderBy}&_t=${Date.now()}`;

      if (requestParams.search) {
        apiUrl += `&search=${encodeURIComponent(requestParams.search)}&searchType=${requestParams.searchType}`;
      }
      
      console.log("Atualizando dados em segundo plano:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
          // Removidos os headers problemáticos
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao atualizar dados em segundo plano: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são válidos");
      }
      
      // Gerar chave de cache para esta requisição
      const cacheKey = generateCacheKey(requestParams);
      
      // Atualizar o cache com os novos dados
      if (isCacheEnabled) {
        CacheService.setCache(cacheKey, result, { requestParams }, CACHE_EXPIRY);
      }
      
      // Mapear dados
      const mappedData = mapApiDataToServiceData(result);
      
      // Atualizar dados na interface (se não for uma pesquisa diferente)
      if (
        requestParams.search === searchTerm && 
        requestParams.searchType === searchType &&
        requestParams.orderBy === sortField &&
        requestParams.order === sortOrder
      ) {
        setServiceData(mappedData);
        setTotalResults(mappedData.length);
      }
      
      // Atualizar timestamp
      setLastRefreshTime(Date.now());
      
      console.log("Atualização em segundo plano concluída com sucesso");
      return true;
    } catch (error) {
      console.error("Erro na atualização em segundo plano:", error);
      return false;
    }
  };

  // Função helper para mapear os dados da API para o formato esperado
  const mapApiDataToServiceData = (apiData) => {
    return apiData.map(item => ({
      id: item.id,
      Cod: item.Cod,
      codigoTUSS: item.Codigo_TUSS,
      Descricao_Apresentacao: item.Descricao_Apresentacao,
      Descricao_Resumida: item.Descricao_Resumida,
      Descricao_Comercial: item.Descricao_Comercial,
      Concentracao: item.Concentracao,
      Unidade_Fracionamento: item.UnidadeFracionamento,
      Fracionamento: item.Fracionamento,
      "Laboratório": item.Laboratorio,
      Revisado_Farma: item.Revisado_Farma,
      
      // Campos de dRegistro_anvisa
      "RegistroVisa": item.RegistroVisa,
      "Cód GGrem": item.Cod_Ggrem,
      "Princípio_Ativo_RegistroVisa": item.PrincipioAtivo,
      Principio_Ativo_RegistroVisa: item.PrincipioAtivo,
      Laboratorio: item.Lab,
      "CNPJ Lab": item.cnpj_lab,
      "Classe Terapêutica": item.Classe_Terapeutica,
      "Tipo do Produto": item.Tipo_Porduto,
      "Regime Preço": item.Regime_Preco,
      "Restrição Hosp": item.Restricao_Hosp,
      Cap: item.Cap,
      Confaz87: item.Confaz87,
      ICMS0: item.Icms0,
      Lista: item.Lista,
      Status: item.Status,
      
      // Campos de dTabela
      Tabela: item.tabela,
      "Tabela Classe": item.tabela_classe,
      "Tabela tipo": item.tabela_tipo,
      "Classe JaraguaSul": item.classe_Jaragua_do_sul,
      "Classificação tipo": item.classificacao_tipo,
      Finalidade: item.finalidade,
      Objetivo: item.objetivo,
      
      // Campos de dViaadministracao
      "Via_Administração": item.Via_administracao,
      
      // Campos de dClasseFarmaceutica
      "Classe_Farmaceutica": item.ClasseFarmaceutica,
      
      // Campos de dPrincipioativo
      Princípio_Ativo: item.PrincipioAtivo,
      PrincipioAtivo: item.PrincipioAtivo,
      "Princípio_Ativo_Classificado": item.PrincipioAtivoClassificado,
      PrincipioAtivoClassificado: item.PrincipioAtivoClassificado,
      FaseuGF: item.FaseUGF,
      FaseUGF: item.FaseUGF,
      
      // Outros campos
      Armazenamento: item.Armazenamento,
      Medicamento: item.tipo_medicamento,
      Descricao: item.UnidadeFracionamentoDescricao,
      Divisor: item.Divisor,
      "Fator_Conversão": item.id_fatorconversao,
      "ID Taxa": item.id_taxas,
      "tipo taxa": item.tipo_taxa,
      finalidade: item.TaxaFinalidade,
      "Tempo infusão": item.tempo_infusao,
      
      // IDs para relacionamentos
      idPrincipioAtivo: item.idPrincipioAtivo,
      idRegistroVisa: item.idRegistroVisa,
      idViaAdministracao: item.idViaAdministracao,
      idClasseFarmaceutica: item.idClasseFarmaceutica,
      idArmazenamento: item.idArmazenamento,
      idMedicamento: item.idMedicamento,
      idUnidadeFracionamento: item.idUnidadeFracionamento,
      idFatorConversao: item.idFatorConversao,
      idTaxas: item.idTaxas,
      idTabela: item.idTabela
    }));
  };

  // Função para gerar uma chave única para o cache
  const generateCacheKey = (params) => {
    return `services_${params.page}_${params.limit}_${params.order}_${params.orderBy}${params.search ? `_search_${params.search}_${params.searchType}` : ''}`;
  };

  // Função para pesquisar serviços
  const searchServiceData = async (term, type = searchType) => {
    // Limpar resultados anteriores primeiro
    setServiceData([]);
    
    // Atualizar o estado com o novo termo e tipo
    setSearchTerm(term);
    setSearchType(type);
    
    // Garantir que estamos no modo de pesquisa
    setIsSearching(true);
    
    // Resetar a página e o estado "tem mais"
    setPage(1);
    setHasMore(true);
    
    // Iniciar carregamento
    setLoading(true);
    
    try {
      // Parâmetros para esta requisição de pesquisa
      const requestParams = {
        page: 1,
        limit: 150,
        order: sortOrder,
        orderBy: sortField,
        search: term,
        searchType: type
      };
      
      // Gerar uma chave única para esta pesquisa
      const cacheKey = generateCacheKey(requestParams);
      
      // NOVA VERIFICAÇÃO: Se o cache foi marcado para revalidação, forçamos uma nova requisição
      const forceRevalidation = needsRevalidation;
      
      // Verificar se temos esta pesquisa em cache
      if (isCacheEnabled && !forceRevalidation) {
        const cachedSearch = CacheService.getCache(cacheKey);
        
        if (cachedSearch) {
          console.log(`Usando resultados de pesquisa em cache para "${term}"`);
          
          // Usar os dados do cache
          const result = cachedSearch.data;
          
          // Mapear os resultados
          const mappedData = mapApiDataToServiceData(result);
          
          setServiceData(mappedData);
          setTotalResults(mappedData.length);
          setHasMore(false); // Em pesquisas, geralmente carregamos tudo de uma vez
          
          // Definir a fonte de dados como cache
          setDataSource('cache');
          
          // Verificar se o cache está marcado como "obsoleto" (stale)
          if (cachedSearch.isStale) {
            console.log("Resultados de pesquisa em cache estão obsoletos, atualizando em segundo plano...");
            setTimeout(() => {
              backgroundRefresh(requestParams);
            }, 100);
          }
          
          setLoading(false);
          return;
        }
      }
      
      // Se não tiver cache, continua com a requisição
      const apiUrl = `${API_BASE_URL}/get_services.php?page=1&limit=150&order=${sortOrder}&orderBy=${sortField}&search=${encodeURIComponent(term)}&searchType=${type}&_t=${Date.now()}`;

      const response = await fetch(apiUrl, {
        // Sem headers extras além dos padrão
        // headers: {
        //   'Cache-Control': 'no-cache',
        //   'Pragma': 'no-cache'
        // }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar os dados: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são uma lista válida");
      }
      
      // Mapear os resultados
      const mappedData = mapApiDataToServiceData(result);
      
      // Atualizar dados e estado
      setServiceData(mappedData);
      setTotalResults(mappedData.length);
      setHasMore(false); // Em pesquisas, geralmente carregamos tudo de uma vez
      
      // Definir a fonte de dados como servidor
      setDataSource('server');
      
      // Atualizar o timestamp da última atualização
      setLastRefreshTime(Date.now());
      
      // Limpar flag de necessidade de revalidação
      if (needsRevalidation) {
        setNeedsRevalidation(false);
      }
      
      // Armazenar a pesquisa em cache se o cache estiver ativado
      if (isCacheEnabled) {
        console.log(`Armazenando resultados de pesquisa em cache para "${term}"`);
        CacheService.setCache(cacheKey, result, { requestParams }, CACHE_EXPIRY);
      }
      
    } catch (error) {
      console.error("Erro na pesquisa:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar a pesquisa
  const clearSearch = async () => {
    // Limpar estados de pesquisa
    setSearchTerm("");
    setSearchType("auto");
    setIsSearching(false);
    
    // Resetar paginação
    setPage(1);
    setHasMore(true);
    
    // Limpar dados atuais
    setServiceData([]);
    
    // Iniciar carregamento
    setLoading(true);
    
    try {
      // Verificar se temos dados iniciais em cache
      if (isCacheEnabled) {
        const requestParams = {
          page: 1,
          limit: 150,
          order: sortOrder,
          orderBy: sortField
        };
        
        const cacheKey = generateCacheKey(requestParams);
        const cachedData = CacheService.getCache(cacheKey);
        
        if (cachedData) {
          console.log('Usando dados iniciais do cache após limpar pesquisa');
          
          // Usar os dados do cache
          const result = cachedData.data;
          
          // Mapear e processar os dados
          const mappedData = mapApiDataToServiceData(result);
          
          setServiceData(mappedData);
          setTotalResults(mappedData.length);
          setInitialized(true);
          
          // Definir a fonte de dados como cache
          setDataSource('cache');
          
          // Verificar se o cache está marcado como "obsoleto" (stale)
          if (cachedData.isStale) {
            console.log("Cache está obsoleto, atualizando em segundo plano...");
            setTimeout(() => {
              backgroundRefresh(requestParams);
            }, 100);
          }
          
          setLoading(false);
          return;
        }
      }
      
      // Se não tiver cache, fazer requisição normal
      const apiUrl = `${API_BASE_URL}/get_services.php?page=1&limit=150&order=${sortOrder}&orderBy=${sortField}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar os dados: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são uma lista válida");
      }
      
      // Mapear os resultados
      const mappedData = mapApiDataToServiceData(result);
      
      // Atualizar dados
      setServiceData(mappedData);
      
      // Definir a fonte de dados como servidor
      setDataSource('server');
      
      // Atualizar o timestamp da última atualização
      setLastRefreshTime(Date.now());
      
      // Limpar flag de necessidade de revalidação
      if (needsRevalidation) {
        setNeedsRevalidation(false);
      }
      
      // Armazenar em cache se ativado
      if (isCacheEnabled) {
        const requestParams = {
          page: 1,
          limit: 150,
          order: sortOrder,
          orderBy: sortField
        };
        
        const cacheKey = generateCacheKey(requestParams);
        console.log(`Armazenando dados iniciais em cache após limpar pesquisa`);
        CacheService.setCache(cacheKey, result, { requestParams }, CACHE_EXPIRY);
      }
      
    } catch (error) {
      console.error("Erro ao limpar pesquisa:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para reiniciar a busca quando a ordenação muda
  const resetAndLoad = () => {
    setPage(1);
    setHasMore(true);
    loadServiceData(1, true);
  };

  // Função para limpar os dados de serviço antes de enviar para a API
  const cleanServiceData = (data) => {
    // Cria uma cópia para não modificar o objeto original
    const cleanedData = { ...data };
    
    // Remove os campos que não devem ser enviados ao backend
    // e que estão causando erro de tipo no banco de dados
    delete cleanedData.UnidadeFracionamento;
    delete cleanedData.Unidade_Fracionamento;
    delete cleanedData.Descricao;
    delete cleanedData.UnidadeFracionamentoDescricao;
    delete cleanedData.PrincipioAtivo;
    delete cleanedData.PrincipioAtivoClassificado;
    delete cleanedData.TaxaFinalidade;
    delete cleanedData.tipo_taxa;
    delete cleanedData.tempo_infusao;
    delete cleanedData.ViaAdministracao;
    delete cleanedData.ClasseFarmaceutica;
    delete cleanedData.Armazenamento;
    delete cleanedData.tipo_medicamento;
    delete cleanedData.Fator_Conversão;
    delete cleanedData.tabela;
    delete cleanedData.tabela_classe;
    delete cleanedData.tabela_tipo;
    delete cleanedData.finalidade;
    delete cleanedData.objetivo;
    
    // Converte IDs para números inteiros
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
      if (cleanedData[field] && typeof cleanedData[field] === 'string') {
        cleanedData[field] = parseInt(cleanedData[field], 10);
      }
    });
    
    return cleanedData;
  };

  // Função para adicionar um serviço
  const addService = async (serviceData) => {
    try {
      // Log dos dados originais (para debug)
      console.log("Dados originais:", serviceData);
      
      // Limpar os dados antes de enviar
      const cleanedData = cleanServiceData(serviceData);
      
      // Log dos dados limpos (para debug)
      console.log("Dados limpos para envio:", cleanedData);
      
      // Enviar dados limpos
      const response = await fetch(`${API_BASE_URL}/insert_service.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData)
      });
      
      const responseData = await response.json();
      
      if (responseData && responseData.id) {
        console.log("Serviço criado com sucesso, ID:", responseData.id);
        
        // IMPORTANTE: Marcar cache para revalidação após adição
        // Em vez de invalidar completamente, marcamos para atualização
        CacheService.updateWriteTimestamp(); // Atualiza o timestamp de escrita
        setNeedsRevalidation(true);  // Marca para revalidação
        
        return responseData.id;
      } else {
        console.log("Resposta completa do servidor:", responseData);
        console.log("Resposta não contém um ID válido:", responseData);
        return null;
      }
    } catch (error) {
      console.error("Erro ao adicionar serviço:", error);
      return null;
    }
  };

  // Função para formatar os dados de serviço
  const formatServiceData = (data) => {
    // Cria uma cópia para não modificar o original
    const formatted = { ...data };
    
    // IMPORTANTE: Primeiro, garanta que os IDs estejam definidos corretamente
    // Campos de ID para serem mantidos
    const idFields = [
      'idViaAdministracao', 
      'idClasseFarmaceutica', 
      'idPrincipioAtivo',
      'idArmazenamento', 
      'idMedicamento', 
      'idUnidadeFracionamento',
      'idFatorConversao', 
      'idTaxas',
      'idTabela'
    ];
    
    // Verificação de debug para os campos de ID
    console.log("IDs antes da formatação:", idFields.map(id => ({ [id]: data[id] })));
    
    // Garanta que os IDs sejam números ou null
    idFields.forEach(field => {
      if (formatted[field] === '' || formatted[field] === undefined) {
        formatted[field] = null;
      } else if (typeof formatted[field] === 'string') {
        formatted[field] = parseInt(formatted[field], 10);
      }
      // Verificação adicional para certificar-se que o ID é um número válido
      if (formatted[field] !== null && isNaN(formatted[field])) {
        console.warn(`Campo ${field} tem valor inválido:`, formatted[field]);
        formatted[field] = null;
      }
    });
    
    // IMPORTANTE: Verificar se temos dados de RegistroVisa
    const hasRegistroVisaData = formatted.RegistroVisa && formatted.RegistroVisa.trim() !== '';
    
    // Configurar o idRegistroVisa apenas se não existir e tivermos dados de RegistroVisa
    if (hasRegistroVisaData) {
      // Se temos um valor de RegistroVisa, usamos ele como ID
      formatted.idRegistroVisa = formatted.RegistroVisa;
      
      // IMPORTANTE: NÃO removemos os campos do RegistroVisa, pois eles precisam ser enviados para a API
      // Eles serão inseridos na tabela dregistro_anvisa
    } else {
      // Se não temos dados de RegistroVisa, removemos os campos relacionados
      delete formatted.RegistroVisa;
      delete formatted.Cod_Ggrem;
      delete formatted.Principio_Ativo;
      delete formatted.Lab;
      delete formatted.cnpj_lab;
      delete formatted.Classe_Terapeutica;
      delete formatted.Tipo_Porduto;
      delete formatted.Regime_Preco;
      delete formatted.Restricao_Hosp;
      delete formatted.Cap;
      delete formatted.Confaz87;
      delete formatted.Icms0;
      delete formatted.Lista;
      delete formatted.Status;
    }
    
    // Campos que devem estar na Tabela
    delete formatted.tabela;
    delete formatted.tabela_classe;
    delete formatted.tabela_tipo;
    delete formatted.classe_Jaragua_do_sul;
    delete formatted.classificacao_tipo;
    delete formatted.finalidade;
    delete formatted.objetivo;
    
    // Campos adicionais que podem estar em outras tabelas relacionadas
    // IMPORTANTE: NÃO remova os campos de ID que precisam ser preservados
    delete formatted.ViaAdministracao;
    delete formatted.ClasseFarmaceutica;
    delete formatted.PrincipioAtivo;
    delete formatted.PrincipioAtivoClassificado;
    delete formatted.FaseUGF;
    delete formatted.Armazenamento;
    delete formatted.Medicamento;
    delete formatted.UnidadeFracionamentoDescricao;
    delete formatted.Divisor;
    delete formatted.tipo_taxa;
    delete formatted.TaxaFinalidade;
    delete formatted.tempo_infusao;
    
    // IMPORTANTE: Remover campos que estão causando problemas com o banco de dados
    delete formatted.Via_administracao;
    delete formatted.tipo_medicamento;
    
    // Garantir que campos obrigatórios existam
    formatted.Cod = formatted.Cod || '';
    formatted.Codigo_TUSS = formatted.Codigo_TUSS || '';
    formatted.Descricao_Apresentacao = formatted.Descricao_Apresentacao || '';
    formatted.Revisado_Farma = formatted.Revisado_Farma || 0;
    
    // Limpar campos desnecessários ou temporários
    const fieldsToDelete = [
      'isEditing',
      'isAdding',
      'dropdownOptions'
    ];
    
    fieldsToDelete.forEach(field => {
      if (formatted[field] !== undefined) {
        delete formatted[field];
      }
    });
    
    // VERIFICAÇÃO FINAL: confirme que os IDs ainda estão presentes
    console.log("IDs após formatação:", idFields.map(id => ({ [id]: formatted[id] })));
    console.log("Dados formatados para envio:", formatted);
    
    return formatted;
  };

  // Função para carregar mais dados
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadServiceData(nextPage);
    }
  };

  // Função para atualizar um serviço
  const updateService = async (updatedService) => {
    try {
      // Código para enviar a atualização para a API
      // Após a atualização bem-sucedida na API, também atualize no state local
      setServiceData(prev => 
        prev.map(item => 
          item.id === updatedService.id ? { ...item, ...updatedService } : item
        )
      );
      
      // NOVA LÓGICA: Atualizar seletivamente no cache
      if (isCacheEnabled) {
        // Atualizar no cache usando a função melhorada
        CacheService.updateServiceInAllCaches(updatedService);
        
        // Marcar cache como potencialmente desatualizado
        CacheService.updateWriteTimestamp();
        
        // Não precisamos mais de revalidação total - temos atualização seletiva
        // Mas ainda atualizamos o timestamp para outras instâncias saberem
        console.log("Serviço atualizado no cache");
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      return false;
    }
  };

  // Função para excluir um serviço
  const deleteService = async (serviceId) => {
    try {
      // Código para enviar a exclusão para a API
      
      // Após a exclusão bem-sucedida na API, também atualize no state local
      setServiceData(prev => prev.filter(item => item.id !== serviceId));
      
      // IMPORTANTE: Invalidar o cache existente após exclusão
      if (isCacheEnabled) {
        // Marcar todos os caches como obsoletos
        CacheService.updateWriteTimestamp();
        
        // Marcar para revalidação na próxima oportunidade
        setNeedsRevalidation(true);
        
        console.log("Cache marcado como obsoleto após exclusão do serviço");
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      return false;
    }
  };

  // Marcar o cache para revalidação forçada
  const forceRevalidation = () => {
    setNeedsRevalidation(true);
    console.log("Cache marcado para revalidação forçada");
  };

  // Adicione esta função para alterar a política de atualização automática
  const updateAutoRefreshPolicy = (newPolicy) => {
    setAutoRefreshPolicy(prev => ({
      ...prev,
      ...newPolicy
    }));
  };

  // Atualiza quando a ordenação muda
  useEffect(() => {
    if (initialized) {
      resetAndLoad();
    }
  }, [sortField, sortOrder]);

  // Valores e funções a serem disponibilizados pelo contexto
  const value = {
    serviceData,
    loading,
    error,
    hasMore,
    sortOrder,
    sortField,
    initialized,
    // Valores para cache
    isCacheEnabled,
    toggleCache,
    clearCache,
    totalRecords,
    reloadAllData,
    dataSource,
    forceRevalidation,
    needsRevalidation,
    // Política de atualização automática
    autoRefreshPolicy,
    updateAutoRefreshPolicy,
    shouldRefreshData,
    lastRefreshTime,
    // Valores para pesquisa
    searchTerm,
    searchType,
    isSearching,
    totalResults,
    // Funções existentes
    setSortOrder,
    setSortField,
    changeSort,
    loadMore,
    loadServiceData,
    updateService,
    deleteService,
    addService,
    resetAndLoad,
    // Funções para pesquisa
    searchServiceData,
    clearSearch
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};