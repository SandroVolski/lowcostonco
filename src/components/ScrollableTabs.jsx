import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Componente de guias deslizáveis melhorado
const ScrollableTabs = ({ activeSection, setActiveSection, isEditing, isAdding }) => {
  const tabsContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  // Função melhorada para verificar overflow
  const checkTabsOverflow = useCallback(() => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      
      // Verifica se o conteúdo é maior que o container
      const isOverflowing = container.scrollWidth > container.clientWidth;
      
      // Verifica se há conteúdo à direita (para mostrar seta direita)
      const hasRightOverflow = container.scrollLeft < (container.scrollWidth - container.clientWidth - 2);
      
      // Verifica se há conteúdo à esquerda (para mostrar seta esquerda)
      const hasLeftOverflow = container.scrollLeft > 2;
      
      // Imprime informações para debug
      console.log("Overflow check:", { 
        isOverflowing, 
        hasRightOverflow, 
        hasLeftOverflow,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        scrollLeft: container.scrollLeft
      });
      
      // Atualiza estado das setas
      setShowRightArrow(isOverflowing && hasRightOverflow);
      setShowLeftArrow(isOverflowing && hasLeftOverflow);
    }
  }, []);

  // Verificar overflow após o componente montar e após mudanças de tamanho
  useEffect(() => {
    // Executa imediatamente
    checkTabsOverflow();
    
    // E mais uma vez após curto delay para garantir que o layout está estável
    const timeoutId = setTimeout(checkTabsOverflow, 100);
    
    // Adiciona listener para redimensionamento
    window.addEventListener('resize', checkTabsOverflow);
    
    // Limpa listeners ao desmontar
    return () => {
      window.removeEventListener('resize', checkTabsOverflow);
      clearTimeout(timeoutId);
    };
  }, [checkTabsOverflow, activeSection]);

  // Função melhorada de scroll para esquerda
  const scrollTabsLeft = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const tabWidth = container.querySelector('.sr-nav-button')?.offsetWidth || 100;
      const scrollAmount = tabWidth * 2 + 20; // 2 tabs + gap
      
      // Scroll suave para esquerda
      container.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
      
      // Verifica estado das setas após animação
      setTimeout(checkTabsOverflow, 300);
    }
  };

  // Função melhorada de scroll para direita
  const scrollTabsRight = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const tabWidth = container.querySelector('.sr-nav-button')?.offsetWidth || 100;
      const scrollAmount = tabWidth * 2 + 20; // 2 tabs + gap
      
      // Scroll suave para direita
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
      
      // Verifica estado das setas após animação
      setTimeout(checkTabsOverflow, 300);
    }
  };

  // Centralizar a tab ativa quando ela muda
  useEffect(() => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const activeTab = container.querySelector('.sr-active');
      
      if (activeTab) {
        // Calcula posição para centralizar tab ativa
        const containerWidth = container.offsetWidth;
        const tabPosition = activeTab.offsetLeft;
        const tabWidth = activeTab.offsetWidth;
        
        const scrollPosition = tabPosition - (containerWidth / 2) + (tabWidth / 2);
        
        // Scroll suave para posição calculada
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
        
        // Verifica estado das setas após animação
        setTimeout(checkTabsOverflow, 300);
      }
    }
  }, [activeSection, checkTabsOverflow]);

  // Atualiza estado das setas durante scroll
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (container) {
      const handleScroll = () => checkTabsOverflow();
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [checkTabsOverflow]);

  // Forçar verificação inicial na montagem
  useEffect(() => {
    // Pequeno delay para garantir que o DOM esteja renderizado
    const initialCheckTimeout = setTimeout(() => {
      checkTabsOverflow();
      console.log("Verificação inicial de overflow executada");
    }, 500);
    
    return () => clearTimeout(initialCheckTimeout);
  }, []);

  return (
    <div className="sr-navigation-container">
      {/* Botão de navegação esquerda - Sempre visível para teste */}
      <button 
        className="sr-nav-arrow sr-nav-arrow-left"
        onClick={scrollTabsLeft}
        style={{ display: showLeftArrow ? 'flex' : 'none' }}
        aria-label="Navegar para a esquerda"
      >
        <ChevronLeft size={20} />
      </button>
      
      {/* Container das tabs com overflow horizontal */}
      <div 
        className={`sr-navigation-buttons ${(isEditing || isAdding) ? 'sr-centered' : ''}`}
        ref={tabsContainerRef}
        style={{ flexWrap: 'nowrap' }} // Força uma única linha
      >
        <button 
          className={`sr-nav-button ${activeSection === 'geral' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('geral')}
        >
          Geral
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'descricoes' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('descricoes')}
        >
          Descrição
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'tabela' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('tabela')}
        >
          Tabela
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'principio_ativo' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('principio_ativo')}
        >
          Princípio Ativo
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'registro_visa' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('registro_visa')}
        >
          ANVISA
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'unidade_fracionamento' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('unidade_fracionamento')}
        >
          Fracionamento
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'taxas' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('taxas')}
        >
          Taxas
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'entrada' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('entrada')}
        >
          Entrada
        </button>
        <button 
          className={`sr-nav-button ${activeSection === 'pagamento' ? 'sr-active' : ''}`}
          onClick={() => setActiveSection('pagamento')}
        >
          Pagamento
        </button>
      </div>
      
      {/* Botão de navegação direita - Sempre visível para teste */}
      <button 
        className="sr-nav-arrow sr-nav-arrow-right"
        onClick={scrollTabsRight}
        style={{ display: showRightArrow ? 'flex' : 'none' }}
        aria-label="Navegar para a direita"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default ScrollableTabs;