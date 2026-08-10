import { MagnifyingGlass, X } from '@phosphor-icons/react'

/**
 * A barra de busca FLUTUANTE do rodapé.
 *
 * Ela era um campo comum no topo do corpo rolável, e o problema era de alcance:
 * num telefone segurado com uma mão, o topo da tela é justamente o canto mais
 * longe do polegar — e a busca é a ação mais repetida da estante. No rodapé ela
 * fica onde a mão já está, e o conteúdo ganha a primeira dobra inteira.
 *
 * FLUTUA SOBRE O CONTEÚDO, com fundo translúcido + `backdrop-blur`: o que passa
 * por trás continua legível como textura, e a barra não corta a estante em duas.
 * Opaca ela viraria um rodapé fixo, que é outra coisa — pesa mais e some com a
 * sensação de que a lista continua debaixo dela.
 *
 * A translucidez é de 85%, e não menos: abaixo disso a capa que passa por trás
 * começa a disputar com o texto digitado, e o contraste do placeholder deixa de
 * ser o que o `check-contrast` verifica sobre `surface`.
 *
 * `absolute` e não `fixed` — a mesma razão do `Fab`: o app vive numa coluna
 * centralizada com largura de telefone, e `fixed` grudaria a barra na borda da
 * JANELA, longe da coluna no desktop. O retângulo de referência é o `Screen`,
 * que é `relative`.
 *
 * Quem usa precisa deixar respiro no fim do corpo rolável, senão as últimas
 * capas ficam embaixo da barra — é para isso que existe o `bottomBar` do
 * `ScreenBody`.
 *
 * O ANEL DE FOCO FICA NO INVÓLUCRO (`focus-within`) e não no `input`: quem
 * desenha a borda arredondada aqui é a caixa de fora, e um anel no campo
 * transparente lá dentro apareceria desencontrado dela.
 */
export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Vale como `aria-label` E como placeholder — o campo não tem rótulo visível. */
  label: string
  /** Rótulo do X. Sem ele o botão de limpar não aparece. */
  clearLabel?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  label,
  clearLabel,
  className = '',
}: SearchBarProps) {
  return (
    // `pt-3` porque a barra flutua: sem ele, a capa que rola por trás encosta
    // no topo da caixa e a borda arredondada some no meio do desenho.
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 px-gutter pb-4 pt-3 ${className}`}
    >
      <div className="pointer-events-auto relative rounded-control bg-surface/85 shadow-lg ring-1 ring-ink/10 backdrop-blur-xl focus-within:ring-2 focus-within:ring-primary/40">
        <MagnifyingGlass
          size={18}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        {/* O CAMPO OCUPA A CAIXA INTEIRA, com o ícone e o X flutuando por cima
            dele. Como irmãos num flex — que foi a primeira tentativa — o
            `input` ficava mais estreito que a caixa, e o contorno global de
            `:focus-visible` desenhava uma segunda pílula por dentro da barra,
            desencontrada dela.
            `bg-transparent`: o fundo (e o desfoque) é da caixa de fora — dois
            fundos empilhados deixariam a barra opaca de novo.
            O `::-webkit-search-cancel-button` sai porque `type="search"` já
            traz um X próprio no Chrome, sem rótulo e fora do design system:
            com o nosso ao lado, a barra ficava com DOIS X. */}
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          placeholder={label}
          className={`w-full rounded-control bg-transparent py-3 pl-11 text-input text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none ${
            clearLabel ? 'pr-14' : 'pr-4'
          }`}
        />
        {/* O X só existe com texto: um alvo permanente que na maior parte do
            tempo não faz nada é ruído no canto mais visitado da tela. 44px de
            alvo (WCAG 2.5.5) pelo `p-3` em volta de um ícone de 18px. */}
        {clearLabel && value.length > 0 && (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 flex -translate-y-1/2 p-3 text-muted transition active:scale-90"
          >
            <X size={18} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
}
