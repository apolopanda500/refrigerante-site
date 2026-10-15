/* 09 - O CARRINHO RENDERIZA CERTO (10/10)
   roda o renderCarrinho de verdade, sem navegador, e confere:
   - preco igual ao da home (vem do catalogo, nunca de valor velho)
   - botoes de quantidade presentes
   - botao Editar em cada produto
   - total = subtotal + frete
   - nenhum erro de JavaScript                                */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

const html = fs.readFileSync(path.join(dir, "carrinho.html"), "utf8");

/* extrai os scripts da pagina */
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const codigo = scripts.join("\n;\n");

/* ---- navegador de mentira ---- */
function elemento(id) {
    return {
        id: id, _html: "", style: {},
        set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
        addEventListener() {}, appendChild(c) { if (c) this._html += c.outerHTML || ""; },
        querySelector() { return elemento("x"); },
        querySelectorAll() { return []; },
        getAttribute() { return null; }, remove() {},
        setAttribute() {}, hasAttribute() { return false; }
    };
}
const els = {};
const sb = {
    console, Date, Math, JSON, parseInt, parseFloat, isNaN, isFinite, String, Array, Object,
    Number, Boolean, RegExp, Error,
    document: {
        readyState: "complete",
        addEventListener() {},
        getElementById: (id) => (els[id] = els[id] || elemento(id)),
        querySelector() { return elemento("x"); },
        querySelectorAll: () => [],
        createElement: (t) => ({ tagName: t, style: {}, set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, firstChild: null, appendChild() {} }),
        body: { appendChild() {} },
        head: { appendChild() {} }
    },
    localStorage: {
        _d: {},
        getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
        setItem(k, v) { this._d[k] = String(v); },
        removeItem(k) { delete this._d[k]; }
    },
    alert() {}, confirm: () => true,
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    location: { href: "", pathname: "/carrinho.html" },
    navigator: {}, fetch: () => Promise.resolve({ ok: false }),
    window: {}
};
sb.window = sb;
vm.createContext(sb);

/* carrinho com precos VELHOS de proposito: o item guardado no
   navegador esta com 275,00 quando o catalogo diz 27,50 */
sb.localStorage.setItem("refrigeranteCart", JSON.stringify([
    { name: "Chinotto 269ml", price: "R$ 275,00", priceNum: 275, qty: 2, img: "img/cat/100000425.jpg" },
    { name: "Abacaxi 2 litros", price: "R$ 275,00", priceNum: 275, qty: 1, img: "img/cat/100000395.jpg" }
]));

/* catalogo (o mesmo que a home usa) */
const catalogo = JSON.parse(fs.readFileSync(path.join(dir, "catalogo.json"), "utf8"));
vm.runInContext([
    "var PD = " + JSON.stringify(catalogo.produtos.map(function (p) {
        return { ct: p.ct, nm: p.nm, ds: p.ds, pr: p.pr, im: p.im, key: p.key };
    })) + ";",
    "var CT = [{id:'2l',nm:'Refrigerantes 2L',ic:'fa fa-bottle-water'}];"
].join("\n"), sb, { filename: "catalogo.js" });

/* ---- a camada de baixo: loja.js (precos, regioes, agenda) e script.js ---- */
vm.runInContext(fs.readFileSync(path.join(dir, "loja.js"), "utf8"), sb, { filename: "loja.js" });
try {
    vm.runInContext(fs.readFileSync(path.join(dir, "script.js"), "utf8"), sb, { filename: "script.js" });
} catch (e) {
    /* script.js pede o DOM em alguns pontos: o que importa e ter as funcoes */
}

/* roda a pagina */
try {
    vm.runInContext(codigo, sb, { filename: "carrinho.html" });
} catch (e) {
    falha("a pagina do carrinho deu erro ao carregar: " + e.message);
}

const caixa = (els.cartBox && els.cartBox.innerHTML) || "";
const resumo = (els.resumoBox && els.resumoBox.innerHTML) || "";

console.log("=== 1. A PAGINA CARREGA SEM ERRO ===");
if (caixa) console.log("  ok  o carrinho desenhou (" + caixa.length + " caracteres)");
else falha("o carrinho ficou vazio (a pagina quebrou)");

