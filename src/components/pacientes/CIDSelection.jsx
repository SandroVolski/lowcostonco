import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';

// Cache keys
const CID_CACHE_KEY = 'cached_cids';
const CID_CACHE_TIMESTAMP = 'cached_cids_timestamp';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

const CIDSelection = ({ 
  value, 
  onChange, 
  patientCID, // CID padrão do paciente
  placeholder = "Selecione o CID..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCIDs, setSelectedCIDs] = useState([]);
  const dropdownRef = useRef(null);
  
  // Removed state for oncology CIDs control
  const [patientCIDCode, setPatientCIDCode] = useState(null);

  // Inicializar com o CID do paciente se disponível
  useEffect(() => {
    console.log("CIDSelection: Inicializando - value:", value, "patientCID:", patientCID);
    
    // Se temos um patientCID e não temos value definido, usar o CID do paciente
    if (patientCID && (!value || value === '')) {
      console.log("CIDSelection: Auto-preenchendo com CID do paciente:", patientCID);
      
      // Criar objeto CID do paciente
      const cidObj = typeof patientCID === 'string' 
        ? { codigo: patientCID, descricao: '', isFromPatient: true } 
        : { ...patientCID, isFromPatient: true };
      
      // Armazenar o código do CID do paciente para referência
      setPatientCIDCode(cidObj.codigo);
      setSelectedCIDs([cidObj]);
      
      // Notificar o componente pai sobre a seleção automática
      if (onChange) {
        onChange([cidObj]);
      }
      return;
    }
    
    // Se value está vazio/null e não há patientCID, limpar completamente
    if ((!value || value === '' || (Array.isArray(value) && value.length === 0)) && !patientCID) {
      console.log("CIDSelection: Value vazio e sem CID do paciente, limpando seleção");
      setSelectedCIDs([]);
      setPatientCIDCode(null);
      return;
    }
    
    // Se há um value definido, processar normalmente
    if (value && value !== '') {
      let formattedCids = [];
      
      if (typeof value === 'string') {
        if (value.includes(',')) {
          // Se for string com valores separados por vírgula
          const cidValues = value.split(',').map(v => v.trim());
          formattedCids = cidValues.map(cid => ({ 
            codigo: cid, 
            descricao: '', 
            isFromPatient: patientCID && (typeof patientCID === 'string' ? cid === patientCID : cid === patientCID.codigo)
          }));
        } else {
          // Se for string simples
          formattedCids = [{ 
            codigo: value, 
            descricao: '', 
            isFromPatient: patientCID && (typeof patientCID === 'string' ? value === patientCID : value === patientCID.codigo)
          }];
        }
      } else if (Array.isArray(value)) {
        // Se for array, garanta que cada item é um objeto
        formattedCids = value.map(cid => {
          const codigo = typeof cid === 'string' ? cid : cid.codigo;
          return { 
            ...(typeof cid === 'string' ? { codigo, descricao: '' } : cid),
            isFromPatient: patientCID && (typeof patientCID === 'string' ? codigo === patientCID : codigo === patientCID.codigo)
          };
        });
      } else if (typeof value === 'object' && value !== null) {
        // Se for objeto, use-o diretamente
        formattedCids = [{ 
          ...value, 
          isFromPatient: patientCID && (typeof patientCID === 'string' ? value.codigo === patientCID : value.codigo === patientCID.codigo)
        }];
      }
      
      // Armazenar o código do CID do paciente (se estiver nos selecionados)
      const patientCid = formattedCids.find(cid => cid.isFromPatient);
      if (patientCid) {
        setPatientCIDCode(patientCid.codigo);
      } else if (patientCID) {
        setPatientCIDCode(typeof patientCID === 'string' ? patientCID : patientCID.codigo);
      }
      
      console.log("CIDSelection: Aplicando CIDs formatados:", formattedCids);
      setSelectedCIDs(formattedCids);
    }
  }, [patientCID, value]);

  useEffect(() => {
    // Se o patientCID mudou (novo paciente), limpar seleções anteriores
    setPatientCIDCode(patientCID?.codigo || patientCID || null);
  }, [patientCID]);

  // Carregar opções de CID
  useEffect(() => {
    if (isOpen) {
      loadCIDs(searchTerm);
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

  useEffect(() => {
    console.log("CIDSelection: PatientCID mudou para:", patientCID);
    
    // Atualizar o código do paciente
    if (patientCID) {
      const newPatientCode = typeof patientCID === 'string' ? patientCID : patientCID.codigo;
      setPatientCIDCode(newPatientCode);
      
      // Se não há CIDs selecionados, auto-selecionar o CID do paciente
      if (!selectedCIDs || selectedCIDs.length === 0) {
        console.log("CIDSelection: Auto-selecionando CID do novo paciente:", newPatientCode);
        
        const cidObj = {
          codigo: newPatientCode,
          descricao: '',
          isFromPatient: true
        };
        
        setSelectedCIDs([cidObj]);
        
        if (onChange) {
          onChange([cidObj]);
        }
      } else {
        // Atualizar flags de isFromPatient nos CIDs existentes
        const updatedCIDs = selectedCIDs.map(cid => ({
          ...cid,
          isFromPatient: cid.codigo === newPatientCode
        }));
        
        setSelectedCIDs(updatedCIDs);
      }
    } else {
      setPatientCIDCode(null);
    }
  }, [patientCID]);

  const resetSelection = useCallback(() => {
    console.log("CIDSelection: Reset completo executado");
    setSelectedCIDs([]);
    setPatientCIDCode(null);
    setSearchTerm('');
    setIsOpen(false);
    if (onChange) {
      onChange([]);
    }
  }, [onChange]);

  // Função para criar novo CID
  const handleCreateNewCID = () => {
    const codigo = prompt("Digite o código do CID:");
    if (!codigo) return;
    
    const descricao = prompt("Digite a descrição do CID:");
    if (!descricao) return;
    
    const newCID = { codigo, descricao };
    
    // Adicionar aos options localmente
    setOptions(prev => [...prev, newCID]);
    
    // Selecionar automaticamente o novo CID
    handleSelectCID(newCID);
    
    // Opcional: enviar para o backend
    // Aqui você poderia adicionar código para salvar o CID no backend
    saveCIDToDatabase(newCID);
  };
  
  // Função simulada para salvar CID no banco de dados
  const saveCIDToDatabase = async (cid) => {
    try {
      // Simulação de chamada de API
      console.log("Salvando novo CID no banco:", cid);
      
      // Em uma implementação real, aqui seria uma chamada de API
      // const response = await fetch("url-do-backend/api/salvar-cid", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(cid)
      // });
      
      // Atualizar cache
      const cachedData = getCachedCIDs();
      if (cachedData) {
        cacheCIDs([...cachedData, cid]);
      }
    } catch (error) {
      console.error("Erro ao salvar CID:", error);
    }
  };

  const getCachedCIDs = (search = '') => {
    try {
      const cachedItem = localStorage.getItem(CID_CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CID_CACHE_TIMESTAMP);
      
      if (!cachedItem || !cachedTimestamp) return null;
      
      // Check if cache is expired
      if (Date.now() - parseInt(cachedTimestamp) > CACHE_EXPIRY) {
        localStorage.removeItem(CID_CACHE_KEY);
        localStorage.removeItem(CID_CACHE_TIMESTAMP);
        return null;
      }
      
      const cachedCIDs = JSON.parse(cachedItem);
      
      // Filter by search term if provided
      if (search && search.trim() !== '') {
        const normalizedSearch = search.toLowerCase();
        return cachedCIDs.filter(cid => 
          cid.codigo.toLowerCase().includes(normalizedSearch) || 
          (cid.descricao && cid.descricao.toLowerCase().includes(normalizedSearch))
        );
      }
      
      return cachedCIDs;
    } catch (error) {
      console.error("Error retrieving cached CIDs:", error);
      return null;
    }
  };
  
  const cacheCIDs = (data) => {
    try {
      localStorage.setItem(CID_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CID_CACHE_TIMESTAMP, Date.now().toString());
      console.log(`Cached ${data.length} CIDs successfully`);
    } catch (error) {
      console.error("Error caching CIDs data:", error);
    }
  };

  // Função para carregar CIDs da API
  const loadCIDs = async (search = '') => {
    try {
      setLoading(true);
      
      // Try to get from cache first
      const cachedData = getCachedCIDs(search);
      if (cachedData) {
        console.log(`Using ${cachedData.length} cached CIDs`);
        setOptions(cachedData);
        setLoading(false);
        
        // Refresh cache in background if search is empty (we're loading all CIDs)
        if (!search) {
          refreshCacheInBackground();
        }
        
        return;
      }
      
      // If not in cache or cache expired, fetch from server
      const baseUrl = "https://api.lowcostonco.com.br/backend-php/api/PacientesEmTratamento/get_cids.php"; //AQUI MUDAR
      const url = search ? `${baseUrl}?search=${encodeURIComponent(search)}` : baseUrl;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro ao carregar CIDs: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Format the data
      const formattedData = data.map(cid => {
        const codigo = typeof cid === 'string' ? cid : (cid.codigo || cid.SUBCAT || cid.id || '');
        return {
          codigo,
          descricao: typeof cid === 'object' ? (cid.descricao || cid.DESCRICAO || cid.nome || '') : '',
          isFromPatient: codigo === patientCIDCode
        };
      });
      
      setOptions(formattedData);
      
      // Cache the full list only when not searching
      if (!search) {
        cacheCIDs(formattedData);
      }
    } catch (error) {
      console.error("Erro ao carregar CIDs:", error);
      // Fallback options remain the same as in your original code
      setOptions([
        { codigo: 'C50', descricao: 'Neoplasia maligna da mama', isFromPatient: 'C50' === patientCIDCode },
        // ... other fallback options
      ]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCacheInBackground = async () => {
    try {
      const baseUrl = "https://api.lowcostonco.com.br/backend-php/api/PacientesEmTratamento/get_cids.php"; //AQUI MUDAR
      
      const response = await fetch(baseUrl);
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Format the data
      const formattedData = data.map(cid => {
        const codigo = typeof cid === 'string' ? cid : (cid.codigo || cid.SUBCAT || cid.id || '');
        return {
          codigo,
          descricao: typeof cid === 'object' ? (cid.descricao || cid.DESCRICAO || cid.nome || '') : '',
          isFromPatient: codigo === patientCIDCode
        };
      });
      
      // Cache the data without updating UI
      cacheCIDs(formattedData);
      console.log("CIDs cache refreshed in background");
    } catch (error) {
      console.error("Background refresh error:", error);
    }
  };

  // Função para selecionar ou desselecionar um CID
  const handleSelectCID = (cid) => {
    console.log("CIDSelection: Selecionando CID:", cid);
    
    // Verificar formato do CID
    if (!cid || !cid.codigo) {
      console.error('CIDSelection: Formato de CID inválido:', cid);
      return;
    }
    
    let updatedCIDs;
    
    // Verificar se o CID já está selecionado
    if (selectedCIDs.some(item => item.codigo === cid.codigo)) {
      // Se estiver, remova-o
      updatedCIDs = selectedCIDs.filter(item => item.codigo !== cid.codigo);
      console.log("CIDSelection: CID removido, lista atualizada:", updatedCIDs);
    } else {
      // Se não estiver, adicione-o
      const cidWithFlag = {
        ...cid,
        isFromPatient: cid.codigo === patientCIDCode
      };
      updatedCIDs = [...selectedCIDs, cidWithFlag];
      console.log("CIDSelection: CID adicionado, lista atualizada:", updatedCIDs);
    }
    
    setSelectedCIDs(updatedCIDs);
    
    // Atualizar valor de forma apropriada para o formulário
    if (onChange) {
      onChange(updatedCIDs);
    }
  };

  // Função para remover um CID selecionado
  const handleRemoveCID = (codigo) => {
    const updatedCIDs = selectedCIDs.filter(cid => cid.codigo !== codigo);
    setSelectedCIDs(updatedCIDs);
    
    if (onChange) {
      // Retornar o array atualizado
      onChange(updatedCIDs);
    }
  };

  // Função para limpar todos os CIDs selecionados
  const handleClearAll = () => {
    setSelectedCIDs([]);
    if (onChange) {
      onChange([]);
    }
  };

  // Função para obter a classe de cor com base no tipo de CID
  const getCIDTagClass = (cid) => {
    if (cid.isFromPatient) {
      return "bg-[#fad7d7] text-[#9e2b2b]"; // Versão mais opaca e fraca de #f26b6b
    }
    return "bg-[#e5f1da] text-[#35524a]"; // Cor padrão para CIDs normais
  };

  return (
    <div className="cid-selection relative" ref={dropdownRef}>
      {/* Campo de entrada principal */}
      <div 
        className="form-input flex items-center min-h-[38px] cursor-pointer relative p-2"
        onClick={() => setIsOpen(true)}
      >
        {selectedCIDs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCIDs.map(cid => (
              <div 
                key={`selected-${cid.codigo}`}
                className={`${getCIDTagClass(cid)} text-sm rounded-md px-2 py-1 flex items-center`}
              >
                <span>{cid.codigo}</span>
                <button 
                  className="ml-1 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCID(cid.codigo);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {selectedCIDs.length > 0 && (
              <button 
                className="text-gray-500 hover:text-red-500 ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>

      {/* Dropdown para seleção de CIDs */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b flex justify-between items-center">
            <div className="relative flex-grow">
              <Search size={18} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar CID..."
                className="form-input w-full pl-8"
                autoFocus
              />
            </div>
            {/* Removed oncology CIDs filter button */}
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Carregando CIDs...
            </div>
          ) : options.length > 0 ? (
            <ul className="py-1">
              {options.map(cid => (
                <li 
                  key={`option-${cid.codigo}`}
                  className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between
                    ${selectedCIDs.some(item => item.codigo === cid.codigo) 
                      ? (cid.isFromPatient ? 'bg-[#fdf1f1]' : 'bg-[#f0f7e9]') 
                      : ''}`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevenir propagação do evento
                    handleSelectCID(cid);
                  }}
                >
                  <div>
                    <span className={`font-medium ${cid.isFromPatient ? 'text-[#9e2b2b]' : ''}`}>
                      {cid.codigo}
                    </span>
                    {cid.descricao && (
                      <span className="text-gray-600"> - {cid.descricao}</span>
                    )}
                    {cid.isFromPatient && (
                      <span className="ml-2 text-xs text-[#9e2b2b] bg-[#fad7d7] px-1 py-0.5 rounded">
                        CID do Paciente
                      </span>
                    )}
                    {cid.codigo.startsWith('C') && (
                      <span className="ml-2 text-xs text-[#9e2b2b] bg-[#fad7d7] px-1 py-0.5 rounded">
                        Oncológico
                      </span>
                    )}
                  </div>
                  {selectedCIDs.some(item => item.codigo === cid.codigo) && (
                    <Check size={16} className={cid.isFromPatient ? "text-[#9e2b2b]" : "text-[#8cb369]"} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center">
              {searchTerm ? (
                <div>
                  <p className="text-gray-500 mb-2">Nenhum CID encontrado com este termo</p>
                  <button 
                    onClick={handleCreateNewCID}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 flex items-center mx-auto"
                  >
                    <Plus size={14} className="mr-1" />
                    Cadastrar Novo CID
                  </button>
                </div>
              ) : (
                'Nenhum CID disponível'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CIDSelection;