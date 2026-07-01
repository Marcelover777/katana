#!/usr/bin/env node
// Katana — PreToolUse hook (deny mecânico da lista destrutiva).
//
// As gerações anteriores PEDIAM no prompt para o modelo não rodar comando
// destrutivo — reza, não mecanismo. Aqui o bloqueio é real:
// permissionDecision:"deny" volta como erro para o modelo, e o SKILL.md do
// /goal trata deny do guard como PARADA DURA. Nunca contorno.
//
// Duas camadas:
//   SEMPRE (hook instalado = regra valendo, com ou sem run):
//     1. git push --force / -f / --force-with-lease  (reescreve o remoto)
//     2. git push --delete/-d main|master, refspec :main|:master
//        (deleta a main no remoto — o vetor mais destrutivo de todos)
//     3. git reset --hard                            (descarta trabalho)
//     4. git clean -f*                               (apaga não-rastreados)
//   SÓ COM RUN ATIVO (.katana/state.json com status=="running"):
//     5. git rebase -i / --interactive
//     6. git branch -D main|master (deleção local)
//     7. rm -rf apontando para fora do repo (heurística: alvo absoluto que
//        não começa com o cwd, ou ~, ou /, ou sobe com ..)
//     8. reescrita de histórico: git filter-branch; git push com +refspec
//     9. git commit com HEAD em main/master (o run trabalha em goal/*)
//
// Salvaguardas:
//   - só olha tool_name=="Bash"; qualquer outra tool passa direto;
//   - comando composto é fatiado em segmentos (&&, ||, ;, |, newline) e cada
//     regra avalia UM segmento;
//   - as regras git avaliam o segmento com aspas NORMALIZADAS: aspas em volta
//     de token único caem (`git push "--force"` não disfarça a flag) e trecho
//     quotado COM espaço é texto livre — some da avaliação (um "--force"
//     dentro do -m "..." de um commit não derruba o próprio commit nem um
//     push de outro segmento). Aspa desbalanceada → avalia o texto cru;
//   - na dúvida dentro de um segmento, o guard NEGA: falso positivo custa um
//     rephrase; falso negativo custa histórico/trabalho. Deny é o modo seguro;
//   - LIMITAÇÃO CONHECIDA: flag escondida em variável de shell
//     (`F=--force; git push $F origin main`) não é detectada — o guard é
//     cinto contra deriva do modelo, não sandbox de segurança;
//   - silent-fail em erro de FS/parse: as regras 5–9 degradam para "sem run
//     ativo" e as 1–4 continuam valendo — o hook nunca quebra a sessão;
//   - o guard só NEGA; nunca executa nada em nome de ninguém. exit 0 sempre.
//
// Contrato Claude Code (stdin → stdout):
//   stdin  : JSON { cwd, tool_name, tool_input: { command }, ... }
//   stdout : {"hookSpecificOutput":{"hookEventName":"PreToolUse",
//             "permissionDecision":"deny","permissionDecisionReason":"..."}}
//            para negar; saída vazia deixa o fluxo normal de permissão seguir.

const fs = require('fs');
const path = require('path');

const MAX_STATE_READ = 256 * 1024;

// --force pega --force-with-lease/--force-if-includes por prefixo; o cluster
// curto (-f, -fd, -uf...) é pego por "qualquer -abc contendo f".
const FORCE_FLAG = /(^|\s)(--force(-with-lease|-if-includes)?\b|-[A-Za-z]*f[A-Za-z]*(=|\s|$))/;

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) { return ''; }
}

