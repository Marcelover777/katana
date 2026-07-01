# headless — /go overnight com scripts/go.ps1

O modo primário do /go é a sessão interativa. Headless existe pra madrugada: `scripts/go.ps1`
invoca o Claude Code UMA vez POR ETAPA, preservando a memória do run via `--resume`. O mesmo
`.katana/state.json` serve os dois modos — comece interativo de dia, rode headless à noite,
retome de manhã com `/go resume`.

## As 5 leis do runner

1. **Uma invocação por etapa.**
   `claude -p "/go step K" --output-format json --permission-mode acceptEdits`.
   A 1ª volta captura `session_id`; as seguintes passam `--resume $sid` — memória entre etapas,
   sem re-pagar a descoberta de contexto a cada volta.
2. **Ramifique no `subtype` do JSON** (`success` | `error_max_turns` | `error_during_execution`)
   — NUNCA em `$LASTEXITCODE`. Exit 0 de um result não é "deu certo".
3. **Fail-closed.** Depois de cada invocação, releia `.katana/state.json`. JSON inválido, status
   não escrito ou etapa sem avanço → PARE. Sem status escrito = para. Nunca assuma progresso.
4. **Sem `--bare`** (mata a descoberta de skill e o CLAUDE.md). **Sem `bypassPermissions`** —
   a allowlist do `/go setup` + o `katana-guard` cobrem o fluxo inteiro.
5. **Pare quando `status` ∈ {done, hard_stop, stopped}.** E um run por vez: lock em
   `.katana/tmp/go.lock` (já gitignorado; o go.ps1 recusa iniciar se existir), e `state.json`
   com `status=running` e `updated_at` recente → recuse iniciar.

## /go step K — a forma que o runner usa

É `/go K` em modo não-interativo. Diferenças:

- **NENHUMA pergunta.** O ramo "pergunte agora" do preflight não existe aqui: Aceite ausente →
  deriva e declara no PR; qualquer coisa que exigiria pergunta → parada dura.
- Sem state ativo → preflight completo (árvore limpa, pull, baseline, gate do passo K) e cria o
  state com `range=[K,K]`. Com state `running` → reconcilia (GitHub/git ganham), estende o
  range até K se preciso, e roda o preflight enxuto (árvore limpa + pull + gate de K).
- Bata TODOS os gates ANTES de dormir, não às 3h: rode `/go N..M --dry` interativo antes — ele
  lista cada gate da faixa sem executar nada.

## Ramificação por subtype

| subtype | Ação |
|---|---|
| `success` | releia o state: `steps[K].status == merged` → próxima etapa; sem avanço → PARE (fail-closed) |
| `error_max_turns` | 1 retry da MESMA etapa com `--resume` (o state diz onde parou); 2ª vez sem progresso → PARE |
| `error_during_execution` (ou qualquer outro) | PARE |

## Esqueleto (o script real vive em scripts/go.ps1, ~100 linhas)

```powershell
param([Parameter(Mandatory)][int]$From, [Parameter(Mandatory)][int]$To)
$sid = $null; $retried = $false
for ($k = $From; $k -le $To; $k++) {
  $cliArgs = @("-p", "/go step $k", "--output-format", "json", "--permission-mode", "acceptEdits")
  if ($sid) { $cliArgs += @("--resume", $sid) }
  $raw = & claude @cliArgs
  try { $r = $raw | ConvertFrom-Json } catch { Write-Host "JSON invalido -> PARO (fail-closed)"; break }
  if (-not $sid -and $r.session_id) { $sid = $r.session_id }
  if ($r.subtype -notin @("success","error_max_turns")) { Write-Host "subtype=$($r.subtype) -> PARO"; break }
  try { $st = Get-Content .katana/state.json -Raw | ConvertFrom-Json } catch { Write-Host "state ilegivel -> PARO"; break }
  if ($st.status -in @("hard_stop","stopped")) { Write-Host "status=$($st.status) -> PARO"; break }
  if ($st.steps."$k".status -ne "merged") {                    # veredito = state, nunca o subtype
    if ($r.subtype -eq "error_max_turns" -and -not $retried) { $retried = $true; $k--; continue }
    Write-Host "etapa $k sem merged no state -> PARO (fail-closed)"; break
  }
  $retried = $false
}
```

