import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';

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
  
  // Rastrear o CID que veio do paciente para estilização
  const [patientCIDCode, setPatientCIDCode] = useState(null);

  // Inicializar com o CID do paciente se disponível
  useEffect(() => {
    if (patientCID && !value) {
      // Garantir que o patientCID esteja no formato de objeto
      const cidObj = typeof patientCID === 'string' 
        ? { codigo: patientCID, descricao: '', isFromPatient: true } 
        : { ...patientCID, isFromPatient: true };
      
      // Armazenar o código do CID do paciente para referência
      setPatientCIDCode(cidObj.codigo);
      
      setSelectedCIDs([cidObj]);
      if (onChange) {
        onChange([cidObj]);
      }
    } else if (value) {
      // Se já houver um valor definido, converta para o formato adequado
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
      }
      
      setSelectedCIDs(formattedCids);
    }
  }, [patientCID, value, onChange]);

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

  // Função para carregar CIDs da API
  const loadCIDs = async (search = '') => {
    try {
      setLoading(true);
      const baseUrl = "https://api.lowcostonco.com.br/backend-php/api/PacientesEmTratamento/get_cids.php";
      const url = search ? `${baseUrl}?search=${encodeURIComponent(search)}` : baseUrl;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro ao carregar CIDs: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Garantir que os dados estão no formato esperado
      const formattedData = data.map(cid => {
        const codigo = typeof cid === 'string' ? cid : (cid.codigo || cid.SUBCAT || cid.id || '');
        return {
          codigo,
          descricao: typeof cid === 'object' ? (cid.descricao || cid.DESCRICAO || cid.nome || '') : '',
          isFromPatient: codigo === patientCIDCode
        };
      });
      
      setOptions(formattedData);
    } catch (error) {
      console.error("Erro ao carregar CIDs:", error);
      // Em caso de erro, mostrar alguns CIDs comuns para permitir interação
      setOptions([
        { codigo: 'C50', descricao: 'Neoplasia maligna da mama', isFromPatient: 'C50' === patientCIDCode },
        { codigo: 'C34', descricao: 'Neoplasia maligna dos brônquios e dos pulmões', isFromPatient: 'C34' === patientCIDCode },
        { codigo: 'C18', descricao: 'Neoplasia maligna do cólon', isFromPatient: 'C18' === patientCIDCode },
        { codigo: 'C43', descricao: 'Melanoma maligno da pele', isFromPatient: 'C43' === patientCIDCode },
        { codigo: 'C16', descricao: 'Neoplasia maligna do estômago', isFromPatient: 'C16' === patientCIDCode },
        { codigo: 'C25', descricao: 'Neoplasia maligna do pâncreas', isFromPatient: 'C25' === patientCIDCode },
        { codigo: 'C20', descricao: 'Neoplasia maligna do reto', isFromPatient: 'C20' === patientCIDCode },
        { codigo: 'C56', descricao: 'Neoplasia maligna do ovário', isFromPatient: 'C56' === patientCIDCode }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Função para selecionar ou desselecionar um CID
  const handleSelectCID = (cid) => {
    // Verificar formato do CID
    if (!cid || !cid.codigo) {
      console.error('Formato de CID inválido:', cid);
      return;
    }
    
    let updatedCIDs;
    
    // Verificar se o CID já está selecionado
    if (selectedCIDs.some(item => item.codigo === cid.codigo)) {
      // Se estiver, remova-o
      updatedCIDs = selectedCIDs.filter(item => item.codigo !== cid.codigo);
    } else {
      // Se não estiver, adicione-o
      const cidWithFlag = {
        ...cid,
        isFromPatient: cid.codigo === patientCIDCode
      };
      updatedCIDs = [...selectedCIDs, cidWithFlag];
    }
    
    setSelectedCIDs(updatedCIDs);
    
    // Atualizar valor de forma apropriada para o formulário
    if (onChange) {
      // IMPORTANTE: Retornamos o array completo para permitir múltipla seleção
      onChange(updatedCIDs);
    }
    
    // NÃO fechar o dropdown para permitir seleção múltipla
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
          <div className="p-2 border-b">
            <div className="relative">
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
                  </div>
                  {selectedCIDs.some(item => item.codigo === cid.codigo) && (
                    <Check size={16} className={cid.isFromPatient ? "text-[#9e2b2b]" : "text-[#8cb369]"} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'Nenhum CID encontrado com este termo' : 'Nenhum CID disponível'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CIDSelection;