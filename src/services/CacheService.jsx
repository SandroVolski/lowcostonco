// src/services/CacheService.js - Versão aprimorada
/**
 * Serviço para gerenciar o cache de dados no localStorage
 * Com estratégias avançadas de invalidação e revalidação
 */

class CacheService {
  // Chaves para cada tipo de cache
  static CACHE_KEYS = {
    SERVICES_META: 'cached_services_meta', // Metadados dos serviços
    SERVICES_CHUNK_PREFIX: 'cached_services_chunk_', // Prefixo para chunks de dados
    DROPDOWN_OPTIONS: 'cached_dropdown_options',
    CACHE_VERSION: 'cache_version',
    LAST_WRITE_TIMESTAMP: 'last_write_timestamp' // Nova chave para rastrear operações de escrita
  };

  static MAX_RECORDS_TO_CACHE = 10000;

  // Tamanho máximo de cada chunk em número de registros
  static CHUNK_SIZE = 1000;

  // Versão atual do cache - incrementar quando houver mudanças na estrutura de dados
  static CURRENT_VERSION = '1.1.0';
  
  // Tempo de expiração padrão em milissegundos (30 minutos - reduzido para evitar dados obsoletos)
  static DEFAULT_TTL = 30 * 60 * 1000;

  // Tempo máximo que um cache pode ser usado sem revalidação (5 minutos)
  static MAX_STALE_TIME = 5 * 60 * 1000;

  /**
   * Inicializa o cache, verificando e atualizando a versão
   */
  static init() {
    try {
      // Verifica se a versão do cache está atualizada
      const storedVersion = localStorage.getItem(this.CACHE_KEYS.CACHE_VERSION);
      
      // Se a versão é diferente, limpa todo o cache
      if (storedVersion !== this.CURRENT_VERSION) {
        console.log(`Atualizando cache da versão ${storedVersion} para ${this.CURRENT_VERSION}`);
        this.clearAllCache();
        localStorage.setItem(this.CACHE_KEYS.CACHE_VERSION, this.CURRENT_VERSION);
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
   * @param {boolean} allowStale - Se permite retornar dados obsoletos
   * @returns {Object|null} - Os dados armazenados ou null
   */
  static getCache(key, allowStale = true) {
    try {
      const cacheItemStr = localStorage.getItem(key);
      if (!cacheItemStr) return null;

      const cacheItem = JSON.parse(cacheItemStr);
      const now = Date.now();
      
      // Verifica se o cache expirou completamente
      if (now > cacheItem.expiry) {
        console.log(`Cache expirado para ${key}`);
        localStorage.removeItem(key);
        return null;
      }
      
      // Verifica se o cache está obsoleto (antigo mas ainda utilizável)
      const lastWriteTime = this.getLastWriteTimestamp();
      const isStale = lastWriteTime > cacheItem.timestamp;
      
      if (isStale) {
        console.log(`Cache obsoleto para ${key} (modificações mais recentes detectadas)`);
        
        // Se não permitir dados obsoletos, remove e retorna null
        if (!allowStale) {
          localStorage.removeItem(key);
          return null;
        }
        
        // Caso contrário, marca como obsoleto mas retorna os dados
        cacheItem.isStale = true;
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
        if (typeof key === 'string' && key !== this.CACHE_KEYS.LAST_WRITE_TIMESTAMP) { 
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
      
      // Atualiza timestamp de última escrita
      this.updateWriteTimestamp();
      
      console.log("Cache limpo completamente");
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
          this.getCache(key, false); // getCache já remove itens expirados
        }
      });
      
      // Verifica todos os chunks
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_KEYS.SERVICES_CHUNK_PREFIX)) {
          this.getCache(key, false);
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
   * Atualiza o timestamp da última operação de escrita
   * Crucial para detectar quando o cache está obsoleto
   */
  static updateWriteTimestamp() {
    localStorage.setItem(this.CACHE_KEYS.LAST_WRITE_TIMESTAMP, Date.now().toString());
  }
  
  /**
   * Obtém o timestamp da última operação de escrita
   * @returns {number} - O timestamp da última escrita
   */
  static getLastWriteTimestamp() {
    const timestamp = localStorage.getItem(this.CACHE_KEYS.LAST_WRITE_TIMESTAMP);
    return timestamp ? parseInt(timestamp) : 0;
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
      
      // Verificar se o cache está obsoleto (devido a operações de escrita recentes)
      const lastWriteTime = this.getLastWriteTimestamp();
      const isStale = lastWriteTime > metaCache.timestamp;
      
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
        expiry: metaCache.expiry,
        isStale: isStale // Indica se o cache está potencialmente desatualizado
      };
    } catch (error) {
      console.error("Erro ao recuperar serviços do cache:", error);
      return null;
    }
  }

  /**
   * Remove todas as entradas de cache que podem conter dados de serviço
   * mas mantém outras configurações de cache
   */
  static clearServiceDataOnly() {
    try {
      // Remover metadados dos serviços
      localStorage.removeItem(this.CACHE_KEYS.SERVICES_META);
      
      // Remover todos os chunks de serviços
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_KEYS.SERVICES_CHUNK_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      
      // Limpar caches específicos para serviços
      const serviceCacheKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('services_')) {
          serviceCacheKeys.push(key);
        }
      }
      
      serviceCacheKeys.forEach(key => localStorage.removeItem(key));
      
      // Atualizar timestamp de última escrita
      this.updateWriteTimestamp();
      
      console.log("Cache de dados de serviços limpo");
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache de serviços:', error);
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

  /**
   * Atualiza um serviço específico em todos os caches
   * @param {Object} updatedService - O serviço atualizado
   * @returns {Object} - Informações sobre a atualização
   */
  static updateServiceInAllCaches(updatedService) {
    if (!updatedService || !updatedService.id) {
      console.error("Serviço inválido para atualização", updatedService);
      return { success: false, updatedCount: 0, errors: ['Serviço inválido'] };
    }
    
    try {
      const errors = [];
      let updatedCount = 0;
      
      // Encontrar todas as chaves de cache que podem conter serviços
      const serviceCacheKeys = [];
      
      // 1. Procurar em chunks
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_KEYS.SERVICES_CHUNK_PREFIX)) {
          serviceCacheKeys.push(key);
        }
      }
      
