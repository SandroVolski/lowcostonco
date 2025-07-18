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
  
  // FUNÇÃO ADICIONADA PARA MELHORAR TÍTULOS
  const enhanceProtocolTitle = (element, title) => {
    if (!element || !title) return;
    
    const isOverflowing = element.scrollWidth > element.clientWidth;
    
    if (isOverflowing) {
      element.setAttribute('title', title);
      element.classList.add('has-overflow');
    } else {
      element.removeAttribute('title');
      element.classList.remove('has-overflow');
    }
  };
  
  // Inicializar medicamentos (seu código existente)
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

  // USEEFFECT ADICIONADO PARA MELHORAR TÍTULOS
  useEffect(() => {
    const protocolNameElement = cardRef.current?.querySelector('.protocol-name');
    if (protocolNameElement && protocolo?.Protocolo_Nome) {
      setTimeout(() => {
        enhanceProtocolTitle(protocolNameElement, protocolo.Protocolo_Nome);
      }, 50);
    }
  }, [protocolo?.Protocolo_Nome, isFlipped]);

  // Função para virar o card (seu código existente)
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
  
  // Resto das suas funções existentes...
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
            <div className="protocol-code">{protocolo?.Protocolo_Sigla || 'N/D'}</div>
            {protocolo?.CID && (
              <div className="protocol-cid">{protocolo.CID}</div>
            )}
          </div>
          
          {/* LINHA MODIFICADA - NOME DO PROTOCOLO COM TRATAMENTO DE OVERFLOW */}
          <div 
            className="protocol-name"
            title={protocolo?.Protocolo_Nome && protocolo.Protocolo_Nome.length > 30 ? protocolo.Protocolo_Nome : undefined}
          >
            <span className="protocol-name-text">
              {protocolo?.Protocolo_Nome || 'Sem nome'}
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
        
        {/* Verso do card - seu código existente */}
        <div className="card-back" ref={backRef}>
          {/* Seu código existente para o verso do card */}
        </div>
      </div>
    </div>
  );
};

export default ProtocoloFlipCard;