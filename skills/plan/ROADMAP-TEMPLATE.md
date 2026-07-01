# ROADMAP.md — o mapa que o /go executa

Salvar na **raiz** do projeto. Escrito pelo /plan; executado pelo /go (cada passo vira um PR "Etapa NN — título"). O `[ ]` no título do passo é a verdade do progresso — **só o /go marca `[x]`**, com Aceite verde; o `[x]` só chega ao main via merge do PR da etapa (o /go o commita na própria branch, nunca direto em main). Passos inline: não existe pasta de detalhes separada.

---

```markdown
---
project: <kebab-case-slug>
created: YYYY-MM-DD
status: em-andamento   # em-andamento | concluido
---

# ROADMAP — <Nome do projeto>

## O produto em 1 linha

<O que é e o que a versão completa entrega. Stack e porquês vivem no CLAUDE.md § Stack.>

## 01 — <verbo + objeto> [ ]
Objetivo observável: <algo no ar, sem precisar de chave nenhuma>.
Gate: Nenhum.
Depende de: Nenhum.
Tasks:
- [ ] <task concreta vertical>
- [ ] <task>
Aceite:
- [ ] `<comando/grep/test executável>`
Demo (60s): <passo a passo>

## 02 — Login [ ]
Objetivo observável: <o que dá pra VER/FAZER depois>.
Gate: SUPABASE_URL, SUPABASE_ANON_KEY.
Depende de: 01.
Tasks:
- [ ] <task concreta vertical>
- [ ] <task>
Aceite:
- [ ] `<comando/grep/test executável>`
- [ ] `npm run build` verde
Demo (60s): <passo a passo>

## 03 — <passo L, multi-sessão> [ ]
Objetivo observável: <...>.
Gate: Nenhum.
Depende de: 02.
Plano: .katana/plans/03-<slug>.md
Tasks:
- [ ] <resumo — as tasks detalhadas vivem no plano>
Aceite:
- [ ] `<comando>`
Demo (60s): <...>
```

---

## Regras (quem escreve obedece; quem executa confia)

- **Passo = fatia demoável, não micro-tarefa.** Uma feature ponta a ponta (schema → API → UI → teste), ~5-12 passos no total. Vertical, nunca por camada.
- **Numeração estável.** Nunca renumere um passo criado — commits, PRs e o LOG referenciam o número. Passo novo SEMPRE entra no fim da fila, com o próximo número; a ordem real de execução é expressa via `Depende de:`.
- **Primeiro passo sem gate.** Algo visível antes de qualquer chave — motivação antes de fricção.
- **Gate = nomes exatos de env var**, separados por vírgula, ou `Nenhum`. Nomes do catálogo (`references/env-vars.md`) ou da doc oficial. O /go coleta os gates da faixa inteira e confere o `.env` de uma vez, no preflight.
- **Aceite mecânico.** Comando/grep/test que roda sem julgamento humano. É o que destrava o merge — Aceite fraco = lixo verde mergeado.
- **Demo (60s).** Se não dá pra escrever, o passo não tem pronto observável.
- **Fila única.** Follow-up, bug achado depois, ideia nova: vira passo novo AQUI. Não existe backlog paralelo, icebox nem segunda lista.
- **`Plano:` só em passo L.** S/M vivem inteiros neste arquivo.
