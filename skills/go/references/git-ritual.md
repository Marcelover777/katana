# git-ritual — os comandos exatos do /go

Bash (Git Bash no Windows). Caveats de PowerShell 5.1 no fim — valem para o `go.ps1` e para
qualquer coisa que rode em PS. Os exemplos dizem `main`; se a default do repo é outra, detecte
1x no preflight: `git symbolic-ref --short refs/remotes/origin/HEAD`.

## Preflight (1x por run)

```bash
git status --porcelain            # ≠ vazio → PARADA DURA
git fetch origin
git checkout main
git pull --ff-only origin main    # divergiu → PARADA DURA (nunca reset --hard)
# baseline = os checks do projeto, ex.:
uv run pytest -q                  # pyproject.toml
npm run typecheck && npm run test # package.json
```

## Por etapa KK (exemplo: etapa 03)

```bash
git checkout -b go/03-tabular-champion main

# ... tasks: 1 commit atômico por task ...
git add apps/ pipelines/ tests/          # paths tocados; NUNCA git add -f, NUNCA git add . cego
git commit -F .katana/tmp/commit-03.txt  # mensagem multi-linha SEMPRE via arquivo (ver PS 5.1)
```

`.katana/tmp/commit-03.txt`:

```
feat(training): trilho de campeão tabular [passo-03]

Aceite: uv run pytest tests/training -q verde; champion.py carrega artefato LightGBM.

Co-Authored-By: Claude <noreply@anthropic.com>
```

Push + PR:

```bash
git push -u origin go/03-tabular-champion
gh pr create --base main --head go/03-tabular-champion \
  --title "Etapa 03 — trilho de campeão tabular" \
  --body-file .katana/tmp/pr-body-03.md   # o que fez, Aceite rodado com output, decisões
gh pr view --json number -q .number       # captura o nº do PR
```

Commit de registro — o `[x]` do passo e o bloco do LOG viajam DENTRO do PR; nunca commit
direto em main:

```bash
# marque `## 03 — ... [x]` no ROADMAP.md + append do bloco no .katana/LOG.md (já com o nº do PR)
git add ROADMAP.md .katana/LOG.md
git commit -m "docs: fecha etapa 03 [passo-03]"
git push
```

Bloco do LOG.md (append-only — nunca reescreva o histórico):

```
## 2026-07-01 15:40 — etapa 03: trilho de campeão tabular (PR #194)

