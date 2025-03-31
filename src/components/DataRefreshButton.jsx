import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useServiceData } from '../components/ServiceContext';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../utils/CustomAlerts';

/**
 * Componente para atualização manual dos dados
 * Este botão limpa o cache de serviços e força uma nova busca ao servidor
 */
const DataRefreshButton = ({ className, showText = true, size = 18, color = "text-green-500" }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
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
      
      // Pedir confirmação ao usuário antes de atualizar
      const confirmed = await showConfirmAlert("Deseja atualizar a tabela?", 
        "Esta ação irá buscar os dados mais recentes do servidor.");
      
      // Se o usuário cancelou, não fazer nada
      if (!confirmed) return;
      
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
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md ${className}`}
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <RefreshCw 
        size={size} 
        className={refreshing ? 'animate-spin' : ''}
        style={{ 
          color: isHovered ? '#8cb369' : '#c6d651',
          transition: 'color 0.2s ease'
        }}
      />
    </button>
  );
};

export default DataRefreshButton;