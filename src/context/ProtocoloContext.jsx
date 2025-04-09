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

  // Enhanced loadProtocoloServicos function with caching
  const loadProtocoloServicos = useCallback(async (protocoloId) => {
    if (!protocoloId) return [];

    try {
      setLoading(true);
      
      // Try to get cached servicos first
      if (isCacheEnabled) {
        const cachedServicos = getCachedServicos(protocoloId);
        
        if (cachedServicos) {
          console.log(`Using cached servicos for protocolo ${protocoloId}`);
          setProtocoloServicos(cachedServicos);
          setLoading(false);
          return cachedServicos;
        }
      }
      
      // If no cache, load from server
      console.log(`Loading servicos for protocolo ${protocoloId} from server`);
      const response = await axios.get(`${API_BASE_URL}/get_servicos_protocolo.php?id_protocolo=${protocoloId}`);
      const data = response.data;
      
      // Cache the servicos
      if (isCacheEnabled) {
        cacheServicos(protocoloId, data);
      }
      
      setProtocoloServicos(data);
      return data;
    } catch (err) {
      console.error("Erro ao carregar serviços do protocolo:", err);
      setProtocoloServicos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isCacheEnabled]);

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

  // Enhanced loadProtocoloDetails with caching
  const loadProtocoloDetails = useCallback(async (protocoloId) => {
    if (!protocoloId) return null;
    
    try {
      // Load the servicos for this protocolo
      await loadProtocoloServicos(protocoloId);
      
      // Check if the protocolo is already in our state
      const existingProtocolo = protocolos.find(p => {
        const currentId = p.id_protocolo || p.id;
        return currentId === protocoloId;
      });
      
      if (existingProtocolo) {
        // Use the existing protocolo data
        setSelectedProtocolo(existingProtocolo);
        return existingProtocolo;
      }
      
      // If not in state, load from server
      console.log(`Loading protocolo details for ID ${protocoloId} from server`);
      const response = await axios.get(`${API_BASE_URL}/get_protocolo_by_id.php?id=${protocoloId}`);
      const protocoloDetails = response.data;
      
      // Update the selected protocolo
      setSelectedProtocolo(protocoloDetails);
      
      // Also add to the state if not already there
      setProtocolos(prev => {
        const exists = prev.some(p => {
          const currentId = p.id_protocolo || p.id;
          return currentId === protocoloId;
        });
        
        if (!exists) {
          return [...prev, protocoloDetails];
        }
        
        return prev;
      });
      
      return protocoloDetails;
    } catch (err) {
      console.error("Erro ao carregar detalhes do protocolo:", err);
      setError(err.message || 'Erro ao carregar detalhes do protocolo');
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
      
      // Send to server
      const response = await axios.post(`${API_BASE_URL}/add_protocolo.php`, protocoloData);
      const newProtocolo = response.data;
      
      // Update local state
      setProtocolos(prev => [...prev, newProtocolo]);
      setFilteredProtocolos(prev => [...prev, newProtocolo]);
      
      // Update cache
      addProtocoloToCache(newProtocolo);
      
      return newProtocolo.id;
    } catch (err) {
      console.error("Erro ao adicionar protocolo:", err);
      throw new Error(err.response?.data?.message || err.message || 'Erro ao adicionar protocolo');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Enhanced addServicoToProtocolo with cache update
  const addServicoToProtocolo = useCallback(async (protocoloId, servicoData) => {
    try {
      setLoading(true);
      
      // Log details of the data being sent
      console.log("Adding service to protocolo:", protocoloId);
      console.log("Service data:", JSON.stringify(servicoData, null, 2));
      
      // Clean data to ensure all required fields are present
      const cleanedData = {
        id_servico: servicoData.id_servico || 1,
        Servico_Codigo: servicoData.Servico_Codigo || "",
        Dose: servicoData.Dose || "",
        Dose_M: servicoData.Dose_M || "",
        Dose_Total: servicoData.Dose_Total || "",
        Dias_de_Aplic: servicoData.Dias_de_Aplic || "",
        Via_de_Adm: servicoData.Via_de_Adm || "",
        observacoes: servicoData.observacoes || ""
      };
      
      console.log("Cleaned data:", JSON.stringify(cleanedData, null, 2));
      
      // Call API with cleaned data
      const response = await axios.post(
        `${API_BASE_URL}/add_servico_protocolo.php?id_protocolo=${protocoloId}`, 
        cleanedData
      );
      
      console.log("Service added successfully:", response.data);
      
      // Reload servicos to get updated data
      const updatedServicos = await loadProtocoloServicos(protocoloId);
      
      // Update cache with the new servico
      if (response.data && response.data.id) {
        addServicoToCache(protocoloId, {
          ...cleanedData,
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
      
      // Log details
      console.log("Updating service in protocolo:", protocoloId);
      console.log("Service ID:", servicoId);
      console.log("Service data:", JSON.stringify(servicoData, null, 2));
      
      // Prepare data for submission
      const dataToSend = {
        ...servicoData,
        id: servicoId,
        id_protocolo: protocoloId
      };
      
      // Call API to update the service
      const response = await axios.put(
        `${API_BASE_URL}/update_servico_protocolo.php?id_protocolo=${protocoloId}&id=${servicoId}`, 
        dataToSend
      );
      
      console.log("Service updated successfully:", response.data);
      
      // Update the local state of services
      setProtocoloServicos(prev => 
        prev.map(s => s.id == servicoId ? { ...s, ...servicoData } : s)
      );
      
      // Update cache
      updateServicoInCache(protocoloId, {
        ...servicoData,
        id: servicoId
      });
      
      return response.data;
    } catch (err) {
      console.error("Error updating service in protocolo:", err);
      console.error("Error details:", err.response?.data || "No additional details");
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