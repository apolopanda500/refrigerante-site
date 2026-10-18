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
/* o codigo do gateway, lido para conferir COMO ele fala com o banco */
const fonteGateway = ler(ARQ_GW);

console.log("=== 1. AS REGRAS DO FIREBASE NAO ABREM NADA ===");
if (!fs.existsSync(path.join(dir, ARQ_REGRAS))) falha("faltou " + ARQ_REGRAS + " (regras do banco)");
const regras = JSON.parse(ler(ARQ_REGRAS));
/* o preco e a UNICA coisa publica de DADOS (todo mundo ve o preco da bebida).
   A segunda excecao e /capacidade: quantas vagas de pedidos do dia ainda tem
   (a valvula anti-travamento). Sao SO numeros do dia (dia/pedidos/limite) -
   nome, CPF, telefone e endereco nao ficam ali, e a bateria 39 fiscaliza. */
const PODE_ABRIR = ["/precos/.read", "/capacidade/.read"];
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

/* /capacidade e a unica outra leitura publica: tem que continuar
   SO com numeros do dia, nunca dado de cliente */
console.log("\n=== 1b. /capacidade ABRE LEITURA, MAS SO COM NUMERO ===");
if (!regras.rules.capacidade || regras.rules.capacidade[".read"] !== true) falha("/capacidade precisa de leitura publica (a valvula do dia)");
else ok("/capacidade com leitura publica (o cliente precisa das vagas do dia)");
if (!regras.rules.capacidade || regras.rules.capacidade[".write"] !== false) falha("/capacidade nao pode ter escrita publica: quem publica e o painel/gateway");
else ok("/capacidade com escrita fechada (so o painel publica)");
/* o que o painel grava ali tem que ser so contagem, nunca cliente */
const admin = ler("admin.html");
const iCap = admin.indexOf("function publicarCapacidadeLoja");
const blocoCap = admin.slice(iCap, admin.indexOf("function avisoCapacidadePainel", iCap));
if (iCap < 0 || blocoCap.length < 50) falha("admin.html perdeu publicarCapacidadeLoja()");
else {
    const vazou = ["nome", "tel", "cpf", "end", "bairro", "itens", "identidade"].filter(function (c) {
        return new RegExp("\\b" + c + "\\s*:").test(blocoCap);
    });
    if (vazou.length) falha("/capacidade pode vazar dado de cliente: " + vazou.join(", "));
    else ok("/capacidade so carrega dia, pedidos e limite - nenhum nome, telefone, CPF ou endereco");
}

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
        /* o gateway troca o JWT da conta de servico por um TOKEN DE ACESSO antes de
           falar com o banco: e esse token, no cabecalho Authorization, que bypassa as
           regras. ?auth= autenticaria como usuario e nao passaria das regras. */
        if (/oauth2\.googleapis\.com\/token/.test(String(url))) {
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ access_token: "fake-token-admin", expires_in: 3600 }) });
        }
        const cab = (op && op.headers) || {};
        const autenticado = /Bearer /.test(String(cab.Authorization || ""));
        const cam = decodeURIComponent(String(url).split("?")[0].replace(/^https:\/\/fake-db\.firebaseio\.com/, ""));
        acessos.push({ url: String(url), metodo: (op && op.method) || "GET", caminho: cam, autenticado: autenticado });
        if (!autenticado) return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve("Permission denied") });
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
    else ok("todas as " + acessos.length + " chamadas ao banco foram autenticadas com token de acesso (conta de servico)");

    /* o caminho que FAZ o bypass das regras e o cabecalho; ?auth= nao passa das regras */
    const comQuery = acessos.filter(function (a) { return /[?&]auth=/.test(a.url); });
    if (comQuery.length) falha("o gateway voltou a usar ?auth= no banco: isso autentrica como USUARIO e as regras fecharam em cima (" + comQuery.length + "x)");
    else if (acessos.length) ok("o gateway bypassa as regras pelo token de acesso, e nao por ?auth= (que parou de valer)");
    if (!/Authorization: "Bearer " \+ token/.test(fonteGateway)) falha("o gateway nao esta mandando Authorization: Bearer no banco");
    else ok("o codigo manda Authorization: Bearer <token> no banco");

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

    /* ============================================================
       11. O SITE SABE FALAR COM O GATEWAY
       Sem isto o gateway e um beco sem salida: o navegador
       continuaria falando direto no Firebase e, com o banco
       fechado, o cliente pararia de fazer pedido. Aqui
       conferimos que cada tela usa a rota certa e que o modo
       antigo continua de pe (o botao de voltar).
       ============================================================ */
    console.log("\n=== 11. O SITE FALA COM O GATEWAY (e sabe voltar) ===");
    const script = ler("script.js");
    const app = ler("app.js");
    const admin = ler("admin.html");

    if (!/function gatewayURL\s*\(/.test(script)) falha("script.js nao tem gatewayURL() (o site nao sabe onde esta o gateway)");
    else ok("script.js tem gatewayURL() - le a URL do campo Banco");
    if (!/vendedorPrefs[\s\S]{0,400}refrigerantePrefs|refrigerantePrefs[\s\S]{0,400}vendedorPrefs/.test(script) &&
        !/noPainel\s*\?\s*"vendedorPrefs"/.test(script)) {
        falha("gatewayURL() nao separa painel (vendedorPrefs) de cliente (refrigerantePrefs)");
    } else ok("cada lado le o seu proprio prefs (painel e cliente nao se misturam)");

    /* campo vazio = modo antigo. E o botao de voltar. */
    if (!/return "";/.test(script) || !/modo antigo/i.test(script)) falha("o modo antigo (campo Banco vazio) ficou sem caminho");
    else ok("campo Banco vazio = modo antigo: o botao de voltar continua de pe");

    /* o cliente cria pelo /api/pedido e GUARDA a chave */
    if (!/POST|\/api\/pedido/.test(script) || script.indexOf("/api/pedido") < 0) falha("o cliente nao cria pedido pelo /api/pedido");
    else ok("cliente cria pedido em /api/pedido");
    if (!/gwGuardarChave/.test(script)) falha("o cliente nao guarda a chave do pedido");
    else ok("o cliente guarda a chave dele (localStorage) - sem ela nao acompanha o pedido");
    /* o cliente so le o pedido DELE, com a chave no cabecalho */
    if (script.indexOf("/api/meu-pedido") < 0) falha("o cliente nao acompanha o pedido pelo /api/meu-pedido");
    else ok("cliente acompanha em /api/meu-pedido");
    if (!/X-Chave-Pedido/.test(script)) falha("a chave nao vai no cabecalho X-Chave-Pedido");
    else ok("a chave vai no cabecalho X-Chave-Pedido (so o gateway le)");

    /* o dono entra e leva o token */
    if (!/function gatewayEntrar\s*\(/.test(script)) falha("nao ha login do dono no gateway");
    else ok("gatewayEntrar(): a senha do painel vira token de 12h");
    if (!/Authorization\s*=\s*"Bearer\s*"/.test(script)) falha("o token nao vai no cabecalho Authorization");
    else ok("o token vai como Authorization: Bearer");
    /* o gateway tem de aceitar o prefixo Bearer (bug que ja aconteceu) */
    if (!/bearer/i.test(ler(ARQ_GW))) falha("o gateway nao aceita 'Authorization: Bearer ...' (so o token cru)");
    else ok("o gateway aceita 'Bearer <token>' e o token cru (mudou so num lado e quebrou o outro)");

    /* listar, mudar status e editar pelo caminho seguro */
    if (script.indexOf("/api/pedidos") < 0) falha("o dono nao lista pedidos pelo /api/pedidos");
    else ok("dono lista em /api/pedidos (so com token)");
    if (script.indexOf("/api/status") < 0) falha("o dono nao muda status pelo /api/status");
    else ok("dono muda status em /api/status");
    if (app.indexOf("/api/precos") < 0) falha("o painel nao publica preco pelo gateway");
    else ok("preco sai por /api/precos (com token)");
    if (script.indexOf("/api/avaliar") < 0) falha("a avaliacao do cliente nao passa pelo gateway");
    else ok("avaliacao do cliente em /api/avaliar");
    /* a valva tambem precisa funcionar com o banco fechado */
    if (script.indexOf("/api/capacidade") < 0) falha("a valva do dia nao tem rota no gateway");
    else ok("valva do dia em /api/capacidade (leitura publica, escrita so com token)");
    if (!/rota === "\/api\/capacidade"/.test(ler(ARQ_GW))) falha("o gateway nao tem a rota /api/capacidade");
    else ok("o gateway tem a rota /api/capacidade");

    /* o ROBO DO TELEGRAM tambem tem que falar com o gateway: com o
       banco fechado, ele nao consegue mais ler nem mudar pedido */
    const bot = ler(".github/scripts/bot-telegram.js");
    if (!/GATEWAY_URL/.test(bot)) falha("o robo do Telegram nao sabe onde esta o gateway");
    else ok("o robo do Telegram le GATEWAY_URL do GitHub");
    if (!/BOT_SEGREDO/.test(bot)) falha("o robo do Telegram nao manda o segredo dele");
    else ok("o robo manda X-Bot-Segredo (o segredo so dele)");
    if (bot.indexOf("/api/bot") < 0) falha("o robo nao usa a rota /api/bot do gateway");
    else ok("o robo le e grava por /api/bot");
    if (!/VIA_GATEWAY/.test(bot)) falha("o robo nao tem modo gateway");
    else ok("robo tem os dois caminhos: com gateway no GitHub usa o seguro; sem ele, o modo antigo");
    /* o /editar do bot: ele grava o pedido inteiro, que o gateway aceita */
    if (!/gatewayGravar\(\{ pedido: valor \}\)/.test(bot)) falha("o robo nao devolve o pedido inteiro pelo gateway");
    else ok("quando o robo muda o status, ele devolve o pedido inteiro pelo /api/bot");

    /* cada rede tem o caminho antigo como reserva: nada some no meio da troca */
    ["enviarPedidoNuvem", "sincronizarPedidosNuvem", "sincronizarPedidosCliente"].forEach(function (fn) {
        const i = script.indexOf("function " + fn + "(");
        const bloco = script.slice(i, i + 700);
        if (i < 0) falha("perdi a funcao " + fn);
        else if (!/gatewayLigado\(\)/.test(bloco)) falha(fn + " nao olha o modo gateway: sem isso o site nemouz no caminho seguro");
        else ok(fn + " tem os dois caminhos (gateway ou modo antigo)");
    });
    if (!/function enviarPedidoNuvemDireto/.test(script)) falha("perdi o caminho direto do pedido (reserva do modo antigo)");
    else ok("o caminho direto continua existindo: se o gateway cair, o pedido tenta o banco de antes");
    /* o login do painel tem que passar pelo gateway antes de abrir */
    if (!/gatewayEntrar/.test(admin)) falha("o login do painel nao pede token ao gateway");
    else ok("o painel so abre depois que o gateway aceita a senha");
    /* a ferramenta de teste ao vivo existe e avisa que cria pedido de teste */
    const arqTeste = path.join(dir, "tools", "testar-gateway.js");
    if (!fs.existsSync(arqTeste)) falha("faltou tools/testar-gateway.js (o teste ao vivo do Worker)");
    else {
        ok("tools/testar-gateway.js testa o Worker de verdade");
        const txt = fs.readFileSync(arqTeste, "utf8");
        if (!/nao apaga pedido|não apaga pedido|NAO apaga pedido/.test(txt)) falha("o teste ao vivo nao avisa que o pedido de teste NAO e apagado");
        else ok("o teste ao vivo avisa que o pedido de teste fica cancelado, nao apagado");
    }

    console.log("\n" + (erros === 0 ? "*** BANCO FECHADO 10/10 ***" : "*** " + erros + " ERRO(S) NO BANCO FECHADO ***"));
    process.exit(erros ? 1 : 0);
})();