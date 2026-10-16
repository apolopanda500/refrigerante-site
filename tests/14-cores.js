/* 14 - CORES (10/10)
   Toda cor do projeto passa por aqui: contraste do texto com o fundo
   (regra do WCAG), texto que nao depende so da cor, cores do painel,
   versao escura e as variaveis do tema. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");
const C = require("./lib/cor.js");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

/* junta o style.css com o <style> de cada pagina (o painel tem o dele) */
const cssGeral = [fs.readFileSync(path.join(dir, "style.css"), "utf8")];
const paginas = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");
paginas.forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    t.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, function (todo, css) {
        cssGeral.push({ arquivo: f, css: css });
        return todo;
    });
});
const css = cssGeral.map(b => typeof b === "string" ? b : b.css).join("\n");
const mapa = C.variaveisDe(css);

console.log("=== 1. AS CORES DO TEMA EXISTEM E SAO VALIDAS ===");
const usadas = new Set(C.coresDo(css));
const variaveisTexto = Object.keys(mapa).filter(k => k.indexOf("--") >= 0 && k.indexOf("rgba") < 0);
let coresRuins = 0;
variaveisTexto.forEach(function (chave) {
    const valor = mapa[chave];
    if (ehHex(valor)) return;
    if (/^(#|rgb|hsl)/i.test(valor)) { if (!C.paraRgb(valor)) { falha("cor invalida em " + chave + ": " + valor); coresRuins++; } return; }
    if (C.ehVariavel(valor)) return;
    if (/^[a-z]+$/i.test(valor)) return;            /* nome de cor (white, black...) */
});
function ehHex(v) { return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(String(v).trim()); }
if (!coresRuins) ok(mapa && usadas.size >= 10 ? usadas.size + " cores usadas, todas em formato valido" : "poucas cores no projeto");
["--primary-color", "--text-color", "--borda"].forEach(function (v) {
    if (mapa[":root " + v] === undefined) falha("falta a variavel de cor " + v + " no :root");
});
ok("variaveis de cor do tema presentes");

console.log("\n=== 2. CONTRASTE DO TEXTO COM O FUNDO (regra do WCAG) ===");
/* texto sobre fundo que da para medir: as combinacoes que o projeto usa */
const combina = [
    ["texto normal na pagina", "var(--text-color)", "var(--bg-body)"],
    ["texto normal no card", "var(--text-color)", "var(--bg-alt)"],
    ["titulo e preco", "var(--primary-color)", "var(--bg-body)"],
    ["texto secundario", "var(--text-muted)", "var(--bg-body)"],
    ["botao principal (branco no roxo)", "#ffffff", "var(--primary-color)"],
    ["botao de aviso (roxo no amarelo)", "#3d4465", "var(--accent-color)"],
    ["aviso de pedido novo (branco no verde)", "#ffffff", "#1b7f3b"],
    ["botao do WhatsApp da home (branco no verde)", "#ffffff", "#0e6b4f"],
    ["botao do WhatsApp do painel (branco no verde)", "#ffffff", "#0e6b4f"],
    ["botao de confirmar do carrinho (branco no verde)", "#ffffff", "#0b6b3a"],
["botao enviar tema guara", "#ffffff", "#0b6b3a"],
    ["botao enviar tema rosa", "#ffffff", "#c2185b"]
];

const minimo = 4.5;            /* WCAG AA para texto normal */
let ruins = 0;
combina.forEach(function (c) {
    const texto = C.resolver(c[1], mapa, ":root");
    const fundo = C.resolver(c[2], mapa, ":root");
    const t = C.paraRgb(texto), f = C.paraRgb(fundo);
    if (!t || !f) { falha("nao deu para medir o contraste de " + c[0] + " (" + c[1] + " em " + c[2] + ")"); return; }
    const r = C.contraste(t, f);
    if (r < minimo) { falha("contraste baixo em " + c[0] + ": " + r.toFixed(2) + ":1 (minimo " + minimo + ":1)"); ruins++; }
    else ok(c[0] + " = " + r.toFixed(1) + ":1");
});
if (!ruins) ok("todas as combinacoes passam em " + minimo + ":1");

console.log("\n=== 2b. AS MESMAS CORES NO TEMA ESCURO ===");
/* Regressao: o verde/red/ambar de "deu certo", "deu ruim" e "atencao" eram
   fixos (#2e7d32, #c62828, #8a6100) e no fundo escuro ficavam em ~3:1 -
   o cliente lia a frase e a frase sumia. Agora sao variaveis de tema. */
const escuro = "[data-theme=\"dark\"]";
const statusCor = [
    ["verde de sucesso", "--texto-ok", "--bg-alt"],
    ["vermelho de erro", "--texto-erro", "--bg-alt"],
    ["ambar de atencao", "--texto-aviso", "--bg-alt"],
    ["verde no card", "--texto-ok", "--light-bg"],
    ["verde na faixa de fundo", "--texto-ok", "--texto-ok-fundo"],
    ["vermelho na faixa de fundo", "--texto-erro", "--texto-erro-fundo"],
    ["ambar na faixa de fundo", "--texto-aviso", "--texto-aviso-fundo"]
];
let ruinsEscuro = 0;
statusCor.forEach(function (c) {
    const vt = mapa[":root " + c[1]], ve = mapa[escuro + " " + c[1]];
    if (!vt || !ve) { falha(c[1] + " sem versao clara/escura (falta no :root ou no tema escuro)"); ruinsEscuro++; return; }
    const vf = mapa[escuro + " " + c[2]] || mapa[":root " + c[2]];
    if (!vf) { falha("fundo " + c[2] + " nao encontrado"); ruinsEscuro++; return; }
    const r = C.contraste(C.paraRgb(ve), C.paraRgb(vf));
    if (r < minimo) { falha(c[0] + " no tema escuro = " + r.toFixed(2) + ":1 (minimo " + minimo + ":1)"); ruinsEscuro++; }
    else ok(c[0] + " no escuro = " + r.toFixed(1) + ":1");
});
/* nenhuma pagina pode gravar a cor antiga na mao (some no escuro de novo) */
const coresFixas = [];
paginas.concat(["app.js", "telegram.js"]).forEach(function (f) {
    const txt = fs.readFileSync(path.join(dir, f), "utf8");
    ["#2e7d32", "#c62828", "#8a6100"].forEach(function (cor) {
        const re = new RegExp("color\\s*:\\s*" + cor + "|color\\s*=\\s*['\"]" + cor
            + "|,\\s*['\"]" + cor + "['\"]\\s*\\)", "i");
        txt.split("\n").forEach(function (l, i) {
            /* so incomoda quando a cor e de TEXTO: nao background/border */
            if (re.test(l)) coresFixas.push(f + ":" + (i + 1));
        });
    });
});
if (!coresFixas.length) ok("nenhuma pagina grava verde/vermelho/ambar fixo como texto (usam var(--texto-*))");
else falha(coresFixas.length + " cor(es) de texto ainda fixas (sumem no tema escuro): " + coresFixas.slice(0, 4).join(", "));
console.log("\n=== 3. TEXTO CLARO SO NO FUNDO CLARO (tema escuro nao vaza) ===");
/* cor de texto em bloco com fundo da MESMA regra: se os dois se escondem
   um no outro, o texto some. Cor com transparencia (rgba) nao conta:
   o fundo real depende do que esta atras. */
const blocos = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)];
let textoSumindo = 0;
blocos.forEach(function (m) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!sel || sel.charAt(0) === "@") return;
    const corpo = m[2];
    const mc = corpo.match(/(^|;)\s*color\s*:\s*([^;]+)/i);
    const mf = corpo.match(/(^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
    if (!mc || !mf) return;
    const brutoT = mc[2].trim(), brutoF = mf[2].trim();
    if (/rgba?\([^)]*,\s*0?\.\d+\s*\)/i.test(brutoF) || C.ehVariavel(brutoF)) return;
    const ct = C.paraRgb(C.resolver(brutoT, mapa, ":root"));
    const cf = C.paraRgb(C.resolver(brutoF, mapa, ":root"));
    if (!ct || !cf) return;
    const r = C.contraste(ct, cf);
    if (r < 2.2) {
        textoSumindo++;
        if (textoSumindo <= 3) falha("texto e fundo com contraste de " + r.toFixed(2) + ":1 em " + sel.replace(/\s+/g, " ").slice(0, 70));
    }
});
if (!textoSumindo) ok("nenhum texto some no proprio fundo (todas as regras com cor+fundo passam)");

