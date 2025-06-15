import React, { useState } from "react";
import { Database, LayoutGrid, LogOut, User, ChevronDown, ChevronRight, Users, FilePlus, Calculator, Folder, Search, UserPlus, FileText, Eye } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { showConfirmAlert } from '../utils/CustomAlerts';

import "./Estilos.css";

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({}); // Estado para controlar menus expandidos

  const handleLogout = async () => {
    const confirmed = await showConfirmAlert(
      "Deseja realmente sair do sistema?", 
      "Você será desconectado e redirecionado para a tela de login."
    );
    
    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  // Função para alternar a expansão de submenus
  const toggleSubmenu = (index) => {
    setExpandedMenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Verificar se um caminho está ativo (incluindo submenus)
  const isPathActive = (path) => {
    if (path === "#") return false;
    
    // Para caminhos de subtabs
    if (path.includes('?tab=')) {
      const basePath = path.split('?')[0];
      const tabParam = path.split('tab=')[1];
      
      // Verificar se estamos na mesma base de caminho e se a tab na URL corresponde
      const urlParams = new URLSearchParams(location.search);
      const currentTab = urlParams.get('tab');
      
      return location.pathname === basePath && currentTab === tabParam;
    }
    
    // Para caminhos normais
    return location.pathname === path;
  };

  const menuItems = [
    { icon: LayoutGrid, label: "Inicial", path: "/Home" },
    { icon: Database, label: "Cad. Serviços", path: "/ServicoRelacionada" },
    { 
      icon: Users, 
      label: "Pacientes em Trata.", 
      path: "/PacientesEmTratamento",
      subMenu: [
        { icon: UserPlus, label: "Cad. Paciente", path: "/PacientesEmTratamento?tab=cadastro" },
        { icon: FileText, label: "Cad. Protocolo", path: "/PacientesEmTratamento?tab=protocolo" },
        { icon: FilePlus, label: "Prévias", path: "/PacientesEmTratamento?tab=nova-previa" },
        { icon: Eye, label: "Atend. Prévia", path: "/PacientesEmTratamento?tab=atend-previa" }, // NOVA OPÇÃO
        { icon: Calculator, label: "Calculadora", path: "/PacientesEmTratamento?tab=calculadora" }
      ]
    },
    { icon: Database, label: "Empresas", path: "/Empresas" },
  ];

  const bottomItems = [
    { icon: LogOut, label: "Log Out", isButton: true },
  ];

  return (
    <aside className="sidebar">
      {/* Cabeçalho */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/images/LCOLogoUnitarioVetorSidebar.png" alt="Logo" className="sidebar-logo" />
        </div>
        <div className="sidebar-info">
          <span className="sidebar-title">LOW COST ONCO</span>
          <span className="sidebar-subtitle">Gestão de Custos</span>
        </div>
      </div>

      {/* Menu Principal */}
      <nav className="sidebar-menu">
        <ul>
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.subMenu ? (
                // Item com submenu
                <>
                  <div 
                    className={`sidebar-item ${location.pathname === item.path ? "active" : ""}`}
                    onClick={() => toggleSubmenu(index)}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    {expandedMenus[index] ? (
                      <ChevronDown size={16} className="submenu-icon" />
                    ) : (
                      <ChevronRight size={16} className="submenu-icon" />
                    )}
                  </div>
                  
                  {/* Renderizar submenu se estiver expandido */}
                  {expandedMenus[index] && (
                    <ul className="sidebar-submenu">
                      {item.subMenu.map((subItem, subIndex) => (
                        <li key={`${index}-${subIndex}`}>
                          <Link
                            to={subItem.path}
                            className={`sidebar-submenu-item ${isPathActive(subItem.path) ? "active" : ""}`}
                          >
                            {subItem.icon && <subItem.icon size={16} />}
                            <span>{subItem.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                // Item normal sem submenu
                <Link
                  to={item.path}
                  className={`sidebar-item ${location.pathname === item.path ? "active" : ""}`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )}
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