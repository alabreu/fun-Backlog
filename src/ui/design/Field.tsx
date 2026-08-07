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
 */
const CONTROL =
  'w-full rounded-field bg-ink/5 px-4 py-3 text-body text-ink outline-none ring-1 ring-ink/10 placeholder:text-muted focus:ring-2 focus:ring-primary/40'

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
  /** Recebe o id gerado — passe para o controle. */
  children: (id: string) => ReactNode
  className?: string
}

export function Field({ label, children, className = '' }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-label font-semibold uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      {children(id)}
    </div>
  )
}
