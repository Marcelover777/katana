---
name: go
description: Dirige o ROADMAP.md do passo N ao M sem parar — branch, implementa, valida, PR, self-review, merge, próximo. Só para em parada dura. /go sem args = painel. Use para /go, "faz da etapa X até a Y", "roda o roadmap", "continua de onde parou", "não para até terminar".
---

# /go — dirige até o fim

A regra é continuar; parar é exceção enumerada. **AUTONOMIA = f(VERIFICAÇÃO):** quem destrava
cada merge é o Aceite mecânico verde — nunca opinião, sua ou de review LLM. Ambiguidade de
implementação NUNCA para o run: adote a sua própria recomendação, registre em `decisions[]`
do state.json e no corpo do PR ("Decisão: X porque Y — reverta se discordar") e siga.

Input: `ROADMAP.md` na raiz (passos `## NN — Título [ ]` com Objetivo/Gate/Depende de/Tasks/
Aceite/Demo; passo L traz a linha `Plano: .katana/plans/NN-<slug>.md`).
O /go consome o mapa, não cria — sem ROADMAP.md, o mapa nasce no /plan.
Estado: `.katana/state.json` (schema completo em [references/headless.md](references/headless.md)),
log em `.katana/LOG.md`, efêmeros em `.katana/tmp/`.

## Formas

| Comando | Faz |
|---|---|
| `/go` | painel de status — só lê, não executa |
| `/go 3` | roda o passo 3 |
| `/go 1..5` | roda os passos 1 a 5 sem devolver o turno entre eles |
| `/go all` | do primeiro `[ ]` até o fim do ROADMAP |
| `/go 3..5 --dry` | plano de voo: o que faria, branches, gates que vai bater — só leitura, zero execução |
| `/go resume` | retoma do state.json reconciliando com GitHub/git — que ganham do JSON |
| `/go step K` | forma headless de `/go K`: NENHUMA pergunta (Aceite ausente → deriva e declara no PR; o que exigiria pergunta → parada dura); estende o range do state — regras em [references/headless.md](references/headless.md) |
| `/go stop` | kill switch: `status=stopped` no state.json (o Stop hook libera o turno) |
| `/go setup` | 1x por repo: allowlist git/gh no `.claude/settings.json`, registra os hooks `katana-*` (os 3 blocos JSON exatos estão no hooks/README.md do repo Katana — replique-os), gitignora `.katana/tmp/` e `.katana/state.json` |
| `--worktree` | o run inteiro num worktree dedicado (UM, reutilizado, `.env` copiado) — [references/git-ritual.md](references/git-ritual.md) |

Overnight sem sessão aberta: `scripts/go.ps1` — [references/headless.md](references/headless.md).

## /go sem args — painel honesto

Derive tudo de arquivo real: contagem de `[x]` só nos títulos de passo do ROADMAP.md
(`## NN — … [x]`, nunca checkbox de task), state.json, `git log` + `gh pr list`.
Nunca de memória de sessão.

- Célula sem sinal real = **⏭️ sem dado** — nunca ✅ presumido, nunca número inventado.
- % = passos `[x]` ÷ total, arredondado PRA BAIXO.
- Run ativo ou parado → mostre etapa, status, tentativas, `stop_reason`.
- Última linha, sempre: `próximo: /go N — <título>` (+ aviso do gate que N vai bater, se houver).

## PREFLIGHT — o único momento que pode perguntar

Depois dele, silêncio até o fim. Se houver perguntas, TODAS numa mensagem só.

1. `git status --porcelain` ≠ vazio → **PARADA DURA** ("stash é decisão sua").
2. `git fetch origin && git checkout main && git pull --ff-only`. Divergiu → **PARADA DURA**.
   NUNCA `reset --hard`.
