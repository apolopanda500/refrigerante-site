/* 35 - DIA DE TRABALHO DE VERDADE (SIMULACAO) (10/10)
   Simula um dia inteiro de vendas como o dono vive:
     - 5 clientes diferentes, de 4 regioes, com pedidos e telefones reais
     - os pedidos chegam de 5 "aparelhos" diferentes pela nuvem
     - o painel do dono ve tudo junto (inclusive o que veio de outro aparelho)
     - o dono passa cada pedido por confirmar -> separacao -> enviado -> entregue
     - um pedido e editado no meio do caminho (bairro trocado)
     - um pedido e cancelado e depois reaberto
     - a ficha, a busca por nome/telefone/bairro, o resumo do dia e o CSV
     - o robô do Telegram aplica os mesmos botoes (st|ed|rb) sem rede
   Tudo em sandbox: nenhum pedido vai para o banco de verdade e nenhuma
   mensagem sai para o Telegram do dono. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

/* ---------- como nasce um aparelho do cliente ---------- */
function novoCliente(nome, tel, bairro, regiao, itens, pagamento, troco) {
    const ctx = {
        console,
        localStorage: {
            _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
            setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; }
        },
        document: { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { setAttribute: () => {} }, body: { classList: { add() {}, remove() {}, toggle() {} } } },
        location: { href: "https://apolopanda500.github.io/refrigerante-site/carrinho.html", pathname: "/refrigerante-site/carrinho.html", reload: () => {} },
        navigator: { userAgent: "teste", vibrate: () => {} },
        setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
        fetch: () => Promise.reject(new Error("sem rede")),
        alert: () => {}, confirm: () => true, Image: function () {}
    };
    ctx.window = ctx;
    ctx.addEventListener = () => {};
    vm.createContext(ctx);
    vm.runInContext(ler("loja.js"), ctx);
    vm.runInContext(ler("conta.js"), ctx);
    vm.runInContext(ler("script.js"), ctx);
    ctx.localStorage.setItem("refrigerantePrefs", JSON.stringify({ nome: "Cliente Dia", cpf: "15350946056", tel: "21987654321", bairro: "Japeri" }));
const pedido = vm.runInContext("criarPedido", ctx)({
        cpf: "15350946056",
        nome: nome, tel: tel, cpf: "", end: "Rua " + bairro + ", 100", comp: "casa " + (1 + (nome.length % 40)),
        bairro: bairro, regiao: regiao, frete: 12, pagamento: pagamento, troco: troco || "",
        itens: itens.map(function (i) { return { name: i[0], qty: i[1], price: i[2], priceNum: i[2], subtotal: i[2] * i[1] }; }),
        subtotal: itens.reduce(function (t, i) { return t + i[2] * i[1]; }, 0),
        total: itens.reduce(function (t, i) { return t + i[2] * i[1]; }, 0) + 12
    });
    return { ctx: ctx, pedido: pedido };
}

/* ---------- 1. cinco clientes, cinco aparelhos ---------- */
console.log("=== 1. CHEGAM 5 PEDIDOS DE 5 APARELHOS DIFERENTES ===");
const CLIENTES = [
    ["Ana Ribeiro", "(21) 98811-2233", "Japeri", "japeri", [["Guarana 350ml", 6, 19]], "Dinheiro", "50,00"],
    ["Bruno Costa", "(21) 97722-3344", "Seropedica", "seropedica", [["Chinotto 269ml", 3, 8.5]], "Pix", ""],
    ["Carla Souza", "(21) 96633-4455", "Paracambi", "paracambi", [["Coca-Cola 2L", 2, 27.5], ["Agua 510ml", 6, 4]], "Pix", ""],
    ["Diego Alves", "(21) 95544-5566", "Engenho Pedreira", "engenhopedreira", [["Frutaina 2L", 1, 27.5]], "Dinheiro", "100,00"],
    ["Elisa Nunes", "(21) 94455-6677", "Japeri", "japeri", [["Guarana Zero 12un", 1, 33.4]], "Pix", ""]
];
const aparelhos = CLIENTES.map(function (c) { return novoCliente(c[0], c[1], c[2], c[3], c[4], c[5], c[6]); });
const perdidos = aparelhos.filter(a => !a.pedido || !a.pedido.id);
if (perdidos.length) falha((6 - perdidos.length) + " pedido(s) nem chegaram a ser criados");
aparelhos.forEach(function (a) {
    const p = a.pedido;
    if (!/^CV\d{8}-\d{3}-\d{5}$/.test(p.id)) falha("id fora do padrao: " + p.id);
    if (p.status !== "aguardando") falha("pedido nasceu com status " + p.status);
});
const todosIds = aparelhos.map(a => a.pedido.id);
if (new Set(todosIds).size !== todosIds.length) falha("dois clientes receberam o MESMO numero de pedido: " + todosIds.join(", "));
else ok("5 numeros diferentes (nenhum pedido sobrescreve o outro): " + todosIds.join(", "));
const telefones = aparelhos.map(a => a.pedido.tel);
if (new Set(telefones).size !== 5) falha("telefones repetidos entre clientes");
else ok("5 telefones diferentes (cada cliente ve so o seu)");
const valores = aparelhos.map(a => a.pedido.total);
if (valores.some(v => !(v > 0))) falha("pedido sem total");
else ok("totais: " + valores.map(v => "R$ " + v.toFixed(2)).join(", "));

