import React, { useState } from 'react';
import '../components/Estilos.css';  // Importe o CSS que você criou

export function Header({ userName }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <header className="header header-gradient w-full p-4 fixed top-0 right-0 left-64 z-50 h-16">
      <div className="flex justify-between items-center h-full">
        <h1 className="text-2xl font-semibold text-white">Relação de Serviços</h1>
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
                <h3 className="text-lg font-medium mb-4">Alterar foto de perfil</h3>
                <input
                  type="file"
                  accept="image/*"
                  className="mb-4"
                />
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