3. Baseline verde: rode os checks do projeto (CLAUDE.md § Comandos; senão auto-detect:
   `pyproject.toml` → `pytest -q`; `package.json` → SÓ os scripts que existem, na ordem
   test, typecheck, lint, build). Nenhum check existente → baseline **⏭️ sem dado**, declarado
   no plano de voo — não é parada. Vermelho → **PARADA DURA** ("o repo já estava quebrado
   antes de mim").
4. Parseie os passos N..M. Colete TODOS os gates da faixa (campo `Gate:` de cada passo) e confira
   o `.env` de UMA vez — só nomes, nunca valores; releia o disco, não confie em memória de sessão.
   Nunca invente nome de env var: o nome vem do `Gate:`; serviço sem gate declarado → doc oficial.
   Faltou qualquer chave → pare AGORA com o bloco:

   ```
   ❌ Falta configurar antes do run (/go 3..5):

   - SUPABASE_URL e SUPABASE_ANON_KEY → Supabase → Settings → API Keys   (passo 03)
   - STRIPE_SECRET_KEY → https://dashboard.stripe.com/apikeys            (passo 05)

   Pega as chaves, põe no .env (modelo em .env.example), e rode de novo: /go 3..5.
   ```

   Nunca avance um passo bloqueado. Sem chave → sem execução. Sem exceção silenciosa.
   Cheque também as dependências: todo `Depende de:` de cada passo da faixa precisa estar
   `[x]` no ROADMAP ou vir ANTES dele dentro da própria faixa. Senão → lote único de perguntas
   ("o passo 04 depende do 02, pendente e fora da faixa — incluo o 02 (vira /go 2..5) ou
   paro?"); em `/go step` (headless, sem perguntas) → **PARADA DURA** no preflight.
   Vão no mesmo lote de perguntas: passo sem Aceite mecânico (interativo: proponha no lote;
   headless `/go step`: derive e declare no PR body) e repo sem remote (criar no GitHub ou
   mergear local?).
5. Escreva o state.json (`status=running`, range, `current=N`). Anuncie o plano de voo em
   ≤5 linhas e DECOLE.

## LOOP — para cada passo K de N até M, sem devolver o turno

Comandos git/gh exatos de cada letra: [references/git-ritual.md](references/git-ritual.md).
Cada passo começa relendo state.json + a seção do passo no ROADMAP — refresh determinístico;
compaction não te perde.

a. `git checkout -b go/KK-<slug> main`.
b. Execute TODAS as tasks do passo (passo com linha `Plano:` → as tasks vêm de `.katana/plans/NN-<slug>.md`):
   - Leia os arquivos-alvo ANTES de editar. Exploração pesada → subagente (preserva o contexto
     do turno).
   - Aplique → verifique o acceptance da task → marque a task `[x]` → commit atômico
     (`tipo(área): o que mudou [passo-KK]`; adicione os paths da task).
   - **Guarda de escopo:** arquivos tocados > 2× o previsto → registre o drift, ajuste as tasks
     restantes, siga. Não engula escopo em silêncio — é assim que roadmap vira ficção.
   - **Drift** (a realidade contradiz o plano): registre plano-dizia → realidade-é → decisão
     (`decisions[]` + PR body); ajuste as tasks futuras AGORA. O ROADMAP deve sempre contar a
     verdade — uma sessão nova não pode herdar a mentira.
   - Cirurgia, não reforma: só o que a task pede. Sem refactor adjacente, sem feature especulativa.
c. VALIDE: Aceite do passo + checks do projeto. Falhou → protocolo /fix inline em MODO
   AUTÔNOMO (skills/fix § Modo autônomo): nunca pergunte, nunca espere resposta. Máx
   **3 tentativas** no MESMO passo; a 3ª falha → **PARADA DURA** (`failed`, `last_error`,
   instrução de retomada).
d. Anti-placeholder (mecânico, não vibe):
   `git diff --name-only main | xargs grep -nE "TODO|FIXME|not implemented|placeholder|throw new Error\(.?[Nn]ot implemented"`
   Marca NOVA do passo → NÃO está verde: implemente de verdade ou vire task explícita. Pronto é
   função real, não stub. Marca pré-existente não bloqueia — anote no PR body.
e. FECHAMENTO (ship interno):
   - suite completa do projeto, não só o módulo tocado — vermelho volta pra (c) e conta tentativa;
   - Must-Haves quando o passo os declarar; da Demo, execute só a fatia mecanizável
     (curl/grep/exit code) — todo passo visual vai DIRETO pra fila "pendente de olho humano"
     do relatório; nunca pergunte nem suba servidor de longa duração no meio do run;
   - grep de restos:
     `git diff --name-only main | xargs grep -nE "console\.log|debugger|\.only\(|sk_live_|AKIA[0-9A-Z]{16}"`
     (`.only(` = suite sabotada; `sk_live_`/`AKIA` = segredo → remova ANTES de qualquer push);
   - lente de segurança SÓ nos arquivos tocados: segredo hardcoded, input externo sem validação,
     endpoint novo sem auth onde os vizinhos têm, dado sensível em log.
f. `git push -u origin go/KK-<slug>` → `gh pr create` (título `Etapa KK — <título>`; body: o que
   fez, Aceite rodado COM output, decisões). Commit de registro na MESMA branch: passo `[x]` no
   ROADMAP.md + bloco no LOG.md (o que mudou/arquivos/verificação/próximo) → push. O registro
   viaja dentro do PR — nada é commitado direto em main. Então SELF-REVIEW adversarial via
   subagente lendo `gh pr diff` ([references/review-checklist.md](references/review-checklist.md)):
   achado crítico → fix + push + re-valida (1 ciclo); resto → `gh pr comment`. **Review é
   advisory — o Aceite mecânico é que destrava o merge.**
g. Repo TEM CI → `gh pr checks --watch` com timeout; sem CI → local-verde destrava.
   `gh pr merge --merge --delete-branch` → `git checkout main && git pull --ff-only`.
   Sem remote → merge local `--no-ff`.
h. O `[x]` e o LOG já chegaram ao main via merge. Aqui: atualize state.json (`merged`, pr, sha;
   `current=K+1`; `nudges=0` — zere a cada transição de status de step, não só no merge) e
   imprima UMA linha:
   `[go 3/5] etapa 03 mergeada — PR #12 (2 tentativas, 14 min)`
   K == M → RELATÓRIO FINAL. Senão → (a), imediatamente.

Verificação visual/UI nunca para o loop: rode o smoke mecânico possível e jogue o resto na fila
"pendente de olho humano" do relatório.

## PARADAS DURAS — lista fechada. TUDO o resto segue.

1. Gate descoberto ou revelado inválido no meio do run — chave não mapeada no preflight, OU
   mapeada mas com 401/403/credencial placeholder. Auth inválida é gate, não bug: pare na 1ª
   evidência, sem consumir as 3 tentativas.
2. 3 tentativas falhas de validação no mesmo passo.
3. Destrutivo-irreversível, em duas camadas:
   - deny mecânico do hook `katana-guard`: force-push, `reset --hard`, `clean -f`, `rebase -i`,
     `filter-branch`/`+refspec`, deletar main (local ou remota), commit em main durante o run,
     `rm -rf` fora do repo. Deny do guard = parada, nunca contorno;
   - recusa por regra do runner (instrução, sem hook): migration destrutiva com dados,
     deploy pago, gastar dinheiro.
4. Conflito de merge não-trivial (hunks sobrepostos exigindo escolha de intenção; conflito
   trivial resolve e segue).
5. Contradição de produto: executar exigiria contradizer o que o ROADMAP escrito pede.
   (Ambiguidade de implementação não é contradição — decida e registre.)
6. Preflight sujo/vermelho.
7. Caps: 3 nudges do Stop hook sem progresso (stall), ou timeout de etapa (só headless:
   `-MaxMinutesPerStep` do `scripts/go.ps1`).

Ao parar: state.json (`hard_stop`, `stop_reason`, `last_error`) + 1 bloco dizendo o que falta e
como retomar (`/go resume`).

**AUTORIZADO por definição** — nunca peça permissão para: push de branch `go/*`, criar PR,
comentar PR, mergear na main via PR, deletar branch mergeada.

## RELATÓRIO FINAL

| etapa | PR | tentativas | achados de review | tempo |

- "Pendente de olho humano": TODAS as verificações visuais/UI do run, agregadas — batch único
  no fim, nunca no meio.
- state.json → `done`. Última linha: `próximo: /go 6 — <título>` (ou "ROADMAP completo").

**As únicas mensagens finais válidas de um run são RELATÓRIO FINAL ou PARADA DURA.** Devolver o
turno no meio ("terminei a etapa 2, sigo?") é bug: o Stop hook re-injeta — não brigue com ele,
continue.

## /go resume

1. Leia o state.json. 2. Reconcilie com `gh pr list --state all --search "head:go/"` +
`git log main` (mapa em [references/git-ritual.md](references/git-ritual.md)) — **GitHub/git
ganham do JSON**. 3. Retome cada etapa não-merged do range no ponto certo do LOOP:
`pending`→(a) · `running`→(b), re-validando antes de confiar · `validated`→(f) ·
`pr_open`→(f)/(g) · `failed`→(c) com attempts zerados (você mexeu). 4. `status=running` e o
LOOP segue até M.

## Anti-padrões

- ❌ Mockar colaborador interno pra ficar verde — mock só em boundary externo (DB, HTTP);
  interno mockado dá verde com behavior quebrado.
- ❌ Esconder falha mudando o teste em vez do código.
- ❌ Declarar verde por suite/build genérico sem rodar o Aceite DO passo.
- ❌ Ecoar VALOR de env var em gate, PR body, review ou log — só nomes, sempre.
- ❌ `git add .` cego ou `git add -f` — o .gitignore é o que protege o `.env`.
- ❌ Re-tentar a mesma correção sem hipótese nova — tentativa é diagnóstico novo + fix, não replay.
- ❌ Consertar agora um bug fora do escopo do passo — vira passo novo no ROADMAP (fila única),
  registrado no PR body.

Quebrou algo fora de um run? **/fix.** Fim de run? A última linha do relatório já aponta:
`próximo: /go N`.