console.log("\n=== 4. A INFORMACAO NAO DEPENDE SO DA COR ===");
/* status do pedido: tem que ter palavra/icone, nunca so uma bolinha colorida */
const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const loja = fs.readFileSync(path.join(dir, "loja.js"), "utf8");
const admin = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
if (/STATUS_LABEL/.test(app) || /STATUS_LABEL/.test(admin)) ok("status do pedido vem com palavra (STATUS_LABEL), nao so com cor");
else falha("status do pedido parece depender so da cor: precisa de texto junto");
if (/fa-circle|fa-check|fa-times|fa-truck/.test(app + admin)) ok("os status tem icone alem da cor");
else falha("nenhum icone nos status: quem nao distingue cor precisa de icone");
/* nota "GRATIS" precisa de palavra, e tem */
if (/GRÁTIS|GRATIS/.test(admin + app + loja)) ok("frete zero aparece escrito (GRATIS), nao so com cor");
else falha("frete zero sem aviso escrito");

console.log("\n=== 5. O PAINEL DO VENDEDOR TAMBEM TEM COR CORRETA ===");
const painel = paginas.filter(f => f === "admin.html")[0];
if (!painel) falha("admin.html sumiu do projeto");
else {
    const tPainel = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
    /* cabecalho branco sobre o roxo do painel */
    const roxo = C.paraRgb("#3d4465");
    if (C.contraste(C.paraRgb("#ffffff"), roxo) >= minimo) ok("texto branco no cabecalho do painel = " + C.contraste(C.paraRgb("#ffffff"), roxo).toFixed(1) + ":1");
    else falha("texto branco no cabecalho do painel com contraste baixo");
    /* toda cor do painel tem versao escura */
    const escurece = (tPainel.match(/\[data-theme="dark"\]/g) || []).length;
    if (escurece >= 8) ok("painel com " + escurece + " regras de tema escuro");
    else falha("painel com pouca versao escura (" + escurece + ")");
    /* cores do painel nao sao as mesmas do cliente */
    if (!/--primary-color\s*:\s*#3d4465/.test(tPainel)) ok("o painel tem a propria paleta (nao muda a do cliente)");
    else falha("o painel esta redefinindo a paleta global do cliente");
}

console.log("\n=== 6. MODO ALTO CONTRASTE ===");
const alto = (css.match(/\[data-contraste="alto"\]/g) || []).length;
if (alto >= 4) ok("alto contraste com " + alto + " regras (borda grossa e texto forte)");
else falha("quase sem regra de alto contraste (" + alto + ")");

console.log("\n=== 7. NENHUM LETRAIREIRO (tela sem cor para daltônico) ===");
/* link precisa de sinal alem da cor: sublinhado, borda, icone ou negrito.
   aqui olhamos so o seletor que e o link puro (a, a:visited, ...) */
const regrasLink = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "");
    return sel.split(",").some(s => /^\s*a(:|\s|$)/.test(s.trim()));
});
const semSinal = regrasLink.filter(function (m) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (/a:hover|a:focus|a:active|a:visited/.test(sel)) return false;
    return /color\s*:/.test(m[2]) && !/text-decoration|border-bottom|font-weight:\s*(bold|[6789]00)/.test(m[2]);
});
if (!semSinal.length) ok("nenhum link depende so da cor (tem sublinhado, borda ou negrito)");
else falha(semSinal.length + " link(s) com cor e sem nenhum sinal alem da cor: " + semSinal.slice(0, 2)
    .map(m => m[1].replace(/\s+/g, " ").trim().slice(0, 40)).join(" | "));

console.log("\n" + (erros === 0 ? "*** CORES 10/10 ***" : "*** " + erros + " ERRO(S) DE COR ***"));
process.exit(erros ? 1 : 0);
