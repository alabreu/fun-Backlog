/**
 * Interruptor de liga/desliga.
 *
 * `role="switch"` e não checkbox: para quem usa leitor de tela a diferença é
 * ouvir "ligado/desligado" em vez de "marcado/não marcado" — e a primeira é a
 * frase certa para algo que muda o app na hora, sem botão de salvar.
 *
 * É um `<button>` e não um `<input>` estilizado porque input tem aparência
 * própria em cada navegador e escondê-la sempre acaba em gambiarra
 * (`appearance-none` + pseudo-elementos). O botão nasce sem opinião visual.
 *
 * O RÓTULO É OBRIGATÓRIO e não visível: o interruptor mora ao lado do nome da
 * coisa que ele liga, e repetir "Anime" duas vezes na tela seria ruído. Mas
 * quem navega por leitor de tela chega no controle sem o contexto da linha, e
 * "ligado" sozinho não diz ligado o quê.
 */
export interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Nome acessível: "Anime". Não aparece na tela. */
  label: string
  /** Impede a mudança e explica visualmente que ali não há escolha. */
  disabled?: boolean
  className?: string
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-control transition-colors disabled:opacity-40 ${
        checked ? 'bg-primary' : 'bg-ink/15'
      } ${className}`}
    >
      {/* A bolinha. Ligada usa o par `primary`/`on-primary`, que existe
          justamente para garantir contraste um sobre o outro; desligada usa
          `muted`, que se vê tanto sobre o trilho apagado quanto sobre o fundo
          do cartão. Um único tom para os dois estados sumiria em um deles,
          porque no tema escuro `primary` é CLARO e no claro é escuro.

          A posição também muda, não só a cor: cor sozinha nunca é o único
          sinal de estado (WCAG 1.4.1).

          `transition-transform` e não `left`: transform anima na GPU e não
          obriga o navegador a recalcular layout a cada quadro. */}
      <span
        aria-hidden
        className={`absolute left-1 top-1 h-5 w-5 rounded-control shadow transition-transform ${
          checked ? 'translate-x-5 bg-on-primary' : 'translate-x-0 bg-muted'
        }`}
      />
    </button>
  )
}
