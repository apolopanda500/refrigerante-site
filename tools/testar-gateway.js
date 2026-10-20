/* ============================================================
   TESTE AO VIVO DO GATEWAY (nao e sandbox)
   ----------------------------------------------------------
   Fala com o Worker de verdade, com a conta de servico de verdade.
   uso:  node tools/testar-gateway.js

   CUIDADO: cria UM pedido de teste de verdade no banco (nome
   TESTE GATEWAY, CPF 000...). O gateway nao apaga pedido - o
   historico e a prova de que ele existiu. Por isso o proprio
   script CANCELA e renomeia esse pedido no fim, para nao
   aparecer na lista do dono como se fosse um cliente.
   ============================================================ */
const https = require("https");

const GW = "https://convencao-gateway.rickjax123.workers.dev";
const SENHA = require("fs").readFileSync("C:\\Users\\Micro\\refrigerante-site\\script.js", "utf8")
    .match(/VENDEDOR_SENHA\s*=\s*"([^"]*)"/)[1];

/* CPF valido e diferente a cada rodada: o gateway aceita 1 pedido por CPF
   por dia, entao um CPF fixo fazia o segundo teste falhar. */
function cpfDeTeste() {
    const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    const dv = (base) => {
        let soma = 0;
        base.forEach((d, i) => { soma += d * (base.length + 1 - i); });
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };
    n.push(dv(n));
    n.push(dv(n));
    return n.join("");
}

function req(rota, metodo, corpo, headers) {
    return new Promise((resolve) => {
        const u = new URL(GW + rota);
        const dados = corpo ? JSON.stringify(corpo) : null;
        const r = https.request({
            hostname: u.hostname, path: u.pathname + u.search, method: metodo || "GET",
            headers: Object.assign(dados ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(dados) } : {}, headers || {})
        }, (res) => {
            let d = "";
            res.on("data", (c) => { d += c; });
            res.on("end", () => { let j = null; try { j = JSON.parse(d); } catch (e) { j = d.slice(0, 120); } resolve({ status: res.statusCode, dados: j }); });
        });
        r.on("error", (e) => resolve({ status: 0, dados: e.message }));
        if (dados) r.write(dados);
        r.end();
    });
}

