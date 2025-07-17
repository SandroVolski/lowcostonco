// src/components/prestadores/PrestadorSearchPrevias.jsx
// Versão melhorada para o sistema de prévias

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, ChevronUp, AlertCircle, Building2, MapPin } from 'lucide-react';

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
    if (selectedPrestador) {
      if (typeof selectedPrestador === 'string') {
        setSearchTerm(selectedPrestador);
      } else if (typeof selectedPrestador === 'object') {
        // Priorizar nome_exibicao, depois nome_fantasia, depois nome_completo, depois nome
        const displayName = selectedPrestador.nome_exibicao || 
                           selectedPrestador.nome_fantasia || 
                           selectedPrestador.nome_completo || 
                           selectedPrestador.nome || 
                           selectedPrestador.clinica || '';
        setSearchTerm(displayName);
      }
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
        // Buscar em todos os campos possíveis
        const searchFields = [
          prestador.nome || '',
          prestador.nome_fantasia || '',
          prestador.nome_exibicao || '',
          prestador.nome_completo || '',
          prestador.cidade || '',
          prestador.estado || ''
        ].map(field => field.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        
        return searchFields.some(field => field.includes(normalizedSearchTerm));
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
    const nomeParaExibir = prestador.nome_exibicao || 
                          prestador.nome_fantasia || 
                          prestador.nome_completo || 
                          prestador.nome || '';
    
    // Atualizar o campo de busca
    setSearchTerm(nomeParaExibir);
    
    // Chamar callback com objeto completo
    if (typeof onSelect === 'function') {
      onSelect({
        id: prestador.id,
        nome: prestador.nome || '',
        nome_fantasia: prestador.nome_fantasia || '',
        nome_exibicao: nomeParaExibir,
        nome_completo: prestador.nome_completo || nomeParaExibir,
        cidade: prestador.cidade || '',
        estado: prestador.estado || ''
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
  
  // Renderizar item do prestador
  const renderPrestadorItem = (prestador, index) => {
    const nomeExibicao = prestador.nome_exibicao || 
                        prestador.nome_fantasia || 
                        prestador.nome_completo || 
                        prestador.nome || '';
    
    const temNomeAlternativo = prestador.nome && 
                              prestador.nome_fantasia && 
                              prestador.nome !== prestador.nome_fantasia;
    
    const temLocalizacao = prestador.cidade || prestador.estado;
    
    return (
      <li
        key={`${prestador.id}-${index}`}
        onClick={() => handleSelectPrestador(prestador)}
        onMouseEnter={() => setHighlightedIndex(index)}
        className={`prestador-item ${
          highlightedIndex === index ? 'highlighted' : ''
        }`}
      >
        <div className="prestador-item-content">
          {/* Nome principal */}
          <div className="prestador-nome-principal">
            <Building2 size={14} className="prestador-icon" />
            <span className="prestador-nome">{nomeExibicao}</span>
          </div>
          
          {/* Nome alternativo se existir */}
          {temNomeAlternativo && (
            <div className="prestador-nome-alternativo">
              {prestador.nome}
            </div>
          )}
          
          {/* Localização se existir */}
          {temLocalizacao && (
            <div className="prestador-localizacao">
              <MapPin size={12} className="prestador-location-icon" />
              <span>
                {prestador.cidade}
                {prestador.cidade && prestador.estado && ', '}
                {prestador.estado}
              </span>
            </div>
          )}
          
          {/* ID para debug em desenvolvimento */}
          {process.env.NODE_ENV === 'development' && (
            <div className="prestador-debug">
              ID: {prestador.id}
            </div>
          )}
        </div>
      </li>
    );
  };
  
  return (
    <div className={`prestador-search-container ${className}`} ref={dropdownRef}>
      <div className="prestador-search-input-container">
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
          className={`prestador-search-input ${required && !searchTerm ? 'required-empty' : ''}`}
          required={required}
          disabled={isLoading}
        />
        
        <div className="prestador-search-icons">
          <Search size={18} className="search-icon" />
          
          {searchTerm && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              title="Limpar seleção"
            >
              <X size={16} />
            </button>
          )}
          
          <button
            type="button"
            onClick={() => !isLoading && setIsOpen(!isOpen)}
            className="dropdown-button"
            disabled={isLoading}
            title={isOpen ? "Fechar lista" : "Abrir lista"}
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      
      {isOpen && !isLoading && (
        <div className="prestador-dropdown">
          {filteredPrestadores.length === 0 ? (
            <div className="prestador-no-results">
              {prestadores.length === 0 
                ? "Nenhum prestador disponível" 
                : "Nenhum prestador encontrado"}
            </div>
          ) : (
            <ul ref={listRef} className="prestador-list">
              {filteredPrestadores.map((prestador, index) => 
                renderPrestadorItem(prestador, index)
              )}
            </ul>
          )}
          
          {filteredPrestadores.length > 0 && (
            <div className="prestador-footer">
              {filteredPrestadores.length} de {prestadores.length} prestadores
            </div>
          )}
        </div>
      )}
      
      {isLoading && (
        <div className="prestador-loading">
          <AlertCircle size={12} className="loading-icon" />
          Carregando lista de prestadores...
        </div>
      )}
      
      {/* Debug info - remover em produção */}
      {process.env.NODE_ENV === 'development' && (
        <div className="prestador-debug-info">
          Debug: {prestadores.length} prestadores, selected: {JSON.stringify(selectedPrestador)}
        </div>
      )}
      
      <style jsx>{`
        .prestador-search-container {
          position: relative;
          width: 100%;
        }
        
        .prestador-search-input-container {
          position: relative;
          width: 100%;
        }
        
        .prestador-search-input {
          width: 100%;
          padding: 0.75rem 3.5rem 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .prestador-search-input:focus {
          outline: none;
          border-color: #8cb369;
          box-shadow: 0 0 0 3px rgba(140, 179, 105, 0.1);
        }
        
        .prestador-search-input.required-empty {
          border-color: #ef4444;
        }
        
        .prestador-search-input:disabled {
          background-color: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }
        
        .prestador-search-icons {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .search-icon {
          color: #6b7280;
          pointer-events: none;
        }
        
        .clear-button,
        .dropdown-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: color 0.2s, background-color 0.2s;
        }
        
        .clear-button:hover,
        .dropdown-button:hover {
          color: #374151;
          background-color: #f3f4f6;
        }
        
        .clear-button:disabled,
        .dropdown-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .prestador-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 50;
          margin-top: 0.25rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          max-height: 16rem;
          overflow: hidden;
        }
        
        .prestador-no-results {
          padding: 1rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .prestador-list {
          max-height: 14rem;
          overflow-y: auto;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        
        .prestador-item {
          padding: 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.2s;
        }
        
        .prestador-item:last-child {
          border-bottom: none;
        }
        
        .prestador-item:hover,
        .prestador-item.highlighted {
          background-color: #f8fafc;
        }
        
        .prestador-item-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .prestador-nome-principal {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #1f2937;
        }
        
        .prestador-icon {
          color: #8cb369;
          flex-shrink: 0;
        }
        
        .prestador-nome {
          flex: 1;
        }
        
        .prestador-nome-alternativo {
          font-size: 0.75rem;
          color: #6b7280;
          margin-left: 1.75rem;
        }
        
        .prestador-localizacao {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
          margin-left: 1.75rem;
        }
        
        .prestador-location-icon {
          flex-shrink: 0;
        }
        
        .prestador-debug {
          font-size: 0.625rem;
          color: #9ca3af;
          margin-left: 1.75rem;
        }
        
        .prestador-footer {
          padding: 0.5rem 0.75rem;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
        }
        
        .prestador-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #f59e0b;
        }
        
        .loading-icon {
          flex-shrink: 0;
        }
        
        .prestador-debug-info {
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
          background-color: #f9fafb;
          padding: 0.25rem;
          border-radius: 0.25rem;
          border: 1px solid #e5e7eb;
        }
        
        /* Responsividade */
        @media (max-width: 640px) {
          .prestador-item {
            padding: 0.5rem;
          }
          
          .prestador-nome-principal {
            font-size: 0.875rem;
          }
          
          .prestador-nome-alternativo,
          .prestador-localizacao {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PrestadorSearchPrevias;