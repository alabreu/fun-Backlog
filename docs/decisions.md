# Decisões técnicas do Fun Backlog

Registro do que já foi decidido, para não reabrir a discussão a cada sessão.
O [`briefing.md`](./briefing.md) descreve o **produto** e foi escrito antes do
`app-boilerplate` existir na forma atual; onde os dois divergirem, **vale este
arquivo**, e o boilerplate é a referência técnica principal.

Formato: decisão, por quê, e o que ela custa. O custo importa tanto quanto o
ganho — é ele que justifica reabrir a decisão se o contexto mudar.

---

## 1. Stack: React + Vite, não Next.js

**Decidido em:** 04/08/2026.

O briefing imaginava Next.js (App Router) + shadcn/ui. O boilerplate é React +
Vite, e é a referência técnica principal — então Vite fica.

**Por quê:** trocar de trilho custaria portar i18n, PWA, admin, rotas, stores e
o design system inteiro antes da primeira feature do produto. O que o Next
traria de concreto aqui — SSR e SEO — é irrelevante num catálogo pessoal atrás
de login. O `vite-plugin-pwa` também é um caminho de PWA bem melhor resolvido
que o equivalente no Next, e PWA é requisito explícito do briefing.

**O que custa:** sem `next/image` para as capas. Na prática pesa pouco: TMDB e
IGDB já servem posters em vários tamanhos por CDN, e a escolha de tamanho vira
responsabilidade do `MediaProvider`.

**Sobre shadcn/ui:** não entra. O design system do template (`src/ui/design/`)
ocupa exatamente esse espaço, e o `npm run lint` quebra com classe crua de
Tailwind fora dele. Componente novo é variante nova ali dentro.

---

## 2. Chamadas com chave secreta: Supabase Edge Functions

**Decidido em:** 04/08/2026.

Todo acesso a API externa que exija chave (IGDB, TMDB, OpenRouter) roda em
Edge Function do Supabase — não no cliente, e não em Vercel Functions.

**Por quê:** o template já estabeleceu esse padrão com a function `llm`, e ela
já resolve auth, cota atômica por usuário e global, sanitização de entrada,
CORS em toda resposta (inclusive nas de erro) e telemetria de custo. Copiar
essa forma para `igdb`/`tmdb` custa menos que manter dois modelos de servidor
no mesmo app.

**O que custa:** o app passa a depender do Supabase para funcionar de verdade,
e o deploy tem duas metades (Vercel para o front, Supabase para as functions).

**Não confundir:** AniList e Open Library são públicas e sem chave — essas
podem ser chamadas direto do cliente, desde que o host entre no `connect-src`
da CSP no `vercel.json`.

---

## 3. Login obrigatório para busca e recomendação

**Decidido em:** 04/08/2026.

O boilerplate manda preservar "sem env vars o app roda 100% local". O Fun
Backlog preserva isso apenas parcialmente: em modo convidado dá para adicionar
item à mão, mas **busca de capa e "Me ajude a escolher" exigem login**.

**Por quê:** não é a imagem que precisa de login — a URL do poster é pública e
o `<img>` carrega direto do CDN, inclusive offline pelo service worker. Quem
precisa é a **busca**, que passa pela Edge Function porque carrega a chave da
API. Um endpoint nosso sem autenticação seria um proxy grátis de IGDB/TMDB para
a internet inteira, queimando a nossa cota. O login é o medidor: identifica
quem chamou e permite limitar por usuário.

**O que custa:** a primeira experiência do app sem login é pobre. Se isso
incomodar, a saída não é abrir o endpoint — é melhorar o estado vazio ou
oferecer login social de um toque.

---

## 4. LLM: OpenRouter com DeepSeek V4 Flash

**Decidido em:** 04/08/2026.

O briefing pedia "API do Claude" para a recomendação. Fica **OpenRouter**, com
o padrão do template: `deepseek/deepseek-v4-flash-latest`.

**Por quê:** é o padrão do boilerplate e a costura já existe pronta
(`core/llm/client.ts` + function `llm`). Um segundo caminho de LLM no mesmo app
significaria duplicar cota, telemetria e tratamento de erro.

**O que custa:** o modelo é mais barato e menos capaz que Claude. Se a
qualidade da justificativa da recomendação decepcionar, trocar é uma linha em
dois lugares (`defaultModel` na Edge Function e `byokModel` em
`core/llm/config.ts`, sempre em sincronia) — a `allowedModels` já lista
`anthropic/claude-opus-5` e `anthropic/claude-sonnet-5`.

**Ponto de atenção para a recomendação:** a function devolve **stream SSE**, e
o briefing pede **JSON estruturado** com fallback de parse. As duas coisas
convivem (acumular o stream e parsear no fim), mas é trabalho a fazer quando a
feature chegar.

---

## 5. Ordem dos providers: os públicos primeiro

**Decidido em:** 04/08/2026.

O briefing sugere começar pelos jogos (IGDB). A implementação começou por
**AniList (animes) e Open Library (livros)**.

**Por quê:** os dois são públicos e sem chave, então a busca com capa de
verdade funciona sem nenhuma configuração, sem Edge Function e sem login — é o
que torna o app testável de imediato, por qualquer pessoa com o link. IGDB e
TMDB entram na mesma lista `PROVIDERS` com `requiresServer: true`, e o
`searchAll` já os filtra sozinho para quem está sem sessão.

**O que custa:** jogos, filmes e séries só entram à mão até as functions
existirem — nenhuma mídia fica de fora, mas três delas ficam sem capa
automática.

---

## 6. Detalhe do item: bottom sheet, não rota

**Decidido em:** 04/08/2026.

**Por quê:** mudar status ou progresso é uma ação de dois toques a partir da
estante. Uma rota dedicada cobraria navegação, botão de voltar e a perda da
posição de scroll do grid por uma edição de um toque.

**O que custa:** o sheet não é linkável nem compartilhável, e cresce mal. Vale
reabrir quando o detalhe ganhar elenco, tempo estimado ou "onde assistir".

---

## Ainda em aberto

- **Identidade visual**: paleta (primitivos em `src/index.css`), ícones reais e
  a linguagem do grid de capas. Sessão própria, com opções — é a última etapa
  planejada.
- **Densidade por peso da mídia**: o briefing pede que um RPG de 80 horas não
  ocupe o mesmo espaço mental que um filme de 90 minutos. Hoje o grid é
  uniforme. As saídas plausíveis (capa maior ou span de duas colunas para
  mídias longas, agrupamento por tempo) são decisões visuais — ficam para a
  sessão de identidade.
- **Progresso ao mudar de status**: marcar "concluído" ainda não preenche o
  progresso até o total conhecido, nem o contrário. Falta decidir se isso é
  automático ou explícito.
- **HowLongToBeat**: sem API oficial — avaliar viabilidade antes de prometer
  tempo estimado como campo de primeira classe.
- **Merge de convidado para conta**: quem catalogou sem login e depois entra
  hoje não leva os itens locais para a nuvem. Precisa de uma decisão de produto
  (subir tudo, perguntar, ou ignorar).
