#!/usr/bin/env bash
#
# Katana — instalador POSIX.
# Copia skills/ para <alvo>/.claude/skills/ e hooks/ (*.js + README.md, o
# manual de registro que o /go setup replica) para <alvo>/.claude/hooks/.
# NÃO registra hooks em settings.json — isso é trabalho do /go setup, que pede
# permissão dentro do próprio projeto. Copiar é inofensivo; ativar é opt-in.
#
# Uso:
#   ./install.sh                 # instala no projeto atual
#   ./install.sh /meu/projeto    # instala no diretório dado
#   ./install.sh --global        # instala em ~/.claude (todas as sessões)
#   curl -fsSL https://raw.githubusercontent.com/Marcelover777/katana/main/install.sh | bash
#
set -euo pipefail

REPO_URL="https://github.com/Marcelover777/katana.git"
SKILLS=(plan go fix)

GLOBAL=0
TARGET_DIR="$(pwd)"
for arg in "$@"; do
  case "$arg" in
    --global|-g) GLOBAL=1 ;;
    -*) echo "uso: ./install.sh [--global] [TARGET_DIR]" >&2; exit 1 ;;
    *) TARGET_DIR="$arg" ;;
  esac
done

if [ "$GLOBAL" -eq 1 ]; then
  CLAUDE_DIR="$HOME/.claude"
else
  CLAUDE_DIR="$TARGET_DIR/.claude"
fi

# --- Descobrir a fonte -------------------------------------------------------
# Caso A (clone local): este script está no repo, ao lado de skills/.
# Caso B (pipe curl|bash): sem arquivos locais — clona o repo público num tmp.
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
fi

CLEANUP_TMP=""
if [ -n "$SCRIPT_DIR" ] && [ -d "$SCRIPT_DIR/skills" ]; then
  SOURCE_DIR="$SCRIPT_DIR"
else
  command -v git >/dev/null 2>&1 || {
    echo "erro: git não encontrado. Instale o git ou clone o repo manualmente." >&2
    exit 1
  }
  TMP_DIR="$(mktemp -d)"
  CLEANUP_TMP="$TMP_DIR"
  echo "==> Baixando Katana de $REPO_URL ..."
  git clone --depth 1 "$REPO_URL" "$TMP_DIR" >/dev/null 2>&1
  SOURCE_DIR="$TMP_DIR"
fi

cleanup() {
  if [ -n "$CLEANUP_TMP" ] && [ -d "$CLEANUP_TMP" ]; then
    rm -rf "$CLEANUP_TMP"
  fi
}
trap cleanup EXIT

if [ ! -d "$SOURCE_DIR/skills" ]; then
  echo "erro: não encontrei a pasta skills/ em $SOURCE_DIR" >&2
  exit 1
fi

# --- Skills -------------------------------------------------------------------
DEST_SKILLS="$CLAUDE_DIR/skills"
mkdir -p "$DEST_SKILLS"
echo "==> Instalando skills em: $DEST_SKILLS"
for skill in "${SKILLS[@]}"; do
  src="$SOURCE_DIR/skills/$skill"
  if [ -d "$src" ]; then
    rm -rf "${DEST_SKILLS:?}/$skill"
    cp -R "$src" "$DEST_SKILLS/$skill"
    echo "    /$skill"
  else
    echo "    pulado (não encontrado na fonte): $skill" >&2
  fi
done

# --- Hooks (copiados, NÃO registrados) -----------------------------------------
HOOKS_COPIED=0
if [ -d "$SOURCE_DIR/hooks" ]; then
  HOOKS_COPIED=1
  DEST_HOOKS="$CLAUDE_DIR/hooks"
  mkdir -p "$DEST_HOOKS"
  echo "==> Copiando hooks em: $DEST_HOOKS"
  # *.js + README.md: o README leva os 3 blocos JSON canônicos de registro —
  # sem ele no disco, o /go setup teria que inventar o shape.
  for f in "$SOURCE_DIR"/hooks/*.js "$SOURCE_DIR/hooks/README.md"; do
    [ -e "$f" ] || continue
    cp -f "$f" "$DEST_HOOKS/$(basename "$f")"
    echo "    $(basename "$f")"
  done
else
  echo "aviso: pasta hooks/ não encontrada na fonte — pulando hooks." >&2
fi

echo ""
echo "Pronto."
echo ""
echo "  /plan desenha o mapa. /go dirige até o fim. /fix quando quebra."
echo ""
if [ "$HOOKS_COPIED" -eq 1 ]; then
  echo "Os hooks foram copiados mas NÃO registrados (nenhum settings.json foi tocado)."
fi
echo "Rode /go setup no projeto para ativar a autonomia: registra os hooks,"
echo "a allowlist git/gh e o gitignore de .katana/."
