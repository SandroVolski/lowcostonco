import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useServiceData } from '../components/ServiceContext';
import { showSuccessAlert, showErrorAlert } from '../utils/CustomAlerts';

/**
 * Componente para atualização manual dos dados
 * Este botão limpa o cache de serviços e força uma nova busca ao servidor
 */
const DataRefreshButton = ({ className, showText = true, size = 20, color = "text-blue-600" }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { 
    loadServiceData, 
    clearCache,
    isSearching,
    clearSearch,
    forceRevalidation
  } = useServiceData();

  // Evento para forçar atualização dos dados
  const handleRefresh = async () => {
    try {
      if (refreshing) return;
      
      setRefreshing(true);
      
      // Primeiro, indique que os dados precisam de revalidação
      if (typeof forceRevalidation === 'function') {
        forceRevalidation();
      }
      
      // Se estiver em modo de pesquisa, precisamos primeiro limpar a pesquisa
      if (isSearching) {
        await clearSearch();
      }
      
      // Limpar o cache para forçar uma nova busca ao servidor
      clearCache();
      
      // Recarregar dados
      await loadServiceData(1, true);
      
      // Mostrar mensagem de sucesso
      showSuccessAlert("Dados atualizados com sucesso", "", false, 1500);
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      showErrorAlert("Falha ao atualizar dados", 
        "Não foi possível obter os dados mais recentes do servidor.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
        refreshing 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
          : 'hover:bg-blue-50 active:bg-blue-100'
      } ${className || ''}`}
      title="Atualizar dados do servidore"
    >
      <RefreshCw 
        size={size} 
        className={`${color} ${refreshing ? 'animate-spin' : ''}`} 
      />
      {showText && (
        <span className="text-sm font-medium text-gray-700">
          {refreshing ? 'Atualizando...' : 'Atualizar dados'}
        </span>
      )}
    </button>
  );
};

export default DataRefreshButton;