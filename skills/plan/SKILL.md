---
name: plan
description: Transforma um objetivo em ROADMAP.md curto e executável após explorar o repositório e resolver apenas as ambiguidades que mudam a solução. Use por comando explícito antes de implementar trabalho novo ou reorganizar um roadmap existente.
argument-hint: "[objetivo, problema ou mudança]"
disable-model-invocation: true
---

# /plan — desenhar o caminho

Objetivo recebido: `$ARGUMENTS`

Crie ou atualize `ROADMAP.md`. Esta skill planeja; não altera código de produto,
não instala dependências e não executa o plano.

## 1. Entenda antes de perguntar

Leia as instruções do repositório, o roadmap existente, os manifestos, a
estrutura e os arquivos diretamente relacionados ao objetivo. Use git apenas
para contexto de leitura.

Resolva no código tudo que o código puder responder. Pergunte ao usuário só
quando a resposta mudar materialmente escopo, comportamento público, dados,
segurança, custo ou arquitetura. Faça uma pergunta por vez e inclua uma
recomendação curta.

Antes de escrever, resuma em até três pontos:

- resultado que deve existir;
- limite mais importante do escopo;
- decisão ainda assumida, se houver.

Se o pedido já for claro, não transforme confirmação em cerimônia.

## 2. Escolha a profundidade

- **Pequeno:** uma mudança coesa, poucos arquivos, sem decisão relevante → um
  passo.
- **Médio:** uma entrega de uma sessão → dois a quatro passos.
- **Grande:** várias entregas observáveis → quantos passos forem necessários,
  normalmente até dez; divida novamente se um passo não couber numa sessão.

O tamanho muda a quantidade de passos, não cria novos tipos de documento.
`ROADMAP.md` continua sendo a única fonte de verdade.

## 3. Escreva fatias executáveis

Use [ROADMAP-TEMPLATE.md](ROADMAP-TEMPLATE.md). Cada passo precisa conter:

- **Resultado:** comportamento observável, não atividade interna;
- **Depende de:** somente dependências reais;
- **Bloqueios:** entrada externa já conhecida, ou `Nenhum`;
- **Fazer:** lista curta de mudanças delimitadas;
- **Verificar:** ao menos um comando determinístico que termine sozinho.

Prefira fatias verticais: uma capacidade pequena atravessando as camadas que
precisa, em vez de “todos os modelos”, depois “todas as APIs”. O primeiro passo
deve produzir feedback cedo e, quando possível, não depender de credenciais.

Critérios como “funciona”, “está bom” e “sem regressão” não são verificações.
Converta-os em teste, build, typecheck, lint, consulta, grep ou smoke test com
resultado esperado. Se uma verificação só puder ser humana, declare-a como
`Revisar manualmente`; não finja que é mecânica.

Se a exploração revelar uma falha que bloqueia o objetivo, incorpore-a no passo
relevante: o comando que hoje falha vira parte de `Verificar`. Falha não
relacionada fica fora do escopo; não crie comando ou backlog de bugs separado.

## 4. Preserve o que já existe

Ao atualizar um roadmap:

- não renumere passos existentes;
- não apague decisões ou passos concluídos sem explicar ao usuário;
- acrescente trabalho novo no fim, salvo quando a dependência exigir outra
  posição;
- mantenha `[x]` apenas no que já tem evidência de conclusão;
- remova duplicação e passos especulativos.

Em brownfield, cite caminhos e símbolos concretos nas notas de `Fazer`. Não
realize uma auditoria genérica do repositório quando o objetivo é localizado.

## 5. Feche

Valide que o Markdown segue o template, que os comandos citados existem ou
estão claramente marcados para criação e que não há bloqueio oculto.

Mostre ao usuário somente:

1. quantidade e títulos dos passos;
2. bloqueios conhecidos;
3. próxima invocação recomendada, por exemplo `/katana:goal 1..3`.

Não crie BRIEF, PLAN, STATUS, LOG, state JSON ou backlog paralelo.
