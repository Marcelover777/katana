#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_SKILLS = ["goal", "plan"];
const EXPECTED_SKILL_FILES = new Set([
  "skills/goal/SKILL.md",
  "skills/plan/SKILL.md",
  "skills/plan/ROADMAP-TEMPLATE.md",
]);
const MAX_SKILL_LINES = 140;
const errors = [];

const rel = (path) => relative(ROOT, path).replaceAll("\\", "/");
const abs = (path) => resolve(ROOT, path);
const has = (path) => existsSync(abs(path));
const read = (path) => readFileSync(abs(path), "utf8").replace(/^\uFEFF/, "");
const lines = (text) => text.replace(/\r?\n$/, "").split(/\r?\n/);
const fail = (path, message, line = 0) =>
  errors.push(`${path}${line ? `:${line}` : ""}: ${message}`);

function* walk(dir = ROOT) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const result = {};
  for (const row of match[1].split(/\r?\n/)) {
    const pair = row.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (!pair) continue;
    result[pair[1]] = pair[2].trim().replace(/^("|')|("|')$/g, "");
  }
  return result;
}

// Arquivos essenciais e superfícies removidas na v2.
for (const path of [
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "skills/plan/ROADMAP-TEMPLATE.md",
]) {
  if (!has(path)) fail(path, "arquivo obrigatório ausente");
}

for (const path of [
  "hooks",
  "examples",
  "assets",
  "skills/fix",
  "README.en.md",
  "install.sh",
  "install.ps1",
  "scripts/goal.ps1",
]) {
  if (has(path)) fail(path, "superfície legada reintroduzida; mantenha a v2 Markdown-only");
}

// Exatamente duas skills, com invocação explícita e tamanho limitado.
let skills = [];
if (!has("skills")) {
  fail("skills", "diretório ausente");
} else {
  skills = readdirSync(abs("skills"))
    .filter((name) => lstatSync(abs(`skills/${name}`)).isDirectory())
    .sort();
  if (JSON.stringify(skills) !== JSON.stringify(EXPECTED_SKILLS)) {
    fail("skills", `esperado {${EXPECTED_SKILLS.join(", ")}}; encontrado {${skills.join(", ")}}`);
  }
}

for (const skill of skills) {
  const path = `skills/${skill}/SKILL.md`;
  if (!has(path)) {
    fail(path, "arquivo ausente");
    continue;
  }
  const text = read(path);
  const fm = parseFrontmatter(text);
  if (!fm) {
    fail(path, "frontmatter YAML ausente", 1);
    continue;
  }
  if (fm.name !== skill) fail(path, `name '${fm.name || ""}' não corresponde ao diretório '${skill}'`, 2);
  if (!fm.description || fm.description.length < 40 || fm.description.length > 400) {
    fail(path, "description deve ter entre 40 e 400 caracteres");
  }
  if (fm["disable-model-invocation"] !== "true") {
    fail(path, "workflow com efeitos deve exigir invocação explícita");
  }
  if (!fm["argument-hint"]) fail(path, "argument-hint ausente");
  const count = lines(text).length;
  if (count > MAX_SKILL_LINES) fail(path, `${count} linhas; máximo ${MAX_SKILL_LINES}`);
}

// Manifestos coerentes entre plugin e marketplace.
let plugin;
let marketplace;
try {
  plugin = JSON.parse(read(".claude-plugin/plugin.json"));
} catch (error) {
  fail(".claude-plugin/plugin.json", `JSON inválido: ${error.message}`);
}
try {
  marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
} catch (error) {
  fail(".claude-plugin/marketplace.json", `JSON inválido: ${error.message}`);
}

if (plugin) {
  if (plugin.name !== "katana") fail(".claude-plugin/plugin.json", "name deve ser 'katana'");
  if (!/^\d+\.\d+\.\d+$/.test(plugin.version || "")) {
    fail(".claude-plugin/plugin.json", "version deve usar SemVer");
  }
  for (const field of ["description", "repository", "license"]) {
    if (!plugin[field]) fail(".claude-plugin/plugin.json", `campo '${field}' ausente`);
  }
}

if (marketplace) {
  const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const entry = entries.find((item) => item.name === "katana");
  if (!entry) fail(".claude-plugin/marketplace.json", "entrada do plugin 'katana' ausente");
  else {
    if (entry.source !== "./") fail(".claude-plugin/marketplace.json", "source deve ser './'");
    if (entry.strict !== true) fail(".claude-plugin/marketplace.json", "strict deve ser true");
    if (plugin && entry.version !== plugin.version) {
      fail(".claude-plugin/marketplace.json", `version '${entry.version}' difere do plugin '${plugin.version}'`);
    }
  }
}

// A documentação pública usa o namespace real de plugins.
if (has("README.md")) {
  const readme = read("README.md");
  for (const skill of EXPECTED_SKILLS) {
    if (!readme.includes(`/katana:${skill}`)) fail("README.md", `não documenta '/katana:${skill}'`);
  }
}

// Links Markdown relativos devem resolver e o snapshot não pode carregar runtime
// removido nem conteúdo de um produto usado como exemplo durante a v1.
const legacyTokens = [".katana/state.json", ".katana/LOG.md", "/goal setup", "scripts/goal.ps1"];
const removedCommand = "/katana:" + "fix";
const projectLeaks = [
  ["bo", "vx"].join(""),
  ["forecast", "-os"].join(""),
  ["forecast", " os"].join(""),
  ["boi", "_", "gordo"].join(""),
];
for (const path of walk()) {
  const pathRel = rel(path);
  if (pathRel.startsWith("skills/") && !EXPECTED_SKILL_FILES.has(pathRel)) {
    fail(pathRel, "arquivo de skill não previsto; justifique a nova superfície no validador");
  }
  const buffer = readFileSync(path);
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  const lower = text.toLowerCase();
  if (text.includes(removedCommand)) fail(pathRel, `comando removido ainda documentado: '${removedCommand}'`);
  for (const token of projectLeaks) {
    if (lower.includes(token)) fail(pathRel, "conteúdo específico de produto detectado");
  }
  if (pathRel.startsWith("skills/")) {
    for (const token of legacyTokens) {
      if (text.includes(token)) fail(pathRel, `referência à superfície removida: '${token}'`);
    }
  }
  if (!pathRel.endsWith(".md")) continue;
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    if (target.includes("<") || target.includes(">")) continue;
    const resolved = resolve(dirname(path), target);
    const fromRoot = relative(ROOT, resolved);
    const outsideRoot = fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot);
    if (outsideRoot || !existsSync(resolved)) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      fail(pathRel, `link relativo inexistente: '${match[1]}'`, line);
    }
  }
}

if (errors.length) {
  console.error(`\n✗ Katana: ${errors.length} problema(s)\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("✓ Katana v2: 2 skills explícitas, 1 roadmap, sem runtime ou conteúdo de produto legado.");
