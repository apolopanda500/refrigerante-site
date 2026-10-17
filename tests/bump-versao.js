/* Sobe a versao de todos os assets de uma vez.
   uso:  node tests/bump-versao.js 20261014t
   (mantem o cache do celular sempre junto: sem isso o app fica
    com a versao antiga mesmo depois de publicar)                 */
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "..");
const nova = process.argv[2];
if (!nova) {
    console.log("uso: node tests/bump-versao.js 20261014x");
    process.exit(1);
}

/* a versao atual e a que esta na maioria dos arquivos */
const contas = {};
["index.html", "carrinho.html", "admin.html"].forEach(f => {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    const m = t.match(/\?v=(2026\d+[a-z])/);
    if (m) contas[m[1]] = (contas[m[1]] || 0) + 1;
});
const antiga = Object.keys(contas).sort((a, b) => contas[b] - contas[a])[0];
if (!antiga) { console.log("nao achei a versao atual"); process.exit(1); }
if (antiga === nova) { console.log("ja esta na versao " + nova); process.exit(0); }

const paginas = ["index.html", "carrinho.html", "perfil.html", "meus-pedidos.html",
    "pedido-sucesso.html", "configuracoes.html", "admin.html"];

paginas.forEach(function (f) {
    const arq = path.join(dir, f);
    const antes = fs.readFileSync(arq, "utf8");
    const depois = antes.split(antiga).join(nova);
    if (antes === depois) { console.log("  (sem mudanca) " + f); return; }
    const n = antes.split(antiga).length - 1;
    fs.writeFileSync(arq, depois, "utf8");
    console.log("  " + f + "  (" + n + " referencias)");
});

/* versao.txt: o app compara esse arquivo para saber que ha novidade */
fs.writeFileSync(path.join(dir, "versao.txt"), nova, "utf8");
/* VERSAO_APP do app-update.js */
const upd = path.join(dir, "app-update.js");
if (fs.existsSync(upd)) {
    const t = fs.readFileSync(upd, "utf8");
    fs.writeFileSync(upd, t.replace(/(var VERSAO_APP\s*=\s*")[^"]+(")/, "$1" + nova + "$2"), "utf8");
}
/* sw.js: o nome do cache leva a versao. Sem isso, publicar nao invalida
   nada e o celular continua vendo a copia antiga (foi o bug do Historico) */
const sw = path.join(dir, "sw.js");
if (fs.existsSync(sw)) {
    const t = fs.readFileSync(sw, "utf8");
    fs.writeFileSync(sw, t.replace(/(var VERSAO\s*=\s*")[^"]+(")/, "$1" + nova + "$2"), "utf8");
}
/* app-update.js tambem guarda o nome do cache vivo, para nao apagar o certo */
if (fs.existsSync(upd)) {
    const t = fs.readFileSync(upd, "utf8");
    fs.writeFileSync(upd, t.replace(/(var CACHE_ATUAL\s*=\s*")[^"]+(")/, "$1" + "convencao-cache-" + nova + "$2"), "utf8");
}

console.log("\nversao: " + antiga + " -> " + nova);
console.log("versao.txt, VERSAO_APP, sw.js e o nome do cache atualizados (o celular vai pegar a versao nova)");