/**
 * Um número em destaque com seu rótulo. O padrão já existia solto no painel de
 * admin; virou componente porque a tela de concluídos precisa do mesmo — e
 * porque "número grande + rótulo pequeno" é exatamente o tipo de coisa que
 * diverge em pixel quando cada tela redesenha por conta.
 *
 * `emphasis` marca o número principal da tela (o total de itens concluídos),
 * que o briefing quer como troféu e não como célula de planilha.
 */
export interface StatProps {
  value: string | number
  label: string
  emphasis?: boolean
}

export function Stat({ value, label, emphasis = false }: StatProps) {
  return (
    <div className="rounded-card bg-surface px-3 py-4 text-center ring-1 ring-ink/5">
      <p
        className={`font-extrabold tabular-nums ${
          emphasis ? 'text-display text-accent' : 'text-metric'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-label uppercase tracking-wide text-muted">
        {label}
      </p>
    </div>
  )
}
