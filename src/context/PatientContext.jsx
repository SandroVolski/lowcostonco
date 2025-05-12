// src/context/PatientContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import CacheService from '../services/CacheService';

// API base URL
const API_BASE_URL = "https://apiteste.lowcostonco.com.br/backend-php/api/PacientesEmTratamento";

// Tempo de expiração do cache em ms (30 minutos)
const CACHE_EXPIRY = 30 * 60 * 1000;

// Cache keys for patients 
const CACHE_KEYS = {
  PATIENTS_DATA: 'cached_patients_data',
  REFERENCE_DATA: 'cached_reference_data',
  LAST_WRITE_TIMESTAMP: 'patients_last_write_timestamp'
};

// Criando o contexto
const PatientContext = createContext();

// Hook personalizado para usar o contexto
export const usePatient = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};

// Provider do contexto
export const PatientProvider = ({ children }) => {
  const { toast } = useToast();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  // Estados para filtragem e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState([]);
  
  // Estados para operadoras e prestadores (dados de referência)
  const [operadoras, setOperadoras] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [finalidadeTratamento, setFinalidadeTratamento] = useState([]);
  const [searchType, setSearchType] = useState('nome');
  
  // Cache-related states
  const [isCacheEnabled, setIsCacheEnabled] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const [needsRevalidation, setNeedsRevalidation] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // NOVO: Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  
  // Funções para exibir alertas
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
  
  // Function to initialize the cache service
  useEffect(() => {
    if (typeof CacheService !== 'undefined' && CacheService.init) {
      CacheService.init();
    }
  }, []);
  
  // Toggle cache functionality
  const toggleCache = (enabled = true) => {
    setIsCacheEnabled(enabled);
    if (!enabled) {
      // Clear the cache when disabling it
      localStorage.removeItem(CACHE_KEYS.PATIENTS_DATA);
      localStorage.removeItem(CACHE_KEYS.REFERENCE_DATA);
    }
  };
  
  // Clear patient cache
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEYS.PATIENTS_DATA);
    console.log("Patient cache cleared manually");
    setNeedsRevalidation(true);
  };
  
  // Clear reference data cache
  const clearReferenceCache = () => {
    localStorage.removeItem(CACHE_KEYS.REFERENCE_DATA);
    console.log("Reference data cache cleared manually");
  };
  
  // Function to mark the cache as updated
  const updateWriteTimestamp = () => {
    localStorage.setItem(CACHE_KEYS.LAST_WRITE_TIMESTAMP, Date.now().toString());
  };
  
  // Check if the cache is stale
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
  
  // Force revalidation of cache
  const forceRevalidation = () => {
    setNeedsRevalidation(true);
    console.log("Patient cache marked for revalidation");
  };
  
  // MODIFICADO: loadPatients com suporte para paginação
  const loadPatients = async (force = false, page = currentPage, limit = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se podemos usar o cache para a página atual
      const cacheKey = `${CACHE_KEYS.PATIENTS_DATA}_page${page}_limit${limit}`;
      
      if (isCacheEnabled && !force && !needsRevalidation) {
        const cachedItem = localStorage.getItem(cacheKey);
        
        if (cachedItem) {
          const cacheData = JSON.parse(cachedItem);
          
          // Verificar se o cache expirou
          if (Date.now() <= cacheData.expiry) {
            console.log(`Usando dados em cache para página ${page}`);
            
            setPatients(cacheData.data);
            setFilteredPatients(cacheData.data);
            setCurrentPage(page);
            setTotalPages(cacheData.meta.pages);
            setTotalRecords(cacheData.meta.total);
            setDataSource('cache');
            
            setLoading(false);
            return cacheData.data;
          }
        }
      }
      
      // URL com parâmetros de paginação
      const url = `${API_BASE_URL}/get_pacientes.php?page=${page}&limit=${limit}`;
      console.log(`Buscando pacientes da API: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error loading patients: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Extrair dados e metadados
      const data = responseData.data || [];
      const meta = responseData.meta || { 
        total: data.length,
        page: page,
        limit: limit,
        pages: Math.ceil(data.length / limit)
      };
      
      // Atualizar estados
      setPatients(data);
      setFilteredPatients(data);
      setCurrentPage(meta.page);
      setTotalPages(meta.pages);
      setTotalRecords(meta.total);
      setDataSource('server');
      setInitialized(true);
      setNeedsRevalidation(false);
      
      // Armazenar em cache se habilitado
      if (isCacheEnabled) {
        try {
          const cacheItem = {
            data: data,
            meta: meta,
            timestamp: Date.now(),
            expiry: Date.now() + CACHE_EXPIRY
          };
          
          localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
          console.log(`Dados da página ${page} armazenados em cache`);
        } catch (error) {
          console.error("Erro ao armazenar em cache:", error);
        }
      }
      
      return data;
      
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // MODIFICADO: searchPatients para fazer busca via API
  const searchPatients = async (term, type = 'nome', page = 1, limit = pageSize) => {
    try {
      setSearchTerm(term);
      setSearchType(type);
      
      if (!term) {
        // Se o termo de busca estiver vazio, carregar página atual normal
        return loadPatients(false, page, limit);
      }
      
      setLoading(true);
      
      // Gerar chave de cache para esta busca
      const searchCacheKey = `patients_search_${type}_${term.toLowerCase()}_page${page}`;
      
      // Verificar cache para esta busca
      if (isCacheEnabled) {
        const cachedSearch = localStorage.getItem(searchCacheKey);
        
        if (cachedSearch) {
          const searchData = JSON.parse(cachedSearch);
          
          if (Date.now() < searchData.expiry) {
            console.log(`Usando resultados em cache para "${term}" na página ${page}`);
            setFilteredPatients(searchData.results);
            setTotalPages(searchData.meta.pages);
            setTotalRecords(searchData.meta.total);
            setLoading(false);
            return searchData.results;
          } else {
            localStorage.removeItem(searchCacheKey);
          }
        }
      }
      
      // Buscar da API com parâmetros
      const url = `${API_BASE_URL}/get_pacientes.php?search=${encodeURIComponent(term)}&type=${type}&page=${page}&limit=${limit}`;
      console.log(`Buscando: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro na busca: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Extrair dados e metadados
      const data = responseData.data || [];
      const meta = responseData.meta || {
        total: data.length,
        page: page,
        limit: limit,
        pages: Math.ceil(data.length / limit)
      };
      
      // Atualizar estados
      setFilteredPatients(data);
      setCurrentPage(meta.page);
      setTotalPages(meta.pages);
      setTotalRecords(meta.total);
      
      // Armazenar resultados da busca em cache
      if (isCacheEnabled) {
        try {
          const searchData = {
            results: data,
            meta: meta,
            expiry: Date.now() + (5 * 60 * 1000) // 5 minutos para resultados de busca
          };
          
          localStorage.setItem(searchCacheKey, JSON.stringify(searchData));
        } catch (error) {
          console.error("Erro ao armazenar busca em cache:", error);
        }
      }
      
      return data;
      
    } catch (error) {
      console.error("Erro na busca de pacientes:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // NOVO: Função para mudar de página
  const changePage = async (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    setCurrentPage(newPage);
    
    if (searchTerm) {
      // Se houver um termo de busca ativo, usar a função de busca com a nova página
      return searchPatients(searchTerm, searchType, newPage, pageSize);
    } else {
      // Caso contrário, carregar a nova página normalmente
      return loadPatients(false, newPage, pageSize);
    }
  };

  // NOVO: Função para mudar o tamanho da página
  const changePageSize = async (newSize) => {
    setPageSize(newSize);
    // Voltar para a primeira página ao mudar o tamanho
    return changePage(1);
  };
  
  // Carregar dados de referência como antes (sem modificações necessárias)
  const loadReferenceData = async () => {
    try {
      console.log("Loading reference data...");
      
      if (isCacheEnabled) {
        const cachedData = getCachedReferenceData();
        
        if (cachedData) {
          console.log("Using cached reference data");
          
          const { operadoras, prestadores, finalidadeTratamento } = cachedData.data;
          setOperadoras(operadoras);
          setPrestadores(prestadores);
          setFinalidadeTratamento(finalidadeTratamento);
          
          return { operadoras, prestadores, finalidadeTratamento };
        }
      }
      
      const results = await Promise.allSettled([
        fetch(`${API_BASE_URL}/get_operadoras.php`).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/get_prestadores.php`).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/get_finalidades_tratamento.php`).then(res => res.ok ? res.json() : [])
      ]);
      
      const loadedOperadoras = results[0].status === 'fulfilled' ? results[0].value : [];
      const loadedPrestadores = results[1].status === 'fulfilled' ? results[1].value : [];
      const loadedFinalidades = results[2].status === 'fulfilled' ? results[2].value : [];
      
      const processedPrestadores = loadedPrestadores.map(p => ({
        ...p,
        nome: p.nome || p.nome_fantasia || p.nome_original || `Prestador ${p.id}`
      })).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      
      setOperadoras(loadedOperadoras);
      setPrestadores(processedPrestadores);
      setFinalidadeTratamento(loadedFinalidades);
      
      if (isCacheEnabled) {
        cacheReferenceData(loadedOperadoras, processedPrestadores, loadedFinalidades);
      }
      
      return {
        operadoras: loadedOperadoras,
        prestadores: processedPrestadores,
        finalidadeTratamento: loadedFinalidades
      };
      
    } catch (error) {
      console.error("Error loading reference data:", error);
      return {
        operadoras: [],
        prestadores: [],
        finalidadeTratamento: []
      };
    }
  };
  
  // Função para obter dados em cache (sem modificação)
  const getCachedReferenceData = () => {
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.REFERENCE_DATA);
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(CACHE_KEYS.REFERENCE_DATA);
        return null;
      }
      
      return cacheData;
    } catch (error) {
      console.error("Error retrieving cached reference data:", error);
      return null;
    }
  };
  
  // Cache reference data (sem modificação)
  const cacheReferenceData = (operadoras, prestadores, finalidades) => {
    if (!isCacheEnabled) return;
    
    try {
      const referenceData = {
        operadoras,
        prestadores,
        finalidadeTratamento: finalidades
      };
      
      const cacheItem = {
        data: referenceData,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(CACHE_KEYS.REFERENCE_DATA, JSON.stringify(cacheItem));
      console.log("Reference data cached successfully");
    } catch (error) {
      console.error("Error caching reference data:", error);
    }
  };

  // MODIFICADO: addPatient para recarregar após adição
  const addPatient = async (patientData) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/create_paciente.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
      });
      
      if (!response.ok) {
        throw new Error(`Error adding patient: ${response.status}`);
      }
      
      const data = await response.json();
      const newPatientId = data.id;
      
      if (!newPatientId) {
        throw new Error("Invalid response from server");
      }
      
      showSuccessAlert("Paciente adicionado com sucesso");
      
      // Recarregar dados após adição
      forceRevalidation();
      await loadPatients(true, currentPage, pageSize);
      
      return newPatientId;
      
    } catch (error) {
      console.error("Error adding patient:", error);
      showErrorAlert("Erro ao adicionar paciente", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // MODIFICADO: updatePatient para recarregar após atualização
  const updatePatient = async (patientId, patientData) => {
    try {
      setLoading(true);
      
      const updateData = {
        ...patientData,
        id: patientId
      };
      
      const response = await fetch(`${API_BASE_URL}/update_paciente.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`Error updating patient: ${response.status}`);
      }
      
      showSuccessAlert("Paciente atualizado com sucesso");
      
      // Recarregar dados após atualização
      forceRevalidation();
      await loadPatients(true, currentPage, pageSize);
      
      return true;
      
    } catch (error) {
      console.error("Error updating patient:", error);
      showErrorAlert("Erro ao atualizar paciente", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // MODIFICADO: deletePatient para recarregar após exclusão
  const deletePatient = async (patientId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/delete_paciente.php?id=${patientId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting patient: ${response.status}`);
      }
      
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
      
      showSuccessAlert("Paciente excluído com sucesso");
      
      // Recarregar dados após exclusão
      forceRevalidation();
      await loadPatients(true, currentPage, pageSize);
      
      return true;
      
    } catch (error) {
      console.error("Error deleting patient:", error);
      showErrorAlert("Erro ao excluir paciente", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // selectPatient sem modificações significativas
  const selectPatient = async (patientId) => {
    if (patientId === null) {
      setSelectedPatient(null);
      return;
    }
    
    try {
      const existingPatient = filteredPatients.find(p => p.id === patientId);
      
      if (existingPatient) {
        setSelectedPatient(existingPatient);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/get_paciente_by_id.php?id=${patientId}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching patient details: ${response.status}`);
      }
      
      const patientData = await response.json();
      setSelectedPatient(patientData);
      
    } catch (error) {
      console.error("Error selecting patient:", error);
      showErrorAlert("Erro ao carregar detalhes do paciente", error.message);
    }
  };
  
  // MODIFICADO: reloadAllData para considerar paginação
  const reloadAllData = async () => {
    await loadPatients(true, 1, pageSize);
    await loadReferenceData();
    return true;
  };
  
  // MODIFICADO: refreshDataAfterModification para considerar paginação
  const refreshDataAfterModification = async () => {
    try {
      forceRevalidation();
      await loadPatients(true, currentPage, pageSize);
      return true;
    } catch (error) {
      console.error("Error refreshing data after modification:", error);
      return false;
    }
  };
  
  // Funções de cálculo (sem modificações)
  const calculateAUC = (peso, idade, creatinina, sexo) => {
    if (peso <= 0 || idade <= 0 || creatinina <= 0 || !['M', 'F'].includes(sexo)) {
      return 'Invalid parameters';
    }
    
    const sexoFactor = sexo === 'F' ? 1 : 2;
    const auc = ((((peso * (140 - idade)) / (72 * creatinina)) * sexoFactor) + 25).toFixed(2);
    return auc;
  };
  
  const calculateSC1 = (peso) => {
    if (peso <= 0) return 'Invalid weight';
    
    const sc = ((peso * 4) + 7) / (peso + 90);
    return sc.toFixed(4);
  };
  
  const calculateSC2 = (peso, altura) => {
    if (peso <= 0 || altura <= 0) return 'Invalid parameters';
    
    const sc = Math.pow(peso, 0.5378) * Math.pow(altura, 0.3964) * 0.024265;
    return sc.toFixed(4);
  };
  
  // Inicializar dados (sem modificações significativas)
  useEffect(() => {
    if (!initialized) {
      loadPatients();
      loadReferenceData();
    }
  }, [initialized]);
  
  // Exportar valores do contexto (com adições para paginação)
  const value = {
    patients,
    filteredPatients,
    selectedPatient,
    loading,
    error,
    searchTerm,
    searchType,
    operadoras,
    prestadores,
    finalidadeTratamento,
    initialized,
    
    // Data source and cache information
    isCacheEnabled,
    dataSource,
    totalRecords,
    
    // NOVO: Informações de paginação
    currentPage,
    pageSize,
    totalPages,
    
    // Core functions
    setSelectedPatient,
    loadPatients,
    searchPatients,
    addPatient,
    updatePatient,
    deletePatient,
    selectPatient,
    loadReferenceData,
    
    // NOVO: Funções de paginação
    changePage,
    changePageSize,
    
    // Cache management functions
    toggleCache,
    clearCache,
    forceRevalidation,
    reloadAllData,
    refreshDataAfterModification,
    
    // Calculator functions
    calculateAUC,
    calculateSC1,
    calculateSC2
  };
  
  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};

export default PatientContext;