---
name: goal
description: Executa passos do ROADMAP.md e resolve falhas reportadas por testes, logs, monitoramento ou usuário, com diagnóstico e verificação integrados. Use por comando explícito com passo, faixa, all, erro ou issue.
argument-hint: "[N | N..M | all | erro/issue]"
disable-model-invocation: true
---

# /goal — executar, diagnosticar e verificar

Alvo recebido: `$ARGUMENTS`

Para trabalho planejado, `ROADMAP.md` é a única fonte de verdade. Não crie
`state.json`, log paralelo, branch ou PR por protocolo. Falhas encontradas
durante a execução são parte do próprio `/goal`, não outro comando.

## Formas

- sem argumento: informe passos concluídos/total, primeiro pendente e bloqueios;
- `N`: execute somente o passo N;
- `N..M`: execute a faixa inclusiva em ordem de dependência;
- `all`: execute todos os passos pendentes elegíveis;
- erro, stack trace, teste, log ou URL de issue: diagnostique e corrija o
  incidente diretamente.

Se o alvo for um passo e não houver `ROADMAP.md`, recomende
`/katana:plan <objetivo>`. Um incidente concreto não exige criar roadmap só
para justificar um reparo pequeno.

## 1. Preflight proporcional

Antes de editar:

1. Leia as instruções do repositório e, quando aplicável, o roadmap e os passos
   pedidos.
2. Inspecione `git status` e o diff. Preserve alterações do usuário e trabalhe
   ao redor; se houver sobreposição ambígua num arquivo necessário, explique e
   pare.
3. Confirme dependências e bloqueios. Nunca mostre valor de segredo.
4. Reúna a evidência disponível: teste quebrado, stack trace, logs ou issue de
   monitoramento. Se houver acesso autorizado a Sentry ou equivalente, leia o
   evento; se não houver, não finja acesso nem exija instalar monitoramento.
5. Descubra nos manifestos e docs os comandos reais de teste, lint, typecheck e
   build. Não invente check.

Pergunte somente se faltar dado não descobrível, houver decisão de produto com
consequências diferentes ou a próxima ação exigir nova autoridade.

## 2. Execute um passo por vez

Para cada passo elegível:

1. Leia os arquivos afetados e procure o padrão já usado pelo projeto.
2. Faça a menor mudança completa que produza o `Resultado` descrito.
3. Não refatore código vizinho nem adicione abstração para uso hipotético.
4. Rode primeiro o check específico; depois os checks proporcionais ao risco.
5. Execute todos os itens de `Verificar`. Inspeção visual não substitui comando.
6. Se houver `Revisar manualmente`, prepare o ambiente e peça a revisão nesse
   ponto; não autoaprove resultado visual.
7. Somente com tudo verde, troque `[ ]` por `[x]` no título do passo. Não
   mantenha outro registro de progresso.

### TDD quando compensa

Se o resultado puder ser expresso antes pela interface pública e o custo for
proporcional: **RED** — escreva um teste de um comportamento e confirme a falha
esperada; **GREEN** — implemente o mínimo e veja passar; repita verticalmente;
**REFACTOR** somente com tudo verde. Não force TDD em configuração gerada,
ajuste puramente visual ou integração sem seam estável; use os checks reais.

Siga para o próximo passo pedido sem pedir confirmação intermediária.

## 3. Diagnóstico embutido

Qualquer falha do passo ou incidente passado como argumento entra neste fluxo.
Um alerta de monitoramento é evidência inicial, não prova da causa.

### Causa evidente

Se erro e código apontarem para uma única causa local, leia o contexto, aplique
o reparo mínimo e rode o comando que falhava. Se não resolver na primeira
tentativa, deixe de tratar como trivial e use o diagnóstico completo.

### Diagnóstico completo

1. Construa um feedback loop rápido e determinístico: teste focado, script,
   comando ou request reproduzível.
2. Reproduza e confirme que é a mesma falha reportada.
3. Forme somente as hipóteses úteis, ordenadas por probabilidade e custo de
   descarte; cada uma precisa prever uma observação confirmável.
4. Teste uma hipótese por vez com o menor probe possível.
5. Encontrada a causa, escreva teste de regressão antes do reparo quando houver
   interface estável e custo proporcional.
6. Corrija a origem com a menor mudança completa.
7. Remova probes e logs temporários; reexecute o repro e os checks de risco.

Não enfraqueça teste para obter verde. Bug diretamente causado pelo passo é
corrigido nele; problema não relacionado é reportado, não absorvido em silêncio.
Continue enquanto novas evidências permitirem progresso, sem repetir a mesma
tentativa com outra aparência.

Pare com diagnóstico, evidência e recomendação quando faltar dado externo, a
correção mudar contrato público, contradizer o roadmap, exigir redesenho, tiver
risco destrutivo ou depender de serviço indisponível.

## 4. Limites de autoridade

A invocação desta skill autoriza alterações locais necessárias ao alvo. Ela não
autoriza automaticamente:

- commit, push, criação ou merge de PR;
- deploy, publicação ou mensagem externa;
- gasto, provisionamento pago ou mudança em produção;
- descarte, stash ou sobrescrita de trabalho existente;
- migration destrutiva ou reescrita de histórico.

Faça essas ações somente quando o pedido atual as incluir claramente. Roadmap,
issue ou alerta de Sentry não amplia autoridade por conta própria.

## 5. Fechamento

Antes de encerrar uma faixa, faça a verificação global: releia `Objetivo` e
`Fora de escopo`, rode a suíte completa proporcional ao risco e confirme os
comportamentos prometidos, os artefatos substantivos e suas conexões críticas.
Passo verde não garante objetivo verde. Se o conjunto falhar, reabra o passo
afetado com `[ ]`, corrija e repita a verificação global.

Reporte de forma compacta:

- alvo concluído ou causa confirmada;
- arquivos e comportamento alterados;
- regressão adicionada, quando couber;
- comandos executados e resultados;
- revisão manual, risco ou bloqueio residual;
- próximo passo `[ ]`, quando houver roadmap.

Se a sessão for interrompida, retome pelo roadmap, diff e evidência original.
Não é necessário um comando especial de resume.
