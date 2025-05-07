import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProtocolo } from '../../../context/ProtocoloContext';
import { 
  Plus, Edit, Trash2, Search, X, Save, ArrowUpWideNarrow, 
  ArrowDownWideNarrow, Database, ChevronDown, ChevronRight, Check,
  Info, AlertCircle, Film, Pill, Calendar, Clock, Droplet
} from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showWarningAlert } from '../../../utils/CustomAlerts';
import CIDSelection from '../../../components/pacientes/CIDSelection';
import CacheService from '../../../services/CacheService';
import './PacientesEstilos.css';

// Definições das constantes para as opções predefinidas
const UNIDADES_MEDIDA_PREDEFINIDAS = [
  { id: 'Mg', sigla: 'Mg', nome: 'Miligrama' },
  { id: 'Mg2', sigla: 'Mg2', nome: 'Miligrama por m²' },
  { id: 'MgKg', sigla: 'MgKg', nome: 'Miligrama por quilograma' },
  { id: 'AUC', sigla: 'AUC', nome: 'Área sob a curva' }
];

const FREQUENCIAS_ADMINISTRACAO = [
  { value: '1x', label: '1x' },
  { value: '2x', label: '2x' },
  { value: '3x', label: '3x' },
  { value: '4x', label: '4x' },
  { value: '5x', label: '5x' }
];

