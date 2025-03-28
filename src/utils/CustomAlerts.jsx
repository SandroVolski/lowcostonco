/**
 * Sistema de alertas personalizados para substituir os alerts padrão
 */

// Ícones para os diferentes tipos de alertas
const ALERT_ICONS = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };
  
  // Títulos padrão para os alertas
  const ALERT_TITLES = {
    success: 'SUCESSO!',
    error: 'ERRO!',
    warning: 'ATENÇÃO!',
    info: 'INFORMAÇÃO'
  };
  
  /**
   * Função genérica para exibir alertas customizados
   * @param {Object} options - Opções de configuração do alerta
   * @param {string} options.type - Tipo do alerta: 'success', 'error', 'warning', 'info'
   * @param {string} options.title - Título do alerta (opcional, usa padrão se não informado)
   * @param {string} options.message - Mensagem principal do alerta
   * @param {string} options.detail - Detalhes adicionais (opcional)
   * @param {string} options.icon - Ícone personalizado (opcional)
   * @param {boolean} options.isStatic - Se true, o alerta não fechará automaticamente
   * @param {number} options.autoCloseTimeout - Tempo em ms para fechar automaticamente (se não for estático)
   */
  function showCustomAlert(options) {
    const {
      type = 'info',
      title = ALERT_TITLES[type],
      message,
      detail = '',
      icon = ALERT_ICONS[type],
      isStatic = false,
      autoCloseTimeout = 3000
    } = options;
  
    // Criar elementos do alerta
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    
    const alert = document.createElement('div');
    alert.className = `custom-alert ${type}`;
    
    const header = document.createElement('div');
    header.className = 'custom-alert-header';
    header.textContent = title;
    
    const body = document.createElement('div');
    body.className = 'custom-alert-body';
    
    // Adicionar ícone
    const iconElement = document.createElement('div');
    iconElement.className = 'custom-alert-icon';
    iconElement.textContent = icon;
    
    // Adicionar mensagem principal
    const messageElement = document.createElement('div');
    messageElement.className = 'custom-alert-message';
    messageElement.textContent = message;
    
    // Adicionar detalhes (se houver)
    let detailElement = null;
    if (detail) {
      detailElement = document.createElement('div');
      detailElement.className = 'custom-alert-detail';
      detailElement.textContent = detail;
    }
    
    // Montar a estrutura do alerta
    body.appendChild(iconElement);
    body.appendChild(messageElement);
    if (detailElement) body.appendChild(detailElement);
    
    alert.appendChild(header);
    alert.appendChild(body);
    
    // Adicionar botão de fechar
    const closeButton = document.createElement('button');
    closeButton.className = 'custom-alert-close';
    closeButton.textContent = 'Fechar';
    closeButton.onclick = closeAlert;
    alert.appendChild(closeButton);
    
    overlay.appendChild(alert);
    document.body.appendChild(overlay);
    
    // Ativar o alerta com um pequeno delay para permitir a animação
    setTimeout(() => {
      overlay.classList.add('active');
    }, 10);
    
    // Fechar automaticamente após o tempo definido, se não for estático
    if (!isStatic && autoCloseTimeout) {
      setTimeout(closeAlert, autoCloseTimeout);
    }
    
    // Fechar o alerta ao clicar no overlay
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeAlert();
      }
    });
    
    // Função para fechar o alerta
    function closeAlert() {
      overlay.classList.remove('active');
      
      // Remover o elemento após a animação de saída
      setTimeout(() => {
        // Verificar se o overlay ainda existe no DOM antes de tentar removê-lo
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }, 300);
    }
    
    // Retornar função para fechar o alerta programaticamente
    return closeAlert;
  }
  
  /**
   * Alerta de Sucesso
   * @param {string} message - Mensagem principal
   * @param {string} detail - Detalhes adicionais (opcional)
   * @param {boolean} isStatic - Se true, o alerta não fechará automaticamente
   * @param {number} autoCloseTimeout - Tempo em ms para fechar automaticamente (padrão: 3000ms)
   */
  function showSuccessAlert(message, detail = '', isStatic = false, autoCloseTimeout = 3000) {
    return showCustomAlert({
      type: 'success',
      message,
      detail,
      isStatic,
      autoCloseTimeout
    });
  }
  
  /**
   * Alerta de Erro
   * @param {string} message - Mensagem principal
   * @param {string} detail - Detalhes adicionais (opcional)
   * @param {boolean} isStatic - Se true, o alerta não fechará automaticamente
   * @param {number} autoCloseTimeout - Tempo em ms para fechar automaticamente (padrão: 4000ms)
   */
  function showErrorAlert(message, detail = '', isStatic = false, autoCloseTimeout = 4000) {
    return showCustomAlert({
      type: 'error',
      message,
      detail,
      isStatic,
      autoCloseTimeout
    });
  }
  
  /**
   * Alerta de Aviso
   * @param {string} message - Mensagem principal
   * @param {string} detail - Detalhes adicionais (opcional)
   * @param {boolean} isStatic - Se true, o alerta não fechará automaticamente
   * @param {number} autoCloseTimeout - Tempo em ms para fechar automaticamente (padrão: 3500ms)
   */
  function showWarningAlert(message, detail = '', isStatic = false, autoCloseTimeout = 3500) {
    return showCustomAlert({
      type: 'warning',
      message,
      detail,
      isStatic,
      autoCloseTimeout
    });
  }
  
  /**
   * Alerta de Informação
   * @param {string} message - Mensagem principal
   * @param {string} detail - Detalhes adicionais (opcional)
   * @param {boolean} isStatic - Se true, o alerta não fechará automaticamente
   * @param {number} autoCloseTimeout - Tempo em ms para fechar automaticamente (padrão: 3000ms)
   */
  function showInfoAlert(message, detail = '', isStatic = false, autoCloseTimeout = 3000) {
    return showCustomAlert({
      type: 'info',
      message,
      detail,
      isStatic,
      autoCloseTimeout
    });
  }
  
  /**
   * Alerta de confirmação que retorna uma Promise
   * @param {string} message - Mensagem de confirmação
   * @param {string} detail - Detalhes adicionais (opcional)
   * @returns {Promise<boolean>} - Promise que resolve para true (confirmado) ou false (cancelado)
   */
  function showConfirmAlert(message, detail = '') {
    return new Promise((resolve) => {
      // Criar elementos do alerta
      const overlay = document.createElement('div');
      overlay.className = 'custom-alert-overlay';
      
      const alert = document.createElement('div');
      alert.className = 'custom-alert warning';
      
      const header = document.createElement('div');
      header.className = 'custom-alert-header';
      header.textContent = 'CONFIRMAÇÃO';
      
      const body = document.createElement('div');
      body.className = 'custom-alert-body';
      
      // Adicionar ícone
      const iconElement = document.createElement('div');
      iconElement.className = 'custom-alert-icon';
      iconElement.textContent = '?';
      
      // Adicionar mensagem principal
      const messageElement = document.createElement('div');
      messageElement.className = 'custom-alert-message';
      messageElement.textContent = message;
      
      // Adicionar detalhes (se houver)
      let detailElement = null;
      if (detail) {
        detailElement = document.createElement('div');
        detailElement.className = 'custom-alert-detail';
        detailElement.textContent = detail;
      }
      
      // Montar a estrutura do alerta
      body.appendChild(iconElement);
      body.appendChild(messageElement);
      if (detailElement) body.appendChild(detailElement);
      
      alert.appendChild(header);
      alert.appendChild(body);
      
      // Adicionar botões de confirmação
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'custom-alert-button-container';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancelar';
      cancelButton.onclick = () => closeAndResolve(false);
      
      const confirmButton = document.createElement('button');
      confirmButton.className = 'confirm';
      confirmButton.textContent = 'Confirmar';
      confirmButton.onclick = () => closeAndResolve(true);
      
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(confirmButton);
      
      alert.appendChild(buttonContainer);
      overlay.appendChild(alert);
      document.body.appendChild(overlay);
      
      // Ativar o alerta com um pequeno delay para permitir a animação
      setTimeout(() => {
        overlay.classList.add('active');
      }, 10);
      
      // Função para fechar o alerta e resolver a Promise
      function closeAndResolve(result) {
        overlay.classList.remove('active');
        
        // Remover o elemento após a animação de saída
        setTimeout(() => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
          resolve(result);
        }, 300);
      }
    });
  }
  
  /**
   * Função para exibir popup de sucesso personalizado para serviço adicionado
   * @param {string|object} serviceInfo - ID do serviço adicionado ou objeto com informações {id, cod}
   * @param {boolean} isStatic - Se true, o popup não fechará automaticamente
   * @param {number} autoCloseTimeout - Tempo em ms para fechar automaticamente (se não for estático)
   */
  function showSuccessPopup(serviceInfo, isStatic = false, autoCloseTimeout = 5000) {
    // Verificar formato da entrada para permitir compatibilidade com código existente
    let serviceId, displayCode;
    
    if (typeof serviceInfo === 'object' && serviceInfo !== null) {
      // Novo formato: objeto com id e cod
      serviceId = serviceInfo.id;
      displayCode = serviceInfo.cod || serviceId; // Usar cod se disponível, senão o id
    } else {
      // Formato antigo: apenas o id
      serviceId = serviceInfo;
      displayCode = serviceInfo;
    }
    
    // Criar elementos do popup
    const overlay = document.createElement('div');
    overlay.className = 'success-popup-overlay';
    
    const popup = document.createElement('div');
    popup.className = 'success-popup';
    
    const header = document.createElement('div');
    header.className = 'success-popup-header';
    header.textContent = 'SERVIÇO ADICIONADO AO FIM DA TABELA!';
    
    const body = document.createElement('div');
    body.className = 'success-popup-body';
    
    const idText = document.createElement('div');
    idText.innerHTML = `CÓDIGO: <span class="success-popup-id">${displayCode}</span>`;
    
    // Montar a estrutura do popup
    body.appendChild(idText);
    popup.appendChild(header);
    popup.appendChild(body);
    
    // Adicionar botão de fechar
    const closeButton = document.createElement('button');
    closeButton.className = 'success-popup-close';
    closeButton.textContent = 'Fechar';
    closeButton.onclick = closePopup;
    popup.appendChild(closeButton);
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Ativar o popup com um pequeno delay para permitir a animação
    setTimeout(() => {
      overlay.classList.add('active');
    }, 10);
    
    // Fechar automaticamente após o tempo definido, se não for estático
    if (!isStatic && autoCloseTimeout) {
      setTimeout(closePopup, autoCloseTimeout);
    }
    
    // Fechar o popup ao clicar no overlay
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closePopup();
      }
    });
    
    // Função para fechar o popup
    function closePopup() {
      overlay.classList.remove('active');
      
      // Remover o elemento após a animação de saída
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 300);
    }
    
    // Retornar função para fechar o popup programaticamente
    return closePopup;
  }
  
  // Exportar todas as funções
  export {
    showCustomAlert,
    showSuccessAlert,
    showErrorAlert,
    showWarningAlert,
    showInfoAlert,
    showConfirmAlert,
    showSuccessPopup
  };
  
  // Também criar uma versão global para uso direto em scripts
  window.customAlerts = {
    showCustomAlert,
    showSuccessAlert,
    showErrorAlert,
    showWarningAlert,
    showInfoAlert,
    showConfirmAlert,
    showSuccessPopup
  };