// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Home from "./view/pages/Home";
import ServicoRelacionada from "./view/pages/ServicoRelacionada";
import PacientesEmTratamento from "./view/pages/PacientesEmTratamento";
import Empresas from './view/pages/Empresas';
import Login from "./view/pages/Login";

import { ToastProvider } from "./components/ui/Toast";
import { ServiceProvider } from './components/ServiceContext';
import { AuthProvider } from './auth/AuthProvider';
import { PatientProvider } from './context/PatientContext';
import { ProtocoloProvider } from './context/ProtocoloContext';
import ProtectedRoute from './auth/ProtectedRoute';

function App() {
  const location = useLocation(); // Obtém a localização atual
  return (
    <ToastProvider>
      <AuthProvider>
        <ServiceProvider>
          <PatientProvider>
            <ProtocoloProvider>
              <AnimatePresence mode="wait"> {/* Envolve as rotas com AnimatePresence */}
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Login />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/ServicoRelacionada" element={<ServicoRelacionada />} />
                    <Route path="/Home" element={<Home />} />
                    
                  </Route>
                  <Route element={<ProtectedRoute />}>
                    {/* Esta rota principal para PacientesEmTratamento captura parâmetros */}
                    <Route path="/PacientesEmTratamento" element={<PacientesEmTratamento />} />
                    
                    {/* Essas rotas são redirecionamentos para usar o sistema de abas */}
                    <Route 
                      path="/CadastroPaciente" 
                      element={<Navigate to="/PacientesEmTratamento?tab=cadastro" replace />} 
                    />
                    <Route 
                      path="/CadastroProtocolo" 
                      element={<Navigate to="/PacientesEmTratamento?tab=protocolo" replace />} 
                    />
                    <Route 
                      path="/Calculadora"
                      element={<Navigate to="/PacientesEmTratamento?tab=calculadora" replace />} 
                    />
                  </Route>
                  <Route element={<ProtectedRoute />}>
                    <Route path="/Empresas" element={<Empresas />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </AnimatePresence>
            </ProtocoloProvider>
          </PatientProvider>
        </ServiceProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}