import React, { useState, useEffect } from 'react';
import { useServiceData } from '../components/ServiceContext';
import { useDropdownOptions } from '../components/DropdownOptionsContext';
import { Database, RotateCcw, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import CacheService from '../services/CacheService';

// Componente para exibir e gerenciar o cache do sistema
const CacheControl = ({ onClose }) => {
  const { 
    isCacheEnabled: servicesCacheEnabled, 
    toggleCache: toggleServicesCache, 
    clearCache: clearServicesCache,
    totalRecords,
    reloadAllData
  } = useServiceData();
  
  const { 
    isCacheEnabled: dropdownCacheEnabled, 
    toggleCache: toggleDropdownCache, 
    clearCache: clearDropdownCache 
  } = useDropdownOptions();

  const [cacheStats, setCacheStats] = useState({
    servicesSize: 0,
    servicesItemCount: 0,
    servicesLastUpdate: null,
    dropdownsSize: 0,
    totalSize: 0,
    cacheLimit: 0,
    usagePercent: 0
  });

  const [refreshing, setRefreshing] = useState(false);
  const [recordLimit, setRecordLimit] = useState(10000);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Função para calcular o tamanho estimado do cache
  const calculateCacheSize = () => {
    const servicesCache = CacheService.hasCachedData() ? { data: { totalItems: totalRecords } } : null;
    const dropdownCache = CacheService.getCachedDropdownOptions();
    
    // Estimar o tamanho baseado no número de registros (aproximadamente 100 bytes por registro)
    const servicesSize = servicesCache ? servicesCache.data.totalItems * 100 : 0;
    
    // Tamanho estimado das opções de dropdown em cache
    const dropdownsSize = dropdownCache ? JSON.stringify(dropdownCache).length * 2 : 0;
    
    // Tamanho total do cache
    const totalSize = servicesSize + dropdownsSize;
    
    // Limite aproximado do localStorage (5MB é comum)
    const cacheLimit = 5 * 1024 * 1024;
    
    // Percentual de uso
    const usagePercent = Math.round((totalSize / cacheLimit) * 100);
    
    setCacheStats({
      servicesSize,
      servicesItemCount: servicesCache?.data?.totalItems || 0,
      servicesLastUpdate: servicesCache?.timestamp 
        ? new Date(servicesCache.timestamp)
        : null,
      dropdownsSize,
      totalSize,
      cacheLimit,
      usagePercent
    });
    
    // Mostrar aviso se o uso estiver acima de 80%
    setShowLimitWarning(usagePercent > 80);
  };

  // Função para limpar todo o cache
  const clearAllCache = () => {
    clearServicesCache();
    clearDropdownCache();
    CacheService.clearAllCache();
    calculateCacheSize();
  };

  // Função para recarregar os dados do cache
  const refreshCache = async () => {
    setRefreshing(true);
    
    // Limpar cache existente
    clearAllCache();
    
    // Reativar cache se necessário
    if (!servicesCacheEnabled) toggleServicesCache(true);
    if (!dropdownCacheEnabled) toggleDropdownCache(true);
    
    // Recarregar dados com limite
    try {
      await reloadAllData();
    } catch (error) {
      console.error("Erro ao recarregar dados:", error);
    }
    
    // Recalcular estatísticas
    calculateCacheSize();
    setRefreshing(false);
  };

  // Função para limitar o número de registros em cache
  const applyRecordLimit = async () => {
    try {
      setRefreshing(true);
      
      // Recarregar com o limite definido
      CacheService.MAX_RECORDS_TO_CACHE = recordLimit;
      
      // Limpar cache existente
      clearAllCache();
      
      // Recarregar dados
      await reloadAllData();
      
      // Recalcular estatísticas
      calculateCacheSize();
    } catch (error) {
      console.error("Erro ao aplicar limite de registros:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Formatar bytes para exibição amigável
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Calcular estatísticas de cache ao montar o componente
  useEffect(() => {
    calculateCacheSize();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Database className="mr-2 text-blue-600" />
            Gerenciamento de Cache
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        
        {/* Alerta de limite excedido */}
        {showLimitWarning && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 flex items-start">
            <AlertTriangle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium">Alerta de limite de armazenamento</p>
              <p className="text-sm mt-1">
                O cache está {cacheStats.usagePercent > 100 ? 'excedendo' : 'se aproximando do'} limite do navegador.
                Recomendamos reduzir o número de registros armazenados para evitar problemas.
              </p>
            </div>
          </div>
        )}
        
        {/* Status do cache */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Status do Cache</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Serviços em cache:</p>
              <p className="font-medium">{cacheStats.servicesItemCount} itens</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Última atualização:</p>
              <p className="font-medium">
                {cacheStats.servicesLastUpdate 
                  ? cacheStats.servicesLastUpdate.toLocaleString() 
                  : 'Nunca'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tamanho de serviços:</p>
              <p className="font-medium">{formatBytes(cacheStats.servicesSize)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tamanho de dropdowns:</p>
              <p className="font-medium">{formatBytes(cacheStats.dropdownsSize)}</p>
            </div>
          </div>
          
          {/* Barra de uso */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Uso do cache:</span>
              <span className={cacheStats.usagePercent > 100 ? 'text-red-600 font-bold' : ''}>
                {cacheStats.usagePercent}% de {formatBytes(cacheStats.cacheLimit)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  cacheStats.usagePercent > 100 
                    ? 'bg-red-600' 
                    : cacheStats.usagePercent > 80 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(cacheStats.usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Limitador de registros */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Limite de Registros em Cache</h3>
          <p className="text-sm text-gray-600 mb-3">
            Reduzir o número de registros em cache ajuda a evitar problemas de armazenamento.
            Recomendado: 5.000 a 10.000 registros.
          </p>
          <div className="flex items-center space-x-3 mb-1">
            <input
              type="range"
              min="1000"
              max="20000"
              step="1000"
              value={recordLimit}
              onChange={(e) => setRecordLimit(parseInt(e.target.value))}
              className="flex-grow"
            />
            <input
              type="number"
              min="1000"
              max="20000"
              value={recordLimit}
              onChange={(e) => setRecordLimit(parseInt(e.target.value))}
              className="w-20 p-1 border rounded text-center"
            />
          </div>
          <div className="text-xs text-gray-500 flex justify-between">
            <span>1.000</span>
            <span>10.000</span>
            <span>20.000</span>
          </div>
          <div className="mt-3">
            <button
              onClick={applyRecordLimit}
              disabled={refreshing}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {refreshing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> 
                  Aplicando...
                </>
              ) : (
                <>
                  <Database size={16} /> 
                  Aplicar limite de {recordLimit.toLocaleString()} registros
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Controles do cache */}
        <div className="space-y-4">
          {/* Cache de serviços */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div>
              <h4 className="font-medium">Cache de Serviços</h4>
              <p className="text-sm text-gray-600">Armazena dados de serviços localmente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={servicesCacheEnabled} 
                onChange={() => toggleServicesCache(!servicesCacheEnabled)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {/* Cache de dropdowns */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div>
              <h4 className="font-medium">Cache de Dropdowns</h4>
              <p className="text-sm text-gray-600">Armazena opções de formulários localmente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={dropdownCacheEnabled} 
                onChange={() => toggleDropdownCache(!dropdownCacheEnabled)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={clearAllCache}
              disabled={refreshing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
              Limpar Cache
            </button>
            
            <button
              onClick={refreshCache}
              disabled={refreshing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              {refreshing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Atualizar Cache
                </>
              )}
            </button>
          </div>
          
          {/* Dicas */}
          <div className="text-sm text-gray-600 mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
            <p className="flex items-center mb-2">
              <Clock size={16} className="mr-1 text-yellow-600" />
              <span className="font-medium text-yellow-800">Dicas para gerenciamento de grandes volumes:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mantenha o limite de registros entre 5.000 e 10.000 para melhor desempenho</li>
              <li>Use a pesquisa para trabalhar com subconjuntos menores de dados</li>
              <li>Limpe o cache periodicamente, especialmente após grandes operações</li>
              <li>Se precisar trabalhar com todo o conjunto de dados, use exportação para arquivos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheControl;