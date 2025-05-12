// src/components/Pagination.jsx
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false
}) => {
  // Cria array de páginas a serem exibidas (máximo 5 páginas)
  const getPageNumbers = () => {
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    // Ajustar se estiver próximo do final
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  // Opções de tamanho de página
  const pageSizeOptions = [10, 20, 50, 100];
  
  return (
    <div className="pagination-container">
      
      <div className="pagination-controls">
        <button 
          onClick={() => onPageChange(1)} 
          disabled={currentPage === 1 || disabled}
          className="pagination-button"
          title="Primeira página"
        >
          <ChevronsLeft size={16} />
        </button>
        
        <button 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1 || disabled}
          className="pagination-button"
          title="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={disabled}
            className={`pagination-button ${page === currentPage ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages || disabled}
          className="pagination-button"
          title="Próxima página"
        >
          <ChevronRight size={16} />
        </button>
        
        <button 
          onClick={() => onPageChange(totalPages)} 
          disabled={currentPage === totalPages || disabled}
          className="pagination-button"
          title="Última página"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
      
      
    </div>
  );
};

export default Pagination;