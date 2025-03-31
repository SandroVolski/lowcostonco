import React, { useState, useEffect, useRef } from "react";
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import { DataTable } from '../../components/DataTable';
import PageTransition from "../../components/PageTransition";
import { useServiceData } from '../../components/ServiceContext'; // Importe o contexto
import { DropdownOptionsProvider, useDropdownOptions } from '../../components/DropdownOptionsContext';
import CacheControl from '../../components/CacheControl'; // Adicione esta importação
import DataRefreshButton from '../../components/DataRefreshButton';

import '../../App.css';
import './ServicoRelacionada.css';
import '../../utils/CustomAlerts.css'; // Importar CSS dos alertas personalizados

import { Search, Plus, Trash2, Edit, RefreshCw, X, Save, ArrowUpDown, ArrowDownWideNarrow, ArrowUpWideNarrow, Database } from "lucide-react";
import { 
  showSuccessAlert, 
  showErrorAlert, 
  showWarningAlert, 
  showInfoAlert, 
  showConfirmAlert,
  showSuccessPopup 
} from '../../utils/CustomAlerts'; // Importar funções de alerta personalizadas

export default function ServicoRelacionada() {
  // Componente principal que inclui o Provider
  return (
    <DropdownOptionsProvider>
      <ServicoRelacionadaContent />
    </DropdownOptionsProvider>
  );
}

function ServicoRelacionadaContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("auto"); // 'auto', 'code', 'active', 'description', 'all'
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  const [showCacheControl, setShowCacheControl] = useState(false);
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [dataSource, setDataSource] = useState(''); // 'cache' ou 'server'
  const [updatingRows, setUpdatingRows] = useState(new Set());

  const API_BASE_URL = "https://api.lowcostonco.com.br/backend-php/api";
  //  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState(null);

  // Referência para o componente DataTable para controlar expansão de colunas
  const dataTableRef = useRef(null);
  // Ref para o input de pesquisa
  const searchInputRef = useRef(null);
  
  const syncCacheAndInterface = async (operation, itemData) => {
    try {
      console.log(`Sincronizando cache e interface: operação ${operation}`, itemData);
  
      // ETAPA 1: Atualizar o cache local (localStorage)
      if (isCacheEnabled) {
        // Atualizar todas as chaves de cache relevantes
        const allCacheKeys = Object.keys(localStorage).filter(key => 
          (key.startsWith('services_') && !key.includes('_search_')) || 
          key.startsWith('cached_services_chunk_')
        );
  
        console.log(`Encontradas ${allCacheKeys.length} chaves de cache para atualização`);
  
        let cacheUpdated = false;
  
        for (const key of allCacheKeys) {
          try {
            // Obter e analisar dados do cache
            const cachedItem = localStorage.getItem(key);
            if (!cachedItem) continue;
  
            let cachedData = JSON.parse(cachedItem);
            let dataToUpdate;
            let isDataWrapped = false;
  
            // Determinar se os dados estão em um objeto wrapper ou direto
            if (cachedData.data !== undefined) {
              dataToUpdate = cachedData.data;
              isDataWrapped = true;
            } else {
              dataToUpdate = cachedData;
            }
  
            // Verificar se é um array
            if (!Array.isArray(dataToUpdate)) {
              console.log(`Ignorando chave ${key}, formato não suportado`);
              continue;
            }
  
            // Aplicar a operação de atualização
            let updatedData;
            switch (operation) {
              case 'update':
                updatedData = dataToUpdate.map(item => 
                  item.id === itemData.id ? { ...item, ...itemData } : item
                );
                break;
              case 'add':
                // Adicionar e ordenar por ID
                updatedData = [...dataToUpdate, itemData].sort((a, b) => Number(a.id) - Number(b.id));
                break;
              case 'delete':
                updatedData = dataToUpdate.filter(item => item.id !== itemData);
                break;
              default:
                console.warn(`Operação desconhecida: ${operation}`);
                continue;
            }
  
            // Atualizar o cache
            if (isDataWrapped) {
              cachedData.data = updatedData;
              localStorage.setItem(key, JSON.stringify(cachedData));
            } else {
              localStorage.setItem(key, JSON.stringify(updatedData));
            }
  
            cacheUpdated = true;
            console.log(`Cache atualizado para chave ${key}`);
          } catch (error) {
            console.error(`Erro ao atualizar chave ${key}:`, error);
          }
        }
  
        // Atualizar o timestamp de escrita se algo foi atualizado
        if (cacheUpdated) {
          if (typeof CacheService !== 'undefined' && CacheService.updateWriteTimestamp) {
            CacheService.updateWriteTimestamp();
          } else {
            localStorage.setItem('last_write_timestamp', Date.now().toString());
          }
        }
      }
  
      // ETAPA 2: Atualizar o estado React (interface do usuário)
      switch (operation) {
        case 'update':
          setServiceData(prevData => {
            // Encontrar e atualizar o item específico
            const updatedData = prevData.map(item => 
              item.id === itemData.id ? { ...item, ...itemData } : item
            );
            console.log("Estado da UI atualizado após operação de UPDATE");
            return updatedData;
          });
          break;
        case 'add':
          setServiceData(prevData => {
            // Adicionar o novo item e ordenar por ID
            const updatedData = [...prevData, itemData].sort((a, b) => Number(a.id) - Number(b.id));
            console.log("Estado da UI atualizado após operação de ADD");
            return updatedData;
          });
          break;
        case 'delete':
          setServiceData(prevData => {
            // Remover o item com o ID fornecido
            const updatedData = prevData.filter(item => item.id !== itemData);
            console.log("Estado da UI atualizado após operação de DELETE");
            return updatedData;
          });
          break;
      }
  
      // ETAPA 3: Forçar as alterações a serem refletidas no sistema subjacente
      // Atualiza serviços no contexto global (se disponível)
      if (operation === 'update' && typeof updateService === 'function') {
        updateService(itemData);
      } else if (operation === 'delete' && typeof deleteService === 'function') {
        deleteService(itemData);
      }
  
      // ETAPA 4: Atualizar a fonte de dados e mostrar feedback
      setDataSource('cache');
      showSuccessAlert("Dados atualizados com sucesso!", "", false, 1500);
      showCacheRefreshIndicator();
      
    } catch (error) {
      console.error("Erro ao sincronizar cache e interface:", error);
      // Se falhar a atualização seletiva, tentar uma abordagem mais simples
      try {
        // Atualizar o contexto global manualmente
        if (operation === 'update' && typeof updateService === 'function') {
          updateService(itemData);
        } else if (operation === 'delete' && typeof deleteService === 'function') {
          deleteService(itemData);
        }
        // Recarregar dados como fallback
        loadServiceData(1, true, false);
      } catch (innerError) {
        console.error("Erro no fallback de sincronização:", innerError);
      }
    }
  };

  // Função centralizada para atualizar dados após mutações
  const refreshDataAfterMutation = async () => {
    try {
      // 1. Primeiro, indique que os dados precisam de revalidação
      if (typeof forceRevalidation === 'function') {
        forceRevalidation();
      }
      
      // 2. Limpar o cache para forçar uma nova busca ao servidor
      clearServicesCache();
      
      // 3. Mostrar indicador visual de atualização
      showCacheRefreshIndicator();
      
      // 4. Definir a fonte dos dados como servidor
      setDataSource('server');
      
      // 5. Recarregar os dados
      await loadServiceData(1, true);
      
      // 6. Mostrar feedback ao usuário (opcional)
      showSuccessAlert("Dados atualizados automaticamente", "", false, 1500);
      
      console.log("Dados atualizados automaticamente após mutação");
    } catch (error) {
      console.error("Erro ao atualizar dados após mutação:", error);
    }
  };

  // Função para atualizar seletivamente o cache após mutações
  const updateCacheSelectively = async (operation, itemData) => {
    try {
      console.log(`Atualizando cache seletivamente: ${operation}`, itemData);

      // Não faremos nada se o cache não estiver habilitado
      if (!isCacheEnabled) {
        console.log("Cache não está habilitado, ignorando atualização seletiva");
        return;
      }

      // Sinalizar que o cache foi atualizado (para interface)
      showCacheRefreshIndicator();

      // Encontrar todas as chaves de cache que podem conter dados
      const allCacheKeys = Object.keys(localStorage).filter(key => 
        (key.startsWith('services_') && !key.includes('_search_')) || 
        key.startsWith(CacheService.CACHE_KEYS.SERVICES_CHUNK_PREFIX)
      );

      console.log(`Encontradas ${allCacheKeys.length} chaves de cache para atualização seletiva`);

      // Funções auxiliares para diferentes operações
      const updateCacheItem = (cacheData, item) => {
        // Se for um array, atualiza diretamente
        if (Array.isArray(cacheData)) {
          return cacheData.map(cacheItem => 
            cacheItem.id === item.id ? { ...cacheItem, ...item } : cacheItem
          );
        }
        // Se for um objeto com dados dentro, atualiza o array dentro
        else if (cacheData.data && Array.isArray(cacheData.data)) {
          return {
            ...cacheData,
            data: cacheData.data.map(cacheItem => 
              cacheItem.id === item.id ? { ...cacheItem, ...item } : cacheItem
            )
          };
        }
        return cacheData;
      };

      const addCacheItem = (cacheData, item) => {
        // Se for um array, adiciona diretamente
        if (Array.isArray(cacheData)) {
          // Adiciona o item mantendo a ordenação por ID
          const newArray = [...cacheData, item].sort((a, b) => a.id - b.id);
          return newArray;
        }
        // Se for um objeto com dados dentro, adiciona no array dentro
        else if (cacheData.data && Array.isArray(cacheData.data)) {
          return {
            ...cacheData,
            data: [...cacheData.data, item].sort((a, b) => a.id - b.id)
          };
        }
        return cacheData;
      };

      const deleteCacheItem = (cacheData, itemId) => {
        // Se for um array, filtra diretamente
        if (Array.isArray(cacheData)) {
          return cacheData.filter(cacheItem => cacheItem.id !== itemId);
        }
        // Se for um objeto com dados dentro, filtra o array dentro
        else if (cacheData.data && Array.isArray(cacheData.data)) {
          return {
            ...cacheData,
            data: cacheData.data.filter(cacheItem => cacheItem.id !== itemId)
          };
        }
        return cacheData;
      };

      // Processar cada chave de cache
      for (const key of allCacheKeys) {
        try {
          // Obter os dados do cache
          const cachedItem = localStorage.getItem(key);
          if (!cachedItem) continue;

          const cachedData = JSON.parse(cachedItem);
          let dataToUpdate;

          // Verificar se existe um campo data dentro do objeto
          if (cachedData.data !== undefined) {
            dataToUpdate = cachedData.data;
          } else {
            dataToUpdate = cachedData;
          }

          // Aplicar a operação seletiva adequada
          let updatedData;
          switch (operation) {
            case 'update':
              updatedData = updateCacheItem(dataToUpdate, itemData);
              break;
            case 'add':
              updatedData = addCacheItem(dataToUpdate, itemData);
              break;
            case 'delete':
              updatedData = deleteCacheItem(dataToUpdate, itemData);
              break;
            default:
              console.error(`Operação desconhecida: ${operation}`);
              continue;
          }

          // Atualizar dados no localStorage
          if (cachedData.data !== undefined) {
            cachedData.data = updatedData;
            localStorage.setItem(key, JSON.stringify(cachedData));
          } else {
            localStorage.setItem(key, JSON.stringify(updatedData));
          }

          console.log(`Cache atualizado seletivamente para a chave ${key}`);
        } catch (error) {
          console.error(`Erro ao atualizar cache para a chave ${key}:`, error);
        }
      }

      // Atualizar o timestamp do cache para indicar que houve alteração
      CacheService.updateWriteTimestamp();

      // Atualizar a interface para refletir as alterações
      // Vamos fazer isso de forma seletiva também, sem recarregar todos os dados
      switch (operation) {
        case 'update':
          // Atualizar no estado local
          setServiceData(prevData => 
            prevData.map(item => item.id === itemData.id ? { ...item, ...itemData } : item)
          );
          break;
        case 'add':
          // Adicionar ao estado local
          setServiceData(prevData => {
            const newData = [...prevData, itemData].sort((a, b) => a.id - b.id);
            return newData;
          });
          break;
        case 'delete':
          // Remover do estado local
          setServiceData(prevData => 
            prevData.filter(item => item.id !== itemData)
          );
          break;
      }

      // Mostrar feedback visual ao usuário
      setDataSource('cache');
      showSuccessAlert("Dados atualizados", "", false, 1000);
    } catch (error) {
      console.error("Erro na atualização seletiva do cache:", error);
    }
  };

  const refreshDataAfterModification = async () => {
    try {
      // 1. Notificar o usuário que a atualização está em andamento
      setLocalLoading(true);
      
      // 2. Primeiro, indicar que os dados precisam de revalidação
      if (typeof forceRevalidation === 'function') {
        forceRevalidation();
      }
      
      // 3. Limpar o cache para forçar uma nova busca ao servidor
      clearServicesCache();
      
      // 4. Recarregar dados 
      await loadServiceData(1, true);
      
      // 5. Opcional: Mostrar uma notificação rápida de atualização bem-sucedida
      setDataSource('server');
      showCacheRefreshIndicator();
      
      console.log("Dados atualizados automaticamente após modificação");
    } catch (error) {
      console.error("Erro ao atualizar dados após modificação:", error);
      showErrorAlert("Falha ao atualizar os dados", "Tente atualizar manualmente.");
    } finally {
      setLocalLoading(false);
    }
  };

  // Função para executar a busca diretamente a partir do valor atual do input
  const executeSearch = () => {
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      console.log("Executando busca com valor:", value);
      
      if (value.length >= 2) {
        // Atualizar estado local
        setSearchTerm(value);
        
        // Mostrar feedback visual de que a busca está em andamento
        setLocalLoading(true);
        
        // Executar a pesquisa
        searchServiceData(value, searchType)
          .finally(() => {
            setLocalLoading(false);
          });
          
      } else if (value.length === 0) {
        // Limpar se o campo estiver vazio
        setSearchTerm("");
        setLocalLoading(true);
        
        clearSearch()
          .finally(() => {
            setLocalLoading(false);
          });
          
      } else {
        // Caso tenha menos de 2 caracteres
        showWarningAlert("Pesquisa muito curta", "Digite pelo menos 2 caracteres para pesquisar.");
      }
    }
  };

  // Adicione esta função de utilidade para requisições com timeout
  const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
    // Criar um controlador de aborto para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Requisição abortada por timeout');
      }
      throw error;
    }
  };

  // Função otimizada para atualização rápida da interface com indicador de carregamento por linha
  const fastUpdateWithLoadingIndicator = async (operation, itemData) => {
    try {
      const itemId = operation === 'delete' ? itemData : itemData.id;
      console.log(`Iniciando operação ${operation} para item ${itemId}`);
      
      // ETAPA 1: Atualizar imediatamente a interface
      // Marcar a linha como "em atualização"
      setUpdatingRows(prev => {
        const newSet = new Set(prev);
        newSet.add(itemId);
        return newSet;
      });
      
      // ETAPA 2: Atualizar o estado local do React para feedback imediato
      switch (operation) {
        case 'update':
          setServiceData(prevData => {
            // Para atualização, substituir o item pelo item atualizado, mas adicionar
            // uma flag isUpdating para ser usada no renderizador
            return prevData.map(item => 
              item.id === itemData.id ? { ...itemData, isUpdating: true } : item
            );
          });
          break;
        case 'add':
          // Para adição, já mostramos o item como adicionado mas com indicador
          setServiceData(prevData => {
            const newItem = { ...itemData, isUpdating: true };
            const updatedData = [...prevData, newItem].sort((a, b) => Number(a.id) - Number(b.id));
            return updatedData;
          });
          break;
        case 'delete':
          // Para exclusão, não removemos imediatamente, mas mostramos como "sendo excluído"
          setServiceData(prevData => 
            prevData.map(item => 
              item.id === itemId ? { ...item, isDeleting: true } : item
            )
          );
          break;
      }
      
      // ETAPA 3: Atualizar o cache em segundo plano
      // Criar uma worker function que será executada em segundo plano
      const updateCacheAsync = async () => {
        // Atualização mínima do cache - apenas as chaves mais importantes
        // Para reduzir drasticamente o tempo de processamento
        try {
          // Apenas atualizar chaves de cache não relacionadas a buscas
          // E limitar a 5 chaves para evitar processamento excessivo
          const cacheKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('services_') && !key.includes('_search_'))
            .slice(0, 5);
          
          for (const key of cacheKeys) {
            try {
              const cachedItem = localStorage.getItem(key);
              if (!cachedItem) continue;
              
              let cachedData = JSON.parse(cachedItem);
              let dataArray;
              let isWrapped = false;
              
              if (cachedData.data && Array.isArray(cachedData.data)) {
                dataArray = cachedData.data;
                isWrapped = true;
              } else if (Array.isArray(cachedData)) {
                dataArray = cachedData;
              } else {
                continue; // Formato não reconhecido
              }
              
              // Aplicar a modificação baseada na operação
              let updatedArray;
              switch (operation) {
                case 'update':
                  updatedArray = dataArray.map(item => 
                    item.id === itemData.id ? { ...item, ...itemData } : item
                  );
                  break;
                case 'add':
                  updatedArray = [...dataArray, itemData]
                    .sort((a, b) => Number(a.id) - Number(b.id));
                  break;
                case 'delete':
                  updatedArray = dataArray.filter(item => item.id !== itemId);
                  break;
              }
              
              // Salvar de volta no cache
              if (isWrapped) {
                cachedData.data = updatedArray;
                localStorage.setItem(key, JSON.stringify(cachedData));
              } else {
                localStorage.setItem(key, JSON.stringify(updatedArray));
              }
            } catch (error) {
              console.warn(`Erro ao atualizar cache para chave ${key}:`, error);
              // Continuar com outras chaves mesmo se uma falhar
            }
          }
          
          // Atualizar timestamp de escrita
          if (typeof CacheService !== 'undefined' && CacheService.updateWriteTimestamp) {
            CacheService.updateWriteTimestamp();
          } else {
            localStorage.setItem('last_write_timestamp', Date.now().toString());
          }
        } catch (error) {
          console.error('Erro na atualização assíncrona do cache:', error);
        }
      };
      
      // Executar a atualização do cache em segundo plano
      setTimeout(updateCacheAsync, 0);
      
      // ETAPA 4: Após um curto período, remover o indicador de carregamento
      // Para operações rápidas, garantir que o indicador apareça por pelo menos 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Atualizar a interface para remover os indicadores
      setServiceData(prevData => {
        switch (operation) {
          case 'update':
          case 'add':
            return prevData.map(item => 
              item.id === itemId ? { ...item, isUpdating: false } : item
            );
          case 'delete':
            // Agora sim, remover o item do estado
            return prevData.filter(item => item.id !== itemId);
        }
        return prevData;
      });
      
      // Remover a linha da lista de linhas em atualização
      setUpdatingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      
      console.log(`Operação ${operation} para item ${itemId} concluída com sucesso`);
      
    } catch (error) {
      console.error(`Erro na atualização rápida para operação ${operation}:`, error);
      
      // Em caso de erro, tente atualizar a interface para remover o indicador
      try {
        setUpdatingRows(prev => {
          const newSet = new Set(prev);
          const itemId = operation === 'delete' ? itemData : itemData.id;
          newSet.delete(itemId);
          return newSet;
        });
        
        // Restaurar estado anterior em caso de erro
        if (operation === 'update' || operation === 'add') {
          setServiceData(prevData => 
            prevData.map(item => 
              item.id === itemData.id ? { ...item, isUpdating: false } : item
            )
          );
        } else if (operation === 'delete') {
          setServiceData(prevData => 
            prevData.map(item => 
              item.id === itemData ? { ...item, isDeleting: false } : item
            )
          );
        }
      } catch (innerError) {
        console.error('Erro ao limpar estado de atualização:', innerError);
      }
    }
  };

  // Manipulador de evento de input básico para manter o estado sincronizado
  const handleInput = () => {
    if (searchInputRef.current) {
      setSearchTerm(searchInputRef.current.value);
      // Não configura mais o debounce aqui
    }
  };

  // Manipulador para evento de Enter no input
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };
  
  // Função para limpar a pesquisa
  // Função para limpar a pesquisa
  const handleClearSearch = () => {
    // Limpar o campo de input
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    
    // Atualizar o estado local
    setSearchTerm("");
    setSearchType("auto");
    
    // Mostrar indicador de carregamento
    setLocalLoading(true);
    
    // Limpar a pesquisa no contexto de serviço
    clearSearch()
      .finally(() => {
        setLocalLoading(false);
      });
  };

  const resetNewServiceData = () => {
    return {
      Cod: '',
      Codigo_TUSS: '',
      Descricao_Apresentacao: '',
      Descricao_Resumida: '',
      Descricao_Comercial: '',
      Concentracao: '',
      Fracionamento: '',
      Laboratorio: '',
      Revisado_Farma: 0,
      
      // Campos de RegistroVisa
      RegistroVisa: '',
      Cod_Ggrem: '',
      Principio_Ativo: '',
      Lab: '',
      cnpj_lab: '',
      Classe_Terapeutica: '',
      Tipo_Porduto: '',
      Regime_Preco: '',
      Restricao_Hosp: '',
      Cap: '',
      Confaz87: '',
      Icms0: '',
      Lista: '',
      Status: '',
      
      // Campos de Tabela
      tabela: '',
      tabela_classe: '',
      tabela_tipo: '',
      classe_Jaragua_do_sul: '',
      classificacao_tipo: '',
      finalidade: '',
      objetivo: '',
      
      // Novos campos para armazenar os IDs
      idRegistroVisa: null,
      idViaAdministracao: null,
      idClasseFarmaceutica: null,
      idPrincipioAtivo: null,
      idArmazenamento: null,
      idMedicamento: null,
      idUnidadeFracionamento: null,
      idFatorConversao: null,
      idTaxas: null,
      idTabela: null,
  
      // Outros campos
      Via_administracao: '',
      ViaAdministracao: '',
      ClasseFarmaceutica: '',
      PrincipioAtivo: '',
      PrincipioAtivoClassificado: '',
      FaseUGF: '',
      Armazenamento: '',
      tipo_medicamento: '',
      
      // Unidade de Fracionamento
      UnidadeFracionamento: '',
      Unidade_Fracionamento: '',
      UnidadeFracionamentoDescricao: '',
      Descricao: '',
      Divisor: '',
      
      // Taxas
      tipo_taxa: '',
      TaxaFinalidade: '',
      tempo_infusao: ''
    };
  };

  const [newServiceData, setNewServiceData] = useState(resetNewServiceData());

  // Adicione este useEffect ao seu componente ServicoRelacionadaContent
  useEffect(() => {
    if (isAdding) {
      console.log('=== ESTADO DE newServiceData ATUALIZADO ===');
      console.log('Cod:', newServiceData.Cod);
      console.log('RegistroVisa:', newServiceData.RegistroVisa);
      console.log('idRegistroVisa:', newServiceData.idRegistroVisa);
      console.log('idViaAdministracao:', newServiceData.idViaAdministracao, 'tipo:', typeof newServiceData.idViaAdministracao);
      console.log('ViaAdministracao:', newServiceData.ViaAdministracao);
      console.log('idClasseFarmaceutica:', newServiceData.idClasseFarmaceutica);
      console.log('ClasseFarmaceutica:', newServiceData.ClasseFarmaceutica);
      console.log('idPrincipioAtivo:', newServiceData.idPrincipioAtivo);
      console.log('PrincipioAtivo:', newServiceData.PrincipioAtivo);
      console.log('idArmazenamento:', newServiceData.idArmazenamento);
      console.log('Armazenamento:', newServiceData.Armazenamento);
      console.log('idMedicamento:', newServiceData.idMedicamento);
      console.log('tipo_medicamento:', newServiceData.tipo_medicamento);
      console.log('idUnidadeFracionamento:', newServiceData.idUnidadeFracionamento);
      console.log('UnidadeFracionamento:', newServiceData.UnidadeFracionamento);
      console.log('idFatorConversao:', newServiceData.idFatorConversao);
      console.log('Fator_Conversão:', newServiceData.Fator_Conversão);
      console.log('idTaxas:', newServiceData.idTaxas);
      console.log('TaxaFinalidade:', newServiceData.TaxaFinalidade);
      console.log('============================================');
    }
  }, [newServiceData, isAdding, updateCounter]);

  // Usando o contexto de serviços com as propriedades de ordenação
  const { 
    serviceData, 
    loading, 
    error, 
    hasMore, 
    sortOrder, 
    sortField,
    setSortOrder,
    setSortField,
    changeSort,
    loadMore,
    updateService,
    deleteService,
    loadServiceData,
    initialized,
    addService,
    // Estados e funções do cache
    isCacheEnabled,
    clearCache: clearServicesCache,
    // Novos valores para pesquisa
    searchTerm: apiSearchTerm,
    searchType: apiSearchType,
    isSearching,
    totalResults,
    searchServiceData,
    clearSearch
  } = useServiceData();

  const { dropdownOptions } = useDropdownOptions();
  
  useEffect(() => {
    // Somente carrega os dados automaticamente se não estiverem inicializados
    if (!initialized && !loading && serviceData.length === 0) {
      // Adicione um indicador para o loadServiceData usar prioritariamente o cache
      loadServiceData(1, true, true, true); // O último true indica "useCacheFirst"
    }
  }, [initialized, loading, serviceData.length, loadServiceData]);
  

  // Função para alternar a seleção de uma linha
  const toggleRowSelection = (rowId) => {
    if (isEditing) return; // Não permite desselecionar durante a edição

    const adjustedRowId = Number(rowId);
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adjustedRowId)) {
        newSet.delete(adjustedRowId);
      } else {
        newSet.clear();
        newSet.add(adjustedRowId);
      }
      console.log("Linha selecionada:", adjustedRowId);
      return newSet;
    });
  };

  const handleLoadData = () => {
    // Se estiver em modo de pesquisa, limpar a pesquisa
    if (isSearching) {
      clearSearch();
      setSearchTerm("");
    } else {
      loadServiceData(1, true);
    }
  };

  // 3. Modificação para handleDelete (excluir item)
  const handleDelete = async () => {
    const selectedRowId = Array.from(selectedRows)[0];
    if (!selectedRowId) return;
  
    // Confirmar exclusão com o usuário
    const confirmResult = await showConfirmAlert(
      "Tem certeza que deseja excluir este serviço?", 
      "Esta ação não pode ser desfeita."
    );
    
    if (!confirmResult) return; // Usuário cancelou a exclusão
  
    try {
      setLocalLoading(true);
      
      // Usar fetch com timeout
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/delete_service.php?id=${selectedRowId}`,
        { method: 'DELETE' },
        15000 // 15 segundos de timeout
      );
  
      if (!response.ok) {
        throw new Error("Erro ao excluir o serviço");
      }
  
      // Atualizar o estado global
      deleteService(selectedRowId);
      
      // Limpar a seleção
      setSelectedRows(new Set());
  
      // Feedback de sucesso
      showSuccessAlert("Serviço excluído com sucesso!");
      
      // Usar a nova função otimizada
      await refreshDataAfterModification();
      
    } catch (error) {
      console.error("Erro ao excluir o serviço:", error);
      showErrorAlert("Falha ao excluir", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  // Função para habilitar a edição de uma linha
  const handleEdit = () => {
    const selectedRowId = Array.from(selectedRows)[0];
    if (!selectedRowId) {
      showWarningAlert("Selecione um serviço", "Você precisa selecionar um serviço para editar.");
      return;
    }
  
    const rowToEdit = serviceData.find(item => item.id === selectedRowId);
    if (!rowToEdit) {
      showErrorAlert("Serviço não encontrado", "O serviço selecionado não foi encontrado.");
      return;
    }
  
    console.log("Dados originais para edição:", rowToEdit);
    setEditingRow(selectedRowId);
    setEditedData(rowToEdit);
    setIsEditing(true);
  };
  
  const handleCancel = async () => {
    // Se estiver editando, confirmar com o usuário antes de cancelar
    if (isEditing) {
      const confirmCancel = await showConfirmAlert(
        "Deseja cancelar a edição?",
        "Todas as alterações feitas serão perdidas."
      );
      
      if (!confirmCancel) {
        return; // Usuário não quer cancelar a edição
      }
    }
    
    setEditingRow(null);
    setEditedData({});
    setIsEditing(false);
  };

  // Função modificada para colapsar cabeçalhos expandidos antes de adicionar
  const handleAdd = () => {
    // First collapse all expanded headers if any
    if (dataTableRef.current && typeof dataTableRef.current.collapseAllHeaders === 'function') {
      dataTableRef.current.collapseAllHeaders();
      console.log("Colapsando todas as seções expandidas antes de adicionar");
    }
    
    setIsAdding(true);
    setNewServiceData(resetNewServiceData());
    setSelectedRows(new Set()); // Limpa qualquer seleção existente
  };

  const handleCancelAdd = async () => {
    // Verificar se há campos preenchidos antes de cancelar
    const hasData = Object.entries(newServiceData).some(([key, value]) => {
      // Ignorar campos que começam com "id" e verificar se campos de texto têm conteúdo
      return !key.startsWith('id') && 
             typeof value === 'string' && 
             value.trim() !== '' && 
             key !== 'Revisado_Farma';
    });
    
    setIsAdding(false);
    setNewServiceData(resetNewServiceData());
  };

  // 1. Modificação para handleSaveNew (adicionar item)
  const handleSaveNew = async () => {
    // Validação básica
    if (!newServiceData.Cod) {
      showWarningAlert("Campo obrigatório", "Por favor, preencha o Código.");
      return;
    }
  
    // Verificar se há campos de RegistroVisa preenchidos sem o RegistroVisa principal
    const hasRegistroVisaFields = [
      'Cod_Ggrem', 'Lab', 'cnpj_lab', 'Classe_Terapeutica', 
      'Tipo_Porduto', 'Regime_Preco', 'Restricao_Hosp', 'Cap', 
      'Confaz87', 'Icms0', 'Lista', 'Status', 'Principio_Ativo'
    ].some(field => newServiceData[field] && newServiceData[field].trim() !== '');
    
    if (hasRegistroVisaFields && (!newServiceData.RegistroVisa || newServiceData.RegistroVisa.trim() === '')) {
      showWarningAlert(
        "Campo obrigatório", 
        "Você preencheu campos do Registro Visa, mas o campo 'RegistroVisa' é obrigatório."
      );
      
      if (dataTableRef.current && typeof dataTableRef.current.expandHeader === 'function') {
        dataTableRef.current.expandHeader("Registro Visa");
      }
      
      return;
    }
    
    // Preparar os dados para envio
    const dataToSend = { ...newServiceData };
    
    console.group('DADOS ORIGINAIS ANTES DE FILTRAR:');
    console.log('idUnidadeFracionamento:', dataToSend.idUnidadeFracionamento);
    console.log('UnidadeFracionamento:', dataToSend.UnidadeFracionamento);
    console.log('Unidade_Fracionamento:', dataToSend.Unidade_Fracionamento);
    console.log('UnidadeFracionamentoDescricao:', dataToSend.UnidadeFracionamentoDescricao);
    console.log('Descricao:', dataToSend.Descricao);
    console.log('Divisor:', dataToSend.Divisor);
    console.groupEnd();
  
    // Remover campos que podem causar conflitos de tipo
    if (!dataToSend.UnidadeFracionamentoDescricao && dataToSend.Descricao) {
      dataToSend.UnidadeFracionamentoDescricao = dataToSend.Descricao;
    } else if (dataToSend.UnidadeFracionamentoDescricao && !dataToSend.Descricao) {
      dataToSend.Descricao = dataToSend.UnidadeFracionamentoDescricao;
    }
    
    if (dataToSend.idPrincipioAtivo) {
      delete dataToSend.PrincipioAtivo;
      delete dataToSend.Principio_Ativo;
    }
    
    if (dataToSend.idViaAdministracao) {
      delete dataToSend.ViaAdministracao;
      delete dataToSend.Via_Administração;
      delete dataToSend.Via_administracao;
    }
    
    if (dataToSend.idClasseFarmaceutica) {
      delete dataToSend.ClasseFarmaceutica;
      delete dataToSend.Classe_Farmaceutica;
    }
    
    if (dataToSend.idTaxas) {
      delete dataToSend.TaxaFinalidade;
      delete dataToSend.finalidade;
      delete dataToSend["tipo taxa"];
      delete dataToSend.tipo_taxa;
      delete dataToSend["Tempo infusão"];
      delete dataToSend.tempo_infusao;
    }
    
    if (dataToSend.idMedicamento) {
      delete dataToSend.tipo_medicamento;
      delete dataToSend.Medicamento;
    }
    
    if (dataToSend.idFatorConversao) {
      delete dataToSend.Fator_Conversão;
      delete dataToSend.fator;
    }
    
    console.group('DADOS A SEREM SALVOS (LIMPOS):');
    console.log('Dados filtrados a serem enviados:', dataToSend);
    console.groupEnd();
  
    try {
      setLocalLoading(true);
      
      // Usar fetch com timeout para evitar esperas infinitas
      const serviceId = await addService(dataToSend);
      
      setIsAdding(false);
      handleCancelAdd();
      
      // Feedback de sucesso
      showSuccessPopup({ id: serviceId, cod: dataToSend.Cod }, false, 3000);
      
      // Adicionar ID ao item
      const completeItem = {
        ...dataToSend,
        id: serviceId
      };
      
      // Usar a nova função otimizada
      await refreshDataAfterModification();
      
    } catch (error) {
      console.error("Erro ao adicionar o serviço:", error);
      showErrorAlert("Falha ao adicionar serviço", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  // CORRIGIDA: Função para capturar as alterações nos campos do novo serviço
  const handleNewInputChange = (e, field) => {
    const { value } = e.target;
    
    // IMPORTANTE: Use a sintaxe de função para garantir o estado mais atualizado
    setNewServiceData(prevData => ({
      ...prevData,
      [field]: value // Armazena o valor completo do input, não apenas o último caractere
    }));
  };
  
  // CORRIGIDA: Função para capturar as alterações nos campos editáveis
  const handleInputChange = (e, field) => {
    const { value } = e.target;
    
    // Use a sintaxe de função para garantir o estado mais atualizado
    setEditedData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  // Função para lidar com a alteração do tipo de pesquisa
  const handleSearchTypeChange = (type) => {
    // Se já existe um termo de pesquisa, refazer a pesquisa com o novo tipo
    if (searchTerm.trim().length >= 2) {
      setSearchType(type);
      
      if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
      }
      
      // Aplicar a pesquisa imediatamente com o novo tipo
      searchServiceData(searchTerm.trim(), type);
    }
  };

  // CORRIGIDA: Função handleNewDropdownChange
  const handleNewDropdownChange = (e, field) => {
    const value = e.target.value;
    const selectedId = value ? parseInt(value, 10) : null;
    
    console.log(`Dropdown ${field} mudou para ${value}`);
    
    // Crie uma cópia do estado atual para fazer modificações
    const updatedData = { ...newServiceData };
    
    // Dependendo do campo, atualize diferentes campos relacionados
    switch(field) {
      case 'PrincipioAtivo':
      if (value) {
        // Encontrar o objeto do princípio ativo selecionado
        const selectedPrincipio = dropdownOptions.principioAtivo.find(
          p => String(p.idPrincipioAtivo) === String(value)
        );
        
        if (selectedPrincipio) {
          console.log("Princípio ativo encontrado:", selectedPrincipio);
          
          // Atualizar ID
          updatedData.idPrincipioAtivo = selectedId;
          
          // Preencher campos relacionados - Agora com nomes corretos
          updatedData.PrincipioAtivo = selectedPrincipio.PrincipioAtivo;
          updatedData.Principio_Ativo = selectedPrincipio.PrincipioAtivo;
          updatedData.PrincipioAtivoClassificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
          updatedData.Princípio_Ativo_Classificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
          updatedData.FaseUGF = selectedPrincipio.FaseUGF || '';
          updatedData.FaseuGF = selectedPrincipio.FaseUGF || '';
          
          // Log detalhado para debugging
          console.group("Campos de PrincipioAtivo atualizados:");
          console.log("  idPrincipioAtivo:", updatedData.idPrincipioAtivo);
          console.log("  PrincipioAtivo:", updatedData.PrincipioAtivo);
          console.log("  Principio_Ativo:", updatedData.Principio_Ativo);
          console.log("  PrincipioAtivoClassificado:", updatedData.PrincipioAtivoClassificado);
          console.log("  FaseUGF:", updatedData.FaseUGF);
          console.groupEnd();
        }
      } else {
        // Limpar campos se não houver seleção
        updatedData.idPrincipioAtivo = null;
        updatedData.PrincipioAtivo = '';
        updatedData.Principio_Ativo = '';
        updatedData.PrincipioAtivoClassificado = '';
        updatedData.Princípio_Ativo_Classificado = '';
        updatedData.FaseUGF = '';
        updatedData.FaseuGF = '';
      }
        break;
        
        case 'UnidadeFracionamento':
          if (value) {
            const selectedUnidade = dropdownOptions.unidadeFracionamento.find(
              u => String(u.id_unidadefracionamento) === String(value)
            );
            
            if (selectedUnidade) {
              console.log("Unidade de fracionamento encontrada:", selectedUnidade);
              
              // Atualizar ID
              updatedData.idUnidadeFracionamento = selectedId;
              
              // IMPORTANTE: Preencher todos os campos relacionados corretamente
              updatedData.UnidadeFracionamento = selectedUnidade.UnidadeFracionamento;
              updatedData.Unidade_Fracionamento = selectedUnidade.UnidadeFracionamento;
              updatedData.UnidadeFracionamentoDescricao = selectedUnidade.Descricao || '';
              updatedData.Descricao = selectedUnidade.Descricao || '';
              updatedData.Divisor = selectedUnidade.Divisor || '';
              
              // Log detalhado para debugging
              console.group("Campos de UnidadeFracionamento atualizados:");
              console.log("  idUnidadeFracionamento:", updatedData.idUnidadeFracionamento);
              console.log("  UnidadeFracionamento:", updatedData.UnidadeFracionamento);
              console.log("  Unidade_Fracionamento:", updatedData.Unidade_Fracionamento);
              console.log("  UnidadeFracionamentoDescricao:", updatedData.UnidadeFracionamentoDescricao);
              console.log("  Descricao:", updatedData.Descricao);
              console.log("  Divisor:", updatedData.Divisor);
              console.groupEnd();
            }
          } else {
            // Limpar campos se não houver seleção
            updatedData.idUnidadeFracionamento = null;
            updatedData.UnidadeFracionamento = '';
            updatedData.Unidade_Fracionamento = '';
            updatedData.UnidadeFracionamentoDescricao = '';
            updatedData.Descricao = '';
            updatedData.Divisor = '';
          }
          break;
        
      case 'Taxas':
        if (value) {
          const selectedTaxa = dropdownOptions.taxas.find(
            t => String(t.id_taxas) === String(value)
          );
          
          if (selectedTaxa) {
            console.log("Taxa encontrada:", selectedTaxa);
            
            // Atualizar ID
            updatedData.idTaxas = selectedId;
            
            // Preencher campos relacionados
            updatedData.TaxaFinalidade = selectedTaxa.finalidade;
            updatedData.finalidade = selectedTaxa.finalidade;
            updatedData.tipo_taxa = selectedTaxa.tipo_taxa || '';
            updatedData["tipo taxa"] = selectedTaxa.tipo_taxa || '';
            updatedData.tempo_infusao = selectedTaxa.tempo_infusao || '';
            updatedData["Tempo infusão"] = selectedTaxa.tempo_infusao || '';
            updatedData.id_taxa = selectedTaxa.id_taxas;
            updatedData["ID Taxa"] = selectedTaxa.id_taxas;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idTaxas = null;
          updatedData.TaxaFinalidade = '';
          updatedData.finalidade = '';
          updatedData.tipo_taxa = '';
          updatedData["tipo taxa"] = '';
          updatedData.tempo_infusao = '';
          updatedData["Tempo infusão"] = '';
          updatedData.id_taxa = '';
          updatedData["ID Taxa"] = '';
        }
        break;
        
      case 'ViaAdministracao':
        if (value) {
          const selectedVia = dropdownOptions.viaAdministracao.find(
            v => String(v.idviaadministracao) === String(value)
          );
          
          if (selectedVia) {
            console.log("Via de administração encontrada:", selectedVia);
            
            // Atualizar ID
            updatedData.idViaAdministracao = selectedId;
            
            // Preencher campos relacionados
            updatedData.ViaAdministracao = selectedVia.Via_administracao;
            updatedData.Via_Administração = selectedVia.Via_administracao;
            updatedData.Via_administracao = selectedVia.Via_administracao;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idViaAdministracao = null;
          updatedData.ViaAdministracao = '';
          updatedData.Via_Administração = '';
          updatedData.Via_administracao = '';
        }
        break;
        
      case 'ClasseFarmaceutica':
        if (value) {
          const selectedClasse = dropdownOptions.classeFarmaceutica.find(
            c => String(c.id_medicamento) === String(value)
          );
          
          if (selectedClasse) {
            console.log("Classe farmacêutica encontrada:", selectedClasse);
            
            // Atualizar ID
            updatedData.idClasseFarmaceutica = selectedId;
            
            // Preencher campos relacionados
            updatedData.ClasseFarmaceutica = selectedClasse.ClasseFarmaceutica;
            updatedData.Classe_Farmaceutica = selectedClasse.ClasseFarmaceutica;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idClasseFarmaceutica = null;
          updatedData.ClasseFarmaceutica = '';
          updatedData.Classe_Farmaceutica = '';
        }
        break;
        
      case 'Armazenamento':
        if (value) {
          const selectedArm = dropdownOptions.armazenamento.find(
            a => String(a.idArmazenamento) === String(value)
          );
          
          if (selectedArm) {
            console.log("Armazenamento encontrado:", selectedArm);
            
            // Atualizar ID
            updatedData.idArmazenamento = selectedId;
            
            // Preencher campos relacionados
            updatedData.Armazenamento = selectedArm.Armazenamento;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idArmazenamento = null;
          updatedData.Armazenamento = '';
        }
        break;
        
      case 'tipo_medicamento':
        if (value) {
          const selectedMed = dropdownOptions.tipoMedicamento.find(
            m => String(m.id_medicamento) === String(value)
          );
          
          if (selectedMed) {
            console.log("Medicamento encontrado:", selectedMed);
            
            // Atualizar ID
            updatedData.idMedicamento = selectedId;
            
            // Preencher campos relacionados
            updatedData.tipo_medicamento = selectedMed.tipo_medicamento;
            updatedData.Medicamento = selectedMed.tipo_medicamento;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idMedicamento = null;
          updatedData.tipo_medicamento = '';
          updatedData.Medicamento = '';
        }
        break;
        
      case 'FatorConversao':
        if (value) {
          const selectedFator = dropdownOptions.fatorConversao.find(
            f => String(f.id_fatorconversao) === String(value)
          );
          
          if (selectedFator) {
            console.log("Fator de conversão encontrado:", selectedFator);
            
            // Atualizar ID
            updatedData.idFatorConversao = selectedId;
            
            // Preencher campos relacionados
            updatedData.Fator_Conversão = selectedFator.fator;
            updatedData.fator = selectedFator.fator;
          }
        } else {
          // Limpar campos se não houver seleção
          updatedData.idFatorConversao = null;
          updatedData.Fator_Conversão = '';
          updatedData.fator = '';
        }
        break;

        case 'Tabela':
          if (value) {
            // Encontrar o objeto da tabela selecionada
            const selectedTabela = dropdownOptions.tabela.find(
              t => String(t.id_tabela) === String(value)
            );
            
            if (selectedTabela) {
              console.log("Tabela encontrada:", selectedTabela);
              
              // Atualizar ID
              updatedData.idTabela = selectedId;
              
              // Preencher campos relacionados
              updatedData.tabela = selectedTabela.tabela;
              updatedData.tabela_classe = selectedTabela.tabela_classe || '';
              updatedData.tabela_tipo = selectedTabela.tabela_tipo || '';
              updatedData.classe_Jaragua_do_sul = selectedTabela.classe_Jaragua_do_sul || '';
              updatedData.classificacao_tipo = selectedTabela.classificacao_tipo || '';
              updatedData.finalidade = selectedTabela.finalidade || '';
              updatedData.objetivo = selectedTabela.objetivo || '';
            }
          } else {
            // Limpar campos se não houver seleção
            updatedData.idTabela = null;
            updatedData.tabela = '';
            updatedData.tabela_classe = '';
            updatedData.tabela_tipo = '';
            updatedData.classe_Jaragua_do_sul = '';
            updatedData.classificacao_tipo = '';
            updatedData.finalidade = '';
            updatedData.objetivo = '';
          }
          break;
        
      default:
        console.error(`Campo não reconhecido: ${field}`);
    }
    
    // Atualizar o estado com os novos dados
    setNewServiceData(updatedData);
    
    // IMPORTANTE: Forçar atualização com o trigger
    setUpdateCounter(prev => prev + 1);
    
    console.log("Estado atualizado para:", updatedData);
  };

  // Função para lidar com alterações nos dropdowns durante a edição
  // Substitua a função handleDropdownChange atual por esta versão completa
  const handleDropdownChange = (e, field) => {
    const value = e.target.value;
    const selectedId = value ? parseInt(value, 10) : null;
    
    console.log(`Edit dropdown changed: ${field}, selectedId: ${selectedId}`);
    
    // Similar ao handleNewDropdownChange, mas para o modo de edição
    const updatedData = { ...editedData };
    
    switch(field) {
      case 'ViaAdministracao':
        if (value) {
          const selectedVia = dropdownOptions.viaAdministracao.find(
            v => String(v.idviaadministracao) === String(value)
          );
          
          if (selectedVia) {
            console.log('Found matching Via for edit:', selectedVia);
            
            updatedData.idViaAdministracao = selectedId;
            updatedData.Via_Administração = selectedVia.Via_administracao;
            updatedData.ViaAdministracao = selectedVia.Via_administracao;
            updatedData.Via_administracao = selectedVia.Via_administracao;
          }
        } else {
          updatedData.idViaAdministracao = null;
          updatedData.Via_Administração = '';
          updatedData.ViaAdministracao = '';
          updatedData.Via_administracao = '';
        }
        break;
        
      case 'ClasseFarmaceutica':
        if (value) {
          const selectedClasse = dropdownOptions.classeFarmaceutica.find(
            c => String(c.id_medicamento) === String(value)
          );
          
          if (selectedClasse) {
            updatedData.idClasseFarmaceutica = selectedId;
            updatedData.Classe_Farmaceutica = selectedClasse.ClasseFarmaceutica;
            updatedData.ClasseFarmaceutica = selectedClasse.ClasseFarmaceutica;
          }
        } else {
          updatedData.idClasseFarmaceutica = null;
          updatedData.Classe_Farmaceutica = '';
          updatedData.ClasseFarmaceutica = '';
        }
        break;
        
      case 'PrincipioAtivo':
        if (value) {
          const selectedPrincipio = dropdownOptions.principioAtivo.find(
            p => String(p.idPrincipioAtivo) === String(value)
          );
          
          if (selectedPrincipio) {
            updatedData.idPrincipioAtivo = selectedId;
            updatedData["Princípio Ativo"] = selectedPrincipio.PrincipioAtivo;
            updatedData.Principio_Ativo = selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivo = selectedPrincipio.PrincipioAtivo;
            updatedData.Princípio_Ativo_Classificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.PrincipioAtivoClassificado = selectedPrincipio.PrincipioAtivoClassificado || selectedPrincipio.PrincipioAtivo;
            updatedData.FaseuGF = selectedPrincipio.FaseUGF || '';
            updatedData.FaseUGF = selectedPrincipio.FaseUGF || '';
          }
        } else {
          updatedData.idPrincipioAtivo = null;
          updatedData["Princípio Ativo"] = '';
          updatedData.Principio_Ativo = '';
          updatedData.PrincipioAtivo = '';
          updatedData.Princípio_Ativo_Classificado = '';
          updatedData.PrincipioAtivoClassificado = '';
          updatedData.FaseuGF = '';
          updatedData.FaseUGF = '';
        }
        break;

      case 'UnidadeFracionamento':
        if (value) {
          const selectedUnidade = dropdownOptions.unidadeFracionamento.find(
            u => String(u.id_unidadefracionamento) === String(value)
          );
          
          if (selectedUnidade) {
            console.log('Found matching Unidade for edit:', selectedUnidade);
            
            updatedData.idUnidadeFracionamento = selectedId;
            updatedData.UnidadeFracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.Unidade_Fracionamento = selectedUnidade.UnidadeFracionamento;
            updatedData.UnidadeFracionamentoDescricao = selectedUnidade.Descricao || '';
            updatedData.Descricao = selectedUnidade.Descricao || '';
            updatedData.Divisor = selectedUnidade.Divisor || '';
          }
        } else {
          updatedData.idUnidadeFracionamento = null;
          updatedData.UnidadeFracionamento = '';
          updatedData.Unidade_Fracionamento = '';
          updatedData.UnidadeFracionamentoDescricao = '';
          updatedData.Descricao = '';
          updatedData.Divisor = '';
        }
        break;

      case 'Taxas':
        if (value) {
          const selectedTaxa = dropdownOptions.taxas.find(
            t => String(t.id_taxas) === String(value)
          );
          
          if (selectedTaxa) {
            console.log('Found matching Taxa for edit:', selectedTaxa);
            
            updatedData.idTaxas = selectedId;
            updatedData.TaxaFinalidade = selectedTaxa.finalidade;
            updatedData.finalidade = selectedTaxa.finalidade;
            updatedData.tipo_taxa = selectedTaxa.tipo_taxa || '';
            updatedData["tipo taxa"] = selectedTaxa.tipo_taxa || '';
            updatedData.tempo_infusao = selectedTaxa.tempo_infusao || '';
            updatedData["Tempo infusão"] = selectedTaxa.tempo_infusao || '';
            updatedData.id_taxa = selectedTaxa.id_taxas;
            updatedData["ID Taxa"] = selectedTaxa.id_taxas;
          }
        } else {
          updatedData.idTaxas = null;
          updatedData.TaxaFinalidade = '';
          updatedData.finalidade = '';
          updatedData.tipo_taxa = '';
          updatedData["tipo taxa"] = '';
          updatedData.tempo_infusao = '';
          updatedData["Tempo infusão"] = '';
          updatedData.id_taxa = '';
          updatedData["ID Taxa"] = '';
        }
        break;

      case 'Tabela':
        if (value) {
          const selectedTabela = dropdownOptions.tabela.find(
            t => String(t.id_tabela) === String(value)
          );
          
          if (selectedTabela) {
            console.log('Found matching Tabela for edit:', selectedTabela);
            
            updatedData.idTabela = selectedId;
            updatedData.tabela = selectedTabela.tabela;
            updatedData.tabela_classe = selectedTabela.tabela_classe || '';
            updatedData.tabela_tipo = selectedTabela.tabela_tipo || '';
            updatedData.classe_Jaragua_do_sul = selectedTabela.classe_Jaragua_do_sul || '';
            updatedData.classificacao_tipo = selectedTabela.classificacao_tipo || '';
            updatedData.finalidade = selectedTabela.finalidade || '';
            updatedData.objetivo = selectedTabela.objetivo || '';
          }
        } else {
          updatedData.idTabela = null;
          updatedData.tabela = '';
          updatedData.tabela_classe = '';
          updatedData.tabela_tipo = '';
          updatedData.classe_Jaragua_do_sul = '';
          updatedData.classificacao_tipo = '';
          updatedData.finalidade = '';
          updatedData.objetivo = '';
        }
        break;

      case 'Armazenamento':
        if (value) {
          const selectedArm = dropdownOptions.armazenamento.find(
            a => String(a.idArmazenamento) === String(value)
          );
          
          if (selectedArm) {
            console.log('Found matching Armazenamento for edit:', selectedArm);
            
            updatedData.idArmazenamento = selectedId;
            updatedData.Armazenamento = selectedArm.Armazenamento;
          }
        } else {
          updatedData.idArmazenamento = null;
          updatedData.Armazenamento = '';
        }
        break;

      case 'tipo_medicamento':
        if (value) {
          const selectedMed = dropdownOptions.tipoMedicamento.find(
            m => String(m.id_medicamento) === String(value)
          );
          
          if (selectedMed) {
            console.log('Found matching Medicamento for edit:', selectedMed);
            
            updatedData.idMedicamento = selectedId;
            updatedData.tipo_medicamento = selectedMed.tipo_medicamento;
            updatedData.Medicamento = selectedMed.tipo_medicamento;
          }
        } else {
          updatedData.idMedicamento = null;
          updatedData.tipo_medicamento = '';
          updatedData.Medicamento = '';
        }
        break;

      case 'FatorConversao':
        if (value) {
          const selectedFator = dropdownOptions.fatorConversao.find(
            f => String(f.id_fatorconversao) === String(value)
          );
          
          if (selectedFator) {
            console.log('Found matching FatorConversao for edit:', selectedFator);
            
            updatedData.idFatorConversao = selectedId;
            updatedData.Fator_Conversão = selectedFator.fator;
            updatedData.fator = selectedFator.fator;
          }
        } else {
          updatedData.idFatorConversao = null;
          updatedData.Fator_Conversão = '';
          updatedData.fator = '';
        }
        break;
      
      default:
        console.error(`Campo não reconhecido: ${field}`);
    }
    
    // Atualizar o estado com uma força de atualização visual
    console.log(`Atualizando dados de edição para:`, updatedData);
    setEditedData(updatedData);
  };

  // Função para mostrar o indicador de atualização do cache
  const showCacheRefreshIndicator = () => {
    setCacheRefreshed(true);
    // Esconder após 3 segundos
    setTimeout(() => setCacheRefreshed(false), 3000);
  };

  /* Função para forçar uma atualização dos dados
  const forceRefreshData = async () => {
    try {
      setRefreshingData(true);
      
      // Limpar o cache apenas para os serviços
      clearServicesCache();
      
      // Recarregar os dados do zero
      await loadServiceData(1, true);
      
      // Definir explicitamente a fonte como servidor
      setDataSource('server');
      
      // Indicar sucesso
      showCacheRefreshIndicator();
      showSuccessAlert("Dados atualizados com sucesso!", "", false, 2000);
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      showErrorAlert("Falha ao atualizar dados", error.message);
    } finally {
      setRefreshingData(false);
    }
  };*/

  // 2. Modificação para handleSave (alterar item)
  const handleSave = async () => {
    if (!editingRow) return;

    try {
      setLocalLoading(true);
      
      // Preparar dados para envio
      const cleanedData = { ...editedData };
      
      // Adiciona log para depuração
      console.log("Dados originais a serem enviados:", cleanedData);
      
      // Certifique-se de que todos os IDs são números
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
      
      // Converte os IDs para números inteiros
      idFields.forEach(field => {
        if (cleanedData[field] && typeof cleanedData[field] === 'string') {
          cleanedData[field] = parseInt(cleanedData[field], 10);
        }
      });
      
      console.log("Dados limpos a serem enviados:", cleanedData);
  
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/update_service.php`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedData)
        },
        15000 // 15 segundos de timeout
      );
  
      if (!response.ok) {
        throw new Error("Erro ao atualizar o serviço");
      }
  
      // Limpar estados de edição
      setEditingRow(null);
      setEditedData({});
      setIsEditing(false);
  
      // Mostrar feedback de sucesso
      showSuccessAlert("Serviço atualizado com sucesso!");
      
      // Usar a nova função otimizada
      await refreshDataAfterModification();
      
    } catch (error) {
      console.error("Erro ao atualizar o serviço:", error);
      showErrorAlert("Falha ao atualizar", error.message || "Erro desconhecido");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  // Função para resetar a ordenação para o padrão
  const handleResetSort = () => {
    setSortField('id');
    setSortOrder('asc');
  };

  // Formatar o texto com resultados de pesquisa
  const searchResultInfo = isSearching
    ? `${serviceData.length} resultados encontrados para "${searchTerm}"`
    : null;
    
  // Função para obter o nome do tipo de pesquisa
  const getSearchTypeName = (type) => {
    switch(type) {
      case 'code': return 'Código';
      case 'active': return 'Princípio Ativo';
      case 'active_visa': return 'P. Ativo (Registro Visa)';
      case 'description': return 'Descrição';
      case 'all': return 'Todos os campos';
      case 'auto': 
        // Em modo automático, detecta o tipo com base no conteúdo
        if (/^[0-9.]+$/.test(searchTerm)) {
          return 'Código (auto)';
        } else {
          return 'Princípio Ativo (auto)';
        }
      default: return 'Desconhecido';
    }
  };

  return (
    <PageTransition>
      <div className="container">
        <Sidebar />
        
        <div className="main-content">
          <Header userName="Douglas" />
          
          <main>
            <div className="styled-container">
              <div className="mb-6 flex justify-between items-center encimatabela">
                <div className="organize-container">
                  <h2 className="organize-text">Ordenação</h2>
                  <div className="custom-select">
                    <select 
                      className="select-style" 
                      value={sortOrder} 
                      onChange={handleSortChange}
                    >
                      <option value="asc">Crescente</option>
                      <option value="desc">Decrescente</option>
                    </select>
                  </div>
                </div>
                
                {/* Mostrar informação sobre ordenação atual */}
                {sortField !== 'id' && (
                  <div className="px-3 py-1 rounded-md flex items-center ordenacao" style={{color: '#575654', background: '#E4E9C0'}}>
                    <span className="text-sm">
                      Ordenado por: <strong style={{color: '#f26b6b'}} >{sortField}</strong> ({sortOrder === 'asc' ? 'crescente' : 'decrescente'})
                    </span>
                    <button 
                      className="ml-2 text-blue-600 hover:text-blue-800" 
                      onClick={handleResetSort}
                      title="Resetar ordenação"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                
                
                
                {/*<div className="flex items-center gap-3">
                   Botão para controle de cache 
                  <button
                    onClick={() => setShowCacheControl(true)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center"
                    title="Gerenciar Cache"
                  >
                    <Database size={16} className="text-gray-600 mr-1" />
                    <span className="text-xs text-gray-600">Cache</span>
                  </button>
                  
                  {/* Botão de atualização de dados 
                  <DataRefreshButton />
                </div>*/}
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="search-container">
                      <div className="search-bar">
                      <DataRefreshButton />
                        <button
                          onClick={executeSearch}
                          className={`pesquisa-icone ${searchTerm.trim().length > 0 ? 'search-icon-blinking' : ''}`}
                          title="Clique para pesquisar"
                        >
                          <Search size={18} />
                        </button>
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Pesquisar por Cód. ou Princípio Ativo"
                          className="border pesquisa"
                          defaultValue={searchTerm}
                          onInput={handleInput}
                          onKeyDown={handleKeyDown}
                        />
                        {isSearching && (
                          <button 
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={handleClearSearch}
                            title="Limpar pesquisa"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      
                      {/* Seletor do tipo de pesquisa - mostrar sempre que houver pesquisa */}
                      {isSearching && (
                        <div className="search-type-selector mt-2 flex items-center">
                          <div className="text-xs mr-2 text-gray-600">Refinar busca:</div>
                          <div className="flex flex-wrap space-x-3">
                            <label className={`cursor-pointer flex items-center ${searchType === 'auto' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                              <input
                                type="radio"
                                name="searchType"
                                value="auto"
                                checked={searchType === 'auto'}
                                onChange={() => handleSearchTypeChange('auto')}
                                className="mr-1 h-3 w-3"
                              />
                              <span className="text-xs">Auto</span>
                            </label>
                            
                            <label className={`cursor-pointer flex items-center ${searchType === 'code' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                              <input
                                type="radio"
                                name="searchType"
                                value="code"
                                checked={searchType === 'code'}
                                onChange={() => handleSearchTypeChange('code')}
                                className="mr-1 h-3 w-3"
                              />
                              <span className="text-xs">Código</span>
                            </label>
                            
                            <label className={`cursor-pointer flex items-center ${searchType === 'active' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                              <input
                                type="radio"
                                name="searchType"
                                value="active"
                                checked={searchType === 'active'}
                                onChange={() => handleSearchTypeChange('active')}
                                className="mr-1 h-3 w-3"
                              />
                              <span className="text-xs">Princípio Ativo</span>
                            </label>
                            
                            {/* Nova opção para Princípio Ativo do Registro Visa */}
                            <label className={`cursor-pointer flex items-center ${searchType === 'active_visa' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                              <input
                                type="radio"
                                name="searchType"
                                value="active_visa"
                                checked={searchType === 'active_visa'}
                                onChange={() => handleSearchTypeChange('active_visa')}
                                className="mr-1 h-3 w-3"
                              />
                              <span className="text-xs">P. Ativo (Registro)</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Indicador de resultados da pesquisa */}
                    {isSearching && (
                      <div className="text-xs text-gray-600 mt-1 ml-2 pesquisatinha">
                        {serviceData.length === 0 ? (
                          <span className="text-red-500">Nenhum resultado encontrado. Tente refinar sua busca.</span>
                        ) : (
                          <span>
                            {searchResultInfo} 
                            <span className={`search-type-badge search-type-${searchType}`}>
                              {getSearchTypeName(searchType)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="button-container">
                    {selectedRows.size > 0 ? (
                      <>
                        {isEditing ? (
                          <button 
                            className="btn btn-danger" 
                            onClick={handleCancel}
                            disabled={localLoading}
                          >
                            Cancelar
                          </button>
                        ) : (
                          <button 
                            className="btn btn-danger" 
                            onClick={handleDelete}
                            disabled={localLoading}
                          >
                            <Trash2 className="w-5 h-5" /> Excluir
                          </button>
                        )}
                        {isEditing ? (
                          <button 
                            className="btn btn-success" 
                            onClick={handleSave}
                            disabled={localLoading}
                          >
                            {localLoading ? 'Salvando...' : 'Salvar'}
                          </button>
                        ) : (
                          <button 
                            className="btn btn-warning" 
                            onClick={handleEdit}
                            disabled={localLoading}
                          >
                            <Edit className="w-5 h-5" /> Alterar
                          </button>
                        )}
                      </>
                    ) : (
                      isAdding ? (
                        <>
                          <button 
                            className="btn btn-danger" 
                            onClick={handleCancelAdd}
                            disabled={localLoading}
                          >
                            Cancelar
                          </button>
                          <button 
                            className="btn btn-success" 
                            onClick={handleSaveNew}
                            disabled={localLoading}
                          >
                            {localLoading ? (
                              <>
                                <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                                Salvando...
                              </>
                            ) : 'Salvar'}
                          </button>
                        </>
                      ) : (
                        <button 
                          className="button buttontxt btn-primary" 
                          onClick={handleAdd}
                          disabled={localLoading}
                        >
                          <Plus /> Adicionar
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <img src="/images/loadingcorreto-semfundo.gif" alt="Carregando..." className="w-12 h-12" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-red-500">Erro: {error}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleLoadData}
                      className="button buttontxt flex items-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" /> Tentar novamente
                    </button>
                    
                    {/* Botão de limpeza de cache para casos de problemas persistentes */}
                    <button
                      onClick={clearCache}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw size={16} />
                      Limpar cache
                    </button>
                  </div>
                </div>
              ) : serviceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-gray-500">
                    {isSearching ? "Nenhum resultado encontrado para esta pesquisa" : "Nenhum dado disponível"}
                  </p>
                  <div className="flex gap-3">
                    {isSearching && (
                      <button
                        onClick={handleClearSearch}
                        className="button buttontxt flex items-center gap-2"
                      >
                        <X className="w-5 h-5" /> Limpar pesquisa
                      </button>
                    )}
                    
                    {/* Botão de atualização também disponível quando não há dados */}
                    <DataRefreshButton />
                  </div>
                </div>
              ) : (
                /* Aqui renderizamos a tabela, mas sem as chaves extras */
                <div className="flex flex-col">
                  {/* Container da tabela com tamanho fixo e rolagem */}
                  <div className="h-[calc(100vh-200px)] overflow-auto border-b">
                    <DataTable
                      ref={dataTableRef}
                      data={serviceData}
                      searchTerm={searchTerm}
                      sortOrder={sortOrder}
                      sortField={sortField}
                      changeSort={changeSort}
                      onSelectionChange={toggleRowSelection}
                      editingRow={editingRow}
                      editedData={editedData}
                      handleInputChange={handleInputChange}
                      handleDropdownChange={handleDropdownChange}
                      selectedRows={selectedRows}
                      isAdding={isAdding}
                      newServiceData={newServiceData}
                      handleNewInputChange={handleNewInputChange}
                      handleNewDropdownChange={handleNewDropdownChange}
                      dropdownOptions={dropdownOptions}
                      updateTrigger={updateCounter}
                    />
                  </div>
                  
                  {/* Botão agora está fora da div com rolagem */}
                  {hasMore && !isSearching && (
                    <div className="flex justify-center py-4 mt-2">
                      <button
                        onClick={loadMore}
                        className="button buttontxt"
                        disabled={loading}
                      >
                        <span>Mostrar mais</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      {/* Modal de controle de cache */}
      {showCacheControl && (
        <CacheControl onClose={() => setShowCacheControl(false)} />
      )}
      
      {/* Indicador de atualização de cache */}
      {cacheRefreshed && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in">
          <RefreshCw size={16} className="mr-2" />
          <span>Cache atualizado com sucesso</span>
        </div>
      )}
    </PageTransition>
  );
}