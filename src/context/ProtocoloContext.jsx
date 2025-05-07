// src/context/ProtocoloContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import CacheService from '../services/CacheService'; // Add this import

const API_BASE_URL = "https://apiteste.lowcostonco.com.br/backend-php/api/PacientesEmTratamento"; // Sem barra no final

// Cache keys for protocolos
const CACHE_KEYS = {
  PROTOCOLOS_DATA: 'cached_protocolos_data',
  PROTOCOLOS_SERVICOS: 'cached_protocolos_servicos_',  // Prefix for servicos (will append protocolo_id)
  VIAS_ADMINISTRACAO: 'cached_vias_administracao',
  LAST_WRITE_TIMESTAMP: 'protocolos_last_write_timestamp'
};

// Cache expiry times
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes for main data
const SERVICOS_CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour for servicos

// Criar o contexto
const ProtocoloContext = createContext();

// Hook personalizado para usar o contexto
export const useProtocolo = () => useContext(ProtocoloContext);

// Provedor do contexto
export const ProtocoloProvider = ({ children }) => {
  // Estados
  const [protocolos, setProtocolos] = useState([]);
  const [filteredProtocolos, setFilteredProtocolos] = useState([]);
  const [selectedProtocolo, setSelectedProtocolo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cachedProtocolos, setCachedProtocolos] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [protocoloServicos, setProtocoloServicos] = useState([]);
  const [diagnostico, setDiagnostico] = useState(null);
  const [viasAdministracao, setViasAdministracao] = useState([]);
  
  // New cache-related states
  const [isCacheEnabled, setIsCacheEnabled] = useState(true);
  const [dataSource, setDataSource] = useState('');
  const [needsRevalidation, setNeedsRevalidation] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Initialize CacheService
  useEffect(() => {
    if (typeof CacheService !== 'undefined' && CacheService.init) {
      CacheService.init();
    }
  }, []);
  
  // Cache management functions
  const toggleCache = (enabled = true) => {
    setIsCacheEnabled(enabled);
    if (!enabled) {
      // Clear all protocolo related caches
      localStorage.removeItem(CACHE_KEYS.PROTOCOLOS_DATA);
      localStorage.removeItem(CACHE_KEYS.VIAS_ADMINISTRACAO);
      
      // Clear all servicos caches (find keys that start with prefix)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEYS.PROTOCOLOS_SERVICOS)) {
          localStorage.removeItem(key);
        }
      });
    }
  };
  
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEYS.PROTOCOLOS_DATA);
    console.log("Protocolos cache cleared manually");
    setNeedsRevalidation(true);
  };

  // No início do ProtocoloContext.jsx, após as importações
  const UNIDADES_MEDIDA_PREDEFINIDAS = [
    { id: 'Mg', sigla: 'Mg', nome: 'Miligrama' },
    { id: 'Mg2', sigla: 'Mg2', nome: 'Miligrama por m²' },
    { id: 'MgKg', sigla: 'MgKg', nome: 'Miligrama por quilograma' },
    { id: 'AUC', sigla: 'AUC', nome: 'Área sob a curva' }
  ];

