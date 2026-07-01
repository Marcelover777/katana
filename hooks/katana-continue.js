#!/usr/bin/env node
// Katana — Stop hook (o cinto de segurança do /go).
//
// O SKILL.md manda o modelo não devolver o turno no meio de um run. Este hook
// é o enforcement: se `.katana/state.json` tem status=="running" e ainda há
// etapa pendente na faixa, respondemos {"decision":"block","reason":...} e o
// Claude Code re-injeta a continuação. Cada bloqueio incrementa `nudges` no
// state (persistido UTF-8 sem BOM).
//
// Guard anti-stall — o hook nunca vira moto-perpétuo:
//   - fingerprint de progresso = `etapa|status|attempts` da primeira etapa
//     pendente (mesma etapa + mesmo status + mesmas tentativas = zero avanço);
//   - a decisão de stall é SEMPRE por fingerprint: nudges >= 3 E fingerprint
//     idêntico ao do último nudge (`last_nudge_fingerprint` no state) → NÃO
//     bloqueia: marca status=hard_stop, stop_reason="stalled: ...", e deixa
//     a sessão parar;
//   - fingerprint MUDOU = progresso real (running→validated→pr_open, ou
//     attempts subiu) → continua bloqueando, não importa quantos nudges já
//     houve. O `stop_hook_active` do payload NÃO entra na decisão: ele é
//     true em TODA re-injeção da cadeia e derrubaria run longo saudável;
//   - o runner /go também ZERA nudges a cada transição de status no state —
//     as duas pontas concordam: só a MESMA foto 3x seguidas é stall.
//
// Salvaguardas:
//   - silent-fail em TODO erro de FS/parse → permite parar (exit 0, sem
//     output). Um Stop hook que trava a sessão é pior que nenhum hook;
//   - só bloqueia se conseguiu PERSISTIR o nudge — sem persistência o
//     contador nunca subiria e o bloqueio viraria loop infinito;
//   - recusa symlink; read-modify-write preserva campos que não conhece;
//   - /go stop marca status=stopped → este hook libera na hora (!= running).
//
// Contrato Claude Code (stdin → stdout):
//   stdin  : JSON { cwd, stop_hook_active, ... } — só o cwd é consumido
//   stdout : {"decision":"block","reason":"..."} segura o turno;
//            saída vazia deixa parar.

const fs = require('fs');
const path = require('path');

const MAX_STATE_READ = 256 * 1024;
const MAX_NUDGES = 3;

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

// Primeira etapa da faixa que ainda não chegou a `merged`.
// Passo dentro do range sem entrada em steps conta como pendente (o preflight
// pode não ter materializado todas as chaves). Range ilegível → varre as
// chaves conhecidas em ordem numérica. Nada pendente → null (pode parar).
function firstPending(state) {
  const steps = state.steps && typeof state.steps === 'object' && !Array.isArray(state.steps)
    ? state.steps
    : {};

  let from = NaN;
  let to = NaN;
  if (Array.isArray(state.range) && state.range.length === 2) {
    from = Number(state.range[0]);
    to = Number(state.range[1]);
  }

  if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= from && to - from < 1000) {
    for (let k = from; k <= to; k++) {
      const s = steps[String(k)];
      const st = s && s.status ? String(s.status) : 'pending';
      if (st !== 'merged') {
        return { k: String(k), status: st, attempts: s && typeof s.attempts === 'number' ? s.attempts : 0 };
      }
    }
    return null;
  }

  const keys = Object.keys(steps).sort((a, b) => Number(a) - Number(b));
  for (const k of keys) {
    const s = steps[k] || {};
    const st = s.status ? String(s.status) : 'pending';
    if (st !== 'merged') {
      return { k, status: st, attempts: typeof s.attempts === 'number' ? s.attempts : 0 };
    }
  }
  return null;
}

function writeState(statePath, state) {
  // Node nunca escreve BOM em 'utf8' — o contrato UTF-8 sem BOM sai de graça.
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function main() {
  let data = {};
  try {
    const raw = readStdin();
    if (raw.trim()) data = JSON.parse(raw);
  } catch (_) {
    data = {};
  }

  const projectDir = data && typeof data.cwd === 'string' && data.cwd.trim() ? data.cwd : process.cwd();
  const statePath = path.join(projectDir, '.katana', 'state.json');

  const raw = safeRead(statePath, MAX_STATE_READ);
  if (!raw) process.exit(0); // sem state (ou symlink) → sem run → pode parar

  let state;
  try {
    state = JSON.parse(stripBom(raw));
  } catch (_) {
    process.exit(0); // state ilegível → não seguro bloquear em cima dele
  }
  if (!state || typeof state !== 'object' || state.status !== 'running') process.exit(0);

  const pend = firstPending(state);
  if (!pend) process.exit(0); // tudo merged → o turno pode acabar

  const nudges = typeof state.nudges === 'number' && state.nudges >= 0 ? state.nudges : 0;
  const fingerprint = `${pend.k}|${pend.status}|${pend.attempts}`;
  // Stall é SÓ por fingerprint (nunca por stop_hook_active): fingerprint
  // diferente = progresso real = o bloqueio continua valendo.
  const stalled = nudges >= MAX_NUDGES && state.last_nudge_fingerprint === fingerprint;

  if (stalled) {
    // 3 nudges sem progresso: empurrar de novo seria moto-perpétuo, não
    // autonomia. Parada dura com endereço de retomada.
    state.status = 'hard_stop';
    state.stop_reason =
      `stalled: ${nudges} nudges do Stop hook sem progresso na etapa ${pend.k} ` +
      `(${pend.status}, tentativa ${pend.attempts}). Retome com /go resume.`;
    state.updated_at = new Date().toISOString();
    try { writeState(statePath, state); } catch (_) {}
    process.exit(0); // deixa parar
  }

  // Bloqueia SÓ com o nudge persistido — senão o contador congela e o
  // bloqueio nunca expira (fail-safe: deixa parar).
  state.nudges = nudges + 1;
  state.last_nudge_fingerprint = fingerprint;
  state.updated_at = new Date().toISOString();
  try {
    writeState(statePath, state);
  } catch (_) {
    process.exit(0);
  }

  const reason =
    `Run /go ativo: etapa ${pend.k} (${pend.status}). ` +
    `Continue de onde parou; releia .katana/state.json e o ROADMAP.md.`;
  try {
    process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
  } catch (_) {}
  process.exit(0);
}

try {
  main();
} catch (_) {
  process.exit(0); // nunca bloqueie a sessão por erro interno
}
