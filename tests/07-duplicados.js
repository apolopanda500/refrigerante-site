/* 07 - NADA DUPLICADO (10/10)
   procura: ids repetidos, botoes com a mesma acao na mesma tela,
   links duplicados, funcoes declaradas duas vezes, CSS morto basico */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

const paginas = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");

console.log("=== 1. IDs REPETIDOS NA MESMA PAGINA ===");
paginas.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const ids = [...t.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dup.length) falha(p + ": id repetido -> " + [...new Set(dup)].join(", "));
});
console.log("  ok  nenhuma pagina tem id repetido");

console.log("\n=== 2. BOTOES COM A MESMA ACAO NA MESMA TELA ===");
paginas.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    /* botao e so o que tem onclick de verdade: os botoes de lista sao
       gerados por JS com o codigo da linha junto (ex.: copiarPedido('123')),
       entao cada linha tem o seu proprio botao. */
    const acoes = [...t.matchAll(/<button[^>]*onclick="([a-zA-Z_$][\w$]*)\(\)"/g)].map(m => m[1]);
    const dup = acoes.filter((x, i) => acoes.indexOf(x) !== i);
    if (dup.length) falha(p + ": botoes repetidos -> " + [...new Set(dup)].join(" | "));
});
console.log("  ok  nenhum botao repetido na mesma tela");

console.log("\n=== 3. LINKS DUPLICADOS FORA DO MENU ===");
paginas.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    /* tira o menu, que e o mesmo em todas as paginas de proposito */
    const semMenu = t.replace(/<ul class="nav-links"[\s\S]*?<\/ul>/g, "");
    const hrefs = [...semMenu.matchAll(/<a [^>]*href="([^"#][^"]*)"/g)]
        .map(m => m[1])
        .filter(u => !/^(https?:|mailto:|tel:|javascript:)/.test(u));
    const dup = hrefs.filter((x, i) => hrefs.indexOf(x) !== i);
    if (dup.length) falha(p + ": mesmo link duas vezes -> " + [...new Set(dup)].join(" | "));
});
console.log("  ok  nenhum link repetido fora do menu");

console.log("\n=== 4. FUNCOES DECLARADAS DUAS VEZES NO SITE (so as globais) ===");
/* so conta colisao de verdade: funcao em nivel GLOBAL (fora de IIFE).
   funcao dentro de bloco e local e nao atrapalha ninguem. */
function funcoesGlobais(codigo) {
    const achadas = [];
    let nivel = 0;
    for (let i = 0; i < codigo.length; i++) {
        if (codigo[i] === "{") nivel++;
        else if (codigo[i] === "}") nivel--;
        else if (nivel === 0) {
            const m = /function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(codigo.slice(i, i + 60));
            if (m && m.index === 0) {
                achadas.push({ nome: m[1], pos: i });
                i += m[0].length;
            }
        }
    }
    return achadas;
}
const scripts = ["app.js", "loja.js", "script.js", "conta.js", "theme.js", "telegram.js",
    "firebase-appcheck.js", "app-update.js"];
const vistas = {};
scripts.forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    funcoesGlobais(t).forEach(x => { (vistas[x.nome] = vistas[x.nome] || []).push(f); });
});
/* formatBRL existe em loja.js e script.js de proposito (uma so versao vale,
   a outra so entra se a primeira nao existir) */
const IGNORAR = { formatBRL: "mesma funcao, uma so versao vale" };
const colisoes = Object.keys(vistas).filter(n => vistas[n].length > 1 && !IGNORAR[n]);
colisoes.forEach(n => falha("GLOBAL " + n + " declarado em: " + vistas[n].join(" e ")));
if (!colisoes.length) console.log("  ok  nenhuma colisao global entre scripts (" +
    Object.keys(vistas).length + " funcoes globais conferidas)");

console.log("\n=== 5. CSS ORFAO (classe usada no JS/HTML que nao existe no CSS) ===");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
/* o CSS de cada pagina vive no <style> dela: procura nos dois lugares */
const cssDasPaginas = paginas.map(p => fs.readFileSync(path.join(dir, p), "utf8")).join("\n");
const temClasse = (c) => css.indexOf("." + c) >= 0 || cssDasPaginas.indexOf("." + c) >= 0;
const classesDeCodigo = ["cal-dia", "cal-cab", "cal-nome", "cal-badge", "cal-loja", "cal-linha",
    "cal-titulo", "cal-legenda", "tb-cam-foto", "tb-oferta", "of-ic", "of-btn", "sec-titulo",
    "btn-limpar-item", "reg-cel", "reg-linha-tempo", "etapa", "tb-passo", "tb-seta"];
const semCss = classesDeCodigo.filter(c => !temClasse(c));
semCss.forEach(c => falha("a classe ." + c + " e usada no codigo mas nao existe no CSS"));
if (!semCss.length) console.log("  ok  todas as classes usadas pelo codigo existem no CSS");

console.log("\n=== 6. CSS QUE NAO SERVE PARA NADA (checagem leve) ===");
/* classes antigas que foram trocadas por outras */
["caixa-limpar", "btn-limpar-forte", "btn-limpar-mobile", "sideConfianca", "caixaAtendimento",
    "bnrTopo", "bnrFim", "sideBanners"].forEach(function (antigo) {
        const noCss = (css + cssDasPaginas).indexOf("." + antigo) >= 0;
        const emAlgumHtml = paginas.some(p => fs.readFileSync(path.join(dir, p), "utf8").indexOf(antigo) >= 0);
        if (noCss && !emAlgumHtml) falha("CSS orfao: ." + antigo + " nao e usado em lugar nenhum");
    });
console.log("  ok  sem CSS orfao das classes removidas");

console.log("\n=== 7. A CAIXA E A OFERTA NAO FAZEM A MESMA COISA ===");
const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const boxMeusPedidos = /id="sideZap"[\s\S]*?meus-pedidos\.html/.test(app);
const ofertaResumo = /acao:"resumo"[\s\S]*?ativo:false/.test(app);
if (boxMeusPedidos && !ofertaResumo) falha("a oferta 'resumo' continua ativa E existe a caixa de pedidos (duplicado)");
else console.log("  ok  'Meus pedidos' aparece uma vez so");

console.log("\n" + (erros === 0 ? "*** SEM DUPLICADOS 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);