// Função para converter intervalo de dias para lista individual
const convertIntervaloDiasParaLista = (diasValue) => {
  // Se não for um intervalo (não contém '-'), retorna como está
  if (!diasValue || !diasValue.includes('-')) {
    return diasValue;
  }
  
  // Se for um intervalo (ex: D5-D10), converter para lista individual
  const [inicio, fim] = diasValue.split('-');
  const inicioNum = parseInt(inicio.replace('D', ''));
  const fimNum = parseInt(fim.replace('D', ''));
  
  // Gerar lista de dias entre início e fim
  const diasIndividuais = [];
  for (let i = inicioNum; i <= fimNum; i++) {
    diasIndividuais.push(`D${i}`);
  }
  
  return diasIndividuais.join(',');
};

  const clearServicosCache = (protocoloId = null) => {
    if (protocoloId) {
      // Clear specific protocolo servicos
      localStorage.removeItem(`${CACHE_KEYS.PROTOCOLOS_SERVICOS}${protocoloId}`);
      console.log(`Servicos cache for protocolo ${protocoloId} cleared`);
    } else {
      // Clear all servicos caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEYS.PROTOCOLOS_SERVICOS)) {
          localStorage.removeItem(key);
        }
      });
      console.log("All servicos caches cleared");
    }
  };
  
  const updateWriteTimestamp = () => {
    localStorage.setItem(CACHE_KEYS.LAST_WRITE_TIMESTAMP, Date.now().toString());
  };
  
  const isCacheStale = (timestamp) => {
    if (!timestamp) return true;
    
    const now = Date.now();
    const lastWriteTime = localStorage.getItem(CACHE_KEYS.LAST_WRITE_TIMESTAMP);
    
    // Consider cache stale if it's older than the expiry time
    if (now - timestamp > CACHE_EXPIRY) return true;
    
    // Consider cache stale if there have been writes since the last fetch
    if (lastWriteTime && parseInt(lastWriteTime) > timestamp) return true;
    
    return false;
  };
  
  const forceRevalidation = () => {
    setNeedsRevalidation(true);
    console.log("Protocolos cache marked for revalidation");
  };
  
  // Cache protocolos data
  const cacheProtocolos = (data) => {
    if (!isCacheEnabled) return;
    
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(CACHE_KEYS.PROTOCOLOS_DATA, JSON.stringify(cacheItem));
      setTotalRecords(data.length);
      console.log(`Cached ${data.length} protocolos successfully`);
    } catch (error) {
      console.error("Error caching protocolos data:", error);
    }
  };
  
  // Cache vias de administracao
  const cacheViasAdministracao = (data) => {
    if (!isCacheEnabled) return;
    
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(CACHE_KEYS.VIAS_ADMINISTRACAO, JSON.stringify(cacheItem));
      console.log(`Cached ${data.length} vias de administração`);
    } catch (error) {
      console.error("Error caching vias de administração:", error);
    }
  };
  
  // Cache servicos for a specific protocolo
  const cacheServicos = (protocoloId, servicosData) => {
    if (!isCacheEnabled || !protocoloId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.PROTOCOLOS_SERVICOS}${protocoloId}`;
      
      const cacheItem = {
        data: servicosData,
        timestamp: Date.now(),
        expiry: Date.now() + SERVICOS_CACHE_EXPIRY
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log(`Cached ${servicosData.length} servicos for protocolo ${protocoloId}`);
    } catch (error) {
      console.error(`Error caching servicos for protocolo ${protocoloId}:`, error);
    }
  };
  
  // Get cached protocolos
  const getCachedProtocolos = () => {
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PROTOCOLOS_DATA);
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(CACHE_KEYS.PROTOCOLOS_DATA);
        return null;
      }
      
      // Check if cache is stale
      const isStale = isCacheStale(cacheData.timestamp);
      if (isStale) {
        console.log("Protocolos cache is stale, will revalidate in background");
        cacheData.isStale = true;
      }
      
      return cacheData;
    } catch (error) {
      console.error("Error retrieving cached protocolos:", error);
      return null;
    }
  };
  
  // Get cached vias de administracao
  const getCachedViasAdministracao = () => {
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.VIAS_ADMINISTRACAO);
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(CACHE_KEYS.VIAS_ADMINISTRACAO);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.error("Error retrieving cached vias de administração:", error);
      return null;
    }
  };
  
  // Get cached servicos for a protocolo
  const getCachedServicos = (protocoloId) => {
    if (!protocoloId) return null;
    
    try {
      const cacheKey = `${CACHE_KEYS.PROTOCOLOS_SERVICOS}${protocoloId}`;
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.error(`Error retrieving cached servicos for protocolo ${protocoloId}:`, error);
      return null;
    }
  };
  
  // Update a protocolo in cache
  const updateProtocoloInCache = (updatedProtocolo) => {
    if (!isCacheEnabled) return;
    
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PROTOCOLOS_DATA);
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Find the protocolo ID to use
      const protocoloId = updatedProtocolo.id_protocolo || updatedProtocolo.id;
      
      // Update the protocolo in the cached data
      cacheData.data = cacheData.data.map(protocolo => {
        const currentId = protocolo.id_protocolo || protocolo.id;
        return currentId === protocoloId ? { ...protocolo, ...updatedProtocolo } : protocolo;
      });
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(CACHE_KEYS.PROTOCOLOS_DATA, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Protocolo #${protocoloId} updated in cache`);
    } catch (error) {
      console.error("Error updating protocolo in cache:", error);
    }
  };
  
  // Remove a protocolo from cache
  const removeProtocoloFromCache = (protocoloId) => {
    if (!isCacheEnabled) return;
    
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PROTOCOLOS_DATA);
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Remove the protocolo from the cached data
      cacheData.data = cacheData.data.filter(protocolo => {
        const currentId = protocolo.id_protocolo || protocolo.id;
        return currentId !== protocoloId;
      });
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(CACHE_KEYS.PROTOCOLOS_DATA, JSON.stringify(cacheData));
      
      // Also remove cached servicos for this protocolo
      clearServicosCache(protocoloId);
      
      updateWriteTimestamp();
      
      console.log(`Protocolo #${protocoloId} removed from cache`);
    } catch (error) {
      console.error("Error removing protocolo from cache:", error);
    }
  };
  
  // Add a protocolo to cache
  const addProtocoloToCache = (newProtocolo) => {
    if (!isCacheEnabled) return;
    
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PROTOCOLOS_DATA);
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Add the new protocolo to the cached data
      cacheData.data = [...cacheData.data, newProtocolo];
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(CACHE_KEYS.PROTOCOLOS_DATA, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Protocolo #${newProtocolo.id || newProtocolo.id_protocolo} added to cache`);
    } catch (error) {
      console.error("Error adding protocolo to cache:", error);
    }
  };
  
  // Update a servico in cache
  const updateServicoInCache = (protocoloId, updatedServico) => {
    if (!isCacheEnabled || !protocoloId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.PROTOCOLOS_SERVICOS}${protocoloId}`;
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Update the servico in the cached data
      cacheData.data = cacheData.data.map(servico => 
        servico.id === updatedServico.id ? { ...servico, ...updatedServico } : servico
      );
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Servico #${updatedServico.id} updated in cache for protocolo ${protocoloId}`);
    } catch (error) {
      console.error(`Error updating servico in cache for protocolo ${protocoloId}:`, error);
    }
  };
  
  // Remove a servico from cache
  const removeServicoFromCache = (protocoloId, servicoId) => {
    if (!isCacheEnabled || !protocoloId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.PROTOCOLOS_SERVICOS}${protocoloId}`;
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Remove the servico from the cached data
      cacheData.data = cacheData.data.filter(servico => servico.id !== servicoId);
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Servico #${servicoId} removed from cache for protocolo ${protocoloId}`);
    } catch (error) {
      console.error(`Error removing servico from cache for protocolo ${protocoloId}:`, error);
    }
  };
  
  // Add a servico to cache
  const addServicoToCache = (protocoloId, newServico) => {
    if (!isCacheEnabled || !protocoloId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.PROTOCOLOS_SERVICOS}${protocoloId}`;
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Add the new servico to the cached data
      cacheData.data = [...cacheData.data, newServico];
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Servico #${newServico.id} added to cache for protocolo ${protocoloId}`);
    } catch (error) {
      console.error(`Error adding servico to cache for protocolo ${protocoloId}:`, error);
    }
  };
  
  // Function to refresh data after modification
  const refreshDataAfterModification = async () => {
    try {
      // Mark cache for revalidation
      forceRevalidation();
      
      // Reload data
      await loadProtocolos(true);
      
      return true;
    } catch (error) {
      console.error("Error refreshing data after modification:", error);
      return false;
    }
  };

  // Função para executar diagnóstico (unchanged)
  const runDiagnostic = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/diagnostico.php`);
      console.log("Diagnóstico completo:", response.data);
      setDiagnostico(response.data);
      return response.data;
    } catch (err) {
      console.error("Erro ao executar diagnóstico:", err);
      return null;
    }
  }, []);

  // No ProtocoloContext.jsx, modifique esta função
  const loadProtocoloServicos = useCallback(async (protocoloId) => {
    if (!protocoloId) {
      console.error("ID do protocolo não fornecido");
      return [];
    }

    try {
      setLoading(true);
      console.log(`Carregando serviços para protocolo ID: ${protocoloId}`);
      
      // Garantir que o ID seja um número
      const idProtocolo = parseInt(protocoloId);
      
      // Verificar o formato exato da URL no console
      const url = `${API_BASE_URL}/get_servicos_protocolo.php?id_protocolo=${idProtocolo}`;
      console.log("URL de requisição:", url);
      
      const response = await axios.get(url);
      const data = response.data;
      
      console.log(`Serviços carregados para protocolo ${idProtocolo}:`, data);
      setProtocoloServicos(data);
      return data;
    } catch (err) {
      console.error("Erro ao carregar serviços do protocolo:", err);
      console.error("Detalhes:", err.response?.data || err.message);
      setProtocoloServicos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced loadProtocolos function with caching
  const loadProtocolos = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
  
    try {
      // Check if we can use cached data
      if (isCacheEnabled && !forceRefresh && !needsRevalidation) {
        const cachedData = getCachedProtocolos();
        
        if (cachedData) {
          console.log("Using cached protocolos data");
          
          setProtocolos(cachedData.data);
          setFilteredProtocolos(cachedData.data);
          setCachedProtocolos(cachedData.data);
          setLastFetch(cachedData.timestamp);
          setDataSource('cache');
          setTotalRecords(cachedData.data.length);
          
          // If cache is stale, update in background
          if (cachedData.isStale) {
            console.log("Protocolos cache is stale, updating in background");
            
            // Set a timeout to allow the UI to update first
            setTimeout(() => {
              loadProtocolos(true);
            }, 100);
          }
          
          setLoading(false);
          return cachedData.data;
        }
      }
  
      // Load from server if no valid cache or force refresh
      console.log("Loading protocolos from server");
      const response = await axios.get(`${API_BASE_URL}/get_protocolos.php`);
      const data = response.data;
      
      // Update states
      setProtocolos(data);
      setFilteredProtocolos(data);
      setCachedProtocolos(data);
      setLastFetch(Date.now());
      setDataSource('server');
      setNeedsRevalidation(false);
      setTotalRecords(data.length);
      
      // Cache the data
      if (isCacheEnabled) {
        cacheProtocolos(data);
      }
      
      return data;
    } catch (err) {
      console.error("Erro ao carregar protocolos:", err);
      setError(err.message || 'Erro ao carregar protocolos');
      
      // Execute diagnostic when errors occur
      await runDiagnostic();
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [isCacheEnabled, needsRevalidation, runDiagnostic]);

  // Load vias de administracao with caching
  const loadViasAdministracao = useCallback(async () => {
    try {
      // Check cache first
      if (isCacheEnabled) {
        const cachedVias = getCachedViasAdministracao();
        
        if (cachedVias) {
          console.log("Using cached vias de administração");
          setViasAdministracao(cachedVias);
          return cachedVias;
        }
      }
      
      // Load from server if no valid cache
      console.log("Loading vias de administração from server");
      const response = await fetch(`${API_BASE_URL}/get_vias_administracao.php`);
      
      if (!response.ok) {
        throw new Error(`Error loading vias de administração: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      if (isCacheEnabled) {
        cacheViasAdministracao(data);
      }
      
      setViasAdministracao(data);
      return data;
    } catch (error) {
      console.error("Error loading vias de administração:", error);
      return [];
    }
  }, [isCacheEnabled]);

  const loadProtocoloDetails = useCallback(async (protocoloId) => {
    if (!protocoloId) return null;
    
    try {
      console.log(`Carregando detalhes do protocolo ${protocoloId}`);
      
      // Carregar serviços para este protocolo
      const servicos = await loadProtocoloServicos(protocoloId);
      console.log(`Serviços carregados:`, servicos);
      
      // Buscar protocolo do estado atual
      const existingProtocolo = protocolos.find(p => {
        const id = p.id_protocolo || p.id;
        return parseInt(id) === parseInt(protocoloId);
      });
      
      if (existingProtocolo) {
        // Adicionar serviços como medicamentos ao protocolo
        const protocoloCompleto = {
          ...existingProtocolo,
          medicamentos: servicos
        };
        
        setSelectedProtocolo(protocoloCompleto);
        return protocoloCompleto;
      }
      
      // Se não estiver no estado, buscar da API
      const response = await axios.get(`${API_BASE_URL}/get_protocolo_by_id.php?id=${protocoloId}`);
      
      // Adicionar serviços como medicamentos
      const protocoloDetails = {
        ...response.data,
        medicamentos: servicos
      };
      
      // Atualizar estado
      setSelectedProtocolo(protocoloDetails);
      return protocoloDetails;
    } catch (err) {
      console.error("Erro ao carregar detalhes do protocolo:", err);
      return null;
    }
  }, [protocolos, loadProtocoloServicos]);

  // Enhanced selectProtocolo with caching
  const selectProtocolo = useCallback((protocoloId) => {
    if (!protocoloId) {
      setSelectedProtocolo(null);
      return Promise.resolve(null);
    }

    // Find the protocolo in our state
    const protocoloCache = protocolos.find(p => {
      const currentId = p.id_protocolo || p.id;
      return currentId === protocoloId;
    });
    
    // Update the selected protocolo
    setSelectedProtocolo(protocoloCache || null);
    
    // Return a promise that resolves to the protocolo
    return Promise.resolve(protocoloCache || null);
  }, [protocolos]);

  // Enhanced searchProtocolos with caching
  const searchProtocolos = useCallback((term, type = 'nome') => {
    setSearchTerm(term);
    
    if (!term || term.trim() === '') {
      setFilteredProtocolos(protocolos);
      return Promise.resolve(protocolos);
    }

    // Generate a cache key for this search
    const searchCacheKey = `protocolos_search_${type}_${term.toLowerCase()}`;
    
    // Check if we have this search in cache
    if (isCacheEnabled) {
      try {
        const cachedSearch = localStorage.getItem(searchCacheKey);
        
        if (cachedSearch) {
          const searchData = JSON.parse(cachedSearch);
          
          // Check if cache is expired
          if (Date.now() < searchData.expiry) {
            console.log(`Using cached search results for "${term}"`);
            setFilteredProtocolos(searchData.results);
            return Promise.resolve(searchData.results);
          } else {
            // Remove expired cache
            localStorage.removeItem(searchCacheKey);
          }
        }
      } catch (error) {
        console.error("Error retrieving cached search:", error);
      }
    }

    // Normalizar o termo de pesquisa
    const normalizedTerm = term.toLowerCase().trim();
    
    // Filtrar protocolos baseado no tipo de pesquisa
    let filtered;
    switch(type) {
      case 'nome':
        filtered = protocolos.filter(p => 
          p.Protocolo_Nome && p.Protocolo_Nome.toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'sigla':
        filtered = protocolos.filter(p => 
          p.Protocolo_Sigla && p.Protocolo_Sigla.toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'cid':
        filtered = protocolos.filter(p => 
          p.CID && p.CID.toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'principioativo':
        filtered = protocolos.filter(p => 
          p.PrincipioAtivo && p.PrincipioAtivo.toLowerCase().includes(normalizedTerm)
        );
        break;
      default:
        // Default para pesquisa por nome
        filtered = protocolos.filter(p => 
          p.Protocolo_Nome && p.Protocolo_Nome.toLowerCase().includes(normalizedTerm)
        );
    }
    
    // Cache the search results
    if (isCacheEnabled) {
      try {
        const searchData = {
          results: filtered,
          expiry: Date.now() + (5 * 60 * 1000) // 5 minutes expiry for search results
        };
        
        localStorage.setItem(searchCacheKey, JSON.stringify(searchData));
      } catch (error) {
        console.error("Error caching search results:", error);
      }
    }
    
    setFilteredProtocolos(filtered);
    return Promise.resolve(filtered);
  }, [protocolos, isCacheEnabled]);

  // Function for API search (unchanged)
  const searchProtocolosApi = useCallback(async (term) => {
    setLoading(true);
    setSearchTerm(term);

    try {
      let url = `${API_BASE_URL}/get_protocolos.php`;
      if (term && term.trim() !== '') {
        url += `?search=${encodeURIComponent(term.trim())}`;
      }

      const response = await axios.get(url);
      const data = response.data;

      setProtocolos(data);
      setFilteredProtocolos(data);
      return data;
    } catch (err) {
      console.error("Erro ao pesquisar protocolos:", err);
      setError(err.message || 'Erro ao pesquisar protocolos');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced addProtocolo with cache update
  const addProtocolo = useCallback(async (protocoloData) => {
    try {
      setLoading(true);
      
      // Extrair medicamentos antes de enviar o protocolo
      // Filtrar apenas medicamentos com nome não vazio
      const medicamentos = protocoloData.medicamentos ? 
        [...protocoloData.medicamentos].filter(med => med.nome && med.nome.trim() !== '') : 
        [];
      
      const protocoloSemMedicamentos = { ...protocoloData };
      delete protocoloSemMedicamentos.medicamentos;
      
      // 1. Primeiro, criar apenas o protocolo
      console.log("Enviando protocolo:", protocoloSemMedicamentos);
      const response = await axios.post(`${API_BASE_URL}/add_protocolo.php`, protocoloSemMedicamentos);
      const novoProtocolo = response.data;
      console.log("Protocolo criado com sucesso:", novoProtocolo);
      
      // 2. Adicionar cada medicamento usando add_servico_protocolo.php (apenas se houver medicamentos)
      const medicamentosAdicionados = [];
      
      if (medicamentos.length > 0) {
        console.log(`Adicionando ${medicamentos.length} medicamentos ao protocolo ${novoProtocolo.id}`);
        
        for (const med of medicamentos) {
          try {
            console.log(`Processando medicamento ${med.nome} para o protocolo ${novoProtocolo.id}`);
            
            // Processar dias de administração
            let diasProcessados = med.dias_adm || '';
            if (diasProcessados.includes('-')) {
              const [inicio, fim] = diasProcessados.split('-');
              const inicioNum = parseInt(inicio.replace('D', ''));
              const fimNum = parseInt(fim.replace('D', ''));
              
              const diasIndividuais = [];
              for (let i = inicioNum; i <= fimNum; i++) {
                diasIndividuais.push(`D${i}`);
              }
              
              diasProcessados = diasIndividuais.join(',');
            }
            
            // Mapear campos do medicamento para o formato esperado
            const servicoData = {
              id_servico: 1, // Valor padrão
              nome: med.nome,
              dose: med.dose || '',
              unidade_medida: med.unidade_medida || '', // Enviar diretamente a sigla
              via_administracao: med.via_adm || '',
              dias_aplicacao: diasProcessados,
              frequencia: med.frequencia || '',
              observacoes: ''
            };
            
            // Chamar endpoint add_servico_protocolo.php com ID do protocolo na URL
            const medResponse = await axios.post(
              `${API_BASE_URL}/add_servico_protocolo.php?id_protocolo=${novoProtocolo.id}`, 
              servicoData
            );
            
            console.log("Medicamento adicionado:", medResponse.data);
            medicamentosAdicionados.push(medResponse.data);
          } catch (medError) {
            console.error(`Erro ao adicionar medicamento ${med.nome}:`, medError);
          }
        }
        
        console.log(`${medicamentosAdicionados.length} medicamentos adicionados com sucesso`);
      } else {
        console.log("Protocolo criado sem medicamentos");
      }
      
      // 3. Atualizar estados e cache
      const protocoloCompleto = {
        ...novoProtocolo,
        medicamentos: medicamentosAdicionados
      };
      
      setProtocolos(prev => [...prev, protocoloCompleto]);
      setFilteredProtocolos(prev => [...prev, protocoloCompleto]);
      
      // Atualizar cache
      addProtocoloToCache(protocoloCompleto);
      
      return novoProtocolo.id;
    } catch (err) {
      console.error("Erro ao adicionar protocolo:", err);
      throw new Error(err.response?.data?.message || err.message || 'Erro ao adicionar protocolo');
    } finally {
      setLoading(false);
    }
  });

  // Enhanced updateProtocolo with cache update
  const updateProtocolo = useCallback(async (id, protocoloData) => {
    try {
      setLoading(true);
      
      // Log for debugging
      console.log("Atualizando protocolo ID:", id);
      console.log("Dados para atualização:", protocoloData);
      
      // Use id_protocolo instead of id in URL
      const response = await axios.put(`${API_BASE_URL}/update_protocolo.php?id_protocolo=${id}`, protocoloData);
      const updatedProtocolo = response.data.data || response.data;
      
      // Update local state
      setProtocolos(prev => 
        prev.map(p => {
          const currentId = p.id_protocolo || p.id;
          return currentId === id ? { ...p, ...updatedProtocolo } : p;
        })
      );
      
      setFilteredProtocolos(prev => 
        prev.map(p => {
          const currentId = p.id_protocolo || p.id;
          return currentId === id ? { ...p, ...updatedProtocolo } : p;
        })
      );
      
      // Update selected protocolo if it's the same
      if (selectedProtocolo && (selectedProtocolo.id === id || selectedProtocolo.id_protocolo === id)) {
        setSelectedProtocolo({ ...selectedProtocolo, ...updatedProtocolo });
      }
      
      // Update cache
      updateProtocoloInCache({ ...updatedProtocolo, id });
      
      return updatedProtocolo;
    } catch (err) {
      console.error("Erro ao atualizar protocolo:", err);
      throw new Error(err.response?.data?.error || err.message || 'Erro ao atualizar protocolo');
    } finally {
      setLoading(false);
    }
  }, [selectedProtocolo]);

  // Enhanced deleteProtocolo with cache update
  const deleteProtocolo = useCallback(async (id) => {
    try {
      setLoading(true);
      
      // Check ID format
      console.log("Trying to delete protocolo with ID:", id);
      
      // Find the protocolo to delete
      const protocoloToDelete = protocolos.find(p => 
        p.id === id || p.id_protocolo === id
      );
      
      if (!protocoloToDelete) {
        console.error("Protocolo not found in local state with ID:", id);
      } else {
        console.log("Protocolo to delete:", protocoloToDelete);
      }
      
      // Ensure we're using the correct ID for the API
      const idToUse = protocoloToDelete?.id_protocolo || id;
      
      // Make API request
      console.log(`Sending DELETE to ${API_BASE_URL}/delete_protocolo.php?id=${idToUse}`);
      await axios.delete(`${API_BASE_URL}/delete_protocolo.php?id=${idToUse}`);
      
      // Update local state
      setProtocolos(prev => prev.filter(p => p.id !== id && p.id_protocolo !== id));
      setFilteredProtocolos(prev => prev.filter(p => p.id !== id && p.id_protocolo !== id));
      
      // Clear selection if it's the same protocolo
      if (selectedProtocolo && (selectedProtocolo.id === id || selectedProtocolo.id_protocolo === id)) {
        setSelectedProtocolo(null);
      }
      
      // Update cache
      removeProtocoloFromCache(id);
      
      return true;
    } catch (err) {
      console.error("Erro ao excluir protocolo:", err);
      console.error("Response details:", err.response?.data);
      throw new Error(err.response?.data?.error || err.message || 'Erro ao excluir protocolo');
    } finally {
      setLoading(false);
    }
  }, [selectedProtocolo, protocolos]);

  const addServicoToProtocolo = useCallback(async (protocoloId, servicoData) => {
    try {
      setLoading(true);
      
      // Log details of the data being sent
      console.log("Adding service to protocolo:", protocoloId);
      console.log("Service data:", JSON.stringify(servicoData, null, 2));
      
      // Converter unidade_medida de sigla para ID, se necessário
      let diasProcessados = servicoData.dias_aplicacao || servicoData.dias_adm || '';
      if (diasProcessados.includes('-')) {
        const [inicio, fim] = diasProcessados.split('-');
        const inicioNum = parseInt(inicio.replace('D', ''));
        const fimNum = parseInt(fim.replace('D', ''));
        
        const diasIndividuais = [];
        for (let i = inicioNum; i <= fimNum; i++) {
          diasIndividuais.push(`D${i}`);
        }
        
        diasProcessados = diasIndividuais.join(',');
      }

      // Mapear corretamente todos os campos
      const dataToSend = {
        id_servico: 1, // Valor padrão
        nome: servicoData.nome || '',
        dose: servicoData.dose || null,
        unidade_medida: servicoData.unidade_medida || '', // Enviar diretamente a sigla
        via_administracao: servicoData.via_administracao || servicoData.via_adm || null,
        dias_aplicacao: diasProcessados,
        frequencia: servicoData.frequencia || null,
        observacoes: servicoData.observacoes || ''
      };
      
      console.log("Dados para envio:", dataToSend);
      
      // Call API with properly mapped data
      const response = await axios.post(
        `${API_BASE_URL}/add_servico_protocolo.php?id_protocolo=${protocoloId}`, 
        dataToSend
      );
      
      console.log("Service added successfully:", response.data);
      
      // Reload servicos to get updated data
      const updatedServicos = await loadProtocoloServicos(protocoloId);
      
      // Update cache with the new servico
      if (response.data && response.data.id) {
        addServicoToCache(protocoloId, {
          ...dataToSend,
          id: response.data.id
        });
      }
      
      return response.data;
    } catch (err) {
      console.error("Error adding service to protocolo:", err);
      console.error("Error details:", err.response?.data || "No additional details");
      throw new Error(err.message || 'Erro ao adicionar serviço ao protocolo');
    } finally {
      setLoading(false);
    }
  }, [loadProtocoloServicos]);

  // Enhanced updateServicoProtocolo with cache update
  const updateServicoProtocolo = useCallback(async (protocoloId, servicoId, servicoData) => {
    try {
      setLoading(true);
      
      // Log detalhado para debugging
      console.log("Atualizando serviço:");
      console.log("- ID do protocolo:", protocoloId);
      console.log("- ID do serviço:", servicoId);
      console.log("- Dados:", JSON.stringify(servicoData, null, 2));
      
      let diasProcessados = servicoData.dias_aplicacao || servicoData.dias_adm || '';
      if (diasProcessados.includes('-')) {
        const [inicio, fim] = diasProcessados.split('-');
        const inicioNum = parseInt(inicio.replace('D', ''));
        const fimNum = parseInt(fim.replace('D', ''));
        
        const diasIndividuais = [];
        for (let i = inicioNum; i <= fimNum; i++) {
          diasIndividuais.push(`D${i}`);
        }
        
        diasProcessados = diasIndividuais.join(',');
      }

      // Mapear corretamente os campos (similar ao addServicoToProtocolo)
      const dataToSend = {
        nome: servicoData.nome || '',
        dose: servicoData.dose || null,
        unidade_medida: servicoData.unidade_medida || '', // Enviar diretamente a sigla
        via_administracao: servicoData.via_administracao || servicoData.via_adm || null,
        dias_aplicacao: diasProcessados,
        frequencia: servicoData.frequencia || null,
        observacoes: servicoData.observacoes || ''
      };
      
      console.log("Dados formatados para envio:", dataToSend);
      
      // URL correta para a requisição
      const url = `${API_BASE_URL}/update_servico_protocolo.php?id_protocolo=${protocoloId}&id=${servicoId}`;
      console.log("URL da requisição:", url);
      
      // Fazer a requisição PUT com os dados mapeados
      const response = await axios.put(url, dataToSend);
      
      console.log("Resposta do servidor:", response.data);
      
      // Atualizar o estado local dos serviços
      setProtocoloServicos(prev => 
        prev.map(s => s.id == servicoId ? { ...s, ...dataToSend } : s)
      );
      
      // Atualizar cache
      updateServicoInCache(protocoloId, {
        ...dataToSend,
        id: servicoId
      });
      
      return response.data;
    } catch (err) {
      console.error("Erro ao atualizar serviço:", err);
      console.error("Detalhes do erro:", err.response?.data);
      throw new Error(err.message || 'Erro ao atualizar serviço do protocolo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced deleteServicoFromProtocolo with cache update
  const deleteServicoFromProtocolo = useCallback(async (protocoloId, servicoId) => {
    try {
      setLoading(true);
      
      // Make API request
      await axios.delete(`${API_BASE_URL}/delete_servico_protocolo.php?id_protocolo=${protocoloId}&id_servico=${servicoId}`);
      
      // Update local state
      setProtocoloServicos(prev => prev.filter(s => s.id_servico !== servicoId && s.id !== servicoId));
      
      // Update cache
      removeServicoFromCache(protocoloId, servicoId);
      
      return true;
    } catch (err) {
      console.error("Error deleting service from protocolo:", err);
      throw new Error(err.response?.data?.message || err.message || 'Erro ao excluir serviço do protocolo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload all data (for cache management)
  const reloadAllData = async () => {
    await loadProtocolos(true);
    await loadViasAdministracao();
    return true;
  };

  // Load protocols on initialization
  useEffect(() => {
    loadProtocolos();
    loadViasAdministracao();
  }, [loadProtocolos, loadViasAdministracao]);

  // Context value with all the functions and states
  const contextValue = {
    // States
    protocolos,
    filteredProtocolos,
    selectedProtocolo,
    loading,
    error,
    searchTerm,
    protocoloServicos,
    diagnostico,
    viasAdministracao,
    
    // Cache states
    isCacheEnabled,
    dataSource,
    totalRecords,
    
    // Core functions
    selectProtocolo,
    loadProtocolos,
    loadProtocoloDetails,
    searchProtocolos,
    searchProtocolosApi,
    addProtocolo,
    updateProtocolo,
    deleteProtocolo,
    loadProtocoloServicos,
    
    // Servicos functions
    addServicoToProtocolo,
    deleteServicoFromProtocolo,
    updateServicoProtocolo,
    
    // Cache management
    toggleCache,
    clearCache,
    forceRevalidation,
    reloadAllData,
    refreshDataAfterModification,
    
    // Diagnostic
    runDiagnostic
  };

  return (
    <ProtocoloContext.Provider value={contextValue}>
      {children}
    </ProtocoloContext.Provider>
  );
};

export default ProtocoloContext;