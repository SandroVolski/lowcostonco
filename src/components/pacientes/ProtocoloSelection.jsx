import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PROTOCOLO_CACHE_KEY = 'cached_protocolos';
const PROTOCOLO_CACHE_TIMESTAMP = 'cached_protocolos_timestamp';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Cache key for saving form data when navigating to protocol registration
const PREVIA_FORM_CACHE_KEY = 'previa_form_temp_data';

const ProtocoloSelection = ({ 
  value, 
  onChange, 
  placeholder = "Selecione o protocolo..." 
}) => {
  const navigate = useNavigate();
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

  const getCachedProtocolos = (search = '') => {
    try {
      const cachedItem = localStorage.getItem(PROTOCOLO_CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(PROTOCOLO_CACHE_TIMESTAMP);
      
      if (!cachedItem || !cachedTimestamp) return null;
      
      // Check if cache is expired
      if (Date.now() - parseInt(cachedTimestamp) > CACHE_EXPIRY) {
        localStorage.removeItem(PROTOCOLO_CACHE_KEY);
        localStorage.removeItem(PROTOCOLO_CACHE_TIMESTAMP);
        return null;
      }
      
      const cachedProtocolos = JSON.parse(cachedItem);
      
      // Filter by search term if provided
      if (search && search.trim() !== '') {
        const normalizedSearch = search.toLowerCase();
        return cachedProtocolos.filter(protocolo => 
          protocolo.nome.toLowerCase().includes(normalizedSearch) || 
          (protocolo.sigla && protocolo.sigla.toLowerCase().includes(normalizedSearch))
        );
      }
      
      return cachedProtocolos;
    } catch (error) {
      console.error("Error retrieving cached Protocolos:", error);
      return null;
    }
  };
  
  const cacheProtocolos = (data) => {
    try {
      localStorage.setItem(PROTOCOLO_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(PROTOCOLO_CACHE_TIMESTAMP, Date.now().toString());
      console.log(`Cached ${data.length} Protocolos successfully`);
    } catch (error) {
      console.error("Error caching Protocolos data:", error);
    }
  };

  // Função para carregar protocolos da API
  const loadProtocolos = async (search = '') => {
    try {
      setLoading(true);
      
      // Try to get from cache first
      const cachedData = getCachedProtocolos(search);
      if (cachedData) {
        console.log(`Using ${cachedData.length} cached Protocolos`);
        setOptions(cachedData);
        setLoading(false);
        
        // Refresh cache in background if search is empty (we're loading all protocols)
        if (!search) {
          refreshCacheInBackground();
        }
        
        return;
      }
      
      // If not in cache or cache expired, fetch from server
      const baseUrl = "https://api.lowcostonco.com.br/backend-php/api/PacientesEmTratamento/get_protocolos.php"; //AQUI MUDAR
      const url = search ? `${baseUrl}?search=${encodeURIComponent(search)}` : baseUrl;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao carregar protocolos');
      }
      
      const data = await response.json();
      
      // Format the data
      const formattedData = data.map(protocolo => ({
        id: protocolo.id || protocolo.id_protocolo,
        nome: protocolo.Protocolo_Nome,
        sigla: protocolo.Protocolo_Sigla,
        cid: protocolo.CID
      }));
      
      setOptions(formattedData);
      
      // Cache the full list only when not searching
      if (!search) {
        cacheProtocolos(formattedData);
      }
    } catch (error) {
      console.error("Erro ao carregar protocolos:", error);
      // Fallback options
      setOptions([
        { id: 1, nome: 'Protocolo A', sigla: 'PA', cid: 'C50' },
        // ... other fallback options
      ]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCacheInBackground = async () => {
    try {
      const baseUrl = "https://api.lowcostonco.com.br/backend-php/api/PacientesEmTratamento/get_protocolos.php"; //AQUI MUDAR
      
      const response = await fetch(baseUrl);
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Format the data
      const formattedData = data.map(protocolo => ({
        id: protocolo.id || protocolo.id_protocolo,
        nome: protocolo.Protocolo_Nome,
        sigla: protocolo.Protocolo_Sigla,
        cid: protocolo.CID
      }));
      
      // Cache the data without updating UI
      cacheProtocolos(formattedData);
      console.log("Protocolos cache refreshed in background");
    } catch (error) {
      console.error("Background refresh error:", error);
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
  
  // Função para redirecionar para cadastro de protocolo
  const handleAddNewProtocolo = () => {
    // Cacheamos os dados do formulário atual para preservar ao retornar
    try {
      // Get the current form data from the parent form if available
      const formElement = dropdownRef.current?.closest('form');
      let formData = {};
      
      if (formElement) {
        // Create FormData object from the form
        const formDataObj = new FormData(formElement);
        
        // Convert FormData to a simple object
        for (let [key, value] of formDataObj.entries()) {
          formData[key] = value;
        }
        
        // Store in localStorage
        localStorage.setItem(PREVIA_FORM_CACHE_KEY, JSON.stringify(formData));
        console.log('Form data cached before navigation');
      }
    } catch (error) {
      console.error('Failed to cache form data:', error);
    }
    
    // Navigate to the protocol registration page
    navigate('/PacientesEmTratamento?tab=protocolo');
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
            <div className="p-4 text-center">
              {searchTerm ? (
                <div className="flex flex-col items-center">
                  <p className="text-gray-500 mb-3">Nenhum protocolo encontrado com este termo</p>
                  <button 
                    onClick={handleAddNewProtocolo}
                    className="px-3 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 flex items-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Cadastrar Novo Protocolo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-gray-500 mb-3">Nenhum protocolo disponível</p>
                  <button 
                    onClick={handleAddNewProtocolo}
                    className="px-3 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 flex items-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Cadastrar Novo Protocolo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProtocoloSelection;