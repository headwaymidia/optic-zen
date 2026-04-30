# Restaurar verde esmeralda + Logo de 300px na tela de login

## O que muda

Apenas `src/pages/Auth.tsx`. Sem mudanças em design tokens globais — os ajustes de cor e tamanho são locais à tela de login.

### 1. Logo (lado claro — esquerda)
- Remover `maxHeight: 110` e `maxWidth: 320` do container e da imagem.
- Forçar `width: 300px` e `height: auto` no `<img>`.
- Manter `object-contain` para preservar proporção e o texto "Powered by".
- Margem inferior de **60px** entre logo e o título "Acesse seu painel".

### 2. Logo (lado escuro — direita)
- Mesma regra: `width: 300px`, `height: auto`, sem `max-height`.
- Usa o SVG branco (`logo-otica-dominante-white.svg`) sobre o fundo escuro.

### 3. Botão "Entrar na Plataforma" (componente `SubmitButton`)
- Voltar para verde esmeralda vivo: `bg-emerald-500 hover:bg-emerald-600`.
- Texto em **branco**.
- Cantos arredondados: `border-radius: 8px`.
- Remover o estilo inline ciano `#00E5FF`.

### 4. Ícones de destaque (componente `CheckDot` — bullets do painel direito)
- Voltar para verde esmeralda: fundo `bg-emerald-400/20`, borda `border-emerald-400/40`, ponto central `bg-emerald-400`.
- Remover os estilos inline ciano.

## O que NÃO muda

- Estrutura do grid 50/50, padding vertical (80px) da coluna esquerda, tipografia do título (32px / extra-bold) e subtítulo (16px cinza).
- Copy do painel direito (selo, headline, bullets).
- Rodapé "© 2026 Ótica Dominante · Powered by Headway Mídia".
- Sidebar e Onboarding (logo já está bem dimensionada lá).

## Resultado esperado

- Logo horizontal imponente (300px de largura) em ambos os lados, com "ÓTICA DOMINANTE" e a assinatura "Powered by" totalmente legíveis.
- CTA verde esmeralda vibrante com texto branco e cantos suaves de 8px.
- Bullets do painel direito com check verde, mantendo coerência visual com o botão.
