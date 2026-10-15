/* 06 - ESTRUTURA, SEGURANCA E LINKS (10/10)
   - toda pagina tem os scripts basicos
   - nenhuma pagina aponta para arquivo que nao existe
   - nenhum segredo no codigo do site (o painel do vendedor nao expoe token)
   - nenhum HTML quebrado (tags <script>/<style> balanceadas)
   - service worker coerente */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

const html = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");

/* ---------- 1. scripts basicos em toda pagina ---------- */
console.log("=== 1. SCRIPTS DE BASE EM TODA PAGINA ===");
const basicos = ["theme.js", "conta.js", "app-update.js", "loja.js"];
const cliente = ["index.html", "carrinho.html", "checkout.html", "perfil.html", "meus-pedidos.html",
    "pedido-sucesso.html", "configuracoes.html"];
cliente.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const faltando = basicos.filter(b => t.indexOf(b) < 0);
    if (faltando.length) falha(p + " sem: " + faltando.join(", "));
});
console.log("  ok  as " + cliente.length + " paginas do cliente carregam theme/conta/app-update/loja");

/* o painel do vendedor nao usa REGIOES/CAMINHOES (ele cuida de pedidos),
   entao nao precisa do loja.js: ele so precisa de script/telegram */
const adm = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
["script.js", "telegram.js", "app.js"].forEach(s => {
    if (adm.indexOf(s) < 0) falha("admin.html sem " + s);
});
console.log("  ok  admin.html carrega script/telegram/app");

/* ---------- 2. links internos ---------- */
console.log("\n=== 2. LINKS INTERNOS (nada apontando para arquivo morto) ===");
const existe = (alvo) => fs.existsSync(path.join(dir, alvo.split("#")[0].split("?")[0]));
let checados = 0;
html.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const links = [...t.matchAll(/href="([^"]+)"/g), ...t.matchAll(/src="([^"]+)"/g)]
        .map(m => m[1])
        .filter(u => u && !/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/.test(u))
        /* ignora o que esta dentro de string de JS (montagem de HTML) */
        .filter(u => !/['"(+\s]/.test(u));
    links.forEach(function (u) {
        checados++;
        if (!existe(u)) falha(p + " aponta para " + u + " (arquivo nao existe)");
    });
});
console.log("  " + checados + " links internos conferidos: " +
    (erros === 0 ? "todos existem" : "veja os erros acima"));

/* ---------- 3. seguranca ---------- */
console.log("\n=== 3. SEGURANCA ===");
/* nenhum arquivo de segredo no git */
const { execSync } = require("child_process");
const versionados = execSync("git ls-files", { cwd: dir, encoding: "utf8" }).split("\n");
const segredos = versionados.filter(f => /\.(jks|keystore|p12|pem|env)$/.test(f) || /service-account|credential/i.test(f));
if (segredos.length) falha("arquivo de segredo versionado: " + segredos.join(", "));
else console.log("  ok  nenhum .jks/.keystore/.env no git");

/* o token do telegram NAO pode estar no codigo do cliente */
const scriptsDoCliente = ["app.js", "loja.js", "conta.js", "theme.js", "firebase-appcheck.js", "sw.js"];
const token = /\d{9,10}:[A-Za-z0-9_-]{30,}/;
scriptsDoCliente.forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    if (token.test(t)) falha("token do telegram dentro de " + f + " (vaza para o cliente)");
});
console.log("  ok  nenhum token do telegram no codigo do cliente");

/* o painel NAO deve ficar no cache do app do cliente */
const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
if (/^\s*"admin\.html",?$/m.test(sw)) falha("sw.js guarda admin.html no cache do cliente");
else console.log("  ok  admin.html fora do cache do cliente");
if (/^\s*"telegram\.js",?$/m.test(sw)) falha("sw.js guarda telegram.js (tem o token)");
else console.log("  ok  telegram.js fora do cache do cliente");

/* o service worker tem de se registrar sozinho */
const upd = fs.readFileSync(path.join(dir, "app-update.js"), "utf8");
if (!/DOMContentLoaded[\s\S]{0,80}iniciarApp|iniciarApp\(\)[\s\S]{0,60}DOMContentLoaded/.test(upd) &&
    !/iniciarApp\(\);/.test(upd.split("function iniciarApp")[0] || "")) {
    /* confere se existe a chamada automatica */
    if (upd.indexOf("iniciarApp();") < 0) falha("o service worker nunca e registrado (iniciarApp sem chamador)");
}
console.log("  ok  o service worker se registra sozinho");

/* versao do app coerente com o versao.txt */
const versaoTxt = fs.readFileSync(path.join(dir, "versao.txt"), "utf8").trim();
const m = upd.match(/var VERSAO_APP\s*=\s*"([^"]+)"/);
if (!m) falha("app-update.js sem VERSAO_APP");
else if (m[1] !== versaoTxt) falha("VERSAO_APP (" + m[1] + ") != versao.txt (" + versaoTxt + ")");
else console.log("  ok  versao do app = " + versaoTxt);

/* ---------- 4. HTML bem formado ---------- */
console.log("\n=== 4. HTML BEM FORMADO ===");
html.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const a = (t.match(/<script\b/g) || []).length, f = (t.match(/<\/script>/g) || []).length;
    if (a !== f) falha(p + ": <script> " + a + " x </script> " + f);
    const sa = (t.match(/<style\b/g) || []).length, sf = (t.match(/<\/style>/g) || []).length;
    if (sa !== sf) falha(p + ": <style> " + sa + " x </style> " + sf);
    if ((t.match(/<html/g) || []).length !== 1) falha(p + ": falta <html>");
    if (t.indexOf("�") >= 0) falha(p + ": tem caractere corrompido");
});
console.log("  ok  " + html.length + " paginas: tags balanceadas e sem caractere corrompido");

/* ---------- 5. JSON validos ---------- */
console.log("\n=== 5. JSON ===");
["catalogo.json", "manifest.json", "manifest-vendedor.json", "precos-base.json"].forEach(function (f) {
    try { JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch (e) { falha(f + ": " + e.message); }
});
console.log("  ok  os 4 JSON abrem sem erro");

/* ---------- 6. versao dos assets ---------- */
console.log("\n=== 6. VERSAO DOS ASSETS IGUAL EM TODAS AS PAGINAS ===");
const versoes = new Set();
cliente.concat(["admin.html"]).forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const vs = [...t.matchAll(/\?v=(2026\d+[a-z])/g)].map(m => m[1]);
    vs.forEach(v => versoes.add(v));
});
console.log("  versoes encontradas: " + [...versoes].join(", "));
if (versoes.size > 1) falha("as paginas usam versoes diferentes (cache velho vai sobrar no celular)");

console.log("\n" + (erros === 0 ? "*** ESTRUTURA E SEGURANCA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);