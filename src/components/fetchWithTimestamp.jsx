/**
 * Utilitário para fazer chamadas de API com timestamp para evitar cache
 * sem adicionar headers que possam causar problemas de CORS
 */

// API base URL
const API_BASE_URL = "https://api.lowcostonco.com.br/backend-php/api/ServicoRelacionada";

/**
 * Função para fazer requisições fetch com timestamp anti-cache
 * @param {string} endpoint - Endpoint da API (sem o URL base)
 * @param {Object} options - Opções do fetch (method, body, etc)
 * @param {Object} params - Parâmetros para query string
 * @returns {Promise} - Promise com a resposta
 */
export const fetchWithTimestamp = async (endpoint, options = {}, params = {}) => {
  // Adicionar timestamp para evitar cache
  const timestamp = Date.now();
  params._t = timestamp;
  
  // Construir a query string
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
  // Montar URL completa
  const url = `${API_BASE_URL}/${endpoint}?${queryParams.toString()}`;
  
  // Configurar opções básicas do fetch
  const fetchOptions = {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  };
  
  // Adicionar Content-Type para requests com body
  if (options.body && !fetchOptions.headers['Content-Type']) {
    fetchOptions.headers['Content-Type'] = 'application/json';
  }
  
  // Log da requisição (útil para debug)
  console.log(`Fazendo requisição para: ${url}`, { method: fetchOptions.method || 'GET' });
  
  try {
    const response = await fetch(url, fetchOptions);
    
    // Verificar se a resposta é ok
    if (!response.ok) {
      // Tentar obter detalhes do erro
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || response.statusText;
      } catch {
        // Se não conseguir obter JSON, usar o texto da resposta
        errorMessage = await response.text() || response.statusText;
      }
      
      throw new Error(`Erro ${response.status}: ${errorMessage}`);
    }
    
    // Verificar se a resposta está vazia
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`Erro na requisição para ${url}:`, error);
    throw error;
  }
};

/**
 * Funções de conveniência para os métodos HTTP comuns
 */
export const apiGet = (endpoint, params = {}) => {
  return fetchWithTimestamp(endpoint, { method: 'GET' }, params);
};

export const apiPost = (endpoint, data, params = {}) => {
  return fetchWithTimestamp(
    endpoint,
    { 
      method: 'POST',
      body: JSON.stringify(data)
    },
    params
  );
};

export const apiPut = (endpoint, data, params = {}) => {
  return fetchWithTimestamp(
    endpoint,
    { 
      method: 'PUT',
      body: JSON.stringify(data)
    },
    params
  );
};

export const apiDelete = (endpoint, params = {}) => {
  return fetchWithTimestamp(endpoint, { method: 'DELETE' }, params);
};

export default {
  fetchWithTimestamp,
  apiGet,
  apiPost,
  apiPut,
  apiDelete
};