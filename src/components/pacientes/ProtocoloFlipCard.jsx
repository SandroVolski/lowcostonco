import React, { useState, useRef, useEffect } from 'react';
import { 
  Pill, Calendar, Clock, Droplet, Edit, Info, 
  Database, ArrowLeft, Activity, Bookmark 
} from 'lucide-react';

const ProtocoloFlipCard = ({ 
  protocolo, 
  isSelected,
  showProtocoloDetails, 
  handleEditFixedWithSelection, 
  getMedicamentosFromCache, 
  fetchServicos, 
  allMedicamentosLoaded, 
  formatDiasAdministracao, 
  getUnidadeMedidaText, 
  isEditing, 
  isAdding,
  handleSelectProtocolo
}) => {
  const protocoloId = protocolo?.id;
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardHeight, setCardHeight] = useState('280px');
  const [medicamentos, setMedicamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const cardRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  
  // FUNÇÃO PARA TRUNCAR O TÍTULO DO PROTOCOLO (similar ao AtendPreviaView)
  const getTituloProtocolo = () => {
    if (protocolo?.Protocolo_Nome && protocolo.Protocolo_Nome.trim()) {
      const titulo = protocolo.Protocolo_Nome.trim();
      // Truncar se for muito longo (máximo 35 caracteres para cards de protocolo)
      return titulo.length > 35 ? `${titulo.substring(0, 32)}...` : titulo;
    }
    // Fallback
    return 'Sem nome';
  };
  
  // FUNÇÃO PARA VERIFICAR SE O TÍTULO É LONGO E PRECISA DE TOOLTIP
  const isTituloLongo = () => {
    if (protocolo?.Protocolo_Nome && protocolo.Protocolo_Nome.trim()) {
      return protocolo.Protocolo_Nome.trim().length > 35;
    }
    return false;
  };

  // ✅ FUNÇÃO PARA VERIFICAR SE O CÓDIGO DO PROTOCOLO É LONGO E PRECISA DE MARQUEE
  const isCodigoLongo = () => {
    if (protocolo?.Protocolo_Sigla && protocolo.Protocolo_Sigla.trim()) {
      return protocolo.Protocolo_Sigla.trim().length > 8; // Limite de 8 caracteres para o código
    }
    return false;
  };

  // ✅ FUNÇÃO PARA VERIFICAR SE O CÓDIGO ESTÁ SENDO TRUNCADO (OVERFLOW)
  const isCodigoTruncado = () => {
    if (!isCodigoLongo()) return false;
    
    // Verificar se o elemento existe e está sendo truncado
    const codeElement = cardRef.current?.querySelector('.protocol-code');
    if (codeElement) {
      return codeElement.scrollWidth > codeElement.clientWidth;
    }
    return false;
  };

  // ✅ FUNÇÃO PARA CRIAR EFEITO MARQUEE NO CÓDIGO (APENAS QUANDO NECESSÁRIO)
  const renderMarqueeCode = () => {
    const codigo = protocolo?.Protocolo_Sigla || 'N/D';
    
    // Só aplica marquee se o código for longo E estiver sendo truncado
    if (isCodigoLongo() && isCodigoTruncado()) {
      return (
        <div className="marquee-container">
          <div className="marquee-content">
            <span>{codigo}</span>
          </div>
        </div>
      );
    }
    
    return codigo;
  };
  
  // FUNÇÃO MELHORADA PARA DETECTAR OVERFLOW
  const enhanceProtocolTitle = (element, title) => {
    if (!element || !title) return;
    
    const isOverflowing = element.scrollWidth > element.clientWidth;
    
    if (isOverflowing || isTituloLongo()) {
      element.setAttribute('title', title);
      element.classList.add('has-overflow');
    } else {
      element.removeAttribute('title');
      element.classList.remove('has-overflow');
    }
  };
  
  // Inicializar medicamentos (código existente)
  useEffect(() => {
    if (protocolo?.medicamentos && protocolo.medicamentos.length > 0) {
      setMedicamentos(protocolo.medicamentos);
    } 
    else if (typeof getMedicamentosFromCache === 'function') {
      const cachedMeds = getMedicamentosFromCache(protocoloId);
      if (cachedMeds && cachedMeds.length > 0) {
        setMedicamentos(cachedMeds);
      }
    }
  }, [protocolo, protocoloId, getMedicamentosFromCache]);

  // USEEFFECT ATUALIZADO PARA APLICAR O TRUNCAMENTO E TOOLTIP
  useEffect(() => {
    const protocolNameElement = cardRef.current?.querySelector('.protocol-name');
    const protocolCodeElement = cardRef.current?.querySelector('.protocol-code');
    
    if (protocolNameElement && protocolo?.Protocolo_Nome) {
      setTimeout(() => {
        enhanceProtocolTitle(protocolNameElement, protocolo.Protocolo_Nome);
      }, 100); // Aumentado o delay para garantir que o DOM foi renderizado
    }
    
    // ✅ VERIFICAR SE O CÓDIGO PRECISA DE MARQUEE
    if (protocolCodeElement && protocolo?.Protocolo_Sigla) {
      setTimeout(() => {
        const isOverflowing = protocolCodeElement.scrollWidth > protocolCodeElement.clientWidth;
        const isLong = isCodigoLongo();
        
        if (isLong && isOverflowing) {
          protocolCodeElement.classList.add('marquee-enabled');
        } else {
          protocolCodeElement.classList.remove('marquee-enabled');
        }
      }, 100);
    }
  }, [protocolo?.Protocolo_Nome, protocolo?.Protocolo_Sigla, isFlipped]);

  // Função para virar o card (código existente)
  const handleFlip = (e) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (isEditing || isAdding) return;
    
    if (!isFlipped && backRef.current) {
      const backHeight = backRef.current.scrollHeight;
      setCardHeight(`${Math.max(280, backHeight + 20)}px`);
    } else if (frontRef.current) {
      setCardHeight('280px');
    }
    
    setIsFlipped(!isFlipped);
    
    if (!isFlipped && medicamentos.length === 0) {
      loadMedicamentos();
    }
  };
  
  // Função para carregar medicamentos (mantenha a implementação existente)
  const loadMedicamentos = async () => {
    // Seu código existente de carregamento de medicamentos
  };

  useEffect(() => {
    if (isFlipped && backRef.current) {
      const backHeight = backRef.current.scrollHeight;
      setCardHeight(`${Math.max(280, backHeight + 20)}px`);
    }
  }, [isFlipped, medicamentos]);
  
  return (
    <div 
      className={`protocol-card ${isSelected ? 'selected' : ''}`}
      onClick={() => typeof handleSelectProtocolo === 'function' ? handleSelectProtocolo(protocoloId) : null}
      ref={cardRef}
      data-protocol-id={protocoloId}
      style={{ height: cardHeight }}
    >
      <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Frente do card */}
        <div className="card-front" ref={frontRef}>
          <div className="card-header">
            <div 
              className="protocol-code"
              title={protocolo?.Protocolo_Sigla}
            >
              {renderMarqueeCode()}
            </div>
            {protocolo?.CID && (
              <div className="protocol-cid">{protocolo.CID}</div>
            )}
          </div>
          
          {/* NOME DO PROTOCOLO COM TRUNCAMENTO PROGRAMÁTICO */}
          <div 
            className="protocol-name"
            title={isTituloLongo() ? protocolo.Protocolo_Nome : undefined}
          >
            <span className="protocol-name-text">
              {getTituloProtocolo()}
            </span>
          </div>
          
          <div className="protocol-info">
            <div className="info-row">
              <Calendar size={14} />
              <span>Intervalo: {protocolo?.Intervalo_Ciclos || 'N/D'} dias</span>
            </div>
            <div className="info-row">
              <Activity size={14} />
              <span>Ciclos: {protocolo?.Ciclos_Previstos || 'N/D'}</span>
            </div>
            <div className="info-row">
              <Bookmark size={14} />
              <span>Linha: {protocolo?.Linha || 'N/D'}</span>
            </div>
            <div className="info-row">
              <Pill size={14} />
              <span>Medicamentos: {medicamentos.length}</span>
            </div>
          </div>
          
          <div className="card-actions" onClick={e => e.stopPropagation()}>
            <button 
              className="action-button-pacientes info"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof showProtocoloDetails === 'function') {
                  showProtocoloDetails(protocoloId); 
                }
              }}
              title="Ver detalhes"
            >
              <Info size={16} />
            </button>
            <button 
              className="action-button-pacientes edit"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof handleEditFixedWithSelection === 'function') {
                  handleEditFixedWithSelection(protocolo);
                }
              }}
              title="Editar protocolo"
            >
              <Edit size={16} />
            </button>
            <button 
              className="action-button-pacientes flip"
              onClick={handleFlip}
              title="Ver medicamentos"
            >
              <Database size={16} />
            </button>
          </div>
        </div>
        
        {/* Verso do card - medicamentos */}
        <div className="card-back" ref={backRef}>
          <div className="card-header">
            <h3 className="text-sm font-medium text-green-600">
              Medicamentos - {protocolo?.Protocolo_Sigla || 'N/D'}
            </h3>
            <button 
              className="action-button-pacientes flip-back"
              onClick={handleFlip}
              title="Voltar"
            >
              <ArrowLeft size={16} />
            </button>
          </div>
          
          <div className="medicamentos-container">
            {isLoading ? (
              <div className="loading-indicator">
                <div className="spinner-small"></div>
                <span>Carregando...</span>
              </div>
            ) : medicamentos.length > 0 ? (
              <div className="medicamentos-list">
                {medicamentos.map((med, idx) => (
                  <div key={idx} className="medicamento-item">
                    <div className="medicamento-nome">
                      <Pill size={16} className="med-icon" />
                      {med.nome || 'N/D'}
                    </div>
                    <div className="medicamento-details">
                      <span className="pill-detail">
                        <Droplet size={12} />
                        {(med.dose || med.Dose) ? 
                          `${med.dose || med.Dose} ${typeof getUnidadeMedidaText === 'function' ? getUnidadeMedidaText(med.unidade_medida) : med.unidade_medida || 'N/D'}` : 
                          'N/D'
                        }
                      </span>
                      <span className="pill-detail">
                        <Calendar size={12} />
                        {typeof formatDiasAdministracao === 'function' ? 
                          formatDiasAdministracao(med.dias_adm || med.dias_aplicacao || 'N/D', {
                            maxDiasVisíveis: 5,
                            mostrarTooltip: true,
                            formatoIntervalo: true
                          }) : 
                          med.dias_adm || med.dias_aplicacao || 'N/D'
                        }
                      </span>
                      <span className="pill-detail">
                        <Clock size={12} />
                        {med.frequencia || 'N/D'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-medicamentos">
                <Pill size={32} className="text-gray-300 mb-2" />
                <p>Nenhum medicamento cadastrado</p>
                <p className="text-xs text-gray-400 mt-1">Você pode adicionar medicamentos editando este protocolo</p>
              </div>
            )}
          </div>
          
          <div className="card-actions back" onClick={e => e.stopPropagation()}>
            <button 
              className="detail-button"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof showProtocoloDetails === 'function') {
                  showProtocoloDetails(protocoloId);
                }
              }}
            >
              <Info size={14} /> Ver detalhes
            </button>
            <button 
              className="edit-button"
              onClick={(e) => { 
                e.stopPropagation();
                if (typeof handleEditFixedWithSelection === 'function') {
                  handleEditFixedWithSelection(protocolo);
                }
              }}
            >
              <Edit size={14} /> Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtocoloFlipCard;