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
  const [dosePlanejada, setDosePlanejada] = useState(''); // Renomeado de dosePrescrita
  const [doseProtocolo, setDoseProtocolo] = useState('');
  
  // Estados para armazenar os resultados
  const [aucResult, setAucResult] = useState('');
  const [sc1Result, setSc1Result] = useState('');
  const [sc2Result, setSc2Result] = useState('');
  const [mgKgResult, setMgKgResult] = useState('');
  const [doseCalculada, setDoseCalculada] = useState('');
  const [doseCalculadaSC2, setDoseCalculadaSC2] = useState(''); // Novo estado para a dose SC2
  
  // Limites para SC1
  const [limiteInferior5, setLimiteInferior5] = useState('');
  const [limiteSuperior5, setLimiteSuperior5] = useState('');
  const [limiteInferior10, setLimiteInferior10] = useState('');
  const [limiteSuperior10, setLimiteSuperior10] = useState('');
  
  // Novos limites para SC2
  const [limiteInferior5SC2, setLimiteInferior5SC2] = useState('');
  const [limiteSuperior5SC2, setLimiteSuperior5SC2] = useState('');
  const [limiteInferior10SC2, setLimiteInferior10SC2] = useState('');
  const [limiteSuperior10SC2, setLimiteSuperior10SC2] = useState('');
  
  const [dentroFaixa, setDentroFaixa] = useState(null);
  const [percentualVariacao, setPercentualVariacao] = useState(null);
  
  // Novos estados para verificação da dose médica em relação à SC2
  const [dentroFaixaSC2, setDentroFaixaSC2] = useState(null);
  const [percentualVariacaoSC2, setPercentualVariacaoSC2] = useState(null);
  
  const [showAmpolaEffect, setShowAmpolaEffect] = useState(false);
  
  // Estado para controlar a animação dos resultados
  const [showResults, setShowResults] = useState(false);
  
  // Estado para controlar a animação de explosão da ampola
  const [isExploding, setIsExploding] = useState(false);
  
  // Estado para controlar a animação de flip do card
  const [isFlipped, setIsFlipped] = useState(false);

  const [activeTab, setActiveTab] = useState('sc1');

  const [rangeType, setRangeType] = useState(null); // Para mg/kg e carboplatina
  const [rangeTypeSC1, setRangeTypeSC1] = useState(null); // Para SC1
  const [rangeTypeSC2, setRangeTypeSC2] = useState(null); // Para SC2
  
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
  
  // Efeito para ajustar automaticamente a altura do card de resultados
  useEffect(() => {
    // Este efeito monitora quando os resultados aparecem e ajusta a altura do container
    if (showResults && isFlipped) {
      // Espera um pouco para que os resultados sejam renderizados
      setTimeout(() => {
        // Encontra os elementos
        const flipContainer = document.querySelector('.calc-card-flip-container');
        const flipper = document.querySelector('.calc-card-flipper');
        const backCard = document.querySelector('.calc-card-back');
        
        if (flipContainer && flipper && backCard) {
          // Adiciona classes para permitir expansão
          flipContainer.classList.add('expanded');
          flipper.classList.add('expanded');
          
          // Ajusta a altura baseada no conteúdo da parte de trás
          const contentHeight = backCard.scrollHeight;
          flipContainer.style.height = `${contentHeight}px`;
          flipper.style.height = `${contentHeight}px`;
        }
      }, 500); // Espera meio segundo após a renderização
    }
  }, [showResults, isFlipped]);
  
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
  
  // Função para arredondar para o 0.5 mais próximo para cima
  const roundToHalf = (num) => {
    return Math.ceil(num * 2) / 2;
  };
  
  // Função para calcular a porcentagem de variação
  const calcularPorcentagemVariacao = (doseCalculadaNum, doseCalculadaMedNum) => {
    if (doseCalculadaNum === 0) return 0;
    return ((doseCalculadaMedNum - doseCalculadaNum) / doseCalculadaNum) * 100;
  };
  
  // Função para calcular todos os resultados
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
    const dosePlanejadaNum = parseFloat(dosePlanejada); // Dose planejada
    const doseProtocoloNum = parseFloat(doseProtocolo);
    
    // Limpar animação anterior de resultados
    setShowResults(false);
    setIsFlipped(false);
    
    // Timeout para permitir animação de "fade-in"
    setTimeout(() => {
      // Resetar todos os resultados
      setAucResult('');
      setSc1Result('');
      setSc2Result('');
      setMgKgResult('');
      setDoseCalculada('');
      setDoseCalculadaSC2('');
      
      // Limites para SC1
      setLimiteInferior5('');
      setLimiteSuperior5('');
      setLimiteInferior10('');
      setLimiteSuperior10('');
      
      // Limites para SC2
      setLimiteInferior5SC2('');
      setLimiteSuperior5SC2('');
      setLimiteInferior10SC2('');
      setLimiteSuperior10SC2('');
      
      setDentroFaixa(null);
      setPercentualVariacao(null);
      setDentroFaixaSC2(null);
      setPercentualVariacaoSC2(null);
      
      // Calcular com base no tipo de protocolo
      switch (tipoProtocolo) {
        case 'mgkg':
          // Calcular dose baseada em mg/kg e arredondar para 0.5 mais próximo para cima
          const doseMgKg = roundToHalf(doseProtocoloNum * pesoNum);
          
          // Calcular limites de +/-5% e +/-10%
          const inferiorMgKg5 = doseMgKg * 0.95;
          const superiorMgKg5 = doseMgKg * 1.05;
          const inferiorMgKg10 = doseMgKg * 0.90;
          const superiorMgKg10 = doseMgKg * 1.10;
          
          // Verificação de debug - remover em produção
          console.log('Dados mg/kg:');
          console.log('Peso:', pesoNum, 'kg');
          console.log('Dose do Protocolo:', doseProtocoloNum, 'mg/kg');
          console.log('Dose Planejada:', dosePlanejadaNum, 'mg');
          console.log('Dose Calculada:', doseMgKg, 'mg');
          console.log('Limites 5%:', inferiorMgKg5, 'a', superiorMgKg5, 'mg');
          console.log('Limites 10%:', inferiorMgKg10, 'a', superiorMgKg10, 'mg');
          
          // Verificar se a dose planejada pelo médico está dentro da faixa
          // Apenas fazer a verificação se a dose foi fornecida
          let dentroFaixaMgKg = null;
          let percentualVariacaoMgKg = null;
          let rangeTypeMgKg = null; // Novo
          
          if (!isNaN(dosePlanejadaNum) && dosePlanejadaNum > 0) {
            // Modificada para usar limites de ±10% para determinar dentro/fora da faixa
            dentroFaixaMgKg = dosePlanejadaNum >= inferiorMgKg10 && dosePlanejadaNum <= superiorMgKg10;
            
            // Determinar o tipo de faixa
            if (dosePlanejadaNum >= inferiorMgKg5 && dosePlanejadaNum <= superiorMgKg5) {
              rangeTypeMgKg = "ideal"; // Verde - dentro de ±5%
            } else if (dentroFaixaMgKg) {
              rangeTypeMgKg = "acceptable"; // Amarelo - entre ±5% e ±10%
            } else {
              rangeTypeMgKg = "outOfRange"; // Vermelho - fora de ±10%
            }
            
            percentualVariacaoMgKg = calcularPorcentagemVariacao(doseMgKg, dosePlanejadaNum);
            console.log('Dentro da faixa?', dentroFaixaMgKg);
            console.log('Percentual de variação:', percentualVariacaoMgKg, '%');
            console.log('Tipo de faixa:', rangeTypeMgKg);
          }
          
          // Armazena os resultados formatados para exibição
          setDoseCalculada(doseMgKg.toFixed(2));
          setLimiteInferior5(inferiorMgKg5.toFixed(2));
          setLimiteSuperior5(superiorMgKg5.toFixed(2));
          setLimiteInferior10(inferiorMgKg10.toFixed(2));
          setLimiteSuperior10(superiorMgKg10.toFixed(2));
          setDentroFaixa(dentroFaixaMgKg);
          setPercentualVariacao(percentualVariacaoMgKg);
          setRangeType(rangeTypeMgKg); // Novo - armazena o tipo de faixa
          
          // Calcular mg/kg com o resultado do cálculo, não apenas o valor do protocolo
          setMgKgResult(doseProtocoloNum.toFixed(2));
          break;
        
          case 'sc':
            // Calcular SC1
            const sc1 = calculateSC1(pesoNum);
            const sc1Num = parseFloat(sc1); // Garantir que é numérico
            setSc1Result(sc1);
            
            // Calcular dose baseada em SC1 e arredondar para 0.5 mais próximo para cima
            const doseSC1 = roundToHalf(doseProtocoloNum * sc1Num);
            
            // Calcular limites de +/-5% e +/-10% para SC1
            const inferiorSC1_5 = doseSC1 * 0.95;
            const superiorSC1_5 = doseSC1 * 1.05;
            const inferiorSC1_10 = doseSC1 * 0.90;
            const superiorSC1_10 = doseSC1 * 1.10;
            
            // Calcular SC2 (se altura estiver disponível)
            let sc2Num = 0;
            let doseSC2 = 0;
            let inferiorSC2_5 = 0;
            let superiorSC2_5 = 0; 
            let inferiorSC2_10 = 0;
            let superiorSC2_10 = 0;
            let dentroFaixaSC2Val = null;
            let percentualVariacaoSC2Val = null;
            let rangeTypeSC2Val = null; // Novo
            
            if (!isNaN(alturaNum) && alturaNum > 0) {
              const sc2 = calculateSC2(pesoNum, alturaNum);
              sc2Num = parseFloat(sc2);
              setSc2Result(sc2);
              
              // Calcular dose baseada em SC2 e arredondar para 0.5 mais próximo para cima
              doseSC2 = roundToHalf(doseProtocoloNum * sc2Num);
              setDoseCalculadaSC2(doseSC2.toFixed(2));
              
              // Calcular limites de +/-5% e +/-10% para SC2
              inferiorSC2_5 = doseSC2 * 0.95;
              superiorSC2_5 = doseSC2 * 1.05;
              inferiorSC2_10 = doseSC2 * 0.90;
              superiorSC2_10 = doseSC2 * 1.10;
              
              // Armazenar limites para SC2
              setLimiteInferior5SC2(inferiorSC2_5.toFixed(2));
              setLimiteSuperior5SC2(superiorSC2_5.toFixed(2));
              setLimiteInferior10SC2(inferiorSC2_10.toFixed(2));
              setLimiteSuperior10SC2(superiorSC2_10.toFixed(2));
              
              // Verificar se a dose planejada pelo médico está dentro da faixa para SC2
              if (!isNaN(dosePlanejadaNum) && dosePlanejadaNum > 0) {
                // Modificada para usar limites de ±10% para determinar dentro/fora da faixa
                dentroFaixaSC2Val = dosePlanejadaNum >= inferiorSC2_10 && dosePlanejadaNum <= superiorSC2_10;
                
                // Determinar o tipo de faixa para SC2
                if (dosePlanejadaNum >= inferiorSC2_5 && dosePlanejadaNum <= superiorSC2_5) {
                  rangeTypeSC2Val = "ideal"; // Verde - dentro de ±5%
                } else if (dentroFaixaSC2Val) {
                  rangeTypeSC2Val = "acceptable"; // Amarelo - entre ±5% e ±10%
                } else {
                  rangeTypeSC2Val = "outOfRange"; // Vermelho - fora de ±10%
                }
                
                percentualVariacaoSC2Val = calcularPorcentagemVariacao(doseSC2, dosePlanejadaNum);
                setDentroFaixaSC2(dentroFaixaSC2Val);
                setPercentualVariacaoSC2(percentualVariacaoSC2Val);
                setRangeTypeSC2(rangeTypeSC2Val); // Novo
                
                console.log('Dentro da faixa SC2?', dentroFaixaSC2Val);
                console.log('Percentual de variação SC2:', percentualVariacaoSC2Val, '%');
                console.log('Tipo de faixa SC2:', rangeTypeSC2Val);
              }
            }
            
            // Verificação de debug - remover em produção
            console.log('Dados SC:');
            console.log('SC1:', sc1Num, 'm²');
            console.log('SC2:', sc2Num, 'm²');
            console.log('Dose do Protocolo:', doseProtocoloNum, 'mg/m²');
            console.log('Dose Planejada:', dosePlanejadaNum, 'mg');
            console.log('Dose Calculada SC1:', doseSC1, 'mg');
            console.log('Dose Calculada SC2:', doseSC2, 'mg');
            console.log('Limites SC1 5%:', inferiorSC1_5, 'a', superiorSC1_5, 'mg');
            console.log('Limites SC1 10%:', inferiorSC1_10, 'a', superiorSC1_10, 'mg');
            console.log('Limites SC2 5%:', inferiorSC2_5, 'a', superiorSC2_5, 'mg');
            console.log('Limites SC2 10%:', inferiorSC2_10, 'a', superiorSC2_10, 'mg');
            
            // Verificar se a dose planejada pelo médico está dentro da faixa para SC1
            let dentroFaixaSC1 = null;
            let percentualVariacaoSC1 = null;
            let rangeTypeSC1Val = null; // Novo
            
            if (!isNaN(dosePlanejadaNum) && dosePlanejadaNum > 0) {
              // Modificada para usar limites de ±10% para determinar dentro/fora da faixa
              dentroFaixaSC1 = dosePlanejadaNum >= inferiorSC1_10 && dosePlanejadaNum <= superiorSC1_10;
              
              // Determinar o tipo de faixa para SC1
              if (dosePlanejadaNum >= inferiorSC1_5 && dosePlanejadaNum <= superiorSC1_5) {
                rangeTypeSC1Val = "ideal"; // Verde - dentro de ±5%
              } else if (dentroFaixaSC1) {
                rangeTypeSC1Val = "acceptable"; // Amarelo - entre ±5% e ±10%
              } else {
                rangeTypeSC1Val = "outOfRange"; // Vermelho - fora de ±10%
              }
              
              percentualVariacaoSC1 = calcularPorcentagemVariacao(doseSC1, dosePlanejadaNum);
              console.log('Dentro da faixa SC1?', dentroFaixaSC1);
              console.log('Percentual de variação SC1:', percentualVariacaoSC1, '%');
              console.log('Tipo de faixa SC1:', rangeTypeSC1Val);
            }
            
            // Armazena os resultados formatados para exibição
            setDoseCalculada(doseSC1.toFixed(2));
            setLimiteInferior5(inferiorSC1_5.toFixed(2));
            setLimiteSuperior5(superiorSC1_5.toFixed(2));
            setLimiteInferior10(inferiorSC1_10.toFixed(2));
            setLimiteSuperior10(superiorSC1_10.toFixed(2));
            setDentroFaixa(dentroFaixaSC1);
            setPercentualVariacao(percentualVariacaoSC1);
            setRangeTypeSC1(rangeTypeSC1Val); // Novo
            break;
        
          case 'carboplatina':
            // Calcular AUC
            const auc = calculateAUC(pesoNum, idadeNum, creatininaNum, sexo);
            const aucNum = parseFloat(auc); // Garantir que é numérico
            setAucResult(auc);
            
            // Calcular dose baseada em AUC e arredondar para 0.5 mais próximo para cima
            const doseAUC = roundToHalf(doseProtocoloNum * aucNum);
            
            // Calcular limites de +/-5% e +/-10%
            const inferiorAUC5 = doseAUC * 0.95;
            const superiorAUC5 = doseAUC * 1.05;
            const inferiorAUC10 = doseAUC * 0.90;
            const superiorAUC10 = doseAUC * 1.10;
            
            // Verificação de debug - remover em produção
            console.log('Dados Carboplatina:');
            console.log('AUC:', aucNum);
            console.log('AUC Alvo:', doseProtocoloNum);
            console.log('Dose Planejada:', dosePlanejadaNum, 'mg'); // Atualizado
            console.log('Dose Calculada:', doseAUC, 'mg');
            console.log('Limites 5%:', inferiorAUC5, 'a', superiorAUC5, 'mg');
            console.log('Limites 10%:', inferiorAUC10, 'a', superiorAUC10, 'mg');
            
            // Verificar se a dose planejada pelo médico está dentro da faixa
            let dentroFaixaAUC = null;
            let percentualVariacaoAUC = null;
            let rangeTypeAUC = null; // Novo
            
            if (!isNaN(dosePlanejadaNum) && dosePlanejadaNum > 0) {
              // Modificada para usar limites de ±10% para determinar dentro/fora da faixa
              dentroFaixaAUC = dosePlanejadaNum >= inferiorAUC10 && dosePlanejadaNum <= superiorAUC10;
              
              // Determinar o tipo de faixa
              if (dosePlanejadaNum >= inferiorAUC5 && dosePlanejadaNum <= superiorAUC5) {
                rangeTypeAUC = "ideal"; // Verde - dentro de ±5%
              } else if (dentroFaixaAUC) {
                rangeTypeAUC = "acceptable"; // Amarelo - entre ±5% e ±10%
              } else {
                rangeTypeAUC = "outOfRange"; // Vermelho - fora de ±10%
              }
              
              percentualVariacaoAUC = calcularPorcentagemVariacao(doseAUC, dosePlanejadaNum);
              console.log('Dentro da faixa?', dentroFaixaAUC);
              console.log('Percentual de variação:', percentualVariacaoAUC, '%');
              console.log('Tipo de faixa:', rangeTypeAUC);
            }
            
            // Armazena os resultados formatados para exibição
            setDoseCalculada(doseAUC.toFixed(2));
            setLimiteInferior5(inferiorAUC5.toFixed(2));
            setLimiteSuperior5(superiorAUC5.toFixed(2));
            setLimiteInferior10(inferiorAUC10.toFixed(2));
            setLimiteSuperior10(superiorAUC10.toFixed(2));
            setDentroFaixa(dentroFaixaAUC);
            setPercentualVariacao(percentualVariacaoAUC);
            setRangeType(rangeTypeAUC); // Novo - armazena o tipo de faixa
            break;
      }
      
      // Ativa a animação de flip
      setIsFlipped(true);
      
      // Depois do flip, mostrar os resultados
      setTimeout(() => {
        setShowResults(true);
        
        toast({
          title: "Cálculos realizados",
          description: "Os resultados foram calculados com sucesso.",
          variant: "success"
        });
      }, 400); // Tempo para completar metade da animação de flip
    }, 10);
  };
  
  // Função para limpar todos os campos
  const handleClear = (showNotification = true) => {
    setPeso('');
    setAltura('');
    setIdade('');
    setSexo('');
    setCreatinina('');
    setDosePlanejada('');
    setDoseProtocolo('');
    setAucResult('');
    setSc1Result('');
    setSc2Result('');
    setMgKgResult('');
    setDoseCalculada('');
    setDoseCalculadaSC2('');
    
    // Limites para SC1
    setLimiteInferior5('');
    setLimiteSuperior5('');
    setLimiteInferior10('');
    setLimiteSuperior10('');
    
    // Limites para SC2
    setLimiteInferior5SC2('');
    setLimiteSuperior5SC2('');
    setLimiteInferior10SC2('');
    setLimiteSuperior10SC2('');
    
    setDentroFaixa(null);
    setPercentualVariacao(null);
    setDentroFaixaSC2(null);
    setPercentualVariacaoSC2(null);
    
    // Limpar os novos estados de tipo de faixa
    setRangeType(null);
    setRangeTypeSC1(null);
    setRangeTypeSC2(null);
    
    setShowResults(false);
    setIsFlipped(false);
    
    // Reset as alturas
    const flipContainer = document.querySelector('.calc-card-flip-container');
    const flipper = document.querySelector('.calc-card-flipper');
    
    if (flipContainer && flipper) {
      // Remove classes de expansão
      flipContainer.classList.remove('expanded');
      flipper.classList.remove('expanded');
      
      // Reseta para altura mínima
      flipContainer.style.height = '';
      flipper.style.height = '';
    }
    
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
  
  // Função para iniciar a explosão da ampola
  const handleStartExploding = () => {
    if (!isExploding) {
      setIsExploding(true);
    }
  };
  
  // Função para finalizar a explosão da ampola
  const handleEndExploding = () => {
    setIsExploding(false);
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
  
  const ampolaVariants = {
    hidden: { scale: 1, opacity: 0 },
    visible: { 
      scale: [1, 1.5, 2], 
      opacity: [0, 1, 0],
      transition: { 
        duration: 0.8,
        times: [0, 0.3, 1]
      }
    }
  };
  
  const flaskVariants = {
    idle: { rotate: 0 },
    wobble: {
      rotate: [0, -5, 5, -3, 3, 0],
      transition: { 
        duration: 0.5,
        times: [0, 0.2, 0.4, 0.6, 0.8, 1] 
      }
    }
  };
  
  // Variantes para animação de flip do card
  const flipVariants = {
    front: {
      rotateY: 0,
      transition: {
        duration: 0.8,
        ease: "easeInOut"
      }
    },
    back: {
      rotateY: 180,
      transition: {
        duration: 0.8,
        ease: "easeInOut"
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
          <label htmlFor="dosePlanejada" className="form-label">Dose Planejada/Prescrita</label>
          <input 
            type="number"
            id="dosePlanejada"
            value={dosePlanejada}
            onChange={(e) => setDosePlanejada(e.target.value)}
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
        // Para SC, reorganizar campos com altura acima da dose
        return (
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
                placeholder="Ex: 100"
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="dosePlanejada" className="form-label">Dose Planejada/Prescrita</label>
              <input 
                type="number"
                id="dosePlanejada"
                value={dosePlanejada}
                onChange={(e) => setDosePlanejada(e.target.value)}
                className="form-input"
                min="0"
                step="0.01"
                placeholder="Ex: 200"
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
  
  // Renderização dos resultados SC1 e SC2 lado a lado
  const renderSCResults = () => {
    if (tipoProtocolo !== 'sc' || !sc1Result) return null;
    
    return (
      <div className="sc-results-container">
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
        
        {sc2Result && (
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
      </div>
    );
  };

  // Função para calcular a posição do indicador na faixa de dose
  const calcularPosicaoIndicador = (dosePlanejadaNum, doseCalculadaNum, limiteInferior10Num, limiteSuperior10Num) => {
    // Se não tiver todos os valores necessários, retorna posição padrão (centro)
    if (isNaN(dosePlanejadaNum) || isNaN(doseCalculadaNum) || 
        isNaN(limiteInferior10Num) || isNaN(limiteSuperior10Num)) {
      return 50;
    }
    
    // Calcula a largura total da faixa (de -10% a +10%)
    const rangeTotal = limiteSuperior10Num - limiteInferior10Num;
    
    if (rangeTotal <= 0) {
      return 50; // Evitar divisão por zero
    }
    
    // Calcula a posição relativa da dose na faixa
    let posicao = ((dosePlanejadaNum - limiteInferior10Num) / rangeTotal) * 100;
    
    // Limita a posição entre 0 e 100%
    posicao = Math.max(0, Math.min(100, posicao));
    
    return posicao;
  };
  
  // Renderização genérica da faixa de dose
  const renderDoseRangeGeneric = (
    doseLabel,
    doseCaculadaValue,
    limiteInferior5Value,
    limiteSuperior5Value,
    limiteInferior10Value,
    limiteSuperior10Value,
    dentroFaixaValue,
    percentualVariacaoValue,
    rangeTypeValue // Novo parâmetro
  ) => {
    if (!doseCaculadaValue) return null;
    
    // Determinar classes CSS baseado no tipo de faixa
    let rangeClass = "";
    if (rangeTypeValue === "ideal") {
      rangeClass = "ideal-range";
    } else if (rangeTypeValue === "acceptable") {
      rangeClass = "acceptable-range";
    } else if (rangeTypeValue === "outOfRange") {
      rangeClass = "out-of-range";
    }
    
    // Converter valores para cálculos
    const doseCalculadaNum = parseFloat(doseCaculadaValue);
    const dosePlanejadaNum = parseFloat(dosePlanejada);
    const limiteInferior10Num = parseFloat(limiteInferior10Value);
    const limiteSuperior10Num = parseFloat(limiteSuperior10Value);
    
    // Calcular posição do indicador
    const posicaoIndicador = calcularPosicaoIndicador(
      dosePlanejadaNum, 
      doseCalculadaNum, 
      limiteInferior10Num, 
      limiteSuperior10Num
    );
    
    return (
      <motion.div 
        className={`result-item dose-range-result ${rangeClass}`}
        variants={itemVariants}
        onMouseEnter={handleStartExploding}
      >
        <div className="result-header">
          <span className="result-label">{doseLabel}</span>
          {percentualVariacaoValue !== null && (
            <div className="variation-badge">
              <span className={
                Math.abs(percentualVariacaoValue) <= 5 ? "ideal" : 
                Math.abs(percentualVariacaoValue) <= 10 ? "acceptable" : 
                "out-of-range"
              }>
                {percentualVariacaoValue > 0 ? "+" : ""}{percentualVariacaoValue.toFixed(2)}%
              </span>
            </div>
          )}
          
          
        </div>
        
        <div className="dose-range-display">
          <div className="dose-values-container">
            <div className="dose-value primary">
              <span className="dose-label">Dose Calculada:</span> 
              <span className="dose-number">{doseCaculadaValue} mg</span>
            </div>
            
            {dosePlanejada && (
              <div className={`dose-value med ${rangeClass}`}>
                <span className="dose-label">Dose Planejada/Prescrita:</span> 
                <span className="dose-number">{dosePlanejada} mg</span>
              </div>
            )}
          </div>
          
          <div className="dose-range-container">
            {/* Componente DoseBurst - Container para o efeito de ampola */}
            <div className="dose-burst-container">
              {/* Efeito de explosão - mais intenso para fora da faixa */}
              <AnimatePresence>
                {isExploding && (
                  <motion.div 
                    className={`dose-explosion-effect ${rangeTypeValue === "outOfRange" ? "explosion-extreme" : ""}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: rangeTypeValue === "outOfRange" ? [0, 2, 2.5] : [0, 1.5, 2], 
                      opacity: rangeTypeValue === "outOfRange" ? [0, 0.9, 0] : [0, 0.7, 0] 
                    }}
                    transition={{
                      duration: rangeTypeValue === "outOfRange" ? 0.6 : 0.8,
                      times: rangeTypeValue === "outOfRange" ? [0, 0.3, 1] : [0, 0.4, 1]
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    onAnimationComplete={handleEndExploding}
                  />
                )}
              </AnimatePresence>
              
              {/* Ampola com animação */}
              <motion.div 
                className="dose-flask"
                animate={isExploding ? "wobble" : "idle"}
                variants={flaskVariants}
              >
                <svg width="40" height="70" viewBox="0 0 40 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Conteúdo líquido animado - cor baseada no tipo de faixa */}
                  <path className="flask-liquid" d="M12 45C12 40 10 40 10 35V30h20v5c0 5 -2 5 -2 10 C28 55 22 58 20 58 C18 58 12 55 12 45z" 
                    fill={
                      rangeTypeValue === "outOfRange" ? "rgba(242, 107, 107, 0.3)" : 
                      rangeTypeValue === "acceptable" ? "rgba(224, 162, 67, 0.3)" : 
                      "rgba(140, 179, 105, 0.3)"
                    } />
                  
                  {/* Bolhas animadas */}
                  <circle className="bubble bubble1" cx="16" cy="43" r="2" 
                    fill={
                      rangeTypeValue === "outOfRange" ? "rgba(242, 107, 107, 0.6)" : 
                      rangeTypeValue === "acceptable" ? "rgba(224, 162, 67, 0.6)" : 
                      "rgba(140, 179, 105, 0.6)"
                    } />
                  <circle className="bubble bubble2" cx="20" cy="46" r="3" 
                    fill={
                      rangeTypeValue === "outOfRange" ? "rgba(242, 107, 107, 0.5)" : 
                      rangeTypeValue === "acceptable" ? "rgba(224, 162, 67, 0.5)" : 
                      "rgba(140, 179, 105, 0.5)"
                    } />
                  <circle className="bubble bubble3" cx="24" cy="40" r="1.5" 
                    fill={
                      rangeTypeValue === "outOfRange" ? "rgba(242, 107, 107, 0.7)" : 
                      rangeTypeValue === "acceptable" ? "rgba(224, 162, 67, 0.7)" : 
                      "rgba(140, 179, 105, 0.7)"
                    } />
                  
                  {/* Contorno da ampola */}
                  <path className="flask-outline" d="M15 10V30C15 40 10 45 10 50C10 55 15 60 20 60C25 60 30 55 30 50C30 45 25 40 25 30V10M10 10H30M16 5H24" 
                    stroke={
                      rangeTypeValue === "outOfRange" ? "#f26b6b" : 
                      rangeTypeValue === "acceptable" ? "#e0a243" : 
                      "#8cb369"
                    }
                    strokeWidth="2" 
                    strokeLinecap="round"/>
                </svg>
              </motion.div>
            </div>
            
            {/* Resto dos elementos da faixa de dose */}
            <div className="dose-range-line"></div>
            
            {/* Marcações na faixa */}
            <div className="dose-range-markers">
              <div className="marker-line marker-10-minus">
                <span className="marker-label">-10%</span>
              </div>
              <div className="marker-line marker-5-minus">
                <span className="marker-label">-5%</span>
              </div>
              <div className="marker-line marker-center">
                <span className="marker-label">Dose</span>
              </div>
              <div className="marker-line marker-5-plus">
                <span className="marker-label">+5%</span>
              </div>
              <div className="marker-line marker-10-plus">
                <span className="marker-label">+10%</span>
              </div>
            </div>
            
            {/* Indicador da Dose Planejada/Prescrita */}
            {dosePlanejada && (
              <div 
                className={`dose-med-indicator ${rangeClass}`}
                style={{ left: `${posicaoIndicador}%` }}
              >
                {/* Substitui a bolinha por um ícone de explosão quando fora da faixa */}
                {rangeTypeValue === "outOfRange" ? (
                  <div className="dose-med-explosion" title="Dose Planejada/Prescrita">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#f26b6b">
                      <path d="M16.54 12.18l2.47-5.27-5.95 1.56L11.8 3 8.89 9.45 3 7.46l3.89 4.73L2.46 17l6-1.62L12.13 21l2.4-5.32L21 16.88z"/>
                      <path d="M10 8.5l.5 1.5h1.5l-1 1 .5 1.5-1.5-1-1.5 1 .5-1.5-1-1H9z" fill="#fff"/>
                    </svg>
                  </div>
                ) : (
                  <div className="dose-med-pointer" title="Dose Planejada/Prescrita"></div>
                )}
                <div className="dose-med-label">{dosePlanejada} mg</div>
                
                {/* O restante do código do tooltip permanece igual */}
                <div className="tooltip-wrapper">
                  {/* ... conteúdo do tooltip ... */}
                </div>
              </div>
            )}
            
            {/* Valores da faixa */}
            <div className="dose-range-values">
              <div className="dose-range-value">{limiteInferior10Value} mg</div>
              <div className="dose-range-value">{limiteInferior5Value} mg</div>
              <div className="dose-range-value">{doseCaculadaValue} mg</div>
              <div className="dose-range-value">{limiteSuperior5Value} mg</div>
              <div className="dose-range-value">{limiteSuperior10Value} mg</div>
            </div>
          </div>
          
          {/* Mensagem de status - modificada para usar o limite de ±10% */}
          {dentroFaixaValue !== null && dosePlanejada && (
            <div className={`dose-status ${dentroFaixaValue ? 'dose-status-ok' : 'dose-status-warning'}`}>
              {dentroFaixaValue ? 'Dose Dentro da Faixa' : 'Dose Fora da Faixa'}
              {percentualVariacaoValue !== null && (
                <span className="dose-status-detail">
                  {percentualVariacaoValue > 0 
                    ? ` (${percentualVariacaoValue.toFixed(2)}% acima)` 
                    : percentualVariacaoValue < 0 
                      ? ` (${Math.abs(percentualVariacaoValue).toFixed(2)}% abaixo)` 
                      : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // Substitua o código dentro da função renderDoseRangeTabs() pela versão abaixo
  // O único trecho modificado são os ícones SVG dentro de cada botão de aba

  const renderDoseRangeTabs = () => {
    if (tipoProtocolo !== 'sc' || !doseCalculada) return null;
    
    // Certifica-se de que não mostramos as abas se SC2 não estiver disponível
    if (!doseCalculadaSC2) {
      return renderDoseRangeGeneric(
        "Faixa de Dose (SC1)",
        doseCalculada,
        limiteInferior5,
        limiteSuperior5,
        limiteInferior10,
        limiteSuperior10,
        dentroFaixa,
        percentualVariacao,
        rangeTypeSC1 // Novo parâmetro
      );
    }
    
    return (
      <div className="dose-range-tabs-container">
        <div className="dose-range-tabs">
          <button 
            className={`dose-range-tab ${activeTab === 'sc1' ? 'active' : ''}`}
            onClick={() => setActiveTab('sc1')}
          >
            <span className="tab-icon">
              {/* Ícone de pílula/comprimido para SC1 */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon-svg">
                <path d="m12 2-5.5 5.5a11 11 0 0 0 11 11l5.5-5.5a11 11 0 0 0-11-11z"></path>
                <path d="m12 8-4 4"></path>
              </svg>
            </span>
            Superfície Corporal (SC1)
          </button>
          <button 
            className={`dose-range-tab ${activeTab === 'sc2' ? 'active' : ''}`}
            onClick={() => setActiveTab('sc2')}
          >
            <span className="tab-icon">
              {/* Ícone de frasco de medicamento para SC2 */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon-svg">
                <path d="M9 2v3.4a3 3 0 0 1-.6 1.8L6 10m8-8v3.4a3 3 0 0 0 .6 1.8L17 10"></path>
                <path d="M8 10h8l-1 11H9Z"></path>
              </svg>
            </span>
            Superfície Corporal (SC2)
          </button>
        </div>
        
        <div className="dose-range-tab-content">
          {activeTab === 'sc1' && (
            <div className="dose-range-tab-pane" data-type="sc1">
              {renderDoseRangeGeneric(
                "Faixa de Dose (SC1)",
                doseCalculada,
                limiteInferior5,
                limiteSuperior5,
                limiteInferior10,
                limiteSuperior10,
                dentroFaixa,
                percentualVariacao,
                rangeTypeSC1 // Novo parâmetro
              )}
            </div>
          )}
          
          {activeTab === 'sc2' && (
            <div className="dose-range-tab-pane" data-type="sc2">
              {renderDoseRangeGeneric(
                "Faixa de Dose (SC2)",
                doseCalculadaSC2,
                limiteInferior5SC2,
                limiteSuperior5SC2,
                limiteInferior10SC2,
                limiteSuperior10SC2,
                dentroFaixaSC2,
                percentualVariacaoSC2,
                rangeTypeSC2 // Novo parâmetro
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderização da faixa de dose para SC1
  const renderDoseRangeSC1 = () => {
    if (tipoProtocolo !== 'sc' || !doseCalculada) return null;
    
    return renderDoseRangeGeneric(
      "Faixa de Dose (SC1)",
      doseCalculada,
      limiteInferior5,
      limiteSuperior5,
      limiteInferior10,
      limiteSuperior10,
      dentroFaixa,
      percentualVariacao,
      rangeTypeSC1 // Novo parâmetro
    );
  };
  
  // Renderização da faixa de dose para SC2
  const renderDoseRangeSC2 = () => {
    if (tipoProtocolo !== 'sc' || !doseCalculadaSC2) return null;
    
    return renderDoseRangeGeneric(
      "Faixa de Dose (SC2)",
      doseCalculadaSC2,
      limiteInferior5SC2,
      limiteSuperior5SC2,
      limiteInferior10SC2,
      limiteSuperior10SC2,
      dentroFaixaSC2,
      percentualVariacaoSC2,
      rangeTypeSC2 // Novo parâmetro
    );
  };
  
  // Renderização da faixa de dose para outros protocolos (mg/kg ou carboplatina)
  const renderDoseRange = () => {
    if (tipoProtocolo === 'sc' || !doseCalculada) return null;
    
    return renderDoseRangeGeneric(
      "Faixa de Dose",
      doseCalculada,
      limiteInferior5,
      limiteSuperior5,
      limiteInferior10,
      limiteSuperior10,
      dentroFaixa,
      percentualVariacao,
      rangeType // Novo parâmetro
    );
  };
  
  // Renderização dos resultados
  // Substitua a função renderResults() atual por esta versão atualizada

const renderResults = () => {
  return (
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
      
      {/* Resultados de SC1 e SC2 - Mostrar lado a lado */}
      {renderSCResults()}
      
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
      
      {/* Faixa de Dose para protocolo mg/kg ou carboplatina */}
      {renderDoseRange()}
      
      {/* Para SC, mostrar as abas */}
      {renderDoseRangeTabs()}
    </motion.div>
  );
};
  
  // Renderização da mensagem de nenhum resultado
  const renderNoResults = () => {
    return (
      <div className="sr-no-selection-message">
        <p>Preencha os dados do paciente e clique em "Calcular" para visualizar os resultados.</p>
        <img src="/images/GifLogo.gif" alt="Logo" className="sr-loading-gif" />
      </div>
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
                  <p>Dose baseada no peso do paciente</p>
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
                  <p>Dose baseada na superfície corporal</p>
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
                  <p>Dose baseada na AUC</p>
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
                className="btn-calc btn-primary-calc"
                disabled={!peso}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="10" x2="12" y2="16"></line>
                  <line x1="9" y1="13" x2="15" y2="13"></line>
                </svg>
                Calcular
              </motion.button>
              <motion.button 
                type="button"
                onClick={() => handleClear()}
                className="btn-calc btn-secondary-calc"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Limpar
              </motion.button>
            </div>
          )}
        </motion.div>
        
        {/* Painel de resultados com efeito de flip */}
        <div className={`calc-card-flip-container ${isFlipped ? 'with-results' : ''}`}>
          <motion.div 
            className={`calc-card-flipper ${isFlipped ? 'is-flipped' : ''}`}
            initial={false}
            animate={isFlipped ? "back" : "front"}
            variants={flipVariants}
            style={{ perspective: 1000 }}
            onAnimationComplete={() => {
              // Callback executado após a animação completar
              if (isFlipped && showResults) {
                const backCard = document.querySelector('.calc-card-back');
                const flipContainer = document.querySelector('.calc-card-flip-container');
                const flipper = document.querySelector('.calc-card-flipper');
                
                if (backCard && flipContainer && flipper) {
                  // Ajusta altura imediatamente após a animação terminar
                  const height = Math.max(500, backCard.scrollHeight);
                  flipContainer.style.height = `${height}px`;
                  flipper.style.height = `${height}px`;
                }
              }
            }}
          >
            {/* Face frontal - Logo */}
            <div className="calc-card calc-card-front">
              <h3 className="calc-card-header">Resultados</h3>
              {renderNoResults()}
            </div>
            
            {/* Face traseira - Resultados */}
            <div className="calc-card calc-card-back">
              <h3 className="calc-card-header">
                Resultados
                {/* Tooltips específicos por tipo de protocolo */}
                {tipoProtocolo === 'mgkg' && (
                  <div className="tooltip header-tooltip">
                    <button className="info-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <span className="tooltip-text">
                      Cálculo baseado na dose por kg de peso corporal. A dose final é determinada multiplicando-se a dose do protocolo pelo peso do paciente em kg.
                    </span>
                  </div>
                )}
                {tipoProtocolo === 'sc' && (
                  <div className="tooltip header-tooltip">
                    <button className="info-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <span className="tooltip-text">
                      Cálculo baseado na superfície corporal. SC1: (Peso × 4 + 7) ÷ (Peso + 90). SC2: (Peso^0,5378) × (Altura^0,3964) × 0,024265.
                    </span>
                  </div>
                )}
                {tipoProtocolo === 'carboplatina' && (
                  <div className="tooltip header-tooltip">
                    <button className="info-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                    <span className="tooltip-text">
                      Cálculo baseado na AUC (Área Sob a Curva). Fórmula: AUC = ((((Peso × (140 - Idade)) ÷ (72 × Creatinina)) × Sexo) + 25), onde Sexo = 1 para feminino e 2 para masculino.
                    </span>
                  </div>
                )}
              </h3>
              {renderResults()}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default CalculadoraPaciente;