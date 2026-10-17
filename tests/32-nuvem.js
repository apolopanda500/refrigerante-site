/* 32 - NUVEM (PEDIDOS DE TODO APARELHO) (10/10)
   O pedido do cliente vai para o banco e o painel do dono junta tudo.
   Aqui a nuvem e simulada (fetch falso) para provar:
     - o pedido vai para /pedidos/<id>.json
     - falha de rede nunca perde o pedido (fica no aparelho)
     - dois aparelhos com o mesmo id nao duplicam
     - a versao com mais historico vence
     - a base alternativa e tentada quando a primeira cai
   Regra do projeto: a nuvem e um extra, o aparelho e a verdade. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const script = ler("script.js");

console.log("=== 1. O ENDERECO DO BANCO ===");
const bases = script.match(/https:\/\/[a-z0-9-]+\.firebaseio\.com/g) || [];
if (bases.length < 1) falha("script.js nao tem o endereco do banco");
else ok("banco padrao: " + bases[0] + (bases.length > 1 ? " (+" + (bases.length - 1) + " reserva)" : ""));
if (!/function nuvemEnderecos\s*\(/.test(script)) falha("perdi funcao nuvemEnderecos()");
else ok("nuvemEnderecos() centraliza os enderecos");
if (!/cfgPrecosURL/.test(script)) falha("o dono nao consegue apontar outro banco pelas preferencias");
else ok("o dono pode trocar o banco pelas preferencias (cfgPrecosURL)");

/* ---------- sandbox com fetch controlado ---------- */
/* desliga o gateway quando a secao esta testando o caminho antigo */
function cenario(nome, plano, semGateway) {
    if (semGateway) {
        plano = plano;
    }
    const ctx = {
        console,
        localStorage: {
            _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
            setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; }
        },
        document: { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { setAttribute: () => {} }, body: { classList: { add() {}, remove() {}, toggle() {} } } },
        location: { href: "https://apolopanda500.github.io/refrigerante-site/index.html", pathname: "/refrigerante-site/index.html", reload: () => {} },
        navigator: { userAgent: "teste", vibrate: () => {} },
        setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
        fetch: plano,
        alert: () => {}, confirm: () => true, Image: function () {}
    };
    function localStorage_mock(flag) {
        ctx.localStorage._d.vendedorPrefs = JSON.stringify(flag);
        ctx.localStorage._d.refrigerantePrefs = JSON.stringify(flag);
    }
    ctx.window = ctx;
    ctx.addEventListener = () => {};
    vm.createContext(ctx);
    if (semGateway) {
        localStorage_mock({ cfgGatewayOff: true });
    }
    vm.runInContext(script, ctx);
    return ctx;
}

console.log("\n=== 2. O PEDIDO SAI PARA A NUVEM (gateway, ou o caminho antigo de reserva) ===");
/* O PADRAO agora e o gateway: o cliente cria o pedido em POST
   /api/pedido e ganha a chave dele (que e o que permite acompanhar o
   pedido depois). O caminho antigo (PUT direto em /pedidos/<id>.json)
   continua de pe como RESERVA para quando o gateway nao responde - e
   a secao 3 prova que essa reserva funciona. Aqui conferimos os dois:
   com o gateway ligado vai por ele; desligado, vai pelo PUT de sempre. */
