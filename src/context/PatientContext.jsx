import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { showSuccessAlert, showErrorAlert } from '../utils/CustomAlerts';

// Criando o contexto
const PatientContext = createContext();

// API base URL
const API_BASE_URL = "https://api.lowcostonco.com.br/backend-php/api";

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
      
      // Fazer requisição para a API simulada (substituir pelo endpoint real)
      const response = await fetch(`${API_BASE_URL}/pacientes_em_tratamento.php`);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar pacientes: ${response.status}`);
      }
      
      // Simulando dados baseados na estrutura do banco fornecido
      // Na implementação real, isso viria da API
      const data = [
        {
          id: 1,
          Operadora: "Casacaresc",
          Prestador: "CEOF",
          Paciente_Codigo: "909002072000943106",
          Nome: "Rosani Anita Gabriel",
          Sexo: "F",
          Nascimento: "22/02/1986",
          Indicao_Clinica: "Mama NE",
          CID: "C509",
          T: "3",
          N: "0",
          M: "1",
          Estadio: "IV",
          Finalidade: "Paliativo",
          CRM_Medico: 4524,
          Local_das_Metastases: "PULMONARES, SNC, ÓSSEA, HEPÁTICA"
        },
        {
          id: 2,
          Operadora: "Casacaresc",
          Prestador: "CEOF",
          Paciente_Codigo: "909002072003666537",
          Nome: "Luciano Ferreira",
          Sexo: "M",
          Nascimento: "",
          Indicao_Clinica: "Neoplasma malig do testículo",
          CID: "C629",
          T: "",
          N: "",
          M: "",
          Estadio: "",
          Finalidade: "",
          CRM_Medico: 4870,
          Local_das_Metastases: ""
        }
      ];
      
      // Para simulação
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
      // Simular carregamento de operadoras
      const operadorasData = [
        { id: 1, nome: "Casacaresc" },
        { id: 2, nome: "CELOS" },
        { id: 3, nome: "SIM" }
      ];
      
      // Simular carregamento de prestadores
      const prestadoresData = [
        { id: 1, nome: "CEOF" },
        { id: 2, nome: "NOOVA" },
        { id: 3, nome: "OCF" },
        { id: 4, nome: "SOMA" },
        { id: 5, nome: "VIVER" },
        { id: 6, nome: "CLIMAMA" }
      ];
      
      // Carregar finalidades de tratamento da tabela real
      const finalidadeData = [
        { id: 1, descricao: "NeoAdjuvante (Prévio)" },
        { id: 2, descricao: "Adjuvante" },
        { id: 3, descricao: "Curativo" },
        { id: 4, descricao: "Controle" },
        { id: 5, descricao: "Associado a Radioterapia" },
        { id: 6, descricao: "Paliativo" }
      ];
      
      setOperadoras(operadorasData);
      setPrestadores(prestadoresData);
      setFinalidadeTratamento(finalidadeData);
      
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
      
      // Simulação de chamada API
      console.log("Adicionando paciente:", patientData);
      
      // Criar ID simulado para o novo paciente
      const newId = Math.max(0, ...patients.map(p => p.id)) + 1;
      const newPatient = {
        id: newId,
        ...patientData
      };
      
      // Atualizar estado local
      setPatients(prev => [...prev, newPatient]);
      setFilteredPatients(prev => [...prev, newPatient]);
      
      showSuccessAlert("Paciente adicionado com sucesso");
      return newId;
      
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
      
      // Simulação de chamada API
      console.log("Atualizando paciente:", patientId, patientData);
      
      // Atualizar estado local
      setPatients(prev => prev.map(p => 
        p.id === patientId ? { ...p, ...patientData } : p
      ));
      
      setFilteredPatients(prev => prev.map(p => 
        p.id === patientId ? { ...p, ...patientData } : p
      ));
      
      if (selectedPatient?.id === patientId) {
        setSelectedPatient({ ...selectedPatient, ...patientData });
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
      
      // Simulação de chamada API
      console.log("Excluindo paciente:", patientId);
      
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
  const selectPatient = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
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