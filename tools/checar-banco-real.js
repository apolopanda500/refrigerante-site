/* CONFERE SE O BANCO DO FIREBASE ESTA REALMENTE FECHADO
   uso:  node tools/checar-banco-real.js

   O gateway usa a conta de servico (uid gateway-convencao) e continua
   funcionando com as regras fechadas. Este teste so olha o banco publico,
   sem senha:
     - pedidos/avaliacoes/config/controle/bot: 401/403 = fechado (certo)
     - precos/capacidade: 200 = público de propósito (preço e vagas)
*/
const BASE = "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com";

async function status(caminho) {
    try {
        const r = await fetch(BASE + "/" + caminho + ".json?shallow=true", { cache: "no-store" });
        return r.status;
    } catch (e) {
        return 0;
    }
}

async function main() {
    const fechados = ["pedidos", "avaliacoes", "config", "controle", "bot"];
    const publicos = ["precos", "capacidade"];
    let erros = 0;

    for (const c of fechados) {
        const s = await status(c);
        if (s === 401 || s === 403) console.log("  ok  " + c + ".json responde " + s + " sem senha");
        else if (s === 0) console.log("  ??  " + c + ": sem resposta (internet?)");
        else { console.log("  ABERTO  " + c + ".json responde " + s + " sem senha"); erros++; }
    }
    for (const c of publicos) {
        const s = await status(c);
        if (s === 200) console.log("  ok  " + c + ".json é público de propósito (200)");
        else if (s === 0) console.log("  ??  " + c + ": sem resposta (internet?)");
        else { console.log("  ERRO  " + c + ".json responde " + s + " (devia ser público)"); erros++; }
    }

    if (erros) {
        console.log("\n*** BANCO ABERTO: feche as regras ANTES de vender. ***");
        console.log("Firebase Console > Realtime Database > Regras > publique database.rules.json");
        process.exit(1);
    }
    console.log("\n*** BANCO FECHADO: pedidos protegidos, preços e vagas públicos. ***");
}

main();
