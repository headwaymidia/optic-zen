## Causa do bug

O wrapper da página em `src/pages/WhatsApp.tsx` (linha 216) usa altura calculada com `100dvh`:

```
h-[calc(100dvh-3.5rem-5rem)] ... data-[chat=open]:h-[100dvh] ...
```

Esse wrapper já está **dentro** do `<main className="flex-1 min-h-0 overflow-auto pb-20 ...">` em `src/components/AppLayout.tsx`, que tem altura real menor que `100dvh` (subtrai header e, em mobile sem chat-fullscreen, o BottomNav).

Resultado: o filho é mais alto que o pai → o `<main>` ganha barra de rolagem expondo um vazio. Em mobile, como `100dvh` cresce quando a barra de URL do navegador retrai durante o scroll, a altura recalcula e o scroll "nunca para" — cada scroll dispara novo recálculo e mais espaço aparece embaixo.

## Correção (apenas CSS no wrapper)

Em `src/pages/WhatsApp.tsx` linha 216, substituir o cálculo de altura por `h-full`, deixando o `<main>` (já com `min-h-0 overflow-auto`) ser a única fonte de altura. Remover também o `data-[chat=open]:h-[100dvh]` e variantes md/lg — não são mais necessárias, pois o AppLayout já trata `body[data-chat-fullscreen]` removendo o `pb-20` do `<main>`.

Antes:
```tsx
<div className="flex h-[calc(100dvh-3.5rem-5rem)] md:h-[calc(100dvh-3.5rem-5rem)] lg:h-[calc(100dvh-3.5rem)] data-[chat=open]:h-[100dvh] md:data-[chat=open]:h-[calc(100dvh-3.5rem-5rem)] lg:data-[chat=open]:h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-background" data-chat={selected ? "open" : "closed"}>
```

Depois:
```tsx
<div className="flex h-full w-full overflow-hidden bg-background" data-chat={selected ? "open" : "closed"}>
```

Isso garante:
- O wrapper nunca excede a altura real do `<main>`, então o `<main>` para de rolar.
- A cadeia interna `flex-1 min-h-0` até o `MessageThread` continua intacta — a única área rolável é a thread, e ela só rola quando há mensagens suficientes.
- O atributo `data-chat={selected ? "open" : "closed"}` é mantido (pode ser útil para CSS futuro), só removemos as variantes de altura.

## Verificação

Após o ajuste, abrir o chat no preview (mobile e desktop) e confirmar:
1. Não há mais scroll vertical fora da MessageThread.
2. Com poucas mensagens, não dá pra rolar pra baixo (sem espaço vazio).
3. Com muitas mensagens, o scroll da thread funciona normalmente e para no fim.

Nenhuma lógica de envio, deduplicação ou edge function é tocada.