/* remove CSS morto (classe que nenhuma pagina/script usa)
   uso:
     node tests/limpar-css-morto.js            (so o relatorio)
     node tests/limpar-css-morto.js --aplicar  (limpa de verdade)

   Como funciona: um seletor so e consideredo vivo quando TODAS as classes dele
   existem no site (ex.: ".cam-corpo .cam-tx" morre se qualquer uma sumiu).
   Se a regra tem outros seletores vivos, o seletor morto e aparado e o resto
   fica igual. O arquivo so e gravado depois de conferir as chaves. */
const fs = require("fs");
const path = require("path");
const dir = path.resolve(__dirname, "..");
const APLICAR = process.argv.indexOf("--aplicar") >= 0;
const cssPath = path.join(dir, "style.css");

/* ---------- 1. o que o site realmente usa ---------- */
let uso = "";
fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html").forEach(f => {
    uso += fs.readFileSync(path.join(dir, f), "utf8") + "\n";
});
["app.js", "script.js", "loja.js", "ia.js", "central.js", "telegram.js", "conta.js", "theme.js",
    "app-update.js", "sw.js", "firebase-appcheck.js"].forEach(f => {
        const p = path.join(dir, f);
        if (fs.existsSync(p)) uso += fs.readFileSync(p, "utf8") + "\n";
    });
/* estilo dentro da pagina nao conta como uso (senao o seletor se esconde) */
uso = uso.replace(/<style[^>]*>[\s\S]*?<\/style>/g, " ");
/* alert()/confirm()/prompt() sao funcoes do navegador, nao classes */
uso = uso.replace(/\b(alert|confirm|prompt)\s*\(/g, "( ");

const viva = (c) => new RegExp("['\"\\s.]" + c.replace(/-/g, "\\-") + "(?![\\w-])").test(uso);
const CLASSES = (css) => [...new Set((css.match(/\.([a-zA-Z][\w-]{2,})/g) || []).map(c => c.slice(1)))];

const cssGeral = fs.readFileSync(cssPath, "utf8");
const mortas = CLASSES(cssGeral).filter(c => !viva(c));
if (!mortas.length) {
    console.log("CSS limpo: nenhuma classe morta no style.css.");
    process.exit(0);
}
console.log("style.css: " + CLASSES(cssGeral).length + " classes | mortas: " + mortas.length);
if (process.env.DEBUG_CSS) console.log("mortas: " + mortas.join(", "));

const seletorMorto = (s) => {
    const cls = (s.match(/\.([a-zA-Z][\w-]{2,})/g) || []).map(c => c.slice(1));
    if (!cls.length) return false;                 /* so tag/atributo: mantem */
    return cls.some(c => mortas.indexOf(c) >= 0);
};

/* ---------- 2. limpeza respeitando @media e a formatacao ---------- */
const relato = { fora: [], aparados: [] };

/* esconde comentario e string (mesmo tamanho) para contar chave sem errar.
   So conta aspas como string DENTRO de bloco (dentro de {}): no seletor,
   [data-theme="dark"] usa aspas e nao pode ser apagado, senao o "{ " some
   e o arquivo inteiro passa a ser lido errado. */
function mascara(txt) {
    const a = txt.split("");
    let i = 0, bloco = 0;
    while (i < txt.length) {
        if (txt[i] === "/" && txt[i + 1] === "*") {
            const fim = txt.indexOf("*/", i + 2);
            const f = fim < 0 ? txt.length : fim + 2;
            for (let k = i; k < f; k++) if (a[k] !== "\n") a[k] = " ";
            i = f; continue;
        }
        if (bloco > 0 && (txt[i] === '"' || txt[i] === "'")) {
            const q = txt[i];
            let k = i + 1;
            while (k < txt.length && txt[k] !== q) { if (txt[k] === "\\") k++; k++; }
            for (let j = i; j <= k && j < txt.length; j++) if (a[j] !== "\n") a[j] = " ";
            i = k + 1; continue;
        }
        if (txt[i] === "{") bloco++;
        else if (txt[i] === "}") bloco = Math.max(0, bloco - 1);
        i++;
    }
    return a.join("");
}

function limpa(txt, dentro) {
    const m = mascara(txt);
    const saida = [];
    let buf = "";                                  /* comentario/espaco aguardando */
    let base = 0;                                  /* posicao no txt onde buf comeca */
    let i = 0;
    while (i < txt.length) {
        if (m[i] === "{") {
            /* separa o que e comentario (fica sempre) do que e seletor */
            const mm = m.slice(base, base + buf.length);
            let corte = 0;
            while (corte < mm.length && /\s/.test(mm[corte])) corte++;
            const comentario = buf.slice(0, corte), selTexto = buf.slice(corte);
            const sel = selTexto.trim();
            const chave = (dentro ? "media " : "") + sel.replace(/\s+/g, " ").slice(0, 90);
            let j = i + 1, nivel = 1;
            while (j < txt.length && nivel > 0) {
                if (m[j] === "{") nivel++;
                else if (m[j] === "}") nivel--;
                j++;
            }
            const corpo = txt.slice(i + 1, j - 1);
            if (sel.charAt(0) === "@") {
                /* @media/@keyframes/@supports: limpa o que tem dentro */
                saida.push(comentario + selTexto + "{" + limpa(corpo, true) + "}");
                buf = ""; base = j; i = j; continue;
            }
            const sels = sel.replace(/\/\*[\s\S]*?\*\//g, " ").split(",").map(s => s.trim()).filter(Boolean);
            if (sels.length) {
                const vivos = sels.filter(s => !seletorMorto(s));
                if (!vivos.length) { relato.fora.push(chave); buf = ""; base = j; i = j; continue; }
                if (vivos.length < sels.length) {
                    relato.aparados.push(chave + "  ->  " + vivos.join(",").replace(/\s+/g, " ").slice(0, 70));
                    saida.push(comentario + vivos.join(",") + "{" + corpo + "}");
                    buf = ""; base = j; i = j; continue;
                }
            }
            saida.push(comentario + selTexto + "{" + corpo + "}");
            buf = ""; base = j; i = j; continue;
        }
        if (m[i] === "}") {                         /* fecha bloco @media */
            saida.push(buf + "}");
            buf = ""; base = i + 1; i++; continue;
        }
        buf += txt[i]; i++;
    }
    saida.push(buf);
    return saida.join("");
}

/* ---------- 3. STYLE.CSS ---------- */
const novoStyle = limpa(cssGeral, false);
/* os <style> das paginas tambem tem regra morta */
const alvos = [];
fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html").forEach(f => {
    const p = path.join(dir, f);
    const t = fs.readFileSync(p, "utf8");
    const reStyle = /(<style[^>]*>)([\s\S]*?)(<\/style>)/g;
    let s;
    while ((s = reStyle.exec(t)) !== null) {
        const limpo = limpa(s[2], false);
        if (limpo === s[2]) continue;
        alvos.push({ arquivo: p, ini: s.index, fim: s.index + s[0].length, novo: s[1] + limpo + s[3] });
    }
});

