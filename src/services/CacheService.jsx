// src/services/CacheService.js
/**
 * Serviço para gerenciar o cache de dados no localStorage
 * Otimizado para grandes conjuntos de dados
 */

class CacheService {
    // Chaves para cada tipo de cache
    static CACHE_KEYS = {
      SERVICES_META: 'cached_services_meta', // Metadados dos serviços
      SERVICES_CHUNK_PREFIX: 'cached_services_chunk_', // Prefixo para chunks de dados
      DROPDOWN_OPTIONS: 'cached_dropdown_options',
      VERSION: 'cache_version'
    };

    static MAX_RECORDS_TO_CACHE = 10000;
  
    // Tamanho máximo de cada chunk em número de registros
    static CHUNK_SIZE = 1000;
  
    // Versão atual do cache - incrementar quando houver mudanças na estrutura de dados
    static CURRENT_VERSION = '1.0.0';
    
    // Tempo de expiração padrão em milissegundos (2 horas)
    static DEFAULT_TTL = 2 * 60 * 60 * 1000;
  
    /**
     * Inicializa o cache, verificando e atualizando a versão
     */
    static init() {
      try {
        // Verifica se a versão do cache está atualizada
        const storedVersion = localStorage.getItem(this.CACHE_KEYS.VERSION);
        
        // Se a versão é diferente, limpa todo o cache
        if (storedVersion !== this.CURRENT_VERSION) {
          console.log(`Atualizando cache da versão ${storedVersion} para ${this.CURRENT_VERSION}`);
          this.clearAllCache();
          localStorage.setItem(this.CACHE_KEYS.VERSION, this.CURRENT_VERSION);
        }
      } catch (error) {
        console.error('Erro ao inicializar cache:', error);
        // Em caso de erro, também limpa o cache
        this.clearAllCache();
      }
      
      return true;
    }
  
    /**
     * Armazena metadados no cache
     * @param {string} key - A chave do cache
     * @param {Object} data - Os dados a serem armazenados
     * @param {Object} metadata - Metadados extras
     * @param {number} ttl - Tempo de vida em milissegundos
     * @returns {boolean} - Se o armazenamento foi bem-sucedido
     */
    static setCache(key, data, metadata = {}, ttl = this.DEFAULT_TTL) {
      try {
        const cacheItem = {
          data,
          metadata,
          timestamp: Date.now(),
          expiry: Date.now() + ttl,
          version: this.CURRENT_VERSION
        };
        
        localStorage.setItem(key, JSON.stringify(cacheItem));
        return true;
      } catch (error) {
        console.error(`Erro ao armazenar cache para ${key}:`, error);
        // Em caso de erro ao salvar, tenta limpar o localStorage para liberar espaço
        this.clearOldCache();
        return false;
      }
    }
  
    /**
     * Recupera dados do cache, verificando validade
     * @param {string} key - A chave do cache
     * @returns {Object|null} - Os dados armazenados ou null se não existir ou expirado
     */
    static getCache(key) {
      try {
        const cacheItemStr = localStorage.getItem(key);
        if (!cacheItemStr) return null;
  
        const cacheItem = JSON.parse(cacheItemStr);
        
        // Verifica se o cache expirou
        if (Date.now() > cacheItem.expiry) {
          console.log(`Cache expirado para ${key}`);
          localStorage.removeItem(key);
          return null;
        }
        
        // Verifica se a versão é compatível
        if (cacheItem.version !== this.CURRENT_VERSION) {
          console.log(`Versão do cache incompatível para ${key}`);
          localStorage.removeItem(key);
          return null;
        }
        
        return cacheItem;
      } catch (error) {
        console.error(`Erro ao recuperar cache para ${key}:`, error);
        return null;
      }
    }
  