// Componente DiasAdministracaoSelector melhorado
const DiasAdministracaoSelector = ({ value, onChange }) => {
  // Gera dias de D0 a D70
  const DIAS_OPTIONS = Array.from({ length: 71 }, (_, i) => ({
    value: `D${i}`,
    label: `D${i}`
  }));
  
  // Parse o valor inicial
  const [modo, setModo] = useState('isolado'); // 'isolado' ou 'intervalo'
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [intervaloInicio, setIntervaloInicio] = useState('');
  const [intervaloFim, setIntervaloFim] = useState('');
  const [searchText, setSearchText] = useState('');
  
  // Estados para controlar a interação com a barra de intervalo
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const [dragSpeed, setDragSpeed] = useState(1); // Velocidade de arrasto (1-5)
  const [animationStartTime, setAnimationStartTime] = useState(null);
  const [animationActive, setAnimationActive] = useState(false);
  const [dragDirection, setDragDirection] = useState(0); // -1: diminuindo, 0: parado, 1: aumentando
  const [currentHandleValue, setCurrentHandleValue] = useState(null);
  
  const rangeRef = useRef(null);
  const animationRef = useRef(null);
  const initialDragDetectionDone = useRef(false);
  const verticalDistanceAccumulator = useRef(0);


  {/* // Função de debounce
  const debounce = (func, delay) => {
    return (...args) => {
      if (debouncedUpdate.current) {
        clearTimeout(debouncedUpdate.current);
      }
      debouncedUpdate.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Debounce para atualizações menos críticas
  const updateIntervaloValue = debounce((tipo, valor) => {
    onChange(tipo === 'inicio' 
      ? `${valor}-${intervaloFim}` 
      : `${intervaloInicio}-${valor}`);
  }, 50); // 50ms de delay */}
  
  // Parse o valor recebido (string) para o estado interno
  useEffect(() => {
    if (!value) return;
    
    // Tenta detectar se é um intervalo (ex: D3-D10) ou dias isolados (ex: D1,D3,D7)
    if (value.includes('-')) {
      // É um intervalo
      const [inicio, fim] = value.split('-');
      setModo('intervalo');
      setIntervaloInicio(inicio);
      setIntervaloFim(fim);
      
      // Também define os dias selecionados correspondentes ao intervalo
      const inicioNum = parseInt(inicio.replace('D', ''));
      const fimNum = parseInt(fim.replace('D', ''));
      
      const novosSelecioados = [];
      for (let i = inicioNum; i <= fimNum; i++) {
        novosSelecioados.push(`D${i}`);
      }
      setDiasSelecionados(novosSelecioados);
    } else {
      // São dias isolados
      setModo('isolado');
      const dias = value.split(',').filter(d => d.trim()).map(d => d.trim());
      setDiasSelecionados(dias);
    }
  }, [value]);
  
  // Função para atualizar o valor quando o modo muda
  const handleModoChange = (novoModo) => {
    setModo(novoModo);
    
    // Se mudar para intervalo, usa os dois primeiros dias selecionados como inicio/fim, se houver
    if (novoModo === 'intervalo' && diasSelecionados.length >= 2) {
      // Ordena os dias selecionados
      const diasOrdenados = [...diasSelecionados].sort((a, b) => {
        return parseInt(a.replace('D', '')) - parseInt(b.replace('D', ''));
      });
      
      setIntervaloInicio(diasOrdenados[0]);
      setIntervaloFim(diasOrdenados[diasOrdenados.length - 1]);
      
      // Agora atualizamos o valor
      onChange(`${diasOrdenados[0]}-${diasOrdenados[diasOrdenados.length - 1]}`);
    } else if (novoModo === 'isolado') {
      // Se mudar para isolado, usa os dias já selecionados no intervalo
      onChange(diasSelecionados.join(','));
    }
  };
  
  // Atualiza dias selecionados no modo isolado
  const handleDiaChange = (dia, isChecked) => {
    let novosDias;
    
    if (isChecked) {
      novosDias = [...diasSelecionados, dia].sort((a, b) => {
        return parseInt(a.replace('D', '')) - parseInt(b.replace('D', ''));
      });
    } else {
      novosDias = diasSelecionados.filter(d => d !== dia);
    }
    
    setDiasSelecionados(novosDias);
    onChange(novosDias.join(','));
  };
  
  // Atualiza o intervalo
  const handleIntervaloChange = (tipo, valor) => {
    if (tipo === 'inicio') {
      setIntervaloInicio(valor);
      
      if (intervaloFim) {
        const inicioNum = parseInt(valor.replace('D', ''));
        const fimNum = parseInt(intervaloFim.replace('D', ''));
        
        if (inicioNum > fimNum) {
          setIntervaloFim(valor);
          onChange(`${valor}-${valor}`); // Mantém formato de intervalo
          
          // Atualiza os dias selecionados
          setDiasSelecionados([valor]);
          return;
        }
        
        // Atualiza o valor com o novo intervalo
        onChange(`${valor}-${intervaloFim}`); // Mantém formato de intervalo
        
        // Atualiza os dias selecionados
        const novosSelecioados = [];
        for (let i = inicioNum; i <= fimNum; i++) {
          novosSelecioados.push(`D${i}`);
        }
        setDiasSelecionados(novosSelecioados);
      } else {
        setIntervaloFim(valor);
        onChange(`${valor}-${valor}`); // Mantém formato de intervalo
        setDiasSelecionados([valor]);
      }
    } else if (tipo === 'fim') {
      setIntervaloFim(valor);
      
      if (intervaloInicio) {
        const inicioNum = parseInt(intervaloInicio.replace('D', ''));
        const fimNum = parseInt(valor.replace('D', ''));
        
        if (fimNum < inicioNum) {
          setIntervaloInicio(valor);
          onChange(`${valor}-${valor}`); // Mantém formato de intervalo
          
          setDiasSelecionados([valor]);
          return;
        }
        
        onChange(`${intervaloInicio}-${valor}`); // Mantém formato de intervalo
        
        const novosSelecioados = [];
        for (let i = inicioNum; i <= fimNum; i++) {
          novosSelecioados.push(`D${i}`);
        }
        setDiasSelecionados(novosSelecioados);
      } else {
        setIntervaloInicio(valor);
        onChange(`${valor}-${valor}`); // Mantém formato de intervalo
        setDiasSelecionados([valor]);
      }
    }
  };
  

  // Função para remover um dia selecionado (modo isolado)
  const removeDia = (dia) => {
    const novosDias = diasSelecionados.filter(d => d !== dia);
    setDiasSelecionados(novosDias);
    onChange(novosDias.join(','));
  };

  // Animação para incrementar/decrementar valores quando arrastar verticalmente
  const animateValueChange = useCallback((timestamp) => {
    if (!animationActive || !currentHandleValue) {
      animationRef.current = null;
      return;
    }
    
    if (!animationStartTime) {
      setAnimationStartTime(timestamp);
      animationRef.current = requestAnimationFrame(animateValueChange);
      return;
    }
    
    // Determine o intervalo entre frames de animação (quanto maior o dragSpeed, menor o intervalo)
    const interval = 500 / dragSpeed; // milissegundos
    
    // Verificar se passou tempo suficiente para atualizar o valor
    if (timestamp - animationStartTime >= interval) {
      // Atualiza o valor com base na direção do arrasto
      const currentValue = parseInt(currentHandleValue.replace('D', ''));
      let newValue = currentValue + dragDirection;
      
      // Limita o valor entre 0 e 70
      newValue = Math.max(0, Math.min(70, newValue));
      
      // Atualiza o valor apropriado (início ou fim)
      if (isDraggingStart) {
        const endValue = parseInt(intervaloFim.replace('D', ''));
        if (newValue <= endValue) {
          const newDay = `D${newValue}`;
          setIntervaloInicio(newDay);
          setCurrentHandleValue(newDay);
          handleIntervaloChange('inicio', newDay);
        }
      } else if (isDraggingEnd) {
        const startValue = parseInt(intervaloInicio.replace('D', ''));
        if (newValue >= startValue) {
          const newDay = `D${newValue}`;
          setIntervaloFim(newDay);
          setCurrentHandleValue(newDay);
          handleIntervaloChange('fim', newDay);
        }
      }
      
      // Reinicia o tempo de animação
      setAnimationStartTime(timestamp);
    }
    
    // Continua a animação
    animationRef.current = requestAnimationFrame(animateValueChange);
  }, [animationActive, currentHandleValue, dragDirection, dragSpeed, animationStartTime, isDraggingStart, isDraggingEnd, intervaloInicio, intervaloFim, handleIntervaloChange]);

  // Ativar a animação quando arrastar verticalmente
  // Ativar a animação quando arrastar verticalmente
  useEffect(() => {
    if (animationActive && !animationRef.current) {
      animationRef.current = requestAnimationFrame(animateValueChange);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [animationActive, animateValueChange]);

  // Funções para manipular a interação com a barra
  const handleMouseDown = (e, type) => {
    e.preventDefault(); // Previne comportamento padrão
    e.stopPropagation(); // Evita que o evento se propague
    
    // Define qual handle está sendo arrastado
    if (type === 'start') {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
    
    // Armazena a posição inicial do clique
    setLastMousePosition({ x: e.clientX, y: e.clientY });
    
    // Adiciona os event listeners para movimento e soltar
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Define como ativo para iniciar o movimento
    setDragDirection(0);
    setIsDraggingVertical(false);
    verticalDistanceAccumulator.current = 0;
    
    // Garante que o handle esteja em primeiro plano
    e.currentTarget.style.zIndex = "100";
  };

  const handleTouchStart = (e, type) => {
    e.preventDefault();
    const touch = e.touches[0];
    
    if (type === 'start') {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }
    
    setLastMousePosition({ x: touch.clientX, y: touch.clientY });
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    setDragDirection(0);
    setIsDraggingVertical(false);
    verticalDistanceAccumulator.current = 0;
    
    e.currentTarget.style.zIndex = "100";
  };

  // Função para atualizar o valor baseado na posição horizontal do mouse
  const updatePositionFromMouse = (clientX) => {
    if (!rangeRef.current || (!isDraggingStart && !isDraggingEnd)) return;
    
    // Cálculo direto e simples
    const rect = rangeRef.current.getBoundingClientRect();
    const total = 70;
    
    let relativePosition = (clientX - rect.left) / rect.width;
    relativePosition = Math.max(0, Math.min(1, relativePosition));
    
    const dayIndex = Math.round(relativePosition * total);
    const newDay = `D${dayIndex}`;
    
    // Atualização sem debounce ou requestAnimationFrame
    if (isDraggingStart) {
      const endIndex = parseInt(intervaloFim.replace('D', ''));
      if (dayIndex <= endIndex) {
        setIntervaloInicio(newDay);
        setCurrentHandleValue(newDay);
        // Atualização direta
        onChange(`${newDay}-${intervaloFim}`);
        
        // Atualizar os dias selecionados
        const novosSelecioados = [];
        for (let i = dayIndex; i <= endIndex; i++) {
          novosSelecioados.push(`D${i}`);
        }
        setDiasSelecionados(novosSelecioados);
      }
    } else if (isDraggingEnd) {
      const startIndex = parseInt(intervaloInicio.replace('D', ''));
      if (dayIndex >= startIndex) {
        setIntervaloFim(newDay);
        setCurrentHandleValue(newDay);
        // Atualização direta
        onChange(`${intervaloInicio}-${newDay}`);
        
        // Atualizar os dias selecionados
        const novosSelecioados = [];
        for (let i = startIndex; i <= dayIndex; i++) {
          novosSelecioados.push(`D${i}`);
        }
        setDiasSelecionados(novosSelecioados);
      }
    }
  };

  const handleMouseMove = useCallback((e) => {
    e.preventDefault();
    
    if (!rangeRef.current) return;
    
    // Obter a posição relativa no controle deslizante
    const rect = rangeRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const day = Math.round(percentage * 70);
    const newDay = `D${day}`;
    
    // Atualizar o valor com base em qual handle está sendo arrastado
    if (isDraggingStart) {
      const endDay = parseInt(intervaloFim.replace('D', ''));
      if (day <= endDay) {
        setIntervaloInicio(newDay);
        // Manter o formato de intervalo
        onChange(`${newDay}-${intervaloFim}`);
        
        // Atualizar a lista de dias selecionados para uso interno
        const dias = [];
        for (let i = day; i <= endDay; i++) {
          dias.push(`D${i}`);
        }
        setDiasSelecionados(dias);
      }
    } else if (isDraggingEnd) {
      const startDay = parseInt(intervaloInicio.replace('D', ''));
      if (day >= startDay) {
        setIntervaloFim(newDay);
        // Manter o formato de intervalo
        onChange(`${intervaloInicio}-${newDay}`);
        
        // Atualizar a lista de dias selecionados para uso interno
        const dias = [];
        for (let i = startDay; i <= day; i++) {
          dias.push(`D${i}`);
        }
        setDiasSelecionados(dias);
      }
    }
    
    // Atualizar a posição do mouse para a próxima iteração
    setLastMousePosition({ x: e.clientX, y: e.clientY });
  }, [isDraggingStart, isDraggingEnd, intervaloInicio, intervaloFim, onChange]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    
    if (!rangeRef.current) return;
    
    const rect = rangeRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const day = Math.round(percentage * 70);
    const newDay = `D${day}`;
    
    if (isDraggingStart) {
      const endDay = parseInt(intervaloFim.replace('D', ''));
      if (day <= endDay) {
        setIntervaloInicio(newDay);
        onChange(`${newDay}-${intervaloFim}`);
      }
    } else if (isDraggingEnd) {
      const startDay = parseInt(intervaloInicio.replace('D', ''));
      if (day >= startDay) {
        setIntervaloFim(newDay);
        onChange(`${intervaloInicio}-${newDay}`);
      }
    }
    
    setLastMousePosition({ x: touch.clientX, y: touch.clientY });
  }, [isDraggingStart, isDraggingEnd, intervaloInicio, intervaloFim, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setIsDraggingVertical(false);
    
    // Remove os event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDraggingStart(false);
    setIsDraggingEnd(false);
    setIsDraggingVertical(false);
    
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);

  // Limpe os event listeners quando o componente for desmontado
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleMouseMove, handleMouseUp]);

  // Filtra dias para busca rápida
  const diasFiltrados = searchText.length > 0 
    ? DIAS_OPTIONS.filter(dia => dia.label.toLowerCase().includes(searchText.toLowerCase()))
    : DIAS_OPTIONS;
  
  // Agrupa dias em grupos de 10 para exibição mais organizada
  const diasAgrupados = [];
  if (modo === 'isolado') {
    for (let i = 0; i < 71; i += 10) {
      const grupo = DIAS_OPTIONS.slice(i, i + 10);
      diasAgrupados.push(grupo);
    }
  }
  
  // Animação visual durante o arrasto vertical
  const getHandleAnimationClass = (tipo) => {
    if (dragDirection === 0) return '';
    
    if ((tipo === 'start' && isDraggingStart) || (tipo === 'end' && isDraggingEnd)) {
      return dragDirection > 0 ? 'pulse-increase' : 'pulse-decrease';
    }
    
    return '';
  };
  
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
                    const dayIndex = Math.round(relativePosition * 70); // D0 a D70
                    const newDay = `D${dayIndex}`;
                    
                    // Determina se o clique está mais próximo do início ou do fim
                    const startIndex = intervaloInicio ? parseInt(intervaloInicio.replace('D', '')) : 0;
                    const endIndex = intervaloFim ? parseInt(intervaloFim.replace('D', '')) : 70;
                    
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
                  {[0, 10, 20, 30, 40, 50, 60, 70].map(day => (
                    <div
                      key={day}
                      className="absolute bottom-0 w-0.5 h-1.5 bg-green-300 transform translate-y-1"
                      style={{ left: `${(day / 70) * 100}%` }}
                    ></div>
                  ))}
                  
                  {/* Linha de preenchimento entre os pontos de início e fim */}
                  {intervaloInicio && intervaloFim && (
                    <div 
                      className="absolute top-0 bottom-0 bg-green-500 rounded-full"
                      style={{ 
                        left: `${(parseInt(intervaloInicio.replace('D', '')) / 70) * 100}%`,
                        right: `${100 - (parseInt(intervaloFim.replace('D', '')) / 70) * 100}%`
                      }}
                    ></div>
                  )}
                  
                  {/* Ponto de início com transformação CSS */}
                  <div 
                    className={`absolute -top-2 w-6 h-6 bg-white border-2 border-green-600 rounded-full slider-handle ${isDraggingStart ? 'dragging' : ''} ${getHandleAnimationClass('start')}`}
                    style={{ left: `calc(${(parseInt(intervaloInicio.replace('D', '')) / 70) * 100}% - 10px)` }}
                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                    onTouchStart={(e) => handleTouchStart(e, 'start')} // Adicionando suporte a toque
                    title="Arraste para ajustar valor"
                  >
                    <span className="text-xs font-semibold text-green-700">{intervaloInicio.replace('D', '')}</span>
                  </div>

                  <div 
                    className={`absolute -top-2 w-6 h-6 bg-white border-2 border-green-600 rounded-full slider-handle ${isDraggingEnd ? 'dragging' : ''} ${getHandleAnimationClass('end')}`}
                    style={{ left: `calc(${(parseInt(intervaloFim.replace('D', '')) / 70) * 100}% - 10px)` }}
                    onMouseDown={(e) => handleMouseDown(e, 'end')}
                    onTouchStart={(e) => handleTouchStart(e, 'end')} // Adicionando suporte a toque
                    title="Arraste para ajustar valor"
                  >
                    <span className="text-xs font-semibold text-green-700">{intervaloFim.replace('D', '')}</span>
                  </div>
                  
                  {/* Setas de direção de arrasto */}
                  {isDraggingVertical && isDraggingStart && (
                    <div className="absolute -top-11 text-green-700 animate-bounce" 
                         style={{ left: `calc(${(parseInt(intervaloInicio.replace('D', '')) / 70) * 100}% - 4px)` }}>
                      {dragDirection > 0 ? '↑' : '↓'}
                    </div>
                  )}
                  
                  {isDraggingVertical && isDraggingEnd && (
                    <div className="absolute -top-11 text-green-700 animate-bounce" 
                         style={{ left: `calc(${(parseInt(intervaloFim.replace('D', '')) / 70) * 100}% - 4px)` }}>
                      {dragDirection > 0 ? '↑' : '↓'}
                    </div>
                  )}
                </div>
                
                {/* Marcadores de texto para dias importantes */}
                <div className="flex justify-between text-xs text-green-700 mt-1">
                  <span>D0</span>
                  <span>D10</span>
                  <span>D20</span>
                  <span>D30</span>
                  <span>D40</span>
                  <span>D50</span>
                  <span>D60</span>
                  <span>D70</span>
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
        .cursor-grabbing {
          transition: none !important;
        }
      `}</style>
    </div>
  );
};

// Chaves para cache dos medicamentos
const CACHE_KEYS = {
  MEDICAMENTOS_CACHE: 'cached_medicamentos_por_protocolo',
  MEDICAMENTO_CACHE_PREFIX: 'cached_medicamento_protocolo_',
  MEDICAMENTOS_TIMESTAMP: 'medicamentos_last_update'
};

const CadastroProtocolo = () => {
  // Contexto com todas as propriedades necessárias
  const { 
    filteredProtocolos, 
    loading, 
    error, 
    addProtocolo, 
    updateProtocolo, 
    deleteProtocolo, 
    selectProtocolo,
    selectedProtocolo,
    searchProtocolos,
    searchTerm,
    loadProtocolos,
    viasAdministracao,
    loadProtocoloServicos,
    loadProtocoloDetails,
    addServicoToProtocolo,
    deleteServicoFromProtocolo,
    updateServicoProtocolo,
    
    // Propriedades de cache (se necessário)
    isCacheEnabled,
    dataSource: contextDataSource,
    totalRecords,
    toggleCache,
    clearCache,
    forceRevalidation,
    reloadAllData,
    refreshDataAfterModification: contextRefreshData
  } = useProtocolo();

  // Estados para controle da UI
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("Protocolo_Nome");
  const [searchType, setSearchType] = useState("nome");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [updateError, setUpdateError] = useState(null);
  const [servicosLoading, setServicosLoading] = useState({});
  const [dataSource, setDataSource] = useState('');
  const [cacheRefreshed, setCacheRefreshed] = useState(false);
  const [orderedProtocolos, setOrderedProtocolos] = useState([]);
  // Usamos as unidades predefinidas em vez de fazer a carga da API
  const [unidadesMedida, setUnidadesMedida] = useState(UNIDADES_MEDIDA_PREDEFINIDAS);
  const [allMedicamentosLoaded, setAllMedicamentosLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [medicamentosCache, setMedicamentosCache] = useState({});

  // Refs
  const searchInputRef = useRef(null);
  const loadedProtocolIds = useRef(new Set());
  const medicamentosLoadingPromise = useRef(null);

  // Estado para o formulário expandido com medicamentos
  const [formData, setFormData] = useState({
    Protocolo_Nome: '',
    Protocolo_Sigla: '',
    CID: '',
    Intervalo_Ciclos: '',
    Ciclos_Previstos: '',
    Linha: '',
    medicamentos: [] // Iniciar como array vazio, não com um medicamento vazio
  });

  // Funções para gerenciar o cache de medicamentos
  const saveMedicamentosToCache = (medicamentosData) => {
    if (!isCacheEnabled) return;
    
    try {
      // Armazenar o timestamp da última atualização
      localStorage.setItem(CACHE_KEYS.MEDICAMENTOS_TIMESTAMP, Date.now().toString());
      
      // Armazenar o mapeamento de medicamentos por protocolo
      localStorage.setItem(CACHE_KEYS.MEDICAMENTOS_CACHE, JSON.stringify(medicamentosData));
      
      console.log(`Cache de medicamentos atualizado: ${Object.keys(medicamentosData).length} protocolos`);
    } catch (error) {
      console.error("Erro ao salvar medicamentos no cache:", error);
    }
  };

  const loadMedicamentosFromCache = () => {
    if (!isCacheEnabled) return null;
    
    try {
      // Verificar se o cache existe
      const cachedData = localStorage.getItem(CACHE_KEYS.MEDICAMENTOS_CACHE);
      if (!cachedData) return null;
      
      // Verificar se o cache está obsoleto
      const lastUpdate = localStorage.getItem(CACHE_KEYS.MEDICAMENTOS_TIMESTAMP);
      const lastWrite = CacheService.getLastWriteTimestamp();
      
      // Se o timestamp de escrita global for mais recente que a última atualização do cache,
      // considerar o cache obsoleto
      if (lastWrite && lastUpdate && parseInt(lastWrite) > parseInt(lastUpdate)) {
        console.log("Cache de medicamentos está obsoleto devido a modificações recentes");
        return null;
      }
      
      const parsedData = JSON.parse(cachedData);
      console.log(`Carregado cache de medicamentos: ${Object.keys(parsedData).length} protocolos`);
      
      return parsedData;
    } catch (error) {
      console.error("Erro ao carregar medicamentos do cache:", error);
      return null;
    }
  };

  const invalidateMedicamentosCache = () => {
    try {
      localStorage.removeItem(CACHE_KEYS.MEDICAMENTOS_CACHE);
      console.log("Cache de medicamentos invalidado");
    } catch (error) {
      console.error("Erro ao invalidar cache de medicamentos:", error);
    }
  };

  // Função para carregar unidades de medida - Não é mais necessária, pois usamos unidades predefinidas
  const loadUnidadesMedida = async () => {
    // Apenas define as unidades predefinidas
    setUnidadesMedida(UNIDADES_MEDIDA_PREDEFINIDAS);
  };

  // Nova função para verificar se há medicamentos no cache
  const getMedicamentosFromCache = (protocoloId) => {
    return medicamentosCache[protocoloId] || null;
  };

  // Carrega dados iniciais
  useEffect(() => {
    const initializeData = async () => {
      try {
        setInitialLoading(true);
        
        // Inicializar o serviço de cache
        CacheService.init();
        
        // Não precisamos mais carregar unidades de medida da API
        // Já estão definidas na constante UNIDADES_MEDIDA_PREDEFINIDAS
        
        // Verificar se há medicamentos em cache
        const cachedMedicamentos = loadMedicamentosFromCache();
        
        if (cachedMedicamentos) {
          // Se tiver cache, usar diretamente
          setMedicamentosCache(cachedMedicamentos);
          setAllMedicamentosLoaded(true);
          console.log("Usando medicamentos do cache");
        }
        
        // Carregar protocolos
        const protocolData = await loadProtocolos();
        
        // Se não tiver cache de medicamentos, carregar todos
        if (!cachedMedicamentos) {
          await loadAllMedicamentos(protocolData);
        }
      } catch (error) {
        console.error("Erro durante inicialização:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    initializeData();
  }, [loadProtocolos]);

  // Atualiza medicamentos específicos ao expandir um protocolo (apenas se não estiverem já carregados)
  useEffect(() => {
    const protocolIds = Object.keys(expandedRows).filter(id => expandedRows[id].expanded);
    protocolIds.forEach(protocoloId => {
      const numericId = parseInt(protocoloId, 10);
      
      // Verifica se já temos os medicamentos no cache
      if (!getMedicamentosFromCache(numericId) && !loadedProtocolIds.current.has(numericId)) {
        loadedProtocolIds.current.add(numericId);
        fetchServicos(numericId);
      }
    });
  }, [expandedRows]);

  // Função para carregar todos os medicamentos de uma vez
  const loadAllMedicamentos = async (protocolos) => {
    if (!protocolos || protocolos.length === 0 || allMedicamentosLoaded) {
      return;
    }
    
    // Se já houver um carregamento em andamento, aguardar
    if (medicamentosLoadingPromise.current) {
      await medicamentosLoadingPromise.current;
      return;
    }
    
    try {
      console.log("Carregando medicamentos para todos os protocolos...");
      
      // Criar e armazenar a promessa de carregamento
      const loadPromise = (async () => {
        // Array para armazenar as promessas de carregamento
        const loadPromises = [];
        
        // Armazenar medicamentos por ID de protocolo
        const medicamentosPorProtocolo = {};
        
        // Para cada protocolo, criar uma promessa para carregar seus medicamentos
        protocolos.forEach(protocolo => {
          const protocoloId = protocolo.id;
          
          // Adicionar ID ao conjunto de IDs carregados
          loadedProtocolIds.current.add(protocoloId);
          
          // Criar promessa para carregar medicamentos
          loadPromises.push(
            loadProtocoloServicos(protocoloId)
              .then(servicos => {
                // Armazenar medicamentos no dicionário
                medicamentosPorProtocolo[protocoloId] = servicos || [];
                return { id: protocoloId, medicamentos: servicos || [] };
              })
              .catch(error => {
                console.error(`Erro ao carregar serviços para protocolo ${protocoloId}:`, error);
                medicamentosPorProtocolo[protocoloId] = [];
                return { id: protocoloId, medicamentos: [] };
              })
          );
        });
        
        // Executar todas as promessas em paralelo
        const results = await Promise.all(loadPromises);
        
        // Atualizar o cache de medicamentos
        setMedicamentosCache(medicamentosPorProtocolo);
        
        // Salvar no cache
        saveMedicamentosToCache(medicamentosPorProtocolo);
        
        // Atualizar os protocolos com os medicamentos carregados
        const updatedProtocolos = protocolos.map(protocolo => {
          const result = results.find(r => r.id === protocolo.id);
          if (result) {
            return {
              ...protocolo,
              medicamentos: result.medicamentos
            };
          }
          return protocolo;
        });
        
        // Atualizar o estado com os protocolos atualizados
        setOrderedProtocolos(updatedProtocolos);
        setAllMedicamentosLoaded(true);
        console.log("Todos os medicamentos carregados com sucesso!");
        
        // Limpar a referência da promessa
        medicamentosLoadingPromise.current = null;
      })();
      
      // Armazenar a promessa para poder aguardar se necessário
      medicamentosLoadingPromise.current = loadPromise;
      
      // Aguardar a conclusão
      await loadPromise;
      
    } catch (error) {
      console.error("Erro ao carregar todos os medicamentos:", error);
      medicamentosLoadingPromise.current = null;
    }
  };

  // Sincronizar dataSource do contexto
  useEffect(() => {
    if (contextDataSource) {
      setDataSource(contextDataSource);
    }
  }, [contextDataSource]);

  // Efeito para ordenar protocolos
  useEffect(() => {
    if (!filteredProtocolos || !Array.isArray(filteredProtocolos) || filteredProtocolos.length === 0) return;
  
    const sorted = [...filteredProtocolos].sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      const numericFields = ['id', 'Protocolo_Dose_M', 'Protocolo_Dose_Total'];
      
      if (numericFields.includes(sortField) && !isNaN(aValue) && !isNaN(bValue)) {
        const numA = Number(aValue);
        const numB = Number(bValue);
        const comparison = numA - numB;
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });
    
    // Manter medicamentos que já foram carregados anteriormente
    const sortedWithMedicamentos = sorted.map(protocolo => {
      // Verificar se há medicamentos no cache para este protocolo
      const cachedMedicamentos = getMedicamentosFromCache(protocolo.id);
      if (cachedMedicamentos) {
        return { ...protocolo, medicamentos: cachedMedicamentos };
      }
      return protocolo;
    });
    
    setOrderedProtocolos(sortedWithMedicamentos);
  }, [filteredProtocolos, sortField, sortOrder, medicamentosCache]);

  // Função para carregar serviços de um protocolo específico
  const fetchServicos = useCallback(async (protocoloId) => {
    if (!protocoloId) return;
    
    // Verificar se já temos os medicamentos no cache
    if (medicamentosCache[protocoloId]) {
      console.log(`Usando medicamentos em cache para protocolo ${protocoloId}`);
      
      // Atualizar expandedRows com os medicamentos do cache
      setExpandedRows(prev => {
        if (!prev[protocoloId]) return prev;
        
        return {
          ...prev,
          [protocoloId]: {
            ...prev[protocoloId],
            expanded: true,
            servicos: medicamentosCache[protocoloId],
            medicamentos: medicamentosCache[protocoloId]
          }
        };
      });
      
      return medicamentosCache[protocoloId];
    }
    
    try {
      setServicosLoading(prev => ({ ...prev, [protocoloId]: true }));
      
      const servicos = await loadProtocoloServicos(protocoloId);
      
      // Atualizar o cache de medicamentos
      setMedicamentosCache(prev => {
        const newCache = { ...prev, [protocoloId]: servicos || [] };
        // Salvar no cache local
        saveMedicamentosToCache(newCache);
        return newCache;
      });
      
      // Atualizar expandedRows com os serviços carregados
      setExpandedRows(prev => {
        if (!prev[protocoloId]) return prev;
        
        return {
          ...prev,
          [protocoloId]: {
            ...prev[protocoloId],
            expanded: true,
            servicos: servicos || [],
            medicamentos: servicos || []
          }
        };
      });
      
      // Atualizar os protocolos exibidos com os medicamentos
      setOrderedProtocolos(prev => 
        prev.map(p => {
          if (p.id == protocoloId || p.id_protocolo == protocoloId) {
            return {...p, medicamentos: servicos || []};
          }
          return p;
        })
      );
      
      return servicos;
    } catch (error) {
      console.error(`Erro ao carregar serviços para protocolo ${protocoloId}:`, error);
      return [];
    } finally {
      setServicosLoading(prev => ({ ...prev, [protocoloId]: false }));
    }
  }, [loadProtocoloServicos, medicamentosCache]);

  // Função para alternar a expansão de uma linha
  const toggleRowExpansion = useCallback((protocoloId) => {
    // Se estiver em modo de edição ou adição, não permitir expandir
    if (isEditing || isAdding) return;
    
    setExpandedRows(prev => {
      const wasExpanded = prev[protocoloId] && prev[protocoloId].expanded;
      
      // Se a linha já estava expandida, apenas a feche
      if (wasExpanded) {
        return {};
      } else {
        // Caso contrário, feche todas as outras e expanda apenas a selecionada
        // Verificar se temos medicamentos no cache para este protocolo
        const cachedMedicamentos = getMedicamentosFromCache(protocoloId);
        
        return {
          [protocoloId]: {
            expanded: true,
            servicos: cachedMedicamentos || prev[protocoloId]?.servicos || [],
            medicamentos: cachedMedicamentos || prev[protocoloId]?.medicamentos || [],
            isAddingMed: prev[protocoloId]?.isAddingMed || false
          }
        };
      }
    });
    
    // Atualizar a seleção se necessário
    if (!selectedRows.has(protocoloId)) {
      setSelectedRows(new Set([protocoloId]));
      selectProtocolo(protocoloId);
    }
    
    // Como já carregamos todos os medicamentos anteriormente, na maioria dos casos
    // não precisamos fazer nova chamada. Apenas se não encontrarmos no cache.
    if (!getMedicamentosFromCache(protocoloId) && !allMedicamentosLoaded) {
      // Carregar medicamentos se não estiverem no cache
      fetchServicos(protocoloId);
    }
  }, [isEditing, isAdding, selectedRows, selectProtocolo, fetchServicos, allMedicamentosLoaded, medicamentosCache]);

  // Funções para gerenciar medicamentos no formulário
  const handleAddMedicamento = () => {
    setFormData(prev => ({
      ...prev,
      medicamentos: [
        ...prev.medicamentos, 
        { nome: '', dose: '', unidade_medida: '', via_adm: '', dias_adm: '', frequencia: '' }
      ]
    }));
  };

  const handleRemoveMedicamento = (index) => {
    
    
    setFormData(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.filter((_, i) => i !== index)
    }));
  };

  const handleMedicamentoChange = (index, field, value) => {
    setFormData(prev => {
      const updatedMedicamentos = [...prev.medicamentos];
      updatedMedicamentos[index] = {
        ...updatedMedicamentos[index],
        [field]: value
      };
      return {
        ...prev,
        medicamentos: updatedMedicamentos
      };
    });
  };

  // Handler para mudança nos campos principais
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para mostrar o indicador de atualização do cache
  const showCacheRefreshIndicator = () => {
    setCacheRefreshed(true);
    // Esconder após 3 segundos
    setTimeout(() => setCacheRefreshed(false), 3000);
  };
  
  // Atualização de dados após modificação - Versão com cache
  const refreshDataAfterModification = async () => {
    try {
      setLocalLoading(true);
      
      // Invalidar o cache de medicamentos
      invalidateMedicamentosCache();
      
      // Atualizar o timestamp de escrita global
      CacheService.updateWriteTimestamp();
      
      // Usar a função do contexto para atualizar os dados
      await contextRefreshData();
      
      // Mostrar indicador de atualização
      showCacheRefreshIndicator();
      
      // Resetar o estado de carregamento de medicamentos
      setAllMedicamentosLoaded(false);
      setMedicamentosCache({});
      loadedProtocolIds.current.clear();
      
      // Recarregar protocolos e medicamentos
      const protocolos = await loadProtocolos();
      await loadAllMedicamentos(protocolos);
      
    } catch (error) {
      console.error("Erro ao atualizar dados após modificação:", error);
      showErrorAlert("Falha ao atualizar os dados", "Tente atualizar manualmente.");
    } finally {
      setLocalLoading(false);
    }
  };

  // Validação do formulário
  const validateFormData = (data) => {
    if (!data.Protocolo_Nome || !data.Protocolo_Sigla) {
      return { valid: false, message: "Nome e Sigla são campos obrigatórios" };
    }
    
    // Verificar apenas medicamentos que tenham algum dado preenchido
    if (data.medicamentos && data.medicamentos.length > 0) {
      // Filtrar medicamentos que tenham pelo menos um campo preenchido
      const medicamentosPreenchidos = data.medicamentos.filter(med => 
        (med.nome && med.nome.trim() !== '') || 
        (med.dose && med.dose !== '') || 
        (med.unidade_medida && med.unidade_medida !== '') || 
        (med.via_adm && med.via_adm !== '') || 
        (med.dias_adm && med.dias_adm !== '') || 
        (med.frequencia && med.frequencia !== '')
      );
      
      // Se houver medicamentos parcialmente preenchidos, validar que tenham pelo menos o nome
      if (medicamentosPreenchidos.length > 0) {
        const medicamentosSemNome = medicamentosPreenchidos.some(med => !med.nome || med.nome.trim() === '');
        if (medicamentosSemNome) {
          return { valid: false, message: "Medicamentos preenchidos precisam ter um nome" };
        }
      }
    }
    
    // Conversão de valores numéricos
    const numericData = { ...data };
    
    if (numericData.Intervalo_Ciclos !== undefined && numericData.Intervalo_Ciclos !== '') {
      numericData.Intervalo_Ciclos = parseInt(numericData.Intervalo_Ciclos, 10);
    } else {
      numericData.Intervalo_Ciclos = null;
    }
    
    if (numericData.Ciclos_Previstos !== undefined && numericData.Ciclos_Previstos !== '') {
      numericData.Ciclos_Previstos = parseInt(numericData.Ciclos_Previstos, 10);
    } else {
      numericData.Ciclos_Previstos = null;
    }
    
    if (numericData.Linha !== undefined && numericData.Linha !== '') {
      numericData.Linha = parseInt(numericData.Linha, 10);
    } else {
      numericData.Linha = null;
    }
    
    // Processar medicamentos (se existirem)
    if (numericData.medicamentos && numericData.medicamentos.length > 0) {
      numericData.medicamentos = numericData.medicamentos.map(med => {
        const processedMed = { ...med };
        
        // Pular processamento de medicamentos vazios
        if (!processedMed.nome || processedMed.nome.trim() === '') {
          return processedMed;
        }
        
        if (processedMed.dose !== undefined && processedMed.dose !== '') {
          processedMed.dose = parseFloat(processedMed.dose);
        } else {
          processedMed.dose = null;
        }
        
        return processedMed;
      });
      
      // Filtrar apenas medicamentos com nome para envio ao servidor
      numericData.medicamentos = numericData.medicamentos.filter(
        med => med.nome && med.nome.trim() !== ''
      );
    }
    
    return { valid: true, data: numericData };
  };

  // Reset do formulário
  const resetForm = () => {
    setFormData({
      Protocolo_Nome: '',
      Protocolo_Sigla: '',
      CID: '',
      Intervalo_Ciclos: '',
      Ciclos_Previstos: '',
      Linha: '',
      medicamentos: [] // Array vazio ao resetar
    });
    setUpdateError(null);
  };

  // Submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateError(null);
    
    const validation = validateFormData(formData);
    if (!validation.valid) {
      showErrorAlert("Validação falhou", validation.message);
      return;
    }
    
    const validatedData = validation.data;
    
    try {
      setLocalLoading(true);
      
      if (isEditing && selectedProtocolo) {
        // Obter o ID correto do protocolo
        const protocoloId = selectedProtocolo.id_protocolo || selectedProtocolo.id;
        
        // 1. Primeiro atualizar os dados do protocolo (sem medicamentos)
        const protocoloSemMedicamentos = { ...validatedData };
        delete protocoloSemMedicamentos.medicamentos;
        
        console.log("Atualizando dados principais do protocolo ID:", protocoloId);
        await updateProtocolo(protocoloId, protocoloSemMedicamentos);
        
        // 2. Carregar medicamentos existentes
        console.log("Carregando medicamentos existentes para o protocolo ID:", protocoloId);
        const medicamentosAtuais = await loadProtocoloServicos(protocoloId);
        console.log("Medicamentos existentes:", medicamentosAtuais);
        
        // 3. Processar cada medicamento do formulário
        for (const med of validatedData.medicamentos) {
          if (!med.nome) continue; // Pular medicamentos sem nome
          
          // Buscar medicamento existente com o mesmo nome
          const medExistente = medicamentosAtuais.find(m => m.nome === med.nome);
          
          // Converter a sigla de unidade de medida de volta para o ID antes de enviar
          let unidadeMedidaId = med.unidade_medida;
          
          // Se for uma sigla (texto), converter para ID
          if (isNaN(unidadeMedidaId)) {
            const unidade = UNIDADES_MEDIDA_PREDEFINIDAS.find(u => u.sigla === med.unidade_medida);
            unidadeMedidaId = unidade ? unidade.id : '';
          }
          
          // Preparar dados do medicamento com o ID da unidade
          const dadosMedicamento = {
            nome: med.nome,
            dose: med.dose,
            unidade_medida: unidadeMedidaId, // Enviar o ID, não a sigla
            via_adm: med.via_adm,
            dias_adm: med.dias_adm, // Manter como está por enquanto
            frequencia: med.frequencia,
            observacoes: med.observacoes || ''
          };
          
          // Enviar dados para API
          if (medExistente) {
            try {
              const resultado = await updateServicoProtocolo(
                protocoloId, 
                medExistente.id, 
                dadosMedicamento
              );
              console.log("Medicamento atualizado com sucesso:", resultado);
            } catch (medError) {
              console.error("Erro ao atualizar medicamento:", medError);
            }
          } else {
            try {
              const resultado = await addServicoToProtocolo(protocoloId, dadosMedicamento);
              console.log("Novo medicamento adicionado:", resultado);
            } catch (addError) {
              console.error("Erro ao adicionar medicamento:", addError);
            }
          }
        }
        
        // 4. Verificar se algum medicamento foi removido
        for (const medExistente of medicamentosAtuais) {
          // Verificar se este medicamento ainda existe no formulário
          const aindaExiste = validatedData.medicamentos.some(m => m.nome === medExistente.nome);
          
          if (!aindaExiste) {
            // Medicamento foi removido, excluir do banco
            console.log("Medicamento removido, excluindo:", medExistente.nome);
            try {
              await deleteServicoFromProtocolo(protocoloId, medExistente.id);
              console.log("Medicamento excluído com sucesso");
            } catch (deleteError) {
              console.error("Erro ao excluir medicamento:", deleteError);
            }
          }
        }
        
        setIsEditing(false);
        showSuccessAlert("Protocolo e medicamentos atualizados com sucesso!");
      } else if (isAdding) {
        // Lógica existente para adicionar novo protocolo
        if (isCacheEnabled) {
          forceRevalidation();
        }
        
        await addProtocolo(validatedData);
        setIsAdding(false);
        showSuccessAlert("Protocolo adicionado com sucesso!");
      }
      
      // Atualizar cache e dados
      await refreshDataAfterModification();
      
      // Resetar formulário
      resetForm();
      
    } catch (error) {
      setUpdateError(error.message);
      showErrorAlert("Erro ao salvar protocolo", error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  // Handlers para ordenação
  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };
  
  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  const handleResetSort = () => {
    setSortField('Protocolo_Nome');
    setSortOrder('asc');
  };

  // Handlers para CRUD de protocolos
  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRows(new Set());
    setExpandedRows({});
    
    // Se o cache estiver habilitado, marcar para revalidação
    if (isCacheEnabled) {
      forceRevalidation();
    }
  };
  
  const handleEdit = () => {
    if (!selectedProtocolo) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para editar.");
      return;
    }
    
    // Garantir que estamos usando o ID correto (id_protocolo)
    const currentProtocolo = filteredProtocolos.find(p => 
      p.id === selectedProtocolo.id || 
      p.id_protocolo === selectedProtocolo.id ||
      p.id === selectedProtocolo.id_protocolo
    ) || selectedProtocolo;
    
    // Buscar medicamentos do cache, se disponíveis
    const protocoloId = currentProtocolo.id || currentProtocolo.id_protocolo;
    const cachedMedicamentos = getMedicamentosFromCache(protocoloId) || currentProtocolo.medicamentos || [];
    
    // Converter o protocolo atual para o novo formato
    setFormData({
      Protocolo_Nome: currentProtocolo.Protocolo_Nome || '',
      Protocolo_Sigla: currentProtocolo.Protocolo_Sigla || '',
      CID: currentProtocolo.CID || '',
      Intervalo_Ciclos: currentProtocolo.Intervalo_Ciclos || '',
      Ciclos_Previstos: currentProtocolo.Ciclos_Previstos || '',
      Linha: currentProtocolo.Linha || '',
      medicamentos: cachedMedicamentos.length > 0 
        ? cachedMedicamentos.map(med => {
            // Encontrar a unidade pelo ID e obter a sigla, se disponível
            let unidadeMedida = med.unidade_medida || '';
            // Se a unidade_medida for um ID (numérico), tente convertê-la para sigla
            if (unidadeMedida && !isNaN(unidadeMedida)) {
              const unidadeEncontrada = UNIDADES_MEDIDA_PREDEFINIDAS.find(u => u.id === unidadeMedida);
              if (unidadeEncontrada) {
                unidadeMedida = unidadeEncontrada.sigla;
              }
            }
            
            return {
              nome: med.nome || '',
              dose: med.dose || med.dose_m2 || '',
              unidade_medida: unidadeMedida,
              via_adm: med.via_adm || med.via_administracao || '',
              dias_adm: med.dias_adm || med.dias_aplicacao || '',
              frequencia: med.frequencia || ''
            };
          }) 
        : [{ 
            nome: '', 
            dose: '', 
            unidade_medida: '', 
            via_adm: '', 
            dias_adm: '', 
            frequencia: '' 
          }]
    });
    
    setIsEditing(true);
    setIsAdding(false);
    setExpandedRows({});
  };
  
  const handleDelete = async () => {
    if (!selectedProtocolo) {
      showErrorAlert("Selecione um protocolo", "Você precisa selecionar um protocolo para excluir.");
      return;
    }
    
    const confirmed = await showConfirmAlert(
      "Confirmar exclusão", 
      `Tem certeza que deseja excluir o protocolo ${selectedProtocolo.Protocolo_Nome}?`
    );
    
    if (confirmed) {
      try {
        setLocalLoading(true);
        
        // Se o cache estiver habilitado, marcar para revalidação
        if (isCacheEnabled) {
          forceRevalidation();
        }
        
        await deleteProtocolo(selectedProtocolo.id);
        showSuccessAlert("Protocolo excluído com sucesso!");
        setSelectedRows(new Set());
        setExpandedRows({});
        
        // Usar a função de atualização que lida com o cache
        await refreshDataAfterModification();
      } catch (error) {
        showErrorAlert("Erro ao excluir protocolo", error.message);
      } finally {
        setLocalLoading(false);
      }
    }
  };
  
  const handleCancel = async () => {
    if (isEditing || isAdding) {
      const confirmCancel = await showConfirmAlert(
        "Deseja cancelar a edição?",
        "Todas as alterações feitas serão perdidas."
      );
      
      if (!confirmCancel) {
        return;
      }
    }
    
    setIsEditing(false);
    setIsAdding(false);
    resetForm();
  };

  // Gerenciamento de linhas e seleção
  const handleRowClick = (protocoloId) => {
    if (isEditing || isAdding) return;
    
    // Se clicar na linha já selecionada, desselecioná-la
    if (selectedRows.has(protocoloId) && selectedProtocolo?.id === protocoloId) {
      setSelectedRows(new Set());
      selectProtocolo(null); // Limpa a seleção
      
      // Fechar todas as expansões quando desselecionado
      setExpandedRows({});
    } else {
      // Selecionar a linha
      setSelectedRows(new Set([protocoloId]));
      selectProtocolo(protocoloId);
      
      // Verificar se há medicamentos no cache
      const cachedMedicamentos = getMedicamentosFromCache(protocoloId);
      
      // Expandir apenas a linha selecionada, fechando todas as outras
      setExpandedRows({
        [protocoloId]: {
          expanded: true,
          servicos: cachedMedicamentos || [],
          medicamentos: cachedMedicamentos || [],
          isAddingMed: false
        }
      });
    }
  };

  // Handlers para pesquisa
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    
    if (searchTerm && searchTerm.trim().length >= 2) {
      setLocalLoading(true);
      searchProtocolos(searchTerm, type)
        .finally(() => setLocalLoading(false));
    }
  };

  const getSearchTypeName = (type) => {
    switch(type) {
      case 'nome': return 'Nome';
      case 'sigla': return 'Sigla';
      case 'cid': return 'CID';
      default: return 'Nome';
    }
  };
  
  const executeSearch = () => {
    if (searchInputRef.current) {
      const value = searchInputRef.current.value.trim();
      
      if (value.length >= 2 || value.length === 0) {
        setLocalLoading(true);
        searchProtocolos(value, searchType)
          .finally(() => setLocalLoading(false));
      } else {
        showWarningAlert("Pesquisa muito curta", "Digite pelo menos 2 caracteres para pesquisar.");
      }
    }
  };
  
  const handleInput = () => {
    if (searchInputRef.current) {
      searchProtocolos(searchInputRef.current.value, searchType);
    }
  };
  
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };
  
  const handleClearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    setSearchType("nome");
    searchProtocolos('', 'nome');
  };

  // Função auxiliar para formatar dias de administração
  const formatDiasAdministracao = (dias) => {
    if (!dias) return 'N/D';
    
    // Verifica se é um intervalo (contém hífen)
    if (dias.includes('-')) {
      const [inicio, fim] = dias.split('-');
      return `${inicio} a ${fim}`;
    }
    
    // Caso contrário, retorna os dias como estão
    return dias;
  };

  // Helper function para obter texto de unidade de medida
  const getUnidadeMedidaText = (valor) => {
    if (!valor) return 'N/D';
    return valor; // Já é o texto correto
  };

  // Função para converter intervalo para lista de dias individuais
  const convertIntervaloDiasParaLista = (diasValue) => {
    // Se não for um intervalo (não contém '-'), retorna como está
    if (!diasValue || !diasValue.includes('-')) {
      return diasValue;
    }
    
    // Se for um intervalo (ex: D5-D10), converter para lista individual
    const [inicio, fim] = diasValue.split('-');
    const inicioNum = parseInt(inicio.replace('D', ''));
    const fimNum = parseInt(fim.replace('D', ''));
    
    // Gerar lista de dias entre início e fim
    const diasIndividuais = [];
    for (let i = inicioNum; i <= fimNum; i++) {
      diasIndividuais.push(`D${i}`);
    }
    
    return diasIndividuais.join(',');
  };

  // Helper function para obter via de administração
  const getViaAdmText = (id) => {
    if (!id) return 'N/D';
    const via = viasAdministracao.find(v => v.id == id);
    return via ? via.nome : 'N/D';
  };

  // Renderização de medicamentos no formulário - Estilo mais elaborado e com a nova organização
  const renderMedicamentoRow = (med, index) => {
    return (
      <div key={`med-${index}`} className="medication-entry bg-white border border-gray-200 rounded-lg mb-4 shadow-sm overflow-hidden">
        {/* Cabeçalho do medicamento */}
        <div className="bg-gradient-to-r from-green-50 to-gray-50 p-3 flex justify-between items-center border-b border-gray-200">
          <h4 className="font-medium text-green-800 flex items-center">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-700 text-sm mr-2">
              {index + 1}
            </span>
            Medicamento
          </h4>
          {/* Remover a condição formData.medicamentos.length > 1 para sempre mostrar o botão */}
          <button 
            type="button" 
            onClick={async () => {
              const confirmed = await showConfirmAlert(
                "Confirmar exclusão", 
                "Tem certeza que deseja remover este medicamento?"
              );
              
              if (confirmed) {
                handleRemoveMedicamento(index);
              }
            }}
            className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Remover medicamento"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        {/* Corpo do medicamento */}
        <div className="p-4">
          {/* Linha 1: Nome e Dose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700 flex items-center">
                <span className="mr-1 text-red-500">*</span> Nome
              </label>
              <input 
                type="text"
                value={med.nome || ''}
                onChange={(e) => handleMedicamentoChange(index, 'nome', e.target.value)}
                className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Paclitaxel, Cisplatina..."
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700">Dose</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  value={med.dose || ''}
                  onChange={(e) => handleMedicamentoChange(index, 'dose', e.target.value)}
                  className="form-input flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="0.01"
                  placeholder="Quantidade"
                />
                <select
                  value={med.unidade_medida || ''}
                  onChange={(e) => handleMedicamentoChange(index, 'unidade_medida', e.target.value)}
                  className="form-select px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-w-[110px]"
                >
                  <option value="">Unidade</option>
                  {UNIDADES_MEDIDA_PREDEFINIDAS.map(unidade => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.sigla}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Linha 2: Frequência e Via (nova ordem) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700">Frequência de Administração</label>
              <select
                value={med.frequencia || ''}
                onChange={(e) => handleMedicamentoChange(index, 'frequencia', e.target.value)}
                className="form-select w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                {FREQUENCIAS_ADMINISTRACAO.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700">Via de Administração</label>
              <select
                value={med.via_adm || ''}
                onChange={(e) => handleMedicamentoChange(index, 'via_adm', e.target.value)}
                className="form-select w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione</option>
                {viasAdministracao && viasAdministracao.length > 0 ? (
                  viasAdministracao.map(via => (
                    <option key={via.id} value={via.id}>{via.nome}</option>
                  ))
                ) : (
                  <option value="" disabled>Carregando...</option>
                )}
              </select>
            </div>
          </div>
          
          {/* Linha 3: Dias de Administração (agora com mais espaço) */}
          <div className="mt-2">
            <div className="form-group">
              <label className="form-label text-sm font-medium text-gray-700 mb-2">Dias de Administração</label>
              <DiasAdministracaoSelector
                value={med.dias_adm || ''}
                onChange={(value) => handleMedicamentoChange(index, 'dias_adm', value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Visualização expandida aprimorada para medicamentos
  const renderExpandedContent = (protocolo) => {
    const protocoloId = protocolo.id_protocolo || protocolo.id;
    const rowData = expandedRows[protocoloId] || {};
    const isLoading = servicosLoading[protocoloId];
    
    // Obter medicamentos da melhor fonte disponível
    let medicamentos = [];
    
    // 1. Primeiro, verificar no cache de medicamentos
    const cachedMeds = getMedicamentosFromCache(protocoloId);
    if (cachedMeds && cachedMeds.length > 0) {
      medicamentos = cachedMeds;
    } 
    // 2. Verificar no protocolo
    else if (protocolo.medicamentos && protocolo.medicamentos.length > 0) {
      medicamentos = protocolo.medicamentos;
    } 
    // 3. Verificar nos dados expandidos
    else if (rowData.medicamentos && rowData.medicamentos.length > 0) {
      medicamentos = rowData.medicamentos;
    } 
    // 4. Verificar nos serviços
    else if (rowData.servicos && rowData.servicos.length > 0) {
      medicamentos = rowData.servicos;
    }
    
    return (
      <tr className="expanded-content">
        <td colSpan="7" className="p-0 border-b border-gray-200">
          <div className="expanded-content-container bg-gradient-to-b from-gray-50 to-white p-5 shadow-inner">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
              <h4 className="text-base font-medium flex items-center text-green-800">
                <Database size={18} className="mr-2" />
                Medicamentos do Protocolo: <span className="ml-1 font-bold text-orange-500">{protocolo.Protocolo_Nome}</span>
              </h4>
              
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                  {medicamentos.length} {medicamentos.length === 1 ? 'medicamento' : 'medicamentos'} cadastrados
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8 my-4">
                <div className="animate-pulse flex space-x-2 items-center">
                  <div className="h-3 w-3 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="h-3 w-3 bg-green-400 rounded-full animate-bounce delay-75"></div>
                  <div className="h-3 w-3 bg-green-400 rounded-full animate-bounce delay-150"></div>
                  <span className="text-sm text-green-600 ml-2">Carregando medicamentos...</span>
                </div>
              </div>
            ) : medicamentos && medicamentos.length > 0 ? (
              <div className="bg-white  rounded-lg ">                
                {/* Visualização em Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {medicamentos.map((med, index) => (
                    <div key={index} className="med-card bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="med-card-header bg-gradient-to-r from-green-50 to-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                        <h5 className="font-medium text-green-800 flex items-center">
                          <Pill size={15} className="mr-2" />
                          Medicamento {index + 1}
                        </h5>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {getViaAdmText(med.via_administracao || med.via_adm)}
                        </span>
                      </div>
                      <div className="med-card-body p-4">
                        <h6 className="text-lg font-bold text-gray-800 mb-3">{med.nome || 'N/D'}</h6>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                          <div className="info-item flex items-center">
                            <Droplet size={14} className="text-green-600 mr-1.5" />
                            <span className="text-gray-500 mr-1">Dose:</span>
                            <span className="font-medium text-gray-800">
                              {(med.dose || med.Dose) ? 
                                `${med.dose || med.Dose} ${getUnidadeMedidaText(med.unidade_medida)}` : 
                                'N/D'
                              }
                            </span>
                          </div>
                          
                          <div className="info-item flex items-center">
                            <Calendar size={14} className="text-green-600 mr-1.5" />
                            <span className="text-gray-500 mr-1">Dias:</span>
                            <span className="font-medium text-gray-800">
                              {med.dias_adm || med.dias_aplicacao ? (
                                <span className="inline-flex items-center">
                                  {formatDiasAdministracao(med.dias_adm || med.dias_aplicacao)}
                                  {(med.dias_adm || med.dias_aplicacao).includes('-') && (
                                    <span className="ml-1 text-xs text-green-600 rounded-full bg-green-100 px-1.5 py-0.5">
                                      Intervalo
                                    </span>
                                  )}
                                </span>
                              ) : 'N/D'}
                            </span>
                          </div>
                          
                          <div className="info-item col-span-2 flex items-center">
                            <Clock size={14} className="text-green-600 mr-1.5" />
                            <span className="text-gray-500 mr-1">Frequência:</span>
                            <span className="font-medium text-gray-800">{med.frequencia || 'N/D'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500 flex flex-col items-center">
                <Database size={40} className="text-gray-300 mb-3" />
                <p className="mb-2">Nenhum medicamento cadastrado para este protocolo.</p>
                <button 
                  className="text-sm px-4 py-2 mt-3 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 transition-colors flex items-center"
                  onClick={() => {
                    // Lógica para adicionar medicamento ao protocolo existente
                    handleEdit();
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  Adicionar Medicamento
                </button>
              </div>
            )}
            
            {/* Botões de ação para a seção de medicamentos */}
            {medicamentos && medicamentos.length > 0 && (
              <div className="flex justify-end mt-4">
                <button 
                  className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 transition-colors flex items-center mr-2"
                  onClick={() => handleEdit()}
                >
                  <Edit size={14} className="mr-1" />
                  Editar Medicamentos
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Renderização principal
  return (
    <div className="patient-container">
      <div className="mb-6 flex justify-between items-center encimatabela">
        {/* Área de ordenação */}
        <div className="organize-container"> 
          <h2 className="organize-text">Ordenação</h2>
          <div className="custom-select">
            <select 
              className="select-style" 
              value={sortOrder} 
              onChange={handleSortChange}
            >
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </select>
          </div>
        </div>
        
        {/* Mostrar informação sobre ordenação atual */}
        {sortField !== 'Protocolo_Nome' && (
          <div className="px-3 py-1 rounded-md flex items-center ordenacao" style={{color: '#575654', background: '#E4E9C0'}}>
            <span className="text-sm">
              Ordenado por: <strong style={{color: '#f26b6b'}} >{sortField}</strong> ({sortOrder === 'asc' ? 'crescente' : 'decrescente'})
            </span>
            <button 
              className="ml-2 text-green-600 hover:text-green-800" 
              onClick={handleResetSort}
              title="Resetar ordenação"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          {/* Área de pesquisa */}
          <div className="flex flex-col">
            <div className="search-container">
              <div className="search-bar">
                <button
                  onClick={executeSearch}
                  className={`pesquisa-icone ${searchTerm ? 'search-icon-blinking' : ''}`}
                  title="Clique para pesquisar"
                >
                  <Search size={18} />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={`Pesquisar por ${getSearchTypeName(searchType)}...`}
                  className="border pesquisa"
                  defaultValue={searchTerm}
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                />
                {searchTerm && (
                  <button 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={handleClearSearch}
                    title="Limpar pesquisa"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {/* Botão para expandir/recolher opções de pesquisa */}
              <button 
                onClick={() => setIsSearchExpanded(!isSearchExpanded)} 
                className="text-xs text-gray-600 mt-1 ml-2 hover:text-green-700 flex items-center"
              >
                <span>{isSearchExpanded ? 'Ocultar opções' : 'Opções de busca'}</span>
                <ChevronDown size={14} className={`ml-1 transform transition-transform ${isSearchExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Seletor do tipo de pesquisa - mostrar apenas quando expandido */}
              {isSearchExpanded && (
                <div className="search-type-selector mt-2 flex items-center">
                  <div className="text-xs mr-2 text-gray-600">Buscar por:</div>
                  <div className="flex flex-wrap space-x-3">
                    <label className={`cursor-pointer flex items-center ${searchType === 'nome' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="nome"
                        checked={searchType === 'nome'}
                        onChange={() => handleSearchTypeChange('nome')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">Nome</span>
                    </label>
                    
                    <label className={`cursor-pointer flex items-center ${searchType === 'sigla' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="sigla"
                        checked={searchType === 'sigla'}
                        onChange={() => handleSearchTypeChange('sigla')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">Descrição</span>
                    </label>
                    
                    <label className={`cursor-pointer flex items-center ${searchType === 'cid' ? 'text-green-800 font-medium' : 'text-gray-600'}`}>
                      <input
                        type="radio"
                        name="searchType"
                        value="cid"
                        checked={searchType === 'cid'}
                        onChange={() => handleSearchTypeChange('cid')}
                        className="mr-1 h-3 w-3"
                      />
                      <span className="text-xs">CID</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {/* Indicador de resultados da pesquisa */}
            {searchTerm && (
              <div className="text-xs text-gray-600 mt-1 ml-2 pesquisatinha">
                {filteredProtocolos.length === 0 ? (
                  <span className="text-red-500">Nenhum resultado encontrado. Tente refinar sua busca.</span>
                ) : (
                  <span>
                    {`${filteredProtocolos.length} resultados encontrados para "${searchTerm}"`}
                    <span className="search-type-badge search-type-${searchType}">
                      {getSearchTypeName(searchType)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Botões de ação (Adicionar, Editar, Excluir) */}
          <div className="button-container">
            {selectedRows.size > 0 ? (
              <>
                {isEditing ? (
                  <button 
                    className="btn btn-danger" 
                    onClick={handleCancel}
                    disabled={localLoading}
                  >
                    Cancelar
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDelete}
                    disabled={localLoading}
                  >
                    <Trash2 className="w-5 h-5" /> Excluir
                  </button>
                )}
                {isEditing ? (
                  <button 
                    className="btn btn-success" 
                    onClick={handleSubmit}
                    disabled={localLoading}
                  >
                    {localLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                ) : (
                  <button 
                    className="btn btn-warning" 
                    onClick={handleEdit}
                    disabled={localLoading}
                  >
                    <Edit className="w-5 h-5" /> Alterar
                  </button>
                )}
              </>
            ) : (
              isAdding ? (
                <>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleCancel}
                    disabled={localLoading}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleSubmit}
                    disabled={localLoading}
                  >
                    {localLoading ? (
                      <>
                        <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                        Salvando...
                      </>
                    ) : 'Salvar'}
                  </button>
                </>
              ) : (
                <button 
                  className="button buttontxt btn-primary" 
                  onClick={handleAdd}
                  disabled={localLoading}
                >
                  <Plus /> Adicionar
                </button>
              )
            )}
          </div>
        </div>
      </div>
      
      {/* Formulário de edição/adição */}
      {(isAdding || isEditing) && (
        <form onSubmit={handleSubmit} className="patient-form bg-white p-4 rounded-lg mb-4 shadow-md">
          {/* Mensagem de erro de atualização, se houver */}
          {updateError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              <p className="font-semibold">Erro ao processar dados:</p>
              <p>{updateError}</p>
            </div>
          )}
          
          {/* Seção principal do protocolo */}
          <div className="form-header border-b border-gray-200 pb-4 mb-4">
            <h3 className="text-lg font-medium text-green-800 mb-3">Informações do Protocolo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="protocoloNome" className="form-label text-sm font-medium text-gray-700 block mb-1">
                  Nome do Protocolo*
                </label>
                <input 
                  type="text"
                  id="protocoloNome"
                  name="Protocolo_Nome"
                  value={formData.Protocolo_Nome}
                  onChange={handleInputChange}
                  className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  placeholder="Nome do protocolo"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="protocoloSigla" className="form-label text-sm font-medium text-gray-700 block mb-1">
                  Descrição do Protocolo*
                </label>
                <input 
                  type="text"
                  id="protocoloSigla"
                  name="Protocolo_Sigla"
                  value={formData.Protocolo_Sigla}
                  onChange={handleInputChange}
                  className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  placeholder="Descrição do protocolo"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label htmlFor="cid" className="form-label text-sm font-medium text-gray-700 block mb-1">
                CID Associado
              </label>
              <CIDSelection
                value={formData.CID}
                onChange={(selectedCIDs) => {
                  if (Array.isArray(selectedCIDs) && selectedCIDs.length > 0) {
                    const cidValues = selectedCIDs.map(cid => 
                      typeof cid === 'string' ? cid : cid.codigo
                    ).join(',');
                    
                    setFormData(prev => ({
                      ...prev,
                      CID: cidValues
                    }));
                  } else if (selectedCIDs === null || selectedCIDs.length === 0) {
                    setFormData(prev => ({
                      ...prev,
                      CID: ''
                    }));
                  }
                }}
                placeholder="Selecione um ou mais CIDs..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="form-group">
                <label htmlFor="intervaloCiclos" className="form-label text-sm font-medium text-gray-700 block mb-1">
                  Intervalo entre Ciclos (dias)
                </label>
                <input 
                  type="number"
                  id="intervaloCiclos"
                  name="Intervalo_Ciclos"
                  value={formData.Intervalo_Ciclos || ''}
                  onChange={handleInputChange}
                  className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                  placeholder="Dias entre ciclos"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="numerosCiclosPrevistos" className="form-label text-sm font-medium text-gray-700 block mb-1">
                  Número de Ciclos Previstos
                </label>
                <input 
                  type="number"
                  id="numerosCiclosPrevistos"
                  name="Ciclos_Previstos"
                  value={formData.Ciclos_Previstos || ''}
                  onChange={handleInputChange}
                  className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                  placeholder="Quantidade de ciclos"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="linha" className="form-label text-sm font-medium text-gray-700 block mb-1">
                  Linha
                </label>
                <input 
                  type="number"
                  id="linha"
                  name="Linha"
                  value={formData.Linha || ''}
                  onChange={handleInputChange}
                  className="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Linha do protocolo"
                />
              </div>
            </div>
          </div>

          {/* Seção de Medicamentos com estilo melhorado */}
          <div className="form-section mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-green-800 flex items-center">
                <Pill size={18} className="mr-2" />
                Medicamentos do Protocolo
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  Opcional
                </span>
              </h3>
              <button 
                type="button" 
                onClick={handleAddMedicamento}
                className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 border border-green-200 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span>Adicionar Medicamento</span>
              </button>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              {formData.medicamentos.length === 0 ? (
                <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-2">Nenhum medicamento adicionado</p>
                  <p className="text-sm text-gray-400 mb-3">
                    Você pode cadastrar o protocolo sem medicamentos ou adicionar medicamentos usando o botão abaixo
                  </p>
                  <button 
                    type="button" 
                    onClick={handleAddMedicamento}
                    className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-sm"
                  >
                    <Plus size={14} className="mr-1" />
                    Adicionar Medicamento (Opcional)
                  </button>
                </div>
              ) : (
                <div className="medication-list space-y-4">
                  {formData.medicamentos.map((med, index) => renderMedicamentoRow(med, index))}
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              {localLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></span>
                  Salvando...
                </span>
              ) : 'Salvar Protocolo'}
            </button>
          </div>
        </form>
      )}
      
      {/* Lista de protocolos com layout solicitado */}
      {!isAdding && !isEditing && (
        <div className="table-container h-[calc(100vh-250px)] overflow-auto">
          {(loading || initialLoading) ? (
            <div className="flex justify-center items-center h-full">
              <img src="/images/loadingcorreto-semfundo.gif" alt="Carregando..." className="w-12 h-12" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-500">Erro: {error}</p>
              <button
                onClick={() => loadProtocolos(true)}
                className="button buttontxt flex items-center gap-2"
              >
                Tentar novamente
              </button>
            </div>
          ) : Array.isArray(filteredProtocolos) && filteredProtocolos.length > 0 ? (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'id' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'id' ? '#f26b6b' : 'inherit' }}>
                        ID
                      </span>
                      {sortField === 'id' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Protocolo_Nome')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_Nome' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_Nome' ? '#f26b6b' : 'inherit' }}>
                        Nome
                      </span>
                      {sortField === 'Protocolo_Nome' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Protocolo_Sigla')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Protocolo_Sigla' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Protocolo_Sigla' ? '#f26b6b' : 'inherit' }}>
                        Descrição
                      </span>
                      {sortField === 'Protocolo_Sigla' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Intervalo_Ciclos')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Intervalo_Ciclos' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Intervalo_Ciclos' ? '#f26b6b' : 'inherit' }}>
                        Intervalo Ciclos
                      </span>
                      {sortField === 'Intervalo_Ciclos' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Ciclos_Previstos')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Ciclos_Previstos' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Ciclos_Previstos' ? '#f26b6b' : 'inherit' }}>
                        Ciclos Previstos
                      </span>
                      {sortField === 'Ciclos_Previstos' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('Linha')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'Linha' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'Linha' ? '#f26b6b' : 'inherit' }}>
                        Linha
                      </span>
                      {sortField === 'Linha' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('CID')} className="cursor-pointer">
                    <div className="header-sort flex items-center justify-center gap-1">
                      <span className={sortField === 'CID' ? 'text-sort-active' : ''} 
                            style={{ color: sortField === 'CID' ? '#f26b6b' : 'inherit' }}>
                        CID
                      </span>
                      {sortField === 'CID' && (
                        sortOrder === 'asc' 
                          ? <ArrowUpWideNarrow size={16} style={{ color: '#f26b6b' }} /> 
                          : <ArrowDownWideNarrow size={16} style={{ color: '#f26b6b' }} />
                      )}
                    </div>
                  </th>
                </tr> 
              </thead>
              <tbody>
                {(Array.isArray(orderedProtocolos) && orderedProtocolos.length > 0 ? orderedProtocolos : filteredProtocolos).map((protocolo, index) => {
                  const protocoloId = protocolo.id;
                  const isExpanded = Boolean(expandedRows[protocoloId]);
                  const isSelected = selectedRows.has(protocoloId);
                  
                  return (
                    <React.Fragment key={protocoloId || `protocolo-${index}`}>
                      <tr 
                        onClick={() => handleRowClick(protocoloId)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'selected-row' : ''}`}
                      >
                        <td className="relative">
                          <div className="flex items-center">
                            <button 
                              className="mr-2 text-gray-500 hover:text-gray-800 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(protocoloId);
                              }}
                            >
                              {isExpanded ? 
                                <ChevronDown size={18} className="text-green-600" /> : 
                                <ChevronRight size={18} />
                              }
                            </button>
                            {protocolo.id}
                          </div>
                        </td>
                        <td>{protocolo.Protocolo_Nome}</td>
                        <td>{protocolo.Protocolo_Sigla}</td>
                        <td>{protocolo.Intervalo_Ciclos || 'N/D'}</td>
                        <td>{protocolo.Ciclos_Previstos || 'N/D'}</td>
                        <td>{protocolo.Linha || 'N/D'}</td>
                        <td>{protocolo.CID || 'N/D'}</td>
                      </tr>
                      
                      {isExpanded && renderExpandedContent(protocolo)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-gray-500">
                {searchTerm ? "Nenhum resultado encontrado para esta pesquisa" : "Não há protocolos cadastrados"}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Indicador de atualização de cache */}
      {cacheRefreshed && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in">
          <Database size={16} className="mr-2" />
          <span>Dados atualizados com sucesso</span>
        </div>
      )}
      
      {/* Estilos específicos */}
      <style jsx>{`
        /* Estilização da linha selecionada com opacidade ajustada */
        .selected-row {
          background-color: rgba(242, 107, 107, 0.15) !important;
          font-weight: 500;
        }
        
        /* Animação de expansão */
        .expanded-content {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Animação para transições */
        .transition-colors {
          transition: background-color 0.2s, color 0.2s, border-color 0.2s;
        }
        
        /* Animação para o indicador de cache */
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default CadastroProtocolo;