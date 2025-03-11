import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import PageTransition from "../../components/PageTransition";
import { useNavigate } from 'react-router-dom';
import { useServiceData } from '../../components/ServiceContext'; // Importe o contexto
import { useAuth } from '../../auth/AuthProvider'


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

  const { login } = useAuth();

  // Credenciais fixas para demonstração
  const VALID_CODE = 'ONCOGlobal';
  const VALID_PASSWORD = 'Douglas193';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulando uma requisição
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (code === VALID_CODE && password === VALID_PASSWORD) {
      setSuccess(true);

      login();
      
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
        className="flex flex-col items-center justify-center bg-gradient-to-r from-[#00adef] to-[#3871c1]"
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
            <img src="../../src/assets/VetorizadaCerto.png" alt="Logo" className="w-30 h-20 text-[#00adef] animate-pulse" />
            <h1 className="text-3xl font-bold text-center text-gray-800">
              Entrar no
            </h1>
            <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-[#00adef] to-[#3871c1] bg-clip-text text-transparent">
              LOW COST ONCO
            </h2>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-center justify-center space-x-2 animate-fade-in">
                <CheckCircle className="text-green-500 w-6 h-6" />
                <span className="text-green-700 font-medium">Login realizado com sucesso!</span>
              </div>
              
              {dataLoading && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-center space-x-2">
                  <Loader2 className="text-blue-500 w-6 h-6 animate-spin" />
                  <span className="text-blue-700 font-medium">Preparando dados do sistema...</span>
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#00adef] focus:border-transparent transition-all duration-200 outline-none"
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#00adef] focus:border-transparent transition-all duration-200 outline-none"
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
                className="w-full bg-gradient-to-r from-[#00adef] to-[#3871c1] text-white font-semibold py-3 px-6 rounded-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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