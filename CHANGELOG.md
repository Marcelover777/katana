# Changelog

## 2.0.0 — 2026-07-20

Reescrita orientada a confiabilidade e redução de superfície.

### Mantido

- Duas skills: `plan` e `goal`; diagnóstico e correção fazem parte do `goal`.
- Um `ROADMAP.md` com passos verticais e verificações explícitas.
- Planejamento brownfield, execução disciplinada e diagnóstico por reprodução.
- Distribuição como plugin oficial do Claude Code.

### Simplificado

- `ROADMAP.md` agora é a única fonte de plano e progresso.
- `/goal` trabalha com o estado real do checkout e preserva alterações existentes.
- `/goal` usa TDD vertical quando há seam estável e faz verificação global do
  objetivo depois dos checks individuais.
- Git, PR, merge, deploy e outras ações externas dependem do pedido explícito do
  usuário; não são autorização implícita da skill.
- As duas skills só rodam por invocação explícita e têm contratos menores.

### Removido

- hooks `SessionStart`, `Stop` e `PreToolUse`;
- `.katana/state.json`, `.katana/LOG.md` e planos secundários;
- runner headless e modo overnight;
- branch/PR/self-review/merge obrigatórios por passo;
- skill `fix` separada e seu fluxo duplicado;
- instaladores PowerShell e POSIX duplicados;
- matriz de stack e catálogo estático de variáveis de ambiente;
- exemplo de produto específico, demo simulada, assets pesados e README inglês
  duplicado.

### Corrigido

- o rename incompleto `go` → `goal` que fazia ambos os instaladores pularem a
  skill principal enquanto a validação retornava sucesso;
- documentação de plugin que mostrava comandos sem o namespace obrigatório;
- validação que checava presença de arquivos, mas não coerência entre versão,
  inventário público e superfícies legadas.

## 1.0.0 — 2026-07-01

Primeira versão pública: três comandos, roadmap executável, automação de git/PR,
hooks de continuidade e segurança, estado retomável e runner headless.
