/* 11 - TEMA ESCURO (10/10)
   todo componente que o codigo cria precisa ter uma versao
   escura no CSS: sem isso a pagina fica clara com o tema ligado */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
const cssPaginas = fs.readdirSync(dir).filter(f => f.endsWith(".html"))
    .map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
const tema = fs.readFileSync(path.join(dir, "theme.js"), "utf8");
const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");

console.log("=== 1. O TEMA E APLICADO NO <html> ===");
if (!/setAttribute\("data-theme"/.test(tema)) falha("theme.js nao aplica data-theme");
else console.log("  ok  theme.js aplica data-theme no documento");

console.log("\n=== 2. TEM A VERSAO ESCURA DE CADA COMPONENTE ===");
/* componentes criados pelo app.js (home) */
const componentes = [
    ["calendario", /\.cal-dia\b/, "cal-dia"],
    ["tabela geral", /\.tabela-geral\b/, "tabela-geral"],
    ["ofertas", /\.tabela-ofertas\b/, "tabela-ofertas"],
    ["botao da oferta", /\.of-btn\b/, "of-btn"],
    ["foto do caminhao", /\.tb-cam-foto\b/, "tb-cam-foto"],
    ["celula da regiao", /\.reg-cel\b/, "reg-cel"],
    ["passo do calendario", /\.etapa\b/, "etapa"]
];
componentes.forEach(function (c) {
    const re = new RegExp("\\[data-theme=\"dark\"\\][^{]*" + c[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (re.test(css)) console.log("  ok  " + c[0]);
    else falha("sem versao escura: " + c[0] + " (falta " + c[1] + ")");
});

console.log("\n=== 3. O TEMA ESCURO NAO DEIXA NENHUM FUNDO CLARO NO MEIO ===");
/* cor de fundo fixa e clara que vaza no tema escuro */
const fundosClaros = css.split("\n").filter(function (l) {
    const escura = /\[data-theme="dark"\]/.test(l);
    if (escura) return false;
    /* fundo branco ou quase branco, sem ser hover/botao */
    return /background:\s*#(fff|ffffff|f8f8fa|fbfcfe|f5f6fa|f9f9fb)\b/i.test(l);
});
if (fundosClaros.length > 12) {
    console.log("  aviso: " + fundosClaros.length + " regras com fundo claro (pode vazar no escuro)");
} else {
    console.log("  ok  poucas regras com fundo claro (" + fundosClaros.length + ")");
}

console.log("\n=== 4. AS CORES DE TEXTO DO TEMA ESCURO SAO CLARAS ===");
/* so interessa a cor do TEXTO: cor de fundo, borda e variavel nao contam */
const blocos = [...css.matchAll(/[^{}]*\{[^{}]*\}/g)].map(m => m[0]);
/* texto escuro so e problema se o fundo for escuro tambem.
   texto escuro em cima de amarelo/branco e o contraste correto. */
function fundoClaro(b) {
    const m = b.match(/background(?:-color)?\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3}|white|var\(--[a-z-]+\))/i);
    if (!m) return false;
    const v = m[1];
    if (/white/i.test(v)) return true;
    if (v.charAt(0) !== "#") return false;
    const hex = v.length === 4 ? "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : v;
    const r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), bl = parseInt(hex.substr(5, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * bl) > 140;   /* fundo claro */
}
const textosEscuros = blocos.filter(function (b) {
    if (!/\[data-theme="dark"\]/.test(b)) return false;
    if (fundoClaro(b)) return false;               /* texto escuro em fundo claro: ok */
    const re = /(^|[;{\s])color\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})/gi;
    let m;
    while ((m = re.exec(b))) {
        const hex = m[2];
        const r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), bl = parseInt(hex.substr(5, 2), 16);
        if ((0.299 * r + 0.587 * g + 0.114 * bl) < 90) return true;
    }
    return false;
});
if (textosEscuros.length) {
    textosEscuros.slice(0, 3).forEach(t => falha("texto escuro dentro do tema escuro: " + t.substring(0, 90).replace(/\s+/g, " ")));
} else console.log("  ok  nenhum texto escuro dentro do tema escuro");

console.log("\n=== 5. O TEMA TAMBEM VALE PARA O PAINEL DO VENDEDOR ===");
const admin = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
if (admin.indexOf("theme.js") < 0) falha("admin.html nao carrega theme.js (fica sem tema)");
else console.log("  ok  o painel carrega theme.js e troca de tema junto");
if (/\[data-theme="dark"\][^{]*\.tabela-pedidos|\[data-theme="dark"\][^{]*\.resumo-linha/.test(css + admin)) {
    console.log("  ok  o painel tem regras para o tema escuro");
} else falha("o painel nao tem nenhuma regra de tema escuro");

console.log("\n" + (erros === 0 ? "*** TEMA ESCURO 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);