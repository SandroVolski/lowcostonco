// src/context/PatientContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import CacheService from '../services/CacheService'; // Add this import

// API base URL
const API_BASE_URL = "https://api.lowcostonco.com.br/backend-php/api/PacientesEmTratamento";

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
  
  // New cache-related states
  const [isCacheEnabled, setIsCacheEnabled] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const [needsRevalidation, setNeedsRevalidation] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  
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
    // Initialize CacheService if it exists
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
  
  // Cache patients data
  const cachePatients = (data) => {
    if (!isCacheEnabled) return;
    
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      };
      
      localStorage.setItem(CACHE_KEYS.PATIENTS_DATA, JSON.stringify(cacheItem));
      setTotalRecords(data.length);
      console.log(`Cached ${data.length} patients successfully`);
    } catch (error) {
      console.error("Error caching patients data:", error);
    }
  };
  
  // Cache reference data (operadoras, prestadores, etc.)
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
  
  // Get cached patients data
  const getCachedPatients = () => {
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PATIENTS_DATA);
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(CACHE_KEYS.PATIENTS_DATA);
        return null;
      }
      
      // Check if cache is stale
      const isStale = isCacheStale(cacheData.timestamp);
      if (isStale) {
        console.log("Patients cache is stale, will revalidate in background");
        cacheData.isStale = true;
      }
      
      return cacheData;
    } catch (error) {
      console.error("Error retrieving cached patients:", error);
      return null;
    }
  };
  
  // Get cached reference data
  const getCachedReferenceData = () => {
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.REFERENCE_DATA);
      if (!cachedItem) return null;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Check if cache is expired
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
  
  // Update a patient in cache selectively
  const updatePatientInCache = (updatedPatient) => {
    if (!isCacheEnabled) return;
    
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PATIENTS_DATA);
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Update the patient in the cached data
      cacheData.data = cacheData.data.map(patient => 
        patient.id === updatedPatient.id ? { ...patient, ...updatedPatient } : patient
      );
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(CACHE_KEYS.PATIENTS_DATA, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Patient #${updatedPatient.id} updated in cache`);
    } catch (error) {
      console.error("Error updating patient in cache:", error);
    }
  };
  
  // Remove a patient from cache
  const removePatientFromCache = (patientId) => {
    if (!isCacheEnabled) return;
    
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PATIENTS_DATA);
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Remove the patient from the cached data
      cacheData.data = cacheData.data.filter(patient => patient.id !== patientId);
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(CACHE_KEYS.PATIENTS_DATA, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Patient #${patientId} removed from cache`);
    } catch (error) {
      console.error("Error removing patient from cache:", error);
    }
  };
  
  // Add a patient to cache
  const addPatientToCache = (newPatient) => {
    if (!isCacheEnabled) return;
    
    try {
      const cachedItem = localStorage.getItem(CACHE_KEYS.PATIENTS_DATA);
      if (!cachedItem) return;
      
      const cacheData = JSON.parse(cachedItem);
      
      // Add the new patient to the cached data
      cacheData.data = [...cacheData.data, newPatient];
      
      // Update timestamp
      cacheData.timestamp = Date.now();
      
      // Save back to localStorage
      localStorage.setItem(CACHE_KEYS.PATIENTS_DATA, JSON.stringify(cacheData));
      updateWriteTimestamp();
      
      console.log(`Patient #${newPatient.id} added to cache`);
    } catch (error) {
      console.error("Error adding patient to cache:", error);
    }
  };
  
  // Enhanced loadPatients function with caching
  const loadPatients = async (force = false) => {
    // If already initialized and not forced, don't reload
    if (initialized && !force && !needsRevalidation) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if we can use cached data
      if (isCacheEnabled && !force && !needsRevalidation) {
        const cachedData = getCachedPatients();
        
        if (cachedData) {
          console.log("Using cached patients data");
          
          const patientData = cachedData.data;
          setPatients(patientData);
          setFilteredPatients(patientData);
          setInitialized(true);
          setDataSource('cache');
          setTotalRecords(patientData.length);
          
          // If the cache is stale, update in background
          if (cachedData.isStale) {
            console.log("Cache is stale, updating in background");
            setTimeout(() => {
              loadPatients(true);
            }, 100);
          }
          
          setLoading(false);
          return patientData;
        }
      }
      
      // Make the actual API request
      console.log("Fetching patients from server");
      const response = await fetch(`${API_BASE_URL}/get_pacientes.php`);
      
      if (!response.ok) {
        throw new Error(`Error loading patients: ${response.status}`);
      }
      
      const responseData = await response.json();
      const data = responseData.data || responseData; // Compatibility with both formats
      
      // Cache the data if caching is enabled
      if (isCacheEnabled) {
        cachePatients(data);
      }
      
      setPatients(data);
      setFilteredPatients(data);
      setInitialized(true);
      setDataSource('server');
      setNeedsRevalidation(false);
      setLastFetch(Date.now());
      setTotalRecords(data.length);
      
      return data;
      
    } catch (error) {
      console.error("Error loading patients:", error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Enhanced loadReferenceData with caching
  const loadReferenceData = async () => {
    try {
      console.log("Loading reference data...");
      
      // Check if we can use cached reference data
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
      
      // If no cache or cache disabled, load from server
      const results = await Promise.allSettled([
        fetch(`${API_BASE_URL}/get_operadoras.php`).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/get_prestadores.php`).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/get_finalidades_tratamento.php`).then(res => res.ok ? res.json() : [])
      ]);
      
      // Process results even if some requests failed
      const loadedOperadoras = results[0].status === 'fulfilled' ? results[0].value : [];
      const loadedPrestadores = results[1].status === 'fulfilled' ? results[1].value : [];
      const loadedFinalidades = results[2].status === 'fulfilled' ? results[2].value : [];
      
      // Process prestadores to ensure nome field
      const processedPrestadores = loadedPrestadores.map(p => ({
        ...p,
        nome: p.nome || p.nome_fantasia || p.nome_original || `Prestador ${p.id}`
      })).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      
      // Update state
      setOperadoras(loadedOperadoras);
      setPrestadores(processedPrestadores);
      setFinalidadeTratamento(loadedFinalidades);
      
      // Cache reference data
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
  
  // Enhanced searchPatients with caching for search results
  const searchPatients = async (term, type = 'nome') => {
    setSearchTerm(term);
    setSearchType(type);
    
    if (!term) {
      setFilteredPatients(patients);
      return patients;
    }
    
    // Generate a cache key for this search
    const searchCacheKey = `patients_search_${type}_${term.toLowerCase()}`;
    
    // Check if we have this search in cache
    if (isCacheEnabled) {
      try {
        const cachedSearch = localStorage.getItem(searchCacheKey);
        
        if (cachedSearch) {
          const searchData = JSON.parse(cachedSearch);
          
          // Check if cache is expired
          if (Date.now() < searchData.expiry) {
            console.log(`Using cached search results for "${term}"`);
            setFilteredPatients(searchData.results);
            return searchData.results;
          } else {
            // Remove expired cache
            localStorage.removeItem(searchCacheKey);
          }
        }
      } catch (error) {
        console.error("Error retrieving cached search:", error);
      }
    }
    
    // No cache or expired, perform search
    // Normalize search term
    const normalizedTerm = term.toLowerCase();
    
    let filtered = [];
    switch (type) {
      case 'nome':
        filtered = patients.filter(patient => 
          patient.Nome && patient.Nome.toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'codigo':
        filtered = patients.filter(patient => 
          patient.Paciente_Codigo && 
          String(patient.Paciente_Codigo).toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'cid':
        filtered = patients.filter(patient => 
          patient.CID && patient.CID.toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'operadora':
        filtered = patients.filter(patient => 
          patient.Operadora && patient.Operadora.toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'prestador':
        filtered = patients.filter(patient => 
          patient.Prestador && patient.Prestador.toLowerCase().includes(normalizedTerm)
        );
        break;
      case 'finalidade':
        filtered = patients.filter(patient => 
          patient.Finalidade && patient.Finalidade.toLowerCase().includes(normalizedTerm)
        );
        break;
      default:
        // Search in all fields if type not recognized
        filtered = patients.filter(patient => 
          (patient.Nome && patient.Nome.toLowerCase().includes(normalizedTerm)) ||
          (patient.Paciente_Codigo && String(patient.Paciente_Codigo).toLowerCase().includes(normalizedTerm)) ||
          (patient.CID && patient.CID.toLowerCase().includes(normalizedTerm))
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
    
    setFilteredPatients(filtered);
    return filtered;
  };

  // Enhanced addPatient with cache update
  const addPatient = async (patientData) => {
    try {
      setLoading(true);
      
      // Make the API call
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
      
      // Get the new patient ID
      const newPatientId = data.id;
      
      if (!newPatientId) {
        throw new Error("Invalid response from server");
      }
      
      // Create a complete patient object with the new ID
      const newPatient = {
        ...patientData,
        id: newPatientId
      };
      
      // Update local state
      setPatients(prev => [...prev, newPatient]);
      setFilteredPatients(prev => [...prev, newPatient]);
      
      // Update cache
      addPatientToCache(newPatient);
      
      // Mark cache as updated
      updateWriteTimestamp();
      
      showSuccessAlert("Patient added successfully");
      return newPatientId;
      
    } catch (error) {
      console.error("Error adding patient:", error);
      showErrorAlert("Error adding patient", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Enhanced updatePatient with cache update
  const updatePatient = async (patientId, patientData) => {
    try {
      setLoading(true);
      
      // Ensure ID is in the data object
      const updateData = {
        ...patientData,
        id: patientId
      };
      
      // Make the API call
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
      
      // Update local state
      setPatients(prev => 
        prev.map(p => p.id === patientId ? { ...p, ...patientData } : p)
      );
      
      setFilteredPatients(prev => 
        prev.map(p => p.id === patientId ? { ...p, ...patientData } : p)
      );
      
      if (selectedPatient?.id === patientId) {
        setSelectedPatient({ ...selectedPatient, ...patientData });
      }
      
      // Update cache
      updatePatientInCache({ ...patientData, id: patientId });
      
      showSuccessAlert("Patient updated successfully");
      return true;
      
    } catch (error) {
      console.error("Error updating patient:", error);
      showErrorAlert("Error updating patient", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Enhanced deletePatient with cache update
  const deletePatient = async (patientId) => {
    try {
      setLoading(true);
      
      // Make the API call
      const response = await fetch(`${API_BASE_URL}/delete_paciente.php?id=${patientId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting patient: ${response.status}`);
      }
      
      // Update local state
      setPatients(prev => prev.filter(p => p.id !== patientId));
      setFilteredPatients(prev => prev.filter(p => p.id !== patientId));
      
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
      
      // Update cache
      removePatientFromCache(patientId);
      
      showSuccessAlert("Patient deleted successfully");
      return true;
      
    } catch (error) {
      console.error("Error deleting patient:", error);
      showErrorAlert("Error deleting patient", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Enhanced selectPatient with caching for detailed patient
  const selectPatient = async (patientId) => {
    // If patientId is null, clear the selection and return
    if (patientId === null) {
      setSelectedPatient(null);
      return;
    }
    
    try {
      // Check if patient exists in the current state
      const existingPatient = patients.find(p => p.id === patientId);
      
      if (existingPatient) {
        setSelectedPatient(existingPatient);
        return;
      }
      
      // Try to fetch from API
      const response = await fetch(`${API_BASE_URL}/get_paciente_by_id.php?id=${patientId}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching patient details: ${response.status}`);
      }
      
      const patientData = await response.json();
      setSelectedPatient(patientData);
      
      // Update the main patient list with this detailed data
      setPatients(prev => {
        const index = prev.findIndex(p => p.id === patientId);
        
        if (index >= 0) {
          // Replace existing patient with detailed data
          const updatedList = [...prev];
          updatedList[index] = patientData;
          return updatedList;
        } else {
          // Add the new patient to the list
          return [...prev, patientData];
        }
      });
      
    } catch (error) {
      console.error("Error selecting patient:", error);
      showErrorAlert("Error loading patient details", error.message);
    }
  };
  
  // Reload all data (used for cache management)
  const reloadAllData = async () => {
    await loadPatients(true);
    await loadReferenceData();
    return true;
  };
  
  // Function to refresh data after modifying a patient
  const refreshDataAfterModification = async () => {
    try {
      // Mark cache for revalidation
      forceRevalidation();
      
      // Reload data
      await loadPatients(true);
      
      return true;
    } catch (error) {
      console.error("Error refreshing data after modification:", error);
      return false;
    }
  };
  
  // Calculator functions (no changes needed here)
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
  
  // Initialize data when context is first used
  useEffect(() => {
    if (!initialized) {
      loadPatients();
      loadReferenceData();
    }
  }, [initialized]);
  
  // Export context values
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
    
    // Core functions
    setSelectedPatient,
    loadPatients,
    searchPatients,
    addPatient,
    updatePatient,
    deletePatient,
    selectPatient,
    loadReferenceData,
    
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