/**
 * Doações via Stripe Payment Link — infra zero: crie o link no dashboard do
 * Stripe (produto "Doação" com preço "o cliente escolhe o valor") e aponte a
 * env var. Nenhum secret entra no app: o Stripe hospeda a página de pagamento.
 * Para valores pré-definidos dentro do app, o upgrade é uma Edge Function de
 * Checkout (ver README, seção "Doações").
 */
export const donateUrl =
  (import.meta.env.VITE_STRIPE_DONATE_URL as string | undefined) ?? ''

/** Se o link de doação está configurado neste build (item aparece no menu). */
export const donateConfigured = Boolean(donateUrl)
