import React from "react";
import { Database, LayoutGrid, LogOut, User } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import "./Estilos.css"; // Importa os estilos

export function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutGrid, label: "Inicial", path: "/Home" },
    { icon: Database, label: "Relação de Serviços", path: "/ServicoRelacionada" },
    { icon: Database, label: "Pacientes em Trata."},
    { icon: Database, label: "Empresas"},
  ];

  const bottomItems = [
    { icon: User, label: "Perfil"},
    { icon: LogOut, label: "Log Out"},
  ];

  return (
    <aside className="sidebar">
      {/* Cabeçalho */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
        <img src="../src/assets/logolowcost.jpeg" alt="Logo" className="sidebar-logo" />
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
          {bottomItems.map(({ icon: Icon, label, path }, index) => (
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
      </div>
    </aside>
  );
}