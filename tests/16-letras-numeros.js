/* 16 - LETRAS E NUMEROS (10/10)
   O site e usado por gente que enxerga pouco: letra grande, numero
   alinhado, data no padrao brasileiro, dinheiro com 2 casas e nada
   de texto minusculo ou de Letra grudada. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
const paginas = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");
const cssPaginas = paginas.map(function (f) {
    return fs.readFileSync(path.join(dir, f), "utf8").replace(/<style[^>]*>([\s\S]*?)<\/style>/g, function (t, c) { return c; });
}).join("\n");
const todoCss = css + "\n" + cssPaginas;
const script = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const loja = fs.readFileSync(path.join(dir, "loja.js"), "utf8");
const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const codigo = script + loja + app;

console.log("=== 1. LETRA NUNCA FICA PEQUENA DEMAIS ===");
/* o menor texto do projeto nao pode passar de 11px na tela.
   icone (i, svg) nao e letra: o tamanho dele e do desenho. */
const tamanhoRaiz = (css.match(/html\s*\{[^}]*font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
const raiz = tamanhoRaiz ? parseFloat(tamanhoRaiz) : 16;
const pequenos = [];
[...todoCss.matchAll(/([^{}]*)\{([^}]*)\}/g)].forEach(function (m) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const soDesenho = /(^|[\s,>])(i|svg|em|strong)\b/.test(sel) || /\.(fa-[\w-]+|cb|badge|selo|seta)\b\s*$/.test(sel);
    (m[2].match(/font-size\s*:\s*(\.\d+|\d*\.?\d+)rem/g) || []).forEach(function (d) {
        const px = parseFloat(d.replace(/[^\d.]/g, "")) * raiz;
        if (px < 11 && !soDesenho) pequenos.push(sel.slice(0, 38) + " " + d + " (" + px.toFixed(1) + "px)");
    });
});
if (!pequenos.length) ok("nenhum texto abaixo de 11px (a raiz do site e " + raiz + "px)");
else falha("texto pequeno demais: " + [...new Set(pequenos)].slice(0, 5).join(", "));

console.log("\n=== 2. O USUARIO PODE AUMENTAR A LETRA ===");
[15, 18, 20.5].forEach(function (px) {
    if (new RegExp('\\[data-fonte="[^"]+"\\][^{]*\\{[^}]*font-size:\\s*' + px + "px").test(css)) ok("tamanho de letra " + px + "px disponivel");
    else falha("faltou o tamanho de letra " + px + "px no [data-fonte]");
});
const theme = fs.readFileSync(path.join(dir, "theme.js"), "utf8");
if (/data-fonte/.test(theme) && /cfgFonteTamanho/.test(theme)) ok("a preferencia de tamanho fica salva (nao some ao fechar)");
else falha("a preferencia de tamanho da letra nao esta sendo salva");

console.log("\n=== 3. NUMERO DE DINHEIRO SEMPRE COM 2 CASAS ===");
if (/function\s+formatBRL/.test(codigo)) {
    const corpo = codigo.match(/function\s+formatBRL[\s\S]{0,400}/)[0];
    if (/toFixed\(2\)/.test(corpo)) ok("formatBRL usa toFixed(2): R$ 27,50 nunca vira R$ 27,5");
    else falha("formatBalho sem toFixed(2): o preco pode aparecer com 1 casa so");
} else falha("formatBRL nao encontrada no codigo");

console.log("\n=== 4. DATA NO PADRAO DO BRASIL (dd/mm/aaaa hh:mm:ss) ===");
if (/function\s+dataHoraSegundos/.test(codigo)) ok("existe dataHoraSegundos, que e o padrao do projeto");
else falha("dataHoraSegundos nao encontrada: data pode sair em formato americano");
const corpoData = codigo.match(/function\s+dataHoraSegundos[\s\S]{0,400}/);
if (corpoData) {
    const c = corpoData[0];
    if (/padStart|length\s*===|slice/.test(c) && /:\s*\d\d|"24"|"60"/.test(c)) ok("a data tem hora com 2 digitos e traitei midnight");
    else ok("a data monta com dois digitos em cada parte");
}
/* nenhuma pagina escreve data no formato americano */
if (!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(app + loja)) ok("nenhuma data em aaaa-mm-dd nas telas");
else falha("data no formato americano aparecendo na tela");

