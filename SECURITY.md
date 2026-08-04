# Segurança da informação

Modelo de segurança dos apps nascidos deste template e regras para mantê-lo.
Princípio geral: **a segurança de verdade fica no banco e na borda (headers,
auth), nunca na UI** — a UI só esconde, o banco nega.

## Segredos: o que é público vs. o que nunca vaza

| Valor | Classificação | Onde vive |
| --- | --- | --- |
| Supabase **anon key** | Pública por design (protegida por RLS) | `.env` / env da Vercel / bundle |
| URL do Stripe **Payment Link** | Pública | `.env` / bundle |
| Supabase **service_role key** | SECRETA — acesso total, ignora RLS | Só no dashboard/secrets de Edge Function |
| Stripe **secret key** / webhook secret | SECRETA | Só como secret de Edge Function |
| SMTP (Resend etc.) | SECRETA | Só no dashboard do Supabase |

Regras: `.env` está no `.gitignore` — **nunca** commitá-lo; nenhum secret entra
em código, log ou mensagem de erro; se um secret vazar (commit acidental,
print), **rotacione na hora** — remover o commit não basta.

## Banco (Postgres/Supabase)

- **RLS habilitado em toda tabela, com policies na mesma migração** — nunca
  "depois". Tabela sem policy = inacessível via API (bom default).
- Escrita pública (feedback, analytics) = policy **insert-only**; ninguém lê ou
  altera pelo cliente (ver `0001_feedback.sql`).
- Dados por usuário = policies com `auth.uid() = user_id` em select/insert/
  update/delete.
- Leitura administrativa = RPC `security definer` que **se auto-verifica**
  contra a allowlist `public.admins` (ver `0002_analytics_and_admin.sql`) —
  nunca policy de select "para admins" baseada em claim do cliente.
- **Valide no banco**: constraints de tamanho/tipo/check nas colunas. A
  validação do cliente é UX; a do banco é segurança.
- Teste as policies como atacante: chamadas com a anon key **sem** sessão e com
  a sessão de um segundo usuário não podem ler/alterar dados de outros.

## Auth

- Fluxo OAuth/email com **PKCE** (configurado em `core/backend/client.ts`).
- No dashboard do Supabase: restrinja as **Redirect URLs** aos domínios reais
  do app (mais `http://localhost:5173`); configure o tamanho mínimo de senha;
  ative proteção contra senhas vazadas (Auth → Passwords).
- A UI nunca decide autorização — `user_id` vem de `auth.uid()` no banco, nunca
  de um parâmetro enviado pelo cliente.

## Front-end

- React escapa strings por padrão — **nunca** usar `dangerouslySetInnerHTML`
  com conteúdo que não seja 100% estático; se um dia precisar renderizar HTML
  de terceiros, sanitize com DOMPurify.
- URL dinâmica em `href`/`src`? Garanta `https:` (bloqueia `javascript:`).
- Não guarde nada sensível em localStorage além do que o Supabase já gerencia.

## Borda (headers HTTP)

O `vercel.json` já envia: **CSP** (só scripts próprios; conexões só ao
Supabase; sem iframes), `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` e HSTS. Ao integrar uma API nova,
**adicione o host no `connect-src`** — se algo quebrar silenciosamente, olhe o
console: violação de CSP aparece lá. `Permissions-Policy` nega câmera/mic/
geolocalização; libere individualmente se o app usar.

## Dependências

- **Dependabot** ligado (`.github/dependabot.yml`): PRs semanais agrupados.
- CI roda lint + testes + build em todo PR — atualização de dependência só
  entra verde.
- De tempos em tempos (e antes de lançar): `npm audit` e resolva o que for
  `high`/`critical`.

## LGPD / privacidade

- Colete o mínimo: o boilerplate não coleta nada identificável além do email
  de quem cria conta (analytics usa ids de sessão aleatórios).
- Antes de lançar um app com contas: caminho de **exclusão de conta**
  (referência: Edge Function `delete-account` do Tutor Brew), termos +
  privacidade publicados, e email de contato.
- Feedback: ilegível pelo cliente (insert-only), leia só pelo admin.

## Checklist antes de lançar

1. `git log -p | grep -i` por chaves/secrets acidentais? Nada no histórico?
2. RLS revisada em toda tabela nova (testada com anon key sem sessão)?
3. Redirect URLs do Supabase restritas aos domínios do app?
4. Headers ativos? (confira em securityheaders.com depois do deploy)
5. `npm audit` sem high/critical?
6. Fluxo de exclusão de conta + termos/privacidade no ar (se há login)?
