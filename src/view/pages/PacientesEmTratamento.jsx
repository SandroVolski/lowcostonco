import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import PageTransition from '../../components/PageTransition';
import CadastroPaciente from './PacientesEmTratamento/CadastroPaciente';
import CadastroProtocolo from './PacientesEmTratamento/CadastroProtocolo';
import NovaPreviaView from './PacientesEmTratamento/NovaPreviaView';
import ConsultaPaciente from '../../components/pacientes/ConsultaPaciente';
import CalculadoraPaciente from './PacientesEmTratamento/CalculadoraPaciente';
import { PatientProvider } from '../../context/PatientContext';
import { Database, UserPlus, FileText, FilePlus, Users, Calculator } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AnimatedTabContent from '../../components/AnimatedTabContent';

// Importar os estilos
import './PacientesEmTratamento.css';
import '../pages/ServicoRelacionada.css'; // Importar estilos da ServicoRelacionada para manter o padrão

// Componente principal
export default function PacientesEmTratamento() {
  // Estado para controlar qual aba está ativa - usando URL params
  const [activeTab, setActiveTab] = useState('cadastro');
  
  // Adicionando useLocation para detectar mudanças na URL
  const location = useLocation();
  
  // Mapeamento dos títulos para cada aba
  const tabTitles = {
    'cadastro': 'PTTO: Cadastro de Pacientes',
    'protocolo': 'PTTO: Cadastro de Protocolo',
    'previa': 'PTTO: Prévia de Pacientes',
    'nova-previa': 'PTTO: Nova Prévia',
    'consultar': 'PTTO: Consulta de Pacientes',
    'calculadora': 'PTTO: Calculadora'
  };
  
  // Detectar qual aba está ativa com base em parâmetros de URL
  // Adicionamos location.search como dependência para o useEffect
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab) {
      setActiveTab(tab);
    } else {
      // Default para cadastro se não houver tab
      setActiveTab('cadastro');
    }
  }, [location.search]); // Agora reage às mudanças na URL
  
  // Função para mudar de aba
  const changeTab = (tabName) => {
    setActiveTab(tabName);
    
    // Atualizar a URL sem recarregar a página
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.pushState({}, '', url);
  };
  
  // Obtém o título atual com base na aba ativa
  const currentTitle = tabTitles[activeTab] || 'PTTO: Pacientes em Tratamento';
  
  return (
    <PatientProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1">
          <Header pageTitle={currentTitle} />
          <div className="main-content">
            <div className="styled-container">
              <div className="patient-content">
              <AnimatePresence mode="sync"> {/* Mudando de "wait" para "sync" */}
                {activeTab === 'cadastro' && (
                  <PageTransition key="cadastro-tab">
                    <Header pageTitle={currentTitle} />
                    <AnimatedTabContent>
                      <CadastroPaciente />
                    </AnimatedTabContent>
                  </PageTransition>
                )}
                {activeTab === 'protocolo' && (
                  <PageTransition key="protocolo-tab">
                    <Header pageTitle={currentTitle} />
                    <AnimatedTabContent>
                      <CadastroProtocolo />
                    </AnimatedTabContent>
                  </PageTransition>
                )}

                {activeTab === 'previa' && (
                  <PageTransition key="previa-tab">
                    <Header pageTitle={currentTitle} />
                    <AnimatedTabContent>
                      <NovaPreviaView mode="previa" />
                    </AnimatedTabContent>
                  </PageTransition>
                )}

                {activeTab === 'nova-previa' && (
                  <PageTransition key="nova-previa-tab">
                    <Header pageTitle={currentTitle} />
                    <AnimatedTabContent>
                      <NovaPreviaView mode="nova" />
                    </AnimatedTabContent>
                  </PageTransition>
                )}

                {activeTab === 'consultar' && (
                  <PageTransition key="consultar-tab">
                    <Header pageTitle={currentTitle} />
                    <AnimatedTabContent>
                      <ConsultaPaciente />
                    </AnimatedTabContent>
                  </PageTransition>
                )}

                {activeTab === 'calculadora' && (
                  <PageTransition key="calculadora-tab">
                    <Header pageTitle={currentTitle} />
                    <AnimatedTabContent>
                      <CalculadoraPaciente />
                    </AnimatedTabContent>
                  </PageTransition>
                )}
              </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PatientProvider>
  );
}