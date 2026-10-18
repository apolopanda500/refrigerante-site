/* 44 - PEDIDO MINIMO TRAVADO NO SERVIDOR (10/10)
   O carrinho do cliente ja avisava "pedido minimo R$ 100,00" e nao deixava
   fechar. Mas isso era so do lado dele: quem chamasse a API direto - ou
   abrisse o app no celular e contornasse o aviso - passava por cima, e pedido
   de R$ 6,00 entrava. Foi o que a simulacao de um dia cheio pegou.

   Aqui provamos que a regra esta no SERVIDOR, que e o unico lugar que nao da
   para burlar:
     - abaixo do minimo e recusado, com o valor que falta
     - exatamente no minimo passa
     - acima do minimo passa
     - a comparacao e pelo subtotal, igual ao carrinho (o frete nao conta)
     - o dinheiro do pedido tambem nao pode ser inventado para furar a regra
     - o site recebe o mesmo numero que o servidor exige
   O gateway e executado de verdade, com banco falso.
*/
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const ok = (m) => console.log("  ok  " + m);
const falha = (m) => { console.log("  ERRO " + m); erros++; };

(async function () {
    /* ambiente ANTES de carregar o gateway */
    const par = await crypto.webcrypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["sign", "verify"]);
    const pk = await crypto.webcrypto.subtle.exportKey("pkcs8", par.privateKey);
    const pem = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(pk).toString("base64") + "\n-----END PRIVATE KEY-----";
    process.env.FB_DB_URL = "https://fake-db.firebaseio.com";
    process.env.FB_SA_EMAIL = "teste@projeto.iam.gserviceaccount.com";
    process.env.FB_SA_KEY = pem;
    process.env.FB_API_KEY = "api-key-de-teste";
    process.env.LOJA_SENHA = "senha-do-dono-123";
    process.env.SESSAO_SEGREDO = "sessao-segreda-789";
    process.env.BOT_SEGREDO = "segredo-do-robo-456";

    const mod = await import("file:///" + path.join(dir, "worker/convencao-gateway.js").replace(/\\/g, "/"));
    const worker = mod.default;

    /* banco falso */
    const guardado = {};
    globalThis.fetch = async function (url, op) {
        const u = String(url);
        if (/identitytoolkit\.googleapis\.com/.test(u)) return { ok: true, status: 200, json: async () => ({ idToken: "sessao-fake" }) };
        const caminho = decodeURIComponent(u.split("?")[0].replace(/^https:\/\/fake-db\.firebaseio\.com/, "").replace(/\.json$/, ""));
        const metodo = (op && op.method) || "GET";
        if (metodo === "PUT") {
            const partes = caminho.split("/").filter(Boolean);
            let alvo = guardado;
            for (let i = 0; i < partes.length - 1; i++) { alvo[partes[i]] = alvo[partes[i]] || {}; alvo = alvo[partes[i]]; }
            alvo[partes[partes.length - 1]] = JSON.parse(op.body);
            return { ok: true, status: 200, text: async () => JSON.stringify(alvo[partes[partes.length - 1]]) };
        }
        let v = guardado;
        for (const p of caminho.split("/").filter(Boolean)) v = v ? v[p] : null;
        return { ok: true, status: 200, text: async () => (v === null || v === undefined ? "null" : JSON.stringify(v)) };
    };

    const env = {
        FB_DB_URL: "https://fake-db.firebaseio.com", FB_SA_EMAIL: "teste@projeto.iam.gserviceaccount.com",
        FB_SA_KEY: pem, FB_API_KEY: "api-key-de-teste", LOJA_SENHA: "senha-do-dono-123",
        SESSAO_SEGREDO: "sessao-segreda-789", BOT_SEGREDO: "segredo-do-robo-456"
    };
    const chamar = (caminho, op) => worker.fetch(new Request("https://gateway.exemplo.com" + caminho, op), env)
        .then(async (r) => ({ status: r.status, dados: await r.json() }));

    /* um cliente novo por cenario: o limite e 2 por cliente por dia */
    const CPFS = ["52900000033", "52900000114", "52900000203", "52900000386", "52900000467", "52900000548", "52900000629", "52900000700", "52900000890", "52900000971", "52900001005", "52900001196", "52900001277", "52900001358", "52900001439", "52900001510", "52900001609", "52900001781", "52900001862", "52900001943"];
    let seq = 0;
    function pedido(total, extras) {
        const uso = seq++;
        return Object.assign({
            id: "CV20261018-001-5" + String(1000 + seq), nome: "Cliente Teste", tel: "21987654321", cpf: CPFS[uso % CPFS.length],
            end: "Rua do Teste, 10", bairro: "Japeri", regiao: "japeri", pagamento: "Pix", troco: "",
            itens: [{ name: "Guarana 350ml", qty: 1, price: total, priceNum: total, subtotal: total }],
            subtotal: total, frete: 0, total: total, status: "aguardando"
        }, extras || {});
    }
    const mandar = (p) => chamar("/api/pedido", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: p })
    });

    console.log("=== 1. ABAIXO DO MINIMO E RECUSADO ===");
    for (const v of [6, 28, 55, 99.9, 99.99]) {
        const r = await mandar(pedido(v));
        if (r.status === 400 && /minimo/i.test(r.dados.erro || "")) ok("R$ " + v.toFixed(2).replace(".", ",") + " recusado: " + r.dados.erro);
        else falha("R$ " + v + " passou (HTTP " + r.status + ") - deveria ter sido barrado");
    }

    console.log("\n=== 2. O ERRO DIZ QUANTO FALTA ===");
    const f1 = await mandar(pedido(60));
    if (/R\$ 40,00/.test(f1.dados.erro || "")) ok("o cliente descobre o quanto falta: " + f1.dados.erro);
    else falha("o erro nao diz quanto falta: " + f1.dados.erro);

    console.log("\n=== 3. NO MINIMO E ACIMA, PASSA ===");
    for (const v of [100, 100.01, 150, 579.4]) {
        const r = await mandar(pedido(v));
        if (r.status === 200 && r.dados.ok) ok("R$ " + v.toFixed(2).replace(".", ",") + " aceito");
        else falha("R$ " + v + " foi barrado: " + JSON.stringify(r.dados));
    }

    console.log("\n=== 4. O FRETE NAO CONTA (igual ao carrinho) ===");
    const comFrete = await mandar(pedido(100, { subtotal: 100, frete: 18, total: 118 }));
    if (comFrete.status === 200) ok("R$ 100,00 de pedidos + R$ 18,00 de frete entra (o minimo e sobre o que o cliente compra)");
    else falha("freteContaminou a regra: " + JSON.stringify(comFrete.dados));
    const subtotalBaixo = await mandar(pedido(60, { subtotal: 60, frete: 60, total: 120 }));
    if (subtotalBaixo.status === 400) ok("frete de R$ 60,00 NAO conta para virar pedido de R$ 120,00 - o minimo e sobre o subtotal");
    else falha("deixou passar inflando o frete: HTTP " + subtotalBaixo.status);

    console.log("\n=== 5. NAO DA PARA FURAR INVENTANDO O DINHEIRO ===");
    const inflado = await mandar({ nome: "X", tel: "21987654321", itens: [{ name: "a", qty: 1 }], subtotal: 99.9, total: 9999, status: "aguardando", id: "CV20261018-001-99001" });
    if (inflado.status === 400) ok("total inflado para R$ 9.999,00 com subtotal de R$ 99,90 foi barrado (a regra olha o subtotal)");
    else falha("deixou passar com total inventado: HTTP " + inflado.status);
    const semSubtotal = await mandar({ nome: "X", tel: "21987654321", itens: [{ name: "a", qty: 1 }], total: 50, status: "aguardando", id: "CV20261018-001-99002" });
    if (semSubtotal.status === 400) ok("pedido sem subtotal declarado tambem e barrado");
    else falha("pedido sem subtotal passou: HTTP " + semSubtotal.status);

    console.log("\n=== 6. O SITE RECEBE O MESMO NUMERO QUE O SERVIDOR EXIGE ===");
    const cap = await chamar("/api/capacidade");
    if (cap.status === 200 && Number(cap.dados.pedidoMinimo) === 100) ok("/api/capacidade avisa: pedidoMinimo = 100 (o carrinho trava no mesmo valor)");
    else falha("o site nao sabe o minimo do servidor: " + JSON.stringify(cap.dados));
    guardado.config = { pedidoMinimo: 120 };
    /* o dono mudou o minimo: recarrega o processo para nao usar o cache */
    const mod2 = await import("file:///" + path.join(dir, "worker/convencao-gateway.js").replace(/\\/g, "/") + "?v=2");
    const cap2 = await mod2.default.fetch(new Request("https://gw/api/capacidade"), env).then((r) => r.json());
    if (Number(cap2.pedidoMinimo) === 120) ok("o dono consegue mudar o minimo (gravou /config/pedidoMinimo = 120) e o site acompanha");
    else falha("a mudanca do minimo nao valeu: " + JSON.stringify(cap2));

    console.log("\n" + (erros === 0 ? "*** PEDIDO MINIMO TRAVADO 10/10 ***" : "*** " + erros + " FALHA(S) ***"));
    process.exit(erros ? 1 : 0);
})();