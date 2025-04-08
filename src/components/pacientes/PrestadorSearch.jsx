import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const PrestadorSearch = ({ 
  prestadores,
  selectedPrestador, 
  onSelect,
  required = false,
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredPrestadores, setFilteredPrestadores] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  
  // Inicializar o termo de busca com o prestador selecionado, se houver
  useEffect(() => {
    if (selectedPrestador) {
      setSearchTerm(selectedPrestador);
    } else {
      setSearchTerm('');
    }
  }, [selectedPrestador]);
  
  // Verificar e definir estado de carregamento
  useEffect(() => {
    setIsLoading(!prestadores || prestadores.length === 0);
  }, [prestadores]);
  
  // Debug: Mostrar o número de prestadores carregados
  useEffect(() => {
    if (prestadores && prestadores.length > 0) {
      console.log(`${prestadores.length} prestadores carregados`);
      console.log("Amostra de prestadores:", prestadores.slice(0, 3));
    }
  }, [prestadores]);
  
  // Filtrar prestadores quando o termo de busca muda
  useEffect(() => {
    if (!prestadores || prestadores.length === 0) {
      setFilteredPrestadores([]);
      return;
    }
    
    if (!searchTerm.trim()) {
      // Se não houver termo de busca, mostrar todos os prestadores
      setFilteredPrestadores(prestadores);
    } else {
      // Filtrar por termo de busca, normalizando para comparação
      const normalizedSearchTerm = searchTerm.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const filtered = prestadores.filter(prestador => {
        // Normalizar nome para busca (remover acentos, maiúsculas/minúsculas)
        const nomePrestador = (prestador.nome || '').toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
        return nomePrestador.includes(normalizedSearchTerm);
      });
      
      setFilteredPrestadores(filtered);
    }
    
    // Resetar o índice destacado
    setHighlightedIndex(0);
  }, [searchTerm, prestadores]);
  
  // Fechar o dropdown quando clicar fora
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
  
  // Navegar com as teclas de seta e selecionar com Enter
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
  
  // Garantir que o item destacado esteja visível na lista
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
  
  // Selecionar um prestador e fechar o dropdown
  const handleSelectPrestador = (prestador) => {
    if (!prestador) return;
    
    const nomeSelecionado = prestador.nome || '';
    
    setSearchTerm(nomeSelecionado);
    onSelect(nomeSelecionado);
    setIsOpen(false);
    searchRef.current?.blur();
  };
  
  // Limpar a seleção
  const handleClear = () => {
    setSearchTerm('');
    onSelect('');
    searchRef.current?.focus();
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative w-full">
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Carregando prestadores..." : "Digite para buscar prestadores..."}
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
              {filteredPrestadores.map((prestador, index) => (
                <li
                  key={prestador.id}
                  onClick={() => handleSelectPrestador(prestador)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    highlightedIndex === index ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="font-medium">{prestador.nome}</span>
                </li>
              ))}
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
    </div>
  );
};

export default PrestadorSearch;