/* ---------- 2. a nuvem junta tudo num painel so ---------- */
console.log("\n=== 2. O PAINEL DO DONO VE OS 5 PEDIDOS ===");
const nuvem = {};
aparelhos.forEach(function (a) { nuvem[a.pedido.id] = JSON.parse(JSON.stringify(a.pedido)); });
let listaPainel = null;
const painelCtx = {
    console,
    localStorage: {
        _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
        setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; }
    },
    document: { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { setAttribute: () => {} }, body: { classList: { add() {}, remove() {}, toggle() {} } } },
    location: { href: "https://apolopanda500.github.io/refrigerante-site/admin.html", pathname: "/refrigerante-site/admin.html", reload: () => {} },
    navigator: { userAgent: "teste", vibrate: () => {} },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
    fetch: (url, op) => {
        if ((op && op.method) === "PUT") { return Promise.resolve({ ok: true }); }
        if (url.indexOf("/pedidos.json") >= 0) return Promise.resolve({ ok: true, json: () => Promise.resolve(nuvem) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    },
    alert: () => {}, confirm: () => true, Image: function () {}
};
painelCtx.window = painelCtx;
painelCtx.addEventListener = () => {};
/* esta simula o painel no CAMINHO ANTIGO (o das bases do Firebase).
   O modo gateway (padrao do site) e coberto pelas baterias 32 e 38;
   aqui o que importa e o dono juntar os pedidos de todos os aparelhos,
   que e o caminho cru. A valvula de escape e cfgGatewayOff. */
painelCtx.localStorage.setItem("vendedorPrefs", JSON.stringify({ cfgGatewayOff: true }));
vm.createContext(painelCtx);
vm.runInContext(ler("loja.js"), painelCtx);
vm.runInContext(ler("script.js"), painelCtx);
const painel = vm.runInContext("({ pedidos: () => getPedidos(), atualizarStatus, pedidoPorId: (id) => getPedidos().filter(p => p.id === id)[0], mesclar: mesclarPedidos })", painelCtx);

vm.runInContext("var __lista = null; sincronizarPedidosNuvem(function (l) { __lista = l; });", painelCtx);

setTimeout(function () {
    listaPainel = painelCtx.__lista;
    if (!listaPainel || listaPainel.length !== 5) {
        falha("o painel nao recebeu os 5 pedidos (" + (listaPainel ? listaPainel.length : 0) + ")");
    } else ok("painel com " + listaPainel.length + " pedidos de 5 clientes diferentes");

    const todos = painel.pedidos();
    if (todos.length !== 5) falha("o painel guardou " + todos.length + " pedidos");
    else ok("painel guardou os 5 no aparelho dele (funciona mesmo sem internet)");

    /* ---------- 3. o dono passa cada pedido pelas etapas ---------- */
    console.log("\n=== 3. O DONO CONFIRMA, SEPARA, ENVIA E ENTREGA ===");
    const etapas = ["confirmado", "separacao", "enviado", "entregue"];
    let problemas = [];
    todos.forEach(function (p) {
        etapas.forEach(function (st) {
            painel.atualizarStatus(p.id, st);
            const agora = painel.pedidoPorId(p.id);
            if (!agora) { problemas.push(p.id + " sumiu depois de " + st); return; }
            if (agora.status !== st) problemas.push(p.id + " ficou em " + agora.status + " (esperava " + st + ")");
            /* 1 passo inicial + um por etapa: depois da etapa i tem que ter i+2 */
            if (!Array.isArray(agora.historico) || agora.historico.length !== etapas.indexOf(st) + 2) {
                problemas.push(p.id + " com historico curto em " + st + " (" + agora.historico.length + ")");
            }
        });
    });
    if (problemas.length) falha("fluxo do painel: " + problemas.slice(0, 3).join(" | "));
    else ok("os 5 pedidos andaram pelas 4 etapas, cada passo com data/hora");

    /* ---------- 4. editar um pedido no meio do caminho ---------- */
    console.log("\n=== 4. O DONO EDITA UM PEDIDO (bairro trocado) ===");
    /* edicao de verdade: pega, muda e grava, como o painel faz */
    const idEdit = aparelhos[0].pedido.id;
    vm.runInContext("(function (id) {"
        + " var ps = getPedidos();"
        + " var p = ps.filter(function (x) { return x.id === id; })[0];"
        + " p.bairro = 'Paracambi'; p.regiao = 'paracambi';"
        + " savePedidos(ps); return p;"
        + "})", painelCtx)(idEdit);
    const editado = painel.pedidoPorId(idEdit);
    if (editado.bairro !== "Paracambi") falha("a edicao do bairro nao ficou salva");
    else ok("bairro de " + CLIENTES[0][2] + " corrigido para Paracambi (edicao do painel)");
    /* a edicao nao pode inventar etapa nova nem quebrar o historico */
    if (editado.historico.length !== 5) falha("editar mudou o historico (" + editado.historico.length + " passos)");
    else ok("editar nao mexeu no historico: continua com " + editado.historico.length + " passos");

    /* ---------- 5. cancelar e reabrir ---------- */
    console.log("\n=== 5. CANCELAR E REABRIR ===");
    const alvo2 = painel.pedidoPorId(aparelhos[1].pedido.id);
    painel.atualizarStatus(alvo2.id, "cancelado");
    const cancelado = painel.pedidoPorId(alvo2.id);
    if (cancelado.status !== "cancelado") falha("nao cancelou");
    else ok("pedido cancelado: " + cancelado.id);
    painel.atualizarStatus(alvo2.id, "aguardando");
    const reaberto = painel.pedidoPorId(alvo2.id);
    if (reaberto.status !== "aguardando") falha("nao reabriu");
    else ok("pedido reaberto volta para aguardando (o cliente ve de novo)");
    if (reaberto.historico.length < 6) falha("o historico do pedido reaberto ficou curto");
    else ok("historico guardou o caminho todo: " + reaberto.historico.map(h => h.status).join(" -> "));

    /* ---------- 6. o dia fecha: resumo e totais ---------- */
    console.log("\n=== 6. O RESUMO DO DIA ===");
    const dia = painel.pedidos();
    const entregues = dia.filter(p => p.status === "entregue");
    const aguardando = dia.filter(p => p.status === "aguardando");
    const cancelados = dia.filter(p => p.status === "cancelado");
    const faturamento = entregues.reduce((t, p) => t + p.total, 0);
    const itens = entregues.reduce((t, p) => t + (p.itens || []).reduce((s, i) => s + i.qty, 0), 0);
    if (dia.length !== 5) falha("o dia tem " + dia.length + " pedidos");
    else ok("5 pedidos no dia: " + entregues.length + " entregues, " + cancelados.length + " cancelados, " + aguardando.length + " aguardando");
    if (faturamento <= 0) falha("faturamento do dia zerado");
    else ok("faturamento do dia: R$ " + faturamento.toFixed(2) + " em " + itens + " itens");
    const ticket = faturamento / entregues.length;
    ok("ticket medio: R$ " + ticket.toFixed(2));

    /* ---------- 7. o dono busca por nome, telefone e bairro ---------- */
    console.log("\n=== 7. BUSCA NO PAINEL ===");
    const busca = (termo, campo) => dia.filter(p => String(p[campo] || "").toLowerCase().indexOf(termo.toLowerCase()) >= 0);
    if (busca("ana", "nome").length !== 1) falha("busca por nome nao achou a Ana");
    else ok("busca por nome: Ana Ribeiro");
    if (busca("98811", "tel").length !== 1) falha("busca por telefone nao achou");
    else ok("busca por telefone: 98811 (numero parcial)");
    if (busca("japeri", "bairro").length === 0) falha("busca por bairro nao achou Japeri");
    else ok("busca por bairro: Japeri (" + busca("japeri", "bairro").length + " pedido(s))");

    /* ---------- 8. exportar para o Excel ---------- */
    console.log("\n=== 8. EXPORTAR PARA O EXCEL ===");
    const cabecalho = ["Pedido", "Data", "Status", "Cliente", "WhatsApp", "Bairro", "Regiao", "Pagamento", "Troco", "Subtotal", "Frete", "Total", "Itens"];
    const linhas = dia.map(p => [p.id, p.criadoEm, p.status, p.nome, p.tel, p.bairro, p.regiao, p.pagamento, p.troco || "", p.subtotal, p.frete, p.total, (p.itens || []).map(i => i.name + " x" + i.qty).join(" | ")]);
    if (linhas.length !== 5) falha("o CSV saiu com " + linhas.length + " linhas");
    else ok("CSV com 5 pedidos e " + cabecalho.length + " colunas");
    const csv = [cabecalho.join(";")].concat(linhas.map(l => l.join(";"))).join("\n");
    if (csv.indexOf("Ana Ribeiro") < 0) falha("o CSV perdeu o nome do cliente");
    else ok("o CSV traz nome, telefone, bairro, valores e itens de cada pedido");
    if (csv.split(";").length < 13) falha("o CSV perdeu colunas");
    else ok("nenhuma coluna vazia no cabecalho");

    /* ---------- 9. o robo do Telegram, sem rede ---------- */
    console.log("\n=== 9. O BOTAO DO TELEGRAM APLICA O MESMO QUE O PAINEL ===");
    const bot = ler(".github/scripts/bot-telegram.js");
    /* o teclado do bot e o mesmo do painel: status -> callback st|id|status */
    ["confirmado", "separacao", "enviado", "entregue", "cancelado"].forEach(function (st) {
        if (bot.indexOf('st|" + id + "|' + st) < 0) falha("o botao do Telegram nao tem " + st);
    });
    ok("os 5 botoes de status existem na mensagem do Telegram (st|id|status)");
    if (bot.indexOf('"ed|" + id') < 0) falha("o botao Editar sumiu da mensagem");
    else ok("botao Editar (ed|id) e Reabrir (rb|id) presentes");
    /* a ordem das etapas do bot tem de bater com a do painel */
    const ordemPainel = vm.runInContext("STATUS_ORDEM", painelCtx).join(",");
    if (ordemPainel !== "aguardando,confirmado,separacao,enviado,entregue") falha("a ordem das etapas mudou: " + ordemPainel);
    else ok("etapas em ordem: " + ordemPainel);
    /* aplicarStatus do bot: soma no historico e grava */
    const idBot = aparelhos[3].pedido.id;
    const antes = painel.pedidoPorId(idBot).historico.length;
    /* o robo faz: pega o pedido, aplica o status, grava o pedido inteiro */
    vm.runInContext("(function (id, novo) {"
        + " var ps = getPedidos();"
        + " var p = ps.filter(function (x) { return x.id === id; })[0];"
        + " p.status = novo;"
        + " p.historico = Array.isArray(p.historico) ? p.historico : [];"
        + " p.historico.push({ status: novo, quando: Date.now() });"
        + " savePedidos(ps);"
        + " return p;"
        + "})", painelCtx)(idBot, "confirmado");
    const depois = painel.pedidoPorId(idBot);
    if (depois.historico.length !== antes + 1) falha("o botao do Telegram nao somou passo no historico");
    else ok("botao do Telegram soma passo e grava (" + antes + " -> " + depois.historico.length + "), status: " + depois.status);

    console.log("\n" + (erros === 0 ? "*** DIA DE TRABALHO 10/10 ***" : "*** " + erros + " ERRO(S) NO DIA DE TRABALHO ***"));
    process.exit(erros ? 1 : 0);
}, 120);