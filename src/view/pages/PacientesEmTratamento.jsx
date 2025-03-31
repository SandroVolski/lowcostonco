import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import PageTransition from '../../components/PageTransition';
import CadastroPaciente from '../../components/pacientes/CadastroPaciente';
import ProtocoloPaciente from '../../components/pacientes/ProtocoloPaciente';
import PreviaPaciente from '../../components/pacientes/PreviaPaciente';
import NovaPreviaPaciente from '../../components/pacientes/NovaPreviaPaciente';
import ConsultaPaciente from '../../components/pacientes/ConsultaPaciente';
import CalculadoraPaciente from '../../components/pacientes/CalculadoraPaciente';
import { PatientProvider } from '../../context/PatientContext';

// CSS
import './PacientesEmTratamento.css';

// Componente principal
export default function PacientesEmTratamento() {
  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState('cadastro');
  
  return (
    <PatientProvider>
      <PageTransition>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1">
            <Header />
            <div className="main-content-pacientes">
              {/* Navegação de abas */}
              <div className="patient-tabs">
                <button 
                  className={`patient-tab ${activeTab === 'cadastro' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cadastro')}
                >
                  Cadastro
                </button>
                <button 
                  className={`patient-tab ${activeTab === 'paciente' ? 'active' : ''}`}
                  onClick={() => setActiveTab('paciente')}
                >
                  Paciente
                </button>
                <button 
                  className={`patient-tab ${activeTab === 'protocolo' ? 'active' : ''}`}
                  onClick={() => setActiveTab('protocolo')}
                >
                  Protocolo
                </button>
                <button 
                  className={`patient-tab ${activeTab === 'previa' ? 'active' : ''}`}
                  onClick={() => setActiveTab('previa')}
                >
                  Prévia
                </button>
                <button 
                  className={`patient-tab ${activeTab === 'nova-previa' ? 'active' : ''}`}
                  onClick={() => setActiveTab('nova-previa')}
                >
                  Nova Prévia
                </button>
                <button 
                  className={`patient-tab ${activeTab === 'consultar' ? 'active' : ''}`}
                  onClick={() => setActiveTab('consultar')}
                >
                  Consultar
                </button>
                <button 
                  className={`patient-tab ${activeTab === 'calculadora' ? 'active' : ''}`}
                  onClick={() => setActiveTab('calculadora')}
                >
                  Calculadora
                </button>
              </div>
              
              {/* Conteúdo da aba */}
              <div className="patient-content">
                {activeTab === 'cadastro' && <CadastroPaciente />}
                {activeTab === 'paciente' && <CadastroPaciente />}
                {activeTab === 'protocolo' && <ProtocoloPaciente />}
                {activeTab === 'previa' && <PreviaPaciente />}
                {activeTab === 'nova-previa' && <NovaPreviaPaciente />}
                {activeTab === 'consultar' && <ConsultaPaciente />}
                {activeTab === 'calculadora' && <CalculadoraPaciente />}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </PatientProvider>
  );
}   