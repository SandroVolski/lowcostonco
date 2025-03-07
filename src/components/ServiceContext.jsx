import React, { createContext, useState, useContext, useEffect } from "react";

// Criando o contexto
const ServiceContext = createContext();

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
  const [initialized, setInitialized] = useState(false);

  // Função para carregar os dados da API
  const loadServiceData = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `http://localhost/backend-php/api/get_services.php?page=${pageNum}&limit=500&order=${sortOrder}`
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar os dados: ${response.status}`);
      }
  
      const result = await response.json();
  
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são uma lista válida");
      }
  
      if (result.length === 0) {
        setHasMore(false);
      } else {
        // Mapeia os dados da API para o formato esperado
        const mappedData = result.map(item => ({
          id: item.id,
          codigoTUSS: item.Codigo_TUSS,
          Descricao_Apresentacao: item.Descricao_Apresentacao,
          Descricao_Resumida: item.Descricao_Resumida,
          Descricao_Comercial: item.Descricao_Comercial,
          Concentracao: item.Concentracao,
          Unidade_Fracionamento: item.UnidadeFracionamento,
          Fracionamento: item.Fracionamento,
          "Laboratório": item.Laboratorio,
          Revisado: item.Revisado,
          "Cód GGrem": item.Cod_Ggrem,
          Princípio_Ativo: item.PrincipioAtivo,
          Principio_Ativo: item.Principio_Ativo,
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
          Tabela: item.tabela,
          "Tabela Classe": item.tabela_classe,
          "Tabela tipo": item.tabela_tipo,
          "Classe JaraguaSul": item.classe_Jaragua_do_sul,
          "Classificação tipo": item.classificacao_tipo,
          Finalidade: item.finalidade,
          Objetivo: item.objetivo,
          "Via_Administração": item.Via_administracao,
          "Classe_Farmaceutica": item.ClasseFarmaceutica,
          "Princípio_Ativo_Classificado": item.PrincipioAtivoClassificado,
          FaseuGF: item.FaseUGF,
          Armazenamento: item.Armazenamento,
          Medicamento: item.tipo_medicamento,
          Descricao: item.UnidadeFracionamentoDescricao,
          Divisor: item.Divisor,
          "Fator_Conversão": item.id_fatorconversao,
          "ID Taxa": item.id_taxas,
          "tipo taxa": item.tipo_taxa,
          finalidade: item.TaxaFinalidade,
          "Tempo infusão": item.tempo_infusao
        }));

        if (reset) {
          setServiceData(mappedData);
        } else {
          setServiceData(prev => [...prev, ...mappedData]);
        }
        
        setInitialized(true);
      }
    } catch (error) {
      console.error("Erro ao buscar os serviços:", error);
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

  // Função para carregar mais dados
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadServiceData(nextPage);
    }
  };

  // Função para atualizar um serviço
  const updateService = (updatedService) => {
    setServiceData(prev => 
      prev.map(item => 
        item.id === updatedService.id ? { ...item, ...updatedService } : item
      )
    );
  };

  // Função para excluir um serviço
  const deleteService = (serviceId) => {
    setServiceData(prev => prev.filter(item => item.id !== serviceId));
  };

  // Atualiza quando a ordenação muda
  useEffect(() => {
    if (initialized) {
      resetAndLoad();
    }
  }, [sortOrder]);

  // Valores e funções a serem disponibilizados pelo contexto
  const value = {
    serviceData,
    loading,
    error,
    hasMore,
    sortOrder,
    initialized,
    setSortOrder,
    loadMore,
    loadServiceData,
    updateService,
    deleteService,
    resetAndLoad
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};