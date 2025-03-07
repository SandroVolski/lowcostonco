import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// Componente que protege as rotas, redirecionando para o login se não estiver autenticado
const ProtectedRoute = () => {
  const { authenticated, loading } = useAuth();

  // Enquanto verifica a autenticação, pode mostrar um loading
  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se não estiver autenticado, redireciona para a página de login
  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  // Se estiver autenticado, renderiza o componente da rota
  return <Outlet />;
};

export default ProtectedRoute;