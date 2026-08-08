import { useEffect, useState } from 'react'
import { Heart, PaperPlaneRight } from '@phosphor-icons/react'
import {
  Badge,
  Button,
  Card,
  Chip,
  ClampedText,
  Cover,
  CoverGrid,
  NavRow,
  Field,
  IconButton,
  Input,
  Screen,
  ScreenBody,
  SectionTitle,
  Reorderable,
  Sheet,
  Textarea,
  Toggle,
} from '@ui/design'
import { MEDIA_TYPES, type MediaType } from '@core/items/types'
import { useThemeStore } from '@core/state/themeStore'
import { THEMES, type Theme } from '@core/theme'
import { applyTheme } from '@ui/theme'
import { ScreenHeader } from '@ui/components/ScreenHeader'

/**
 * Vitrine do design system em /design — rota escondida (sem link na UI) e
 * lazy-loaded, como o /admin. Serve para (a) ver todas as variantes de uma vez,
 * (b) conferir contraste e foco de teclado depois de trocar a paleta de um app
 * novo, e (c) descobrir o que já existe antes de escrever classe crua.
 *
 * Ferramenta de desenvolvimento, não produto: por isso é a ÚNICA tela com
 * strings fora do i18n — traduzir rótulo de vitrine só polui a tabela de
 * mensagens de todo app que nascer deste template. Ver CLAUDE.md.
 */
// As classes precisam ser LITERAIS: o Tailwind extrai as classes varrendo o
// código-fonte, então `bg-${name}` nunca gera CSS. Vale para todo o projeto.
const TOKENS_COLOR = [
  { name: 'bg', use: 'fundo principal', swatch: 'bg-bg' },
  { name: 'surface', use: 'cards / sheets', swatch: 'bg-surface' },
  { name: 'ink', use: 'texto', swatch: 'bg-ink' },
  { name: 'muted', use: 'texto secundário', swatch: 'bg-muted' },
  { name: 'primary', use: 'ações primárias', swatch: 'bg-primary' },
  { name: 'on-primary', use: 'texto sobre primary', swatch: 'bg-on-primary' },
  { name: 'accent', use: 'badges e destaques', swatch: 'bg-accent' },
  { name: 'on-accent', use: 'texto sobre accent', swatch: 'bg-on-accent' },
  { name: 'success', use: 'confirmações', swatch: 'bg-success' },
  { name: 'danger', use: 'erros', swatch: 'bg-danger' },
  { name: 'inverse', use: 'toast (escuro nos 2 temas)', swatch: 'bg-inverse' },
  { name: 'on-inverse', use: 'texto do toast', swatch: 'bg-on-inverse' },
  { name: 'scrim', use: 'véu do sheet', swatch: 'bg-scrim' },
] as const

const TOKENS_RADIUS = [
  { name: 'control', cls: 'rounded-control' },
  { name: 'field', cls: 'rounded-field' },
  { name: 'card', cls: 'rounded-card' },
  { name: 'sheet', cls: 'rounded-sheet' },
] as const

const TOKENS_TEXT = [
  { name: 'label', cls: 'text-label' },
  { name: 'body', cls: 'text-body' },
  { name: 'title', cls: 'text-title' },
  { name: 'metric', cls: 'text-metric' },
  { name: 'display', cls: 'text-display' },
] as const


const LONGO =
  'Um texto suficientemente longo para transbordar três linhas e provar que a ' +
  'medição funciona: o botão só aparece quando a altura real do parágrafo passa ' +
  'da altura visível, e o ResizeObserver refaz a conta quando a largura muda. ' +
  'Girar o aparelho não pode deixar um "Ler mais" órfão na tela.'

