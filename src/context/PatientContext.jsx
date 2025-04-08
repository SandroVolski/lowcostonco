// src/context/PatientContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';

// API base URL
const API_BASE_URL = "https://apiteste.lowcostonco.com.br/backend-php/api/PacientesEmTratamento";

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
      console.log("Carregando dados de referência...");
      
      // Carregar operadoras
      const operadorasResponse = await fetch(`${API_BASE_URL}/get_operadoras.php`);
      if (operadorasResponse.ok) {
        const operadorasData = await operadorasResponse.json();
        console.log(`Operadoras carregadas: ${operadorasData.length}`);
        setOperadoras(operadorasData);
      } else {
        console.error("Erro ao carregar operadoras:", operadorasResponse.status);
      }
      
      // Carregar prestadores - MELHORADO para priorizar Prestador_Nome_Fantasia
      try {
        console.log("Iniciando carregamento de prestadores...");
        const prestadoresResponse = await fetch(`${API_BASE_URL}/get_prestadores.php`);
        
        if (prestadoresResponse.ok) {
          const prestadoresData = await prestadoresResponse.json();
          console.log(`Prestadores carregados: ${prestadoresData.length}`);
          
          // Registrar alguns prestadores para verificar o formato dos dados
          if (prestadoresData.length > 0) {
            console.log("Amostra dos primeiros prestadores:", prestadoresData.slice(0, 3));
          }
          
          // Usar diretamente os dados retornados, que já devem priorizar o nome fantasia
          // mas garantir que qualquer processamento adicional seja feito se necessário
          const processedPrestadores = prestadoresData.map(p => ({
            ...p,
            // Garantir que o campo nome esteja presente e contenha o nome_fantasia quando disponível
            nome: p.nome || p.nome_fantasia || p.nome_original || `Prestador ${p.id}`
          }));
          
          // Ordenar por nome para facilitar a busca
          processedPrestadores.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
          
          setPrestadores(processedPrestadores);
        } else {
          console.error("Erro ao carregar prestadores:", prestadoresResponse.status);
          const errorText = await prestadoresResponse.text();
          console.error("Detalhes do erro:", errorText);
          throw new Error(`Erro ao carregar prestadores: ${prestadoresResponse.status}`);
        }
      } catch (error) {
        console.error("Erro detalhado ao carregar prestadores:", error);
        // Carregar alguns prestadores de exemplo para evitar falha completa
        setPrestadores([
          { id: 1, nome: "Exemplo Hospital A", nome_fantasia: "Exemplo Hospital A" },
          { id: 2, nome: "Exemplo Clínica B", nome_fantasia: "Exemplo Clínica B" }
        ]);
      }
      
      // Carregar finalidades de tratamento
      const finalidadesResponse = await fetch(`${API_BASE_URL}/get_finalidades_tratamento.php`);
      if (finalidadesResponse.ok) {
        const finalidadesData = await finalidadesResponse.json();
        console.log(`Finalidades carregadas: ${finalidadesData.length}`);
        setFinalidadeTratamento(finalidadesData);
      } else {
        console.error("Erro ao carregar finalidades:", finalidadesResponse.status);
      }
      
    } catch (error) {
      console.error("Erro geral ao carregar dados de referência:", error);
    }
  };
  
  // Pesquisar pacientes
  const searchPatients = async (term, type = 'nome') => {
    setSearchTerm(term);
    setSearchType(type);
    
    if (!term) {
      setFilteredPatients(patients);
      return patients;
    }
    
    // Normaliza o termo de busca para comparação insensível a maiúsculas/minúsculas
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
        // Busca em todos os campos se o tipo não for reconhecido
        filtered = patients.filter(patient => 
          (patient.Nome && patient.Nome.toLowerCase().includes(normalizedTerm)) ||
          (patient.Paciente_Codigo && patient.Paciente_Codigo.toLowerCase().includes(normalizedTerm)) ||
          (patient.CID && patient.CID.toLowerCase().includes(normalizedTerm))
        );
    }
    
    setFilteredPatients(filtered);
    return filtered;
  };

  const debugApiRequest = (url, method, data) => {
    console.group("Depuração da Requisição API");
    console.log("URL:", url);
    console.log("Método:", method);
    console.log("Dados enviados:", data);
    console.groupEnd();
  };

  // Adicionar paciente
  const addPatient = async (patientData) => {
    try {
      // Ativa o estado de carregamento para mostrar feedback visual ao usuário
      setLoading(true);
      
      // Faz a requisição POST para a API com os dados do paciente
      const response = await fetch(`${API_BASE_URL}/create_paciente.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData) // Converte o objeto JavaScript para uma string JSON
      });
      
      // Verifica se a resposta foi bem-sucedida (status 2xx)
      if (!response.ok) {
        throw new Error(`Erro ao adicionar paciente: ${response.status}`);
      }
      
      // Converte a resposta em JSON
      const data = await response.json();
      
      // Recarrega a lista de pacientes para incluir o novo paciente
      await loadPatients(true);
      
      // Mostra uma mensagem de sucesso
      showSuccessAlert("Paciente adicionado com sucesso");
      
      // Retorna o ID do novo paciente
      return data.id;
      
    } catch (error) {
      // Em caso de erro, registra no console e mostra uma mensagem ao usuário
      console.error("Erro ao adicionar paciente:", error);
      showErrorAlert("Erro ao adicionar paciente", error.message);
      throw error; // Propaga o erro para que possa ser tratado pelo chamador
    } finally {
      // Independentemente do resultado, desativa o estado de carregamento
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
        body: JSON.stringify(updateData) // Usar os dados originais com ID
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
  // Selecionar paciente
  const selectPatient = async (patientId) => {
    // Se patientId for null, limpar a seleção e retornar
    if (patientId === null) {
      setSelectedPatient(null);
      return;
    }
    
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
  const calculateAUC = (peso, idade, creatinina, sexo) => {
    // Verificar se os parâmetros são válidos
    if (peso <= 0 || idade <= 0 || creatinina <= 0 || !['M', 'F'].includes(sexo)) {
      return 'Parâmetros inválidos';
    }
    
    // AUC = ((((Peso x (140 - Idade)) / (72 x Creatinina)) x Sexo) + 25)
    const sexoFactor = sexo === 'F' ? 1 : 2;
    const auc = ((((peso * (140 - idade)) / (72 * creatinina)) * sexoFactor) + 25).toFixed(2);
    return auc;
  };
  
  // Calcular superfície corporal
  const calculateSC1 = (peso) => {
    // Verificar se o peso é válido
    if (peso <= 0) return 'Peso inválido';
    
    // FÓRMULA 1: SC (m²) = (Peso em kg x 4) + 7 / Peso em kg + 90
    const sc = ((peso * 4) + 7) / (peso + 90);
    return sc.toFixed(4);
  };
  
  const calculateSC2 = (peso, altura) => {
    // Verificar se os parâmetros são válidos
    if (peso <= 0 || altura <= 0) return 'Parâmetros inválidos';
    
    // FÓRMULA 2: SC (m²) = (Peso (kg) elevado a 0,5378) x (Estatura (cm) elevado a 0,3964) x 0,024265
    const sc = Math.pow(peso, 0.5378) * Math.pow(altura, 0.3964) * 0.024265;
    return sc.toFixed(4);
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
    searchType,
    operadoras,
    prestadores,
    finalidadeTratamento,
    initialized,
    setSelectedPatient,
    
    // Funções
    loadPatients,
    searchPatients,
    addPatient,
    updatePatient,
    deletePatient,
    selectPatient,
    loadReferenceData, // Adicione esta linha para exportar a função
    
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