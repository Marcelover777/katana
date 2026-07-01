#requires -version 5
#
# Katana - instalador Windows PowerShell (5.1-compativel, ASCII-only de proposito:
# PS 5.1 le UTF-8 sem BOM como ANSI, entao este arquivo nao usa acento).
#
# Copia skills/ para <alvo>\.claude\skills\ e hooks/ (*.js + README.md, o
# manual de registro que o /go setup replica) para <alvo>\.claude\hooks\.
# NAO registra hooks em settings.json - isso e trabalho do /go setup, que pede
# permissao dentro do proprio projeto. Copiar e inofensivo; ativar e opt-in.
#
# Uso:
#   .\install.ps1                      # instala no projeto atual
#   .\install.ps1 -TargetDir C:\meu\projeto
#   .\install.ps1 -Global              # instala em ~\.claude (todas as sessoes)
#   irm https://raw.githubusercontent.com/Marcelover777/katana/main/install.ps1 | iex
#
param(
    [switch]$Global,
    [string]$TargetDir = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/Marcelover777/katana.git'
$Skills  = @('plan', 'go', 'fix')

if ($Global) {
    $ClaudeDir = Join-Path $HOME '.claude'
} else {
    $ClaudeDir = Join-Path $TargetDir '.claude'
}

# --- Descobrir a fonte -------------------------------------------------------
# Caso A (clone local): este script esta no repo, ao lado de skills\.
# Caso B (pipe irm|iex): sem arquivos locais - clona o repo publico num tmp.
$SourceDir  = $null
$CleanupTmp = $null

if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'skills'))) {
    $SourceDir = $PSScriptRoot
}
else {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error 'git nao encontrado. Instale o git ou clone o repo manualmente.'
        exit 1
    }
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("katana-" + [System.Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $CleanupTmp = $tmp
    Write-Host "==> Baixando Katana de $RepoUrl ..."
    # SEM redirecionar stderr: em PS 5.1 sob EAP=Stop, 2>&1 em exe nativo
    # promove a primeira linha de stderr a exception terminante - e git clone
    # SEMPRE escreve "Cloning into..." em stderr, mesmo no sucesso. --quiet
    # cala o sucesso; o veredito e o $LASTEXITCODE, nunca o stderr.
    git clone --quiet --depth 1 $RepoUrl $tmp
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git clone falhou (codigo $LASTEXITCODE). Verifique a conexao ou clone manualmente."
        exit 1
    }
    $SourceDir = $tmp
}

try {
    $srcSkills = Join-Path $SourceDir 'skills'
    if (-not (Test-Path $srcSkills)) {
        Write-Error "nao encontrei a pasta skills\ em $SourceDir"
        exit 1
    }

    # --- Skills --------------------------------------------------------------
    $destSkills = Join-Path $ClaudeDir 'skills'
    New-Item -ItemType Directory -Force -Path $destSkills | Out-Null
    Write-Host "==> Instalando skills em: $destSkills"
    foreach ($skill in $Skills) {
        $src = Join-Path $srcSkills $skill
        if (Test-Path $src) {
            $target = Join-Path $destSkills $skill
            if (Test-Path $target) { Remove-Item -Recurse -Force $target }
            Copy-Item -Recurse -Force $src $target
            Write-Host "    /$skill"
        }
        else {
            Write-Warning "    pulado (nao encontrado na fonte): $skill"
        }
    }

    # --- Hooks (copiados, NAO registrados) ------------------------------------
    $HooksCopied = $false
    $srcHooks = Join-Path $SourceDir 'hooks'
    if (Test-Path $srcHooks) {
        $HooksCopied = $true
        $destHooks = Join-Path $ClaudeDir 'hooks'
        New-Item -ItemType Directory -Force -Path $destHooks | Out-Null
        Write-Host "==> Copiando hooks em: $destHooks"
        # *.js + README.md: o README leva os 3 blocos JSON canonicos de
        # registro - sem ele no disco, o /go setup teria que inventar o shape.
        Get-ChildItem -Path $srcHooks -File |
            Where-Object { $_.Extension -eq '.js' -or $_.Name -eq 'README.md' } |
            ForEach-Object {
                Copy-Item -Force $_.FullName (Join-Path $destHooks $_.Name)
                Write-Host "    $($_.Name)"
            }
    }
    else {
        Write-Warning 'pasta hooks\ nao encontrada na fonte - pulando hooks.'
    }

    Write-Host ''
    Write-Host 'Pronto.'
    Write-Host ''
    Write-Host '  /plan desenha o mapa. /go dirige ate o fim. /fix quando quebra.'
    Write-Host ''
    if ($HooksCopied) {
        Write-Host 'Os hooks foram copiados mas NAO registrados (nenhum settings.json foi tocado).'
    }
    Write-Host 'Rode /go setup no projeto para ativar a autonomia: registra os hooks,'
    Write-Host 'a allowlist git/gh e o gitignore de .katana/.'
}
finally {
    if ($CleanupTmp -and (Test-Path $CleanupTmp)) {
        Remove-Item -Recurse -Force $CleanupTmp -ErrorAction SilentlyContinue
    }
}
