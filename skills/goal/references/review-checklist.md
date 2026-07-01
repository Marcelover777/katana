# review-checklist — self-review adversarial por PR

**A lei primeiro: review NUNCA destrava o merge — o Aceite mecânico destrava.** Self-review é
da mesma linhagem do autor; não é verificação independente e não finge ser. Ela existe pra
achar o bug que o Aceite não cobre — e pra deixar rastro auditável no PR.

## Setup

Subagente recebe: o diff (`gh pr diff N` ou `.katana/tmp/diff-NN.patch`), o Objetivo observável
do passo e o Aceite. Instrução de partida: "Você NÃO é o autor. Procure razões pra reprovar."

## A caçada (nesta ordem)

**1. Correctness contra o objetivo do passo**
- O diff faz o que o PR body DIZ que faz?
- Edge cases do objetivo que nenhuma task cobriu: vazio, nulo, duplicado, concorrente, unicode.
- Error path que engole erro: `catch` vazio, `except: pass`, promise sem `.catch`.
- Async sem await / promise solta / race óbvia.
- Off-by-one em paginação/slice/loop.

**2. Meia-feature / placeholder**
- `TODO`/`FIXME`/stub/`not implemented` NOVOS no diff.
- Função que retorna valor fixo/mock onde devia computar.
- Handler/rota/botão criado mas não conectado a nada.
- Teste que testa o mock, não o behavior.

**3. Segredos e dados no diff**
- Padrões: `sk_live_`, `AKIA[0-9A-Z]{16}`, `-----BEGIN`, token/connection-string/senha —
  inclusive em teste e fixture.
- `.env` ou dataset privado entrou no diff.
- VALOR de env var ecoado em log, mensagem ou doc.

**4. Suite sabotada**
- `.only(`, `fdescribe`, `fit(`, skip novo sem justificativa — a suite não roda inteira.
- Teste deletado/enfraquecido pra ficar verde; assert removido ou trocado por tautologia.

**5. Restos**
- `console.log`/`print`/`debugger` de debug, prefixo `[DEBUG-`.
- Código comentado, import morto, arquivo órfão.
- Dependência nova usada em 1 linha trocável.

## Classificação — só duas

| Classe | Critério | Ação |
|---|---|---|
| **CRÍTICO** | mergear assim quebra o Objetivo observável do passo, corrompe/perde dado, expõe segredo, abre buraco de segurança ou sabota a suite | fix na MESMA branch → push → re-roda o Aceite. **1 ciclo por etapa**; o que sobrar vira comentário `CRÍTICO NÃO RESOLVIDO` e entra no relatório final |
| **ADVISORY** | estilo, nomeação, refactor possível, micro-perf, "eu faria diferente" | `gh pr comment` — não bloqueia, não conta tentativa |

Na dúvida → ADVISORY com justificativa. O teste é mecânico: "mergear assim quebra o objetivo
observável do passo?" Não → advisory.

**Exceção única que segura o merge: segredo real no diff.** Remover segredo DEPOIS do merge
exige rewrite de histórico — que é parada dura. Então remova do diff antes de mergear; e se já
houve push, considere a chave queimada — rotacione.

## Formato de saída do subagente

```
VEREDITO: limpo | N achados (C críticos, A advisories)
CRÍTICO:
- arquivo:linha — <o bug em 1 frase> — <cenário concreto que falha>
ADVISORY:
- arquivo:linha — <1 frase>
```

Achado sem `arquivo:linha` não é achado — é vibe. Descarte.

O corpo vai pro PR via `gh pr comment --body-file .katana/tmp/review-NN.md` — inclusive quando
"limpo" (rastro de que a review rodou).
