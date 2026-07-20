# Katana

Duas skills enxutas para desenvolver software com Claude Code sem transformar o
processo em outro projeto:

```text
/katana:plan  →  ROADMAP.md  →  /katana:goal
                                      ↳ diagnostica e corrige falhas
```

Katana é uma variação do [solodev](https://github.com/calneymgp/solodev). Mantém
o que mais ajuda — esclarecer, dividir em fatias pequenas, verificar antes de
concluir — e usa um único arquivo, `ROADMAP.md`, como plano e estado.

## Princípios

- **Uma fonte de verdade:** progresso vive nos passos `[ ]` / `[x]` do roadmap.
- **Verificação real:** um passo só fecha depois dos comandos de aceite passarem.
- **TDD quando compensa:** RED → GREEN → REFACTOR para comportamento com seam estável.
- **Objetivo verde:** ao fim da faixa, o conjunto inteiro é verificado novamente.
- **Mudança cirúrgica:** preservar alterações do usuário e evitar refatoração lateral.
- **Autonomia com limite:** continuar enquanto houver caminho seguro; parar diante
  de dado ausente, decisão de produto, risco destrutivo ou autoridade externa.
- **Git sem surpresa:** commit, push, PR, merge e deploy só entram quando o usuário
  os pedir explicitamente.

Não há daemon, banco de estado, hooks, runner noturno ou orquestrador. As skills
são Markdown; Claude Code fornece as ferramentas e as permissões.

## Comandos

| Comando | Resultado |
|---|---|
| `/katana:plan <objetivo>` | Explora o repositório, resolve ambiguidades relevantes e cria ou atualiza `ROADMAP.md`. Não implementa. |
| `/katana:goal <alvo>` | Executa `3`, `2..4` ou `all`; também recebe erro, stack trace, teste, log ou issue. Aplica TDD quando útil, diagnostica falhas e verifica o objetivo completo ao final. |

As duas skills exigem invocação explícita. Instalar Katana não altera o
comportamento normal do Claude Code nem dispara automações por conta própria.

## Instalação

Katana segue o formato oficial de plugin do Claude Code. Adicione este
repositório como marketplace e instale o plugin:

```powershell
claude plugin marketplace add Marcelover777/katana
claude plugin install katana@katana
```

Reinicie a sessão após instalar. Skills de plugin são namespaced; por isso os
nomes são `/katana:plan` e `/katana:goal`.

Para testar um clone local sem instalar:

```powershell
git clone https://github.com/Marcelover777/katana.git
cd katana
claude --plugin-dir .
```

## Fluxo curto

```text
1. /katana:plan adicionar login por magic link
2. Revise o ROADMAP.md e ajuste o que não representa sua intenção.
3. /katana:goal 1..3
4. Se aparecer um defeito: /katana:goal <erro, issue ou comportamento>.
```

O roadmap é simples de propósito:

```markdown
# ROADMAP — Nome do projeto

## 01 — Entregar a primeira fatia [ ]
Resultado: comportamento observável que existirá ao terminar.
Depende de: Nenhum.
Bloqueios: Nenhum.

Fazer:
- mudança concreta e delimitada

Verificar:
- `comando que termina sozinho e retorna sucesso ou falha`
```

Veja o formato completo em
[`skills/plan/ROADMAP-TEMPLATE.md`](skills/plan/ROADMAP-TEMPLATE.md).

## O que a v2 removeu

A primeira versão tentou implementar autonomia como infraestrutura: cinco
fontes concorrentes de estado, hooks de continuação, bloqueador de shell,
runner headless e um PR obrigatório por passo. Isso criou mais modos de falha
que garantias.

A v2 removeu:

- `.katana/state.json`, `LOG.md` e planos paralelos;
- hooks que bloqueavam comandos ou impediam a sessão de parar;
- runner overnight e protocolo manual de retomada;
- branch, PR e merge automáticos por definição;
- `/fix` como superfície separada — o diagnóstico agora vive no `/goal`;
- catálogos estáticos de stacks, preços e variáveis de ambiente;
- instaladores próprios e exemplos de domínio que contaminavam o plugin.

O que permaneceu é verificável no próprio repositório: duas skills, um template
e uma validação estrutural pequena.

## Migrando da v1

A atualização do plugin não consegue apagar arquivos que os instaladores antigos
copiaram para outro projeto ou para `~/.claude`. Faça a limpeza uma vez:

1. Em cada `.claude/settings.json` afetado, remova **somente** registros de hook
   cujo comando contém `katana-session-start`, `katana-continue` ou
   `katana-guard`. Preserve todos os outros hooks e permissões.
2. Depois de confirmar que não são usados por outra configuração, remova as
   cópias `.claude/hooks/katana-*.js`.
3. Remova as skills antigas copiadas em `.claude/skills/{plan,goal,fix}` (ou no
   diretório global equivalente) para não manter comandos sem namespace ao lado
   da v2.
4. Preserve `ROADMAP.md`. `.katana/LOG.md` pode ser arquivado; `state.json` e
   `tmp/` não são lidos pela v2 e só devem ser removidos após conferir que nenhum
   run antigo ainda precisa deles.

Entradas antigas de `.gitignore` são inofensivas e podem permanecer. Não
substitua o arquivo de settings inteiro: ele costuma conter configuração de
outras ferramentas.

## Desenvolvimento

```powershell
node scripts/validate.mjs
claude plugin validate --strict .claude-plugin/plugin.json
claude plugin validate --strict .claude-plugin/marketplace.json
```

O CI roda a validação sem dependências. Mudanças devem reduzir ambiguidade ou
superfície; uma terceira skill precisa substituir algo, não apenas somar.

Referência do formato: [plugins](https://code.claude.com/docs/en/plugins) e
[skills](https://code.claude.com/docs/en/slash-commands) do Claude Code.

## Créditos e licença

Katana deriva do [solodev](https://github.com/calneymgp/solodev), criado por
Calney. A disciplina central — planejar antes, cortar verticalmente e verificar
antes de concluir — vem desse trabalho.

MIT — veja [LICENSE](LICENSE).
