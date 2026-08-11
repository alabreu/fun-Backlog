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
export { CoverMark } from './CoverMark'
export type { CoverMarkTone } from './CoverMark'
export { CoverAction } from './CoverAction'
export { CoverStack } from './CoverStack'
export type { CoverStackProps } from './CoverStack'
export type { CoverProps } from './Cover'
export { ExternalLink } from './ExternalLink'
export type { ExternalLinkProps } from './ExternalLink'
export { Fab } from './Fab'
export type { FabProps } from './Fab'
export type { CardPadding, CardProps } from './Card'
export { ClampedText } from './ClampedText'
export type { ClampedTextProps } from './ClampedText'
export { Chip } from './Chip'
export { ConfirmDialog } from './ConfirmDialog'
export type { ConfirmDialogProps } from './ConfirmDialog'
export { ChipRow } from './ChipRow'
export type { ChipProps } from './Chip'
export { Field, Input, Textarea } from './Field'
export type { FieldProps } from './Field'
export { IconButton } from './IconButton'
export type { IconButtonProps } from './IconButton'
export { ImageViewer } from './ImageViewer'
export type { ImageViewerProps } from './ImageViewer'
export { MediaDot } from './MediaDot'
export { GENRE_TEXT, MEDIA_BG, MEDIA_TEXT, PLATFORM_TEXT } from './media'
export { NavRow } from './NavRow'
export { PlatformIcon } from './PlatformIcon'
export type { NavRowProps } from './NavRow'
export { Rail, RailItem } from './Rail'
export { FavoriteValue, RatingRow, RatingValue } from './RatingRow'
export type { RatingRowProps } from './RatingRow'
export { Reorderable } from './Reorderable'
export type { ReorderableItem, ReorderableProps } from './Reorderable'
export { Screen, ScreenBody } from './Screen'
export type { ScreenBodyProps } from './Screen'
export { SearchBar } from './SearchBar'
export type { SearchBarProps } from './SearchBar'
export { SeasonSlider } from './SeasonSlider'
export type { SeasonSliderProps } from './SeasonSlider'
export { Section } from './Section'
export { ServiceLogo } from './ServiceLogo'
export type { ServiceLogoProps } from './ServiceLogo'
export type { SectionProps } from './Section'
export { SectionTitle } from './SectionTitle'
export type { SectionTitleProps } from './SectionTitle'
export { Skeleton } from './Skeleton'
export type { SkeletonProps } from './Skeleton'
export { Stat } from './Stat'
export { Toast } from './Toast'
export type { ToastProps } from './Toast'
export { Toggle } from './Toggle'
export type { ToggleProps } from './Toggle'
export { WorkRow } from './WorkRow'
export type { WorkRowProps } from './WorkRow'
export type { StatProps } from './Stat'
export { Sheet } from './Sheet'
export type { SheetProps } from './Sheet'
