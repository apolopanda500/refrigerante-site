/* 04 - CATALOGO E CLASSES (10/10)
   confere usando o codigo REAL do robo (.github/scripts/sync-catalogo.js) */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

const cat = JSON.parse(fs.readFileSync(path.join(dir, "catalogo.json"), "utf8"));

/* carrega o robo sem executar a rede */
const arq = path.join(dir, ".github", "scripts", "sync-catalogo.js");
let src = fs.readFileSync(arq, "utf8");
const i = src.indexOf("function principal()");
src = src.slice(0, i) + "module.exports={precoBaseDe,categoriaPeloNome,classeDaExcecao,getPrecosBase:function(){return PRECOS_BASE;}};";
const modPath = path.join(dir, ".github", "scripts", "__teste.cjs");
fs.writeFileSync(modPath, src, "utf8");
let robo;
try { robo = require(modPath); } finally { fs.unlinkSync(modPath); }

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
function num(v) { return parseFloat(String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")); }

console.log("=== CATALOGO ===");
const total = cat.produtos.length;
console.log("  produtos: " + total);
/* o robo roda 2x por dia e tira do ar o que acabou no site oficial,
   entao a quantidade varia; aqui so barra um numero absurdo. */
if (total < 40 || total > 80) falha("quantidade estranha de produtos: " + total);
else console.log("  quantidade coerente com o site oficial: " + total);

/* campos obrigatorios */
cat.produtos.forEach(function (p) {
    if (!p.nm || !p.pr || !p.im || !p.key || !p.ct) falha("produto incompleto: " + (p.nm || "?"));
});
console.log("  todos com nome, preco, imagem, codigo e classe");

/* codigos unicos */
const chaves = cat.produtos.map(p => p.key);
const dup = chaves.filter((k, x) => chaves.indexOf(k) !== x);
if (dup.length) falha("codigos repetidos: " + dup.join(", "));
else console.log("  codigos unicos: ok");

/* imagens existem */
const semFoto = cat.produtos.filter(p => !fs.existsSync(path.join(dir, p.im)));
if (semFoto.length) falha("imagens faltando: " + semFoto.map(p => p.im).join(", "));
else console.log("  imagens dos produtos: todas no lugar");

/* precos faixas */
const absurdo = cat.produtos.filter(p => { const v = num(p.pr); return v <= 0 || v > 600; });
if (absurdo.length) falha("preco fora do normal: " + absurdo.map(p => p.nm + " " + p.pr).join(", "));
else console.log("  precos dentro da faixa: ok");

console.log("\n=== PRECOS vs TABELA DO DONO (codigo real do robo) ===");
const base = robo.getPrecosBase();
if (!base.length) falha("precos-base.json nao carregou");
let ok = 0;
cat.produtos.forEach(function (p) {
    const dono = robo.precoBaseDe(p.nm);
    if (dono === null) { falha(p.nm + ": sem preco na tabela do dono"); return; }
    if (Math.abs(num(dono) - num(p.pr)) > 0.009) falha(p.nm + ": dono " + dono + " x catalogo " + p.pr);
    else ok++;
});
console.log("  batem: " + ok + "/" + cat.produtos.length);

console.log("\n=== CLASSES (o robo colocaria onde?) ===");
let iguais = 0;
cat.produtos.forEach(function (p) {
    const r = robo.classeDaExcecao(p.key) || robo.categoriaPeloNome(p.nm, p.ds || "", "");
    if (r !== p.ct) falha(p.nm + ": catalogo=" + p.ct + " robo=" + r);
    else iguais++;
});
console.log("  iguais: " + iguais + "/" + cat.produtos.length);

console.log("\n=== GUARANA ZERO LATA junto do CHINOTTO ===");
const gz = cat.produtos.find(p => p.key === "500000113");
const chin = cat.produtos.find(p => /chinotto/i.test(p.nm));
if (!gz) falha("nao achei o guarana zero lata");
else if (chin && gz.ct !== chin.ct) falha("guarana zero lata (" + gz.ct + ") != chinotto (" + chin.ct + ")");
else console.log("  ok  os dois na classe \"" + (gz ? gz.ct : "?") + "\"");

const gz2l = cat.produtos.find(p => /zero/i.test(p.nm) && /2l/i.test(p.nm));
if (gz2l && gz2l.ct !== "2l") falha("o guarana zero 2L deveria continuar em Refrigerantes 2L");
else console.log("  ok  guarana zero 2L continua em Refrigerantes 2L");

console.log("\n" + (erros === 0 ? "*** CATALOGO 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);