# RE-START — o prompt de retomada de projeto

**O que é:** um prompt-mestre pra colar no Claude Code sempre que você voltar a mexer num projeto — seja depois de 6 meses parado, seja depois de 2 semanas. Ele força uma retomada em 6 fases: reconhecimento → auditoria profunda → visão estratégica → backlog priorizado → re-fundação dos docs → relatório final. Você termina sabendo exatamente onde o projeto está, pra onde vai, e qual é a primeira ação de amanhã.

**Quando usar:** no momento "vamos ao que interessa desse projeto" — quando você quer re-startar com força total em vez de sair cutucando código no escuro.

**Como usar:** abra o Claude Code na raiz do projeto e cole tudo abaixo da linha. Opcionalmente, preencha o `FOCO` no final. Se o projeto usa a Katana, o backlog gerado alimenta o `/plan` direto — as filosofias são as mesmas (âncora `arquivo:linha`, Aceite verificável, fila única).

---

Vamos re-startar este projeto. Sua missão tem 6 fases — execute todas, em ordem, nesta sessão. O resultado final: eu sei exatamente onde o projeto está, o que ele é, pra onde ele vai, e a primeira ação concreta já está definida com critério de pronto verificável.

## Postura

Pense como um conselho de 4 vozes e me entregue a síntese — não as 4 opiniões:

- **O arquiteto cético** — assume que tem coisa quebrada até prova em contrário.
- **O estrategista de produto** — enxerga o que este projeto PODE virar e o que o diferencia.
- **O engenheiro pragmático** — sabe o custo real de cada promessa e desconfia de reescrita grande.
- **O usuário final** — não perdoa fricção, não lê manual, quer valor nos primeiros 5 minutos.

## Regras de evidência (valem para TODAS as fases)

1. **Achado sem âncora não existe.** Todo achado carrega `arquivo:linha` ou o comando cuja saída o prova. Veredito sem endereço não ajuda ninguém.
2. **Ferramenta que não rodou = "não avaliado (motivo)", NUNCA "ok presumido".** Não conseguiu rodar os testes ou o audit de deps? A dimensão fica ⏭️ com a instrução de como destravar — não um ✅ de fé.
3. **Calibre a régua pela maturidade.** Leia o git (`git log --oneline | wc -l`, data do 1º commit). Dimensão que o estágio do projeto ainda não pede = ⏭️ ainda-não, nunca ❌. Protótipo de 2 semanas não leva vermelho por falta de observabilidade.
4. **Honestidade brutal.** Não me elogie — elogio não conserta nada. O relatório vale pelo que dói. Mas dureza sem âncora é só grosseria: toda crítica volta pra regra 1.
5. **Nunca ecoe valor de segredo.** Achou chave em `.env` ou no histórico? Referencie o lugar e o comando que prova — ecoar o valor re-vaza a chave.
6. **Nenhuma nota global do projeto.** Cada dimensão tem a própria régua; média esconde o ❌ que importa.

---

## FASE 1 — Reconhecimento (read-only)

Mapeie o território antes de opinar sobre ele:

- **Identidade:** manifesto(s), stack, linguagem, frameworks, como se instala e como se roda.
- **Anatomia:** estrutura de diretórios, entrypoints, os 5 arquivos mais importantes (e por quê).
- **Pulso do git:** idade, volume e cadência de commits; o que os últimos 10 commits contam; branches e PRs abertos.
- **Trabalho pela metade:** branch órfã, migration incompleta, feature flag esquecida, TODO/FIXME/HACK no código, arquivo de estado de ferramenta anterior (`ROADMAP.md`, `.katana/state.json`, issues abertas). Isto é ouro pra quem está voltando — liste tudo.
- **Sinais vitais:** o projeto roda? build passa? testes passam? CI existe e está verde? (Rode o que der pra rodar em modo leitura; o que não der, ⏭️ com motivo.)

**Entregável — "Mapa do território":** ≤20 linhas no chat, terminando com a seção **"Onde você parou"** — os fios soltos encontrados, em linguagem humana.

## FASE 2 — Auditoria profunda (read-only)