export function DesignScreen() {
  const [chip, setChip] = useState('a')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('system')
  const [mediaChip, setMediaChip] = useState<MediaType>('game')
  const [ligado, setLigado] = useState(true)
  const [ordem, setOrdem] = useState<MediaType[]>([...MEDIA_TYPES])

  // A vitrine sobrepõe o tema para dar para conferir os dois lados sem mexer
  // na preferência de ninguém. Ao sair, RESTAURA o que o usuário escolheu em
  // Configurações — voltar para 'system' apagaria a escolha dele.
  useEffect(() => {
    applyTheme(theme)
    return () => applyTheme(useThemeStore.getState().theme)
  }, [theme])

  return (
    <Screen>
      <ScreenHeader title="Design system" />

      <ScreenBody className="flex flex-col gap-6">
        <p className="text-body text-muted">
          Todos os componentes de <code>@ui/design</code> e os tokens do{' '}
          <code>@theme</code>. Navegue por teclado (Tab) para conferir o anel de
          foco em cada controle.
        </p>

        <section>
          <SectionTitle className="mb-2">Tema</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <Chip key={t} selected={theme === t} onClick={() => setTheme(t)}>
                {t}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-label text-muted">
            Alterne para conferir contraste e foco nos dois temas. Os contrastes
            também são verificados no <code>npm run lint</code>.
          </p>
        </section>

        <section>
          <SectionTitle className="mb-2">Cor</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {TOKENS_COLOR.map((token) => (
              <Card key={token.name} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`h-9 w-9 shrink-0 rounded-card ring-1 ring-ink/10 ${token.swatch}`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold">
                    {token.name}
                  </span>
                  <span className="block truncate text-label text-muted">
                    {token.use}
                  </span>
                </span>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle className="mb-2">Cor por mídia</SectionTitle>
          <p className="mb-3 text-body text-muted">
            Família à parte do <code>accent</code>, que continua sendo o sinal de
            "isto é você". Serve para escanear — a cor nunca vai sozinha, o
            rótulo está sempre junto (WCAG 1.4.1). Nunca cobre arte de capa.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <Badge key={type} media={type}>
                {type}
              </Badge>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <SectionTitle key={type} as="p" media={type}>
                {type}
              </SectionTitle>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <Chip
                key={type}
                media={type}
                selected={mediaChip === type}
                onClick={() => setMediaChip(type)}
              >
                {type}
              </Chip>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-2">
            {MEDIA_TYPES.map((type) => (
              <NavRow key={type} media={type} label={type} trailing="0/0" />
            ))}
          </div>

          <p className="mb-2 text-body text-muted">
            O fallback da capa (sem arte) é a ÚNICA cor de marca perto de uma
            capa — e chega justamente onde não há capa para competir. Assim que
            a imagem carrega, ela cobre o tint.
          </p>
          <CoverGrid>
            {MEDIA_TYPES.map((type) => (
              <li key={type}>
                <Cover title={type} media={type} />
              </li>
            ))}
          </CoverGrid>
        </section>

        <section>
          <SectionTitle className="mb-2">Raio</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {TOKENS_RADIUS.map((token) => (
              <div key={token.name} className="text-center">
                <div
                  aria-hidden
                  className={`h-14 w-14 bg-surface ring-1 ring-ink/10 ${token.cls}`}
                />
                <span className="mt-1 block text-label text-muted">
                  {token.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle className="mb-2">Tipografia</SectionTitle>
          <Card padding="md" className="flex flex-col gap-1">
            {TOKENS_TEXT.map((token) => (
              <p key={token.name} className={token.cls}>
                {token.name} — o rápido cão marrom
              </p>
            ))}
          </Card>
        </section>

        <section>
          <SectionTitle className="mb-2">Button</SectionTitle>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">primary sm</Button>
              <Button variant="secondary" size="sm">
                secondary sm
              </Button>
              <Button variant="ghost" size="sm">
                ghost sm
              </Button>
              <Button variant="danger" size="sm">
                danger sm
              </Button>
            </div>
            <Button fullWidth>
              <PaperPlaneRight size={18} weight="fill" aria-hidden />
              primary md · fullWidth · com ícone
            </Button>
            <Button variant="secondary" fullWidth disabled>
              secondary · disabled
            </Button>
          </div>
        </section>

        <section>
          <SectionTitle className="mb-2">IconButton e Chip</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton aria-label="Exemplo de botão de ícone">
              <Heart size={20} weight="bold" />
            </IconButton>
            {['a', 'b', 'c'].map((v) => (
              <Chip key={v} selected={chip === v} onClick={() => setChip(v)}>
                opção {v}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle className="mb-2">Campos</SectionTitle>
          <div className="flex flex-col gap-4">
            <Field label="Rótulo do campo">
              {(id) => <Input id={id} placeholder="Input com rótulo ligado" />}
            </Field>
            <Field
              label="Campo com dica"
              hint="A dica é ligada ao controle por aria-describedby — o leitor de tela lê as duas coisas juntas."
            >
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="Input com dica"
                />
              )}
            </Field>
            <Field label="Área de texto">
              {(id) => <Textarea id={id} rows={3} placeholder="Textarea" />}
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle className="mb-2">Card</SectionTitle>
          <div className="flex flex-col gap-2">
            <Card>padding sm (padrão)</Card>
            <Card padding="md">padding md</Card>
            <Card padding="md" bordered>
              bordered — borda mais marcada
            </Card>
          </div>
        </section>

        <section>
          <SectionTitle className="mb-2">ClampedText</SectionTitle>
          <ClampedText lines={3} moreLabel="Ler mais" lessLabel="Ler menos">
            {LONGO}
          </ClampedText>
          <p className="mt-3 text-label text-muted">
            Abaixo, texto curto: o botão não aparece porque não há o que abrir.
          </p>
          <ClampedText lines={3} moreLabel="Ler mais" lessLabel="Ler menos">
            Uma linha só.
          </ClampedText>
        </section>

        <section>
          <SectionTitle className="mb-2">Toggle</SectionTitle>
          <div className="flex items-center gap-4">
            <Toggle checked={ligado} onChange={setLigado} label="Exemplo" />
            <Toggle checked onChange={() => {}} label="Travado" disabled />
            <span className="text-label text-muted">
              {ligado ? 'ligado' : 'desligado'}
            </span>
          </div>
        </section>

        <section>
          <SectionTitle className="mb-2">Reorderable</SectionTitle>
          <Reorderable
            items={ordem.map((m) => ({
              id: m,
              name: m,
              content: <span className="text-body font-semibold">{m}</span>,
            }))}
            onMove={(from, to) =>
              setOrdem((atual) => {
                const proxima = [...atual]
                const [movido] = proxima.splice(from, 1)
                proxima.splice(to, 0, movido)
                return proxima
              })
            }
            handleLabel={(name) => `Reordenar ${name}`}
            announce={(name, pos, total) => `${name}, ${pos} de ${total}`}
          />
          <p className="mt-2 text-label text-muted">
            Arraste pela alça. Pelo teclado: Tab até a alça e setas ↑/↓.
          </p>
        </section>

        <section>
          <SectionTitle className="mb-2">Sheet</SectionTitle>
          <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
            Abrir sheet
          </Button>
          <p className="mt-2 text-label text-muted">
            Escape fecha, Tab circula dentro do sheet, e o foco volta a este botão
            ao fechar.
          </p>
        </section>
      </ScreenBody>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label="Exemplo de sheet"
      >
        <p className="mb-3 text-body text-muted">
          Conteúdo do sheet. Os botões abaixo existem para testar o trap de foco.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setSheetOpen(false)}>
            Fechar
          </Button>
          <Button variant="secondary" size="sm">
            Outro
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
