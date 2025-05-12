import React, { useState, useRef, useEffect } from 'react';

const DiasAdministracaoSelector = ({ 
  value = '', 
  diasIniciais = [], 
  onChange = () => {}, 
  maxDias = 70
}) => {
  // Estado para controlar o modo (isolado ou intervalo)
  const [modo, setModo] = useState('isolado');
  
  // Estado para dias selecionados (ambos os modos usam)
  const [diasSelecionados, setDiasSelecionados] = useState(() => {
    // Se temos um valor string, converter para array
    if (typeof value === 'string' && value.trim()) {
      // Verificar se é um intervalo (contém hífen e não contém vírgula)
      if (value.includes('-') && !value.includes(',')) {
        const [inicio, fim] = value.split('-').map(d => d.trim());
        // Gerar array de dias entre inicio e fim
        const inicioNum = parseInt(inicio.replace('D', ''));
        const fimNum = parseInt(fim.replace('D', ''));
        const diasArray = [];
        for (let i = inicioNum; i <= fimNum; i++) {
          diasArray.push(`D${i}`);
        }
        return diasArray;
      }
      // Se for uma lista separada por vírgulas
      if (value.includes(',')) {
        return value.split(',').map(d => d.trim());
      }
      // Se for um único valor
      return [value.trim()];
    }
    // Caso contrário, usar diasIniciais
    return diasIniciais;
  });
  
  // Estados para o modo intervalo
  const [intervaloInicio, setIntervaloInicio] = useState('');
  const [intervaloFim, setIntervaloFim] = useState('');
  
  // Estados para o modo isolado
  const [searchText, setSearchText] = useState('');
  
  // Estados para o controle de arrasto
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [dragDirection, setDragDirection] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  
  // Referência para a barra de intervalo
  const rangeRef = useRef(null);
  
  // Gerar opções de dias (D0 a D70)
  const DIAS_OPTIONS = Array.from({ length: maxDias + 1 }, (_, i) => ({
    value: `D${i}`,
    label: `D${i}`
  }));
  
  // Dias filtrados para pesquisa
  const diasFiltrados = DIAS_OPTIONS.filter(dia => 
    dia.label.toLowerCase().includes(searchText.toLowerCase())
  );
  
  // Agrupar dias para visualização em modo isolado
  const diasAgrupados = Array.from({ length: Math.ceil((maxDias + 1) / 10) }, (_, i) => 
    DIAS_OPTIONS.slice(i * 10, i * 10 + 10)
  );

  // Efeito para inicializar valores do intervalo quando value muda
  useEffect(() => {
    if (typeof value === 'string' && value.trim()) {
      // Se é um intervalo simples
      if (value.includes('-') && !value.includes(',')) {
        const [inicio, fim] = value.split('-').map(d => d.trim());
        setModo('intervalo');
        setIntervaloInicio(inicio);
        setIntervaloFim(fim);
      } 
      // Se é uma lista com poucos dias, inicializar em modo isolado
      else if (value.includes(',')) {
        const dias = value.split(',').map(d => d.trim());
        // Se tiver poucos dias, mostrar em modo isolado, senão em intervalo
        if (dias.length <= 5) {
          setModo('isolado');
        } else {
          // Para listas grandes, podemos iniciar em modo intervalo
          const dias = value.split(',').map(d => d.trim()).sort((a, b) => {
            return parseInt(a.replace('D', '')) - parseInt(b.replace('D', ''));
          });
          setModo('intervalo');
          setIntervaloInicio(dias[0]);
          setIntervaloFim(dias[dias.length - 1]);
        }
      }
      // Se é um único dia, inicializar em modo isolado
      else if (value.trim()) {
        setModo('isolado');
      }
    }
  }, [value]);

  // Efeito para atualizar diasSelecionados quando modo é intervalo
  useEffect(() => {
    if (modo === 'intervalo' && intervaloInicio && intervaloFim) {
      const inicio = parseInt(intervaloInicio.replace('D', ''));
      const fim = parseInt(intervaloFim.replace('D', ''));
      
      // Garantir que início não seja maior que fim
      if (inicio <= fim) {
        const novosDias = [];
        for (let i = inicio; i <= fim; i++) {
          novosDias.push(`D${i}`);
        }
        setDiasSelecionados(novosDias);
        // Devolver como formato string "D1-D5" para compatibilidade
        onChange(`${intervaloInicio}-${intervaloFim}`);
      }
    }
  }, [intervaloInicio, intervaloFim, modo, onChange]);

  // Função para mudar o modo
  const handleModoChange = (novoModo) => {
    setModo(novoModo);
    
    // Se mudar para intervalo e tiver dias selecionados, definir intervalo
    if (novoModo === 'intervalo' && diasSelecionados.length > 0) {
      // Ordenar dias selecionados
      const dias = [...diasSelecionados].sort((a, b) => {
        return parseInt(a.replace('D', '')) - parseInt(b.replace('D', ''));
      });
      
      setIntervaloInicio(dias[0]);
      setIntervaloFim(dias[dias.length - 1]);
    }
  };

  // Função para mudar o intervalo com validação
  const handleIntervaloChange = (tipo, valor) => {
    if (!valor) return;
    
    const valorNum = parseInt(valor.replace('D', ''));
    
    if (tipo === 'inicio') {
      // Verificar se o início não é maior que o fim
      const fimNum = intervaloFim ? parseInt(intervaloFim.replace('D', '')) : maxDias;
      if (valorNum <= fimNum) {
        setIntervaloInicio(valor);
      } else {
        // Se for maior, alertar o usuário e ajustar para um valor válido
        alert('O dia inicial não pode ser maior que o dia final.');
        setIntervaloInicio(`D${fimNum}`);
      }
    } else {
      // Verificar se o fim não é menor que o início
      const inicioNum = intervaloInicio ? parseInt(intervaloInicio.replace('D', '')) : 0;
      if (valorNum >= inicioNum) {
        setIntervaloFim(valor);
      } else {
        // Se for menor, alertar o usuário e ajustar para um valor válido
        alert('O dia final não pode ser menor que o dia inicial.');
        setIntervaloFim(`D${inicioNum}`);
      }
    }
  };

  // Controle para seleção de dias individuais
  const handleDiaChange = (dia, checked) => {
    let novosDias = [...diasSelecionados];
    
    if (checked) {
      if (!novosDias.includes(dia)) {
        novosDias.push(dia);
      }
    } else {
      novosDias = novosDias.filter(d => d !== dia);
    }
    
    setDiasSelecionados(novosDias);
    
    // Ordenar dias para uma melhor apresentação
    const diasOrdenados = [...novosDias].sort((a, b) => {
      return parseInt(a.replace('D', '')) - parseInt(b.replace('D', ''));
    });
    
    // Devolver como string separada por vírgulas
    onChange(diasOrdenados.join(','));
  };

  // Remover um dia específico
  const removeDia = (dia) => {
    const novosDias = diasSelecionados.filter(d => d !== dia);
    setDiasSelecionados(novosDias);
    
    // Ordenar dias para uma melhor apresentação
    const diasOrdenados = [...novosDias].sort((a, b) => {
      return parseInt(a.replace('D', '')) - parseInt(b.replace('D', ''));
    });
    
    // Devolver como string separada por vírgulas
    onChange(diasOrdenados.join(','));
  };

  // Iniciar arrasto - mouse
  const handleMouseDown = (e, handle) => {
    e.preventDefault();
    if (handle === 'start') {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
    
    setDragStartY(e.clientY);
    
    // Adicionar event listeners para document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Iniciar arrasto - touch
  const handleTouchStart = (e, handle) => {
    if (handle === 'start') {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
    
    setDragStartY(e.touches[0].clientY);
    
    // Não adicionar preventDefault aqui para permitir rolagem natural em dispositivos touch
    
    // Adicionar event listeners para document
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Mover arrasto - mouse
  const handleMouseMove = (e) => {
    // Determinar primeiro se é um arrasto horizontal ou vertical
    const deltaY = dragStartY - e.clientY;
    
    if (!isDraggingVertical && Math.abs(deltaY) > 5) {
      setIsDraggingVertical(true);
    }
    
    if (isDraggingVertical) {
      // Arrasto vertical para ajustar valor
      e.preventDefault();
      
      // Definir a direção do arrasto para mostrar a seta
      setDragDirection(deltaY > 0 ? 1 : -1);
      
      // Ajustar o valor com base no tamanho do arrasto
      if (Math.abs(deltaY) > 10) {
        if (isDraggingStart) {
          const valorAtual = parseInt(intervaloInicio.replace('D', ''));
          const novoValor = Math.min(Math.max(valorAtual + (deltaY > 0 ? 1 : -1), 0), maxDias);
          
          // Ajustar apenas se o novo valor não for maior que o fim
          const valorFim = parseInt(intervaloFim.replace('D', ''));
          if (novoValor <= valorFim) {
            setIntervaloInicio(`D${novoValor}`);
            setDragStartY(e.clientY);
          }
        } else if (isDraggingEnd) {
          const valorAtual = parseInt(intervaloFim.replace('D', ''));
          const novoValor = Math.min(Math.max(valorAtual + (deltaY > 0 ? 1 : -1), 0), maxDias);
          
          // Ajustar apenas se o novo valor não for menor que o início
          const valorInicio = parseInt(intervaloInicio.replace('D', ''));
          if (novoValor >= valorInicio) {
            setIntervaloFim(`D${novoValor}`);
            setDragStartY(e.clientY);
          }
        }
      }
    } else if (rangeRef.current) {
      // Arrasto horizontal para mover o controle deslizante
      const rect = rangeRef.current.getBoundingClientRect();
      const relativePosition = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const dayIndex = Math.round(relativePosition * maxDias);
      
      if (isDraggingStart) {
        const valorFim = parseInt(intervaloFim.replace('D', ''));
        if (dayIndex <= valorFim) {
          setIntervaloInicio(`D${dayIndex}`);
        }
      } else if (isDraggingEnd) {
        const valorInicio = parseInt(intervaloInicio.replace('D', ''));
        if (dayIndex >= valorInicio) {
          setIntervaloFim(`D${dayIndex}`);
        }
      }
    }
  };

  // Mover arrasto - touch
  const handleTouchMove = (e) => {
    // Para touch, usamos o mesmo código do mouse, mas com e.touches[0]
    const touch = e.touches[0];
    
    // Determinar primeiro se é um arrasto horizontal ou vertical
    const deltaY = dragStartY - touch.clientY;
    
    if (!isDraggingVertical && Math.abs(deltaY) > 5) {
      setIsDraggingVertical(true);
      e.preventDefault(); // Prevenir rolagem apenas se for arrasto vertical
    }
    
    if (isDraggingVertical) {
      // Arrasto vertical para ajustar valor
      
      // Definir a direção do arrasto para mostrar a seta
      setDragDirection(deltaY > 0 ? 1 : -1);
      
      // Ajustar o valor com base no tamanho do arrasto
      if (Math.abs(deltaY) > 10) {
        if (isDraggingStart) {
          const valorAtual = parseInt(intervaloInicio.replace('D', ''));
          const novoValor = Math.min(Math.max(valorAtual + (deltaY > 0 ? 1 : -1), 0), maxDias);
          
          // Ajustar apenas se o novo valor não for maior que o fim
          const valorFim = parseInt(intervaloFim.replace('D', ''));
          if (novoValor <= valorFim) {
            setIntervaloInicio(`D${novoValor}`);
            setDragStartY(touch.clientY);
          }
        } else if (isDraggingEnd) {
          const valorAtual = parseInt(intervaloFim.replace('D', ''));
          const novoValor = Math.min(Math.max(valorAtual + (deltaY > 0 ? 1 : -1), 0), maxDias);
          
          // Ajustar apenas se o novo valor não for menor que o início
          const valorInicio = parseInt(intervaloInicio.replace('D', ''));
          if (novoValor >= valorInicio) {
            setIntervaloFim(`D${novoValor}`);
            setDragStartY(touch.clientY);
          }
        }
      }
    } else if (rangeRef.current) {
      // Arrasto horizontal para mover o controle deslizante
      const rect = rangeRef.current.getBoundingClientRect();
      const relativePosition = Math.min(Math.max((touch.clientX - rect.left) / rect.width, 0), 1);
      const dayIndex = Math.round(relativePosition * maxDias);
      
      if (isDraggingStart) {
        const valorFim = parseInt(intervaloFim.replace('D', ''));
        if (dayIndex <= valorFim) {
          setIntervaloInicio(`D${dayIndex}`);
        }
      } else if (isDraggingEnd) {
        const valorInicio = parseInt(intervaloInicio.replace('D', ''));
        if (dayIndex >= valorInicio) {
          setIntervaloFim(`D${dayIndex}`);
        }
      }
    }
  };

  // Encerrar arrasto - mouse
  const handleMouseUp = () => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setIsDraggingVertical(false);
    setDragDirection(0);
    
    // Remover event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Encerrar arrasto - touch
  const handleTouchEnd = () => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setIsDraggingVertical(false);
    setDragDirection(0);
    
    // Remover event listeners
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  // Função para obter a classe de animação dos controles deslizantes
  const getHandleAnimationClass = (handle) => {
    if (isDraggingVertical) {
      if ((handle === 'start' && isDraggingStart) || (handle === 'end' && isDraggingEnd)) {
        return dragDirection > 0 ? 'pulse-increase' : 'pulse-decrease';
      }
    }
    return '';
  };

  // Função para determinar o formato atual do valor
  const getFormatoValor = () => {
    if (typeof value === 'string') {
      if (value.includes('-') && !value.includes(',')) {
        return 'intervalo';
      } else if (value.includes(',')) {
        return 'lista';
      } else if (value.trim()) {
        return 'unico';
      }
    }
    return 'vazio';
  };

  // Para debug, mostrar formato do valor
  const formatoValor = getFormatoValor();

  return (
    <div className="dias-administracao-selector">
      {/* Abas para seleção de modo */}
      <div className="flex mb-4 border border-gray-200 rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => handleModoChange('isolado')}
          className={`flex-1 py-2 px-4 text-sm focus:outline-none transition-colors ${
            modo === 'isolado' 
              ? 'bg-green-50 text-green-700 font-medium border-b-2 border-green-500' 
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Dias Isolados
        </button>
        <button
          type="button"
          onClick={() => handleModoChange('intervalo')}
          className={`flex-1 py-2 px-4 text-sm focus:outline-none transition-colors ${
            modo === 'intervalo' 
              ? 'bg-green-50 text-green-700 font-medium border-b-2 border-green-500' 
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Intervalo de Dias
        </button>
      </div>
      
      {/* Interface baseada no modo */}
      {modo === 'intervalo' ? (
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia Inicial</label>
              <select
                value={intervaloInicio}
                onChange={(e) => handleIntervaloChange('inicio', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                {DIAS_OPTIONS.map(dia => (
                  <option key={dia.value} value={dia.value}>{dia.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia Final</label>
              <select
                value={intervaloFim}
                onChange={(e) => handleIntervaloChange('fim', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                {DIAS_OPTIONS.map(dia => (
                  <option key={dia.value} value={dia.value}>{dia.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Visualização do intervalo interativa animada */}
          {intervaloInicio && intervaloFim && (
            <div className="mt-4 bg-green-50 p-3 rounded-md border border-green-100">
              <div className="text-sm font-medium text-green-800 mb-2 flex justify-between">
                <span>Intervalo selecionado:</span>
                <span className="text-xs text-gray-500">Dica: arraste para cima/baixo para ajustar valores</span>
              </div>
              <div className="relative">
                <div 
                  ref={rangeRef}
                  className="flex-1 h-3 bg-green-200 rounded-full relative mb-8 cursor-pointer"
                  onClick={(e) => {
                    if (!rangeRef.current) return;
                    
                    const rect = rangeRef.current.getBoundingClientRect();
                    const relativePosition = (e.clientX - rect.left) / rect.width;
                    const dayIndex = Math.round(relativePosition * maxDias); // D0 a DmaxDias
                    const newDay = `D${dayIndex}`;
                    
                    // Determina se o clique está mais próximo do início ou do fim
                    const startIndex = intervaloInicio ? parseInt(intervaloInicio.replace('D', '')) : 0;
                    const endIndex = intervaloFim ? parseInt(intervaloFim.replace('D', '')) : maxDias;
                    
                    if (Math.abs(dayIndex - startIndex) <= Math.abs(dayIndex - endIndex)) {
                      setIntervaloInicio(newDay);
                      handleIntervaloChange('inicio', newDay);
                    } else {
                      setIntervaloFim(newDay);
                      handleIntervaloChange('fim', newDay);
                    }
                  }}
                >
                  {/* Marcadores para cada 10 dias */}
                  {Array.from({ length: Math.floor(maxDias / 10) + 1 }, (_, i) => i * 10).map(day => (
                    <div
                      key={day}
                      className="absolute bottom-0 w-0.5 h-1.5 bg-green-300 transform translate-y-1"
                      style={{ left: `${(day / maxDias) * 100}%` }}
                    ></div>
                  ))}
                  
                  {/* Linha de preenchimento entre os pontos de início e fim */}
                  {intervaloInicio && intervaloFim && (
                    <div 
                      className="absolute top-0 bottom-0 bg-green-500 rounded-full"
                      style={{ 
                        left: `${(parseInt(intervaloInicio.replace('D', '')) / maxDias) * 100}%`,
                        right: `${100 - (parseInt(intervaloFim.replace('D', '')) / maxDias) * 100}%`
                      }}
                    ></div>
                  )}
                  
                  {/* Ponto de início com transformação CSS */}
                  <div 
                    className={`absolute -top-2 w-6 h-6 bg-white border-2 border-green-600 rounded-full slider-handle flex items-center justify-center ${isDraggingStart ? 'dragging' : ''} ${getHandleAnimationClass('start')}`}
                    style={{ left: `calc(${(parseInt(intervaloInicio.replace('D', '')) / maxDias) * 100}% - 10px)` }}
                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                    onTouchStart={(e) => handleTouchStart(e, 'start')}
                    title="Arraste para ajustar valor"
                  >
                    <span className="text-xs font-semibold text-green-700">{intervaloInicio.replace('D', '')}</span>
                  </div>

                  <div 
                    className={`absolute -top-2 w-6 h-6 bg-white border-2 border-green-600 rounded-full slider-handle flex items-center justify-center ${isDraggingEnd ? 'dragging' : ''} ${getHandleAnimationClass('end')}`}
                    style={{ left: `calc(${(parseInt(intervaloFim.replace('D', '')) / maxDias) * 100}% - 10px)` }}
                    onMouseDown={(e) => handleMouseDown(e, 'end')}
                    onTouchStart={(e) => handleTouchStart(e, 'end')}
                    title="Arraste para ajustar valor"
                  >
                    <span className="text-xs font-semibold text-green-700">{intervaloFim.replace('D', '')}</span>
                  </div>
                  
                  {/* Setas de direção de arrasto */}
                  {isDraggingVertical && isDraggingStart && (
                    <div className="absolute -top-11 text-green-700 animate-bounce" 
                         style={{ left: `calc(${(parseInt(intervaloInicio.replace('D', '')) / maxDias) * 100}% - 4px)` }}>
                      {dragDirection > 0 ? '↑' : '↓'}
                    </div>
                  )}
                  
                  {isDraggingVertical && isDraggingEnd && (
                    <div className="absolute -top-11 text-green-700 animate-bounce" 
                         style={{ left: `calc(${(parseInt(intervaloFim.replace('D', '')) / maxDias) * 100}% - 4px)` }}>
                      {dragDirection > 0 ? '↑' : '↓'}
                    </div>
                  )}
                </div>
                
                {/* Marcadores de texto para dias importantes */}
                <div className="flex justify-between text-xs text-green-700 mt-1">
                  {Array.from({ length: Math.floor(maxDias / 10) + 1 }, (_, i) => i * 10).map(day => (
                    <span key={day}>D{day}</span>
                  ))}
                </div>
                
                <div className="text-sm text-center mt-4 text-green-700">
                  {diasSelecionados.length} dias selecionados: {intervaloInicio} a {intervaloFim}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md p-4">
          {/* Dias selecionados como tags */}
          {diasSelecionados.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dias selecionados:</label>
              <div className="flex flex-wrap gap-2">
                {diasSelecionados.map(dia => (
                  <span key={dia} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {dia}
                    <button
                      type="button"
                      onClick={() => removeDia(dia)}
                      className="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-green-400 hover:text-green-500 focus:outline-none"
                    >
                      <span className="sr-only">Remover</span>
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Pesquisa rápida */}
          <div className="mb-3">
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar dia específico..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Interface de seleção */}
          {searchText.length > 0 ? (
            // Opções filtradas quando há pesquisa
            <div className="bg-gray-50 rounded-md border border-gray-200 p-2 max-h-48 overflow-auto">
              {diasFiltrados.length > 0 ? (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                  {diasFiltrados.map(dia => (
                    <label key={dia.value} className={`
                      px-2 py-1 rounded text-sm text-center cursor-pointer 
                      ${diasSelecionados.includes(dia.value) 
                        ? 'bg-green-200 text-green-800 font-medium border border-green-300' 
                        : 'hover:bg-gray-200 bg-white border border-gray-300'}
                    `}>
                      <input
                        type="checkbox"
                        checked={diasSelecionados.includes(dia.value)}
                        onChange={(e) => handleDiaChange(dia.value, e.target.checked)}
                        className="sr-only"
                      />
                      {dia.label}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 text-gray-500 text-sm">
                  Nenhum dia encontrado
                </div>
              )}
            </div>
          ) : (
            // Opções agrupadas quando não há pesquisa
            <div className="rounded-md border border-gray-200 max-h-48 overflow-auto">
              {diasAgrupados.map((grupo, i) => (
                <div key={i} className={`p-2 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {grupo.map(dia => (
                      <label key={dia.value} className={`
                        px-1 py-1 rounded text-xs text-center cursor-pointer 
                        ${diasSelecionados.includes(dia.value) 
                          ? 'bg-green-200 text-green-800 font-medium border border-green-300' 
                          : 'hover:bg-gray-100 border border-gray-200'}
                      `}>
                        <input
                          type="checkbox"
                          checked={diasSelecionados.includes(dia.value)}
                          onChange={(e) => handleDiaChange(dia.value, e.target.checked)}
                          className="sr-only"
                        />
                        {dia.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Estilos para animações */}
      <style jsx>{`
        @keyframes pulse-increase {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
          50% { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.0); }
        }
        
        @keyframes pulse-decrease {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { transform: scale(0.85); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.0); }
        }
        
        .pulse-increase {
          animation: pulse-increase 0.8s ease infinite;
          border-color: rgb(22, 163, 74);
        }
        
        .pulse-decrease {
          animation: pulse-decrease 0.8s ease infinite;
          border-color: rgb(239, 68, 68);
        }
        
        /* Transição suave para os handles */
        .dias-administracao-selector [style*="left:"] {
          transition: left 0.1s ease-out;
        }
        
        /* Quando estiver arrastando, remova a transição para movimento mais responsivo */
        .slider-handle.dragging {
          transition: none !important;
        }
      `}</style>
    </div>
  );
};

export default DiasAdministracaoSelector;