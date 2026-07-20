# Template de ROADMAP.md

Salve na raiz do projeto. O checkbox no título do passo é a única marca de
progresso: `[ ]` pendente, `[x]` verificado.

```markdown
---
project: <slug-do-projeto>
updated: YYYY-MM-DD
---

# ROADMAP — <nome do projeto ou entrega>

## Objetivo

<Uma ou duas frases descrevendo o resultado final observável.>

## Fora de escopo

- <limite importante que evita deriva>

## 01 — <verbo + resultado> [ ]

Resultado: <o que passa a ser observável quando este passo termina>.
Depende de: Nenhum.
Bloqueios: Nenhum.

Fazer:
- <mudança concreta e delimitada>
- <segunda mudança, somente se necessária>

Verificar:
- `<comando existente que termina sozinho>`
- `<outro comando ou resultado exato, se necessário>`

Revisar manualmente:
- <somente quando não houver substituto mecânico; remova a seção se vazia>

## 02 — <verbo + resultado> [ ]

Resultado: <comportamento observável>.
Depende de: 01.
Bloqueios: `<nome da entrada externa>` — <onde o usuário a obtém>; ou `Nenhum`.

Fazer:
- <mudança concreta>

Verificar:
- `<comando>`
```

## Regras

- Passos são fatias entregáveis, não fases por camada.
- Numeração é estável; trabalho novo recebe o próximo número.
- Só marque `[x]` depois de executar todas as verificações do passo.
- Registre nomes de configuração, nunca valores secretos.
- Comandos de verificação devem existir ou o passo deve incluir sua criação.
- Se um passo não couber numa sessão, divida-o; não crie um segundo plano.
