import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
const API_BASE_URL = "https://apiteste.lowcostonco.com.br/backend-php/api/PacientesEmTratamento"; // Sem barra no final

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

  // Função para executar diagnóstico
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

  // Função para carregar os serviços de um protocolo
  // Esta função precisa ser definida antes de loadProtocoloDetails
  const loadProtocoloServicos = useCallback(async (protocoloId) => {
    if (!protocoloId) return [];

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/get_servicos_protocolo.php?id_protocolo=${protocoloId}`);
      const data = response.data;
      setProtocoloServicos(data);
      return data;
    } catch (err) {
      console.error("Erro ao carregar serviços do protocolo:", err);
      setProtocoloServicos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para carregar os protocolos
  const loadProtocolos = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
  
    try {
      // Verificar o cache
      const now = new Date().getTime();
      const cacheValid = lastFetch && (now - lastFetch < 300000); // 5 minutos
  
      if (cachedProtocolos && cacheValid && !forceRefresh) {
        setProtocolos(cachedProtocolos);
        setFilteredProtocolos(cachedProtocolos);
        setLoading(false);
        return cachedProtocolos;
      }
  
      // Se cache inválido ou forçar atualização
      const response = await axios.get(`${API_BASE_URL}/get_protocolos.php`);
      const data = response.data;
      
      // Log para depuração
      console.log("Dados recebidos da API:", data);
  
      // Atualizar estados
      setProtocolos(data);
      setFilteredProtocolos(data);
      setCachedProtocolos(data);
      setLastFetch(now);
      
      return data;
    } catch (err) {
      console.error("Erro ao carregar protocolos:", err);
      setError(err.message || 'Erro ao carregar protocolos');
      
      // Executar diagnóstico em caso de erro
      await runDiagnostic();
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [cachedProtocolos, lastFetch, runDiagnostic]);

  // Carregar protocolos na inicialização
  useEffect(() => {
    loadProtocolos();
  }, [loadProtocolos]);

  // Função para selecionar um protocolo
  const selectProtocolo = useCallback((protocoloId) => {
    if (!protocoloId) {
      setSelectedProtocolo(null);
      return Promise.resolve(null);
    }

    // Encontre o protocolo em cache
    const protocoloCache = protocolos.find(p => p.id === protocoloId);
    
    // Atualizar o estado selecionado
    setSelectedProtocolo(protocoloCache || null);
    
    // Retornar uma promessa que resolve para o protocolo
    return Promise.resolve(protocoloCache || null);
  }, [protocolos]);

  // Função para carregar detalhes do protocolo
  const loadProtocoloDetails = useCallback(async (protocoloId) => {
    if (!protocoloId) return null;
    
    try {
      // Carregar os serviços do protocolo
      await loadProtocoloServicos(protocoloId);
      
      // Se não estiver em cache, buscar da API
      if (!protocolos.some(p => p.id === protocoloId)) {
        const response = await axios.get(`${API_BASE_URL}/get_protocolo_by_id.php?id=${protocoloId}`);
        const protocoloDetails = response.data;
        
        // Atualizar o protocolo selecionado
        setSelectedProtocolo(protocoloDetails);
        
        return protocoloDetails;
      }
      
      return protocolos.find(p => p.id === protocoloId);
    } catch (err) {
      console.error("Erro ao carregar detalhes do protocolo:", err);
      setError(err.message || 'Erro ao carregar detalhes do protocolo');
      return null;
    }
  }, [protocolos, loadProtocoloServicos]);

  // Função para pesquisar protocolos
  const searchProtocolos = useCallback((term, type = 'nome') => {
    setSearchTerm(term);
    
    if (!term || term.trim() === '') {
      setFilteredProtocolos(protocolos);
      return Promise.resolve(protocolos);
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
    
    setFilteredProtocolos(filtered);
    return Promise.resolve(filtered);
  }, [protocolos]);

  // Função para buscar protocolos da API com termo de pesquisa
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

  // Função para adicionar um protocolo
  const addProtocolo = useCallback(async (protocoloData) => {
    try {
      setLoading(true);
      
      // Fazer requisição para API
      const response = await axios.post(`${API_BASE_URL}/add_protocolo.php`, protocoloData);
      const newProtocolo = response.data;
      
      // Atualizar estado local
      setProtocolos(prev => [...prev, newProtocolo]);
      setFilteredProtocolos(prev => [...prev, newProtocolo]);
      
      return newProtocolo.id;
    } catch (err) {
      console.error("Erro ao adicionar protocolo:", err);
      throw new Error(err.response?.data?.message || err.message || 'Erro ao adicionar protocolo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para atualizar um protocolo
  const updateProtocolo = useCallback(async (id, protocoloData) => {
    try {
      setLoading(true);
      
      // Log para depuração
      console.log("Atualizando protocolo ID:", id);
      console.log("Dados para atualização:", protocoloData);
      
      // Usar id_protocolo em vez de id na URL
      const response = await axios.put(`${API_BASE_URL}/update_protocolo.php?id_protocolo=${id}`, protocoloData);
      const updatedProtocolo = response.data.data || response.data;
      
      // Atualizar estado local
      setProtocolos(prev => 
        prev.map(p => p.id === id ? { ...p, ...updatedProtocolo } : p)
      );
      setFilteredProtocolos(prev => 
        prev.map(p => p.id === id ? { ...p, ...updatedProtocolo } : p)
      );
      
      // Atualizar protocolo selecionado se for o mesmo
      if (selectedProtocolo && selectedProtocolo.id === id) {
        setSelectedProtocolo({ ...selectedProtocolo, ...updatedProtocolo });
      }
      
      return updatedProtocolo;
    } catch (err) {
      console.error("Erro ao atualizar protocolo:", err);
      throw new Error(err.response?.data?.error || err.message || 'Erro ao atualizar protocolo');
    } finally {
      setLoading(false);
    }
  }, [selectedProtocolo]);

  // Função para excluir um protocolo
  const deleteProtocolo = useCallback(async (id) => {
    try {
      setLoading(true);
      
      // Verificar o formato do ID
      console.log("Tentando excluir protocolo com ID:", id);
      
      // Verificar se estamos usando id ou id_protocolo
      const protocoloToDelete = protocolos.find(p => 
        p.id === id || p.id_protocolo === id
      );
      
      if (!protocoloToDelete) {
        console.error("Protocolo não encontrado no estado local com ID:", id);
      } else {
        console.log("Protocolo a ser excluído:", protocoloToDelete);
      }
      
      // Garantir que estamos usando o ID correto na API
      const idToUse = protocoloToDelete?.id_protocolo || id;
      
      // Fazer requisição para API
      console.log(`Enviando DELETE para ${API_BASE_URL}/delete_protocolo.php?id=${idToUse}`);
      await axios.delete(`${API_BASE_URL}/delete_protocolo.php?id=${idToUse}`);
      
      // Atualizar estado local
      setProtocolos(prev => prev.filter(p => p.id !== id && p.id_protocolo !== id));
      setFilteredProtocolos(prev => prev.filter(p => p.id !== id && p.id_protocolo !== id));
      
      // Limpar seleção se for o mesmo protocolo
      if (selectedProtocolo && (selectedProtocolo.id === id || selectedProtocolo.id_protocolo === id)) {
        setSelectedProtocolo(null);
      }
      
      return true;
    } catch (err) {
      console.error("Erro ao excluir protocolo:", err);
      console.error("Detalhes da resposta:", err.response?.data);
      throw new Error(err.response?.data?.error || err.message || 'Erro ao excluir protocolo');
    } finally {
      setLoading(false);
    }
  }, [selectedProtocolo, protocolos]);

  // Função para adicionar um serviço a um protocolo
  const addServicoToProtocolo = useCallback(async (protocoloId, servicoData) => {
    try {
      setLoading(true);
      
      // Log detalhado dos dados que estão sendo enviados
      console.log("Adicionando serviço ao protocolo:", protocoloId);
      console.log("Dados do serviço:", JSON.stringify(servicoData, null, 2));
      
      // Certificar-se de que os dados estão corretos e incluem todos os campos
      const cleanedData = {
        id_servico: servicoData.id_servico || 1,
        Servico_Codigo: servicoData.Servico_Codigo || "",
        Dose: servicoData.Dose || "",         // Campo Dose (diferente de Dose_M)
        Dose_M: servicoData.Dose_M || "",
        Dose_Total: servicoData.Dose_Total || "",
        Dias_de_Aplic: servicoData.Dias_de_Aplic || "",
        Via_de_Adm: servicoData.Via_de_Adm || "",
        observacoes: servicoData.observacoes || ""  // Campo para observações
      };
      
      console.log("Dados limpos:", JSON.stringify(cleanedData, null, 2));
      
      // Chamar API com dados limpos
      const response = await axios.post(
        `${API_BASE_URL}/add_servico_protocolo.php?id_protocolo=${protocoloId}`, 
        cleanedData
      );
      
      console.log("Serviço adicionado com sucesso:", response.data);
      
      return response.data;
    } catch (err) {
      console.error("Erro ao adicionar serviço ao protocolo:", err);
      console.error("Detalhes do erro:", err.response?.data || "Sem detalhes adicionais");
      throw new Error(err.message || 'Erro ao adicionar serviço ao protocolo');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateServicoProtocolo = useCallback(async (protocoloId, servicoId, servicoData) => {
    try {
      setLoading(true);
      
      // Log detalhado dos dados que estão sendo enviados
      console.log("Atualizando serviço de protocolo:", protocoloId);
      console.log("ID do serviço:", servicoId);
      console.log("Dados do serviço:", JSON.stringify(servicoData, null, 2));
      
      // Preparar os dados para envio
      const dataToSend = {
        ...servicoData,
        id: servicoId,
        id_protocolo: protocoloId
      };
      
      // Chamada API para atualizar o serviço
      const response = await axios.put(
        `${API_BASE_URL}/update_servico_protocolo.php?id_protocolo=${protocoloId}&id=${servicoId}`, 
        dataToSend
      );
      
      console.log("Serviço atualizado com sucesso:", response.data);
      
      // Atualizar o estado local dos serviços
      setProtocoloServicos(prev => 
        prev.map(s => s.id == servicoId ? { ...s, ...servicoData } : s)
      );
      
      return response.data;
    } catch (err) {
      console.error("Erro ao atualizar serviço do protocolo:", err);
      console.error("Detalhes do erro:", err.response?.data || "Sem detalhes adicionais");
      throw new Error(err.message || 'Erro ao atualizar serviço do protocolo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para excluir um serviço de um protocolo
  const deleteServicoFromProtocolo = useCallback(async (protocoloId, servicoId) => {
    try {
      setLoading(true);
      
      // Fazer requisição para API
      await axios.delete(`${API_BASE_URL}/delete_servico_protocolo.php?id_protocolo=${protocoloId}&id_servico=${servicoId}`);
      
      // Atualizar estado local
      setProtocoloServicos(prev => prev.filter(s => s.id_servico !== servicoId));
      
      return true;
    } catch (err) {
      console.error("Erro ao excluir serviço do protocolo:", err);
      throw new Error(err.response?.data?.message || err.message || 'Erro ao excluir serviço do protocolo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Valor do contexto
  const contextValue = {
    protocolos,
    filteredProtocolos,
    selectedProtocolo,
    loading,
    error,
    searchTerm,
    protocoloServicos,
    diagnostico,
    selectProtocolo,
    loadProtocolos,
    loadProtocoloDetails,
    runDiagnostic,
    searchProtocolos,
    searchProtocolosApi,
    addProtocolo,
    updateProtocolo,
    deleteProtocolo,
    loadProtocoloServicos,
    addServicoToProtocolo,
    deleteServicoFromProtocolo,
    updateServicoProtocolo  // Adicione esta linha
  };

  return (
    <ProtocoloContext.Provider value={contextValue}>
      {children}
    </ProtocoloContext.Provider>
  );
};

export default ProtocoloContext;