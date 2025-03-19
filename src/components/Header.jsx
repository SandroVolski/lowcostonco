import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";
import { useAuth } from "../auth/AuthProvider"; // Importando o hook useAuth
import "../components/Estilos.css";

export function Header() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const location = useLocation();
  const { userName } = useAuth(); // Obtendo o nome do usuário do contexto de autenticação
  
  // Defina o texto do cabeçalho com base na rota
  const headerText =
    location.pathname === "/Home"
      ? "Olá... Vamos fazer o que hoje?"
      : location.pathname === "/ServicoRelacionada"
      ? "Relação de Serviços"
      : "Página Desconhecida";
      
  return (
    <header className="header header-gradient w-full p-4 fixed top-0 right-0 left-64 z-50 h-16">
      <div className="flex justify-between items-center h-full">
        <h1 className="text-2xl font-semibold text-white">
          <TypeAnimation
            sequence={[headerText, 1000]} // Texto e duração da animação
            speed={50} // Velocidade da digitação
            repeat={0} // Não repetir
            cursor={false} // Oculta o cursor
          />
        </h1>
        <div className="user-info">
          <span className="text-white">{userName}</span>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="avatar-button"
          >
            <img
              src="../src/assets/avatargif.gif"
              alt="User avatar"
              className="avatar-img"
            />
          </button>
        </div>
      </div>
    </header>
  );
}