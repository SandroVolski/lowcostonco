import React from 'react';
import { Database, RefreshCw } from 'lucide-react';

/**
 * Componente para mostrar indicador de progresso de carregamento
 * @param {Object} props - Propriedades do componente
 * @param {boolean} props.loading - Se está carregando
 * @param {number} props.progress - Valor de progresso (0-100)
 * @param {string} props.message - Mensagem personalizada opcional
 * @param {Function} props.onCancel - Função para cancelar o carregamento (opcional)
 */
const LoadingProgressIndicator = ({ 
  loading, 
  progress = 0, 
  message = '',
  onCancel
}) => {
  if (!loading) return null;

  // Determinar a mensagem baseada no progresso
  const getDefaultMessage = () => {
    if (progress < 20) return 'Iniciando carregamento...';
    if (progress < 40) return 'Recebendo dados do servidor...';
    if (progress < 60) return 'Processando dados...';
    if (progress < 80) return 'Aplicando formatação...';
    if (progress < 95) return 'Quase pronto...';
    return 'Finalizando...';
  };

  const displayMessage = message || getDefaultMessage();

  // Versão em overlay se o progresso for menor que 100%
  if (progress < 100) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center mb-4">
            <Database className="text-blue-600 mr-2" size={24} />
            <h3 className="text-lg font-semibold">Carregando Dados</h3>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{displayMessage}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  progress > 90 ? 'bg-green-600' : 'bg-blue-600'
                } transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            {progress < 80 ? (
              <p>Por favor, aguarde. Este processo pode levar alguns momentos dependendo do tamanho do banco de dados.</p>
            ) : (
              <p>Finalizando o carregamento e preparando os dados para visualização.</p>
            )}
          </div>
          
          {onCancel && progress < 90 && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Versão minimalista para quando estiver quase concluído
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-blue-500 h-1" style={{ width: `${progress}%` }}></div>
      <div className="bg-blue-100 text-blue-800 text-xs font-medium text-center py-1 flex items-center justify-center">
        <RefreshCw size={12} className="animate-spin mr-1" />
        Finalizando carregamento...
      </div>
    </div>
  );
};

export default LoadingProgressIndicator;