Pontue cada dimensão com ✅ ⚠️ ❌ ⏭️ — só as que fazem sentido pro tipo e maturidade do projeto (CLI/lib pulam as de web com ⏭️ + motivo):

| Dimensão | O que olhar |
|----------|-------------|
| Propósito vs. realidade | o que os docs prometem vs. o que o código entrega — o drift entre os dois é achado |
| Arquitetura | deus-módulo, acoplamento, camadas violadas, duplicação — subjetivo, então sempre com âncora |
| Qualidade de código | pontos de fragilidade real, não estilo: tratamento de erro, casos de borda, código morto |
| Segurança | validação de input, authn/z, segredo no código ou no histórico (`git log --all -- .env`), CVE em deps |
| Saúde de deps | audit do ecossistema (`npm audit` / `pip-audit` / equivalente), deps abandonadas, lockfile commitado |
| Testes | suíte existe? passa? cobre os caminhos que dão dinheiro/dor? bordas? |
| DX & build | setup em quantos passos, scripts `build`/`test`/`lint`, CI — só se a maturidade já pede |
| Performance | gargalo evidente (N+1, bundle, loop quente) — só onde medível; senão ⏭️ |
| UX / interface | fricção, estados vazios/erro/carregando, hierarquia — ancorado em componente/tela |
| Docs | o **teste do recém-chegado**: alguém novo roda o projeto em ≤15 min só com os docs? cada tropeço é achado |
| Observabilidade | logs úteis, rastreio de erro — só se a maturidade já pede |

**Todo ⚠️/❌ no formato:** `âncora — o que — por que importa`. Priorize achados por consequência, não por facilidade de detectar.

**Entregável:** o placar (tabela dimensão | nota | evidência) + a lista de achados. Nada de consertar durante o diagnóstico — quem conserta é o backlog.

## FASE 3 — Essência e visão estratégica

Agora pense grande — mas ancorado no que a Fase 1 e 2 revelaram:

- **Essência em 1 frase:** o que este projeto É, pra quem, resolvendo qual dor. Se não der pra inferir dos artefatos, **me pergunte — não chute silenciosamente**. Se der, declare a inferência e siga.
- **Anti-visão:** o que este projeto NUNCA deve virar (a feature sedutora que desfoca, o público que não é o nosso).
- **3 horizontes:**
  - **H1 — Consolidar (semanas):** o que torna sólido o que já existe.
  - **H2 — Expandir (1–2 meses):** o que multiplica o valor pro usuário atual.
  - **H3 — Transformar (3+ meses):** a aposta que muda o patamar do projeto.
- **As 5 perguntas de elevação** (responda todas, com respostas específicas deste projeto — genérico não vale):
  1. Se isto tivesse 100× mais usuários amanhã, o que quebra primeiro?
  2. Se você só pudesse fazer 3 mudanças, quais — e por quê essas?
  3. **O que DELETAR** que torna o projeto melhor? (Subtração é estratégia: código, feature, doc, dependência.)
  4. O que geraria "uau" nos primeiros 5 minutos de quem chega agora?
  5. Qual é a vantagem injusta deste projeto — e como dobrar a aposta nela?

**Entregável:** a visão em ≤1 página no chat.

## FASE 4 — Backlog único e priorizado

Transforme TUDO (achados da Fase 2 + apostas da Fase 3) numa **fila única** — não listas paralelas de "dívida" vs. "features"; fila única força escolha honesta.

**Formato de cada item:**

```
[ID] Título no infinitivo (⚡ se for quick win de <1h)
Por quê: âncora no achado (arquivo:linha) ou no horizonte (H1/H2/H3)
Aceite: comando ou observação binária que prova que está pronto
Esforço: P / M / G        Risco: o que pode dar errado ao fazer
```

