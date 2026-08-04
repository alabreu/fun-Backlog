# Acessibilidade

Guia prático para manter os apps nascidos deste template acessíveis (alvo:
WCAG 2.1 AA no que é relevante para PWAs mobile-first). O boilerplate já sai
conforme; este documento existe para **toda feature nova continuar conforme**.

## Contraste (o que mais pega)

- Texto normal: **≥ 4.5:1** contra o fundo em que aparece.
- Texto grande (≥ 18.5px bold ou ≥ 24px) e componentes de UI (bordas de input,
  ícones informativos): **≥ 3:1**.
- **Conferido automaticamente**: `npm run lint` roda `scripts/check-contrast.mjs`,
  que resolve primitivo → semântico em cada tema e falha se algum par cair
  abaixo do mínimo. Ao trocar a paleta de um app novo, rode o lint — ele cobre
  os temas claro E escuro. Para conferir um par novo à mão:
  [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/).
- Armadilhas comuns: texto `muted` com opacidade (`text-muted/70` quase sempre
  reprova), texto sobre foto (use overlay escuro por trás), estados
  `disabled` (podem reprovar, mas não devem ser o único indicador de nada).
- Cor nunca é o único sinal: acompanhe de ícone, texto ou peso (ex.: erro =
  texto + cor; ativo = check + cor).

## Teclado

- Tudo que faz algo é `<button>`/`<a>`/`<input>` — **nunca** `div`/`span` com
  `onClick` (eles não recebem foco nem Enter/Espaço).
- Foco visível: o `:focus-visible` global em `index.css` cuida disso — não
  remova outlines sem repor algo equivalente.
- Sheets/modais: **use o `Sheet` de `@ui/design`**, não reimplemente. Ele já
  garante o comportamento abaixo (e o `/design` deixa testar tudo isso à mão):
  - `Escape` fecha;
  - ao abrir, o foco entra no diálogo; ao fechar, **volta** para quem abriu;
  - Tab circula dentro (trap) enquanto aberto;
  - fechado, `invisible` tira o conteúdo do tab order e dos leitores de tela
    (só `translate-y-full` NÃO basta — os botões continuariam focáveis).
- Ordem de foco segue a ordem visual; não use `tabindex` positivo.

## Leitores de tela

- Botão só-ícone → `aria-label` (traduzido, via `t()`). Ícone decorativo ao
  lado de texto → `aria-hidden` (padrão nos componentes do template).
- Estado que só aparece visualmente precisa de contraparte semântica:
  - toggle/chip selecionado → `aria-pressed` (ver `FeedbackScreen`);
  - badge/contador → embuta no `aria-label` do controle (ver botão do menu na
    `HomeScreen`);
  - feedback assíncrono (toast, "enviado!", loading que termina) →
    `role="status"` no container (ver `UpdateToast` e a confirmação do
    feedback) — anuncia sem roubar o foco.
- Formulários: todo campo com `<label htmlFor>` (ou `aria-label`); mensagens de
  erro em texto (não só borda vermelha), perto do campo.
- Imagens: informativas com `alt` descritivo; decorativas com `alt=""`.
- Um `<h1>` por tela (o `ScreenHeader` já faz); hierarquia sem pular níveis.
- `document.documentElement.lang` acompanha o idioma escolhido (o `App.tsx` já
  faz) — leitores de tela pronunciam certo em pt e en.

## Movimento e toque

- `prefers-reduced-motion` é respeitado globalmente em `index.css` — animações
  novas em CSS/Tailwind já são cobertas; se usar framer-motion, use
  `useReducedMotion()`.
- Alvos de toque ≥ 40–44px (os botões do template têm 40px+; ícones pequenos
  ganham padding, não hitbox pequena).
- Nada pisca mais de 3x por segundo; nada depende de hover para ser descoberto.
- **Zoom sempre liberado**: nunca coloque `maximum-scale=1` / `user-scalable=no`
  no viewport (falha WCAG 1.4.4 — pessoas com baixa visão dependem do zoom).

## Checklist por feature nova

Antes de commitar uma tela/componente novo:

1. Dá para **operar só com teclado**? (Tab alcança tudo, Enter/Espaço ativam,
   Escape fecha o que abriu, o foco não some nem fica preso.)
2. Os textos e controles novos **passam de contraste** nos fundos em que
   aparecem?
3. Botões só-ícone têm `aria-label`? Estados visuais têm `aria-pressed`/
   `role="status"`/texto equivalente?
4. Formulário novo tem labels e erros em texto?
5. Rodou o **Lighthouse** (aba Accessibility) ou a extensão
   [axe DevTools](https://www.deque.com/axe/devtools/) na tela nova? Zere os
   erros apontados — eles pegam ~40% dos problemas; o checklist acima cobre o
   resto do que costuma escapar (foco, anúncios, semântica de estado).

## Teste rápido de leitor de tela (opcional, 5 min)

- iPhone: Ajustes → Acessibilidade → VoiceOver. Android: TalkBack.
- Percorra a tela nova deslizando: cada elemento anuncia nome + papel + estado?
  A ordem faz sentido? Ações completam?
