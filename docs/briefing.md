# Fun Backlog — Briefing do Projeto

> **Nota de leitura (04/08/2026).** Este briefing foi escrito antes do
> `app-boilerplate` existir na forma atual, e é preservado como está — ele é a
> fonte da verdade sobre **produto**. Onde ele fala de **stack e arquitetura**
> (a seção "Stack", a menção a Next.js/shadcn e a "API do Claude"), quem manda é
> [`decisions.md`](./decisions.md).

Vou construir um app chamado **Fun Backlog**. Antes de escrever qualquer código, leia este briefing inteiro, faça as perguntas que precisar, e proponha um plano de execução. Não comece a implementar até eu aprovar o plano.

## O produto

Fun Backlog é um app para catalogar e gerenciar coisas divertidas que você quer consumir: jogos, filmes, séries, animes e livros. **Explicitamente não é um gerenciador de tarefas.** Nada de trabalho, nada de rotina, nada de produtividade. Se uma feature parece algo que o Todoist teria, ela não pertence aqui.

O problema central que ele resolve: pessoas acumulam backlogs gigantes de entretenimento e ficam paralisadas na hora de escolher o que consumir. O app precisa (a) tornar o catálogo bonito de olhar e fácil de alimentar, e (b) resolver a paralisia de escolha.

## Plataforma

**MVP é web, entregue como PWA.** Instalável, funcional em mobile, com service worker para cache de assets e capas. Layout mobile-first — na prática vou usar isso muito no celular, no sofá, decidindo o que jogar.

Apps nativos são um objetivo futuro. Não construa para isso agora, mas evite decisões que fechem essa porta: mantenha a lógica de negócio separada da camada de UI, e prefira uma API bem definida entre cliente e servidor em vez de acoplar tudo em server components. Se alguma escolha de arquitetura tiver impacto relevante numa futura versão nativa, me avise na hora de decidir.

## Princípios de design (não negociáveis)

1. **O app deve parecer uma estante, não uma planilha.** Capas e posters são o elemento visual primário. Grid de artwork, não lista de texto.
2. **Delight importa tanto quanto função.** Transições, micro-interações, feedback ao completar um item. Deve dar prazer usar.
3. **Fricção zero para adicionar.** Se adicionar um item leva mais de 5 segundos, o app falhou.
4. **Densidade visual respeitando o peso.** Um RPG de 80 horas e um filme de 90 minutos não devem ocupar o mesmo espaço mental na interface.

Sou designer de formação — vou ter opiniões fortes sobre a UI e vou iterar bastante nela. Quando propuser interface, me mostre opções em vez de assumir. Evite qualquer coisa que pareça template de admin dashboard: nada de sidebar cinza com ícones genéricos, nada de cards com sombra padrão do Tailwind, nada de paleta azul-corporativo.

## Ponto de partida

Tenho um projeto template chamado **`app-boilerplate`** que já vem com o setup básico que replico em todos os meus projetos. **Inicie o Fun Backlog a partir dele.** Antes de propor qualquer coisa, inspecione o template: leia o `README`, o `package.json`, a estrutura de pastas e as convenções que já existem ali. O que o boilerplate já resolve, herde — não reinvente. Se algo no template conflitar com as necessidades deste projeto, me aponte em vez de sobrescrever silenciosamente.

A seção de Stack abaixo descreve o que eu tinha em mente de forma independente; use-a para avaliar o que o boilerplate já traz e o que precisa ser adicionado por cima.

## Stack

**Avalie e decida você**, respeitando o que o `app-boilerplate` já estabelece. Abaixo está o que eu tinha em mente, mas é ponto de partida para discussão, não requisito. Se você conhece um caminho melhor para os objetivos deste projeto, argumente — quero a recomendação com trade-offs antes de fixarmos qualquer coisa.

O que eu havia pensado:

- Next.js (App Router) + TypeScript
- Supabase para auth, Postgres e storage
- Tailwind + shadcn/ui como base, com tema fortemente customizado
- Framer Motion para animação
- API do Claude para a feature de recomendação
- Deploy na Vercel

Critérios que importam na escolha: qualidade da experiência PWA, facilidade de animação rica, custo baixo em escala pequena, e caminho razoável para nativo depois. Já tenho outros projetos rodando em Claude Code, então familiaridade também conta — mas não a ponto de escolher a ferramenta errada.

## Modelo de dados

O desafio central é que as cinco mídias têm metadados diferentes e "progresso" significa coisas diferentes em cada uma. Quero uma tabela `items` unificada com campos comuns, mais um campo de metadados flexível para o que é específico de cada mídia. Proponha o schema e discuta comigo antes de criar as migrations.

Campos comuns que já sei que preciso:

`id`, `user_id`, `media_type`, `title`, `cover_url`, `external_ids`, `status`, `added_at`, `started_at`, `completed_at`, `rating`, `notes`, `tags`

Status precisa ser flexível por mídia. Um jogo pode estar "zerado" mas não "platinado". Uma série pode estar "em dia" esperando episódio novo. Um livro pode estar "abandonado no capítulo 3". Pense em como modelar isso sem virar uma bagunça de enums.

Progresso também varia: página atual (livro), episódio atual (série/anime), horas jogadas (jogo), nada (filme).

## Fontes de dados externas

