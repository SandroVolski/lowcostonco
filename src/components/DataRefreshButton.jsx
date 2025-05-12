import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useServiceData } from '../components/ServiceContext';
import { usePatient } from '../context/PatientContext';
import { useProtocolo } from '../context/ProtocoloContext';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../utils/CustomAlerts';

/**
 * Componente para atualização manual dos dados
 * Este botão detecta o contexto atual e atualiza os dados correspondentes
 */
const DataRefreshButton = ({ contextType = 'auto', className, showText = true, size = 18, color = "text-green-500" }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Importar todos os contextos possíveis
  const serviceContext = useServiceData();
  const patientContext = usePatient();
  const protocoloContext = useProtocolo();
  
  // Determinar automaticamente qual contexto usar
  const getActiveContext = () => {
    if (contextType !== 'auto') {
      // Usar o contexto especificado explicitamente
      switch (contextType) {
        case 'service': return serviceContext;
        case 'patient': return patientContext;
        case 'protocolo': return protocoloContext;
        default: return serviceContext;
      }
    }
    
    // Auto-detecção baseada na rota atual ou pela disponibilidade de funções
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('paciente')) return patientContext;
    if (path.includes('protocolo')) return protocoloContext;
    return serviceContext; // Fallback para service
  };

  // Evento para forçar atualização dos dados
  const handleRefresh = async () => {
    try {
      if (refreshing) return;
      
      // Pedir confirmação ao usuário antes de atualizar
      const confirmed = await showConfirmAlert("Deseja atualizar os dados?", 
        "Esta ação irá buscar os dados mais recentes do servidor.");
      
      // Se o usuário cancelou, não fazer nada
      if (!confirmed) return;
      
      setRefreshing(true);
      
      // Obter o contexto ativo para esta página
      const activeContext = getActiveContext();
      
      // Validar se o contexto possui as funções necessárias
      if (!activeContext || !activeContext.clearCache || !activeContext.forceRevalidation) {
        throw new Error("Contexto não disponível ou não possui métodos necessários");
      }
      
      // Forçar revalidação e limpar cache
      activeContext.forceRevalidation();
      activeContext.clearCache();
      
      // Método de recarga depende do contexto
      if (activeContext.loadServiceData) {
        await activeContext.loadServiceData(1, true);
      } else if (activeContext.loadPatients) {
        await activeContext.loadPatients(true);
      } else if (activeContext.loadProtocolos) {
        await activeContext.loadProtocolos(true);
      } else if (activeContext.reloadAllData) {
        await activeContext.reloadAllData();
      }
      
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
      title="Atualizar dados"
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