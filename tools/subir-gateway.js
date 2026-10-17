/* ============================================================
   DEPLOY DO GATEWAY NA CLOUDFLARE (feito para voce)
   ----------------------------------------------------------
   uso:  node tools/subir-gateway.js

   O que este script faz sozinho:
     1. confere se o Wrangler esta instalado (instala se preciso)
     2. le o JSON da conta de servico do Firebase
     3. monta os 6 segredos e envia para o Worker
     4. publica o codigo do gateway
     5. testa ao vivo o Worker recem publicado
     6. APAGA o JSON da conta de servico do disco

   O que precisa da sua mao: so o `wrangler login` (um clique no
   navegador autorizando) e o JSON que o Firebase te dera. */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const RAIZ = path.resolve(__dirname, "..");

const CHAVE_JSON = process.argv[2] || path.join(process.env.USERPROFILE || process.env.HOME, "Downloads", "chave-de-servico.json");
const ARQ_SECRETS = path.join(RAIZ, "worker", "secrets.json");

function fala(t) { console.log("\n=== " + t + " ==="); }
function roda(cmd, args, opcoes) {
    return spawnSync(cmd, args, Object.assign({ stdio: "inherit", shell: true }, opcoes || {}));
}

fala("1. Wrangler");
let wrangler = null;
try { wrangler = spawnSync("wrangler", ["--version"], { shell: true }).stdout.toString().trim(); } catch (e) {}
if (!wrangler) {
    console.log("instalando o Wrangler (so na primeira vez)...");
    roda("npm", ["install", "-g", "wrangler"]);
    wrangler = spawnSync("wrangler", ["--version"], { shell: true }).stdout.toString().trim();
}
console.log("versao: " + wrangler);

fala("2. Sessao na Cloudflare");
const login = spawnSync("wrangler", ["whoami"], { shell: true, encoding: "utf8" });
if (login.status !== 0 || /not authenticated|not logged in/i.test(login.stdout || "")) {
    console.log("Voce precisa autorizar uma vez. Vai abrir o navegador:");
    console.log("  aprove a autorizacao e este script continua sozinho.\n");
    roda("wrangler", ["login"]);
} else {
    console.log((login.stdout || "").trim().split("\n").slice(0, 2).join(" | "));
}

fala("3. Conta de servico do Firebase");
if (!fs.existsSync(CHAVE_JSON)) {
    console.log("Nao achei o JSON da conta de servico em:");
    console.log("  " + CHAVE_JSON);
    console.log("\nComo pegar (1 minuto):");
    console.log("  Firebase Console > engrenagem > Project Settings > Service Accounts");
    console.log("  > Generate new private key > o arquivo baixa sozinho");
    console.log("  > renomeie para chave-de-servico.json e deixe na pasta Downloads");
    console.log("\nDepois rode de novo:  node tools/subir-gateway.js");
    process.exit(1);
}
const chave = JSON.parse(fs.readFileSync(CHAVE_JSON, "utf8"));
if (!chave.client_email || !chave.private_key) {
    console.log("O JSON nao tem client_email/private_key. Baixe de novo no Firebase.");
    process.exit(1);
}
console.log("conta de servico: " + chave.client_email);

fala("4. Segredos (so o Worker ve isso)");
const segredos = {
    FB_DB_URL: "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com",
    FB_SA_EMAIL: chave.client_email,
    FB_SA_KEY: chave.private_key,
    LOJA_SENHA: process.env.LOJA_SENHA || "",
    BOT_SEGREDO: process.env.BOT_SEGREDO || "",
    SESSAO_SEGREDO: process.env.SESSAO_SEGREDO || ""
};
const faltando = ["LOJA_SENHA", "BOT_SEGREDO", "SESSAO_SEGREDO"].filter(function (k) { return !segredos[k]; });
if (faltando.length) {
    console.log("Faltaram estas senhas (o script nao adivinha): " + faltando.join(", "));
    console.log("Defina antes de rodar:");
    console.log('  $env:LOJA_SENHA="a senha do painel"');
    console.log('  $env:BOT_SEGREDO="um texto seu"');
    console.log('  $env:SESSAO_SEGREDO="outro texto seu"');
    process.exit(1);
}
fs.writeFileSync(ARQ_SECRETS, JSON.stringify(segredos, null, 2), "utf8");
console.log("secretos montados: " + Object.keys(segredos).length);
const r1 = spawnSync("wrangler", ["secret", "bulk", "worker/secrets.json"], { cwd: RAIZ, shell: true, stdio: "inherit" });
if (r1.status !== 0) { console.log("falha ao enviar os segredos"); process.exit(1); }

fala("5. Publicando o gateway");
const r2 = spawnSync("wrangler", ["deploy"], { cwd: RAIZ, shell: true, stdio: "inherit" });
if (r2.status !== 0) { console.log("falha no deploy"); process.exit(1); }

/* limpa o JSON da conta de servico do disco: nao precisa ficar guardado aqui */
try { fs.unlinkSync(CHAVE_JSON); console.log("JSON da conta de servico apagado do disco."); } catch (e) {}
try { fs.unlinkSync(ARQ_SECRETS); console.log("worker/secrets.json apagado (os segredos ja estao no Worker)."); } catch (e) {}

fala("6. Testando o Worker ao vivo");
const https = require("https");
const url = (process.env.GATEWAY_URL || "").trim();
function teste(rota) {
    return new Promise(function (resolve) {
        if (!url) return resolve({ status: 0, dados: "sem GATEWAY_URL" });
        https.get(url + rota, function (res) {
            let d = "";
            res.on("data", function (c) { d += c; });
            res.on("end", function () { resolve({ status: res.statusCode, dados: d }); });
        }).on("error", function (e) { resolve({ status: 0, dados: e.message }); });
    });
}
(async function () {
    if (!url) {
        console.log("Falta a URL do Worker para testar. O deploy acima mostrou ela (algo como");
        console.log("https://convencao-gateway.<seu>.workers.dev). Defina e rode de novo se quiser o teste:");
        console.log('  $env:GATEWAY_URL="https://..." ; node tools/subir-gateway.js');
        process.exit(0);
    }
    const saude = await teste("/api/saude");
    const precos = await teste("/api/precos");
    console.log("  /api/saude  -> HTTP " + saude.status + " " + saude.dados.slice(0, 80));
    console.log("  /api/precos -> HTTP " + precos.status + " " + precos.dados.slice(0, 80));
    if (saude.status === 200 && /"ok":true/.test(saude.dados)) {
        console.log("\n*** GATEWAY NO AR E FALANDO COM O FIREBASE ***");
        console.log("Proximo passo: cole a URL em Configuracoes do painel e so depois feche o banco");
        console.log("(passo 5 de docs/FECHAR-BANCO.md).");
    } else {
        console.log("\nO Worker subiu mas ainda nao respondeu. Confira os segredos (passo 4).");
    }
})();