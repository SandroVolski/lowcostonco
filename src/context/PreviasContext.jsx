// src/context/PreviasContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import CacheService from '../services/CacheService';

// API base URL
const API_URL = "https://api.lowcostonco.com.br/backend-php/api/Previas"; //AQUI MUDAR

// Cache keys for previas
const CACHE_KEYS = {
  PREVIAS_DATA: 'cached_previas_data',
  PREVIAS_BY_PATIENT: 'cached_previas_by_patient_',
  PREVIA_DETAILS: 'cached_previa_details_',
  CICLOS_DIAS: 'cached_ciclos_dias_',
  ANEXOS: 'cached_anexos_',
  LAST_WRITE_TIMESTAMP: 'previas_last_write_timestamp'
};

// Cache expiry in ms (30 minutes)
const CACHE_EXPIRY = 30 * 60 * 1000;

// Creating the context
const PreviasContext = createContext();

// Custom hook to use the context
export const usePrevias = () => {
  const context = useContext(PreviasContext);
  if (context === undefined) {
    throw new Error('usePrevias must be used within a PreviasProvider');
  }
  return context;
};

// Provider component
export const PreviasProvider = ({ children }) => {
  const { toast } = useToast();
  const [previas, setPrevias] = useState([]);
  const [selectedPrevia, setSelectedPrevia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // New cache-related states
  const [isCacheEnabled, setIsCacheEnabled] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const [needsRevalidation, setNeedsRevalidation] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Initialize CacheService
  useEffect(() => {
    if (typeof CacheService !== 'undefined' && CacheService.init) {
      CacheService.init();
    }
  }, []);
  
  // Functions to display alerts
  const showSuccessAlert = (message) => {
    toast({
      title: "Sucesso",
      description: message,
      variant: "success"
    });
  };

  const showErrorAlert = (title, message) => {
    toast({
      title,
      description: message,
      variant: "destructive"
    });
  };
  
  // Cache management functions
  const toggleCache = (enabled = true) => {
    setIsCacheEnabled(enabled);
    if (!enabled) {
      // Clear all prévias related caches
      localStorage.removeItem(CACHE_KEYS.PREVIAS_DATA);
      
      // Clear patient-specific caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEYS.PREVIAS_BY_PATIENT) || 
            key.startsWith(CACHE_KEYS.PREVIA_DETAILS) ||
            key.startsWith(CACHE_KEYS.CICLOS_DIAS) ||
            key.startsWith(CACHE_KEYS.ANEXOS)) {
          localStorage.removeItem(key);
        }
      });
    }
  };
  
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEYS.PREVIAS_DATA);
    console.log("Prévias cache cleared manually");
    setNeedsRevalidation(true);
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
    console.log("Prévias cache marked for revalidation");
  };
  
  // Cache data functions
  const cachePrevias = (data) => {
    if (!isCacheEnabled) return;
    
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(CACHE_KEYS.PREVIAS_DATA, JSON.stringify(cacheItem));
      setTotalRecords(data.length);
      console.log(`Cached ${data.length} prévias successfully`);
    } catch (error) {
      console.error("Error caching prévias data:", error);
    }
  };
  
  const cachePreviasByPatient = (patientId, data) => {
    if (!isCacheEnabled || !patientId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.PREVIAS_BY_PATIENT}${patientId}`;
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log(`Cached ${data.length} prévias for patient ${patientId}`);
    } catch (error) {
      console.error(`Error caching prévias for patient ${patientId}:`, error);
    }
  };
  
  const cachePreviaDetails = (previaId, data) => {
    if (!isCacheEnabled || !previaId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.PREVIA_DETAILS}${previaId}`;
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log(`Cached details for prévia ${previaId}`);
    } catch (error) {
      console.error(`Error caching details for prévia ${previaId}:`, error);
    }
  };
  
  const cacheCiclosDias = (previaId, data) => {
    if (!isCacheEnabled || !previaId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.CICLOS_DIAS}${previaId}`;
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log(`Cached ciclos/dias for prévia ${previaId}`);
    } catch (error) {
      console.error(`Error caching ciclos/dias for prévia ${previaId}:`, error);
    }
  };
  
  const cacheAnexos = (previaId, data) => {
    if (!isCacheEnabled || !previaId) return;
    
    try {
      const cacheKey = `${CACHE_KEYS.ANEXOS}${previaId}`;
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log(`Cached anexos for prévia ${previaId}`);
    } catch (error) {
      console.error(`Error caching anexos for prévia ${previaId}:`, error);
    }
  };
  
  // Get data from cache
  const getCachedPrevias = () => {
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PREVIAS_DATA);
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(CACHE_KEYS.PREVIAS_DATA);
        return null;
      }
      
      // Check if cache is stale
      const isStale = isCacheStale(cacheData.timestamp);
      if (isStale) {
        console.log("Prévias cache is stale, will revalidate in background");
        cacheData.isStale = true;
      }
      
      return cacheData;
    } catch (error) {
      console.error("Error retrieving cached prévias:", error);
      return null;
    }
  };
  
  const getCachedPreviasByPatient = (patientId) => {
    if (!patientId) return null;
    
    try {
      const cacheKey = `${CACHE_KEYS.PREVIAS_BY_PATIENT}${patientId}`;
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      // Check if cache is stale
      const isStale = isCacheStale(cacheData.timestamp);
      if (isStale) {
        console.log(`Prévias cache for patient ${patientId} is stale, will revalidate`);
        cacheData.isStale = true;
      }
      
      return cacheData;
    } catch (error) {
      console.error(`Error retrieving cached prévias for patient ${patientId}:`, error);
      return null;
    }
  };
  
  const getCachedPreviaDetails = (previaId) => {
    if (!previaId) return null;
    
    try {
      const cacheKey = `${CACHE_KEYS.PREVIA_DETAILS}${previaId}`;
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
      console.error(`Error retrieving cached details for prévia ${previaId}:`, error);
      return null;
    }
  };
  
  const getCachedCiclosDias = (previaId) => {
    if (!previaId) return null;
    
    try {
      const cacheKey = `${CACHE_KEYS.CICLOS_DIAS}${previaId}`;
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
      console.error(`Error retrieving cached ciclos/dias for prévia ${previaId}:`, error);
      return null;
    }
  };
  
  const getCachedAnexos = (previaId) => {
    if (!previaId) return null;
    
    try {
      const cacheKey = `${CACHE_KEYS.ANEXOS}${previaId}`;
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
      console.error(`Error retrieving cached anexos for prévia ${previaId}:`, error);
      return null;
    }
  };
  
  // CRUD operations with caching
  
  // Enhanced getPreviasDoPatient with caching
  const getPreviasDoPatient = useCallback(async (patientId, forceRefresh = false) => {
    if (!patientId) return [];
    
    try {
      // Check if we can use cached data
      if (isCacheEnabled && !forceRefresh && !needsRevalidation) {
        const cachedData = getCachedPreviasByPatient(patientId);
        
        if (cachedData) {
          console.log(`Using cached prévias for patient ${patientId}`);
          
          setPrevias(cachedData.data);
          setDataSource('cache');
          
          // If cache is stale, update in background
          if (cachedData.isStale) {
            console.log(`Cache for patient ${patientId} is stale, updating in background`);
            setTimeout(() => {
              getPreviasDoPatient(patientId, true);
            }, 100);
          }
          
          return cachedData.data;
        }
      }
      
      setLoading(true);
      console.log(`Fetching prévias for patient ${patientId} from server`);
      
      const response = await fetch(`${API_URL}/get_previas_by_paciente.php?paciente_id=${patientId}`);
      if (!response.ok) throw new Error('Erro ao buscar prévias do paciente');
      
      const data = await response.json();
      
      // Cache the data
      if (isCacheEnabled) {
        cachePreviasByPatient(patientId, data);
      }
      
      setPrevias(data);
      setDataSource('server');
      setLastFetch(Date.now());
      setNeedsRevalidation(false);
      
      return data;
    } catch (error) {
      console.error("Erro ao buscar prévias do paciente:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isCacheEnabled, needsRevalidation]);
  
  // Enhanced getPrevia with caching
  const getPrevia = useCallback(async (previaId, forceRefresh = false) => {
    if (!previaId) return null;
    
    try {
      // Check if we can use cached data
      if (isCacheEnabled && !forceRefresh) {
        const cachedData = getCachedPreviaDetails(previaId);
        
        if (cachedData) {
          console.log(`Using cached details for prévia ${previaId}`);
          return cachedData;
        }
      }
      
      setLoading(true);
      console.log(`Fetching details for prévia ${previaId} from server`);
      
      const response = await fetch(`${API_URL}/get_previa.php?id=${previaId}`);
      if (!response.ok) throw new Error('Erro ao buscar detalhes da prévia');
      
      const data = await response.json();
      
      // Cache the data
      if (isCacheEnabled) {
        cachePreviaDetails(previaId, data);
      }
      
      setSelectedPrevia(data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar detalhes da prévia:", error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isCacheEnabled]);
  
  // Enhanced getCiclosDias with caching
  const getCiclosDias = useCallback(async (previaId, forceRefresh = false) => {
    if (!previaId) return [];
    
    try {
      // Check if we can use cached data
      if (isCacheEnabled && !forceRefresh) {
        const cachedData = getCachedCiclosDias(previaId);
        
        if (cachedData) {
          console.log(`Using cached ciclos/dias for prévia ${previaId}`);
          return cachedData;
        }
      }
      
      setLoading(true);
      console.log(`Fetching ciclos/dias for prévia ${previaId} from server`);
      
      const response = await fetch(`${API_URL}/get_ciclos_dias.php?previa_id=${previaId}`);
      if (!response.ok) throw new Error('Erro ao buscar ciclos/dias');
      
      const data = await response.json();
      
      // Cache the data
      if (isCacheEnabled) {
        cacheCiclosDias(previaId, data);
      }
      
      return data;
    } catch (error) {
      console.error("Erro ao buscar ciclos/dias:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isCacheEnabled]);
  
  // Enhanced getAnexos with caching
  const getAnexos = useCallback(async (previaId, forceRefresh = false) => {
    if (!previaId) return [];
    
    try {
      // Check if we can use cached data
      if (isCacheEnabled && !forceRefresh) {
        const cachedData = getCachedAnexos(previaId);
        
        if (cachedData) {
          console.log(`Using cached anexos for prévia ${previaId}`);
          return cachedData;
        }
      }
      
      setLoading(true);
      console.log(`Fetching anexos for prévia ${previaId} from server`);
      
      const response = await fetch(`${API_URL}/get_anexos.php?previa_id=${previaId}`);
      if (!response.ok) throw new Error('Erro ao buscar anexos');
      
      const data = await response.json();
      
      // Cache the data
      if (isCacheEnabled) {
        cacheAnexos(previaId, data);
      }
      
      return data;
    } catch (error) {
      console.error("Erro ao buscar anexos:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isCacheEnabled]);
  
  const invalidateRelatedCaches = (action, data) => {
    try {
      // Always update the write timestamp
      updateWriteTimestamp();
      
      switch (action) {
        case 'create_previa':
        case 'update_previa':
          // Invalidate patient-specific cache
          if (data.paciente_id) {
            const patientCacheKey = `${CACHE_KEYS.PREVIAS_BY_PATIENT}${data.paciente_id}`;
            localStorage.removeItem(patientCacheKey);
          }
          
          // Invalidate previa details cache if updating
          if (action === 'update_previa' && data.id) {
            const detailsCacheKey = `${CACHE_KEYS.PREVIA_DETAILS}${data.id}`;
            const ciclosDiasKey = `${CACHE_KEYS.CICLOS_DIAS}${data.id}`;
            localStorage.removeItem(detailsCacheKey);
            localStorage.removeItem(ciclosDiasKey);
          }
          
          // Also invalidate protocol and CID caches as they might have been updated
          localStorage.removeItem('cached_protocolos_timestamp');
          localStorage.removeItem('cached_cids_timestamp');
          break;
          
        case 'upload_anexo':
        case 'delete_anexo':
          // For anexos operations, invalidate specific anexos cache
          if (data.previa_id) {
            const anexosCacheKey = `${CACHE_KEYS.ANEXOS}${data.previa_id}`;
            localStorage.removeItem(anexosCacheKey);
          }
          break;
      }
    } catch (error) {
      console.error("Error invalidating related caches:", error);
    }
  };

  // Function to create a previa with cache invalidation
  const createPrevia = useCallback(async (previaData) => {
    try {
      setLoading(true);
      
      console.log("Creating new prévia");
      const response = await fetch(`${API_URL}/create_previa.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previaData),
      });
      
      if (!response.ok) throw new Error('Erro ao criar prévia');
      
      const data = await response.json();
      
      // Invalidate related caches
      invalidateRelatedCaches('create_previa', previaData);
      
      // Trigger background refresh after a short delay
      if (previaData.paciente_id) {
        setTimeout(() => {
          backgroundRefresh(previaData.paciente_id);
        }, 300);
      }
      
      showSuccessAlert("Prévia criada com sucesso!");
      return data;
    } catch (error) {
      console.error("Erro ao criar prévia:", error);
      setError(error.message);
      showErrorAlert("Erro", "Não foi possível criar a prévia");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to update a previa with cache invalidation
  const updatePrevia = useCallback(async (previaData) => {
    if (!previaData || !previaData.id) {
      console.error("ID da prévia não fornecido");
      return null;
    }
    
    try {
      setLoading(true);
      
      console.log(`Updating prévia ${previaData.id}`);
      const response = await fetch(`${API_URL}/update_previa.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previaData),
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar prévia');
      
      const data = await response.json();
      
      // Invalidate caches
      updateWriteTimestamp();
      
      // Clear specific caches
      const detailsCacheKey = `${CACHE_KEYS.PREVIA_DETAILS}${previaData.id}`;
      localStorage.removeItem(detailsCacheKey);
      
      // Clear patient cache if patient ID is provided
      if (previaData.paciente_id) {
        const patientCacheKey = `${CACHE_KEYS.PREVIAS_BY_PATIENT}${previaData.paciente_id}`;
        localStorage.removeItem(patientCacheKey);
      }
      
      showSuccessAlert("Prévia atualizada com sucesso!");
      return data;
    } catch (error) {
      console.error("Erro ao atualizar prévia:", error);
      setError(error.message);
      showErrorAlert("Erro", "Não foi possível atualizar a prévia");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to upload an anexo with cache invalidation
  const uploadAnexo = useCallback(async (previaId, arquivo) => {
    if (!previaId || !arquivo) return null;
    
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('previa_id', previaId);
      formData.append('arquivo', arquivo);
      
      console.log(`Uploading anexo for prévia ${previaId}`);
      const response = await fetch(`${API_URL}/upload_anexo.php`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Erro ao fazer upload de anexo');
      
      const data = await response.json();
      
      // Invalidate anexos cache
      updateWriteTimestamp();
      const anexosCacheKey = `${CACHE_KEYS.ANEXOS}${previaId}`;
      localStorage.removeItem(anexosCacheKey);
      
      return data;
    } catch (error) {
      console.error("Erro ao fazer upload de anexo:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to delete an anexo with cache invalidation
  const deleteAnexo = useCallback(async (anexoId) => {
    if (!anexoId) return null;
    
    try {
      setLoading(true);
      
      console.log(`Deleting anexo ${anexoId}`);
      const response = await fetch(`${API_URL}/delete_anexo.php?id=${anexoId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Erro ao excluir anexo');
      
      const data = await response.json();
      
      // Since we don't have the previa ID here, we need to invalidate
      // all anexos caches or use a more targeted approach if possible
      updateWriteTimestamp();
      
      // Clear all anexos caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEYS.ANEXOS)) {
          localStorage.removeItem(key);
        }
      });
      
      return data;
    } catch (error) {
      console.error("Erro ao excluir anexo:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const backgroundRefresh = useCallback(async (patientId) => {
    if (!patientId) return;
    
    try {
      console.log(`Background refreshing data for patient ${patientId}`);
      
      // Fetch fresh data from server without showing loading indicators
      const response = await fetch(`${API_URL}/get_previas_by_paciente.php?paciente_id=${patientId}`);
      if (!response.ok) throw new Error('Error fetching patient data');
      
      const data = await response.json();
      
      // Update cache silently
      cachePreviasByPatient(patientId, data);
      
      // Update state silently
      setPrevias(data);
    } catch (error) {
      console.error("Background refresh error:", error);
      // Don't show errors to user during background refresh
    }
  }, []);

  // Function to refresh data after modification
  const refreshDataAfterModification = async (patientId) => {
    try {
      // Clear specific caches immediately
      if (patientId) {
        const cacheKey = `${CACHE_KEYS.PREVIAS_BY_PATIENT}${patientId}`;
        localStorage.removeItem(cacheKey);
      }
      
      // Mark timestamp for invalidation
      updateWriteTimestamp();
      
      // Return immediately but trigger background refresh
      setTimeout(() => {
        backgroundRefresh(patientId);
      }, 300);
      
      return true;
    } catch (error) {
      console.error("Error refreshing data after modification:", error);
      return false;
    }
  };
  
  // Function to reload all previas data
  const reloadAllData = async () => {
    try {
      // Clear the main cache
      clearCache();
      
      // Load all prévias if needed
      // This would depend on how your app is structured
      
      return true;
    } catch (error) {
      console.error("Error reloading data:", error);
      return false;
    }
  };
  
  // Create the context value
  const contextValue = {
    // States
    previas,
    selectedPrevia,
    loading,
    error,
    
    // Cache states
    isCacheEnabled,
    dataSource,
    totalRecords,
    
    // Core functions
    getPreviasDoPatient,
    getPrevia,
    getCiclosDias,
    getAnexos,
    createPrevia,
    updatePrevia,
    uploadAnexo,
    deleteAnexo,
    
    // Cache management
    toggleCache,
    clearCache,
    forceRevalidation,
    reloadAllData,
    refreshDataAfterModification
  };
  
  return (
    <PreviasContext.Provider value={contextValue}>
      {children}
    </PreviasContext.Provider>
  );
};

export default PreviasContext;