import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Database } from 'lucide-react';

/**
 * Componente de tabela com paginação virtual para grande volume de dados
 */
const DataTableWithVirtualization = ({ 
  columns = [],       // Array de definições de colunas
  data = [],          // Array completo de dados 
  pageSize = 100,     // Número de linhas por página
  loading = false,    // Flag de carregamento
  onRowSelect,        // Callback para seleção de linha
  selectedRowId = null, // ID da linha selecionada
  searchTerm = '',    // Termo de pesquisa atual
  sortField = '',     // Campo de ordenação
  sortOrder = 'asc',  // Ordem de ordenação
  onSort,             // Callback para ordenação
  onScroll,           // Callback para evento de scroll
  className = '',     // Classes adicionais
  tableHeight = 600,  // Altura da tabela em pixels
  rowHeight = 40,     // Altura estimada de cada linha
}) => {
  // Estados para controle de paginação virtual
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleRows, setVisibleRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Referências DOM
  const tableRef = useRef(null);
  const containerRef = useRef(null);
  
  // Calcular o total de páginas quando os dados mudam
  useEffect(() => {
    const pages = Math.ceil(data.length / pageSize);
    setTotalPages(pages);
    // Resetar para a primeira página quando os dados mudam
    setCurrentPage(1);
    // Calcular as linhas visíveis
    updateVisibleRows(1);
  }, [data, pageSize]);
  
  // Atualizar as linhas visíveis quando a página muda
  const updateVisibleRows = useCallback((page) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, data.length);
    const rows = data.slice(startIndex, endIndex);
    setVisibleRows(rows);
  }, [data, pageSize]);
  
  // Atualizar quando a página muda
  useEffect(() => {
    updateVisibleRows(currentPage);
  }, [currentPage, updateVisibleRows]);
  
  // Manipular eventos de paginação
  const goToPage = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };
  
  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPrevPage = () => goToPage(currentPage - 1);
  
  // Manipular eventos de scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setScrollPosition(scrollTop);
    
    // Quando chega próximo ao final, carrega mais dados
    if (scrollTop + clientHeight >= scrollHeight - (rowHeight * 2)) {
      if (currentPage < totalPages) {
        goToNextPage();
      }
    }
    
    // Quando chega ao topo, volta para a página anterior
    if (scrollTop <= rowHeight && currentPage > 1) {
      goToPrevPage();
    }
    
    // Chamar callback de scroll
    if (onScroll) {
      onScroll(scrollTop, scrollHeight, clientHeight);
    }
  }, [currentPage, totalPages, rowHeight, onScroll]);
  
  // Adicionar evento de scroll
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener('scroll', handleScroll);
      return () => {
        currentContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);
  
  // Renderizar cabeçalho da tabela
  const renderTableHeader = () => (
    <thead className="sticky top-0 bg-white">
      <tr>
        {columns.map((column, index) => (
          <th 
            key={index} 
            className={`px-4 py-2 font-semibold text-sm text-gray-700 border-b ${column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            style={{ width: column.width || 'auto' }}
            onClick={() => column.sortable && onSort && onSort(column.field)}
          >
            <div className="flex items-center justify-between">
              <span>{column.header}</span>
              {column.sortable && sortField === column.field && (
                <span className="ml-1 text-blue-600">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
  
  // Renderizar célula
  const renderCell = (row, column, rowIndex) => {
    const value = row[column.field];
    
    // Se houver um renderizador personalizado
    if (column.renderCell) {
      return column.renderCell(value, row, rowIndex);
    }
    
    // Para valores nulos ou indefinidos
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Para valores booleanos
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }
    
    // Para valores normais
    return value;
  };
  
  // Renderizar lista de páginas
  const renderPagination = () => {
    // Calcular páginas visíveis
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Gerar lista de páginas
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
        <div className="text-sm text-gray-500">
          Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, data.length)} de {data.length} registros
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
          >
            «
          </button>
          
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
          >
            ‹
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
          >
            ›
          </button>
          
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
          >
            »
          </button>
        </div>
      </div>
    );
  };
  
  // Verificar se há dados
  const hasData = Array.isArray(data) && data.length > 0;
  
  // Calcular altura estimada do conteúdo para scroll virtual
  const contentHeight = data.length * rowHeight;
  
  // Calcular o deslocamento (offset) para o conteúdo virtual
  const contentOffset = (currentPage - 1) * pageSize * rowHeight;
  
  // Renderizar o componente
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Informações sobre os dados */}
      <div className="flex justify-between items-center mb-2 px-4 text-sm text-gray-500">
        <div>
          Total de registros: {data.length}
        </div>
        {loading && (
          <div className="flex items-center">
            <Database className="animate-pulse mr-2 text-blue-600" size={16} />
            <span>Processando dados...</span>
          </div>
        )}
      </div>
      
      {/* Container da tabela com scroll */}
      <div 
        ref={containerRef}
        className="overflow-auto border rounded"
        style={{ height: tableHeight, position: 'relative' }}
      >
        {/* Tabela real */}
        <table 
          ref={tableRef}
          className="w-full border-collapse table-auto"
        >
          {renderTableHeader()}
          
          {/* Corpo da tabela com linhas visíveis */}
          <tbody>
            {hasData ? (
              <>
                {/* Espaçador superior para simular scroll */}
                <tr>
                  <td colSpan={columns.length} style={{ height: contentOffset, padding: 0 }}></td>
                </tr>
                
                {/* Linhas visíveis */}
                {visibleRows.map((row, rowIndex) => (
                  <tr 
                    key={row.id || rowIndex}
                    onClick={() => onRowSelect && onRowSelect(row.id || rowIndex)}
                    className={`${selectedRowId === row.id ? 'bg-blue-100' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors duration-150`}
                  >
                    {columns.map((column, colIndex) => (
                      <td 
                        key={colIndex}
                        className="px-4 py-2 border-b text-sm"
                      >
                        {renderCell(row, column, rowIndex)}
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* Espaçador inferior para simular scroll */}
                <tr>
                  <td 
                    colSpan={columns.length} 
                    style={{ 
                      height: contentHeight - contentOffset - (visibleRows.length * rowHeight),
                      padding: 0 
                    }}
                  ></td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-4 text-center text-gray-500">
                  {loading ? 'Carregando dados...' : searchTerm ? 'Nenhum resultado encontrado.' : 'Nenhum dado disponível.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Navegação de paginação */}
      {hasData && renderPagination()}
    </div>
  );
};

export default DataTableWithVirtualization;