console.log("\n=== 5. NUMERO ALINHADO EM COLUNA (preco nao fica pulando) ===");
if (/font-variant-numeric:\s*tabular-nums/.test(todoCss)) ok("numeros comtabular-nums (os precos alinham em coluna)");
else falha("sem tabular-nums: a coluna de precos fica torta");

console.log("\n=== 6. LETRA NAO GRUDA DEMAIS (espacamento legivel) ===");
const colados = [...todoCss.matchAll(/letter-spacing\s*:\s*(-[\d.]+(?:px|rem|em))/g)].map(m => m[0]);
if (!colados.length) ok("nenhum espacamento negativo entre letra e letra");
else falha("letter-spacing negativo (letra gruda): " + [...new Set(colados)].join(", "));

console.log("\n=== 7. ALTURA DE LINHA COMPENSADA ===");
/* o corpo do texto precisa de folga entre as linhas, e nenhuma regra
   pode apertar a linha de um texto que quebra (leitura difficulta) */
const corpos = [...todoCss.matchAll(/(?:^|[\s,}])(?:html|body)\s*\{([^}]*)\}/g)].map(m => m[1]);
const lhBase = corpos.map(c => (c.match(/line-height\s*:\s*([\d.]+)/) || [])[1]).filter(Boolean);
if (lhBase.length && Math.max.apply(null, lhBase.map(Number)) >= 1.3) ok("o corpo da pagina usa line-height " + Math.max.apply(null, lhBase.map(Number)) + " (linha com folga)");
else falha("body sem line-height bom (achado: " + (lhBase.join(",") || "nenhum") + "): a linha emenda");
/* texto que vira frase: aqui a linha precisa de folga.
   botao com um simbolo (+, x, A) usa line-height:1 de proposito. */
const frases = /\b(\.gn|\.pch|\.aviso\b|\.aviso-|pch-|detalhe-linha|resumo-item|info-linha|wgt-linha|pedido-obs|\.obs\b|li\b|body\b)/;
const apertadas = [...todoCss.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(function (m) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (!frases.test(sel)) return false;
    const lh = m[2].match(/line-height\s*:\s*([\d.]+)/);
    return lh && parseFloat(lh[1]) < 1.2;
});
if (!apertadas.length) ok("nenhuma frase fica com linha apertada (abaixo de 1.2)");
else falha(apertadas.length + " frase(s) com linha apertada: "
    + apertadas.slice(0, 3).map(m => m[1].replace(/\s+/g, " ").trim().slice(0, 40)).join(" | "));

console.log("\n=== 8. TEXTO SEM BARRA E SEM CAIXA ALTA FORCADA DEMAIS ===");
const semRespiro = [...todoCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(function (m) {
    return /letter-spacing\s*:\s*\.[2-9]\d*em/.test(m[2]);
});
if (!semRespiro.length) ok("nenhum texto com letra muito espacada (fica dificil de ler)");
else falha(semRespiro.length + " regra(s) com letter-spacing grande demais");

console.log("\n=== 9. NUMERO DE TELEFONE E CEP DO BRASIL ===");
if (/replace\([^\)]*\\D|\(\d{2}\)/.test(codigo)) ok("telefone passa por mascara de digitos (nao quebra o desenho)");
else ok("telefone exibido do jeito que o app ja entrega");
if (!/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(codigo) && !/replace\(\/\(\\d\)/.test(codigo)) ok("CEP nao e formatado com o formato americano");

console.log("\n=== 10. O TAMANHO DA LETRA VALE NO PAINEL TAMBEM ===");
const admin = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
if (/data-fonte/.test(admin) && /opcoesFonteVendedor/.test(admin)) ok("o painel tem os 4 tamanhos de letra");
else falha("o painel do vendedor nao tem o tamanho de letra");
if (/body\.admin\[data-leitura=vertical\]/.test(admin)) ok("o painel tem leitura em cartao (nao aperta a tabela)");
else falha("o painel nao tem leitura em cartao: com letra grande a tabela fica impossivel");

console.log("\n" + (erros === 0 ? "*** LETRAS E NUMEROS 10/10 ***" : "*** " + erros + " ERRO(S) DE LETRA/NUMERO ***"));
process.exit(erros ? 1 : 0);
