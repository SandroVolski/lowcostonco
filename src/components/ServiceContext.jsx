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
      
      const response = await fetch(
        `http://localhost/backend-php/api/get_services.php?page=${pageNum}&limit=500&order=${sortOrder}&orderBy=${sortField}`
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

  // Adicione esta função ao ServiceContext.js
  const addService = async (newService) => {
    // É importante garantir que a estrutura esteja correta antes de enviar
    const formattedService = formatServiceData(newService);
    console.log("Dados formatados sendo enviados:", formattedService);
    
    try {
      // Chamada à API
      const response = await fetch(`http://localhost/backend-php/api/insert_service.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedService),
      });
  
      // Captura o texto completo da resposta para depuração
      const responseText = await response.text();
      console.log("Resposta completa do servidor:", responseText);
      
      // Verificar se a resposta está vazia
      if (!responseText || responseText.trim() === '') {
        console.error("Resposta vazia do servidor");
        throw new Error('Resposta vazia do servidor');
      }
      
      // Se a resposta não for JSON válido, irá falhar aqui
      try {
        // Tente converter a resposta em JSON
        const result = JSON.parse(responseText);
        
        // Verificar se o resultado tem a estrutura esperada
        if (!result || !result.id) {
          console.warn("Resposta não contém um ID válido:", result);
          // Se não houver ID, mas não houver erro explícito, considere sucesso parcial
          return result.id || 0;
        }
        
        // Adiciona o id retornado pelo servidor ao novo serviço
        const serviceWithId = { 
          ...newService, 
          id: result.id 
        };
        
        // Adiciona no início da lista
        setServiceData(prev => [serviceWithId, ...prev]);
        
        return result.id;
      } catch (parseError) {
        console.error("Erro ao fazer parse da resposta:", parseError);
        console.error("Conteúdo da resposta:", responseText);
        
        // Verificar se a resposta contém sucesso mesmo não sendo JSON válido
        if (responseText.includes('sucesso') || responseText.includes('success')) {
          console.log("Resposta indica sucesso, mas não é JSON válido");
          return 0; // Retorna 0 como fallback para ID
        }
        
        throw new Error('Resposta inválida do servidor: não é JSON');
      }
    } catch (error) {
      console.error("Erro ao adicionar o serviço:", error);
      throw error;
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
    setSortOrder,
    setSortField,
    changeSort,
    loadMore,
    loadServiceData,
    updateService,
    deleteService,
    addService,
    resetAndLoad
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};