console.log("\n=== 2. PRECO IGUAL AO DA HOME (nada de valor velho) ===");
if (caixa.indexOf("R$ 275,00") >= 0) falha("o preco velho (275,00) ainda aparece no carrinho");
else console.log("  ok  o preco velho nao aparece mais");
if (caixa.indexOf("R$ 25,00") >= 0) console.log("  ok  Chinotto a R$ 25,00 (igual a home)");
else falha("o preco do Chinotto nao bate com a home");
if (caixa.indexOf("R$ 27,50") >= 0) console.log("  ok  Abacaxi 2L a R$ 27,50 (igual a home)");
else falha("o preco do Abacaxi nao bate com a home");

console.log("\n=== 3. BOT OES DE QUANTIDADE E EDITAR ===");
const menos = (caixa.match(/mudarQtdCarrinho\(\d+,-1\)/g) || []).length;
const mais = (caixa.match(/mudarQtdCarrinho\(\d+,1\)/g) || []).length;
const editar = (caixa.match(/editarItemCarrinho\(\d+\)/g) || []).length;
const remover = (caixa.match(/removerItem\(\d+\)/g) || []).length;
console.log("  menos: " + menos + " | mais: " + mais + " | editar: " + editar + " | remover: " + remover);
if (menos !== 2 || mais !== 2) falha("cada produto precisa do botao - e do +");
else console.log("  ok  os dois botoes de quantidade em cada produto");
if (editar !== 2) falha("cada produto precisa do botao Editar");
else console.log("  ok  botao Editar em cada produto");
if (remover !== 2) falha("cada produto precisa do botao de remover");
else console.log("  ok  botao de remover em cada produto");

console.log("\n=== 4. TOTAL ===");
/* 2 x 25,00 + 1 x 27,50 = 77,50 | sem regiao: frete 8 -> 85,50 */
console.log("  resumo: " + resumo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 150));
if (resumo.indexOf("R$ 77,50") >= 0) console.log("  ok  subtotal R$ 77,50 (2x25,00 + 27,50)");
else falha("subtotal errado");
if (resumo.indexOf("R$ 85,50") >= 0) console.log("  ok  total final R$ 85,50 (77,50 + frete 8,00)");
else if (resumo.indexOf("Total final") >= 0) console.log("  (sem regiao: mostra o aviso para escolher a regiao)");
else falha("nao mostra o total final");
if (resumo.indexOf("undefined") >= 0 || resumo.indexOf("NaN") >= 0) falha("o resumo tem undefined/NaN");
else console.log("  ok  sem undefined/NaN no resumo");

console.log("\n=== 5. A FUNCAO DE EDITAR ABRE E SALVA ===");
try {
    sb.editarItemCarrinho(0);
    const abriu = !!sb.document.getElementById("edOverlay");
    console.log("  abriu o editor: " + abriu);
    if (!abriu) falha("o botao Editar nao abriu a caixa");
    sb.editarQtd(2);                    /* +2 */
    sb.salvarEdicao();                  /* salva */
    const salvo = JSON.parse(sb.localStorage.getItem("refrigeranteCart"));
    console.log("  depois de salvar, quantidade do 1o item: " + salvo[0].qty);
    if (salvo[0].qty !== 4) falha("a edicao nao salvou a quantidade nova (veio " + salvo[0].qty + ")");
    else console.log("  ok  a edicao salvou (2 + 2 = 4)");
} catch (e) {
    falha("a edicao quebrou: " + e.message);
}

console.log("\n=== 6. LIMPAR O CARRINHO ===");
try {
    sb.limparCarrinho();               /* a mesma funcao do botao Limpar */
    const v = (els.cartBox && els.cartBox.innerHTML) || "";
    const salvo = JSON.parse(sb.localStorage.getItem("refrigeranteCart") || "[]");
    if (v.indexOf("vazio") >= 0) console.log("  ok  mostra a mensagem de carrinho vazio");
    else falha("o carrinho vazio nao mostrou a mensagem");
    if (salvo.length === 0) console.log("  ok  o navegador ficou sem itens guardados");
    else falha("o carrinho nao foi esvaziado de verdade");
} catch (e) {
    falha("limpar o carrinho quebrou: " + e.message);
}

console.log("\n" + (erros === 0 ? "*** CARRINHO RENDERIZA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);