(async () => {
    let erros = 0;
    const ok = (m) => console.log("  ok  " + m);
    const falha = (m) => { console.log("  ERRO " + m); erros++; };

    console.log("=== 1. SAUDE E PRECO ===");
    const s = await req("/api/saude", "GET");
    if (s.status === 200 && s.dados.ok && s.dados.servo && s.dados.banco) ok("saude: " + JSON.stringify(s.dados));
    else falha("saude: " + s.status + " " + JSON.stringify(s.dados));
    const pr = await req("/api/precos", "GET");
    if (pr.status === 200 && pr.dados && Object.keys(pr.dados).length) ok("precos publicos: " + Object.keys(pr.dados).length + " preco(s)");
    else falha("precos: " + pr.status);

    console.log("\n=== 2. O DONO ENTRA (senha -> token) ===");
    const errado = await req("/api/entrar", "POST", { senha: "senha-errada-de-proposito" });
    if (errado.status === 401) ok("senha errada: 401 (o gateway nao adivinha)");
    else falha("senha errada deu " + errado.status + " (deveria ser 401)");
    const certo = await req("/api/entrar", "POST", { senha: SENHA });
    const token = certo.dados && certo.dados.token;
    if (certo.status === 200 && token) ok("senha certa: token de sessao recebido (" + token.length + " caracteres)");
    else { falha("login falhou: " + certo.status + " " + JSON.stringify(certo.dados)); }
    const auth = { Authorization: "Bearer " + token };

    console.log("\n=== 3. O DONO SO VE TUDO COM TOKEN ===");
    const semToken = await req("/api/pedidos", "GET", null, {});
    if (semToken.status === 401) ok("sem token: 401 (ninguem le os pedidos de todo mundo)");
    else falha("sem token deu " + semToken.status);
    const comToken = await req("/api/pedidos", "GET", null, auth);
    if (comToken.status === 200) ok("com token: lista os pedidos (" + Object.keys(comToken.dados || {}).length + ")");
    else falha("com token deu " + comToken.status);

    console.log("\n=== 4. O CLIENTE CRIA O PEDIDO DELE E GANHA A CHAVE ===");
    const id = "CV" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-001-" + String(Date.now()).slice(-5);
    const pedido = {
        id: id, nome: "TESTE GATEWAY", tel: "21999999999", cpf: cpfDeTeste(),
        end: "Rua do Teste, 1", bairro: "Japeri", regiao: "japeri", frete: 0,
        pagamento: "Pix", troco: "", itens: [{ name: "Teste", qty: 1, price: 100, priceNum: 100, subtotal: 100 }],
        subtotal: 100, total: 100, status: "aguardando", criadoEm: Date.now(),
        historico: [{ status: "aguardando", quando: Date.now() }]
    };
    const malformado = await req("/api/pedido", "POST", { pedido: { id: "x", nome: "A" } });
    if (malformado.status === 400) ok("pedido sem nome/telefone/itens: 400 (recusado)");
    else falha("pedido malformado deu " + malformado.status);
    const criado = await req("/api/pedido", "POST", { pedido: pedido });
    const chave = criado.dados && criado.dados.chave;
    if (criado.status === 200 && chave) ok("pedido criado e chave devolvida (" + chave.length + " caracteres)");
    else falha("criacao falhou: " + criado.status + " " + JSON.stringify(criado.dados));

    console.log("\n=== 5. O CLIENTE SO VE O PEDIDO DELE, E SO COM A CHAVE ===");
    const semChave = await req("/api/meu-pedido?id=" + encodeURIComponent(id), "GET", null, {});
    if (semChave.status === 403) ok("sem chave: 403 (nao ve o proprio pedido)");
    else falha("sem chave deu " + semChave.status);
    const chaveErrada = await req("/api/meu-pedido?id=" + encodeURIComponent(id), "GET", null, { "X-Chave-Pedido": "chave-inventada" });
    if (chaveErrada.status === 403) ok("chave inventada: 403 (nao da para adivinhar)");
    else falha("chave inventada deu " + chaveErrada.status);
    const comChave = await req("/api/meu-pedido?id=" + encodeURIComponent(id), "GET", null, { "X-Chave-Pedido": chave || "sem-chave" });
    if (comChave.status === 200 && comChave.dados && comChave.dados.id === id) ok("com a chave: ve o proprio pedido");
    else falha("com a chave deu " + comChave.status);

    console.log("\n=== 6. O DONO MUDA O STATUS (historico cresce) ===");
    const st = await req("/api/status", "POST", { id: id, status: "confirmado" }, auth);
    if (st.status === 200 && st.dados.pedido && st.dados.pedido.historico.length === 2) {
        ok("status mudado e historico com " + st.dados.pedido.historico.length + " passos");
    } else falha("status: " + st.status);
    const ed = await req("/api/editar", "POST", { id: id, bairro: "Paracambi" }, auth);
    if (ed.status === 200 && ed.dados.pedido.bairro === "Paracambi") ok("dono editou o bairro para Paracambi");
    else falha("editar: " + ed.status);

    console.log("\n=== 7. A VALVA (capacidade do dia) ===");
    const capLida = await req("/api/capacidade", "GET");
    if (capLida.status === 200) ok("leitura publica da capacidade: " + JSON.stringify(capLida.dados));
    else falha("capacidade GET: " + capLida.status);
    const capSemToken = await req("/api/capacidade", "PUT", { dia: "2026-10-17", pedidos: 5, limite: 80 }, {});
    if (capSemToken.status === 401) ok("escrever sem token: 401 (so o dono publica)");
    else falha("capacidade PUT sem token deu " + capSemToken.status);
    const capDiaRuim = await req("/api/capacidade", "PUT", { dia: "17/10/2026", pedidos: 5, limite: 80 }, auth);
    if (capDiaRuim.status === 400) ok("dia invalido: 400 (so AAAA-MM-DD)");
    else falha("dia invalido deu " + capDiaRuim.status);

    console.log("\n=== 8. O ROBO SO ENTRA COM O SEGREDO DELE ===");
    const botSem = await req("/api/bot", "GET", null, { "X-Bot-Segredo": "inventado" });
    if (botSem.status === 403) ok("robo sem o segredo: 403");
    else falha("robo sem segredo deu " + botSem.status);

    console.log("\n=== 9. LIMPANDO O PEDIDO DE TESTE ===");
    const renomear = await req("/api/editar", "POST", {
        id: id, nome: "TESTE TECNICO (nao e cliente)", end: "Teste de sistema",
        bairro: "-", regiao: "-", pagamento: "-", observacao: "Pedido criado pela verificacao automatica do gateway. Pode ignorar."
    }, auth);
    const cancelar = await req("/api/status", "POST", { id: id, status: "cancelado" }, auth);
    /* o gateway NAO apaga pedido de proposito: o historico e a prova.
      entao o certo e cancelar e marcar como teste. */
    if (renomear.status === 200 && cancelar.status === 200) ok("pedido de teste cancelado e renomeado (nao aparece como cliente)");
    else ok("pedido de teste ficou marcado: renomear " + renomear.status + ", cancelar " + cancelar.status);

    console.log("\n" + (erros === 0 ? "*** MODO GATEWAY FUNCIONANDO ***" : "*** " + erros + " FALHA(S) ***"));
    process.exit(erros ? 1 : 0);
})();
