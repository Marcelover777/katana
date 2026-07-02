#!/usr/bin/env node
// Katana — validador de integridade do repo.
//
// Zero dependências (só built-ins do Node). O guarda-corpo anti-inchaço É este
// arquivo: exatamente 3 skills, description ≤280 chars, SKILL.md ≤250 linhas.
// Quem quiser um 4º comando vai ter que editar o validador — e explicar por quê.
//
//   node scripts/validate.mjs
//
// Saída: lista de erros `arquivo:linha: mensagem`. Exit 1 se houver erro.
// CRLF/BOM-tolerante na leitura (lição do Forger: autocrlf do Windows quebrava
// o parse de frontmatter no checkout).

import { readFileSync, readdirSync, existsSync, statSync, lstatSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (file, line, msg) =>
  errors.push(line ? `${file}:${line}: ${msg}` : `${file}: ${msg}`);

const abs = (p) => join(ROOT, p);
const has = (p) => existsSync(abs(p));
const read = (p) => readFileSync(abs(p), "utf8").replace(/^\uFEFF/, "");
const lines = (txt) => txt.replace(/\r?\n$/, "").split(/\r?\n/);
const lineOf = (txt, needle) => {
  const i = lines(txt).findIndex((l) => l.includes(needle));
  return i === -1 ? 0 : i + 1;
};

// --- 1. Exatamente 3 skills: plan, goal, fix ---------------------------------
// A contagem é o contrato. Não existe "só mais um comando".
const EXPECTED_SKILLS = ["fix", "goal", "plan"];
let skills = [];
if (!has("skills")) {
  fail("skills", 0, "diretório ausente");
} else {
  skills = readdirSync(abs("skills"))
    .filter((n) => !n.startsWith(".") && statSync(abs(join("skills", n))).isDirectory())
    .sort();
  if (JSON.stringify(skills) !== JSON.stringify(EXPECTED_SKILLS))
    fail(
      "skills",
      0,
      `esperado exatamente {plan, goal, fix}; encontrado {${skills.join(", ") || "nada"}}. ` +
        `3 comandos é regra dura — mecanismo novo entra DENTRO de /plan, /goal ou /fix, não como comando.`,
    );
}

// --- 2–4. Cada SKILL.md: frontmatter, tamanho, links ------------------------
const parseFrontmatter = (txt) => {
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return fm;
};

const MAX_DESC = 280; // custo de contexto permanente — cada char cobra em toda sessão
const MAX_LINES = 250; // conteúdo extenso vai para references/*.md, lido on-demand

for (const skill of skills) {
  const rel = join("skills", skill, "SKILL.md").replace(/\\/g, "/");
  if (!has(rel)) {
    fail(rel, 0, "ausente");
    continue;
  }
  const txt = read(rel);

  // 2. Frontmatter name + description (≤280).
  const fm = parseFrontmatter(txt);
  if (!fm) {
    fail(rel, 1, "sem frontmatter YAML (---)");
  } else {
    if (!fm.name) fail(rel, 1, "frontmatter sem 'name'");
    else if (fm.name !== skill)
      fail(rel, lineOf(txt, "name:"), `name '${fm.name}' != diretório '${skill}'`);
    if (!fm.description || fm.description.length < 20)
      fail(rel, lineOf(txt, "description:") || 1, "'description' ausente ou curta demais");
    else if (fm.description.length > MAX_DESC)
      fail(
        rel,
        lineOf(txt, "description:"),
        `description com ${fm.description.length} chars (máx ${MAX_DESC}). Corte — isso cobra contexto em TODA sessão.`,
      );
  }

  // 3. ≤250 linhas.
  const n = lines(txt).length;
  if (n > MAX_LINES)
    fail(rel, MAX_LINES + 1, `${n} linhas (máx ${MAX_LINES}). Mova o excedente para references/*.md.`);

  // 4. Todo link relativo aponta para arquivo que existe.
  for (const m of txt.matchAll(/\]\(([^)\s]+)\)/g)) {
    let ref = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) continue; // http:, https:, mailto:
    if (ref.startsWith("#")) continue; // âncora interna
    if (/[<>]/.test(ref)) continue; // placeholder de template
    ref = ref.split("#")[0];
    if (!ref) continue;
    const target = ref.startsWith("/") ? ref.slice(1) : join("skills", skill, ref);
    if (!has(target)) {
      const ln = lines(txt).findIndex((l) => l.includes(`(${m[1]})`)) + 1;
      fail(rel, ln, `link relativo para arquivo inexistente: '${m[1]}'`);
    }
  }
}

// --- 5. Os 3 comandos aparecem nas superfícies públicas ---------------------
const COMMANDS = ["/plan", "/goal", "/fix"];
for (const surface of ["README.md", "README.en.md", ".claude-plugin/plugin.json"]) {
  if (!has(surface)) {
    fail(surface, 0, "ausente");
    continue;
  }
  const txt = read(surface);
  for (const cmd of COMMANDS)
    if (!txt.includes(cmd)) fail(surface, 0, `não menciona '${cmd}'`);
}

