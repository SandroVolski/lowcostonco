import React from "react";
import { Database, LayoutGrid, LogOut, User } from "lucide-react";
import "./Estilos.css"; // Importa os estilos

export function Sidebar() {
  const menuItems = [
    { icon: LayoutGrid, label: "Inicial", active: false },
    { icon: Database, label: "Relação de Serviços", active: true },
    { icon: Database, label: "Outro BD", active: false },
    { icon: Database, label: "Outro BD", active: false },
  ];

  const bottomItems = [
    { icon: User, label: "Perfil", active: false },
    { icon: LogOut, label: "Log Out", active: false },
  ];

  return (
    <aside className="sidebar">
      {/* Cabeçalho */}
      <div className="sidebar-header">
        <div className="sidebar-logo"></div>
        <div className="sidebar-info">
          <span className="sidebar-title">LOW COST ONCO</span>
          <span className="sidebar-subtitle">Gestão de Custos</span>
        </div>
      </div>

      {/* Menu Principal */}
      <nav className="sidebar-menu">
        <ul>
          {menuItems.map(({ icon: Icon, label, active }, index) => (
            <li key={index}>
              <a
                href="#"
                className={`sidebar-item ${active ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Itens Inferiores */}
      <div className="sidebar-bottom">
        <ul>
          {bottomItems.map(({ icon: Icon, label }, index) => (
            <li key={index}>
              <a href="#" className="sidebar-item">
                <Icon size={20} />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
