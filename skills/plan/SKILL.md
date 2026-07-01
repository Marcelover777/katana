---
name: plan
description: Desenha o mapa — ideia falada ou repo herdado vira ROADMAP.md executável pelo /goal (+ .env.example, CLAUDE.md). Uma pergunta por vez, com recomendação; brownfield audita. Use em "/plan", "monta o mapa", "quero criar/fazer um app", ideia solta de projeto, repo sem roadmap.
---

# /plan — desenha o mapa

Entrada: a ideia do jeito que sair (voz, fluxo de consciência, meio termo técnico) ou um repo que já existe. Saída: `ROADMAP.md` que o /goal executa de ponta a ponta. O /plan pergunta pouco, recomenda sempre, escreve e entrega o verbo. Não escreve código.

## Superfícies (tudo que o /plan toca)

| Arquivo | O quê |
|---|---|
| `ROADMAP.md` (raiz) | o mapa — formato em [ROADMAP-TEMPLATE.md](ROADMAP-TEMPLATE.md) |
| `.env.example` | anotado por var: o que é, onde pegar, obrigatória/opcional. Nomes SÓ do catálogo [references/env-vars.md](references/env-vars.md) ou da doc oficial |
| `CLAUDE.md` do projeto | § Visão · § Stack (escolha + porquê) · § Comandos de check · § Invariantes/glossário (se houver) |
| `.katana/plans/NN-<slug>.md` | SÓ quando um passo é triado L (multi-sessão) |

Nada além disso. BRIEF, PLAN, STACK, SETUP, SUMMARY não existem aqui.

## Processo

### 1. Espelho (antes de qualquer pergunta)

O usuário fala solto. Antes de perguntar qualquer coisa, espelhe o que entendeu em no máximo 3 bullets:

```
Entendi:
- <o que vai existir, em 1 frase concreta>
- <pra quem / em que momento isso é usado>
- <a parte mais difusa, que vou estressar primeiro>
Correto? Algo essencial faltou?
```

Pega 80% dos desentendimentos no turn 1, antes de gastar 10 turns de grilling na direção errada.

### 2. Detecção de terreno

| Terreno | Sinal | Caminho |
|---|---|---|
| **Greenfield** | sem código | grilling + fundação (§4) → ROADMAP novo |
| **Brownfield** | código, sem `ROADMAP.md` | audit embutido: [references/audit.md](references/audit.md) — diagnóstico com âncora arquivo:linha vira passos |
| **Feature nova** | `ROADMAP.md` já existe | **adiciona passos, não recria.** Passo novo entra no FIM, com o próximo número (ordem real via `Depende de:`); o resto do mapa fica intacto |

### 3. Triagem S/M/L

Classifique em 1 linha e diga ao usuário. Cerimônia é imposto.

| Tamanho | Heurística | Caminho |
|---|---|---|
| **S** | ≤30 min, 1-2 arquivos, zero decisão de design | zero grilling: vira 1 passo direto no ROADMAP, com Aceite, e pronto |
| **M** | 1 sessão, decisões pequenas | 3-6 perguntas → 1-3 passos |
| **L** | multi-sessão, decisão de arquitetura, risco de quebra | grilling profundo → passo no ROADMAP + plano detalhado em `.katana/plans/` (§6) |

Se o usuário discordar da triagem, ele vence. Mas proponha sempre — ninguém percebe sozinho quando está sobre-planejando um S ou sub-planejando um L.

Projeto greenfield inteiro NÃO é L — L classifica um PASSO. App novo = fundação (§4) + ROADMAP de 5-12 passos; só um passo individual genuinamente multi-sessão ganha `.katana/plans/`.

### 4. Grilling

**Explore o codebase antes de perguntar.** Pergunta que Grep/Read responde não vai pro usuário. Se o usuário disser X e o código fizer Y, surfacie na hora: "você disse que cancela parcial, mas o código cancela a Order inteira — qual vale?"

Formato de TODA pergunta — uma por turno, SEMPRE com recomendação:

```
Pergunta: <concreta e fechada>
Recomendação: <opção + 1 frase do porquê>
Alternativas: <B / C — trade-off curto, se relevante>
```

- Estresse com cenário concreto: "se X fizer Y enquanto Z, o que acontece?"
- Feature com UI: cubra estado vazio, estado de erro, loading e quem NÃO pode ver (1 pergunta cada, só as relevantes).
- Pare quando objetivo e não-escopo estão claros, ou quando o usuário disser "suficiente". Não invente pergunta pra prolongar.

