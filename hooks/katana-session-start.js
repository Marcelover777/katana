#!/usr/bin/env node
// Katana — SessionStart hook (continuidade entre sessões).
//
// O que faz, em ordem de prioridade:
//   1. `.katana/state.json` com run ativo (status running|hard_stop) → injeta
//      UMA linha de estado (~55 tokens): passo atual/faixa, status do passo,
//      tentativas, ação sugerida e o stop_reason (gate pendente, se houver).
//      A sessão nova nasce sabendo que existe um run /go no meio — sem pagar
//      um log inteiro de contexto.
//   2. Sem run ativo → injeta a CAUDA do `.katana/LOG.md` (cap 8 KB, corte em
//      fronteira de bloco `\n## `): o log é append-only, o estado mais
//      recente mora no fim, e estado atual > história antiga.
//   3. Nada disso existe → saída vazia, exit 0. Silêncio.
//
// Salvaguardas (não-negociáveis):
//   - silent-fail em QUALQUER erro de FS/parse — nunca bloqueia o início da
//     sessão (pior caso: saída vazia + exit 0);
//   - recusa symlink e não-arquivo em tudo que lê (vetor de clobber/exfil);
//   - caps de tamanho: state > 256 KB é lixo (ignora), LOG > 2 MB não é lido
//     inteiro à toa (ignora — o log de 1 dev não chega perto disso);
//   - nunca ecoa VALOR de env var: o state só carrega NOMES, e é só isso que
//     pode sair daqui;
//   - CommonJS puro, zero dependências, sem worker, sem DB, sem rede.
//
// Contrato Claude Code (stdin → stdout):
//   stdin  : JSON { session_id, cwd, hook_event_name, source, ... }
//   stdout : texto puro vira contexto da sessão. Saída vazia = nada injetado.

const fs = require('fs');
const path = require('path');

const MAX_LOG_INJECT = 8 * 1024;       // cauda injetada do LOG.md
const MAX_LOG_READ = 2 * 1024 * 1024;  // acima disso nem abre
const MAX_STATE_READ = 256 * 1024;     // state.json maior que isso não é estado
const MAX_REASON_CHARS = 160;          // stop_reason truncado na linha de estado

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) { return ''; }
}

// Leitura defensiva: lstat primeiro; symlink, não-arquivo ou gigante → null.
function safeRead(p, maxBytes) {
  let st;
  try { st = fs.lstatSync(p); } catch (_) { return null; }
  if (st.isSymbolicLink() || !st.isFile() || st.size > maxBytes) return null;
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
}

// BOM defensivo: o contrato é UTF-8 SEM BOM, mas editor de humano erra.
function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function resolveProjectDir(data) {
  if (data && typeof data.cwd === 'string' && data.cwd.trim()) return data.cwd;
  return process.cwd();
}

function oneLine(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

// A linha de estado (~55 tokens). Só para run ativo: running ou hard_stop.
// done/stopped não são "run no meio" — caem na cauda do LOG.
function stateLine(state) {
  if (!state || typeof state !== 'object') return '';
  const status = state.status;
  if (status !== 'running' && status !== 'hard_stop') return '';

  const range = Array.isArray(state.range) && state.range.length === 2 ? state.range : null;
  const cur = state.current != null ? state.current : (range ? range[0] : '?');
  const faixa = range ? `[${range[0]}..${range[1]}]` : '[?]';
  const step = state.steps && state.steps[String(cur)] ? state.steps[String(cur)] : null;
  const stepStatus = step && step.status ? String(step.status) : String(status);
  const attempts = step && typeof step.attempts === 'number' ? step.attempts : 0;

  if (status === 'running') {
    return (
      `katana: run /go ATIVO — passo ${cur} de ${faixa} (${stepStatus}, tentativa ${attempts}). ` +
      `Continue o run de onde parou: releia .katana/state.json e o ROADMAP.md (retomada explícita: /go resume).`
    );
  }

  // hard_stop: o stop_reason carrega o motivo — inclusive gate pendente
  // (por convenção, prefixo "gate:" com o nome exato da env var, nunca o valor).
  let reason = oneLine(state.stop_reason) || 'sem stop_reason registrado';
  if (reason.length > MAX_REASON_CHARS) reason = reason.slice(0, MAX_REASON_CHARS - 1) + '…';
  return (
    `katana: run /go PARADO (hard_stop) no passo ${cur} de ${faixa} (${stepStatus}, tentativa ${attempts}) — ` +
    `${reason} Ação: resolva e rode /go resume.`
  );
}

// Cauda do LOG.md: cap de bytes, recomeçando numa fronteira de bloco `\n## `
// para não cortar um bloco no meio.
function logTail(content) {
  if (Buffer.byteLength(content, 'utf8') <= MAX_LOG_INJECT) return content;
  const buf = Buffer.from(content, 'utf8');
  let tail = buf.slice(buf.length - MAX_LOG_INJECT).toString('utf8');
  const firstBlock = tail.indexOf('\n## ');
  if (firstBlock !== -1) tail = tail.slice(firstBlock + 1);
  return '…(LOG truncado; mostrando os blocos mais recentes)…\n\n' + tail;
}

function main() {
  let data = {};
  try {
    const raw = readStdin();
    if (raw.trim()) data = JSON.parse(raw);
  } catch (_) {
    data = {}; // payload ausente/inválido → segue com fallback de cwd
  }

  const katanaDir = path.join(resolveProjectDir(data), '.katana');

  // 1) Run ativo → 1 linha de estado e mais nada.
  const rawState = safeRead(path.join(katanaDir, 'state.json'), MAX_STATE_READ);
  if (rawState) {
    let line = '';
    try {
      line = stateLine(JSON.parse(stripBom(rawState)));
    } catch (_) {
      line = ''; // state corrompido → não inventa estado; cai pro LOG
    }
    if (line) {
      try { process.stdout.write(line + '\n'); } catch (_) {}
      process.exit(0);
    }
  }

  // 2) Sem run ativo → cauda do log.
  const log = safeRead(path.join(katanaDir, 'LOG.md'), MAX_LOG_READ);
  if (log && log.trim()) {
    const header =
      'CONTINUIDADE Katana — cauda do .katana/LOG.md (log append-only). ' +
      'Retome SEM pedir reexplicação; o próximo passo está no último bloco.\n' +
      '────────────────────────────────────────\n\n';
    try { process.stdout.write(header + logTail(log).trim() + '\n'); } catch (_) {}
  }

  // 3) Nada → saída vazia.
  process.exit(0);
}

try {
  main();
} catch (_) {
  // Rede de segurança final: qualquer erro inesperado → saída limpa.
  process.exit(0);
}