console.log("\nregras removidas inteiras (" + relato.fora.length + "):");
relato.fora.forEach(s => console.log("  - " + s));
console.log("\nseletores mortos aparados (" + relato.aparados.length + "):");
relato.aparados.forEach(s => console.log("  ~ " + s));
console.log("\n<style> das paginas que mudam: " + alvos.length);

if (!APLICAR) {
    console.log("\n(nada foi alterado; rode com --aplicar para limpar)");
    process.exit(0);
}

/* ---------- 4. confere antes de gravar ---------- */
const conta = (s) => { const t = s.replace(/\/\*[\s\S]*?\*\//g, " "); return [(t.match(/\{/g) || []).length, (t.match(/\}/g) || []).length]; };
const a = conta(novoStyle);
if (a[0] !== a[1]) { console.log("CANCELADO:(style.css ficaria com chaves quebradas)"); process.exit(1); }
for (const al of alvos) { const c = conta(al.novo); if (c[0] !== c[1]) { console.log("CANCELADO: <style> quebrado em " + al.arquivo); process.exit(1); } }

fs.writeFileSync(cssPath, novoStyle, "utf8");
alvos.sort((a, b) => b.ini - a.ini).forEach(al => {
    const t = fs.readFileSync(al.arquivo, "utf8");
    fs.writeFileSync(al.arquivo, t.slice(0, al.ini) + al.novo + t.slice(al.fim), "utf8");
});
console.log("\npronto: " + relato.fora.length + " regras fora, " + relato.aparados.length + " seletores aparados, "
    + alvos.length + " <style> ajustado(s).");