    /**
     * Remove um item específico do cache
     * @param {string} key - A chave do cache
     */
    static removeCache(key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Erro ao remover cache para ${key}:`, error);
      }
    }
  
    /**
     * Limpa todo o cache
     */
    static clearAllCache() {
      try {
        // Limpa metadados
        Object.values(this.CACHE_KEYS).forEach(key => {
          if (typeof key === 'string') { // Verificar se é uma string
            localStorage.removeItem(key);
          }
        });
        
        // Limpa todos os chunks de serviços
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.CACHE_KEYS.SERVICES_CHUNK_PREFIX)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Erro ao limpar todo o cache:', error);
      }
    }
  
    /**
     * Limpa apenas caches expirados
     */
    static clearOldCache() {
      try {
        // Verifica metadados
        Object.values(this.CACHE_KEYS).forEach(key => {
          if (typeof key === 'string') {
            this.getCache(key); // getCache já remove itens expirados
          }
        });
        
        // Verifica todos os chunks
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.CACHE_KEYS.SERVICES_CHUNK_PREFIX)) {
            this.getCache(key);
          }
        }
      } catch (error) {
        console.error('Erro ao limpar cache antigo:', error);
      }
    }
  
    /**
     * Verifica se os metadados do cache estão disponíveis
     * @returns {boolean} - Se o cache está disponível
     */
    static hasCachedData() {
      return this.getCache(this.CACHE_KEYS.SERVICES_META) !== null;
    }
  
/**
 * Armazena serviços no cache em chunks
 * @param {Array} services - Lista de serviços
 * @param {Object} params - Parâmetros da requisição
 * @param {boolean} hasMore - Indica se existem mais dados
 * @returns {boolean} - Se o armazenamento foi bem-sucedido
 */
static cacheServices(services, params, hasMore) {
  try {
    // Aplicar limite de registros para evitar problemas de armazenamento
    let servicesToCache = services;
    if (services.length > this.MAX_RECORDS_TO_CACHE) {
      console.warn(`Limitando cache de ${services.length} para ${this.MAX_RECORDS_TO_CACHE} registros para evitar problemas de armazenamento.`);
      servicesToCache = services.slice(0, this.MAX_RECORDS_TO_CACHE);
    }
    
    console.log(`Armazenando ${servicesToCache.length} registros em cache usando chunks...`);
    
    // Dividir os serviços em chunks para evitar exceder o limite do localStorage
    const chunks = [];
    const totalItems = servicesToCache.length;
    const chunkSize = this.CHUNK_SIZE;
    const totalChunks = Math.ceil(totalItems / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalItems);
      chunks.push(servicesToCache.slice(start, end));
    }
    
    console.log(`Dividindo ${totalItems} registros em ${totalChunks} chunks`);
    
    // Armazenar metadados primeiro
    const metaData = {
      totalItems,
      totalChunks,
      hasMore,
      params,
      timestamp: Date.now()
    };
    
    this.setCache(this.CACHE_KEYS.SERVICES_META, metaData);
    
    // Armazenar cada chunk separadamente
    for (let i = 0; i < chunks.length; i++) {
      const chunkKey = `${this.CACHE_KEYS.SERVICES_CHUNK_PREFIX}${i}`;
      this.setCache(chunkKey, chunks[i], { chunkIndex: i, totalChunks });
      console.log(`Chunk ${i + 1}/${totalChunks} armazenado`);
    }
    
    console.log(`Cache de serviços concluído: ${totalItems} registros em ${totalChunks} chunks`);
    return true;
  } catch (error) {
    console.error("Erro ao armazenar serviços em cache:", error);
    return false;
  }
}

  
/**
 * Recupera todos os serviços do cache
 * @param {Function} progressCallback - Callback para acompanhar o progresso
 * @returns {Object|null} - Dados dos serviços ou null
 */
static getCachedServices(progressCallback) {
  try {
    // Verificar se os metadados existem
    const metaCache = this.getCache(this.CACHE_KEYS.SERVICES_META);
    if (!metaCache) {
      console.log("Nenhum dado em cache disponível");
      return null;
    }
    
    const meta = metaCache.data;
    const { totalItems, totalChunks } = meta;
    
    // Verificar se os metadados são válidos
    if (!totalChunks || !totalItems) {
      console.error("Metadados do cache inválidos");
      return null;
    }
    
    // Garantir que não exceda o limite atual (pode ter sido alterado pelo usuário)
    if (totalItems > this.MAX_RECORDS_TO_CACHE) {
      console.warn(`O cache contém ${totalItems} registros, mas o limite atual é ${this.MAX_RECORDS_TO_CACHE}. Apenas os primeiros registros serão carregados.`);
    }
    
    // Recuperar todos os chunks e combinar
    const allServices = [];
    let loadedItems = 0;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `${this.CACHE_KEYS.SERVICES_CHUNK_PREFIX}${i}`;
      const chunkCache = this.getCache(chunkKey);
      
      if (!chunkCache) {
        console.warn(`Chunk ${i} não encontrado em cache. O cache pode estar corrompido.`);
        continue;
      }
      
      const chunkData = chunkCache.data;
      allServices.push(...chunkData);
      
      loadedItems += chunkData.length;
      
      // Chamar o callback de progresso, se fornecido
      if (progressCallback && typeof progressCallback === 'function') {
        const progress = Math.round((loadedItems / totalItems) * 100);
        progressCallback(progress);
      }
      
      // Parar se exceder o limite máximo
      if (allServices.length >= this.MAX_RECORDS_TO_CACHE) {
        console.warn(`Limite de ${this.MAX_RECORDS_TO_CACHE} registros atingido. Alguns dados serão omitidos.`);
        break;
      }
    }
    
    // Criar o objeto de retorno similar ao resultado da API
    return {
      data: allServices,
      meta: meta,
      timestamp: metaCache.timestamp,
      expiry: metaCache.expiry
    };
  } catch (error) {
    console.error("Erro ao recuperar serviços do cache:", error);
    return null;
  }
}
  
    /**
     * Atualiza o cache após adicionar um serviço
     * @param {Object} newService - O novo serviço adicionado
     * @returns {boolean} - Se a atualização foi bem-sucedida
     */
    static addServiceToCache(newService) {
      try {
        // Verificar se os metadados existem
        const metaCache = this.getCache(this.CACHE_KEYS.SERVICES_META);
        if (!metaCache) return false;
        
        const meta = metaCache.data;
        
        // Recuperar o primeiro chunk
        const firstChunkKey = `${this.CACHE_KEYS.SERVICES_CHUNK_PREFIX}0`;
        const firstChunkCache = this.getCache(firstChunkKey);
        
        if (!firstChunkCache) return false;
        
        // Adicionar o novo serviço ao início do primeiro chunk
        const updatedChunk = [newService, ...firstChunkCache.data];
        
        // Se o chunk ficar grande demais, remover o último item
        if (updatedChunk.length > this.CHUNK_SIZE) {
          updatedChunk.pop();
        }
        
        // Atualizar o primeiro chunk
        this.setCache(firstChunkKey, updatedChunk, firstChunkCache.metadata);
        
        // Atualizar os metadados
        meta.totalItems += 1;
        this.setCache(this.CACHE_KEYS.SERVICES_META, meta, metaCache.metadata);
        
        return true;
      } catch (error) {
        console.error("Erro ao adicionar serviço ao cache:", error);
        return false;
      }
    }
  
    /**
   * Remove um serviço específico do cache sem invalidar todo o cache
   * @param {number|string} serviceId - ID do serviço a ser removido
   * @returns {boolean} - Se a remoção foi bem-sucedida
   */
  static deleteServiceFromCache(serviceId) {
    try {
      // Verificar se temos metadados e se o cache está intacto
      const metaCache = this.getCache(this.CACHE_KEYS.SERVICES_META);
      if (!metaCache) return false;
      
      const meta = metaCache.data;
      const { totalChunks, totalItems } = meta;
      
      // Percorrer todos os chunks para encontrar o serviço
      let serviceDeleted = false;
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkKey = `${this.CACHE_KEYS.SERVICES_CHUNK_PREFIX}${i}`;
        const chunkCache = this.getCache(chunkKey);
        
        if (!chunkCache) continue;
        
        // Verificar se o serviço está neste chunk
        const serviceIndex = chunkCache.data.findIndex(
          service => service.id === serviceId
        );
        
        if (serviceIndex !== -1) {
          // Remover o serviço do chunk
          const updatedChunk = chunkCache.data.filter(
            service => service.id !== serviceId
          );
          
          // Salvar o chunk atualizado
          this.setCache(chunkKey, updatedChunk, chunkCache.metadata);
          serviceDeleted = true;
          
          // Atualizar os metadados
          const updatedMeta = {
            ...meta,
            totalItems: totalItems - 1
          };
          
          this.setCache(this.CACHE_KEYS.SERVICES_META, updatedMeta, metaCache.metadata);
          
          console.log(`Serviço #${serviceId} removido diretamente do cache (chunk ${i})`);
          break; // Não precisa continuar procurando
        }
      }
      
      return serviceDeleted;
    } catch (error) {
      console.error(`Erro ao remover serviço ${serviceId} do cache:`, error);
      return false;
    }
  }

  /**
   * Estratégia de revalidação inteligente - compara dados do cache com API
   * @param {string} cacheKey - Chave do cache a verificar
   * @param {Function} fetchFunction - Função para buscar dados da API se necessário
   * @returns {Promise<Object>} - Dados do cache ou da API
   */
  static async revalidateCache(cacheKey, fetchFunction) {
    // Verificar se temos dados em cache
    const cachedData = this.getCache(cacheKey);
    
    if (cachedData) {
      // Verificar a idade do cache
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      
      // Cache recente (menos de 5 minutos) - usa sem verificação
      if (cacheAge < 5 * 60 * 1000) {
        console.log(`Usando cache recente para ${cacheKey} (${Math.round(cacheAge/1000)}s)`);
        return { data: cachedData.data, source: 'cache-recent' };
      }
      
      // Cache "morno" (5min-2h) - usa cache, mas inicia revalidação em background
      if (cacheAge < this.DEFAULT_TTL) {
        console.log(`Usando cache "morno" para ${cacheKey} (${Math.round(cacheAge/60000)}min)`);
        
        // Revalidar em background sem bloquear a interface
        setTimeout(async () => {
          try {
            const freshData = await fetchFunction();
            if (freshData) {
              this.setCache(cacheKey, freshData);
              console.log(`Cache para ${cacheKey} atualizado em background`);
            }
          } catch (err) {
            console.error("Erro na revalidação em background:", err);
          }
        }, 0);
        
        return { data: cachedData.data, source: 'cache-warm' };
      }
    }
    
    // Cache expirado ou inexistente - buscar novos dados
    console.log(`Buscando dados frescos para ${cacheKey}`);
    try {
      const freshData = await fetchFunction();
      if (freshData) {
        this.setCache(cacheKey, freshData);
      }
      return { data: freshData, source: 'server' };
    } catch (error) {
      console.error(`Erro ao buscar dados frescos para ${cacheKey}:`, error);
      
      // Se temos cache expirado, usá-lo como fallback
      if (cachedData) {
        console.warn(`Usando cache expirado como fallback para ${cacheKey}`);
        return { data: cachedData.data, source: 'cache-expired' };
      }
      
      throw error;
    }
  }
  
    /**
   * Atualiza um serviço específico diretamente no cache
   * @param {Object} updatedService - O serviço atualizado
   * @returns {boolean} - Se a atualização foi bem-sucedida
   */
  static updateServiceInCache(updatedService) {
    try {
      // Verificar se temos metadados e se o cache está intacto
      const metaCache = this.getCache(this.CACHE_KEYS.SERVICES_META);
      if (!metaCache) return false;
      
      const meta = metaCache.data;
      const { totalChunks } = meta;
      
      // Percorrer todos os chunks para encontrar o serviço
      let serviceUpdated = false;
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkKey = `${this.CACHE_KEYS.SERVICES_CHUNK_PREFIX}${i}`;
        const chunkCache = this.getCache(chunkKey);
        
        if (!chunkCache) continue;
        
        // Verificar se o serviço está neste chunk
        const serviceIndex = chunkCache.data.findIndex(
          service => service.id === updatedService.id
        );
        
        if (serviceIndex !== -1) {
          // Atualizar o serviço no chunk
          const updatedChunk = [...chunkCache.data];
          updatedChunk[serviceIndex] = {
            ...updatedChunk[serviceIndex],
            ...updatedService
          };
          
          // Salvar o chunk atualizado
          this.setCache(chunkKey, updatedChunk, chunkCache.metadata);
          serviceUpdated = true;
          
          console.log(`Serviço #${updatedService.id} atualizado diretamente no cache (chunk ${i})`);
          break; // Não precisa continuar procurando
        }
      }
      
      return serviceUpdated;
    } catch (error) {
      console.error(`Erro ao atualizar serviço ${updatedService.id} no cache:`, error);
      return false;
    }
  }
  
    /**
     * Armazena opções de dropdown no cache
     * @param {Object} options - Opções de dropdown
     * @returns {boolean} - Se o armazenamento foi bem-sucedido
     */
    static cacheDropdownOptions(options) {
      return this.setCache(this.CACHE_KEYS.DROPDOWN_OPTIONS, options);
    }
  
    /**
     * Recupera opções de dropdown do cache
     * @returns {Object|null} - Dados das opções ou null
     */
    static getCachedDropdownOptions() {
      return this.getCache(this.CACHE_KEYS.DROPDOWN_OPTIONS);
    }

    // Adicione este método ao CacheService.js para facilitar a atualização seletiva

    /**
     * Atualiza um serviço específico em todas as chaves de cache que possam contê-lo
     * @param {Object} updatedService - O serviço atualizado
     * @returns {Object} - Informações sobre a atualização: {success, updatedCount, errors}
     */
    static updateServiceAcrossAllCaches(updatedService) {
      if (!updatedService || !updatedService.id) {
        console.error("Serviço inválido para atualização", updatedService);
        return { success: false, updatedCount: 0, errors: ['Serviço inválido'] };
      }
      
      try {
        const errors = [];
        let updatedCount = 0;
        
        // Encontrar todas as chaves de cache que podem conter serviços
        // Ignorar chaves de pesquisa específicas que possam ter filtros complexos
        const serviceCacheKeys = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.CACHE_KEYS.SERVICES_CHUNK_PREFIX)) {
            serviceCacheKeys.push(key);
          } else if (key && key.startsWith('services_') && !key.includes('_search_')) {
            // Chaves de cache personalizadas que seguem o padrão, mas não são de pesquisa
            serviceCacheKeys.push(key);
          }
        }
        
        console.log(`Encontradas ${serviceCacheKeys.length} chaves de cache para atualização potencial`);
        
        // Percorrer todas as chaves de cache encontradas
        for (const key of serviceCacheKeys) {
          try {
            const cacheItem = this.getCache(key);
            
            // Pular se o cache estiver vazio ou inválido
            if (!cacheItem || !cacheItem.data || !Array.isArray(cacheItem.data)) {
              continue;
            }
            
            // Verificar se o serviço está neste cache
            const serviceIndex = cacheItem.data.findIndex(
              item => item.id === updatedService.id
            );
            
            // Se o serviço for encontrado, atualizá-lo
            if (serviceIndex !== -1) {
              // Criar uma cópia atualizada dos dados
              const updatedData = [...cacheItem.data];
              updatedData[serviceIndex] = {
                ...updatedData[serviceIndex],  // Manter propriedades existentes
                ...updatedService             // Sobrescrever com novas propriedades
              };
              
              // Salvar o cache atualizado
              this.setCache(key, updatedData, cacheItem.metadata, cacheItem.expiry - Date.now());
              updatedCount++;
              
              console.log(`Serviço #${updatedService.id} atualizado no cache: ${key}`);
            }
          } catch (error) {
            console.error(`Erro ao atualizar serviço #${updatedService.id} no cache ${key}:`, error);
            errors.push(`${key}: ${error.message}`);
          }
        }
        
        return {
          success: updatedCount > 0,
          updatedCount,
          errors: errors.length > 0 ? errors : null
        };
      } catch (error) {
        console.error(`Erro ao atualizar serviço #${updatedService.id} em todos os caches:`, error);
        return {
          success: false,
          updatedCount: 0,
          errors: [error.message]
        };
      }
    }
  }
  
  export default CacheService;