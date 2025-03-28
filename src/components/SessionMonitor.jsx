import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Clock } from 'lucide-react';

/**
 * Componente para monitorar e exibir o tempo restante da sessão
 * Pode ser usado em qualquer página que precise exibir informações sobre a sessão
 */
const SessionMonitor = () => {
  const { authenticated } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Só executa se o usuário estiver autenticado
    if (!authenticated) return;

    const calculateTimeRemaining = () => {
      const expiry = localStorage.getItem('authExpiry');
      if (!expiry) return '';

      const expiryTime = parseInt(expiry);
      const now = Date.now();
      
      // Calcula o tempo restante em minutos e segundos
      const diffMs = expiryTime - now;
      
      if (diffMs <= 0) {
        return 'Expirado';
      }

      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      
      // Mostrar aviso quando faltar menos de 5 minutos
      setShowWarning(minutes < 5);
      
      return `${minutes}m ${seconds}s`;
    };

    // Calcula imediatamente
    setTimeRemaining(calculateTimeRemaining());
    
    // E depois a cada segundo
    const intervalId = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [authenticated]);

  if (!authenticated || !timeRemaining) return null;

  return (
    <div 
      className={`fixed top-4 right-4 px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 z-50 transition-all ${
        showWarning 
          ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' 
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}
    >
      <Clock size={16} />
      <span className="text-xs font-medium">
        {showWarning ? 'Sessão expira em: ' : 'Sessão: '}
        <span className={showWarning ? 'font-bold' : ''}>
          {timeRemaining}
        </span>
      </span>
    </div>
  );
};

export default SessionMonitor;