**Fundação (greenfield first-run — 3-4 perguntas, não comandos separados):**
1. Arquétipo → stack: recomende pela matriz [references/stack-matrix.md](references/stack-matrix.md) — default + porquê + 1 alternativa + gotchas. Nunca crave preço/limite; linke a pricing oficial.
2. Tema visual (só se tem UI): público, sensação, claro/escuro — 1 pergunta. O scaffold vira o passo 01.
3. Chaves/serviços: quais peças exigem env var — alimenta o `.env.example` e os gates dos passos.

### 5. Escreve

Nesta ordem:

1. **`ROADMAP.md`** — formato em [ROADMAP-TEMPLATE.md](ROADMAP-TEMPLATE.md). Regras duras:
   - **Passo = fatia demoável, não micro-tarefa.** Vertical (schema → API → UI → teste), ~5-12 passos. Um SaaS de waitlist → login → cobrança são ~6 passos, não 40 tasks.
   - **Numeração estável.** Nunca renumere: passo novo SEMPRE entra no fim, com o próximo número; a ordem real de execução é o `Depende de:`.
   - **Primeiro passo sem gate.** Algo visível no ar antes de qualquer chave.
   - **Gate com nome exato de env var** (catálogo ou doc oficial). Nunca invente nome.
   - **Aceite mecânico por passo** — comando/grep/test que o /goal roda. "Funciona corretamente" não é Aceite.
   - **Demo (60s).** Se não dá pra escrever a demo, o passo não tem pronto observável — volte ao objetivo.
   - **Fila única.** Follow-up, bug achado depois, ideia nova: vira PASSO aqui. Não existe backlog paralelo.
2. **`.env.example`** — por var: comentário com o que é + onde pegar (URL) + obrigatória/opcional + placeholder falso. Zero valor real: o arquivo é versionado.
3. **`CLAUDE.md`** — atualiza, não sobrescreve o que já existe: § Visão (1 linha), § Stack (tabela escolha + porquê + alternativa descartada + link pricing), § Comandos de check (o que o /goal roda pra validar cada passo), § Invariantes/glossário só se o domínio tiver termos que não podem ser confundidos.

### 6. Triagem L → `.katana/plans/NN-<slug>.md`

SÓ para passo genuinamente multi-sessão. O passo continua no ROADMAP (ganha a linha `Plano: .katana/plans/NN-<slug>.md`); o arquivo detalha:

- **Tasks atômicas**, cada uma com `read_first` (arquivos a ler antes de mexer) e `acceptance` verificável via grep/build/test.
- **Sem código no plano.** Decisões, áreas afetadas, contratos em prosa. Exceção rara: tipo/schema quando encoda a decisão melhor que prosa.
- **Vertical slices:** cada task corta as camadas numa fatia fina, não uma camada inteira por vez.
- **Task com >5 subtasks é 2 tasks.** Não existe campo de esforço.
- **Must-Haves goal-backward** (task ✅ ≠ objetivo ✅ — placeholder coerente também "completa" task):
  - *Truths* — comportamentos observáveis.
  - *Artifacts* — arquivos com substância real (min. de linhas, exports).
  - *Key Links* — conexões críticas via regex (ex.: `fetch\(['"]/api/x`).
  - *Demo* — 3-6 passos, ≤60s.
- **Auto-suficiente para reset:** sessão nova lendo só o plano + CLAUDE.md consegue executar o passo inteiro.

### 7. Fecha e entrega o verbo

Mostre o mapa em 1 mensagem (número + título + 1 linha + gate) e pergunte UMA vez: "falta passo pra ficar genuinamente funcional? Algum é especulativo e sai?" Itere se preciso, e feche:

> ROADMAP.md pronto com N passos. Agora: **/goal 1..N** — ou **/goal 1** pra ver um passo primeiro. Gate faltando? O /goal para e te diz a var exata e onde pegar.

## Anti-padrões

- ❌ Passo horizontal ("todos os models", depois "todas as APIs") — mata o demoável e esconde bug de integração.
- ❌ Passo que entrega meia-feature (mock, dado chumbado, "arrumo depois") — o que entra no mapa sai inteiro.
- ❌ Aceite que exige julgamento ("está bom", "funciona") — o /goal não destrava com vibe.
- ❌ Inventar nome de env var — catálogo ou doc oficial, senão o gate do /goal quebra à toa.
- ❌ Cravar preço/limite de free-tier — envelhece e vira mentira; linke a pricing.
- ❌ Dez perguntas de uma vez, ou pergunta que o código responde.
- ❌ Listar opções sem recomendar — você é o engenheiro, não um menu.
- ❌ `.katana/plans/` para passo S/M — plano detalhado é exceção de triagem L, não etapa do fluxo.
- ❌ Recriar ROADMAP existente ao receber feature nova — adiciona passos, preserva numeração e histórico.

## Próxima ação

Mapa fechado → **/goal 1..N**. Quebrou algo no caminho? **/fix**.
