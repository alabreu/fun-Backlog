import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

/**
 * Campos de formulário. `Field` existe para tornar o rótulo o caminho de menor
 * resistência: ele gera o id e faz o `htmlFor`, então ninguém precisa lembrar de
 * amarrar os dois na mão (rótulo solto é a falha de acessibilidade mais comum em
 * formulário).
 *
 * `text-input` (16px) e não `text-body` (14px): abaixo de 16px o Safari do iOS
 * dá zoom sozinho ao focar o campo, e a tela inteira salta. Ver o comentário do
 * token em src/index.css — desabilitar o zoom no viewport não é opção.
 */
const CONTROL =
  'w-full rounded-field bg-ink/5 px-4 py-3 text-input text-ink outline-none ring-1 ring-ink/10 placeholder:text-muted focus:ring-2 focus:ring-primary/40'

export function Input({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} ${className}`} {...rest} />
}

export function Textarea({
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={`${CONTROL} resize-none ${className}`} {...rest} />
  )
}

export interface FieldProps {
  label: string
  /**
   * Explicação curta abaixo do controle (limite de caracteres, formato). NÃO
   * use para mensagem de erro: erro precisa de `role="alert"` para ser
   * anunciado na hora, e isto aqui é texto estático.
   */
  hint?: string
  /**
   * Recebe o id gerado — passe para o controle. O segundo argumento é o id da
   * dica, quando há uma: repasse como `aria-describedby` para que o leitor de
   * tela leia a dica junto do campo, em vez de deixá-la órfã na página.
   */
  children: (id: string, describedBy?: string) => ReactNode
  className?: string
}

export function Field({ label, hint, children, className = '' }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-label font-semibold uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="mt-1.5 text-label text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
