import React, { useState, useEffect } from 'react';
import { usePatient } from '../../../context/PatientContext';
import { useToast } from '../../../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import './CalculadoraPaciente.css';

const CalculadoraPaciente = () => {
  const { calculateAUC, calculateSC1, calculateSC2, selectedPatient } = usePatient();
  const { toast } = useToast();
  
  // Estado para modal de seleção inicial
  const [showProtocolModal, setShowProtocolModal] = useState(true);
  
  // Estado para o tipo de protocolo
  const [tipoProtocolo, setTipoProtocolo] = useState('');
  
  // Estados para armazenar os valores dos campos
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [creatinina, setCreatinina] = useState('');
  const [dosePrescrita, setDosePrescrita] = useState('');
  const [doseProtocolo, setDoseProtocolo] = useState('');
  
  // Estados para armazenar os resultados
  const [aucResult, setAucResult] = useState('');
  const [sc1Result, setSc1Result] = useState('');
  const [sc2Result, setSc2Result] = useState('');
  const [mgKgResult, setMgKgResult] = useState('');
  const [doseCalculada, setDoseCalculada] = useState('');
  const [limiteInferior, setLimiteInferior] = useState('');
  const [limiteSuperior, setLimiteSuperior] = useState('');
  const [dentroFaixa, setDentroFaixa] = useState(null);
  
  // Estado para controlar a animação dos resultados
  const [showResults, setShowResults] = useState(false);
  
  // Efeito para preencher os campos com dados do paciente selecionado, se disponível
  useEffect(() => {
    if (selectedPatient) {
      // Extrair idade do formato de data de nascimento
      if (selectedPatient.Nascimento) {
        const birthDate = parseDate(selectedPatient.Nascimento);
        if (birthDate) {
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          setIdade(String(age));
        }
      }
      
      // Definir sexo do paciente
      if (selectedPatient.Sexo) {
        setSexo(selectedPatient.Sexo);
      }
    }
  }, [selectedPatient]);
  
  // Função para lidar com a seleção do tipo de protocolo no modal
  const handleProtocolSelect = (tipo) => {
    setTipoProtocolo(tipo);
    setShowProtocolModal(false);
    // Limpar campos e resultados anteriores
    handleClear(false); // Não mostrar toast ao limpar neste caso
  };
  
  // Função para converter string de data no formato DD/MM/AAAA para objeto Date
  const parseDate = (dateString) => {
    if (!dateString) return null;
    
    // Verificar o formato DD/MM/AAAA
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Meses em JS são 0-11
    const year = parseInt(parts[2], 10);
    
    // Validar componentes da data
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    return new Date(year, month, day);
  };
  
  // Função para obter o label da dose do protocolo baseado no tipo selecionado
  const getDoseProtocoloLabel = () => {
    switch (tipoProtocolo) {
      case 'mgkg':
        return 'Dose do Protocolo (mg/kg)';
      case 'sc':
        return 'Dose do Protocolo (mg/m²)';
      case 'carboplatina':
        return 'AUC Alvo';
      default:
        return 'Dose do Protocolo';
    }
  };
  
  // Função para verificar campos obrigatórios baseado no tipo de protocolo
  const checkRequiredFields = () => {
    const pesoNum = parseFloat(peso);
    
    if (isNaN(pesoNum) || pesoNum <= 0) {
      toast({
        title: "Peso inválido",
        description: "Por favor, insira um peso válido (maior que zero).",
        variant: "destructive"
      });
      return false;
    }
    
    switch (tipoProtocolo) {
      case 'sc':
        const alturaNum = parseFloat(altura);
        if (isNaN(alturaNum) || alturaNum <= 0) {
          toast({
            title: "Altura inválida",
            description: "Para protocolo de Superfície Corporal, insira uma altura válida.",
            variant: "destructive"
          });
          return false;
        }
        break;
      
      case 'carboplatina':
        const idadeNum = parseInt(idade, 10);
        const creatininaNum = parseFloat(creatinina);
        
        if (isNaN(idadeNum) || idadeNum <= 0) {
          toast({
            title: "Idade inválida",
            description: "Para protocolo de Carboplatina, insira uma idade válida.",
            variant: "destructive"
          });
          return false;
        }
        
        if (isNaN(creatininaNum) || creatininaNum <= 0) {
          toast({
            title: "Creatinina inválida",
            description: "Para protocolo de Carboplatina, insira um valor de creatinina válido.",
            variant: "destructive"
          });
          return false;
        }
        
        if (!sexo) {
          toast({
            title: "Sexo não selecionado",
            description: "Para protocolo de Carboplatina, selecione o sexo do paciente.",
            variant: "destructive"
          });
          return false;
        }
        break;
    }
    
    // Verificar dose do protocolo
    const doseProtocoloNum = parseFloat(doseProtocolo);
    if (isNaN(doseProtocoloNum) || doseProtocoloNum <= 0) {
      toast({
        title: "Dose do Protocolo inválida",
        description: "Por favor, insira uma dose do protocolo válida.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };
  
  // Função para calcular todos os resultados - apenas o trecho com o problema
  const calculateResults = () => {
    // Primeiro verifica se o tipo de protocolo foi selecionado
    if (!tipoProtocolo) {
      toast({
        title: "Tipo de Protocolo não selecionado",
        description: "Por favor, selecione o Tipo de Protocolo antes de calcular.",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica os campos obrigatórios
    if (!checkRequiredFields()) {
      return;
    }
    
    // Converter strings para números com precisão adequada
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);
    const idadeNum = parseInt(idade, 10);
    const creatininaNum = parseFloat(creatinina);
    const doseNum = parseFloat(dosePrescrita); // Dose prescrita pelo médico
    const doseProtocoloNum = parseFloat(doseProtocolo);
    
    // Limpar animação anterior de resultados
    setShowResults(false);
    
    // Timeout para permitir animação de "fade-in"
    setTimeout(() => {
      // Resetar todos os resultados
      setAucResult('');
      setSc1Result('');
      setSc2Result('');
      setMgKgResult('');
      setDoseCalculada('');
      setLimiteInferior('');
      setLimiteSuperior('');
      setDentroFaixa(null);
      
      // Calcular com base no tipo de protocolo
      switch (tipoProtocolo) {
        case 'mgkg':
          // Calcular dose baseada em mg/kg
          const doseMgKg = doseProtocoloNum * pesoNum;
          
          // Calcular limites de +/-5%
          const inferiorMgKg = doseMgKg * 0.95;
          const superiorMgKg = doseMgKg * 1.05;
          
          // Verificação de debug - remover em produção
          console.log('Dados mg/kg:');
          console.log('Peso:', pesoNum, 'kg');
          console.log('Dose do Protocolo:', doseProtocoloNum, 'mg/kg');
          console.log('Dose Prescrita:', doseNum, 'mg');
          console.log('Dose Calculada:', doseMgKg, 'mg');
          console.log('Limites:', inferiorMgKg, 'a', superiorMgKg, 'mg');
          
          // Verificar se a dose prescrita está dentro da faixa
          // Apenas fazer a verificação se a dose prescrita foi fornecida
          let dentroFaixaMgKg = null;
          if (!isNaN(doseNum) && doseNum > 0) {
            dentroFaixaMgKg = doseNum >= inferiorMgKg && doseNum <= superiorMgKg;
            console.log('Dentro da faixa?', dentroFaixaMgKg);
          }
          
          // Armazena os resultados formatados para exibição
          setDoseCalculada(doseMgKg.toFixed(2));
          setLimiteInferior(inferiorMgKg.toFixed(2));
          setLimiteSuperior(superiorMgKg.toFixed(2));
          setDentroFaixa(dentroFaixaMgKg);
          
          // Calcular mg/kg com o resultado do cálculo, não apenas o valor do protocolo
          setMgKgResult(doseProtocoloNum.toFixed(2));
          break;
        
        case 'sc':
          // Calcular SC1
          const sc1 = calculateSC1(pesoNum);
          const sc1Num = parseFloat(sc1); // Garantir que é numérico
          setSc1Result(sc1);
          
          // Calcular SC2 (se altura estiver disponível)
          if (!isNaN(alturaNum) && alturaNum > 0) {
            const sc2 = calculateSC2(pesoNum, alturaNum);
            setSc2Result(sc2);
          }
          
          // Calcular dose baseada em SC1
          const doseSC = doseProtocoloNum * sc1Num;
          
          // Calcular limites de +/-5%
          const inferiorSC = doseSC * 0.95;
          const superiorSC = doseSC * 1.05;
          
          // Verificação de debug - remover em produção
          console.log('Dados SC:');
          console.log('SC1:', sc1Num, 'm²');
          console.log('Dose do Protocolo:', doseProtocoloNum, 'mg/m²');
          console.log('Dose Prescrita:', doseNum, 'mg');
          console.log('Dose Calculada:', doseSC, 'mg');
          console.log('Limites:', inferiorSC, 'a', superiorSC, 'mg');
          
          // Verificar se a dose prescrita está dentro da faixa
          let dentroFaixaSC = null;
          if (!isNaN(doseNum) && doseNum > 0) {
            dentroFaixaSC = doseNum >= inferiorSC && doseNum <= superiorSC;
            console.log('Dentro da faixa?', dentroFaixaSC);
          }
          
          // Armazena os resultados formatados para exibição
          setDoseCalculada(doseSC.toFixed(2));
          setLimiteInferior(inferiorSC.toFixed(2));
          setLimiteSuperior(superiorSC.toFixed(2));
          setDentroFaixa(dentroFaixaSC);
          break;
        
        case 'carboplatina':
          // Calcular AUC
          const auc = calculateAUC(pesoNum, idadeNum, creatininaNum, sexo);
          const aucNum = parseFloat(auc); // Garantir que é numérico
          setAucResult(auc);
          
          // Calcular dose baseada em AUC
          const doseAUC = doseProtocoloNum * aucNum;
          
          // Calcular limites de +/-5%
          const inferiorAUC = doseAUC * 0.95;
          const superiorAUC = doseAUC * 1.05;
          
          // Verificação de debug - remover em produção
          console.log('Dados Carboplatina:');
          console.log('AUC:', aucNum);
          console.log('AUC Alvo:', doseProtocoloNum);
          console.log('Dose Prescrita:', doseNum, 'mg');
          console.log('Dose Calculada:', doseAUC, 'mg');
          console.log('Limites:', inferiorAUC, 'a', superiorAUC, 'mg');
          
          // Verificar se a dose prescrita está dentro da faixa
          let dentroFaixaAUC = null;
          if (!isNaN(doseNum) && doseNum > 0) {
            dentroFaixaAUC = doseNum >= inferiorAUC && doseNum <= superiorAUC;
            console.log('Dentro da faixa?', dentroFaixaAUC);
          }
          
          // Armazena os resultados formatados para exibição
          setDoseCalculada(doseAUC.toFixed(2));
          setLimiteInferior(inferiorAUC.toFixed(2));
          setLimiteSuperior(superiorAUC.toFixed(2));
          setDentroFaixa(dentroFaixaAUC);
          break;
      }
      
      setShowResults(true);
      
      toast({
        title: "Cálculos realizados",
        description: "Os resultados foram calculados com sucesso.",
        variant: "success"
      });
    }, 10);
  };
  
  // Função para limpar todos os campos
  const handleClear = (showNotification = true) => {
    setPeso('');
    setAltura('');
    setIdade('');
    setSexo('');
    setCreatinina('');
    setDosePrescrita('');
    setDoseProtocolo('');
    setAucResult('');
    setSc1Result('');
    setSc2Result('');
    setMgKgResult('');
    setDoseCalculada('');
    setLimiteInferior('');
    setLimiteSuperior('');
    setDentroFaixa(null);
    setShowResults(false);
    
    if (showNotification) {
      toast({
        title: "Campos limpos",
        description: "Todos os campos foram limpos com sucesso.",
        variant: "default"
      });
    }
  };
  
  // Função para resetar o tipo de protocolo e mostrar o modal novamente
  const handleResetProtocol = () => {
    setTipoProtocolo('');
    setShowProtocolModal(true);
    handleClear(false);
  };
  
  // Variantes para animações com Framer Motion
  const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { 
        duration: 0.2 
      }
    }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        delay: 0.2
      }
    }
  };
  
  const resultVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };
  
  // Renderização condicional dos campos baseado no tipo de protocolo
  const renderFormFields = () => {
    // Campos comuns para todos os tipos
    const commonFields = (
      <>
        <div className="form-field">
          <label htmlFor="peso" className="form-label">Peso (kg) *</label>
          <input 
            type="number"
            id="peso"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className="form-input"
            min="0"
            step="0.01"
            placeholder="Ex: 70.5"
            required
          />
        </div>
        
        <div className="form-field">
          <label htmlFor="doseProtocolo" className="form-label">{getDoseProtocoloLabel()} *</label>
          <input 
            type="number"
            id="doseProtocolo"
            value={doseProtocolo}
            onChange={(e) => setDoseProtocolo(e.target.value)}
            className="form-input"
            min="0"
            step="0.01"
            placeholder={tipoProtocolo === 'carboplatina' ? "Ex: 5" : "Ex: 100"}
          />
        </div>
        
        <div className="form-field">
          <label htmlFor="dosePrescrita" className="form-label">Dose Prescrita (mg)</label>
          <input 
            type="number"
            id="dosePrescrita"
            value={dosePrescrita}
            onChange={(e) => setDosePrescrita(e.target.value)}
            className="form-input"
            min="0"
            step="0.01"
            placeholder="Ex: 200"
          />
        </div>
      </>
    );
    
    // Campos específicos por tipo de protocolo
    switch (tipoProtocolo) {
      case 'mgkg':
        // Para mg/kg, apenas os campos comuns são suficientes
        return commonFields;
      
      case 'sc':
        // Para SC, adicionar campo de altura
        return (
          <>
            {commonFields}
            <div className="form-field">
              <label htmlFor="altura" className="form-label">Altura (cm) *</label>
              <input 
                type="number"
                id="altura"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="form-input"
                min="0"
                step="0.1"
                placeholder="Ex: 170"
                required
              />
            </div>
          </>
        );
      
      case 'carboplatina':
        // Para Carboplatina, adicionar idade, sexo e creatinina
        return (
          <>
            {commonFields}
            <div className="form-field">
              <label htmlFor="idade" className="form-label">Idade *</label>
              <input 
                type="number"
                id="idade"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="form-input"
                min="0"
                step="1"
                placeholder="Ex: 45"
                required
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="sexo" className="form-label">Sexo *</label>
              <select 
                id="sexo"
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Selecione</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
            </div>
            
            <div className="form-field">
              <label htmlFor="creatinina" className="form-label">Creatinina *</label>
              <input 
                type="number"
                id="creatinina"
                value={creatinina}
                onChange={(e) => setCreatinina(e.target.value)}
                className="form-input"
                min="0"
                step="0.01"
                placeholder="Ex: 0.9"
                required
              />
            </div>
          </>
        );
      
      default:
        // Caso não tenha tipo selecionado (não deve acontecer)
        return null;
    }
  };
  
  // Renderização do indicador de protocolo com ícone de seta para baixo
  const renderProtocolIndicator = () => {
    if (!tipoProtocolo) return null;
    
    let protocolName;
    switch (tipoProtocolo) {
      case 'mgkg':
        protocolName = 'Protocolo mg/kg';
        break;
      case 'sc':
        protocolName = 'Protocolo Superfície Corporal';
        break;
      case 'carboplatina':
        protocolName = 'Protocolo Carboplatina';
        break;
      default:
        protocolName = 'Protocolo';
    }
    
    return (
      <div 
        className="protocol-indicator clickable"
        onClick={handleResetProtocol}
        role="button"
        tabIndex={0}
        aria-label="Clique para alterar o protocolo"
        onKeyDown={(e) => {
          // Adiciona suporte para teclado (acessibilidade)
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleResetProtocol();
          }
        }}
      >
        <div className="protocol-content">
          <span className="protocol-name">{protocolName}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="chevron-icon"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    );
  };
  
  // Renderização condicional da Faixa de Dose
  const renderDoseRange = () => {
    if (!doseCalculada) return null;
    
    // Determinar as classes CSS com base no resultado da verificação
    const rangeClass = dentroFaixa ? "" : "out-of-range";
    
    return (
      <motion.div 
        className={`result-item dose-range-result ${rangeClass}`}
        variants={itemVariants}
      >
        <div className="result-header">
          <span className="result-label">Faixa de Dose</span>
        </div>
        
        <div className="dose-range-display">
          <div className="dose-value">
            Dose Calculada: {doseCalculada} mg
          </div>
          
          <div className="dose-range-container">
            <div className={`dose-range-line ${rangeClass}`}></div>
            <div className={`dose-range-arrow ${rangeClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 13 12 8 17 13"></polyline>
                <line x1="12" y1="8" x2="12" y2="16"></line>
              </svg>
            </div>
            <div className="dose-range-limits">
              <div className="dose-range-limit">-5%<br/>{limiteInferior} mg</div>
              <div className="dose-range-limit">+5%<br/>{limiteSuperior} mg</div>
            </div>
          </div>
          
          {dentroFaixa !== null && dosePrescrita && (
            <div className={`dose-status ${dentroFaixa ? 'dose-status-ok' : 'dose-status-warning'}`}>
              {dentroFaixa ? 'Dose Dentro da Faixa' : 'Dose Fora da Faixa'}
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  return (
    <motion.div 
      className="calc-container"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      {/* Cabeçalho modificado para mostrar o protocolo selecionado */}
      <div className="calc-header">
        {renderProtocolIndicator() || (
          <h2 className="calc-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calculator"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
            Calculadora de Dosagem
          </h2>
        )}
      </div>
      
      {/* Modal para seleção do tipo de protocolo */}
      <AnimatePresence>
        {showProtocolModal && (
          <div className="modal-overlay">
            <motion.div 
              className="protocol-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h2 className="modal-title">Selecione o Tipo de Protocolo</h2>
              <p className="modal-description">Escolha o tipo de protocolo que você deseja calcular:</p>
              
              <div className="protocol-options">
                <motion.button 
                  className="protocol-option"
                  onClick={() => handleProtocolSelect('mgkg')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="protocol-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7 15h10"/></svg>
                  </div>
                  <h3>mg/kg</h3>
                  <p>Dosagem baseada no peso do paciente</p>
                </motion.button>
                
                <motion.button 
                  className="protocol-option"
                  onClick={() => handleProtocolSelect('sc')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="protocol-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <h3>Superfície Corporal</h3>
                  <p>Dosagem baseada na superfície corporal</p>
                </motion.button>
                
                <motion.button 
                  className="protocol-option"
                  onClick={() => handleProtocolSelect('carboplatina')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="protocol-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 16V8"/></svg>
                  </div>
                  <h3>Carboplatina</h3>
                  <p>Dosagem baseada na AUC</p>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <div className="calc-grid">
        {/* Painel de entrada de dados */}
        <motion.div 
          className="calc-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <h3 className="calc-card-header">Dados do Paciente</h3>
          
          <div className="form-grid">
            {tipoProtocolo && renderFormFields()}
          </div>
          
          {tipoProtocolo && (
            <div className="btn-group-calc">
              <motion.button 
                type="button"
                onClick={calculateResults}
                className="btn-primary-calc"
                disabled={!peso}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Calcular
              </motion.button>
              <motion.button 
                type="button"
                onClick={() => handleClear()}
                className="btn-secondary-calc"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 lucide lucide-eraser"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                Limpar
              </motion.button>
            </div>
          )}
        </motion.div>
        
        {/* Painel de resultados */}
        <motion.div 
          className="calc-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <h3 className="calc-card-header">Resultados</h3>
          
          <motion.div 
            className="space-y-6"
            variants={resultVariants}
            initial="hidden"
            animate={showResults ? "visible" : "hidden"}
          >
            {/* Resultado mg/kg - Mostrar apenas para tipo mg/kg */}
            {tipoProtocolo === 'mgkg' && mgKgResult && (
              <motion.div className="result-item result-highlight" variants={itemVariants}>
                <div className="result-header">
                  <span className="result-label">Dose por Peso Corporal</span>
                  <div className="tooltip">
                    <button className="info-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <span className="tooltip-text">
                      Valor da Dose do Protocolo
                    </span>
                  </div>
                </div>
                <div className="result-value">{mgKgResult} mg/kg</div>
              </motion.div>
            )}
            
            {/* Resultado SC1 - Mostrar apenas para tipo SC */}
            {tipoProtocolo === 'sc' && sc1Result && (
              <motion.div className="result-item result-highlight" variants={itemVariants}>
                <div className="result-header">
                  <span className="result-label">Superfície Corporal (SC1)</span>
                  <div className="tooltip">
                    <button className="info-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <span className="tooltip-text">
                      Fórmula: SC (m²) = (Peso em kg x 4) + 7 / (Peso em kg + 90)
                    </span>
                  </div>
                </div>
                <div className="result-value">{sc1Result} m²</div>
              </motion.div>
            )}
            
            {/* Resultado SC2 - Mostrar apenas para tipo SC e se altura for fornecida */}
            {tipoProtocolo === 'sc' && sc2Result && (
              <motion.div className="result-item" variants={itemVariants}>
                <div className="result-header">
                  <span className="result-label">Superfície Corporal (SC2)</span>
                  <div className="tooltip">
                    <button className="info-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <span className="tooltip-text">
                      Fórmula: SC (m²) = (Peso (kg)^0,5378) x (Altura (cm)^0,3964) x 0,024265
                    </span>
                  </div>
                </div>
                <div className="result-value">{sc2Result} m²</div>
              </motion.div>
            )}
            
            {/* Resultado AUC - Mostrar apenas para tipo Carboplatina */}
            {tipoProtocolo === 'carboplatina' && aucResult && (
              <motion.div className="result-item result-highlight" variants={itemVariants}>
                <div className="result-header">
                  <span className="result-label">Área Sob a Curva (AUC)</span>
                  <div className="tooltip">
                    <button className="info-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <span className="tooltip-text">
                      Fórmula: AUC = ((((Peso x (140 - Idade)) / (72 x Creatinina)) x Sexo) + 25)
                      <br />
                      Onde: Sexo = 1 para feminino e 2 para masculino
                    </span>
                  </div>
                </div>
                <div className="result-value">{aucResult}</div>
              </motion.div>
            )}
            
            {/* Faixa de Dose movida para a seção de Resultados */}
            {renderDoseRange()}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CalculadoraPaciente;