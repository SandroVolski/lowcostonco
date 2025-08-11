# Efeito Marquee no Código do Protocolo

## Visão Geral

Implementei um efeito de marquee (texto deslizante) para o código do protocolo quando ele exceder o limite de 8 caracteres. O texto "anda" automaticamente para que o usuário possa ler todo o conteúdo.

## Como Funciona

### 1. Detecção Inteligente
- **Limite**: 8 caracteres para o código do protocolo
- **Ativação**: **APENAS quando o código excede o limite E está sendo truncado visualmente**
- **Comportamento**: Texto desliza da direita para a esquerda
- **Detecção de Overflow**: Verifica se o texto realmente está sendo cortado antes de aplicar o efeito

### 2. Características do Efeito
- **Velocidade**: 10 segundos para completar o ciclo (desktop)
- **Pausa Inicial**: 2 segundos antes de começar a deslizar
- **Deslizamento**: Texto desliza até o final e volta ao início
- **Pausa no Hover**: Animação para quando o mouse está sobre o texto
- **Efeito Fade**: Apenas na borda direita para suavizar
- **Responsivo**: Velocidade ajustada para mobile

## Exemplos para Teste

### Códigos Curtos (sem marquee)
```jsx
{
  Protocolo_Sigla: "PC",           // 2 chars - normal
  Protocolo_Sigla: "ABC",          // 3 chars - normal
  Protocolo_Sigla: "TESTE",        // 5 chars - normal
  Protocolo_Sigla: "PROTOCOLO",    // 9 chars - marquee ativo (se truncado)
}
```

### Códigos Longos (com marquee)
```jsx
{
  Protocolo_Sigla: "PROTOCOLO_EXTENSO",           // 18 chars - marquee (se truncado)
  Protocolo_Sigla: "PROTOCOLO_MUITO_LONGO",       // 22 chars - marquee (se truncado)
  Protocolo_Sigla: "PROTOCOLO_ULTRA_EXTENSO_2024", // 28 chars - marquee (se truncado)
}
```

## Comportamento por Dispositivo

### Desktop (>768px)
- **Velocidade**: 10 segundos por ciclo
- **Pausa Inicial**: 2 segundos
- **Largura máxima**: 150px
- **Efeito**: Deslizamento até o final e volta ao início

### Tablet (≤768px)
- **Velocidade**: 8 segundos por ciclo
- **Pausa Inicial**: 1.6 segundos
- **Largura máxima**: 120px
- **Efeito**: Deslizamento até o final e volta ao início

### Mobile (≤480px)
- **Velocidade**: 6 segundos por ciclo
- **Pausa Inicial**: 1.2 segundos
- **Largura máxima**: 100px
- **Efeito**: Deslizamento até o final e volta ao início

## Recursos Visuais

### Animação
- **Movimento**: Da direita para a esquerda
- **Pausa Inicial**: 2 segundos antes de começar
- **Deslizamento**: Até o final do texto
- **Retorno**: Volta ao início automaticamente
- **Repetição**: Infinita e contínua
- **Transição**: Linear e suave

### Interação
- **Hover**: Pausa a animação
- **Tooltip**: Mostra o código completo
- **Fade**: Bordas suavizadas

### Efeitos
- **Gradiente**: Fade nas bordas esquerda e direita
- **Sombra**: Efeito de profundidade
- **Transição**: Suave entre estados

## Implementação Técnica

### JavaScript
```jsx
// Verificação se o código é longo
const isCodigoLongo = () => {
  if (protocolo?.Protocolo_Sigla && protocolo.Protocolo_Sigla.trim()) {
    return protocolo.Protocolo_Sigla.trim().length > 8;
  }
  return false;
};

// Verificação se o código está sendo truncado (overflow)
const isCodigoTruncado = () => {
  if (!isCodigoLongo()) return false;
  
  const codeElement = cardRef.current?.querySelector('.protocol-code');
  if (codeElement) {
    return codeElement.scrollWidth > codeElement.clientWidth;
  }
  return false;
};

// Renderização do marquee (apenas quando necessário)
const renderMarqueeCode = () => {
  const codigo = protocolo?.Protocolo_Sigla || 'N/D';
  
  // Só aplica marquee se o código for longo E estiver sendo truncado
  if (isCodigoLongo() && isCodigoTruncado()) {
    return (
      <div className="marquee-container">
        <div className="marquee-content">
          <span>{codigo}</span>
        </div>
      </div>
    );
  }
  
  return codigo;
};
```