function safeRead(p, maxBytes) {
  let st;
  try { st = fs.lstatSync(p); } catch (_) { return null; }
  if (st.isSymbolicLink() || !st.isFile() || st.size > maxBytes) return null;
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

// Run ativo = state.json legível com status running. Erro → false (degrada).
function runActive(projectDir) {
  const raw = safeRead(path.join(projectDir, '.katana', 'state.json'), MAX_STATE_READ);
  if (!raw) return false;
  try {
    const st = JSON.parse(stripBom(raw));
    return !!st && st.status === 'running';
  } catch (_) {
    return false;
  }
}

// Branch atual via .git/HEAD (segue 1 nível de gitfile — worktrees).
// Ilegível/detached → null → a regra 8 não dispara (não bloqueia sem prova).
function currentBranch(projectDir) {
  try {
    let gitPath = path.join(projectDir, '.git');
    const st = fs.lstatSync(gitPath);
    if (st.isSymbolicLink()) return null;
    if (st.isFile()) {
      const m = fs.readFileSync(gitPath, 'utf8').match(/^gitdir:\s*(.+?)\s*$/m);
      if (!m) return null;
      gitPath = path.resolve(projectDir, m[1]);
    }
    const head = fs.readFileSync(path.join(gitPath, 'HEAD'), 'utf8');
    const m = head.match(/^ref:\s*refs\/heads\/(.+?)\s*$/m);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

// Fatia o comando composto em segmentos independentes.
function segments(cmd) {
  return String(cmd)
    .split(/&&|\|\||;|\||\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Normalização de aspas para a avaliação das regras git (viés deny-safe):
//   - aspas em volta de token SEM espaço caem: `"--force"` vira `--force`
//     (desmascara flag quotada — o shell entrega a flag do mesmo jeito);
//   - trecho quotado COM espaço é um argumento de texto livre (mensagem de
//     commit, path com espaço) → sai da avaliação: `git commit -m "revert do
//     push --force de ontem"` vira `git commit -m` e não casa regra nenhuma;
//   - aspa desbalanceada → parse ambíguo → devolve o segmento CRU (na
//     dúvida, avalia tudo — cru pode casar regra; deny é o modo seguro).
function stripQuotes(seg) {
  let out = '';
  let i = 0;
  while (i < seg.length) {
    const c = seg[i];
    if (c === '"' || c === "'") {
      const close = seg.indexOf(c, i + 1);
      if (close === -1) return seg; // desbalanceada → cru (deny-safe)
      const inner = seg.slice(i + 1, close);
      if (!/\s/.test(inner)) out += inner;
      i = close + 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

function normPath(p) {
  try {
    return path.resolve(String(p)).replace(/[\\/]+/g, '/').toLowerCase() + '/';
  } catch (_) {
    return '';
  }
}

// rm com -r e -f e algum alvo fora do repo (heurística declarada no topo).
function rmOutsideRepo(seg, projectDir) {
  if (!/(^|\s|\/)rm(\.exe)?(\s|$)/.test(seg)) return false;
  const toks = seg.split(/\s+/);
  const i0 = toks.findIndex((t) => /^(.*\/)?rm(\.exe)?$/.test(t));
  if (i0 === -1) return false;

  let rec = false;
  let force = false;
  const targets = [];
  for (const a of toks.slice(i0 + 1)) {
    if (a === '--') continue;
    if (/^--/.test(a)) {
      if (a === '--recursive') rec = true;
      if (a === '--force') force = true;
      continue;
    }
    if (/^-[A-Za-z]+$/.test(a)) {
      if (/[rR]/.test(a)) rec = true;
      if (/f/.test(a)) force = true;
      continue;
    }
    targets.push(a.replace(/^["']+|["']+$/g, ''));
  }
  if (!rec || !force) return false;

  const cwdNorm = normPath(projectDir);
  for (const t of targets) {
    if (!t) continue;
    if (t === '~' || t.startsWith('~/') || t.startsWith('~\\')) return true;
    if (/^\$HOME(\/|\\|$)/.test(t) || /^%USERPROFILE%/i.test(t)) return true;
    if (t === '..' || t.startsWith('../') || t.startsWith('..\\')) return true;
    const isAbs = t === '/' || /^\/\S*/.test(t) || /^[A-Za-z]:[\\/]/.test(t) || /^\\\\/.test(t);
    if (isAbs) {
      const tn = normPath(t);
      if (!cwdNorm || !tn || !tn.startsWith(cwdNorm)) return true;
    }
  }
  return false;
}

// Avalia UM segmento. Retorno: { always: bool, motivo } ou null.
// As regras git rodam sobre o segmento com aspas normalizadas (stripQuotes);
// a heurística de rm avalia as DUAS formas — qualquer uma acusando, nega.
function checkSegment(seg, ctx) {
  const evalSeg = stripQuotes(seg);
  const git = /\bgit(\.exe)?\b/.test(evalSeg);

  // --- camada SEMPRE -------------------------------------------------------
  if (git && /\bpush\b/.test(evalSeg) && FORCE_FLAG.test(evalSeg)) {
    return { always: true, motivo: 'git push --force reescreve histórico remoto' };
  }
  if (
    git && /\bpush\b/.test(evalSeg) &&
    ((/(^|\s)(--delete|-d)(\s|$)/.test(evalSeg) && /(^|\s)(main|master)(\s|$)/.test(evalSeg)) ||
      /(^|\s)\+?:(main|master)(\s|$)/.test(evalSeg))
  ) {
    return { always: true, motivo: 'deletar main/master no remoto' };
  }
  if (git && /\breset\b/.test(evalSeg) && /(^|\s)--hard\b/.test(evalSeg)) {
    return { always: true, motivo: 'git reset --hard descarta trabalho sem volta' };
  }
  if (git && /\bclean\b/.test(evalSeg) && FORCE_FLAG.test(evalSeg)) {
    return { always: true, motivo: 'git clean -f apaga arquivos não rastreados' };
  }

  // --- camada RUN ATIVO ----------------------------------------------------
  if (git && /\brebase\b/.test(evalSeg) && /(^|\s)(-i\b|--interactive\b)/.test(evalSeg)) {
    return { always: false, motivo: 'git rebase -i reescreve histórico' };
  }
  if (git && /\bbranch\b/.test(evalSeg) && /(^|\s)-D(\s|$)/.test(evalSeg) && /(^|\s)(main|master)(\s|$)/.test(evalSeg)) {
    return { always: false, motivo: 'deletar main/master' };
  }
  if (git && /\bfilter-branch\b/.test(evalSeg)) {
    return { always: false, motivo: 'git filter-branch reescreve histórico' };
  }
  if (git && /\bpush\b/.test(evalSeg) && /\s\+[^\s+]/.test(evalSeg)) {
    return { always: false, motivo: 'push com +refspec é force-push disfarçado' };
  }
  if (git && /\bcommit\b/.test(evalSeg) && (ctx.branch === 'main' || ctx.branch === 'master')) {
    return { always: false, motivo: `commit direto em ${ctx.branch} (o run trabalha em goal/*)` };
  }
  if (rmOutsideRepo(seg, ctx.projectDir) || rmOutsideRepo(evalSeg, ctx.projectDir)) {
    return { always: false, motivo: 'rm -rf apontando para fora do repo' };
  }

  return null;
}

function deny(motivo) {
  const out = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `katana-guard: ${motivo} — parada dura`,
    },
  };
  try { process.stdout.write(JSON.stringify(out) + '\n'); } catch (_) {}
  process.exit(0);
}

function main() {
  let data = {};
  try {
    const raw = readStdin();
    if (raw.trim()) data = JSON.parse(raw);
  } catch (_) {
    data = {};
  }

  if (!data || data.tool_name !== 'Bash') process.exit(0);
  const cmd = data.tool_input && typeof data.tool_input.command === 'string'
    ? data.tool_input.command
    : '';
  if (!cmd.trim()) process.exit(0);

  const projectDir = typeof data.cwd === 'string' && data.cwd.trim() ? data.cwd : process.cwd();
  const ctx = {
    projectDir,
    // HEAD só é consultado se o comando tem cara de commit (leitura barata e rara).
    branch: /\bcommit\b/.test(cmd) ? currentBranch(projectDir) : null,
  };

  let runChecked = false;
  let running = false;
  for (const seg of segments(cmd)) {
    const hit = checkSegment(seg, ctx);
    if (!hit) continue;
    if (hit.always) deny(hit.motivo);
    if (!runChecked) {
      running = runActive(projectDir);
      runChecked = true;
    }
    if (running) deny(`${hit.motivo} — durante run /goal ativo`);
  }

  process.exit(0); // nada destrutivo → fluxo normal de permissão decide
}

try {
  main();
} catch (_) {
  process.exit(0); // erro interno → não decide nada (regras degradam, sessão vive)
}
