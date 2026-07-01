#requires -version 5
<#
  Katana - runner headless do /go (overnight, Windows PowerShell 5.1+).
  Contrato completo: skills/go/references/headless.md.

  Roda as etapas -From..-To com UMA invocacao `claude -p "/go step K"` por
  etapa, conferindo o veredito no .katana/state.json apos cada volta. A
  inteligencia mora na skill /go; este script invoca, confere e PARA no
  primeiro sinal ruim.

  Uso: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\go.ps1 `
         -From 3 -To 5 [-MaxMinutesPerStep 45]

  Regras (licoes das geracoes anteriores, bugs corrigidos):
    - sinal de maquina = `subtype` do JSON, NUNCA $LASTEXITCODE;
    - memoria entre etapas: 1a volta captura session_id, seguintes --resume
      (o runner antigo re-pagava a descoberta de contexto a cada volta);
    - fail-closed: state ausente/ilegivel = PARA; etapa sem merged = PARA
      (o antigo assumia progresso sem sinal e rodava as cegas);
    - error_max_turns sem merged = 1 retry da MESMA etapa; depois PARA;
    - hard_stop|stopped = PARA com o stop_reason; done com K<To mergeada =
      so o sub-run [K,K] fechou, segue para K+1;
    - lock .katana/tmp/go.lock (caminho gitignorado pelo /go setup) em
      try/finally; Write em UTF-8 SEM BOM; sem &&; sem 2>&1 em exe nativo
      (com -MaxMinutesPerStep, o stderr do claude vai para arquivo em
      .katana/tmp/ DENTRO do job - runspace novo, EAP=Continue, nao promove -
      e Receive-Job usa -ErrorAction SilentlyContinue para nao lancar em
      linha benigna de stderr re-emitida).
  (ASCII de proposito: PS 5.1 le .ps1 UTF-8 sem BOM como ANSI e mangla
  acentos - mensagens em PT-BR sem acento.)
#>
param(
    [Parameter(Mandatory = $true)][int]$From,
    [Parameter(Mandatory = $true)][int]$To,
    [int]$MaxMinutesPerStep = 0
)

$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)   # UTF-8 SEM BOM

# Recusas de preflight: Write-Host + exit (Write-Error sob EAP=Stop viraria
# exception e derrubaria um wrapper que chame este script com &).
if ($From -lt 1 -or $To -lt $From) {
    Write-Host "ERRO: faixa invalida: -From $From -To $To (esperado 1 <= From <= To)."; exit 1
}
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host 'ERRO: claude (Claude Code CLI) nao encontrado no PATH.'; exit 1
}

$runDir    = (Get-Location).Path
$katana    = Join-Path $runDir '.katana'
$tmpDir    = Join-Path $katana 'tmp'
$statePath = Join-Path $katana 'state.json'
# Lock dentro de .katana/tmp/ - caminho que o /go setup gitignora; um lock na
# raiz de .katana/ apareceria como untracked e mataria o preflight de arvore
# limpa do /go step.
$lock      = Join-Path $tmpDir 'go.lock'

New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
if (Test-Path $lock) {
    Write-Host "ERRO: ja existe um run headless (ou um morto sujo): $lock"
    Write-Host '      Confira se ha outro go.ps1 vivo; residuo se apaga a mao.'
    exit 1
}

function Read-KatanaState {
    # $null = ausente/ilegivel. Quem decide o que fazer com isso e o laco (fail-closed).
    if (-not (Test-Path $statePath)) { return $null }
    try { return ([IO.File]::ReadAllText($statePath) | ConvertFrom-Json) } catch { return $null }
}

[IO.File]::WriteAllText($lock, "pid=$PID`nstarted=$(Get-Date -Format o)`n", $enc)

$sid  = $null
$stop = ''       # motivo da parada; vazio = todas as etapas mergeadas
$retriedMaxTurns = $false   # 1 retry por etapa em error_max_turns; zera no merge
try {
    $timeoutTxt = 'sem timeout'
    if ($MaxMinutesPerStep -gt 0) { $timeoutTxt = "$MaxMinutesPerStep min/etapa" }
    Write-Host "==> Katana headless: etapas $From..$To ($timeoutTxt). Kill switch: /go stop (ou apague o lock e Ctrl+C)."

    for ($k = $From; $k -le $To; $k++) {
        $modo = 'sessao nova'
        if ($sid) { $modo = "resume $sid" }
        Write-Host ''
        Write-Host "--- etapa $k de ${To} ($modo) ---"

        $cliArgs = @('-p', "/go step $k", '--output-format', 'json', '--permission-mode', 'acceptEdits')
        if ($sid) { $cliArgs += @('--resume', $sid) }

        # Invoca o claude; com -MaxMinutesPerStep, dentro de um Job com Wait -Timeout.
        $out = $null
        if ($MaxMinutesPerStep -gt 0) {
            # stderr do claude vai para arquivo DENTRO do job (runspace novo,
            # EAP=Continue - nao promove ErrorRecord a exception). Sem isso,
            # Receive-Job re-emitiria cada linha de stderr como erro e o
            # EAP=Stop deste script lancaria na primeira linha benigna
            # (warning de update do CLI, por ex.) - "JSON invalido" mentiroso.
            $errLog = Join-Path $tmpDir "claude-step-$k.stderr.log"
            $job = Start-Job -ScriptBlock { param($dir, $a, $el) Set-Location $dir; & claude @a 2> $el } -ArgumentList $runDir, $cliArgs, $errLog
            $done = Wait-Job -Job $job -Timeout ($MaxMinutesPerStep * 60)
            if ($null -eq $done) {
                Stop-Job -Job $job
                Remove-Job -Job $job -Force
                $stop = "timeout de etapa ($MaxMinutesPerStep min) na etapa $k - confira processos claude orfaos e o estado com /go resume"
                break
            }
            try { $out = Receive-Job -Job $job -ErrorAction SilentlyContinue } catch { $out = $null }
            Remove-Job -Job $job -Force
        }
        else {
            $out = & claude @cliArgs
        }

        $raw = (@($out) -join "`n")
        $res = $null
        try { $res = $raw | ConvertFrom-Json } catch { }
        if ($null -eq $res) { $stop = "JSON invalido do claude na etapa $k (nao rodo as cegas)"; break }
        if ($res.session_id) { $sid = [string]$res.session_id }

        # Sinal de maquina = subtype; error_max_turns nao e veredito - o state decide.
        $subtype = [string]$res.subtype
        if ($subtype -ne 'success' -and $subtype -ne 'error_max_turns') {
            $stop = "claude terminou com subtype=$subtype na etapa $k"; break
        }

        # Veredito = state.json, nunca o texto da resposta.
        $state = Read-KatanaState
        if ($null -eq $state) { $stop = "state.json ausente/ilegivel apos a etapa $k (fail-closed)"; break }
        if ($state.status -eq 'hard_stop' -or $state.status -eq 'stopped') {
            $reason = 'sem stop_reason registrado'
            if ($state.stop_reason) { $reason = [string]$state.stop_reason }
            $stop = "run parou (status=$($state.status)) na etapa ${k}: $reason"
            break
        }
        $stepK = $state.steps."$k"
        if ($null -eq $stepK -or $stepK.status -ne 'merged') {
            # error_max_turns sem merged: o turno acabou no meio - 1 retry com
            # --resume continua do ponto exato. So um; depois e fail-closed.
            if ($subtype -eq 'error_max_turns' -and -not $retriedMaxTurns) {
                $retriedMaxTurns = $true
                Write-Host "    error_max_turns sem merged na etapa $k - 1 retry com --resume."
                $k--
                continue
            }
            $st = 'sem entrada no state'
            if ($stepK) { $st = [string]$stepK.status }
            $stop = "etapa $k nao avancou ate merged (status: $st; subtype: $subtype) - fail-closed"; break
        }
        $retriedMaxTurns = $false   # progresso real: o retry volta a valer pra proxima etapa

        $prTxt = 'merge local'
        if ($stepK.pr) { $prTxt = "PR #$($stepK.pr)" }
        Write-Host "    etapa $k mergeada - $prTxt (tentativas: $($stepK.attempts))"
    }
}
finally {
    if (Test-Path $lock) { Remove-Item $lock -Force -ErrorAction SilentlyContinue }
}

Write-Host ''
if ($stop) {
    Write-Host "==> Katana headless PAROU: $stop"
    Write-Host '    Estado em .katana/state.json; retomada: /go resume (interativo) ou re-rode este script.'
    exit 1
}
Write-Host "==> Katana headless: etapas $From..$To mergeadas. Revise os PRs; proximo: /go $($To + 1)."
exit 0
