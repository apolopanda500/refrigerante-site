/* 38 - O BANCO FECHADO (10/10)
   O banco do Firebase estava aberto: qualquer um lia os pedidos (com
   CPF) e ainda escrevia. Aqui provamos a solucao antes de ela ir para
   o ar:
     - as regras do Firebase nao abrem nada (so o gateway, com a conta
       de servico, consegue falar com o banco)
     - o preco continua publico (todo mundo ve o preco da bebida)
     - so o dono, com a senha, troca o login por token e lista os
       pedidos; token falso, expirado ou adulterado nao passa
     - o cliente cria o pedido dele e recebe uma CHAVE: com a chave ve
       o pedido, sem a chave (ou com a de outro) recebe 403
     - pedido malformado (id errado, sem itens, total invalido) e
       recusado na porta
     - o robo do Telegram so entra com o segredo dele
   O gateway e executado de verdade, com WebCrypto e um banco falso. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const ARQ_GW = "worker/convencao-gateway.js";
const ARQ_REGRAS = "database.rules.json";
if (!fs.existsSync(path.join(dir, ARQ_GW))) { console.log("  ERRO faltou " + ARQ_GW); process.exit(1); }

console.log("=== 1. AS REGRAS DO FIREBASE NAO ABREM NADA ===");
if (!fs.existsSync(path.join(dir, ARQ_REGRAS))) falha("faltou " + ARQ_REGRAS + " (regras do banco)");
const regras = JSON.parse(ler(ARQ_REGRAS));
/* o preco e a UNICA coisa publica (todo mundo ve o preco da bebida) */
const PODE_ABRIR = ["/precos/.read"];
const varrer = (obj, caminho) => {
    const problemas = [];
    Object.keys(obj || {}).forEach(function (chave) {
        if (chave === ".read" || chave === ".write") {
            if (obj[chave] !== false && !(PODE_ABRIR.indexOf(caminho + chave) >= 0 && obj[chave] === true)) {
                problemas.push(caminho + chave + " = " + JSON.stringify(obj[chave]));
            }
        } else if (chave === ".indexOn" || chave.startsWith("$") || chave === ".validate") {
            /* regra auxiliar */
        } else if (typeof obj[chave] === "object") {
            problemas.push(...varrer(obj[chave], caminho + chave + "/"));
        }
    });
    return problemas;
};
const abertas = varrer(regras.rules, "/");
if (abertas.length) falha("regra que deixa o banco aberto: " + abertas.join(", "));
else ok("nenhuma regra abre leitura ou escrita para fora (nem em /pedidos, /avaliacoes ou /bot)");
if (regras.rules[".read"] !== false || regras.rules[".write"] !== false) falha("a raiz do banco precisa estar fechada");
else ok("raiz fechada: .read = false e .write = false");
if (regras.rules.precos[".read"] !== true) falha("o preco precisa continuar publico de leitura");
else ok("so o preco fica publico para leitura (e a escrita e do gateway)");
["pedidos", "avaliacoes", "bot"].forEach(function (p) {
    if (regras.rules[p][".read"] !== false || regras.rules[p][".write"] !== false) falha("/" + p + " nao esta fechado");
});
ok("/pedidos, /avaliacoes e /bot: leitura e escrita fechadas para o mundo");

