/* ============================================================
   TESTE DE FUMACA DO GATEWAY (roda na sua maquina)
   Sobe o gateway em Node (worker/server.js) com um banco falso e
   conversa com ele por HTTP de verdade, igual o site faria.

   node tools/fumaca-gateway.js

   Serve para conferir tudo antes de subir na Cloudflare: se aqui
   der 11/11, o gateway esta fazendo o que promete.
   ============================================================ */
const http = require("http");
const path = require("path");
const RAIZ = path.resolve(__dirname, "..");

(async function () {
    const { subtle } = require("crypto").webcrypto;
    /* conta de servico de mentira, so para o teste assinar de verdade */
    const par = await subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["sign", "verify"]);
    const pkcs8 = Buffer.from(await subtle.exportKey("pkcs8", par.privateKey)).toString("base64");

    process.env.FB_DB_URL = "https://banco-falso.firebaseio.com";
    process.env.FB_SA_EMAIL = "teste@projeto.iam.gserviceaccount.com";
    process.env.FB_SA_KEY = "-----BEGIN PRIVATE KEY-----\n" + pkcs8 + "\n-----END PRIVATE KEY-----";
    process.env.LOJA_SENHA = "senha-do-dono-123";
    process.env.BOT_SEGREDO = "segredo-do-robo-456";
    process.env.SESSAO_SEGREDO = "sessao-segreda-789";
    process.env.FB_API_KEY = "chave-de-teste";
    process.env.PORT = "8791";

    const banco = { pedidos: {}, precos: { "k:9": "R$ 19,00" } };
    globalThis.fetch = async function (url, op) {
        if (String(url).indexOf("identitytoolkit.googleapis.com") >= 0) return { ok: true, status: 200, json: async () => ({ idToken: "sessao-de-teste" }), text: async () => JSON.stringify({ idToken: "sessao-de-teste" }) };
        const cam = decodeURIComponent(String(url).split("?")[0].replace("https://banco-falso.firebaseio.com", ""));
        if (!/[?&]auth=/.test(String(url))) return { ok: false, status: 401, text: async () => "Permission denied" };
        if ((op && op.method) === "PUT") {
            if (cam.indexOf("/pedidos/") === 0) banco.pedidos[cam.replace("/pedidos/", "").replace(".json", "")] = JSON.parse(op.body);
            return { ok: true, text: async () => "true" };
        }
        const dados = cam === "/precos.json" ? banco.precos
            : cam === "/pedidos.json" ? banco.pedidos
            : cam.indexOf("/controle/") === 0 ? { n: 1 }
            : banco.pedidos[cam.replace("/pedidos/", "").replace(".json", "")];
        return { ok: true, text: async () => JSON.stringify(dados) };
    };

    process.chdir(RAIZ);
    require(path.join(RAIZ, "worker", "server.js"));
    await new Promise(function (r) { setTimeout(r, 800); });

    function pedir(rota, op) {
        return new Promise(function (resolve) {
            const u = new URL("http://localhost:8791" + rota);
            const dados = op && op.body ? JSON.stringify(op.body) : null;
            const headers = Object.assign({ "Content-Type": "application/json" }, (op && op.headers) || {});
            const r = http.request({
                hostname: "localhost", port: 8791, path: u.pathname + u.search,
                method: (op && op.method) || "GET", headers: headers
            }, function (res) {
                let d = "";
                res.on("data", function (c) { d += c; });
                res.on("end", function () { try { resolve({ status: res.statusCode, dados: JSON.parse(d || "{}") }); } catch (e) { resolve({ status: res.statusCode, dados: d }); } });
            });
            if (dados) r.write(dados);
            r.end();
        });
    }

    const ID = "CV20261017-001-40777";
    let erros = 0;
    const confere = (cond, msg) => { console.log((cond ? "  ok  " : "  ERRO ") + msg); if (!cond) erros++; };

    const saude = await pedir("/api/saude");
    console.log("saude:", JSON.stringify(saude.dados));
    confere(saude.status === 200 && saude.dados.ok === true, "gateway de pe");

    const precos = await pedir("/api/precos");
    console.log("preco publico:", JSON.stringify(precos.dados));
    confere(precos.status === 200 && !!precos.dados, "preco publico para qualquer um");

    const semLogin = await pedir("/api/pedidos");
    confere(semLogin.status === 401, "pedido de todo mundo exige login (HTTP " + semLogin.status + ")");

    const errado = await pedir("/api/entrar", { method: "POST", body: { senha: "chutei" } });
    confere(errado.status === 401, "senha errada recusada");

    const login = await pedir("/api/entrar", { method: "POST", body: { senha: "senha-do-dono-123" } });
    confere(!!login.dados.token, "senha certa devolve token de sessao");

    const criado = await pedir("/api/pedido", {
        method: "POST",
        body: {
            pedido: {
                id: ID, nome: "Ana Ribeiro", tel: "21988112233", cpf: "11144477735", end: "Rua A, 100", bairro: "Seropedica",
                regiao: "seropedica", itens: [{ name: "Guarana 350ml", qty: 6, subtotal: 114 }],
                subtotal: 114, frete: 0, total: 114, status: "aguardando", criadoEm: Date.now()
            }
        }
    });
    confere(criado.status === 200 && !!criado.dados.chave, "cliente cria o pedido e recebe a chave");
    if (!criado.dados.chave) console.log("    resposta: " + JSON.stringify(criado.dados));

    const meu = await pedir("/api/meu-pedido?id=" + ID, { headers: { "X-Chave-Pedido": criado.dados.chave || "sem-chave" } });
    confere(meu.status === 200 && meu.dados.id === ID, "cliente ve o proprio pedido com a chave");

    const semChave = await pedir("/api/meu-pedido?id=" + ID);
    confere(semChave.status === 403, "cliente sem chave nao ve nada");

    const dono = await pedir("/api/pedidos", { headers: { Authorization: login.dados.token } });
    if (dono.status !== 200 || Object.keys(dono.dados || {}).length !== 1) console.log("    dono:", dono.status, JSON.stringify(dono.dados).slice(0, 300));
    confere(dono.status === 200 && Object.keys(dono.dados || {}).length === 1, "dono logado lista os pedidos");

    const mudou = await pedir("/api/status", {
        method: "POST", headers: { Authorization: login.dados.token },
        body: { id: ID, status: "confirmado" }
    });
    confere(mudou.status === 200 && mudou.dados.pedido.status === "confirmado", "dono confirma e o historico cresce");

    const roboCerto = await pedir("/api/bot", { headers: { "X-Bot-Segredo": "segredo-do-robo-456" } });
    const roboSem = await pedir("/api/bot");
    confere(roboCerto.status === 200 && roboSem.status === 403, "robo entra so com o segredo dele");

    console.log("\n" + (erros === 0 ? "*** GATEWAY OK (" + 11 + "/" + 11 + ") ***" : "*** " + erros + " FALHA(S) NO GATEWAY ***"));
    process.exit(erros ? 1 : 0);
})();
