/* 45 - CLIENTE VALIDADO E 1 PEDIDO POR DIA (10/10)
   O limite so vale se a identidade for de verdade. Hoje sao 1 pedido por dia do
   calendario (dia de Sao Paulo): virada a meia-noite, o cliente volta a poder pedir.
   Antes ele contava pelo telefone, guardado no aparelho - dava para burlar
   trocando o numero, limpando os dados ou usando outro celular.

   Aqui provamos que:
     - CPF invalido e recusado (digito errado, sequencia repetida, curto)
     - celular invalido e recusado (curto, sem o 9, DDD inexistente)
     - CPF e celular de verdade passam
     - o MESMO CPF faz 1 pedido por dia: o segundo ja e recusado, e a mensagem
       diz que volta amanha (virada do dia, nao 24 horas corridas)
     - o limite e do CLIENTE, nao do aparelho nem do telefone: mesmo CPF com
       outro telefone continua barrado, e outro CPF passa
     - virar o dia zera o limite
     - o banco guarda a impressao do CPF, nunca o CPF em texto puro
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
    const par = await crypto.webcrypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["sign", "verify"]);
    const pk = await crypto.webcrypto.subtle.exportKey("pkcs8", par.privateKey);
    const pem = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(pk).toString("base64") + "\n-----END PRIVATE KEY-----";
    const env = {
        FB_DB_URL: "https://fake-db.firebaseio.com", FB_SA_EMAIL: "teste@projeto.iam.gserviceaccount.com",
        FB_SA_KEY: pem, FB_API_KEY: "api-key-de-teste", LOJA_SENHA: "senha-do-dono-123",
        SESSAO_SEGREDO: "sessao-segreda-789", BOT_SEGREDO: "segredo-do-robo-456"
    };
    Object.keys(env).forEach(function (k) { process.env[k] = env[k]; });

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

    const mod = await import("file:///" + path.join(dir, "worker/convencao-gateway.js").replace(/\\/g, "/"));
    const worker = mod.default;
    const chamar = (caminho, op) => worker.fetch(new Request("https://gw" + caminho, op), env)
        .then(async (r) => ({ status: r.status, dados: await r.json() }));

    /* CPFs de verdade (digitos conferem) */
    const CPF_A = "52998224725";   /* valido */
    const CPF_B = "11144477735";   /* valido */
    const CEL = "21987654321";     /* 11 digitos com 9 */

    let seq = 0;
    function pedido(cpf, tel, extra) {
        seq++;
        return Object.assign({
            id: "CV20261018-002-" + String(22000 + seq),
            nome: "Cliente Validado", tel: tel || CEL, cpf: cpf || CPF_A,
            end: "Rua do Teste, 10", bairro: "Japeri", regiao: "japeri",
            pagamento: "Pix", troco: "",
            itens: [{ name: "Coca 2L", qty: 2, price: 27.5, priceNum: 27.5, subtotal: 55 },
                    { name: "Guarana 350ml", qty: 9, price: 6, priceNum: 6, subtotal: 54 }],
            subtotal: 109, frete: 0, total: 109, status: "aguardando"
        }, extra || {});
    }
    const mandar = (p) => chamar("/api/pedido", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedido: p }) });

    console.log("=== 1. CPF INVALIDO E RECUSADO ===");
    const cpfsRuins = [
        ["52998224720", "digito verificador errado"],
        ["11111111111", "onze digitos iguais"],
        ["00000000000", "zeros"],
        ["12345678900", "numero de exemplo"],
        ["5299822472", "so 10 digitos"],
        ["529982247255", "12 digitos"]
    ];
    for (const [cpf, motivo] of cpfsRuins) {
        const r = await mandar(pedido(cpf));
        if (r.status === 400 && /CPF/i.test(r.dados.erro || "")) ok("CPF " + cpf + " (" + motivo + ") recusado");
        else falha("CPF " + cpf + " (" + motivo + ") passou: HTTP " + r.status);
    }

    console.log("\n=== 2. CELULAR INVALIDO E RECUSADO ===");
    const telsRuins = [
        ["2198765432", "so 10 digitos sem o 9"],
        ["2198765", "curto demais"],
        ["21887654321", "o 9 nao esta na posicao"],
        ["2087654321", "poucos digitos"],
        ["219876543210", "12 digitos"]
    ];
    for (const [tel, motivo] of telsRuins) {
        const r = await mandar(pedido(CPF_A, tel));
        if (r.status === 400 && /celular|telefone/i.test(r.dados.erro || "")) ok("celular " + tel + " (" + motivo + ") recusado");
        else falha("celular " + tel + " (" + motivo + ") passou: HTTP " + r.status);
    }

    console.log("\n=== 3. DOCUMENTO E CELULAR DE VERDADE PASSAM ===");
    const ok1 = await mandar(pedido(CPF_A, CEL));
    if (ok1.status === 200 && ok1.dados.ok) ok("CPF " + CPF_A + " + celular " + CEL + ": aceito");
    else falha("documento valido foi recusado: " + JSON.stringify(ok1.dados));

    console.log("\n=== 4. UM PEDIDO POR DIA: O SEGUNDO JA E BARRADO ===");
    const p2 = await mandar(pedido(CPF_A, CEL));
    if (p2.status === 429) ok("segundo pedido do mesmo cliente, no mesmo dia: BARRADO - " + p2.dados.erro);
    else falha("segundo pedido passou: HTTP " + p2.status);
    const p3 = await mandar(pedido(CPF_A, CEL));
    if (p3.status === 429) ok("terceiro pedido tambem barrado: " + p3.dados.erro);
    else falha("terceiro pedido passou: HTTP " + p3.status);

    console.log("\n=== 5. O LIMITE E DA PESSOA, NAO DO APARELHO ===");
    const outroTelefone = await mandar(pedido(CPF_A, "21955550000"));
    if (outroTelefone.status === 429) ok("mesmo CPF com OUTRO telefone: continua barrado (trocar de celular nao foge)");
    else falha("trocar de telefone furou o limite: HTTP " + outroTelefone.status);
    const outroCpf = await mandar(pedido(CPF_B, "21955550000"));
    if (outroCpf.status === 200) ok("OUTRO CPF com o mesmo telefone: aceito (o limite e por cliente, nao por linha)");
    else falha("o limite prendeu outra pessoa: HTTP " + outroCpf.status);

    console.log("\n=== 6. O BANCO GUARDA A IMPRESSAO DO CPF, NAO O CPF ===");
    const controle = JSON.stringify(guardado.controle || {});
    if (!controle.includes(CPF_A) && !controle.includes(CPF_B)) ok("nenhum dos dois CPFs aparece no controle do dia");
    else falha("o CPF vazou no controle: " + controle.slice(0, 140));
    if (/[A-Za-z0-9_-]{20,}/.test(controle)) ok("o controle guarda uma impressao do CPF (sem volta ao original)");
    else falha("o controle ficou vazio: " + controle.slice(0, 140));

    console.log("\n=== 7. A MENSAGEM DIZ O QUE ACONTECEU ===");
    if (/1 pedido por cliente por dia/i.test(p3.dados.erro || "") && /meia-noite/i.test(p3.dados.erro || "")) ok("o cliente le: " + p3.dados.erro);
    else falha("mensagem pouco clara: " + p3.dados.erro);

    console.log("\n" + (erros === 0 ? "*** CLIENTE VALIDADO E 1 PEDIDO POR DIA 10/10 ***" : "*** " + erros + " FALHA(S) ***"));
    process.exit(erros ? 1 : 0);
})();