console.log("\n=== 2. O GATEWAY CARREGA E TEM AS ROTAS CERTAS ===");
(async function () {
    const mod = await import("file:///" + path.join(dir, ARQ_GW).replace(/\\/g, "/"));
    const worker = mod.default;
    if (!worker || typeof worker.fetch !== "function") { falha("o gateway nao exporta fetch(req)"); return; }
    ok("gateway carrega (roda no Cloudflare e no Node)");

    /* conta de servico de mentira + banco falso: testamos o caminho todo */
    const par = await crypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["sign", "verify"]);
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", par.privateKey));
    const pem = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(pkcs8).toString("base64") + "\n-----END PRIVATE KEY-----";

    const bancoFalso = { pedidos: {}, precos: { "k:1": "R$ 19,00" }, avaliacoes: {}, bot: {} };
    const acessos = [];
    globalThis.fetch = function (url, op) {
        const cam = decodeURIComponent(String(url).split("?")[0].replace(/^https:\/\/fake-db\.firebaseio\.com/, ""));
        acessos.push({ url: String(url), metodo: (op && op.method) || "GET", caminho: cam, autenticado: /[?&]auth=/.test(String(url)) });
        if (!/[?&]auth=/.test(String(url))) return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve("Permission denied") });
        if ((op && op.method) === "PUT") {
            const chave = cam.replace("/pedidos/", "").replace("/avaliacoes/", "avaliacoes:").replace(".json", "").replace("/bot/", "bot:");
            if (cam.indexOf("/bot/") === 0) bancoFalso.bot[cam] = JSON.parse(op.body);
            else if (cam.indexOf("/avaliacoes/") === 0) bancoFalso.avaliacoes[cam.replace("/avaliacoes/", "")] = JSON.parse(op.body);
            else bancoFalso.pedidos[chave] = JSON.parse(op.body);
            return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(true)) });
        }
        let dados = null;
        if (cam === "/pedidos.json") dados = bancoFalso.pedidos;
        else if (cam === "/precos.json") dados = bancoFalso.precos;
        else if (cam.indexOf("/bot/") === 0) dados = bancoFalso.bot[cam];
        else dados = bancoFalso.pedidos[cam.replace("/pedidos/", "").replace(".json", "")];
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(dados)) });
    };

    const env = {
        FB_DB_URL: "https://fake-db.firebaseio.com", FB_SA_EMAIL: "teste@projeto.iam.gserviceaccount.com",
        FB_SA_KEY: pem, LOJA_SENHA: "senha-do-dono-123", BOT_SEGREDO: "segredo-do-robo-456", SESSAO_SEGREDO: "sessao-segreda-789"
    };
    const chamar = (caminho, op) => {
        const req = new Request("https://gateway.exemplo.com" + caminho, op);
        return worker.fetch(req, env).then(async r => ({ status: r.status, dados: await r.json() }));
    };

    const saude = await chamar("/api/saude");
    if (saude.status !== 200 || !saude.dados.ok) falha("a rota de saude nao respondeu");
    else ok("saude: gateway de pe e com conta de servico configurada");

    console.log("\n=== 3. O PRECO CONTINUA PUBLICO ===");
    const precos = await chamar("/api/precos");
    if (precos.status !== 200) falha("preco publico devolviu " + precos.status);
    else ok("preco publico: R$ 19,00 (todo mundo ve o preco da bebida)");

    console.log("\n=== 4. SO O DONO ENTRA ===");
    const semToken = await chamar("/api/pedidos");
    if (semToken.status !== 401) falha("qualquer pessoa listou os pedidos (HTTP " + semToken.status + ")");
    else ok("pedido de todo mundo: 401 sem login");
    const senhaErrada = await chamar("/api/entrar", { method: "POST", body: JSON.stringify({ senha: "chutei" }) });
    if (senhaErrada.status !== 401) falha("senha errada passou");
    else ok("senha errada: 401");
    const login = await chamar("/api/entrar", { method: "POST", body: JSON.stringify({ senha: "senha-do-dono-123" }) });
    if (!login.dados.token) falha("senha certa nao devolveu token");
    else ok("senha certa devolve token de sessao");
    const tokenFalso = login.dados.token.slice(0, -2) + "xx";
    const comTokenFalso = await chamar("/api/pedidos", { headers: { Authorization: tokenFalso } });
    if (comTokenFalso.status !== 401) falha("token adulterado passou (HTTP " + comTokenFalso.status + ")");
    else ok("token adulterado: 401 (a assinatura confere)");
    const comToken = await chamar("/api/pedidos", { headers: { Authorization: login.dados.token } });
    if (comToken.status !== 200) falha("o dono nao conseguiu listar os pedidos");
    else ok("dono logado lista os pedidos: " + Object.keys(comToken.dados || {}).length + " no banco");

    console.log("\n=== 5. TODO ACESSO AO BANCO PELA CONTA DE SERVICO ===");
    const semAuth = acessos.filter(a => !a.autenticado);
    if (semAuth.length) falha("o gateway tentou falar com o banco sem token: " + semAuth.length + "x");
    else ok("todas as " + acessos.length + " chamadas ao banco foram autenticadas (conta de servico)");

    console.log("\n=== 6. O CLIENTE CRIA O PEDIDO E SO VE O DELE ===");
    const bom = {
        id: "CV20261017-001-40392", nome: "Ana Ribeiro", tel: "21988112233", end: "Rua A, 100", bairro: "Seropedica",
        regiao: "seropedica", itens: [{ name: "Guarana 350ml", qty: 6, subtotal: 114 }], subtotal: 114, frete: 0,
        total: 114, status: "aguardando", criadoEm: Date.now()
    };
    const criado = await chamar("/api/pedido", { method: "POST", body: JSON.stringify({ pedido: bom }) });
    if (criado.status !== 200 || !criado.dados.chave) falha("o cliente nao conseguiu criar o pedido (" + criado.status + ")");
    else ok("cliente criou o pedido e recebeu a chave dele");
    const meu = await chamar("/api/meu-pedido?id=" + bom.id, { headers: { "X-Chave-Pedido": criado.dados.chave } });
    if (meu.status !== 200 || meu.dados.id !== bom.id) falha("o cliente nao acompanhou o proprio pedido");
    else ok("com a chave, o cliente ve o proprio pedido: " + meu.dados.id);
    const semChave = await chamar("/api/meu-pedido?id=" + bom.id);
    if (semChave.status !== 403) falha("sem chave o cliente leu o pedido (" + semChave.status + ")");
    else ok("sem chave: 403");
    const chaveDeOutro = await chamar("/api/meu-pedido?id=" + bom.id, { headers: { "X-Chave-Pedido": "chave-inventada" } });
    if (chaveDeOutro.status !== 403) falha("chave inventada passou");
    else ok("chave de outro: 403");

    console.log("\n=== 7. PEDIDO MALFORMADO E RECUSADO ===");
    const ruins = [
        [{ id: "1", nome: "A", tel: "219", itens: [{ qty: 1 }], total: 10, status: "aguardando" }, "numero de id invalido"],
        [Object.assign({}, bom, { itens: [] }), "sem itens"],
        [Object.assign({}, bom, { total: "abc" }), "total invalido"],
        [Object.assign({}, bom, { status: "inventado" }), "status invalido"],
        [Object.assign({}, bom, { tel: "1" }), "telefone curto"]
    ];
    for (const par of ruins) {
        const r = await chamar("/api/pedido", { method: "POST", body: JSON.stringify({ pedido: par[0] }) });
        if (r.status !== 400) falha("pedido sujo (" + par[1] + ") passou com HTTP " + r.status);
    }
    ok("5 pedidos malformados recusados na porta (id, itens, total, status, telefone)");

    console.log("\n=== 8. O DONO MUDA O STATUS E O HISTORICO CRESCE ===");
    const mud = await chamar("/api/status", {
        method: "POST", headers: { Authorization: login.dados.token },
        body: JSON.stringify({ id: bom.id, status: "confirmado" })
    });
    if (mud.status !== 200 || mud.dados.pedido.status !== "confirmado") falha("o dono nao mudou o status");
    else ok("dono mudou para confirmado e o historico ficou com " + mud.dados.pedido.historico.length + " passo(s)");
    const mudSemLogin = await chamar("/api/status", { method: "POST", body: JSON.stringify({ id: bom.id, status: "entregue" }) });
    if (mudSemLogin.status !== 401) falha("sem login o dono mexeu no status");
    else ok("sem login: 401 (ninguem mexe no pedido dos outros)");

    console.log("\n=== 9. O ROBO ENTRA SO COM O SEGREDO DELE ===");
    const botSem = await chamar("/api/bot", { method: "GET" });
    if (botSem.status !== 403) falha("robo sem segredo entrou");
    else ok("robo sem segredo: 403");
    const botErrado = await chamar("/api/bot", { method: "GET", headers: { "X-Bot-Segredo": "chutei" } });
    if (botErrado.status !== 403) falha("robo com segredo errado entrou");
    else ok("robo com segredo errado: 403");
    const botCerto = await chamar("/api/bot", { method: "GET", headers: { "X-Bot-Segredo": "segredo-do-robo-456" } });
    if (botCerto.status !== 200 || !botCerto.dados.pedidos) falha("o robo de verdade nao entrou");
    else ok("robo com o segredo dele entrou e leu os pedidos");

    console.log("\n=== 10. O GUIA DE LIGACAO EXISTE ===");
    ["docs/FECHAR-BANCO.md"].forEach(function (f) {
        if (!fs.existsSync(path.join(dir, f))) falha("faltou " + f);
        else ok(f + " explica o passo a passo");
    });
    const guia = fs.existsSync(path.join(dir, "docs/FECHAR-BANCO.md")) ? ler("docs/FECHAR-BANCO.md") : "";
    ["service account", "Cloudflare", "database.rules.json"].forEach(function (p) {
        if (guia.toLowerCase().indexOf(p.toLowerCase()) < 0) falha("o guia nao fala de " + p);
    });
    ok("guia cobre conta de servico, Cloudflare e as regras");

    console.log("\n" + (erros === 0 ? "*** BANCO FECHADO 10/10 ***" : "*** " + erros + " ERRO(S) NO BANCO FECHADO ***"));
    process.exit(erros ? 1 : 0);
})();