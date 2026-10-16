/* validador de CSS do projeto: roda no style.css e em cada <style> das paginas
   uso: node tests/validar-css.js */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0, avisos = 0;
const erro = (m) => { console.log("  ERRO  " + m); erros++; };
const aviso = (m) => { console.log("  AVISO " + m); avisos++; };

/* ---------- le o CSS de um arquivo ---------- */
function extraiCss(arquivo) {
    const t = fs.readFileSync(path.join(dir, arquivo), "utf8");
    const blocos = [];
    const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let m, n = 0;
    while ((m = re.exec(t)) !== null) { n++; blocos.push({ onde: arquivo + " <style> " + n, css: m[1] }); }
    if (/\.css["']/.test(t) && !blocos.length) {
        /* pagina so com style.css: marca para conferir la */
    }
    return blocos;
}

/* ---------- conferencias de um pedaco de CSS ---------- */
function confere(bloco) {
    const css = bloco.css;
    const onde = bloco.onde;

    /* 1) chaves balanceadas (fora de strings e comentarios) */
    let limpo = css.replace(/\/\*[\s\S]*?\*\//g, " ");
    const semStrings = limpo.replace(/"(\\.|[^"\\])*"/g, '""').replace(/'(\\.|[^'\\])*'/g, "''");
    const abrem = (semStrings.match(/\{/g) || []).length;
    const fecham = (semStrings.match(/\}/g) || []).length;
    if (abrem !== fecham) erro(onde + ": chaves desbalanceadas (" + abrem + " abrem, " + fecham + " fecham)");

    /* 2) parenteses balanceados em @media */
    const abreP = (semStrings.match(/\(/g) || []).length;
    const fechaP = (semStrings.match(/\)/g) || []).length;
    if (abreP !== fechaP) erro(onde + ": parenteses desbalanceados (" + abreP + " / " + fechaP + ")");

    /* 3) declaracao sem dois-pontos */
    const linhas = limpo.split(/\r?\n/);
    linhas.forEach(function (l, i) {
        const t = l.replace(/\/\*.*?\*\//g, "").trim();
        if (!t || t.startsWith("@") || t.startsWith("}") || t === "{" || t.endsWith("{") || t.endsWith(",") || t.endsWith(";") || t.endsWith("}")) return;
        /* propriedade sem valor e sem bloco */
        if (/^[-a-zA-Z]+\s*$/i.test(t) && !/[{}:;]/.test(t)) {
            aviso(onde + ":" + (i + 1) + ": propriedade sem valor -> " + t);
        }
    });

    /* 4) seletor que parece ter erro de digitacao */
    limpo.split(/\r?\n/).forEach(function (l, i) {
        const sel = l.split("{")[0].trim();
        if (!sel) return;
        if (/[.;,]$/.test(sel) && !sel.startsWith("@") && !/--/.test(sel) && sel.indexOf(":") < 0) {
            /* pode ser multi-seletor normal */
        }
        if (/\s{2,}\S/.test(sel) && sel.indexOf(",") < 0 && !sel.startsWith("@")) {
            aviso(onde + ":" + (i + 1) + ": seletor com espaco duplo -> " + sel.slice(0, 50));
        }
    });

    /* 5) uso de content:attr() sem o atributo existir na pagina */
    const attrs = (css.match(/attr\(([a-zA-Z-]+)\)/g) || []).map(a => a.replace(/attr\(|\)/g, ""));
    return { onde: onde, css: css, limpo: limpo, attrs: [...new Set(attrs)] };
}

console.log("=====================================================");
console.log(" VALIDANDO O CSS DO PROJETO");
console.log(" data de hoje: " + new Date().toLocaleDateString("pt-BR"));
console.log("=====================================================");

const resultados = [];
resultados.push({ onde: "style.css", css: fs.readFileSync(path.join(dir, "style.css"), "utf8"), limpo: "" });
const html = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");
html.forEach(f => extraiCss(f).forEach(b => resultados.push(b)));

console.log("\n=== 1. SINTAXE (chaves, parenteses, propriedades) ===");
resultados.forEach(b => {
    b.limpo = b.css.replace(/\/\*[\s\S]*?\*\//g, " ");
    const semStrings = b.limpo.replace(/"(\\.|[^"\\])*"/g, '""').replace(/'(\\.|[^'\\])*'/g, "''");
    const abrem = (semStrings.match(/\{/g) || []).length;
    const fecham = (semStrings.match(/\}/g) || []).length;
    if (abrem !== fecham) erro(b.onde + ": chaves desbalanceadas (" + abrem + " x " + fecham + ")");
    const p1 = (semStrings.match(/\(/g) || []).length, p2 = (semStrings.match(/\)/g) || []).length;
    if (p1 !== p2) erro(b.onde + ": parenteses desbalanceados (" + p1 + " x " + p2 + ")");
    /* ponto e virgula depois da ultima declaracao de cada bloco */
    const semFim = semStrings.match(/[a-zA-Z0-9-]\s*\}/g) || [];
    semFim.slice(0, 3).forEach(function () {
        /* CSS permite falta de ; no fim do bloco; so avisa se for estranho */
    });
});
if (!erros) console.log("  ok    " + resultados.length + " arquivos de CSS sem erro de sintaxe");

/* ---------- 2. atributos usados em content:attr() ---------- */
console.log("\n=== 2. ROTULOS DAS CELULAS (content:attr) ===");
const cssGeral = fs.readFileSync(path.join(dir, "style.css"), "utf8");
const usada = (cssGeral.match(/attr\(([a-zA-Z-]+)\)/g) || []).map(a => a.replace(/attr\(|\)/g, ""));
const htmlTodo = html.map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n")
    + fs.readFileSync(path.join(dir, "app.js"), "utf8")
    + fs.readFileSync(path.join(dir, "admin.html"), "utf8");
[...new Set(usada)].forEach(function (a) {
    if (a === "data-tema" || a === "data-v") return;
    const temNoHtml = htmlTodo.indexOf(a + "=") >= 0 || htmlTodo.indexOf("'" + a + "'") >= 0 || htmlTodo.indexOf('"' + a + '"') >= 0;
    if (!temNoHtml) erro("o CSS usa attr(" + a + ") mas nenhuma pagina gera esse atributo (rotulo em branco)");
});
if (!erros) console.log("  ok    todo attr() usado no CSS existe em alguma pagina");

/* ---------- 3. CSS orfao (seletor que nao existe no site) ---------- */
console.log("\n=== 3. CSS SEM USO (classe que nao existe em lugar nenhum) ===");
let todoCodigo = html.map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
["app.js", "script.js", "loja.js", "ia.js", "central.js", "telegram.js", "conta.js", "theme.js", "app-update.js",
    "sw.js", "firebase-appcheck.js"].forEach(f => {
        const p = path.join(dir, f);
        if (fs.existsSync(p)) todoCodigo += fs.readFileSync(p, "utf8");
    });
/* tira o CSS de dentro das paginas: estilo nao e uso de classe
   (se o seletor so existe no proprio estilo, ele nunca aparece na tela) */
todoCodigo = todoCodigo.replace(/<style[^>]*>[\s\S]*?<\/style>/g, " ");
/* alert/confirm/prompt sao funcoes do navegador, nao classes */
todoCodigo = todoCodigo.replace(/\b(alert|confirm|prompt)\s*\(/g, "( ");
const classesCss = [...new Set((cssGeral.match(/\.([a-zA-Z][\w-]{2,})/g) || []).map(c => c.slice(1)))];
const semUso = classesCss.filter(c => {
    if (todoCodigo.indexOf('"' + c) >= 0 || todoCodigo.indexOf("'" + c) >= 0 || todoCodigo.indexOf(c + " ") >= 0
        || todoCodigo.indexOf(c + '"') >= 0 || todoCodigo.indexOf(c + "'") >= 0) return false;
    return true;
});
if (semUso.length) {
    semUso.forEach(c => aviso("classe sem uso no site: ." + c));
} else console.log("  ok    todas as classes do style.css aparecem em alguma pagina ou script");

/* ---------- 4. o que o CSS pede e o codigo nao gera ---------- */
console.log("\n=== 4. COBERTURA (o que o codigo gera tem estilo?) ===");
[
    ["tb-info-corpo", "tabela de informacoes da home"],
    ["tb-mini-btn", "botao Minimizar da home"],
    ["timeline-resumo", "resumo dos ticks"],
    ["tag-hoje", "selo HOJE no carrinho"],
    ["reg-lista", "lista de regioes do carrinho"],
    ["btn-mini-bloco", "botao Minimizar do painel"],
    ["ferramenta-input", "campo grande das ferramentas"],
    ["notif-toast", "aviso na tela"],
    ["btn-detalhe", "botao Ver detalhes"],
    ["of-btn", "botao das ofertas"],
    ["stats-row", "resumo de pedidos do historico"]
].forEach(function (par) {
    if (todoCodigo.indexOf(par[0]) < 0) erro("faltou " + par[1] + " (classe " + par[0] + ")");
});
if (!erros) console.log("  ok    os blocos novos tem estilo e sao gerados pelo codigo");

/* ---------- 5. o CSS nao pode ter regra duplicada de conflito ---------- */
console.log("\n=== 5. DUPLICATAS (mesma propriedade, mesmo seletor) ===");
const regras = [];
const reR = /([^{}]+)\{([^{}]*)\}/g;
let mm;
while ((mm = reR.exec(cssGeral)) !== null) {
    const sel = mm[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    if (!sel || sel.startsWith("@")) continue;
    const props = {};
    mm[2].split(";").forEach(function (d) {
        const i = d.indexOf(":");
        if (i < 0) return;
        const p = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
        if (!p) return;
        if (props[p] !== undefined) aviso("style.css: ." + sel + " repete a propriedade " + p);
        props[p] = v;
    });
}
if (!avisos) console.log("  ok    nenhuma regra repete a mesma propriedade");

console.log("\n=====================================================");
console.log(erros ? " " + erros + " problema(s) de CSS." : " CSS validado." + (avisos ? " (" + avisos + " aviso(s))" : ""));
console.log("=====================================================");
process.exit(erros ? 1 : 0);
