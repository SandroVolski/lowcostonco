import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

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
  const [sortField, setSortField] = useState("id"); // Novo estado para o campo de ordenação
  const [initialized, setInitialized] = useState(false);
  // Novos estados para pesquisa
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("auto"); // Novo: tipo de pesquisa (auto, code, active, description, all)
  const [totalResults, setTotalResults] = useState(0);

  // Função para ordenar os dados
  const changeSort = (field) => {
    // Se clicar no mesmo campo, inverte a direção
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Se clicar em um novo campo, configura para ordenação ascendente
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Função para carregar os dados da API
  const loadServiceData = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      
      // Construir URL de base
      let apiUrl = `http://localhost/backend-php/api/get_services.php?page=${pageNum}&limit=500&order=${sortOrder}&orderBy=${sortField}`;
      
      // Adicionar parâmetro de pesquisa se existir
      if (searchTerm) {
        apiUrl += `&search=${encodeURIComponent(searchTerm)}&searchType=${searchType}`;
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }
      
      console.log("Fazendo requisição para:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      });
      
      // Logging detalhado da resposta
      console.log("Status da resposta:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Detalhes do erro:", errorText);
        throw new Error(`Erro ao carregar os dados: ${response.status} - ${response.statusText}`);
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
          Cod: item.Cod,
          codigoTUSS: item.Codigo_TUSS,
          Descricao_Apresentacao: item.Descricao_Apresentacao,
          Descricao_Resumida: item.Descricao_Resumida,
          Descricao_Comercial: item.Descricao_Comercial,
          Concentracao: item.Concentracao,
          Unidade_Fracionamento: item.UnidadeFracionamento,
          Fracionamento: item.Fracionamento,
          "Laboratório": item.Laboratorio,
          Revisado: item.Revisado,
          "RegistroVisa": item.RegistroVisa,
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

        // Atualizar o total de resultados encontrados
        setTotalResults(mappedData.length);

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

  // Nova função para pesquisar diretamente na API
  // Nova função para pesquisar diretamente na API
  const searchServiceData = async (term, type = searchType) => {
    // Limpar resultados anteriores primeiro
    setServiceData([]);
    
    // Atualizar o estado com o novo termo e tipo
    setSearchTerm(term);
    setSearchType(type);
    
    // Garantir que estamos no modo de pesquisa
    setIsSearching(true);
    
    // Resetar a página e o estado "tem mais"
    setPage(1);
    setHasMore(true);
    
    // Iniciar carregamento
    setLoading(true);
    
    try {
      // Construir URL de pesquisa
      const apiUrl = `http://localhost/backend-php/api/get_services.php?page=1&limit=500&order=${sortOrder}&orderBy=${sortField}&search=${encodeURIComponent(term)}&searchType=${type}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar os dados: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são uma lista válida");
      }
      
      // Mapear os resultados usando o mesmo mapeamento da função loadServiceData
      const mappedData = result.map(item => ({
        id: item.id,
        Cod: item.Cod,
        codigoTUSS: item.Codigo_TUSS,
        Descricao_Apresentacao: item.Descricao_Apresentacao,
        Descricao_Resumida: item.Descricao_Resumida,
        Descricao_Comercial: item.Descricao_Comercial,
        Concentracao: item.Concentracao,
        Unidade_Fracionamento: item.UnidadeFracionamento,
        Fracionamento: item.Fracionamento,
        "Laboratório": item.Laboratorio,
        Revisado: item.Revisado,
        "RegistroVisa": item.RegistroVisa,
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
      
      // Atualizar dados e estado
      setServiceData(mappedData);
      setTotalResults(mappedData.length);
      setHasMore(false); // Em pesquisas, geralmente carregamos tudo de uma vez
      
    } catch (error) {
      console.error("Erro na pesquisa:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar a pesquisa
  // Função para limpar a pesquisa
  const clearSearch = async () => {
    // Limpar estados de pesquisa
    setSearchTerm("");
    setSearchType("auto");
    setIsSearching(false);
    
    // Resetar paginação
    setPage(1);
    setHasMore(true);
    
    // Limpar dados atuais
    setServiceData([]);
    
    // Iniciar carregamento
    setLoading(true);
    
    try {
      // Construir URL para carregar dados normais
      const apiUrl = `http://localhost/backend-php/api/get_services.php?page=1&limit=500&order=${sortOrder}&orderBy=${sortField}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar os dados: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!Array.isArray(result)) {
        throw new Error("Os dados recebidos não são uma lista válida");
      }
      
      // Mapear os resultados
      const mappedData = result.map(item => ({
        id: item.id,
        Cod: item.Cod,
        codigoTUSS: item.Codigo_TUSS,
        Descricao_Apresentacao: item.Descricao_Apresentacao,
        Descricao_Resumida: item.Descricao_Resumida,
        Descricao_Comercial: item.Descricao_Comercial,
        Concentracao: item.Concentracao,
        Unidade_Fracionamento: item.UnidadeFracionamento,
        Fracionamento: item.Fracionamento,
        "Laboratório": item.Laboratorio,
        Revisado: item.Revisado,
        "RegistroVisa": item.RegistroVisa,
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
      
      // Atualizar dados
      setServiceData(mappedData);
      
    } catch (error) {
      console.error("Erro ao limpar pesquisa:", error);
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

  const cleanServiceData = (data) => {
  // Cria uma cópia para não modificar o objeto original
  const cleanedData = { ...data };
  
  // Remove os campos que não devem ser enviados ao backend
  // e que estão causando erro de tipo no banco de dados
  delete cleanedData.UnidadeFracionamento;
  delete cleanedData.Unidade_Fracionamento;
  delete cleanedData.Descricao;
  delete cleanedData.UnidadeFracionamentoDescricao;
  delete cleanedData.PrincipioAtivo;
  delete cleanedData.PrincipioAtivoClassificado;
  delete cleanedData.TaxaFinalidade;
  delete cleanedData.tipo_taxa;
  delete cleanedData.tempo_infusao;
  delete cleanedData.ViaAdministracao;
  delete cleanedData.ClasseFarmaceutica;
  delete cleanedData.Armazenamento;
  delete cleanedData.tipo_medicamento;
  delete cleanedData.Fator_Conversão;
  delete cleanedData.tabela;
  delete cleanedData.tabela_classe;
  delete cleanedData.tabela_tipo;
  delete cleanedData.finalidade;
  delete cleanedData.objetivo;
  
  // Converte IDs para números inteiros
  const idFields = [
    'idPrincipioAtivo',
    'idUnidadeFracionamento',
    'idTaxas',
    'idTabela',
    'idViaAdministracao',
    'idClasseFarmaceutica',
    'idArmazenamento',
    'idMedicamento',
    'idFatorConversao'
  ];
  
  idFields.forEach(field => {
    if (cleanedData[field] && typeof cleanedData[field] === 'string') {
      cleanedData[field] = parseInt(cleanedData[field], 10);
    }
  });
  
  return cleanedData;
};

  // Adicione esta função ao ServiceContext.js
  const addService = async (serviceData) => {
    try {
      // Log dos dados originais (para debug)
      console.log("Dados originais:", serviceData);
      
      // Limpar os dados antes de enviar
      const cleanedData = cleanServiceData(serviceData);
      
      // Log dos dados limpos (para debug)
      console.log("Dados limpos para envio:", cleanedData);
      
      // Enviar dados limpos usando fetch em vez de api.post
      const response = await fetch('http://localhost/backend-php/api/insert_service.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData)
      });
      
      const responseData = await response.json();
      
      // Resto da sua função...
      if (responseData && responseData.id) {
        console.log("Serviço criado com sucesso, ID:", responseData.id);
        return responseData.id;
      } else {
        console.log("Resposta completa do servidor:", responseData);
        console.log("Resposta não contém um ID válido:", responseData);
        return null;
      }
    } catch (error) {
      console.error("Erro ao adicionar serviço:", error);
      return null;
    }
  };

  // Função formatServiceData corrigida para preservar os IDs
  const formatServiceData = (data) => {
    // Cria uma cópia para não modificar o original
    const formatted = { ...data };
    
    // IMPORTANTE: Primeiro, garanta que os IDs estejam definidos corretamente
    // Campos de ID para serem mantidos
    const idFields = [
      'idViaAdministracao', 
      'idClasseFarmaceutica', 
      'idPrincipioAtivo',
      'idArmazenamento', 
      'idMedicamento', 
      'idUnidadeFracionamento',
      'idFatorConversao', 
      'idTaxas',
      'idTabela'
    ];
    
    // Verificação de debug para os campos de ID
    console.log("IDs antes da formatação:", idFields.map(id => ({ [id]: data[id] })));
    
    // Garanta que os IDs sejam números ou null
    idFields.forEach(field => {
      if (formatted[field] === '' || formatted[field] === undefined) {
        formatted[field] = null;
      } else if (typeof formatted[field] === 'string') {
        formatted[field] = parseInt(formatted[field], 10);
      }
      // Verificação adicional para certificar-se que o ID é um número válido
      if (formatted[field] !== null && isNaN(formatted[field])) {
        console.warn(`Campo ${field} tem valor inválido:`, formatted[field]);
        formatted[field] = null;
      }
    });
    
    // IMPORTANTE: Verificar se temos dados de RegistroVisa
    const hasRegistroVisaData = formatted.RegistroVisa && formatted.RegistroVisa.trim() !== '';
    
    // Configurar o idRegistroVisa apenas se não existir e tivermos dados de RegistroVisa
    if (hasRegistroVisaData) {
      // Se temos um valor de RegistroVisa, usamos ele como ID
      formatted.idRegistroVisa = formatted.RegistroVisa;
      
      // IMPORTANTE: NÃO removemos os campos do RegistroVisa, pois eles precisam ser enviados para a API
      // Eles serão inseridos na tabela dregistro_anvisa
    } else {
      // Se não temos dados de RegistroVisa, removemos os campos relacionados
      delete formatted.RegistroVisa;
      delete formatted.Cod_Ggrem;
      delete formatted.Principio_Ativo;
      delete formatted.Lab;
      delete formatted.cnpj_lab;
      delete formatted.Classe_Terapeutica;
      delete formatted.Tipo_Porduto;
      delete formatted.Regime_Preco;
      delete formatted.Restricao_Hosp;
      delete formatted.Cap;
      delete formatted.Confaz87;
      delete formatted.Icms0;
      delete formatted.Lista;
      delete formatted.Status;
    }
    
    // Campos que devem estar na Tabela
    delete formatted.tabela;
    delete formatted.tabela_classe;
    delete formatted.tabela_tipo;
    delete formatted.classe_Jaragua_do_sul;
    delete formatted.classificacao_tipo;
    delete formatted.finalidade;
    delete formatted.objetivo;
    
    // Campos adicionais que podem estar em outras tabelas relacionadas
    // IMPORTANTE: NÃO remova os campos de ID que precisam ser preservados
    delete formatted.ViaAdministracao;
    delete formatted.ClasseFarmaceutica;
    delete formatted.PrincipioAtivo;
    delete formatted.PrincipioAtivoClassificado;
    delete formatted.FaseUGF;
    delete formatted.Armazenamento;
    delete formatted.Medicamento;
    delete formatted.UnidadeFracionamentoDescricao;
    delete formatted.Divisor;
    delete formatted.tipo_taxa;
    delete formatted.TaxaFinalidade;
    delete formatted.tempo_infusao;
    
    // IMPORTANTE: Remover campos que estão causando problemas com o banco de dados
    delete formatted.Via_administracao;
    delete formatted.tipo_medicamento;
    
    // Garantir que campos obrigatórios existam
    formatted.Cod = formatted.Cod || '';
    formatted.Codigo_TUSS = formatted.Codigo_TUSS || '';
    formatted.Descricao_Apresentacao = formatted.Descricao_Apresentacao || '';
    formatted.Revisado = formatted.Revisado || 0;
    
    // Limpar campos desnecessários ou temporários
    const fieldsToDelete = [
      'isEditing',
      'isAdding',
      'dropdownOptions'
    ];
    
    fieldsToDelete.forEach(field => {
      if (formatted[field] !== undefined) {
        delete formatted[field];
      }
    });
    
    // VERIFICAÇÃO FINAL: confirme que os IDs ainda estão presentes
    console.log("IDs após formatação:", idFields.map(id => ({ [id]: formatted[id] })));
    console.log("Dados formatados para envio:", formatted);
    
    return formatted;
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
  }, [sortField, sortOrder]);

  // Valores e funções a serem disponibilizados pelo contexto
  const value = {
    serviceData,
    loading,
    error,
    hasMore,
    sortOrder,
    sortField,
    initialized,
    // Novos valores para pesquisa
    searchTerm,
    searchType,
    isSearching,
    totalResults,
    // Funções existentes
    setSortOrder,
    setSortField,
    changeSort,
    loadMore,
    loadServiceData,
    updateService,
    deleteService,
    addService,
    resetAndLoad,
    // Novas funções para pesquisa
    searchServiceData,
    clearSearch
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};