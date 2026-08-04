# Sincronizar com o `app-boilerplate`

Este repositório **não é um fork** do `app-boilerplate`: ele nasceu de uma cópia
de arquivos, num commit raiz próprio. As duas histórias são independentes, então
`git merge` / `git rebase` contra o boilerplate **não funcionam** sem
`--allow-unrelated-histories`, e mesmo assim geram conflito em quase todo
arquivo. A sincronização correta é **por arquivo**.

Upstream: <https://github.com/alabreu/app-boilerplate> (público, branch `main`).

## Procedimento

```bash
# 1. Registrar o upstream (só na primeira vez; remotes não vêm no clone)
git remote add boilerplate https://github.com/alabreu/app-boilerplate.git

# 2. Buscar o estado mais recente
git fetch boilerplate main

# 3. Ver o que divergiu (só nomes de arquivo)
git diff --name-status HEAD boilerplate/main

# 4. Trazer os arquivos escolhidos, um a um
git checkout boilerplate/main -- <caminho> [<caminho>...]

# 5. Validar antes de commitar (obrigatório, ver CLAUDE.md)
npm install && npm run lint && npm test && npm run build
```

O passo 4 é seletivo de propósito. Nunca traga a árvore inteira de uma vez:
alguns arquivos são deste app e não do template (ver tabela abaixo).

## O que sincronizar e o que preservar

| Arquivo | Ação |
| --- | --- |
| `src/core/**`, `src/ui/**` (o que não foi tocado) | sincronizar |
| `.github/workflows/ci.yml`, `.github/dependabot.yml` | sincronizar |
| `package.json` | **cuidado** — trazer só as mudanças de dependências, preservando o campo `name` depois que a renomeação acontecer |
| `package-lock.json` | sincronizar junto com o `package.json`, sempre no mesmo commit |
| `eslint.config.js`, `tsconfig*.json`, `.prettierrc` | sincronizar |
| `ACCESSIBILITY.md`, `SECURITY.md` | sincronizar |
| `CLAUDE.md`, `README.md` | **preservar** — vão divergir conforme o Fun Backlog ganha convenções próprias; trazer melhorias do template à mão |
| `docs/**` | **preservar** — é conteúdo deste projeto |
| `src/core/config.ts`, `vite.config.ts`, `index.html`, `src/index.css`, `public/` (ícones), `src/core/changelog.ts` | **preservar depois da renomeação** — são os arquivos do checklist do README |

## Estado conhecido em 04/08/2026

Nesta data foi feito um **sync total** da árvore do boilerplate: como nenhuma
linha de código do Fun Backlog existia ainda, dava para trazer tudo de uma vez,
e essa era a última janela em que isso era seguro. Chegaram nesse sync o design
system (`src/ui/design/`, tema claro/escuro, checks de classe crua e de
contraste no `npm run lint`), a costura de LLM (`core/llm/` + Edge Function
`llm`), atualizações de dependências (react-router 8, vite 8) e testes novos no
core.

**A partir daqui a sincronização é arquivo por arquivo, sempre** — a tabela
acima passa a valer pra valer, e já existe código deste app misturado à árvore.

Um detalhe achado nesse sync, que vale para qualquer app criado do template:
`src/core/llm/client.test.ts` vinha com o prefixo de storage escrito à mão
(`'meu-app.llm-key'`) e quebrava na renomeação. Aqui foi trocado por
`storageKey('llm-key')`. Se o upstream ainda não tiver a mesma correção, não
traga esse arquivo de volta sem reaplicá-la.

## Renomeação: feita, com duas pendências

O checklist de renomeação do template foi executado em 04/08/2026 —
`package.json`, `src/core/config.ts`, `vite.config.ts`, `index.html` e a
entrada inicial do `src/core/changelog.ts` já são do Fun Backlog.

Continuam pendentes, de propósito, até a sessão de identidade visual:

- `src/index.css` — os primitivos (`--palette-*`) ainda são os neutros do
  template.
- `public/` — os ícones ainda são os placeholders de `npm run icons`.

Esses dois arquivos já estão na coluna "preservar" da tabela acima: **nunca**
traga a versão do boilerplate por cima deles depois que a paleta do Fun Backlog
existir.
