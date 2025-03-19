import React from "react";
import { Database, LayoutGrid, LogOut, User } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { showConfirmAlert } from '../utils/CustomAlerts'; // Importando a função de alerta

import "./Estilos.css"; // Importa os estilos

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Exibe a confirmação e aguarda a resposta
    const confirmed = await showConfirmAlert(
      "Deseja realmente sair do sistema?", 
      "Você será desconectado e redirecionado para a tela de login."
    );
    
    // Só realiza o logout se o usuário confirmar
    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  const menuItems = [
    { icon: LayoutGrid, label: "Inicial", path: "/Home" },
    { icon: Database, label: "Relação de Serviços", path: "/ServicoRelacionada" },
    { icon: Database, label: "Pacientes em Trata.", path: "#" },
    { icon: Database, label: "Empresas", path: "#" },
  ];

  // O item de perfil usa Link, mas o LogOut usa button para chamar handleLogout
  const bottomItems = [
    { icon: LogOut, label: "Log Out", isButton: true },
  ];

  return (
    <aside className="sidebar">
      {/* Cabeçalho */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="../src/assets/LCOLogoUnitarioVetorSidebar.png" alt="Logo" className="sidebar-logo" />
        </div>
        <div className="sidebar-info">
          <span className="sidebar-title">LOW COST ONCO</span>
          <span className="sidebar-subtitle">Gestão de Custos</span>
        </div>
      </div>

      {/* Menu Principal */}
      <nav className="sidebar-menu">
        <ul>
          {menuItems.map(({ icon: Icon, label, path }, index) => (
            <li key={index}>
              <Link
                to={path}
                className={`sidebar-item ${location.pathname === path ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Itens Inferiores */}
      <div className="sidebar-bottom">
        <ul>
          {bottomItems.map(({ icon: Icon, label, path, isButton }, index) => (
            <li key={index}>
              {isButton ? (
                <button
                  onClick={handleLogout}
                  className="sidebar-item-logout"
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              ) : (
                <Link
                  to={path}
                  className={`sidebar-item-logout ${location.pathname === path ? "active" : ""}`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}