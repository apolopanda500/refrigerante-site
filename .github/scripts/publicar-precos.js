/* Publica a tabela de precos do dono no Firebase Realtime Database
   (chaves estaveis pelo codigo do produto no site oficial). */
const fs = require("fs");
const path = require("path");

const BANCO = process.env.PRECO_URL
    || "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com";
const RAIZ = path.resolve(__dirname, "..", "..");

const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, "catalogo.json"), "utf8"));

/* monta a tabela: codigo do produto -> preco do dono */
const tabela = {};
catalogo.produtos.forEach(p => {
    if (p.key && p.pr) tabela["k:" + p.key] = p.pr;
});

(async function () {
    console.log("Publicando", Object.keys(tabela).length, "precos em", BANCO);
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
    console.log("Exemplo:", JSON.stringify(v && v[Object.keys(v || {})[0]]));
    if (n !== Object.keys(tabela).length) throw new Error("contagem diferente do esperado");
    console.log("OK");
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });