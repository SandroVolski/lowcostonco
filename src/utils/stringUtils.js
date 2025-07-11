/**
 * Função para normalizar strings removendo acentos e caracteres especiais
 * Útil para implementar pesquisas que funcionem independente de acentos
 * 
 * @param {string} str - String a ser normalizada
 * @returns {string} String normalizada (sem acentos, em lowercase)
 */
export const normalizeString = (str) => {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .normalize('NFD') // Decompõe os caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos
    .replace(/[çÇ]/g, 'c') // Substitui cedilhas por 'c'
    .replace(/[ñÑ]/g, 'n') // Substitui 'ñ' por 'n'
    .trim();
};

/**
 * Função para filtrar arrays de objetos baseado em múltiplos campos
 * com normalização de strings (remove acentos)
 * 
 * @param {Array} items - Array de objetos para filtrar
 * @param {string} searchTerm - Termo de busca
 * @param {Array} fields - Campos do objeto nos quais buscar
 * @returns {Array} Array filtrado
 */
export const filterWithNormalization = (items, searchTerm, fields) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return items;
  }
  
  const normalizedSearch = normalizeString(searchTerm);
  
  return items.filter(item => {
    return fields.some(field => {
      const fieldValue = item[field];
      if (!fieldValue) return false;
      
      return normalizeString(fieldValue).includes(normalizedSearch);
    });
  });
}; 