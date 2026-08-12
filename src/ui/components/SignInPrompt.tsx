import { useNavigate } from 'react-router'
import { Button } from '@ui/design'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * "ENTRE PARA BUSCAR JOGOS, FILMES E SÉRIES" — agora com um jeito de entrar.
 *
 * A frase existia desde o começo e era só TEXTO. Um testador procurou o jogo
 * Blasphemous, recebeu uma estante de livros e a recomendação de entrar, e não
 * tinha onde tocar: a tela nomeava o conserto e não o oferecia. O caminho de
 * verdade era abrir o menu do topo direito e achar "Entrar" — três toques
 * depois de uma frase que sugeria zero.
 *
 * É um beco sem saída que só o dono do app não vê, porque ele já está logado e
 * nunca lê esta linha.
 *
 * A EXIGÊNCIA DE LOGIN CONTINUA (decisão 3) e não é o que se conserta aqui: a
 * busca da IGDB e da TMDB passa pela Edge Function porque ela carrega a chave,
 * e um endpoint aberto seria um proxy grátis dessas APIs para a internet
 * inteira, com a nossa cota. O que estava errado era o beco, não a porta.
 *
 * `secondary` e não `primary`: a decisão principal desta tela é adicionar uma
 * obra, e um botão cheio aqui competiria com os resultados que a pessoa
 * conseguiu — livro e anime aparecem sem conta nenhuma.
 */
export function SignInPrompt() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-body text-muted">{t('add.needsLogin')}</span>
      <Button size="sm" variant="secondary" onClick={() => navigate('/login')}>
        {t('menu.login')}
      </Button>
    </span>
  )
}