      // 2. Procurar em caches separados
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('services_') && !key.includes('_search_')) {
          serviceCacheKeys.push(key);
        }
      }
      
      console.log(`Encontradas ${serviceCacheKeys.length} chaves de cache para atualização potencial`);
      
      // Percorrer todas as chaves de cache encontradas
      for (const key of serviceCacheKeys) {
        try {
          const cacheItem = this.getCache(key);
          
          // Pular se o cache estiver vazio ou inválido
          if (!cacheItem || !cacheItem.data) {
            continue;
          }
          
          // Verificar se é um array ou um objeto com array dentro
          let dataToUpdate;
          
          if (Array.isArray(cacheItem.data)) {
            dataToUpdate = cacheItem.data;
          } else if (cacheItem.data.data && Array.isArray(cacheItem.data.data)) {
            dataToUpdate = cacheItem.data.data;
          } else {
            continue; // Formato não reconhecido
          }
          
          // Procurar pelo serviço e atualizar
          let updated = false;
          
          for (let i = 0; i < dataToUpdate.length; i++) {
            if (dataToUpdate[i] && dataToUpdate[i].id === updatedService.id) {
              // Mesclar preservando propriedades existentes
              dataToUpdate[i] = { ...dataToUpdate[i], ...updatedService };
              updated = true;
            }
          }
          
          if (updated) {
            // Salvar o cache atualizado
            if (Array.isArray(cacheItem.data)) {
              this.setCache(key, dataToUpdate, cacheItem.metadata, cacheItem.expiry - Date.now());
            } else if (cacheItem.data.data && Array.isArray(cacheItem.data.data)) {
              cacheItem.data.data = dataToUpdate;
              this.setCache(key, cacheItem.data, cacheItem.metadata, cacheItem.expiry - Date.now());
            }
            
            updatedCount++;
            console.log(`Serviço #${updatedService.id} atualizado no cache: ${key}`);
          }
        } catch (error) {
          console.error(`Erro ao atualizar serviço #${updatedService.id} no cache ${key}:`, error);
          errors.push(`${key}: ${error.message}`);
        }
      }
      
      // Atualizar o timestamp de escrita
      if (updatedCount > 0) {
        this.updateWriteTimestamp();
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