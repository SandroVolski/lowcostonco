import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { showSuccessAlert, showErrorAlert } from '../utils/CustomAlerts';

// Criando o contexto
const PatientContext = createContext();

// API base URL
const API_BASE_URL = "http://localhost/backend-php/api/";

// Hook personalizado para usar o contexto
export const usePatient = () => useContext(PatientContext);

// Provider do contexto
export const PatientProvider = ({ children }) => {
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
  
  // Carregar pacientes da API
  const loadPatients = async (force = false) => {
    // Se já inicializado e não forçado, não carrega novamente
    if (initialized && !force) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fazer requisição real para a API
      const response = await fetch(`${API_BASE_URL}/get_pacientes.php`);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar pacientes: ${response.status}`);
      }
      
      const responseData = await response.json();
      const data = responseData.data || responseData; // Compatibilidade com ambos os formatos
      
      setPatients(data);
      setFilteredPatients(data);
      setInitialized(true);
      
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados de referência (operadoras, prestadores, etc.)
  const loadReferenceData = async () => {
    try {
      // Carregar operadoras
      const operadorasResponse = await fetch(`${API_BASE_URL}/get_operadoras.php`);
      if (operadorasResponse.ok) {
        const operadorasData = await operadorasResponse.json();
        setOperadoras(operadorasData);
      }
      
      // Carregar prestadores
      const prestadoresResponse = await fetch(`${API_BASE_URL}/get_prestadores.php`);
      if (prestadoresResponse.ok) {
        const prestadoresData = await prestadoresResponse.json();
        setPrestadores(prestadoresData);
      }
      
      // Carregar finalidades de tratamento
      const finalidadesResponse = await fetch(`${API_BASE_URL}/get_finalidades_tratamento.php`);
      if (finalidadesResponse.ok) {
        const finalidadesData = await finalidadesResponse.json();
        setFinalidadeTratamento(finalidadesData);
      }
      
    } catch (error) {
      console.error("Erro ao carregar dados de referência:", error);
    }
  };
  
  // Pesquisar pacientes
  const searchPatients = (term) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredPatients(patients);
      return;
    }
    
    const termLower = term.toLowerCase();
    const filtered = patients.filter(patient => 
      patient.Nome.toLowerCase().includes(termLower) ||
      patient.Paciente_Codigo.toLowerCase().includes(termLower) ||
      patient.CID.toLowerCase().includes(termLower)
    );
    
    setFilteredPatients(filtered);
  };
  
  // Adicionar paciente
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
        throw new Error(`Erro ao adicionar paciente: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Recarregar os pacientes para obter a lista atualizada
      await loadPatients(true);
      
      showSuccessAlert("Paciente adicionado com sucesso");
      return data.id;
      
    } catch (error) {
      console.error("Erro ao adicionar paciente:", error);
      showErrorAlert("Erro ao adicionar paciente", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Atualizar paciente
  const updatePatient = async (patientId, patientData) => {
    try {
      setLoading(true);
      
      // Garantir que o ID esteja no objeto
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
        throw new Error(`Erro ao atualizar paciente: ${response.status}`);
      }
      
      // Recarregar os pacientes para obter a lista atualizada
      await loadPatients(true);
      
      if (selectedPatient?.id === patientId) {
        // Atualizar o paciente selecionado
        const updatedPatient = patients.find(p => p.id === patientId);
        setSelectedPatient(updatedPatient || null);
      }
      
      showSuccessAlert("Paciente atualizado com sucesso");
      return true;
      
    } catch (error) {
      console.error("Erro ao atualizar paciente:", error);
      showErrorAlert("Erro ao atualizar paciente", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Excluir paciente
  const deletePatient = async (patientId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/delete_paciente.php?id=${patientId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao excluir paciente: ${response.status}`);
      }
      
      // Atualizar estado local
      setPatients(prev => prev.filter(p => p.id !== patientId));
      setFilteredPatients(prev => prev.filter(p => p.id !== patientId));
      
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
      
      showSuccessAlert("Paciente excluído com sucesso");
      return true;
      
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      showErrorAlert("Erro ao excluir paciente", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Selecionar paciente
  const selectPatient = async (patientId) => {
    try {
      // Verificar se já temos detalhes completos do paciente no estado atual
      const existingPatient = patients.find(p => p.id === patientId);
      
      if (existingPatient) {
        setSelectedPatient(existingPatient);
        return;
      }
      
      // Caso contrário, buscar detalhes do paciente da API
      const response = await fetch(`${API_BASE_URL}/get_paciente_by_id.php?id=${patientId}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar detalhes do paciente: ${response.status}`);
      }
      
      const patientData = await response.json();
      setSelectedPatient(patientData);
      
    } catch (error) {
      console.error("Erro ao selecionar paciente:", error);
      showErrorAlert("Erro ao carregar detalhes do paciente", error.message);
    }
  };
  
  // Funções para calculadora médica
  const calculateAUC = (weight, age, creatinine, gender) => {
    // AUC 1 formula do PDF
    // ((((Peso do Beneficiário X (140 - Idade do Beneficiário) ) / 
    // (72 X Creatinina)) X Sexo do Beneficiário* )+25)
    // * 1 para feminino e 2 para masculino
    
    const genderMultiplier = gender === 'F' ? 1 : 2;
    
    const result = ((((weight * (140 - age)) / (72 * creatinine)) * genderMultiplier) + 25);
    
    return result.toFixed(2);
  };
  
  // Calcular superfície corporal
  const calculateSC1 = (weight) => {
    // FÓRMULA 1: SC (m²) = (Peso em kg x 4) + 7 / Peso em kg + 90
    const result = ((weight * 4) + 7) / (weight + 90);
    return result.toFixed(4);
  };
  
  const calculateSC2 = (weight, height) => {
    // FÓRMULA 2: SC (m²) = (Peso (kg) elevado a 0,5378) x (Estatura (cm) elevado a 0,3964) x 0,024265
    const result = (Math.pow(weight, 0.5378) * Math.pow(height, 0.3964) * 0.024265);
    return result.toFixed(4);
  };
  
  // Efeito para inicialização
  useEffect(() => {
    if (!initialized) {
      loadPatients();
      loadReferenceData();
    }
  }, [initialized]);
  
  // Valores do contexto
  const value = {
    patients,
    filteredPatients,
    selectedPatient,
    loading,
    error,
    searchTerm,
    operadoras,
    prestadores,
    finalidadeTratamento,
    
    // Funções
    loadPatients,
    searchPatients,
    addPatient,
    updatePatient,
    deletePatient,
    selectPatient,
    
    // Funções para calculadora
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