import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePatient } from '../../context/PatientContext';

const PatientSearchModal = ({ isOpen, onClose, onSelectPatient }) => {
  const { searchPatients } = usePatient();
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20); // Número de resultados por página
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };

  // Função de busca que chama a API
  const handleSearch = async (page = 1) => {
    if (localSearchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Modificar para chamar a API com paginação como na página de cadastro
      const response = await searchPatients(localSearchTerm, 'nome', page, pageSize);
      setSearchResults(response.data || []);
      setTotalPages(response.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Buscar quando o termo de busca mudar (com debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm.trim().length >= 2) {
        handleSearch(1); // Resetar para página 1 quando o termo mudar
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  // Navegação entre páginas
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    handleSearch(page);
  };

  // Manipulador para tecla Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <motion.div 
        className="patient-search-modal"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title-previa">Buscar Paciente</h2>
        <p className="modal-description-previa">
          Digite o nome ou código do paciente para continuar com a Nova Prévia
        </p>
        
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input 
            type="text"
            placeholder="Digite o nome ou código do paciente..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-input"
            autoFocus
          />
        </div>
        
        {isSearching ? (
          <div className="flex justify-center my-4">
            <div className="loading-spinner w-8 h-8"></div>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div className="patient-list">
              {searchResults.map(patient => (
                <div 
                  key={patient.id} 
                  className="patient-item"
                  onClick={() => onSelectPatient(patient)}
                >
                  <div className="patient-item-name">{patient.Nome}</div>
                  <div className="patient-item-info">
                    Código: {patient.Paciente_Codigo} | 
                    Operadora: {patient.Operadora || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : localSearchTerm.trim().length >= 2 ? (
          <p className="text-center text-gray-500 mt-4">
            Nenhum paciente encontrado com este termo.
          </p>
        ) : null}
        
        <div className="modal-footer">
          <button 
            className="cancel-button"
            onClick={onClose}
          >
            <X size={16} />
            Cancelar
          </button>
          
          <button 
            className="new-patient-button"
            onClick={() => {
              onClose();
              // Adicionar navegação para cadastro de paciente
              window.location.href = '/PacientesEmTratamento?tab=cadastro';
            }}
          >
            <UserPlus size={18} />
            Cadastrar Novo Paciente
          </button>
        </div>
      </motion.div>
    </div>
  );
};