import React, { useState, useEffect } from 'react';
import { usePatient } from '../context/PatientContext';
import { useProtocolo } from '../context/ProtocoloContext';
import { Database, RotateCcw, RefreshCw, Clock, AlertTriangle, XCircle } from 'lucide-react';

/**
 * Componente para exibir e gerenciar o cache de pacientes e protocolos
 */
const PatientProtocoloCacheControl = ({ onClose, type = 'patient' }) => {
  // Get context based on type
  const patientContext = usePatient();
  const protocoloContext = useProtocolo();
  
  // Use the appropriate context based on the type prop
  const contextData = type === 'patient' ? patientContext : protocoloContext;
  
  const { 
    isCacheEnabled, 
    toggleCache, 
    clearCache,
    totalRecords,
    reloadAllData
  } = contextData;
  
  const [cacheStats, setCacheStats] = useState({
    dataSize: 0,
    itemCount: 0,
    lastUpdate: null,
    totalSize: 0,
    cacheLimit: 0,
    usagePercent: 0
  });

  const [refreshing, setRefreshing] = useState(false);
  const [recordLimit, setRecordLimit] = useState(type === 'patient' ? 5000 : 1000);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Function to estimate cache size
  const calculateCacheSize = () => {
    // Get appropriate cache key based on type
    const cacheKey = type === 'patient' ? 'cached_patients_data' : 'cached_protocolos_data';
    
    const cachedData = localStorage.getItem(cacheKey);
    if (!cachedData) {
      setCacheStats({
        dataSize: 0,
        itemCount: 0,
        lastUpdate: null,
        totalSize: 0,
        cacheLimit: 5 * 1024 * 1024, // 5MB is common
        usagePercent: 0
      });
      return;
    }
    
    try {
      const parsedCache = JSON.parse(cachedData);
      
      // Calculate sizes
      const recordCount = totalRecords || (parsedCache.data ? parsedCache.data.length : 0);
      const estimatedSize = cachedData.length * 2; // Roughly 2 bytes per character in JSON
      
      // Calculate cache limit and usage
      const cacheLimit = 5 * 1024 * 1024; // 5MB
      const usagePercent = Math.round((estimatedSize / cacheLimit) * 100);
      
      setCacheStats({
        dataSize: estimatedSize,
        itemCount: recordCount,
        lastUpdate: parsedCache.timestamp ? new Date(parsedCache.timestamp) : null,
        totalSize: estimatedSize,
        cacheLimit,
        usagePercent
      });
      
      // Show warning if usage is high
      setShowLimitWarning(usagePercent > 80);
      
    } catch (error) {
      console.error("Error calculating cache size:", error);
    }
  };

  // Function to clear all cache
  const clearAllCache = () => {
    clearCache();
    calculateCacheSize();
  };

  // Function to refresh cache
  const refreshCache = async () => {
    setRefreshing(true);
    
    // Clear existing cache
    clearAllCache();
    
    // Reactivate cache if needed
    if (!isCacheEnabled) toggleCache(true);
    
    // Reload data with limit
    try {
      await reloadAllData();
    } catch (error) {
      console.error("Error reloading data:", error);
    }
    
    // Recalculate statistics
    calculateCacheSize();
    setRefreshing(false);
  };

  // Function to apply record limit
  const applyRecordLimit = async () => {
    try {
      setRefreshing(true);
      
      // Store the new record limit in localStorage
      localStorage.setItem(`${type}_record_limit`, recordLimit.toString());
      
      // Clear existing cache
      clearAllCache();
      
      // Reload data
      await reloadAllData();
      
      // Recalculate statistics
      calculateCacheSize();
    } catch (error) {
      console.error("Error applying record limit:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Format bytes for display
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Load saved record limit if available
  useEffect(() => {
    const savedLimit = localStorage.getItem(`${type}_record_limit`);
    if (savedLimit) {
      setRecordLimit(parseInt(savedLimit, 10));
    }
  }, [type]);

  // Calculate cache statistics on mount
  useEffect(() => {
    calculateCacheSize();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Database className="mr-2 text-blue-600" />
            {type === 'patient' ? 'Gerenciamento de Cache de Pacientes' : 'Gerenciamento de Cache de Protocolos'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        
        {/* Cache limit warning */}
        {showLimitWarning && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 flex items-start">
            <AlertTriangle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium">Storage limit alert</p>
              <p className="text-sm mt-1">
                Cache is {cacheStats.usagePercent > 100 ? 'exceeding' : 'approaching'} browser storage limit.
                Consider reducing the number of stored records to avoid issues.
              </p>
            </div>
          </div>
        )}
        
        {/* Cache status */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Cache Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Items in cache:</p>
              <p className="font-medium">{cacheStats.itemCount} items</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last update:</p>
              <p className="font-medium">
                {cacheStats.lastUpdate 
                  ? cacheStats.lastUpdate.toLocaleString() 
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cache size:</p>
              <p className="font-medium">{formatBytes(cacheStats.dataSize)}</p>
            </div>
          </div>
          
          {/* Usage bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Cache usage:</span>
              <span className={cacheStats.usagePercent > 100 ? 'text-red-600 font-bold' : ''}>
                {cacheStats.usagePercent}% of {formatBytes(cacheStats.cacheLimit)}
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
        
        {/* Record limiter */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Cache Record Limit</h3>
          <p className="text-sm text-gray-600 mb-3">
            Reducing the number of cached records helps prevent storage problems.
            {type === 'patient' 
              ? ' Recommended: 2,000 to 5,000 patient records.'
              : ' Recommended: 500 to 1,000 protocol records.'}
          </p>
          <div className="flex items-center space-x-3 mb-1">
            <input
              type="range"
              min={type === 'patient' ? '1000' : '200'}
              max={type === 'patient' ? '10000' : '2000'}
              step={type === 'patient' ? '1000' : '100'}
              value={recordLimit}
              onChange={(e) => setRecordLimit(parseInt(e.target.value))}
              className="flex-grow"
            />
            <input
              type="number"
              min={type === 'patient' ? '1000' : '200'}
              max={type === 'patient' ? '10000' : '2000'}
              value={recordLimit}
              onChange={(e) => setRecordLimit(parseInt(e.target.value))}
              className="w-20 p-1 border rounded text-center"
            />
          </div>
          <div className="text-xs text-gray-500 flex justify-between">
            <span>{type === 'patient' ? '1,000' : '200'}</span>
            <span>{type === 'patient' ? '5,000' : '1,000'}</span>
            <span>{type === 'patient' ? '10,000' : '2,000'}</span>
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
                  Applying...
                </>
              ) : (
                <>
                  <Database size={16} /> 
                  Apply limit of {recordLimit.toLocaleString()} records
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Cache controls */}
        <div className="space-y-4">
          {/* Cache toggle */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div>
              <h4 className="font-medium">Enable Cache</h4>
              <p className="text-sm text-gray-600">Stores data locally for better performance</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isCacheEnabled} 
                onChange={() => toggleCache(!isCacheEnabled)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={refreshCache}
              disabled={refreshing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
            >
              {refreshing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Refresh Cache
                </>
              )}
            </button>
            
            <button
              onClick={clearAllCache}
              disabled={refreshing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
              Clear Cache
            </button>
          </div>
          
          {/* Tips */}
          <div className="text-sm text-gray-600 mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
            <p className="flex items-center mb-2">
              <Clock size={16} className="mr-1 text-yellow-600" />
              <span className="font-medium text-yellow-800">Tips for managing large volumes:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Keep record limit at recommended levels for best performance</li>
              <li>Use search to work with smaller subsets of data</li>
              <li>Clear cache periodically, especially after large operations</li>
              <li>Refresh cache if you notice any data inconsistencies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProtocoloCacheControl;