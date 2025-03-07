import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Home from "./view/pages/Home";
import ServicoRelacionada from "./view/pages/ServicoRelacionada";
import Login from "./view/pages/Login"

import { ServiceProvider } from './components/ServiceContext';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';

function App() {
  const location = useLocation(); // Obtém a localização atual

  return (
    <AuthProvider>
      <ServiceProvider>
      <AnimatePresence mode="wait"> {/* Envolve as rotas com AnimatePresence */}
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/ServicoRelacionada" element={<ServicoRelacionada />} />
              <Route path="/Home" element={<Home />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
      </AnimatePresence>
      </ServiceProvider>
    </AuthProvider>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}