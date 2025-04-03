import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import PageTransition from "../../components/PageTransition";
import { useNavigate } from 'react-router-dom';
import { useServiceData } from '../../components/ServiceContext'; 
import { useAuth } from '../../auth/AuthProvider';

function Login() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const navigate = useNavigate();
  
  // Usando o contexto de serviços
  const { loadServiceData, initialized } = useServiceData();

  const { login, authenticated } = useAuth();

  // Verificar se já está autenticado ao carregar
  useEffect(() => {
    if (authenticated) {
      navigate('/Home');
    }
  }, [authenticated, navigate]);

  // Lista de credenciais válidas com nome de exibição
  const VALID_CREDENTIALS = [
    { code: 'LCOGlobal', password: 'Douglas193', displayName: 'Douglas' },
    { code: 'jessica@lowcostonco.com.br', password: '@JessicaLCO_2025', displayName: 'Jéssica' },
    { code: 'ana@lowcostonco.com.br', password: '@AnaLCO_2025', displayName: 'Ana' },
    { code: 'carla@lowcostonco.com.br', password: '@CarlaLCO_2025', displayName: 'Carla' },
    { code: 'patricia@lowcostonco.com.br', password: '@PatriciaLCO_2025', displayName: 'Patrícia' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulando uma requisição
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Encontra o usuário nas credenciais válidas
    const foundUser = VALID_CREDENTIALS.find(
      credential => credential.code === code && credential.password === password
    );
    
    if (foundUser) {
      setSuccess(true);

      // Faz login passando o nome de exibição do usuário
      login(foundUser.displayName);
      
      // Inicia o carregamento dos dados se ainda não estiverem carregados
      if (!initialized) {
        setDataLoading(true);
        try {
          await loadServiceData(1, true);
          console.log("Dados pré-carregados com sucesso!");
        } catch (error) {
          console.error("Erro ao pré-carregar dados:", error);
        } finally {
          setDataLoading(false);
        }
      }
      
      // Aguarda 2 segundos antes de redirecionar
      setTimeout(() => {
        navigate('/Home');
      }, 2000);
    } else {
      setError('Código ou senha inválidos');
    }
    setLoading(false);
  };

  return (
    <PageTransition>
      <div 
        className="flex flex-col items-center justify-center bg-gradient-to-r from-[#c6d651] to-[#8cb369]"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          width: '100vw',
          height: '100vh'
        }}
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8 transform transition-all duration-300 hover:scale-[1.02]">
          <div className="flex flex-col items-center space-y-2">
          <img src="/images/LCOLogoUnitarioVetor.png" alt="Logo" className="w-28 h-18 text-[#c6d651] animate-pulse" />
            <h1 className="text-3xl font-bold text-center text-[#575654]">
              Entrar no
            </h1>
            <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-[#c6d651] to-[#8cb369] bg-clip-text text-transparent">
              LOW COST ONCO
            </h2>
          </div>

          {success ? (
            <div className="space-y-4">
              <div style={{ 
                backgroundColor: "rgba(198, 214, 81, 0.1)", 
                padding: "1rem", 
                borderRadius: "0.5rem", 
                border: "1px solid rgba(198, 214, 81, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }} className="animate-fade-in">
                <CheckCircle style={{ color: "#c6d651", width: "1.5rem", height: "1.5rem" }} />
                <span style={{ color: "#7a8431", fontWeight: "500" }}>Login realizado com sucesso!</span>
              </div>
              
              <div style={{ 
                backgroundColor: "rgba(133, 145, 55, 0.1)", 
                padding: "1rem", 
                borderRadius: "0.5rem", 
                border: "1px solid rgba(133, 145, 55, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }} className="animate-fade-in">
                <Clock style={{ color: "#859137", width: "1.5rem", height: "1.5rem" }} />
                <span style={{ color: "#859137", fontWeight: "500" }}>Sessão válida por 1 hora</span>
              </div>
                          
              {dataLoading && (
                <div style={{ 
                  backgroundColor: "rgba(228, 169, 79, 0.1)", 
                  padding: "1rem", 
                  borderRadius: "0.5rem", 
                  border: "1px solid rgba(228, 169, 79, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}>
                  <Loader2 style={{ color: "#f26b6b", width: "1.5rem", height: "1.5rem" }} className="animate-spin" />
                  <span style={{ color: "#f26b6b", fontWeight: "500" }}>Preparando dados do sistema...</span>
                </div>
              )}
              
              <p className="text-center text-gray-600">
                Redirecionando para o sistema...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Código
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#c6d651] focus:border-transparent transition-all duration-200 outline-none"
                  placeholder="Informar o Código"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#c6d651] focus:border-transparent transition-all duration-200 outline-none"
                  placeholder="Digitar senha"
                  required
                />
              </div>
              
              {error && (
                <p className="text-red-500 text-sm text-center animate-shake">
                  {error}
                </p>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#c6d651] to-[#8cb369] text-white font-semibold py-3 px-6 rounded-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

export default Login;