Cada mídia tem uma API para buscar capa e metadados. Encapsule cada uma atrás de uma interface comum (`MediaProvider`) para que o resto do app não saiba de onde veio o dado:

- **Jogos:** IGDB (via Twitch API, precisa de client_id + secret). Complemento: HowLongToBeat para tempo estimado — não tem API oficial, avalie a viabilidade e me diga se vale a pena.
- **Filmes e séries:** TMDB. API gratuita, excelente, posters em vários tamanhos.
- **Animes:** AniList (GraphQL, público e generoso). Prefira sobre MyAnimeList.
- **Livros:** Open Library como primária, Google Books como fallback (Open Library tem buracos de cobertura e capas ruins às vezes).

Todas as chaves ficam em variáveis de ambiente e as chamadas acontecem no servidor — nunca expor no client.

## Features

### 1. Catálogo (core)

Grid de capas com filtro por mídia, status e tags. Busca. Ordenação. Visualização alternativa em lista compacta para quem tem backlog gigante. Detalhe do item em modal ou página dedicada — proponha o que faz mais sentido.

### 2. Adicionar item

Busca unificada: eu digito "Hollow Knight", o app busca na API certa e me devolve resultados com capa. Um clique adiciona. Se eu não especificar a mídia, busque em todas e agrupe os resultados por tipo.

### 3. Coleta inteligente

**Colar link:** eu colo uma URL, o app identifica o domínio, extrai o ID e busca os metadados. Precisa cobrir: `store.steampowered.com`, `imdb.com`, `letterboxd.com`, `myanimelist.net`, `anilist.co`, `goodreads.com`. Se o domínio não for reconhecido, tente extrair Open Graph tags da página como fallback e me deixe confirmar/corrigir antes de salvar.

No PWA, considere registrar o app como target da Web Share API — assim eu compartilho direto do navegador do celular para o Fun Backlog.

**Import de biblioteca:**

- *Steam:* API pública `GetOwnedGames`. Usuário fornece SteamID (ou vanity URL, que precisa ser resolvida antes) e o perfil precisa ser público. Traga jogos com playtime — jogos com 0 horas são candidatos óbvios ao backlog. Faça o matching dos títulos Steam com IGDB para pegar capas melhores.
- *Letterboxd:* não tem API pública. Usuário baixa o CSV de export do próprio perfil e faz upload. Parseie e case os títulos com TMDB.
- *AniList:* GraphQL público, dá pra puxar a lista do usuário direto pelo username.

Todo import precisa de uma tela de revisão antes de commitar: mostrar o que vai ser adicionado, deixar eu desmarcar itens, sinalizar duplicatas e matches de baixa confiança.

### 4. "Me ajude a escolher"

A feature de assinatura. Estou com 60 jogos no backlog e não consigo decidir. O app pergunta em que mood eu estou e sugere um item.

O mood picker **não pode ser um formulário**. Nada de dropdown "selecione seu humor". Pense em cartões, cores, gradientes, escolhas visuais. Deve ser gostoso de usar em si.

Dimensões de mood que fazem sentido capturar: energia disponível (algo leve ou algo para me investir), tempo disponível (40 minutos ou a tarde toda), tom emocional (rir, chorar, pensar, adrenalina), e novidade (algo novo ou algo de conforto).

A chamada pro modelo recebe: o backlog filtrado (título, mídia, tempo estimado, tags, gêneros — não mande o backlog inteiro se for grande, filtre antes por tempo disponível e mídia), mais o mood. Retorna 1 recomendação principal + 2 alternativas, cada uma com uma frase curta explicando *por que* aquilo combina com o mood. A justificativa é o que faz a feature parecer mágica em vez de aleatória.

Peça resposta em JSON estruturado, parseie com segurança, e tenha fallback se o parse falhar.

A apresentação do resultado é momento de delight: revelação animada, capa em destaque, não uma lista de bullet points.

### 5. Completar um item

Marcar algo como terminado deve ter recompensa visual. Animação, o item saindo da estante, algum feedback que dê satisfação. Guardar data de conclusão e nota opcional. Pensar em uma visão de "concluídos" que funcione como troféu — o ano em revista, quantas horas de jogo, quantos livros.

## Prioridade de execução

Não construa tudo de uma vez. Ordem sugerida (discuta se discordar):

1. Partir do `app-boilerplate`, inspecionar o que ele já traz, e adaptar o setup, schema e auth ao que faltar
2. CRUD manual de itens + provider de uma mídia só (comece por jogos/IGDB)
3. O grid — investir tempo aqui, é a cara do app
4. Demais providers de mídia
5. Colar link
6. Mood picker + recomendação
7. Imports de biblioteca
8. PWA completo (manifest, service worker, offline, instalação)
9. Polimento, animações, tela de concluídos

## Como quero trabalhar

- Sou designer, não desenvolvedor. Entendo lógica de programação em nível de superfície e front-end razoavelmente, mas explique decisões de arquitetura em vez de só executar.
- Quando houver uma escolha técnica relevante, me apresente as opções com trade-offs em vez de decidir sozinho.
- Commits pequenos e frequentes.
- Escreva um `CLAUDE.md` com as convenções do projeto para as próximas sessões.
- Português nas conversas, inglês no código e nos commits.

Comece lendo isso, me fazendo as perguntas que ficaram em aberto, e propondo o plano da primeira sessão.
