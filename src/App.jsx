import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Home from "./view/pages/Home";
import ServicoRelacionada from "./view/pages/ServicoRelacionada";
import Login from "./view/pages/Login"

function App() {
  const location = useLocation(); // Obtém a localização atual

  return (
    <AnimatePresence mode="wait"> {/* Envolve as rotas com AnimatePresence */}
      <Routes location={location} key={location.pathname}>
        <Route path="/ServicoRelacionada" element={<ServicoRelacionada />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}