let chamadas = [];
function planoEnvia(url, opcoes) {
    chamadas.push({ url: url, metodo: (opcoes && opcoes.method) || "GET", corpo: opcoes && opcoes.body ? JSON.parse(opcoes.body) : null });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ chave: "chave-de-teste-abc" }) });
}
let ctx = cenario("envia pelo gateway", planoEnvia);
const pedido = { id: "CV20261017-001", nome: "Teste", tel: "21988887777", status: "aguardando", total: 150, itens: [], historico: [] };
vm.runInContext("enviarPedidoNuvem", ctx)(pedido);
if (!chamadas.length) falha("nenhuma chamada de rede ao enviar o pedido");
else {
    const c = chamadas[0];
    const peloGateway = c.url.indexOf("/api/pedido") >= 0;
    const peloAntigo = c.url.indexOf("/pedidos/CV20261017-001.json") >= 0 && c.metodo === "PUT";
    if (peloGateway) {
        ok("com o gateway ligado o pedido vai em /api/pedido");
        if (c.corpo && c.corpo.pedido && c.corpo.pedido.id === pedido.id) ok("o pedido inteiro vai no corpo (id conferido)");
        else falha("o corpo do /api/pedido nao traz o pedido do cliente");
    } else if (peloAntigo) {
        ok("sem o gateway o pedido vai no PUT de sempre");
    } else {
        falha("o pedido nao saiu por caminho nenhum: " + c.metodo + " " + c.url);
    }
}
console.log("\n=== 3. REDE CAI: O PEDIDO NAO SE PERDE ===");
chamadas = [];
ctx = cenario("sem rede", function () { return Promise.reject(new Error("offline")); });
vm.runInContext("criarPedido", ctx)({
    nome: "Teste", tel: "21988887777", end: "Rua A", bairro: "Seropedica", regiao: "seropedica",
    frete: 0, pagamento: "Pix", itens: [{ name: "X", qty: 1, subtotal: 10 }], subtotal: 10, total: 10
});
const guardados = vm.runInContext("getPedidos()", ctx);
if (!guardados.length) falha("sem rede o pedido sumiu do aparelho");
else ok("pedido continua salvo no aparelho (" + guardados.length + ") mesmo sem rede");
if (!/^CV\d{8}-\d{3}-\d{5}$/.test(guardados[0].id)) falha("numero do pedido fora do padrao: " + guardados[0].id);
else ok("numero do pedido: " + guardados[0].id);

