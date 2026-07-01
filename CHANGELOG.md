# Changelog

## 1.0.0 — 2026-07-01

Primeira lâmina. Quarta geração de uma linhagem: **solodev** ensinou a disciplina
(brainstorm → plan → coding → fix → ship, byte-idênticos nas três gerações — acertaram
de primeira). O **Crucible** fundiu e trouxe a melhor UX da série: um verbo único
("executa o passo 0X") + gates que param com o link exato da chave faltando. O **Forger**
forjou as melhores mecânicas (anti-placeholder grep, Aceite verificável, deny-list de
destrutivos, runner headless Windows-correto) — e as afogou em burocracia: 17 comandos,
26 superfícies de estado, ~70 termos, 4 registros do mesmo fato, e uma skill (/dev-help)
cujo único trabalho era explicar as outras 16. A Katana é o corte.

### Fundido
- **17 comandos → 3.** /plan absorve brainstorm+plan+roadmap+audit e as perguntas de
  stack/design/setup. /goal absorve next+coding+ship+loop+ops. /fix é port quase literal —
  a melhor skill da linhagem nunca precisou mudar.
- **26 superfícies → 3** no projeto do usuário: ROADMAP.md (fila única), .katana/
  (state.json + LOG.md), .env.example. BRIEF, PLAN, SUMMARY, STATUS, JOURNAL, PROGRESS,
  BACKLOG e afins deixaram de existir como arquivos separados.

### Invertido
- **Autonomia agora é o default.** `/goal 1..N` roda sem devolver o turno: push da branch,
  PR, self-review adversarial e merge são autorizados por definição. No Forger, o default
  (`step`) avançava UMA unidade — o carro-chefe, por padrão, não fazia nada que o
  /dev-next já não fizesse. As paradas continuam existindo, mas viraram **lista fechada**:
  gate de chave, 3 tentativas falhas, destrutivo-irreversível (agora deny mecânico via
  hook, não prompt), conflito não-trivial, contradição de produto, preflight sujo/vermelho.
  Autonomia = f(verificação): o que destrava merge é Aceite mecânico verde, nunca vibe.

### Morto (e por quê)
- **Níveis de autonomia e AUTONOMY.md** — um slider que ninguém subia; agora só existe o modo rápido.
- **BACKLOG 9-colunas + JOURNAL/PROGRESS/STATUS** — 4 registros do mesmo fato; sobrou UM log.
- **/dev-help e GLOSSARY.md** — repo que precisa de mapa tem comandos demais; com 3, o mapa é uma frase.
- **Compat com prefixos das gerações anteriores** — rebrand limpo; o validador nega regressão.
- **Autocommit hook e loop.sh** — commit é ato do loop, não efeito colateral; headless é goal.ps1.

*/plan desenha o mapa. /goal dirige até o fim. /fix quando quebra.*
