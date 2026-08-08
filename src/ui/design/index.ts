/**
 * COMPONENTES do design system: a ÚNICA porta de entrada para estilo de UI.
 *
 * Nomenclatura (importa, porque "primitivo" é sobrecarregado): aqui são
 * COMPONENTES. "Primitivo" neste projeto significa a camada 1 de tokens — os
 * valores crus, sem significado, em `:root` no src/index.css. Sobre eles ficam
 * os tokens SEMÂNTICOS (@theme), e são eles que estes componentes consomem.
 *
 *   primitivos (--palette-*)  →  semânticos (--color-*)  →  componentes (aqui)
 *
 * Estes são os componentes GENÉRICOS, sem conhecimento do produto. Composições
 * específicas do app (MenuSheet, ScreenHeader) vivem em src/ui/components/.
 *
 * Regra (ver CLAUDE.md): tela nova compõe estes componentes. Classe crua do
 * Tailwind só para layout local (flex, gap, grid) ou quando o caso realmente não
 * existe aqui — e aí o certo é adicionar a variante ao componente, não deixar a
 * classe solta na tela.
 */
export { Avatar } from './Avatar'
export { Badge } from './Badge'
export type { BadgeProps, BadgeTone } from './Badge'
export { Button, buttonClasses } from './Button'
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button'
export { Card } from './Card'
export { Cover, CoverGrid } from './Cover'
export { CoverAction } from './CoverAction'
export type { CoverProps } from './Cover'
export { Fab } from './Fab'
export type { FabProps } from './Fab'
export type { CardPadding, CardProps } from './Card'
export { Chip } from './Chip'
export type { ChipProps } from './Chip'
export { Field, Input, Textarea } from './Field'
export type { FieldProps } from './Field'
export { IconButton } from './IconButton'
export type { IconButtonProps } from './IconButton'
export { MediaDot } from './MediaDot'
export { MEDIA_BG, MEDIA_TEXT } from './media'
export { NavRow } from './NavRow'
export type { NavRowProps } from './NavRow'
export { Rail, RailItem } from './Rail'
export { Screen, ScreenBody } from './Screen'
export type { ScreenBodyProps } from './Screen'
export { SectionTitle } from './SectionTitle'
export type { SectionTitleProps } from './SectionTitle'
export { Stat } from './Stat'
export type { StatProps } from './Stat'
export { Sheet } from './Sheet'
export type { SheetProps } from './Sheet'
