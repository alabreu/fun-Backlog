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

## Estado conhecido em 03/08/2026

O `fun-backlog` foi copiado de um estado anterior do boilerplate. Nesta data
divergiam apenas:

- `package.json` e `package-lock.json` (bumps de dependências via Dependabot)
- `.github/workflows/ci.yml`
- `.github/dependabot.yml`

Nenhum arquivo de `src/` divergia, e **nenhum código específico do Fun Backlog
existia ainda** — ou seja, nesse momento a sincronização era de baixo risco.
Se este parágrafo já não descrever a realidade, rode o passo 3 e reavalie.

## Renomeação ainda pendente

O checklist de renomeação do `README.md` (seção "Checklist de renomeação")
**ainda não foi executado** — `package.json` ainda diz `"name":
"app-boilerplate"`. Fazer isso faz parte do item 1 da ordem de execução do
[briefing](./briefing.md). Depois de executado, a coluna "preservar" da tabela
acima passa a valer pra valer.
