import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { TypeAnimation } from "react-type-animation"; // Importe o TypeAnimation
import "../components/Estilos.css";

export function Header({ userName }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const location = useLocation();

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
              src="https://i.pravatar.cc/100"
              alt="User avatar"
              className="avatar-img"
            />
          </button>

          {isUploadOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 className="text-lg font-medium mb-4">
                  Alterar foto de perfil
                </h3>
                <input type="file" accept="image/*" className="mb-4" />
                <div className="modal-buttons">
                  <button
                    onClick={() => setIsUploadOpen(false)}
                    className="cancel-btn"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setIsUploadOpen(false)}
                    className="save-btn"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}