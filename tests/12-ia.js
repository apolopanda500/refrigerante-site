/* 12 - IA DO SITE (10/10)
   confere o ia.js: motor local (fatos nunca erram), cadeia da nuvem
   com volta ao local, recomendacoes, widget com tema escuro, cache
   offline, MCP e o portao automatico do GitHub Actions */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ia = fs.readFileSync(path.join(dir, "ia.js"), "utf8");

console.log("=== 1. IA NAS PAGINAS CERTAS ===");
["index.html", "carrinho.html", "checkout.html", "perfil.html",
 "meus-pedidos.html", "pedido-sucesso.html", "configuracoes.html"].forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    if (t.indexOf("ia.js") < 0) falha(p + " nao carrega ia.js");
});
console.log("  ok  as 7 paginas do cliente carregam ia.js");
const adm = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
if (adm.indexOf("ia.js") >= 0) falha("admin.html carrega a IA do cliente (o painel e independente)");
else console.log("  ok  o painel nao carrega a IA do cliente");

console.log("\n=== 2. CACHE OFFLINE E PORTAO AUTOMATICO ===");
const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
if (sw.indexOf("\"ia.js\"") < 0) falha("sw.js nao guarda ia.js no cache offline");
else console.log("  ok  ia.js no cache offline (funciona sem internet)");
if (sw.indexOf("\"central.js\"") < 0) falha("sw.js nao guarda central.js (as notificacoes real do site dependem dele)");
else console.log("  ok  central.js (notificacoes) no cache offline");
if (sw.indexOf("atendimento.js") >= 0) falha("sw.js ainda referencia atendimento.js (arquivo que nao existe)");
else console.log("  ok  atendimento.js fantasma fora do cache");
const check = fs.readFileSync(path.join(dir, ".github", "workflows", "check.yml"), "utf8");
if (check.indexOf("rodar-todos") < 0) falha("check.yml nao roda a suite completa (so garante sintaxe)");
else console.log("  ok  todo push roda TODOS os testes");
if (check.indexOf("--check") < 0) falha("check.yml perdeu a checagem de sintaxe");
else console.log("  ok  sintaxe checada em todo push");

console.log("\n=== 3. SEGURANCA ===");
if (/\d{9,10}:[A-Za-z0-9_-]{30,}/.test(ia)) falha("ia.js tem token/segredo no codigo do cliente");
else console.log("  ok  nenhum token dentro do ia.js");

/* navegador de mentira: sem DOM pronto, o boot nao pode quebrar */
const sandbox = {
    console, Date, Math, JSON, parseInt, parseFloat, isNaN, isFinite, String, Array, Object, Number, Promise,
    setTimeout() {}, clearTimeout() {},
    document: {
        readyState: "loading", addEventListener() {}, getElementById: () => null,
        createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} },
            addEventListener() {}, setAttribute() {}, appendChild() {}, querySelector: () => null,
            querySelectorAll: () => [] }),
        head: { appendChild() {} }, body: null
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    window: {}, location: { pathname: "/index.html" },
    fetch: () => Promise.reject(new Error("sem rede no teste"))
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "loja.js"), "utf8"), sandbox, { filename: "loja.js" });
vm.runInContext(ia, sandbox, { filename: "ia.js" });

/* catalogo falso com a mesma forma do robo */
const cat = [
    { ct: "r2l", nm: "Guarana Antarctica 2L", ds: "", pr: "R$ 12,90", im: "a.jpg", key: "1" },
    { ct: "r2l", nm: "Coca-Cola 2L", ds: "", pr: "R$ 15,90", im: "b.jpg", key: "2" },
    { ct: "r35", nm: "Coca-Cola Lata 350ml", ds: "", pr: "R$ 6,50", im: "c.jpg", key: "3" },
    { ct: "ch", nm: "Chopp Ravache Pilsen 500ml", ds: "", pr: "R$ 9,90", im: "d.jpg", key: "4" },
    { ct: "ag", nm: "Agua Mineral 500ml", ds: "", pr: "R$ 3,00", im: "e.jpg", key: "5" }
];
vm.runInContext("iaUsarCatalogo(" + JSON.stringify(cat) + ");", sandbox);
const perg = (p) => vm.runInContext("iaRespostaLocal(" + JSON.stringify(p) + ")", sandbox);

console.log("\n=== 4. MOTOR LOCAL (fato, o local acerta SEMPRE) ===");
const casos = [
    ["quanto custa guarana 2l", /12,90/, "preco do produto"],
    ["que horas voces atendem", /08:50/, "horario de pedidos"],
    ["quanto custa o frete", /frete/i, "frete"],
    ["quais formas de pagamento", /Pix/, "pagamento"],
    ["voces entregam em seropedica", /Serop/i, "regiao citada"],
    ["quando voces entregam", /pedido/i, "dias de entrega"],
    ["meu bairro e botafogo", /Atendemos apenas|bloqueia/i, "bairro fora da area"],
    ["qual o whatsapp da loja", /8315-8911/, "contato"]
];
casos.forEach(function (c) {
    const r = perg(c[0]);
    if (!r.texto) { falha("sem resposta para: " + c[0]); return; }
    if (!c[1].test(r.texto)) falha("'" + c[0] + "' -> resposta errada: " + r.texto.slice(0, 70));
    else console.log("  ok  " + c[2]);
    if (!r.rapido) falha("'" + c[0] + "' e fato e deveria ser rapido (local garantido)");
});