// --- 5b. Manifests do plugin coerentes ---------------------------------------
let pluginName = null;
if (has(".claude-plugin/plugin.json")) {
  try {
    const plugin = JSON.parse(read(".claude-plugin/plugin.json"));
    pluginName = plugin.name;
    if (plugin.name !== "katana") fail(".claude-plugin/plugin.json", 0, `name '${plugin.name}' != 'katana'`);
    if (!plugin.description) fail(".claude-plugin/plugin.json", 0, "sem 'description'");
  } catch (e) {
    fail(".claude-plugin/plugin.json", 0, `JSON inválido — ${e.message}`);
  }
}
if (!has(".claude-plugin/marketplace.json")) {
  fail(".claude-plugin/marketplace.json", 0, "ausente");
} else {
  try {
    const mkt = JSON.parse(read(".claude-plugin/marketplace.json"));
    const names = (mkt.plugins || []).map((p) => p.name);
    if (pluginName && !names.includes(pluginName))
      fail(".claude-plugin/marketplace.json", 0, `nenhum plugin com name '${pluginName}'`);
  } catch (e) {
    fail(".claude-plugin/marketplace.json", 0, `JSON inválido — ${e.message}`);
  }
}

// --- 6. Hooks existem e parseiam ---------------------------------------------
const HOOKS = ["katana-session-start.js", "katana-continue.js", "katana-guard.js"];
if (!has("hooks")) {
  fail("hooks", 0, "diretório ausente");
} else {
  for (const h of HOOKS) if (!has(join("hooks", h))) fail(`hooks/${h}`, 0, "ausente");
  for (const f of readdirSync(abs("hooks")).filter((n) => n.endsWith(".js"))) {
    const rel = `hooks/${f}`;
    const r = spawnSync(process.execPath, ["--check", abs(rel)], { encoding: "utf8" });
    if (r.status !== 0) {
      const first = (r.stderr || "erro desconhecido").split(/\r?\n/).find((l) => l.trim()) || "";
      fail(rel, 0, `não parseia (node --check): ${first.trim()}`);
    }
  }
}

// --- 7. state.json de exemplo: JSON válido com o schema mínimo ---------------
// É o contrato que os hooks e o /goal resume leem cru (JSON.parse sem perdão).
const STATE = "examples/forecast-os/.katana/state.json";
if (!has(STATE)) {
  fail(STATE, 0, "ausente — o exemplo É a documentação viva");
} else {
  const raw = readFileSync(abs(STATE), "utf8");
  if (raw.charCodeAt(0) === 0xfeff)
    fail(STATE, 1, "BOM detectado — state.json é UTF-8 SEM BOM (hooks fazem JSON.parse cru)");
  try {
    const st = JSON.parse(raw.replace(/^\uFEFF/, ""));
    for (const field of ["version", "range", "current", "status", "steps"])
      if (!(field in st)) fail(STATE, 1, `campo obrigatório ausente: '${field}'`);
    if ("range" in st && (!Array.isArray(st.range) || st.range.length !== 2))
      fail(STATE, 1, "'range' deve ser array [N, M]");
    const STATUSES = new Set(["running", "done", "hard_stop", "stopped"]);
    if ("status" in st && !STATUSES.has(st.status))
      fail(STATE, 1, `status '${st.status}' inválido (${[...STATUSES].join("|")})`);
    if ("steps" in st && (typeof st.steps !== "object" || st.steps === null || Array.isArray(st.steps)))
      fail(STATE, 1, "'steps' deve ser objeto {K: {...}}");
  } catch (e) {
    fail(STATE, 1, `JSON inválido — ${e.message}`);
  }
}

// --- 8. Rebrand limpo: nenhum resto das gerações anteriores ------------------
// Tokens montados por concatenação para este arquivo não se auto-acusar.
const BANNED = [
  "CRUCIBLE" + "_",
  "FORGER" + "_",
  ".for" + "ge/",
];
// CHANGELOG e READMEs contam a história da linhagem — únicos com passe livre.
const REBRAND_EXEMPT = new Set(["CHANGELOG.md", "README.md", "README.en.md"]);
const SKIP_DIRS = new Set([".git", "node_modules"]);

function* walk(rel) {
  for (const name of readdirSync(abs(rel || "."))) {
    const r = rel ? `${rel}/${name}` : name;
    const st = lstatSync(abs(r));
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(r);
    } else {
      yield r;
    }
  }
}

for (const rel of walk("")) {
  if (REBRAND_EXEMPT.has(rel)) continue;
  const buf = readFileSync(abs(rel));
  if (buf.includes(0)) continue; // binário
  const txt = buf.toString("utf8");
  for (const token of BANNED) {
    if (!txt.includes(token)) continue;
    const ln = lines(txt).findIndex((l) => l.includes(token)) + 1;
    fail(rel, ln, `resto de rebrand: contém '${token}'`);
  }
}

// --- 9. Âncoras do repo -------------------------------------------------------
for (const f of ["LICENSE", "CHANGELOG.md"]) if (!has(f)) fail(f, 0, "ausente");

// --- Resultado ----------------------------------------------------------------
if (errors.length) {
  console.error(`\n✗ Katana — ${errors.length} problema(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("✓ Katana OK — 3 comandos, superfícies coerentes, hooks parseiam, rebrand limpo.");
