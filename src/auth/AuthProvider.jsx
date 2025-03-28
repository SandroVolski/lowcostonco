import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showWarningAlert } from '../utils/CustomAlerts';

// Criando o contexto de autenticação
const AuthContext = createContext();

// Hook personalizado para acessar o contexto de autenticação
export const useAuth = () => useContext(AuthContext);

// Tempo de expiração da sessão (em milissegundos) - 1 hora
const SESSION_EXPIRY_TIME = 60 * 60 * 1000; // 60 minutos

// Provider do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('LCO User'); // Estado para armazenar o nome do usuário
  const navigate = useNavigate();

  // Verifica se o usuário já está autenticado ao carregar a página
  // e verifica se a sessão ainda é válida
  useEffect(() => {
    const checkAuthentication = () => {
      const isAuthenticated = localStorage.getItem("authenticated") === "true";
      const storedUserName = localStorage.getItem("userName");
      const authExpiry = localStorage.getItem("authExpiry");
      
      const now = Date.now();
      
      // Se tiver autenticação armazenada
      if (isAuthenticated) {
        // Verificar se a autenticação expirou
        if (authExpiry && parseInt(authExpiry) < now) {
          // Sessão expirada, fazer logout
          console.log("Sessão expirada, fazendo logout automático");
          logout();
          
          // Se não estiver na página de login, redirecionar e mostrar mensagem
          if (window.location.pathname !== '/') {
            navigate('/');
            showWarningAlert(
              "Sessão expirada", 
              "Sua sessão expirou por inatividade. Por favor, faça login novamente."
            );
          }
        } else {
          // Sessão ainda válida
          setAuthenticated(true);
          
          // Se tiver um nome de usuário armazenado, use-o
          if (storedUserName) {
            setUserName(storedUserName);
          }
          
          // Atualizar o timer da sessão a cada interação
          resetSessionTimer();
        }
      }
      
      setLoading(false);
    };
    
    checkAuthentication();
    
    // Adicionar event listener para reiniciar o timer em interações do usuário
    const resetTimerOnActivity = () => resetSessionTimer();
    window.addEventListener('click', resetTimerOnActivity);
    window.addEventListener('keypress', resetTimerOnActivity);
    
    // Verificar periodicamente se a sessão expirou (a cada minuto)
    const intervalId = setInterval(checkAuthentication, 60 * 1000);
    
    return () => {
      // Limpar event listeners e interval quando o componente for desmontado
      window.removeEventListener('click', resetTimerOnActivity);
      window.removeEventListener('keypress', resetTimerOnActivity);
      clearInterval(intervalId);
    };
  }, [navigate]);

  // Função para reiniciar o timer da sessão
  const resetSessionTimer = () => {
    if (authenticated) {
      const newExpiry = Date.now() + SESSION_EXPIRY_TIME;
      localStorage.setItem("authExpiry", newExpiry.toString());
      console.log("Timer de sessão atualizado. Nova expiração:", new Date(newExpiry).toLocaleTimeString());
    }
  };

  // Função para realizar login, agora aceitando o nome de exibição
  const login = (displayName = 'LCO User') => {
    // Define o tempo de expiração (agora + 1 hora)
    const expiryTime = Date.now() + SESSION_EXPIRY_TIME;
    
    // Armazena as informações no localStorage
    localStorage.setItem("authenticated", "true");
    localStorage.setItem("userName", displayName);
    localStorage.setItem("authExpiry", expiryTime.toString());
    
    // Atualiza o estado
    setAuthenticated(true);
    setUserName(displayName);
    
    console.log("Login realizado. Sessão expira em:", new Date(expiryTime).toLocaleString());
  };

  // Função para realizar logout
  const logout = () => {
    localStorage.removeItem("authenticated");
    localStorage.removeItem("userName");
    localStorage.removeItem("authExpiry");
    setAuthenticated(false);
    setUserName('LCO User'); // Reseta o nome do usuário para o padrão
  };

  const value = {
    authenticated,
    loading,
    userName,
    login,
    logout,
    resetSessionTimer
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};