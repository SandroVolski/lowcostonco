import React, { createContext, useState, useContext, useEffect } from "react";

// Criando o contexto de autenticação
const AuthContext = createContext();

// Hook personalizado para acessar o contexto de autenticação
export const useAuth = () => useContext(AuthContext);

// Provider do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('LCO User'); // Estado para armazenar o nome do usuário

  // Verifica se o usuário já está autenticado ao carregar a página
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("authenticated") === "true";
    const storedUserName = localStorage.getItem("userName");
    
    setAuthenticated(isAuthenticated);
    
    // Se tiver um nome de usuário armazenado, use-o
    if (storedUserName) {
      setUserName(storedUserName);
    }
    
    setLoading(false);
  }, []);

  // Função para realizar login, agora aceitando o nome de exibição
  const login = (displayName = 'LCO User') => {
    localStorage.setItem("authenticated", "true");
    localStorage.setItem("userName", displayName);
    setAuthenticated(true);
    setUserName(displayName);
  };

  // Função para realizar logout
  const logout = () => {
    localStorage.removeItem("authenticated");
    localStorage.removeItem("userName");
    setAuthenticated(false);
    setUserName('LCO User'); // Reseta o nome do usuário para o padrão
  };

  const value = {
    authenticated,
    loading,
    userName, // Adicionando o nome do usuário ao contexto
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};