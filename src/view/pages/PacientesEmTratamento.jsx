import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import PageTransition from '../../components/PageTransition';
import CadastroPaciente from './PacientesEmTratamento/CadastroPaciente';
import ProtocoloPaciente from '../../components/pacientes/ProtocoloPaciente';
import PreviaPaciente from '../../components/pacientes/PreviaPaciente';
import NovaPreviaPaciente from '../../components/pacientes/NovaPreviaPaciente';
import ConsultaPaciente from '../../components/pacientes/ConsultaPaciente';
import CalculadoraPaciente from '../../components/pacientes/CalculadoraPaciente';
import { PatientProvider } from '../../context/PatientContext';
import { Search, Plus, Trash2, Edit, RefreshCw, X, Save, Database } from 'lucide-react';

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
              {/* Container principal estilizado */}
              <div className="styled-container-pacientes">
                
                
                
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
        </div>
      </PageTransition>
    </PatientProvider>
  );
}