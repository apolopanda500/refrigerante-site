/* 43 - OS DADOS DO CLIENTE VIA CIFRADOS (10/10)
   Fechar o banco do Firebase depende de uma permissao que so o dono do
   projeto concede no console do Google. Enquanto isso nao vem, o banco fica
   aberto na internet - e qualquer pessoa podia abrir o endereco e ler nome,
   telefone, CPF e endereco de quem comprou.

   A solucao que nao depende de ninguem: o gateway CIFRA esses dados antes de
   gravar. Quem abre o banco na internet ve um bloco de letras sem sentido.
   Quem descifra e so o gateway, com a chave que mora no segredo do Worker -
   por isso o dono continua vendo tudo normalmente no painel.

   Aqui provamos rodando o gateway de verdade, com banco falso:
     - nenhum dado pessoal fica em texto puro no que foi gravado
     - status, valor e regiao continuam visiveis (o sistema precisa filtrar)
     - o dono volta a ver tudo no painel, e o cliente ve o proprio pedido
     - mudar o status nao quebra nem destrava a cifra
   O codigo do gateway nunca chega auffle o texto puro no caminho do banco.
*/const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dir = process.env.WDIR || path.resolve(__dirname, "..");
(async function () {
    let erros = 0;
    const ok = (m) => console.log("  ok  " + m);
    const falha = (m) => { console.log("  ERRO " + m); erros++; };

    /* o gateway le o ambiente no carregamento: as variaveis tem de estar PRIMEIRO */
    const par0 = await crypto.webcrypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["sign", "verify"]);
    const pk0 = await crypto.webcrypto.subtle.exportKey("pkcs8", par0.privateKey);
    const pem0 = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(pk0).toString("base64") + "\n-----END PRIVATE KEY-----";
    process.env.FB_DB_URL = "https://fake-db.firebaseio.com";
    process.env.FB_SA_EMAIL = "teste@exemplo.com";
    process.env.FB_SA_KEY = pem0;
    process.env.SESSAO_SEGREDO = "segredo-de-teste-123";
    process.env.LOJA_SENHA = "senha123";
    const mod = await import("file:///" + path.join(dir, "worker/convencao-gateway.js").replace(/\\/g, "/"));
    const worker = mod.default;

    const par = await crypto.webcrypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["sign", "verify"]);
    const pkcs8 = new Uint8Array(await par.privateKey ? 0 : 0);
    const pk = await crypto.webcrypto.subtle.exportKey("pkcs8", par.privateKey);
    const pem = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(pk).toString("base64") + "\n-----END PRIVATE KEY-----";

    /* banco falso que guarda o que o gateway MANDOU */
    const guardado = {};
    globalThis.fetch = async function (url, op) {
        const u = String(url);
        if (/identitytoolkit|oauth2/.test(u)) return { ok: false, status: 400, json: async () => ({}), text: async () => "" };
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


    const pedido = {
        id: "CV20260101-001-00001", nome: "Maria da Silva", tel: "21988887777", cpf: "12345678909",
        end: "Rua das Flores, 123 - apto 41", bairro: "Japeri", regiao: "japeri",
        pagamento: "Pix", troco: "", observacao: " interfone quebrado",
        itens: [{ name: "Guarana 350ml", qty: 2, priceNum: 19, subtotal: 38 }, { name: "Coca 2L", qty: 2, priceNum: 35, subtotal: 70 }],
        subtotal: 108, frete: 12, total: 120, status: "aguardando",
        criadoEm: 1, atualizadoEm: 1, historico: [{ status: "aguardando", quando: 1 }]
    };

    const r = await worker.fetch(new Request("https://gw/api/pedido", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: pedido })
    }));
    const criado = await r.json();
    if (r.status === 200 && criado.ok) ok("pedido gravado");
    else { falha("nao gravou: " + r.status + " " + JSON.stringify(criado)); }

    /* o que esta NO BANCO agora */
    const noBanco = guardado.pedidos[pedido.id];
    const texto = JSON.stringify(noBanco);
    console.log("  --- o que ficou gravado no banco ---");
    console.log("  " + texto.slice(0, 260));
    console.log("  ----------------------------------");

    const segredos = ["Maria da Silva", "21988887777", "12345678909", "Rua das Flores", "interfone quebrado", "Japeri"];
    const vazou = segredos.filter(function (s) { return texto.indexOf(s) >= 0; });
    if (!vazou.length) ok("NENHUM dado pessoal esta em texto puro no banco (nome, telefone, CPF, endereco, observacao, bairro)");
    else falha("ainda vazou em texto puro: " + vazou.join(" | "));

    if (noBanco.sig && String(noBanco.sig).indexOf("c1.") === 0) ok("os dados estao num bloco cifrado (" + String(noBanco.sig).slice(0, 18) + "...)");
    else falha("o bloco cifrado nao foi criado");

    /* o que o dono precisa continua em claro, para o sistema filtrar */
    if (noBanco.status === "aguardando" && noBanco.total === 120 && noBanco.regiao === "japeri") ok("status, valor e regiao continuam visiveis (o sistema precisa disso para filtrar)");
    else falha("o que o sistema precisa sumiu: " + JSON.stringify(noBanco).slice(0, 120));

    /* e o painel recebe tudo de volta, legivel */
    const login = await worker.fetch(new Request("https://gw/api/entrar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha: "senha123" })
    }));
    const lj = await login.json();
    const lista = await worker.fetch(new Request("https://gw/api/pedidos", { headers: { Authorization: "Bearer " + lj.token } }));
    const dados = await lista.json();
    const visto = dados[pedido.id];
    if (visto && visto.cpf === pedido.cpf && visto.nome === pedido.nome && visto.end === pedido.end && visto.bairro === pedido.bairro) {
        ok("o dono volta a ver TUDO no painel: nome, telefone, CPF, endereco e bairro");
    } else {
        falha("o painel nao recebeu os dados de volta: " + JSON.stringify(visto).slice(0, 200));
    }

    /* e o cliente ve o proprio pedido com a chave dele */
    const chave = criado.chave;
    const meu = await worker.fetch(new Request("https://gw/api/meu-pedido?id=" + encodeURIComponent(pedido.id), { headers: { "X-Chave-Pedido": chave } }));
    const md = await meu.json();
    if (md && md.nome === pedido.nome) ok("o cliente ve o proprio pedido (decifrado pelo gateway)");
    else falha("o cliente nao viu o proprio pedido: " + JSON.stringify(md).slice(0, 140));

    /* mudar o status nao perde os dados */
    const st = await worker.fetch(new Request("https://gw/api/status", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + lj.token },
        body: JSON.stringify({ id: pedido.id, status: "confirmado" })
    }));
    const sjson = await st.json();
    if (st.status === 200 && sjson.pedido && sjson.pedido.cpf === pedido.cpf) ok("mudar o status nao estraga os dados do cliente");
    else falha("mudanca de status perdeu dados: " + JSON.stringify(sjson).slice(0, 160));
    const depois = JSON.stringify(guardado.pedidos[pedido.id]);
    if (depois.indexOf("12345678909") < 0) ok("e continua cifrado depois da mudanca (nao regravou em texto puro)");
    else falha("a mudanca de status regravou o CPF em texto puro");

    console.log("\n" + (erros === 0 ? "*** OS DADOS DO CLIENTE VIA CIFRADOS 10/10 ***" : "*** " + erros + " FALHA(S) ***"));
    process.exit(erros ? 1 : 0);
})();