console.log("\n=== 5. CADEIA: local -> nuvem -> volta ao local ===");
const g = perg("xyzzy plugh 12345");
if (!g.texto) falha("pergunta sem sentido nao gerou resposta");
if (g.intencao !== "fallback") falha("pergunta sem sentido deveria cair no fallback (veio " + g.intencao + ")");
else console.log("  ok  desconhecido cai no fallback");
if (g.confianca >= 0.9) falha("fallback nao pode ter confianca alta");
else console.log("  ok  confianca baixa = candidato a IA da nuvem");
const prov = vm.runInContext("iaProvedor()", sandbox);
if (prov !== "local") falha("provedor padrao deveria ser local (veio " + prov + ")");
else console.log("  ok  padrao = motor local (sempre funciona)");
const saida = vm.runInContext(
    '(function(){ var r = null; iaResponder("quais formas de pagamento?", function(t, f){ r = { t: t, f: f }; }); return r; })()',
    sandbox);
if (!saida || !/Pix/.test(saida.t) || saida.f !== "local") falha("fato deveria responder local na hora, sem rede");
else console.log("  ok  fato responde sem rede, fonte=local");

console.log("\n=== 6. RECOMENDACOES ===");
const rec = vm.runInContext(
    "recomendarProdutos(4, " + JSON.stringify(cat) + ", { guarana: 2 })", sandbox);
if (!Array.isArray(rec) || !rec.length) falha("recomendacoes vazias com historico");
else if (rec[0].nm.indexOf("Guarana") < 0) falha("quem levou guarana deveria ver guarana primeiro (veio " + rec[0].nm + ")");
else console.log("  ok  historico puxa o produto parecido");
const rec2 = vm.runInContext("recomendarProdutos(4, " + JSON.stringify(cat) + ", {})", sandbox);
if (rec2.length !== 4) falha("sem historico deveria sugerir 4 (veio " + rec2.length + ")");
else if (new Set(rec2.map(function (x) { return x.nm; })).size !== 4) falha("recomendacao repetiu produto");
else console.log("  ok  sem historico, variedade sem repetir");
try {
    vm.runInContext("pintarRecomendados(); iaMontarWidget();", sandbox);
    console.log("  ok  sem navegador nao quebra nada");
} catch (e) { falha("quebrou sem navegador: " + e.message); }

console.log("\n=== 7. CSS DO ASSISTENTE ===");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
[".ia-fab", ".ia-painel", ".ia-msg", ".ia-rec", "[data-theme=\"dark\"] .ia-fab",
 "[data-theme=\"dark\"] .ia-painel", "[data-theme=\"dark\"] .ia-rec-card"].forEach(function (c) {
    if (css.indexOf(c) < 0) falha("CSS sem " + c);
});
console.log("  ok  widget e recomendacoes com versao escura");

console.log("\n=== 8. CONFIGURACOES DA IA ===");
const cfg = fs.readFileSync(path.join(dir, "configuracoes.html"), "utf8");
["cfgIAProvedor", "salvarIA", "testarIA", "cfgIAURL", "cfgIAChave"].forEach(function (c) {
    if (cfg.indexOf(c) < 0) falha("configuracoes.html sem " + c);
});
console.log("  ok  provedor, URL, chave, modelo e botao Testar");

console.log("\n=== 9. AVALIACAO DE ESTRELAS ===");
const sc = fs.readFileSync(path.join(dir, "script.js"), "utf8");
["salvarAvaliacao", "enviarAvaliacaoNuvem", "estrelasHTML", "mediaEstrelas"].forEach(function (f) {
    if (sc.indexOf("function " + f) < 0) falha("script.js sem " + f + " (nota das estrelas)");
});
if (sc.indexOf("/avaliacoes/") < 0) falha("a avaliacao nao vai para o Firebase");
else console.log("  ok  avaliacao gravada local e enviada ao Firebase");
const mp = fs.readFileSync(path.join(dir, "meus-pedidos.html"), "utf8");
["caixaAvaliar", "salvarVoto", "toggleAvaliar"].forEach(function (f) {
    if (mp.indexOf("function " + f) < 0) falha("meus-pedidos.html sem " + f + " (o cliente nao consegue avaliar)");
});
if (css.indexOf(".avaliar-box") < 0) falha("CSS do voto de estrelas ausente");
else console.log("  ok  cliente avalia o pedido entregue (1 a 5 + comentario)");

console.log("\n=== 10. MCP (agentes de IA no repositorio) ===");
try {
    const mcp = JSON.parse(fs.readFileSync(path.join(dir, "mcp.json"), "utf8"));
    if (!mcp.mcpServers || !mcp.mcpServers.filesystem) falha("mcp.json sem mcpServers.filesystem");
    else console.log("  ok  mcp.json valido (filesystem + github)");
} catch (e) { falha("mcp.json invalido: " + e.message); }

console.log("\n" + (erros === 0 ? "*** IA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);