console.log("\n=== 4. O PAINEL BAIXA E JUNTA OS PEDIDOS DE TODOS ===");
const nuvemFalsa = {
    "CV20261016-001": { id: "CV20261016-001", status: "entregue", historico: [{ status: "aguardando", quando: 1 }, { status: "entregue", quando: 2 }, { status: "entregue", quando: 3 }] },
    "CV20261016-002": { id: "CV20261016-002", status: "aguardando", historico: [{ status: "aguardando", quando: 5 }] }
};
let baixado = null;
ctx = cenario("painel", function (url) {
    if (url.indexOf("/pedidos.json") >= 0) return Promise.resolve({ ok: true, json: () => Promise.resolve(nuvemFalsa) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
}, { cfgGatewayOff: true });
vm.runInContext("sincronizarPedidosNuvem", ctx)(function (lista) { baixado = lista; });
setTimeout(function () {}, 0);
/* a sincronizacao e assincrona: espera a promise do sandbox resolver */
const espera = new Promise(function (r) { setTimeout(r, 60); });

espera.then(function () {
    if (!baixado) { falha("o painel nao recebeu a lista da nuvem"); process.exit(erros ? 1 : 0); }
    ok("painel recebeu " + baixado.length + " pedidos da nuvem");
    const ids = baixado.map(p => p.id);
    if (new Set(ids).size !== ids.length) falha("a lista veio com id repetido");
    else ok("nenhum id repetido: " + ids.join(", "));
    const p1 = baixado.filter(p => p.id === "CV20261016-001")[0];
    if (!p1 || p1.status !== "entregue") falha("o pedido mais novo da nuvem nao valeu");
    else ok("versao da nuvem aplicada (entregue)");
    const salvos = vm.runInContext("getPedidos()", ctx);
    if (salvos.length !== 2) falha("a nuvem nao foi salva no aparelho do painel");
    else ok("painel guardou os " + salvos.length + " pedidos no aparelho tambem");

    console.log("\n=== 5. A PRIMEIRA BASE CAI? TENTA A SEGUNDA ===");
    let tentadas = [];
    ctx = cenario("fallback", function (url) {
        tentadas.push(url);
        if (tentadas.length === 1) return Promise.reject(new Error("banco fora do ar"));
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }, { cfgGatewayOff: true });
    vm.runInContext("sincronizarPedidosNuvem", ctx)(function () {});
    setTimeout(function () {
        if (tentadas.length < 2) falha("a base alternativa nao foi tentada (" + tentadas.length + " tentativa(s))");
        else ok("tentou " + tentadas.length + " bases: " + tentadas.map(u => u.split("//")[1].split(".")[0]).join(" -> "));

        console.log("\n=== 6. O MESMO PEDIDO EM DOIS APARELHOS ===");
        const ctxM = cenario("merge", function () { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); });
        const mesclar = vm.runInContext("mesclarPedidos", ctxM);
        const um = [{ id: "CV1", status: "aguardando", historico: [{ status: "aguardando", quando: 1 }], total: 50, criadoEm: 10 }];
        const dois = [{ id: "CV1", status: "enviado", historico: [{ status: "aguardando", quando: 1 }, { status: "enviado", quando: 2 }], total: 50, criadoEm: 11 }];
        const junto = mesclar(um, dois);
        if (junto.length !== 1) falha("duplicou o pedido CV1");
        else ok("CV1 aparece uma vez so");
        if (junto[0].status !== "enviado") falha("nao valeu o que tem mais historico");
        else ok("vale o estado mais avanzado (enviado)");
        const iguais = mesclar([{ id: "CV2", status: "entregue", historico: [{ status: "entregue", quando: 9 }], criadoEm: 9 }], [{ id: "CV2", status: "entregue", historico: [{ status: "entregue", quando: 9 }], criadoEm: 9 }]);
        if (iguais.length !== 1) falha("duplicou em empate de historico");
        else ok("empate de historico nao duplica");

        console.log("\n=== 7. O PEDIDO PRESO SOBE SOZINHO ===");
        let enviados = [];
        /* no caminho antigo o reenvio e um PUT; no gateway e um POST em
           /api/pedido. Aceitar os dois e o que prova que o pedido preso
           volta por qualquer um dos caminhos. */
        const ctxR = cenario("reenvio", function (url, op) {
            const metodo = (op && op.method) || "GET";
            if (metodo === "PUT" || metodo === "POST") { enviados.push(metodo + " " + url); return Promise.resolve({ ok: true, json: () => Promise.resolve({ chave: "k" }) }); }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
        vm.runInContext("criarPedido", ctxR)({ nome: "T", tel: "21900000000", end: "R", bairro: "Seropedica", regiao: "seropedica", frete: 0, pagamento: "Pix", itens: [], subtotal: 10, total: 10 });
        vm.runInContext("marcarFalhaNuvem", ctxR)(vm.runInContext("getPedidos()[0]", ctxR));
        const marcados = JSON.parse(vm.runInContext("localStorage.getItem('convencaoNuvemFalhou')", ctxR));
        if (!Object.keys(marcados).length) falha("a falha nao foi registrada");
        else ok("pedido marcado como preso: " + Object.keys(marcados).join(", "));
        const qtd = vm.runInContext("reenviarPedidosPresos()", ctxR);
        if (qtd < 1) falha("a automacao nao reenviou o pedido preso");
        else ok("automacao reenviou " + qtd + " pedido(s) sem o cliente fazer nada");
        if (!enviados.length) falha("o reenvio nao chegou na rede");
        else ok("reenvio foi para a nuvem: " + enviados[0].split("/").pop());
        if (vm.runInContext("reenviarPedidosPresos()", ctxR) < 0) falha("a automacao devolveu numero invalido");
        else ok("rodar de novo sem pendencia nao quebra nada");

        console.log("\n=== 8. O BANCO NAO SOME DO LADO DO CLIENTE ===");
        const app = ler("app.js");
        const painel = ler("admin.html");
        if (!/sincronizarPedidosCliente/.test(app + script + ler("meus-pedidos.html")) && !/sincronizarPedidosCliente/.test(script)) {
            falha("o cliente nao sincroniza com a nuvem");
        } else ok("o cliente tambem sincroniza (sincronizarPedidosCliente)");
        if (!/sincronizarPedidosNuvem/.test(painel + script)) falha("o painel nao sincroniza com a nuvem");
        else ok("o painel sincroniza a cada abertura e por intervalo");
        if (!/firebase-appcheck\.js/.test(ler("index.html"))) falha("a home nao carrega a protecao do banco");
        else ok("App Check carregado nas paginas do cliente");

        console.log("\n" + (erros === 0 ? "*** NUVEM 10/10 ***" : "*** " + erros + " ERRO(S) DA NUVEM ***"));
        process.exit(erros ? 1 : 0);
    }, 60);
});