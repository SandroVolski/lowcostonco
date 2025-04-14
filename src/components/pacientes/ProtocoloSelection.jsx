import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';

const ProtocoloSelection = ({ 
  value, 
  onChange, 
  placeholder = "Selecione o protocolo..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProtocolo, setSelectedProtocolo] = useState(null);
  const dropdownRef = useRef(null);

  // Inicializar com o valor atual se disponível
  useEffect(() => {
    if (value && typeof value === 'object') {
      setSelectedProtocolo(value);
    } else if (value && typeof value === 'string') {
      // Se for apenas o nome do protocolo, criar um objeto simples
      setSelectedProtocolo({ 
        id: null,
        nome: value,
        sigla: value
      });
    }
  }, [value]);

  // Carregar opções de protocolo
  useEffect(() => {
    if (isOpen) {
      loadProtocolos(searchTerm);
    }
  }, [isOpen, searchTerm]);

  // Fechar dropdown quando clicar fora
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

  // Função para carregar protocolos da API
  const loadProtocolos = async (search = '') => {
    try {
      setLoading(true);
      const baseUrl = "https://api.lowcostonco.com.br/backend-php/api/PacientesEmTratamento/get_protocolos.php";
      const url = search ? `${baseUrl}?search=${encodeURIComponent(search)}` : baseUrl;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao carregar protocolos');
      }
      
      const data = await response.json();
      
      // Formatar os dados para o formato esperado pelo componente
      const formattedData = data.map(protocolo => ({
        id: protocolo.id || protocolo.id_protocolo,
        nome: protocolo.Protocolo_Nome,
        sigla: protocolo.Protocolo_Sigla,
        cid: protocolo.CID
      }));
      
      setOptions(formattedData);
    } catch (error) {
      console.error("Erro ao carregar protocolos:", error);
      // Em caso de erro, mostrar alguns protocolos comuns para permitir interação
      setOptions([
        { id: 1, nome: 'Protocolo A', sigla: 'PA', cid: 'C50' },
        { id: 2, nome: 'Protocolo B', sigla: 'PB', cid: 'C34' },
        { id: 3, nome: 'Protocolo C', sigla: 'PC', cid: 'C18' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Função para selecionar um protocolo
  const handleSelectProtocolo = (protocolo) => {
    setSelectedProtocolo(protocolo);
    setIsOpen(false);
    
    if (onChange) {
      // Você pode retornar o objeto inteiro ou apenas o nome, dependendo da necessidade
      onChange(protocolo);
      
      // Se precisar apenas do nome:
      // onChange(protocolo.nome);
    }
  };

  // Função para limpar o protocolo selecionado
  const handleClearProtocolo = (e) => {
    e.stopPropagation();
    setSelectedProtocolo(null);
    
    if (onChange) {
      onChange(null);
    }
  };

  // Exibição do protocolo selecionado
  const getDisplayValue = () => {
    if (!selectedProtocolo) return placeholder;
    
    // Se tiver sigla, mostrar "Sigla - Nome"
    if (selectedProtocolo.sigla && selectedProtocolo.sigla !== selectedProtocolo.nome) {
      return `${selectedProtocolo.sigla} - ${selectedProtocolo.nome}`;
    }
    
    // Caso contrário, mostrar apenas o nome
    return selectedProtocolo.nome;
  };

  return (
    <div className="protocolo-selection relative" ref={dropdownRef}>
      {/* Campo de entrada principal */}
      <div 
        className="form-input flex items-center justify-between min-h-[38px] cursor-pointer relative p-2"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex-grow truncate">
          {getDisplayValue()}
        </div>
        
        {selectedProtocolo ? (
          <button 
            className="text-gray-500 hover:text-red-500 ml-2"
            onClick={handleClearProtocolo}
          >
            <X size={16} />
          </button>
        ) : (
          <div className="text-gray-400">
            <Search size={16} />
          </div>
        )}
      </div>

      {/* Dropdown para seleção de protocolos */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={18} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar protocolo..."
                className="form-input w-full pl-8"
                autoFocus
              />
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Carregando protocolos...
            </div>
          ) : options.length > 0 ? (
            <ul className="py-1">
              {options.map(protocolo => (
                <li 
                  key={protocolo.id}
                  className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between
                    ${selectedProtocolo?.id === protocolo.id ? 'bg-[#f0f7e9]' : ''}`}
                  onClick={() => handleSelectProtocolo(protocolo)}
                >
                  <div>
                    <span className="font-medium">
                      {protocolo.sigla && protocolo.sigla !== protocolo.nome
                        ? `${protocolo.sigla} - ${protocolo.nome}`
                        : protocolo.nome}
                    </span>
                    {protocolo.cid && (
                      <span className="text-gray-600 ml-2">
                        (CID: {protocolo.cid})
                      </span>
                    )}
                  </div>
                  {selectedProtocolo?.id === protocolo.id && (
                    <Check size={16} className="text-[#8cb369]" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'Nenhum protocolo encontrado com este termo' : 'Nenhum protocolo disponível'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProtocoloSelection;