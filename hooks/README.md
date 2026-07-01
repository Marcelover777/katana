# Hooks da Katana

Três hooks Node (CommonJS puro, zero dependências, o mesmo `.js` roda em
Windows e POSIX). Todos **silent-fail**: qualquer erro de FS/parse → o hook
some em silêncio — nunca bloqueia sua sessão. Nenhum sobe worker, DB ou porta:
é ler `.katana/state.json` e `.katana/LOG.md`, escrever no máximo o próprio
state, e mais nada.

| Hook | Evento | O que faz |
|---|---|---|
| `katana-session-start.js` | `SessionStart` | Run ativo (running/hard_stop) → injeta **1 linha** de estado (~55 tokens). Sem run → injeta a cauda do `.katana/LOG.md` (cap 8 KB, corte em fronteira `## `, recusa symlink). Nada → silêncio. |
| `katana-continue.js` | `Stop` | Run `running` com etapa pendente → **bloqueia** a devolução do turno ("continue de onde parou") e incrementa `nudges` no state. 3 nudges sem progresso → deixa parar e marca `hard_stop`/`stalled`. |
| `katana-guard.js` | `PreToolUse` (Bash) | **Nega mecanicamente** a lista destrutiva via `permissionDecision:"deny"`. Force-push, deletar main/master remota (`push --delete`/refspec `:main`), `reset --hard`, `clean -f`: sempre. O resto (rebase -i, `branch -D main` local, `rm -rf` fora do repo, filter-branch/+refspec, commit em main): só com run ativo. |

## Como o /go setup os registra

`install.ps1` / `install.sh` só **copiam** os arquivos para `.claude/hooks/` —
copiar não ativa nada. Quem ativa é o **`/go setup`** (1x por repo), gravando
exatamente estes três registros no `.claude/settings.json` do projeto:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/katana-session-start.js\"" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/katana-continue.js\"" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/katana-guard.js\"" }
        ]
      }
    ]
  }
}
```

`$CLAUDE_PROJECT_DIR` é definido pelo próprio Claude Code ao executar hooks e
aponta para a raiz do projeto — o registro funciona mesmo com a sessão aberta
num subdiretório, nos dois SOs. (Fallback: o caminho relativo
`node .claude/hooks/katana-guard.js` também funciona, mas SÓ quando a sessão
abre na raiz — fora dela o hook falha em silêncio. Prefira a env var.)
Instalou com `-Global` (hooks em `~/.claude/hooks/`)? O `/go setup` detecta e
grava o caminho absoluto correspondente no lugar.

## katana-session-start.js — continuidade que não cobra pedágio

O problema clássico: injetar o log inteiro a cada sessão custa contexto
permanente. Aqui a injeção é proporcional ao que existe:

- **Run no meio** (`running` ou `hard_stop`): uma linha —
  `katana: run /go ATIVO — passo 3 de [1..5] (failed, tentativa 2). …` —
  com a ação sugerida (`/go resume`) e o `stop_reason` truncado (que carrega o
  gate pendente, se houver: só o NOME da env var, nunca valor).
- **Sem run**: a cauda do `.katana/LOG.md`, cap 8 KB, recomeçando em fronteira
  de bloco `\n## ` para nunca cortar um bloco no meio.
- **Nada**: saída vazia. Projeto sem Katana não paga nada.

## katana-continue.js — o modelo não devolve o turno no meio do run

Se o modelo tentar encerrar o turno com run `running` e etapa pendente, o hook
responde `{"decision":"block","reason":"Run /go ativo: etapa K (status).
Continue de onde parou; releia .katana/state.json e o ROADMAP.md."}` — e o
Claude Code re-injeta a continuação.

O guard anti-stall é o que separa isso de um moto-perpétuo: cada bloqueio
grava `nudges+1` e um fingerprint de progresso (`etapa|status|attempts`) no
state. **3 nudges com o MESMO fingerprint** → o hook não bloqueia mais: marca
`hard_stop` com `stop_reason="stalled: …"` e deixa a sessão parar. A decisão
é sempre por fingerprint — fingerprint diferente = progresso real, e o
bloqueio continua valendo não importa quantos nudges já houve (o runner /go
também zera `nudges` a cada transição de status), então um run longo e
saudável pode ser re-injetado quantas vezes precisar. E o hook **só bloqueia
se conseguiu persistir o nudge** — contador que não sobe seria bloqueio que
nunca expira.

`/go stop` (kill switch) marca `status=stopped` → o hook libera na hora.

## katana-guard.js — deny é força bruta, não pedido educado

Comando composto é fatiado em segmentos (`&&`, `||`, `;`, `|`, newline) e cada
regra avalia um segmento com as aspas normalizadas: aspas em volta de token
único caem (`git push "--force"` não disfarça a flag) e trecho quotado com
espaço é texto livre que sai da avaliação — um `--force` dentro da mensagem de
um `git commit -m "…"` não derruba o commit. Na dúvida (aspa desbalanceada),
o guard avalia o texto cru e **nega**: falso positivo custa um rephrase; falso
negativo custa histórico. Limitação conhecida (documentada no header do hook):
flag escondida em variável de shell (`F=--force; git push $F`) não é detectada
— o guard é cinto contra deriva do modelo, não sandbox.

O deny volta como erro para o modelo, e o SKILL.md do /go trata deny do guard
como **parada dura** — nunca contorno. O guard nunca executa nada: a única
coisa que ele sabe fazer é dizer não.

## Filosofia: copiar é inofensivo, ativar é opt-in explícito (/go setup)

- **Copiar é inofensivo**: `install.ps1`/`install.sh` não tocam em
  `settings.json`. Hook copiado e não registrado é arquivo morto.
- **Registrar é opt-in explícito**: `/go setup`, uma vez por repo, com o diff
  do settings.json na sua frente.
- Depois de registrados: session-start e continue só leem (+ 1 write contado
  no próprio `.katana/`); o guard só **nega** — negar é o modo seguro de
  falhar. Nenhum hook pede `bypassPermissions`, executa git por conta própria
  ou toca em arquivo fora de `.katana/`.

## Desinstalar

1. Remova os três blocos (`SessionStart`, `Stop`, `PreToolUse`) do
   `.claude/settings.json` do projeto (ou só o bloco do hook indesejado).
2. Apague `.claude/hooks/katana-*.js`.

Sem os hooks o /go continua funcionando, degradado: sem `continue` o modelo
pode devolver o turno no meio (use `/go resume`); sem `guard` a lista
destrutiva vira só instrução de prompt; sem `session-start` a sessão nova não
recebe contexto de continuidade.