- O que mudou: <1 linha>
- Arquivos: <lista curta>
- Verificação: <Aceite que fechou verde>
- Decisões: <opcional — decisões autônomas e achados de self-review, como no PR>
- Próximo: /go 4 — <título>
```

## Self-review (advisory — o Aceite mecânico é que destrava o merge)

```bash
gh pr diff 194 > .katana/tmp/diff-194.patch
# subagente adversarial revisa com references/review-checklist.md
# CRÍTICO → fix na mesma branch → commit → git push (o PR atualiza) → re-roda o Aceite (1 ciclo)
gh pr comment 194 --body-file .katana/tmp/review-194.md   # registra TODOS os achados
```

## Merge + avanço

```bash
gh pr checks 194 --watch --fail-fast     # SÓ se o repo tem CI; timeout do lado de quem chama
gh pr merge 194 --merge --delete-branch  # --merge, não squash: revertível com git revert -m 1
git checkout main
git pull --ff-only origin main           # a etapa seguinte parte do main já com esta dentro
```

## Sem remote (o preflight perguntou; você escolheu local)

```bash
# self-review antes do merge: o diff é git diff main...go/03-tabular-champion
git checkout main
git merge --no-ff go/03-tabular-champion -m "Etapa 03 — trilho de campeão tabular"
git branch -d go/03-tabular-champion
```

Sem remote não há PR: achados de review vão pro LOG.md. Quer PR? `gh repo create` — a pergunta
do preflight existe pra isso.

## Resume — reconciliação (GitHub/git ganham do state.json)

```bash
gh pr list --state all --search "head:go/" --json number,headRefName,state,mergedAt
git log --oneline main -20
git branch --list "go/*"
```

| Realidade encontrada | state.json corrige para | Retoma em |
|---|---|---|
| PR MERGED | `merged` | próxima etapa |
| PR OPEN | `pr_open` | re-valida o Aceite local → review/merge |
| branch existe, sem PR | `validated` se o Aceite re-passa; senão `running` | (c)…(f) |
| nada no git | `pending` | (a) |
| ROADMAP `[x]` sem PR/branch correspondente | ⏭️ sem dado — reporte a divergência | confie no git, não no checkbox |

## Worktree opcional (`--worktree`)

UM worktree dedicado, reutilizado o run inteiro — pro checkout principal ficar livre enquanto
o run roda. Paralelismo real (2+ runs simultâneos) está fora do v1: um worktree, um run.

```bash
git worktree add ../<repo>-go -b go/03-<slug> origin/main   # nasce já na 1ª branch da faixa
cp .env .env.local ../<repo>-go/ 2>/dev/null                # .env é gitignored — sem copiar, gate falso de chave
cp -r .katana ../<repo>-go/ 2>/dev/null                     # state.json/tmp são gitignored — sem copiar, hooks e resume cegos
cd ../<repo>-go                                             # o run INTEIRO acontece aqui
```

O state.json do run vive no worktree. Ao voltar (fim do run), NÃO copie o `.katana/` de volta —
GitHub/git são a fonte que o `/go resume` reconcilia.

Etapas seguintes, no MESMO worktree — `main` está checked-out no worktree principal, então git
recusa `checkout main` aqui. Crie de `origin/main`, nunca de `main` local:

```bash
git fetch origin
git checkout -b go/04-<slug> origin/main   # origin/main já tem a etapa 03 (mergeada via PR)
```

Fim do run:

```bash
cd <repo-principal>
git worktree remove ../<repo>-go
git pull --ff-only origin main             # atualiza o checkout principal
```

## Permissões — o "sem parar" depende disto

`/go setup` escreve em `.claude/settings.json` → `permissions.allow` (sintaxe de prefixo:
espaço antes do `*`):

```
Bash(git status *)   Bash(git fetch *)      Bash(git checkout *) Bash(git pull *)
Bash(git add *)      Bash(git commit *)     Bash(git push -u origin go/*)
Bash(git diff *)     Bash(git log *)        Bash(git branch *)   Bash(git merge *)
Bash(git symbolic-ref *)                    Bash(git worktree *)
Bash(gh pr create *) Bash(gh pr view *)     Bash(gh pr diff *)   Bash(gh pr comment *)
Bash(gh pr checks *) Bash(gh pr merge *)    Bash(gh pr list *)
Bash(uv run *)       Bash(npm run *)        Bash(grep *)         Bash(xargs *)
```

- Sessão em `--permission-mode acceptEdits` cobre edits/mkdir/mv.
- NUNCA `bypassPermissions` como default — allowlist + katana-guard dão o mesmo fluxo, com coleira.
- O primeiro run ainda pode pedir 2-3 prompts residuais. Normal, não é bug.

Deny mecânico (hook `katana-guard` — bloqueio real, não pedido): force-push, `reset --hard`,
`clean -f`, `rebase -i`, `filter-branch`/`+refspec`, deletar main (local ou remota), commit
direto em main durante run, `rm -rf` fora do repo. Deny do guard = PARADA DURA. Migration
destrutiva com dados, deploy pago e gastar dinheiro param por regra do runner (instrução,
sem hook).

## PS 5.1 — caveats destilados

- Sinal de máquina = `subtype` do JSON de `claude -p --output-format json` — NUNCA
  `$LASTEXITCODE`. Exit 0 de um result não é "deu certo".
- Estado sempre UTF-8 **sem BOM**:
  `[IO.File]::WriteAllText($path, $texto, [Text.UTF8Encoding]::new($false))`.
  O default UTF-16 do PS 5.1 quebra parser e não renderiza no GitHub.
- Sem `&&`/`||` — encadeie com `;` e `if ($?)`.
- Sem `2>&1` em exe nativo — vira `NativeCommandError` e seta `$?` falso mesmo com exit 0.
- Mensagem de commit multi-linha: `git commit -F <arquivo>` — argumento com newline é manglado.
- Nunca `--bare` no claude CLI — mata a descoberta de skill e o CLAUDE.md.
- Verify nunca sobe dev server long-lived — só checks que terminam sozinhos (build/test/tsc).
