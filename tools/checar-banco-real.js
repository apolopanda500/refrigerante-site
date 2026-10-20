/* CONFERE SE O BANCO DO FIREBASE ESTA REALMENTE FECHADO
   uso:  node tools/checar-banco-real.js

   O gateway usa a conta de servico e continua funcionando com as regras
   fechadas. Este teste so olha o banco publico, sem senha:
     - HTTP 200  = qualquer pessoa consegue ler -> ABERTO (perigo)
     - HTTP 401/403 = fechado (o gateway continua lendo por dentro)
*/
const BASE = "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com";

async function main() {
    const caminhos = ["pedidos", "avaliacoes", "precos"];
    let abertos = 0;
    for (const c of caminhos) {
        let status = 0;
        try {
            const r = await fetch(BASE + "/" + c + ".json?shallow=true", { cache: "no-store" });
            status = r.status;
        } catch (e) {
            console.log("  ??  " + c + ": sem resposta (internet?)");
            continue;
        }
        if (status === 200) {
            console.log("  ABERTO  " + c + ".json responde 200 sem senha");
            abertos++;
        } else {
            console.log("  ok  " + c + ".json responde " + status + " sem senha");
        }
    }
    if (abertos) {
        console.log("\n*** BANCO ABERTO: feche as regras ANTES de vender. ***");
        console.log("Firebase Console > Realtime Database > Regras > publique:");
        console.log('  { "rules": { ".read": false, ".write": false } }');
        process.exit(1);
    }
    console.log("\n*** BANCO FECHADO: o gateway continua sendo o unico caminho. ***");
}

main();
