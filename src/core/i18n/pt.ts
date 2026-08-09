/** Mensagens em português — a fonte da verdade para as chaves de tradução. */
export const pt = {
  // Comum
  'common.back': 'Voltar',
  'common.cancel': 'Cancelar',
  'common.close': 'Fechar',
  'common.remove': 'Remover',

  // Home
  'home.menuButton': 'Menu',
  'home.suggestionsBody': 'Da sua fila, para você começar hoje.',
  'home.loading': 'Carregando sua estante…',
  'home.shelves': 'Suas estantes',
  'home.searchFab': 'Buscar ou adicionar',
  'home.progressHours': '{current} h',
  'home.emptyTitle': 'Sua estante está vazia',
  'home.emptyBody':
    'Adicione o primeiro jogo, filme, série, anime ou livro que você quer consumir.',
  'home.emptyAction': 'Adicionar o primeiro',

  // Estante de uma mídia
  'shelf.searchPlaceholder': 'Buscar nesta estante ou adicionar',
  'shelf.notOnShelf': 'Fora da sua estante',
  'shelf.sectionEmpty': 'Nada aqui',
  'shelf.emptyTitle': 'Nada nesta estante ainda',
  'shelf.emptyBody': 'O que você adicionar desta mídia aparece aqui.',

  // Mídias (plural, como nos filtros e nos grupos da busca)
  'media.game': 'Jogos',
  'media.movie': 'Filmes',
  'media.series': 'Séries',
  'media.anime': 'Animes',
  'media.book': 'Livros',

  // Status — universais e, onde a palavra muda, por mídia
  'status.backlog': 'Na fila',
  'status.paused': 'Pausado',
  'status.abandoned': 'Abandonado',
  'status.game.active': 'Jogando',
  'status.game.done': 'Zerado',
  'status.movie.active': 'Assistindo',
  'status.movie.done': 'Assistido',
  'status.series.active': 'Assistindo',
  'status.series.done': 'Terminada',
  'status.anime.active': 'Assistindo',
  'status.anime.done': 'Terminado',
  'status.book.active': 'Lendo',
  'status.book.done': 'Lido',

  // Catálogo (a estante)
  'catalog.add': 'Adicionar',
  'catalog.filterAll': 'Tudo',
  'catalog.searchPlaceholder': 'Buscar na estante',
  'catalog.count': '{count} de {total}',
  'catalog.emptyTitle': 'Sua estante está vazia',
  'catalog.emptyBody':
    'Adicione o primeiro jogo, filme, série, anime ou livro que você quer consumir.',
  'catalog.emptyAction': 'Adicionar o primeiro',
  'catalog.noMatchTitle': 'Nada com esse filtro',
  'catalog.noMatchBody': 'Tente outra mídia, outro status ou outra busca.',
  'catalog.guestNote':
    'Seus itens ficam só neste aparelho. Entre para sincronizar.',
  'catalog.loadError': 'Não deu para carregar sua estante agora.',

  // Adicionar item
  'add.title': 'Buscar',
  'add.searchLabel': 'Buscar',
  'add.searchPlaceholder': 'Buscar ou adicionar…',
  'add.searching': 'Buscando…',
  'add.someFailed': 'Uma das fontes não respondeu. O resto está aí embaixo.',
  'add.noResults': 'Nada encontrado para “{query}”.',
  'add.added': '“{title}” entrou na sua estante.',
  'add.addFailed': 'Não deu para adicionar. Tente de novo.',
  'add.removeFromShelf': 'Tirar da estante',
  'add.noSource':
    'Ainda não dá para buscar {media} por aqui. Você pode adicionar à mão.',
  'add.onShelf': 'Na sua estante',
  'add.needsLogin': 'Entre para buscar jogos, filmes e séries.',
  'add.fromLink': 'Link reconhecido — procurando pelo título.',
  'add.linkNotFound': 'Não encontramos essa obra a partir do link.',
  'add.manualLink': 'Não achou? Adicione à mão',
  'add.manualTitle': 'Adicionar à mão',
  'add.manualTitleLabel': 'Título',
  'add.manualTitlePlaceholder': 'Nome do jogo, filme, livro…',
  'add.manualMediaLabel': 'Mídia',
  'add.manualSubmit': 'Adicionar à estante',

  // Concluídos (a estante de troféus)
  'completed.title': 'Concluídos',
  'completed.seeShelf': 'Ver meus troféus',
  'completed.allYears': 'Tudo',
  'completed.yearHeading': 'Em {year}',
  'completed.statTotal': 'concluídos',
  'completed.statHours': 'horas de jogo',
  'completed.statEpisodes': 'episódios',
  'completed.statPages': 'páginas',
  'completed.emptyTitle': 'Nenhum troféu ainda',
  'completed.emptyBody':
    'Quando você terminar algo da sua estante, ele aparece aqui — com o ano em revista.',

  // Migração convidado -> conta
  'merge.title': 'Encontramos {count} itens neste aparelho',
  'merge.body':
    'Eles foram catalogados antes de você entrar. Quer trazer para a sua conta?',
  'merge.andMore': 'e mais {count}',
  'merge.confirm': 'Trazer para a minha conta',
  'merge.later': 'Agora não',
  'merge.working': 'Trazendo…',
  'merge.note':
    'Nada é apagado deste aparelho enquanto tudo não estiver na conta.',
  'merge.failed': 'Alguns itens não subiram. Tente de novo daqui a pouco.',

  // Item (detalhe)
  'item.statusLabel': 'Status',
  'item.progressLabel': 'Progresso',
  'item.progress.page': 'Página',
  'item.progress.episode': 'Episódio',
  'item.progress.hour': 'Horas',
  'item.progressOf': 'de {total}',
  'item.seasonEpisode': 'T{season} E{episode}',
  'item.seasonShort': 'T{season}',
  'item.closeSeason': 'Fechar temporada {season}',
  'item.progressPlusOneLabel': 'Marcar mais um episódio',
  'item.finishedPrompt': 'Você chegou ao fim.',
  'item.finishedConfirm': 'Marcar como concluída',
  'item.ratingLabel': 'Nota',
  'item.clearRating': 'Limpar',
  'item.favoriteAdd': 'Marcar como favorita',
  'item.favoriteRemove': 'Desmarcar como favorita',
  'item.ratingValue': '{value} de 5',
  'item.ratingClear': 'Tirar a nota',
  'item.notesLabel': 'Notas',
  'item.notesPlaceholder': 'O que você achou? Onde parou?',
  'item.addedAt': 'Adicionado em {date}',
  'item.completedAt': 'Concluído em {date}',
  'item.removeConfirm': 'Remover da estante?',
  'item.removed': 'Removido da estante.',
  'item.saveFailed': 'Não deu para salvar. Tente de novo.',
  'item.addToShelf': 'Adicionar à estante',
  'item.adding': 'Adicionando…',
  'item.readMore': 'Ler mais',
  'item.readLess': 'Ler menos',
  'item.inTheaters': 'Em cartaz',
  'item.synopsis': 'Sinopse',
  'item.people': 'Quem fez',
  'item.detailLoading': 'Carregando a ficha…',
  'item.detailFailed': 'Não deu para carregar a ficha completa.',

  // Rótulos dos dados que cada fonte entrega (ver MediaFact)
  'fact.runtime': 'Duração',
  'fact.episodes': 'Episódios',
  'fact.seasons': 'Temporadas',
  'fact.platforms': 'Plataformas',
  'fact.where': 'Onde assistir',
  'fact.players': 'Jogadores',
  'fact.buy': 'Onde comprar',
  'fact.episodeLength': 'Por episódio',

  // Menu (sheet do botão no topo direito)
  'menu.feedback': 'Enviar feedback',
  'menu.language': 'Idioma e região',
  'menu.news': 'Novidades',
  'menu.completed': 'Concluídos',
  'menu.nickname': 'Como me chamar',
  'menu.settings': 'Configurações',
  'menu.credits': 'Créditos',
  'menu.donate': 'Apoiar o app',
  'menu.login': 'Entrar',

  // Auth
  'auth.title': 'Entrar',
  'auth.subtitle': 'Entre para sincronizar seus dados em qualquer aparelho.',
  'auth.google': 'Continuar com Google',
  'auth.or': 'ou',
  'auth.email': 'Email',
  'auth.password': 'Senha',
  'auth.signIn': 'Entrar',
  'auth.signUp': 'Criar conta',
  'auth.toSignUp': 'Não tem conta? Criar',
  'auth.toSignIn': 'Já tem conta? Entrar',
  'auth.guestNote': 'Você pode continuar usando sem conta.',
  'auth.soon': 'O login estará disponível em breve.',
  'auth.passwordHint': 'Mínimo de {min} caracteres.',
  'auth.error.passwordTooShort':
    'A senha precisa de pelo menos {min} caracteres.',
  'auth.error.passwordLeaked':
    'Essa senha aparece em vazamentos conhecidos. Escolha outra.',
  'auth.error.passwordWeak': 'Essa senha é fraca demais. Escolha outra.',
  'auth.error.invalidCredentials': 'Email ou senha não conferem.',
  'auth.error.emailTaken':
    'Já existe uma conta com esse email. Tente entrar em vez de criar.',
  'auth.error.emailInvalid': 'Esse email não parece válido.',
  'auth.error.emailNotConfirmed':
    'Confirme seu email pelo link que enviamos antes de entrar.',
  'auth.error.rateLimited':
    'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  'auth.error.providerDisabled':
    'Esse jeito de entrar ainda não está disponível. Use email e senha.',
  'auth.error.notConfigured': 'O login estará disponível em breve.',
  'auth.error.offline': 'Sem conexão com o servidor. Confira sua internet.',
  'auth.error.unknown': 'Não deu para entrar. Tente de novo em instantes.',
  'auth.signedInAs': 'Conectado como',
  'auth.signOut': 'Sair',

  // Feedback
  'feedback.title': 'Enviar feedback',
  'feedback.intro': 'Sua opinião ajuda a melhorar o app. Conte o que achou.',
  'feedback.typeLabel': 'Tipo',
  'feedback.type.bug': 'Problema',
  'feedback.type.idea': 'Ideia',
  'feedback.type.other': 'Outro',
  'feedback.messageLabel': 'Mensagem',
  'feedback.messagePlaceholder': 'O que aconteceu? O que podia ser melhor?',
  'feedback.emailLabel': 'Seu email (opcional)',
  'feedback.emailPlaceholder': 'para retornarmos, se precisar',
  'feedback.send': 'Enviar',
  'feedback.sentTitle': 'Obrigado!',
  'feedback.sentBody': 'Recebemos seu feedback. 🙌',
  'feedback.sentMailBody': 'Abrimos seu email com o feedback — é só enviar. 🙌',
  'feedback.error':
    'Não foi possível enviar agora. Tente de novo em instantes.',
  'feedback.another': 'Enviar outro',

  // Doações
  'donate.title': 'Apoiar o app',
  'donate.body':
    'Este app é gratuito. Se ele é útil pra você, uma doação de qualquer valor ajuda a manter os servidores e o desenvolvimento.',
  'donate.button': 'Fazer uma doação',
  'donate.thanks': 'Qualquer valor faz diferença. Obrigado! 💜',
  'donate.soon': 'As doações estarão disponíveis em breve.',

  // Como quer ser chamado (vocativo da saudação)
  'nickname.title': 'Como quer ser chamado',
  'nickname.subtitle':
    'É assim que a home vai te cumprimentar. Deixe em branco para não usar nenhum.',
  'nickname.previewLabel': 'Prévia',
  'nickname.customLabel': 'Como quer ser chamado',
  'nickname.customPlaceholder': 'Capitã, Xerife, Mestre…',
  'nickname.customHint': 'Até {max} caracteres.',

  // Configurações
  'settings.title': 'Configurações',
  'settings.themeLabel': 'Aparência',
  'settings.theme.system': 'Seguir o sistema',
  'settings.theme.light': 'Claro',
  'settings.theme.dark': 'Escuro',
  'settings.themeHint':
    'Seguir o sistema acompanha o ajuste do seu aparelho, inclusive a troca automática à noite.',
  'settings.greetingLabel': 'Saudação',
  'settings.nicknameNone': 'Nenhum',
  'settings.catalogLabel': 'Catálogo',
  'settings.aboutLabel': 'Sobre',

  // Categorias: o que você quer ver, e em que ordem
  'categories.title': 'Editar categorias',
  'categories.intro':
    'Desligue o que você não consome e arraste para escolher a ordem. Vale na home, na busca e nos filtros.',
  'categories.itemCount': '{count} na estante',
  'categories.itemCountEmpty': 'Nada na estante',
  'categories.hidden': 'Escondida',
  'categories.handle': 'Reordenar {name}',
  'categories.moved': '{name}, posição {position} de {total}',
  'categories.keyboardHint':
    'Pelo teclado: chegue na alça com Tab e use as setas para cima e para baixo.',
  'categories.lastOneHint':
    'Pelo menos uma categoria precisa ficar ligada.',

  // Créditos das fontes de dados
  'credits.title': 'Créditos',
  'credits.iconsLabel': 'Ícones',
  'credits.icons':
    'Os ícones do app vêm de duas bibliotecas abertas, ambas sob licença MIT.',
  'credits.intro':
    'O Fun Backlog não teria capa nenhuma sem estas fontes. Todas são usadas dentro dos termos delas.',
  'credits.igdb': 'Jogos: ficha, capa, ano e plataformas.',
  'credits.tmdb': 'Filmes e séries: ficha, pôster e título em português.',
  // Atribuição EXIGIDA pela licença gratuita da TMDB — não traduzir nem
  // remover. Ver docs/decisions.md, decisão 8.
  'credits.tmdbNotice':
    'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  'credits.justwatch':
    'Onde assistir: em quais serviços cada filme, série ou anime está no seu país.',
  'credits.anilist': 'Animes: ficha, capa e total de episódios.',
  'credits.openlibrary': 'Livros: ficha, capa e número de páginas.',
  'credits.googlebooks':
    'Livros que a Open Library não tem, e onde comprá-los.',

  // Idioma e região
  'language.title': 'Idioma e região',
  'language.subtitle': 'Escolha o idioma do app.',
  'language.languageSection': 'Idioma',
  'language.regionSection': 'País',
  'language.regionSubtitle':
    'Define onde procuramos cada obra: quais streamings têm o filme, onde comprar o livro, se ainda está em cartaz.',

  // Novidades (changelog)
  'news.title': 'Novidades',
  'news.subtitle': 'O que há de novo no app.',
  'news.badgeNew': 'novo',

  // Admin (painel do operador — /admin)
  'admin.title': 'Admin',
  'admin.restricted': 'Área restrita.',
  'admin.users': 'Usuários',
  'admin.dau': 'DAU',
  'admin.wau': 'WAU',
  'admin.mau': 'MAU',
  'admin.feedback': 'Feedbacks',
  'admin.sessionsByDay': 'Sessões por dia (30d)',
  'admin.noData': 'Sem dados ainda.',
  'admin.feedbackInbox': 'Feedback recebido',
  'admin.feedbackEmpty': 'Nenhum feedback ainda.',

  // Toast de atualização
  'update.available': 'Nova versão disponível',
  'update.action': 'Atualizar',
  'update.updating': 'Atualizando…',
  'update.dismiss': 'Dispensar',
}