**Regras da fila:**
- **Item sem Aceite verificável não entra.** "Melhorar X" não é item; "X passa a fazer Y, provado por Z" é.
- **Aceite de achado = o inverso verificável do achado.** Detectou `.env` rastreado → Aceite: `git ls-files .env` vazio.
- **Ordenação:** segurança e quebrado furam fila; depois (impacto × alinhamento com a essência) ÷ esforço; ⚡ quick wins sobem — momentum importa num re-start.
- **Remédio destrutivo/irreversível** (rotacionar segredo, reescrever histórico, deletar dado): entra na fila com a marca **[EXIGE CONFIRMAÇÃO HUMANA]** — nunca é executado neste prompt.
- **Onde gravar:** no padrão que o projeto JÁ usa (`ROADMAP.md`, issues, board). Se não houver padrão, crie `BACKLOG.md` na raiz. Um lugar só.

**Entregável:** o arquivo gravado + o top 10 mostrado no chat.

## FASE 5 — Re-fundação dos docs

- **Inventário:** liste o que existe (README, PRD, `CLAUDE.md`/`AGENTS.md`, CONTRIBUTING, regras de agente, wiki solta).
- **Arqueologia antes da reescrita:** extraia dos docs atuais toda decisão e restrição que continua válida. **Reescrever não é amnésia** — decisão antiga perdida vira bug novo daqui a 3 meses.
- **Reescreva com papéis claros e zero duplicação** (cada assunto mora num lugar só; os outros linkam):
  - **README** — porta de entrada: o que é, rodar em ≤15 min, arquitetura em ≤10 linhas, link pros demais.
  - **PRD** — o produto: problema, usuário, essência e anti-visão (Fase 3), **não-metas explícitas**, critérios de sucesso mensuráveis, os 3 horizontes.
  - **CLAUDE.md** — manual operacional do agente: comandos de build/test/lint, convenções do código, mapa de diretórios, o que NUNCA fazer. **Enxuto e imperativo — cada linha cobra contexto em toda sessão futura.**
  - **BACKLOG** — a fila da Fase 4 (só referencie; não duplique).
- **Doc que não paga o próprio custo:** proponha deletar, com motivo. Doc desatualizado é pior que doc nenhum — ele mente com autoridade.
- **Consistência final:** nenhum doc contradiz outro; todo comando citado em doc foi executado por você e funciona.

**Entregável:** docs reescritos + resumo no chat do que mudou em cada um e por quê.

## FASE 6 — Relatório de re-start

Feche com ≤1 página no chat:

1. **Estado do projeto em ≤5 linhas** — pra eu reler daqui a 6 meses e me situar em 30 segundos.
2. **Top 5 riscos** (cada um com âncora) e **top 5 oportunidades** (cada uma com horizonte).
3. **Os 3 primeiros passos** — os itens do topo do backlog, cada um com seu Aceite. O passo 1 é o que eu começo amanhã.
4. **O que ficou devendo:** dimensão não avaliada, pergunta aberta, hipótese não confirmada. Silêncio não é cobertura — deixe o buraco visível.

## Guardrails

- **Fases 1–3 são read-only** no código do projeto.
- **Fases 4–5 escrevem SÓ docs** (backlog, PRD, README, CLAUDE.md). Nenhuma linha de código de produção muda por este prompt — consertar é trabalho pós-re-start, puxado do backlog, um item por vez.
- **Nada destrutivo, nunca, sem me perguntar:** deletar arquivo, rebase, force-push, rotação de segredo, limpeza de histórico.
- **Faltou informação que só eu tenho** (visão de negócio, público, restrição externa)? Pergunte explicitamente — suposição silenciosa em decisão de produto é o único erro sem conserto barato.

## Definition of Done

- [ ] Mapa do território + "Onde você parou" (Fase 1)
- [ ] Placar de auditoria com todo ⚠️/❌ ancorado (Fase 2)
- [ ] Essência, anti-visão, 3 horizontes e as 5 perguntas respondidas (Fase 3)
- [ ] Backlog único gravado, todo item com Aceite verificável (Fase 4)
- [ ] Docs re-fundados, sem duplicação, comandos testados (Fase 5)
- [ ] Relatório de re-start com os 3 primeiros passos (Fase 6)

---

**FOCO desta rodada (opcional):** _preencha se quiser direcionar a atenção — é prioridade de atenção, não escopo exclusivo. Deixe em branco para o re-start completo._
