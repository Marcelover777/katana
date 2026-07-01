# Modo brownfield — audit embutido no /plan

Dispara quando há código e não há `ROADMAP.md`. Lê stack, código e git; diagnostica; o diagnóstico aparece no chat e **vira passos no ROADMAP** — não existe arquivo de audit. Read-only sobre o código do usuário: o /plan só escreve nas superfícies dele.

## As 4 regras

1. **Nunca ecoe valor de segredo.** Referencie `arquivo:linha` ou o comando que prova (`git log --all -- .env` retorna commits), jamais o valor — ecoar re-vaza a chave.
2. **Banding por maturidade.** Leia a idade e o volume do git (`git log --oneline | wc -l`, data do 1º commit). Dimensão que ainda não é devida = ⏭️ ainda-não, **nunca ❌**. Projeto de 3 dias não leva vermelho por não ter observabilidade.
3. **Ferramenta ausente ou que falhou = ⏭️ não-avaliado (motivo), NUNCA ✅.** Não rodou `npm audit`? A dimensão de deps é ⏭️ com o link de como instalar — não um verde presumido.
4. **Achado subjetivo precisa de âncora.** Arquitetura e UI/UX levam `arquivo:linha` (ou referência de componente). Sem âncora, o achado não existe.

## Processo

1. **Perfil.** Arquétipo pela matriz [stack-matrix.md](stack-matrix.md) (manifesto, estrutura de pastas, ecossistema); maturidade pelo git. Isso decide o banding e quais dimensões se aplicam.
2. **Pontue as dimensões** com ✅ ⚠️ ❌ ⏭️ — só as que fazem sentido pro tipo e maturidade (CLI/lib/API pulam as de web com ⏭️ + motivo):

| Dimensão | Sinais (read-only) |
|----------|--------------------|
| Config / setup | `.env.example` existe? segredo fora do git (`git ls-files`, `git log --all -- .env`)? lockfile commitado? |
| Arquitetura | deus-módulo, acoplamento, camadas — subjetivo, sempre com âncora `arquivo:linha` |
| Segurança | validação de input, authn/z, segredo no histórico, deps com CVE |
| Saúde de deps | comando de audit do ecossistema (`npm audit --json` / `pip-audit` / `osv-scanner`); falhou/ausente → ⏭️ |
| Testes | suíte verde? cobre os caminhos críticos? bordas? |
| DX | scripts `build`/`test`/`lint`, CI — só se a maturidade já pede |
| Performance | bundle, N+1 — só web/com URL; senão ⏭️ |
| UI/UX | hierarquia, estados vazios/erro — subjetivo, ancorado em componente |
| Observabilidade | logs estruturados, error tracking — só se a maturidade já pede |

3. **Todo ⚠️/❌ com endereço:** `arquivo:linha — o que — por que importa`. Veredito sem endereço não ajuda ninguém.
4. **Mostre o placar no chat** (tabela dimensão | nota | evidência) e proponha os passos. Confirmação do usuário = o fechamento normal do /plan (§7).

## Semeadura: achado → passo

- **Aceite = o inverso verificável do achado.** Detectou `.env` rastreado → Aceite: `git ls-files .env` vazio. Detectou 0 testes em `src/auth` → Aceite: suíte de auth existe e passa. Todo passo semeado nasce com done grep-ável.
- **Prioridade:** segurança e quebrado primeiro; o resto por dependência real, não por gravidade abstrata.
- Melhoria de produto que surgir no diagnóstico vira passo normal, com objetivo observável — não "item de dívida" numa lista paralela (fila única).
- **Remédio destrutivo/irreversível** (rotacionar segredo vazado, reescrever histórico, deletar dado): o passo descreve o remédio e declara no corpo que exige confirmação humana — o /go trata como parada dura. Nunca execute inline durante o diagnóstico.

## Anti-padrões

- ❌ Consertar durante o diagnóstico — o audit lê; quem executa é o /go, passo a passo, com Aceite.
- ❌ ✅ presumido quando a ferramenta não rodou, ou ❌ fora de maturidade — as duas mentiras simétricas.
- ❌ Achado de arquitetura/UI sem âncora `arquivo:linha`.
- ❌ Nota global do projeto — cada dimensão tem a própria régua; média esconde o ❌ que importa.
