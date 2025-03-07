import React, { createContext, useState, useContext, useEffect } from "react";

// Criando o contexto de autenticação
const AuthContext = createContext();

// Hook personalizado para acessar o contexto de autenticação
export const useAuth = () => useContext(AuthContext);

// Provider do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verifica se o usuário já está autenticado ao carregar a página
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("authenticated") === "true";
    setAuthenticated(isAuthenticated);
    setLoading(false);
  }, []);

  // Função para realizar login
  const login = () => {
    localStorage.setItem("authenticated", "true");
    setAuthenticated(true);
  };

  // Função para realizar logout
  const logout = () => {
    localStorage.removeItem("authenticated");
    setAuthenticated(false);
  };

  const value = {
    authenticated,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};