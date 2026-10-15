/* Publica a tabela de precos do dono no Firebase Realtime Database
   (chaves estaveis pelo codigo do produto no site oficial).

   IMPORTANTE: grava NUMERO (27.5), nunca "R$ 27,50".
   Texto quebra comparacao e ja causou erro de digito. */
const fs = require("fs");
const path = require("path");

const BANCO = process.env.PRECO_URL
    || "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com";
const RAIZ = path.resolve(__dirname, "..", "..");

const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, "catalogo.json"), "utf8"));

/* "R$ 27,50" | "27.5" | 27.5 -> 27.5 */
function precoNumero(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v == null ? "" : v).trim().replace(/R\$\s*/i, "").replace(/\s/g, "");
    if (!s) return 0;
    const temPonto = s.indexOf(".") >= 0;
    const temVirgula = s.indexOf(",") >= 0;
    if (temPonto && temVirgula) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
        else s = s.replace(/,/g, "");
    } else if (temVirgula) {
        s = s.replace(",", ".");
    } else if (temPonto) {
        const partes = s.split(".");
        if (!(partes.length === 2 && partes[1].length !== 3)) s = s.replace(/\./g, "");
    }
    const n = parseFloat(s);
    return isNaN(n) || n < 0 ? 0 : Math.round(n * 100) / 100;
}

/* monta a tabela: codigo do produto -> preco (numero) */
const tabela = {};
const ignorados = [];
catalogo.produtos.forEach(p => {
    if (!p.key) return;
    const n = precoNumero(p.pr);
    if (!n) { ignorados.push(p.nm + " (preco " + JSON.stringify(p.pr) + ")"); return; }
    tabela["k:" + p.key] = n;
});

/* trava contra erro de digito: se algum preco estiver 10x o vizinho
   mais proximo da mesma classe, avisa em vez de publicar calado */
const suspeitas = [];
catalogo.produtos.forEach(p => {
    const n = precoNumero(p.pr);
    if (n > 0 && n >= 1000) suspeitas.push(p.nm + " = " + n + " (suspeito de digito a mais)");
});

(async function () {
    console.log("Publicando", Object.keys(tabela).length, "precos em", BANCO);
    if (ignorados.length) console.log("SEM PRECO (pulados):", ignorados.join(" | "));
    if (suspeitas.length) {
        console.log("ATENCAO - possivel erro de digito:", suspeitas.join(" | "));
        if (process.env.FORCAR !== "1") {
            console.log("Publicacao cancelada. Use FORCE=1 se estiver correto.");
            process.exit(2);
        }
    }

    const r = await fetch(BANCO + "/precos.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tabela)
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    console.log("Gravado. Conferindo...");
    const v = await (await fetch(BANCO + "/precos.json", { cache: "no-store" })).json();
    const n = v && typeof v === "object" ? Object.keys(v).length : 0;
    console.log("Leitura de volta:", n, "precos");
    if (n !== Object.keys(tabela).length) throw new Error("contagem diferente do esperado");

    /* confere valor por valor (e o tipo) */
    let erro = 0;
    Object.keys(tabela).forEach(function (k) {
        const lido = v[k];
        if (typeof lido !== "number" || Math.abs(lido - tabela[k]) > 0.005) {
            console.log("  DIVERGE", k, "esperado", tabela[k], "veio", JSON.stringify(lido));
            erro++;
        }
    });
    if (erro) throw new Error(erro + " preco(s) divergentes apos gravar");
    console.log("OK - os " + n + " precos conferem e sao numeros");
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });