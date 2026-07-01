---
name: fix
description: Bug morre com método — feedback loop <10s primeiro, hipóteses falsificáveis, um probe por hipótese, regressão antes do fix, cleanup. Modo rápido para trivial; modo autônomo quando o /goal chama. Use com "/fix", "tem um bug", "quebrou", "dá esse erro" ou stack trace colado.
---

# /fix — Bug morre com método, não com tentativa

Bugfix não precisa de plano. Precisa de **disciplina de diagnóstico** — a diferença entre 10 minutos e 3 horas é quase sempre a qualidade do feedback loop, não a dificuldade do bug.

## Triagem (primeiro turno)

Classifique em 1 linha e siga o caminho:

| Classe | Heurística | Caminho |
|--------|-----------|---------|
| **Trivial** | Causa evidente no erro (typo, import, null óbvio), fix de 1-5 linhas | **Modo rápido** ↓ |
| **Real** | Causa não evidente, comportamento intermitente, "funcionava ontem" | **O loop completo** ↓ |
| **Arquitetural** | O fix exigiria redesenho, toca contrato público ou 3+ módulos | Pare. Apresente diagnóstico + opções. Sugira `/plan`. |

## Modo rápido (bug trivial)

1. Leia o arquivo inteiro em volta do erro (não só a linha)
2. Aplique o fix mínimo
3. Rode o comando que falhava → veja passar
4. Se existir suite, rode os testes do módulo tocado
5. Reporte em 2 linhas: causa → fix

**Se o "trivial" não morrer no primeiro fix, ele não era trivial.** Promova para o loop completo — não tente um segundo palpite.

## O loop completo

### 1 — Construa o feedback loop

O teste/script que reproduz o bug em **<10s** com pass/fail determinístico. **Isso é 90% do trabalho.** Se o seu único loop é "rodar o app e clicar", invista em melhorá-lo antes de qualquer hipótese: um teste, um curl, um script de 5 linhas.

### 2 — Reproduza

Rode o loop, observe a falha, confirme que é a **mesma** que foi reportada (não uma vizinha). Se não reproduz: colete mais contexto (env, dados, versão) antes de teorizar.

### 3 — Hipóteses ranqueadas

3-5 hipóteses, cada uma com **predição falsificável** ("se X é a causa, mexer em Y faz desaparecer"). Interativo apenas: mostre a lista ao usuário antes de testar — ele ranqueia mais rápido com domain knowledge. Comece pela mais provável OU pela mais barata de descartar.

### 4 — Instrumente

**Um probe por hipótese.** Prefira debugger > log direcionado > log everything. Logs de debug com prefixo único (`[DEBUG-a4f2]`) para cleanup via grep no fim. Cada probe responde sim/não para UMA hipótese — probe que "olha geral" é ruído.

### 5 — Fix + teste de regressão

Se há seam testável, escreva o teste de regressão **ANTES** do fix. Veja falhar → aplique o fix → veja passar. O teste fica; o bug nunca mais volta sem alarme.

### 6 — Cleanup

Remova logs `[DEBUG-*]`, delete probes, confirme que o repro original não reproduz mais, rode a suite do módulo. Commit: `fix(<área>): <causa em 1 linha>`.

## Regras do loop

- **Uma hipótese por vez.** Mudar 3 coisas e "ver se passa" destrói a informação de qual era a causa.
- **Falhou a hipótese? Risque e vá pra próxima.** Não "ajeite mais um pouquinho" a mesma teoria morta.
- **2 ciclos sem progresso → pare** (interativo apenas). Apresente o que foi descartado e o que aprendeu. Pergunte ao usuário antes do 3º ciclo — domain knowledge dele vale mais que sua próxima teoria.
- **O fix muda behavior público?** Avise antes de aplicar (interativo apenas) — pode ser que o "bug" fosse contrato que alguém depende.

## Modo autônomo (chamado pelo /goal)

Mesmo loop, transporte diferente — ninguém está olhando, então nada de esperar resposta:

- **Nunca pergunte, nunca espere resposta.** As regras interativas — "mostre a lista ao usuário", "pergunte antes do 3º ciclo", "avise antes de aplicar" — NÃO se aplicam aqui: decida, registre em `decisions[]` e siga.
- **Ranqueie sozinho** (item 3 do loop): probabilidade × custo de descartar. Adote a própria recomendação e registre em `decisions[]` do `.katana/state.json`.
- **Máx 3 ciclos** hipótese→probe→fix. Verde → devolva o controle ao /goal (ele re-roda o Aceite do passo). 3º ciclo morto → parada dura: grave `last_error` + hipóteses descartadas com a evidência de cada probe. O relatório é instrução de retomada, não "estou perdido".
- **Bug fora do escopo do passo atual** (outro módulo, vizinho suspeito): NÃO conserta agora. Vira passo novo no ROADMAP.md — Objetivo observável = o achado, Aceite = o inverso verificável dele. Fila única; consertar "já que achou" é como run autônomo vira deriva.
- **Cleanup antes do verde**: probes `[DEBUG-*]` fora ANTES de devolver o controle — o grep de restos do /goal pega o que sobrar, e resto novo no diff = passo não está verde.

## Anti-padrões

- ❌ Corrigir o sintoma onde ele aparece em vez da causa onde ela nasce
- ❌ Mudar o teste para passar em vez de corrigir o código
- ❌ Fix sem repro confirmado ("acho que era isso")
- ❌ Refatorar "já que estou aqui" no meio do diagnóstico
- ❌ No modo autônomo: consertar bug de outro passo "aproveitando a viagem" — registre no ROADMAP.md e volte

## Saída

Ao fechar, reporte em até 5 linhas:

- **Causa raiz:** <1 linha>
- **Fix:** <arquivos + 1 linha>
- **Regressão:** <teste adicionado / por que não>
- **Vizinhos:** <algo suspeito notado no caminho — mencionado, NÃO corrigido; no modo autônomo, já registrado como passo no ROADMAP.md>

Próxima ação: interativo → commit `fix(<área>): <causa>` e volte ao que fazia (fix que pede redesenho → `/plan`). Chamado pelo /goal → devolva o controle; o runner re-roda o Aceite e o run segue.
