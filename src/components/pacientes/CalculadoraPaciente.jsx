import React, { useState, useEffect } from 'react';
import { usePatient } from '../../context/PatientContext';
import { Calculator } from 'lucide-react';

const CalculadoraPaciente = () => {
  const { calculateAUC, calculateSC1, calculateSC2, selectedPatient } = usePatient();
  
  // Estados para armazenar os valores dos campos
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [creatinina, setCreatinina] = useState('');
  const [dosePrescrita, setDosePrescrita] = useState('');
  
  // Estados para armazenar os resultados
  const [aucResult, setAucResult] = useState('');
  const [sc1Result, setSc1Result] = useState('');
  const [sc2Result, setSc2Result] = useState('');
  const [mgKgResult, setMgKgResult] = useState('');
  
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
  
  // Função para calcular todos os resultados
  const calculateResults = () => {
    // Converter strings para números
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);
    const idadeNum = parseInt(idade, 10);
    const creatininaNum = parseFloat(creatinina);
    const doseNum = parseFloat(dosePrescrita);
    
    // Validar entradas
    if (isNaN(pesoNum) || pesoNum <= 0) {
      alert('Por favor, insira um peso válido');
      return;
    }
    
    // Calcular AUC (se todos os valores necessários estiverem preenchidos)
    if (!isNaN(idadeNum) && !isNaN(creatininaNum) && sexo) {
      const auc = calculateAUC(pesoNum, idadeNum, creatininaNum, sexo);
      setAucResult(auc);
    }
    
    // Calcular SC1
    const sc1 = calculateSC1(pesoNum);
    setSc1Result(sc1);
    
    // Calcular SC2 (se altura estiver disponível)
    if (!isNaN(alturaNum) && alturaNum > 0) {
      const sc2 = calculateSC2(pesoNum, alturaNum);
      setSc2Result(sc2);
    }
    
    // Calcular mg/kg (se dose prescrita estiver disponível)
    if (!isNaN(doseNum) && doseNum > 0) {
      const mgKg = (doseNum / pesoNum).toFixed(2);
      setMgKgResult(mgKg);
    }
  };
  
  // Função para limpar todos os campos
  const handleClear = () => {
    setPeso('');
    setAltura('');
    setIdade('');
    setSexo('');
    setCreatinina('');
    setDosePrescrita('');
    setAucResult('');
    setSc1Result('');
    setSc2Result('');
    setMgKgResult('');
  };
  
  return (
    <div className="calculator-container">
      <div className="calculator-header">
        <h2><Calculator size={24} className="inline-icon" /> Calculadora de Dosagem</h2>
        <p className="calculator-intro">
          Calcule valores importantes para o tratamento, como Área Sob a Curva (AUC), 
          Superfície Corporal (SC) e Dose por Kg.
        </p>
      </div>
      
      <div className="calculator-grid">
        {/* Painel de entrada de dados */}
        <div className="calculator-card input-panel">
          <h3 className="calculator-title">Dados do Paciente</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="peso" className="form-label">Peso (kg)</label>
              <input 
                type="number"
                id="peso"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="form-input"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="altura" className="form-label">Altura (cm)</label>
              <input 
                type="number"
                id="altura"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="form-input"
                min="0"
                step="0.1"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="idade" className="form-label">Idade</label>
              <input 
                type="number"
                id="idade"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="form-input"
                min="0"
                step="1"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="sexo" className="form-label">Sexo</label>
              <select 
                id="sexo"
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                className="form-select"
              >
                <option value="">Selecione</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="creatinina" className="form-label">Creatinina</label>
              <input 
                type="number"
                id="creatinina"
                value={creatinina}
                onChange={(e) => setCreatinina(e.target.value)}
                className="form-input"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="dosePrescrita" className="form-label">Dose Prescrita</label>
              <input 
                type="number"
                id="dosePrescrita"
                value={dosePrescrita}
                onChange={(e) => setDosePrescrita(e.target.value)}
                className="form-input"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="button-group">
            <button 
              type="button"
              onClick={calculateResults}
              className="btn btn-primary"
              disabled={!peso} // Desabilitar se o peso não estiver preenchido
            >
              Calcular
            </button>
            <button 
              type="button"
              onClick={handleClear}
              className="btn btn-secondary"
            >
              Limpar
            </button>
          </div>
        </div>
        
        {/* Painel de resultados */}
        <div className="calculator-card results-panel">
          <h3 className="calculator-title">Resultados</h3>
          
          {/* Resultado SC1 */}
          <div className="result-item">
            <div className="result-label">Superfície Corporal (SC1):</div>
            <div className="result-value">{sc1Result ? `${sc1Result} m²` : '-'}</div>
            <div className="formula-text">
              FÓRMULA 1: SC (m²) = (Peso em kg x 4) + 7 / Peso em kg + 90
            </div>
          </div>
          
          {/* Resultado SC2 */}
          <div className="result-item">
            <div className="result-label">Superfície Corporal (SC2):</div>
            <div className="result-value">{sc2Result ? `${sc2Result} m²` : '-'}</div>
            <div className="formula-text">
              FÓRMULA 2: SC (m²) = (Peso (kg) elevado a 0,5378) x (Estatura (cm) elevado a 0,3964) x 0,024265
            </div>
          </div>
          
          {/* Resultado AUC */}
          <div className="result-item">
            <div className="result-label">AUC:</div>
            <div className="result-value">{aucResult || '-'}</div>
            <div className="formula-text">
              AUC = ((((Peso x (140 - Idade)) / (72 x Creatinina)) x Sexo) + 25)
              * onde Sexo = 1 para feminino e 2 para masculino
            </div>
          </div>
          
          {/* Resultado mg/kg */}
          <div className="result-item">
            <div className="result-label">Dose por kg:</div>
            <div className="result-value">{mgKgResult ? `${mgKgResult} mg/kg` : '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculadoraPaciente;