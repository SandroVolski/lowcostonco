// src/components/prestadores/PrestadorSearchPrevias.jsx
// Versão específica para o sistema de prévias

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const PrestadorSearchPrevias = ({ 
  prestadores = [],
  selectedPrestador, 
  onSelect,
  required = false,
  className = "",
  placeholder = "Digite para buscar prestadores..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredPrestadores, setFilteredPrestadores] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  
  // Debug para verificar props
  useEffect(() => {
    console.log("PrestadorSearchPrevias - Props recebidas:", {
      prestadores_count: prestadores?.length || 0,
      selectedPrestador,
      prestadores_sample: prestadores?.slice(0, 3)
    });
  }, [prestadores, selectedPrestador]);
  
  // Inicializar o termo de busca com o prestador selecionado
  useEffect(() => {
    if (selectedPrestador && typeof selectedPrestador === 'string') {
      setSearchTerm(selectedPrestador);
    } else if (selectedPrestador && typeof selectedPrestador === 'object') {
      setSearchTerm(selectedPrestador.nome || selectedPrestador.nome_fantasia || '');
    } else {
      setSearchTerm('');
    }
  }, [selectedPrestador]);
  
  // Verificar estado de carregamento
  useEffect(() => {
    setIsLoading(!prestadores || prestadores.length === 0);
  }, [prestadores]);
  
  // Filtrar prestadores quando o termo de busca muda
  useEffect(() => {
    if (!prestadores || prestadores.length === 0) {
      setFilteredPrestadores([]);
      return;
    }
    
    if (!searchTerm.trim()) {
      setFilteredPrestadores(prestadores);
    } else {
      const normalizedSearchTerm = searchTerm.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const filtered = prestadores.filter(prestador => {
        // Buscar tanto no nome quanto no nome fantasia
        const nome = (prestador.nome || '').toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const nomeFantasia = (prestador.nome_fantasia || '').toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
        return nome.includes(normalizedSearchTerm) || 
               nomeFantasia.includes(normalizedSearchTerm);
      });
      
      setFilteredPrestadores(filtered);
    }
    
    setHighlightedIndex(0);
  }, [searchTerm, prestadores]);
  
  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Navegar com teclas de seta e selecionar com Enter
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }
    
    if (isOpen && filteredPrestadores.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredPrestadores.length - 1 ? prev + 1 : prev
          );
          ensureHighlightedVisible();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
          ensureHighlightedVisible();
          break;
        case 'Enter':
          e.preventDefault();
          handleSelectPrestador(filteredPrestadores[highlightedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        default:
          break;
      }
    }
  };
  
  const ensureHighlightedVisible = () => {
    if (listRef.current && highlightedIndex >= 0) {
      const highlighted = listRef.current.children[highlightedIndex];
      if (highlighted) {
        highlighted.scrollIntoView({ 
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  };
  
  // Função principal para selecionar prestador
  const handleSelectPrestador = (prestador) => {
    if (!prestador) return;
    
    console.log("Prestador selecionado:", prestador);
    
    // Determinar qual nome usar para exibição
    const nomeParaExibir = prestador.nome_fantasia || prestador.nome || '';
    
    // Atualizar o campo de busca
    setSearchTerm(nomeParaExibir);
    
    // Chamar callback com objeto completo
    if (typeof onSelect === 'function') {
      onSelect({
        id: prestador.id,
        nome: prestador.nome || '',
        nome_fantasia: prestador.nome_fantasia || '',
        nome_exibicao: nomeParaExibir
      });
    }
    
    setIsOpen(false);
    searchRef.current?.blur();
  };
  
  // Limpar seleção
  const handleClear = () => {
    setSearchTerm('');
    if (typeof onSelect === 'function') {
      onSelect(null);
    }
    searchRef.current?.focus();
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative w-full">
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Carregando prestadores..." : placeholder}
          className="form-input w-full pl-10 pr-10"
          required={required}
          disabled={isLoading}
        />
        
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
          ) : (
            <Search size={18} className="text-gray-400" />
          )}
        </div>
        
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-10 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
        
        <button
          type="button"
          onClick={() => !isLoading && setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          disabled={isLoading}
        >
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      
      {isOpen && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredPrestadores.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              {prestadores.length === 0 
                ? "Nenhum prestador disponível" 
                : "Nenhum prestador encontrado"}
            </div>
          ) : (
            <ul ref={listRef} className="py-1 text-sm">
              {filteredPrestadores.map((prestador, index) => {
                const nomeExibicao = prestador.nome_fantasia || prestador.nome || '';
                const temNomeFantasia = prestador.nome_fantasia && 
                                       prestador.nome_fantasia !== prestador.nome;
                
                return (
                  <li
                    key={`${prestador.id}-${index}`}
                    onClick={() => handleSelectPrestador(prestador)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                      highlightedIndex === index ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {nomeExibicao}
                      </span>
                      {temNomeFantasia && (
                        <span className="text-xs text-gray-500">
                          {prestador.nome}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          
          {filteredPrestadores.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
              {filteredPrestadores.length} de {prestadores.length} prestadores
            </div>
          )}
        </div>
      )}
      
      {isLoading && (
        <div className="text-xs text-amber-600 mt-1 flex items-center">
          <AlertCircle size={12} className="mr-1" />
          Carregando lista de prestadores...
        </div>
      )}
      
      {/* Debug info - remover em produção */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-1">
          Debug: {prestadores.length} prestadores, selected: {JSON.stringify(selectedPrestador)}
        </div>
      )}
    </div>
  );
};

export default PrestadorSearchPrevias;