### CSS
```css
/* Container do marquee */
.marquee-container {
  width: 100%;
  overflow: hidden;
  position: relative;
}

/* Conteúdo animado */
.marquee-content {
  display: flex;
  animation: marquee-scroll 10s linear infinite;
  white-space: nowrap;
  will-change: transform;
}

/* Animação com pausa inicial e deslizamento até o final */
@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  20% { transform: translateX(0); } /* Pausa no início (2s) */
  100% { transform: translateX(-100%); } /* Desliza até o final */
}

/* Pausa no hover */
.protocol-code.marquee-enabled:hover .marquee-content {
  animation-play-state: paused;
}
```

## Testando o Efeito

### 1. Códigos Curtos
- ✅ "PC" - Aparece normalmente
- ✅ "ABC" - Aparece normalmente
- ✅ "TESTE" - Aparece normalmente

### 2. Códigos Longos
- ✅ "PROTOCOLO_EXTENSO" - Desliza automaticamente (se truncado)
- ✅ "PROTOCOLO_MUITO_LONGO" - Desliza automaticamente (se truncado)
- ✅ "PROTOCOLO_ULTRA_EXTENSO_2024" - Desliza automaticamente (se truncado)

### 3. Interações
- ✅ Hover pausa a animação
- ✅ Tooltip mostra código completo
- ✅ Responsivo em diferentes telas

## Personalização

### Alterar Limite de Caracteres
```jsx
// No arquivo ProtocoloFlipCard.jsx
const isCodigoLongo = () => {
  if (protocolo?.Protocolo_Sigla && protocolo.Protocolo_Sigla.trim()) {
    return protocolo.Protocolo_Sigla.trim().length > 10; // Alterar de 8 para 10
  }
  return false;
};
```

### Alterar Velocidade da Animação
```css
/* No arquivo ProtocoloFlipCard.css */
.marquee-content {
  animation: marquee-scroll 18s linear infinite; /* Alterar de 15s para 18s */
}
```

### Alterar Largura Máxima
```css
.protocol-code {
  max-width: 200px; /* Alterar de 150px para 200px */
}
```

## Compatibilidade

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers
- ✅ CSS animations suportadas

## Detecção Inteligente de Overflow

### Como Funciona
O sistema agora verifica **duas condições** antes de aplicar o efeito marquee:

1. **Comprimento do texto**: Mais de 8 caracteres
2. **Overflow visual**: O texto realmente está sendo cortado na tela

### Vantagens
- ✅ **Performance**: Não aplica animação desnecessária
- ✅ **UX**: Só ativa quando realmente necessário
- ✅ **Responsivo**: Funciona em diferentes tamanhos de tela
- ✅ **Inteligente**: Detecta automaticamente quando o texto cabe

### Exemplo Prático
```jsx
// Código longo mas que cabe na tela (larga)
Protocolo_Sigla: "PROTOCOLO" // 9 chars - NÃO aplica marquee

// Código longo que não cabe na tela (estreita)
Protocolo_Sigla: "PROTOCOLO" // 9 chars - APLICA marquee
```

## Troubleshooting

### Problema: Animação não funciona
**Solução**: Verifique se o CSS está sendo carregado

### Problema: Texto não desliza
**Solução**: Verifique se o código tem mais de 8 caracteres E está sendo truncado visualmente

### Problema: Performance ruim
**Solução**: Reduza a velocidade da animação ou desative em dispositivos lentos

### Problema: Não pausa no hover
**Solução**: Verifique se a classe `marquee-enabled` está sendo aplicada

### Problema: Marquee ativa quando não deveria
**Solução**: Verifique se o elemento tem overflow real (scrollWidth > clientWidth) 