import { User } from '@phosphor-icons/react'
import { useState } from 'react'

/**
 * A foto de quem está logado, com o boneco genérico como piso.
 *
 * Existe como componente por causa do piso, não da foto: a URL que vem do
 * Google é de um CDN de terceiro e um dia responde 404 — conta apagada, foto
 * trocada, política mudada. Sem o `onError`, o resultado é um ícone quebrado no
 * canto superior da home, que é o pior lugar possível para um.
 *
 * `alt=""` de propósito: quem envolve isto é sempre um botão com `aria-label`
 * ("Menu"), e descrever a foto por cima viraria leitura dupla.
 */
export function Avatar({
  src,
  size = 20,
  className = '',
}: {
  src?: string
  /** Tamanho do ícone de fallback; a foto sempre preenche o container. */
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed)
    return <User size={size} weight="bold" aria-hidden className={className} />

  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`h-full w-full rounded-control object-cover ${className}`}
    />
  )
}
