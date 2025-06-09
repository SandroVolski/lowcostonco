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
  const [userId, setUserId] = useState(null); // NOVO: Estado para armazenar o ID do usuário
  const navigate = useNavigate();

  // Lista de credenciais válidas com nome de exibição e ID
  const VALID_CREDENTIALS = [
    { code: 'LCOGlobal', password: 'Douglas193', displayName: 'Douglas', id: 1 },
    { code: 'jessica@lowcostonco.com.br', password: '@JessicaLCO_2025', displayName: 'Jéssica', id: 2 },
    { code: 'ana@lowcostonco.com.br', password: '@AnaLCO_2025', displayName: 'Ana', id: 3 },
    { code: 'carla@lowcostonco.com.br', password: '@CarlaLCO_2025', displayName: 'Carla', id: 4 },
    { code: 'patricia@lowcostonco.com.br', password: '@PatriciaLCO_2025', displayName: 'Patrícia', id: 5 },
    { code: 'guilherme@lowcostonco.com.br', password: '@GuilhermeLCO_2025', displayName: 'Guilherme', id: 6 }
  ];

  // Função para obter usuário por ID
  const getUserById = (id) => {
    return VALID_CREDENTIALS.find(user => user.id === parseInt(id));
  };

  // Verifica se o usuário já está autenticado ao carregar a página
  // e verifica se a sessão ainda é válida
  useEffect(() => {
    const checkAuthentication = () => {
      const isAuthenticated = localStorage.getItem("authenticated") === "true";
      const storedUserName = localStorage.getItem("userName");
      const storedUserId = localStorage.getItem("userId"); // NOVO: Recuperar ID do usuário
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
          
          // NOVO: Se tiver um ID de usuário armazenado, use-o
          if (storedUserId) {
            setUserId(parseInt(storedUserId));
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

  // MODIFICADO: Função para realizar login, agora aceitando o nome de exibição e ID
  const login = (displayName = 'LCO User', userIdParam = null) => {
    // Define o tempo de expiração (agora + 1 hora)
    const expiryTime = Date.now() + SESSION_EXPIRY_TIME;
    
    // Armazena as informações no localStorage
    localStorage.setItem("authenticated", "true");
    localStorage.setItem("userName", displayName);
    localStorage.setItem("userId", userIdParam?.toString() || ''); // NOVO: Armazenar ID do usuário
    localStorage.setItem("authExpiry", expiryTime.toString());
    
    // Atualiza o estado
    setAuthenticated(true);
    setUserName(displayName);
    setUserId(userIdParam); // NOVO: Definir ID do usuário
    
    console.log("Login realizado. Usuário:", displayName, "ID:", userIdParam, "Sessão expira em:", new Date(expiryTime).toLocaleString());
  };

  // MODIFICADO: Função para realizar logout
  const logout = () => {
    localStorage.removeItem("authenticated");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId"); // NOVO: Limpar ID do usuário
    localStorage.removeItem("authExpiry");
    setAuthenticated(false);
    setUserName('LCO User'); // Reseta o nome do usuário para o padrão
    setUserId(null); // NOVO: Resetar ID do usuário
  };

  const value = {
    authenticated,
    loading,
    userName,
    userId, // NOVO: Expor ID do usuário
    login,
    logout,
    resetSessionTimer,
    getUserById // NOVO: Função para obter usuário por ID
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};