Notas do esqueleto: mensagens em ASCII puro (console PS 5.1 + codepage = acento quebrado);
`$cliArgs`, não `$args` (é variável automática do PS); o `$k--; continue` é o único retry — e só
depois de conferir no state que a etapa NÃO mergeou (etapa já `merged` nunca re-roda). Não
existe loop de reza.

## Schema completo do .katana/state.json

UTF-8 **sem BOM**. Escrito pelo /go a cada transição; lido pelos hooks (`katana-continue`,
`katana-session-start`) e pelo go.ps1. GitHub/git são a fonte de verdade remota; o state é o
cache local que o `/go resume` reconcilia.

```json
{
  "version": 1,
  "run_id": "2026-07-01T14-22",
  "roadmap": "ROADMAP.md",
  "range": [1, 5],
  "current": 3,
  "status": "running",
  "stop_reason": null,
  "nudges": 0,
  "steps": {
    "1": { "status": "merged",  "branch": "go/01-watermark-join",   "pr": 192, "sha": "a1b2c3",
           "attempts": 1, "last_error": null, "decisions": [] },
    "2": { "status": "merged",  "branch": "go/02-origin-budget",    "pr": 193, "sha": "d4e5f6",
           "attempts": 2, "last_error": null, "decisions": [] },
    "3": { "status": "running", "branch": "go/03-tabular-champion", "pr": null, "sha": null,
           "attempts": 1, "last_error": null,
           "decisions": ["usei LightGBM em vez de GBM: já está no extra ml"] }
  },
  "started_at": "2026-07-01T14:22:00-03:00",
  "updated_at": "2026-07-01T15:40:11-03:00"
}
```

| Campo | Semântica |
|---|---|
| `version` | do schema (1) |
| `run_id` | timestamp do início do run |
| `roadmap` | path do roadmap consumido |
| `range` | `[N, M]` da faixa pedida (`/go step K` estende o M) |
| `current` | etapa em andamento |
| `status` | `running` \| `done` \| `hard_stop` \| `stopped` |
| `stop_reason` | `null` ou o motivo em 1 linha (gate, 3-falhas, destrutivo, conflito, contradição, preflight, stalled, timeout) |
| `nudges` | contador do Stop hook `katana-continue`; o /go zera a cada progresso real; ≥3 sem progresso → `hard_stop` com `stalled` |
| `last_nudge_fingerprint` | opcional, escrito só pelo `katana-continue`: `etapa\|status\|attempts` no momento do último nudge — fingerprint idêntico com `nudges` ≥3 = stall. Preserve no read-modify-write; não invente |
| `steps{K}.status` | `pending` \| `running` \| `validated` \| `pr_open` \| `merged` \| `failed` |
| `steps{K}.branch` / `pr` / `sha` | branch `go/KK-<slug>`, nº do PR (ou null), sha do merge |
| `steps{K}.attempts` | tentativas de validação (máx 3) |
| `steps{K}.last_error` | 1 linha da última falha — para o resume e para você |
| `steps{K}.decisions[]` | decisões autônomas tomadas — espelhadas no corpo do PR |
| `started_at` / `updated_at` | ISO-8601 com offset |

Transições de `steps[K].status`: `pending` →(a)→ `running` →(c/d/e verdes)→ `validated` →(f)→
`pr_open` →(g)→ `merged`. `failed` = etapa interrompida antes do verde: 3ª falha de validação
em (c) OU parada dura no meio da etapa (ex.: gate revelado em runtime). Granular o bastante
pro resume saber se falta validar, push, review ou merge.
