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
  
  // Inicializar medicamentos
  useEffect(() => {
    // Verificar medicamentos no protocolo
    if (protocolo?.medicamentos && protocolo.medicamentos.length > 0) {
      setMedicamentos(protocolo.medicamentos);
    } 
    // Verificar no cache
    else if (typeof getMedicamentosFromCache === 'function') {
      const cachedMeds = getMedicamentosFromCache(protocoloId);
      if (cachedMeds && cachedMeds.length > 0) {
        setMedicamentos(cachedMeds);
      }
    }
  }, [protocolo, protocoloId, getMedicamentosFromCache]);

  // Função para virar o card
  const handleFlip = (e) => {
    if (e) {
      e.stopPropagation(); // Impedir propagação do evento
    }
    
    // Se estiver em modo de edição ou adição, não permitir virar
    if (isEditing || isAdding) return;
    
    // Ajustar altura do card com base no conteúdo
    if (!isFlipped && backRef.current) {
      // Se estamos virando para o verso, ajustar altura com base no conteúdo do verso
      const backHeight = backRef.current.scrollHeight;
      setCardHeight(`${Math.max(280, backHeight + 20)}px`);
    } else if (frontRef.current) {
      // Se estamos voltando para a frente, restaurar altura padrão
      setCardHeight('280px');
    }
    
    // Alternar o estado de flip
    setIsFlipped(!isFlipped);
    
    // Carregar medicamentos se necessário
    if (!isFlipped && medicamentos.length === 0) {
      loadMedicamentos();
    }
  };
  
  // Função para carregar medicamentos
  const loadMedicamentos = async () => {
    if (typeof getMedicamentosFromCache !== 'function' || 
        typeof fetchServicos !== 'function' || 
        allMedicamentosLoaded || 
        medicamentos.length > 0) {
      return;
    }
    
    try {
      setIsLoading(true);
      const medicamentosData = await fetchServicos(protocoloId);
      if (medicamentosData && medicamentosData.length > 0) {
        setMedicamentos(medicamentosData);
      }
    } catch (error) {
      console.error("Erro ao carregar medicamentos:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ajustar altura quando o conteúdo do verso mudar
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
        {/* Frente do card - Informações do protocolo */}
        <div className="card-front" ref={frontRef}>
          <div className="card-header">
            <div className="protocol-code">{protocolo?.Protocolo_Sigla || 'N/D'}</div>
            {protocolo?.CID && (
              <div className="protocol-cid">{protocolo.CID}</div>
            )}
          </div>
          
          <div className="protocol-name">{protocolo?.Protocolo_Nome || 'Sem nome'}</div>
          
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
        
        {/* Verso do card - Medicamentos */}
        <div className="card-back" ref={backRef}>
          <div className="card-header">
            <h3 className="text-sm font-medium text-green-600">Medicamentos - {protocolo?.Protocolo_Sigla || 'N/D'}</h3>
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