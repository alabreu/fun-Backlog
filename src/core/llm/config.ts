/**
 * Config do cliente de LLM. Os limites espelham os da Edge Function
 * (supabase/functions/llm/index.ts) para falhar rápido, sem gastar rede — a
 * validação que VALE é sempre a do servidor.
 */
export const LLM = {
  /**
   * Modelo usado no modo BYOK (chave do próprio usuário). No modo proxy quem
   * decide é o servidor — o `model` mandado pelo cliente é ignorado lá.
   *
   * Mantenha em sincronia com o `defaultModel` da Edge Function
   * (supabase/functions/llm/index.ts), senão quem usa a própria chave recebe um
   * modelo diferente de quem usa o proxy. O sufixo `-latest` é o que faz o
   * OpenRouter redirecionar para a release mais nova da família V4 Flash.
   */
  byokModel: 'deepseek/deepseek-v4-flash-latest',
  maxTokens: 1024,
  maxMessages: 30,
  maxCharsPerMessage: 8000,
  maxCharsTotal: 24000,
} as const

/** Caminho da Edge Function do proxy, relativo à URL do Supabase. */
export const LLM_PROXY_PATH = '/functions/v1/llm'

/** Endpoint do OpenRouter usado APENAS no modo BYOK (chave do usuário). */
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
