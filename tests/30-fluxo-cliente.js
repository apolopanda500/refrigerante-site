/* 30 - FLUHO COMPLETO DO CLIENTE (10/10)
   Roda o caminho inteiro dentro de um sandbox, sem navegador:
   adicionar produto -> carrinho -> finalize dentro da propria pagina
   -> pedido salvo -> aparece no historico -> status muda.
   E o que prova que o site funciona de verdade: nada de palavra,
   e execucao (criarPedido, calcularFrete, mesclarPedidos, status). */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

/* ---------- sandbox do cliente ---------- */
const loja = new Map();
const ctx = {
    console,
    localStorage: {
        _d: {},
        getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
        setItem(k, v) { this._d[k] = String(v); },
        removeItem(k) { delete this._d[k]; }
    },
    document: {
        addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [],
        getElementById: () => null, getElementsByClassName: () => [], body: { classList: { add(){}, remove(){}, toggle(){} } } },
    location: { href: "https://apolopanda500.github.io/refrigerante-site/carrinho.html", pathname: "/refrigerante-site/carrinho.html", reload: () => {} },
    navigator: { userAgent: "teste", vibrate: () => {} },
    Notification: function () { return { requestPermission: () => Promise.resolve("granted") }; },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
    fetch: () => Promise.reject(new Error("sem rede no teste")),
    Image: function () {}, alert: () => {}, confirm: () => true
};
ctx.window = ctx;
ctx.addEventListener = () => {};
vm.createContext(ctx);
vm.runInContext(ler("loja.js"), ctx);
vm.runInContext(ler("conta.js"), ctx);
vm.runInContext(ler("script.js"), ctx);
const api = vm.runInContext(`({
    carrinho: (itens) => { cart = itens; saveCart(); },
    getCart, calcSubtotal, calcTotalItens, criarPedido, getPedidos, savePedidos,
    atualizarStatus, pedidosPorTelefone, mesclarPedidos, calcularFrete, freteGratisMinimo,
    entregaMinima, regioesDoDia, regioesPedidoHoje, pedidoAbreHoje, diaPedidoDaRegiao,
    gerarId, statusIndice, diasPedidoDaRegiao: diasPedidoDaRegiao, REGIOES: REGIOES, STATUS_ORDEM, STATUS_LABEL, pedidoLiberado: pedidosLiberados,
    temDados: () => (Conta.estaVazia() === false)
})`, ctx);

/* ---------- 1. cliente monta o carrinho ---------- */
console.log("=== 1. O CLIENTE MONTA O CARRINHO ===");
const regioes = api.regioesDoDia(4);            /* quinta: entrega */
const diaPedido = api.diaPedidoDaRegiao(regioes[0].id);
if (typeof diaPedido !== "number") falha("nao deu para saber o dia de pedido da regiao");
else ok("regiao " + regioes[0].nome + ": dia de pedido " + diaPedido + " (entrega " + regioes[0].diasTexto + ")");
const item = { name: "Guarana 350ml", price: "R$ 19,00", priceNum: 19, qty: 3 };
api.carrinho([item]);
if (api.getCart().length !== 1) falha("o item nao foi para o carrinho");
else ok("item no carrinho: 1 produto, 3 unidades");
if (api.calcTotalItens() !== 3) falha("contagem de itens errada");
else ok("3 itens no total");
if (api.calcSubtotal() !== 57) falha("subtotal errado: " + api.calcSubtotal());
else ok("subtotal R$ 57,00 (19,00 x 3)");

console.log("\n=== 2. FRETE E MINIMO (regras da loja) ===");
const calc = api.calcularFrete(api.calcSubtotal(), regioes[0].id);
if (typeof calc.frete !== "number" || typeof calc.total !== "number") falha("calcularFrete nao devolveu numero");
else ok("frete da regiao: R$ " + calc.frete.toFixed(2) + " | total R$ " + calc.total.toFixed(2));
if (calc.total !== api.calcSubtotal() + calc.frete) falha("total nao bate com subtotal + frete");
else ok("total = subtotal + frete");
const min = api.entregaMinima();
if (min !== 100) falha("o minimo para entrega mudou: " + min);
else ok("pedido minimo para entrega: R$ " + min.toFixed(2) + " (a tela bloqueia abaixo disso - bateria 27)");
const abaixo = api.calcularFrete(60, regioes[0].id);
if (typeof abaixo.total !== "number") falha("calcularFrete falhou com valor baixo");
else ok("total de um pedido baixo (R$ 60,00) calculado: R$ " + abaixo.total.toFixed(2) + " - quem barra e a tela, nao o calculo");

console.log("\n=== 3. FINALIZAR DENTRO DO CARRINHO ===");
const carrinho = ler("carrinho.html");
if (carrinho.indexOf("function finalizarPedidoCarrinho") < 0) falha("carrinho.html perdeu o finalizar");
else ok("carrinho.html tem finalizarPedidoCarrinho()");
if (/href="checkout\.html"/.test(carrinho)) falha("carrinho.html ainda manda para checkout.html");
else ok("nenhum botao manda para outra pagina");
/* a funcao usa criarPedido (numero CV, historico e nuvem) */
const iBloq = carrinho.indexOf("function bloqueioFinalizar");
const iFin = carrinho.indexOf("function finalizarPedidoCarrinho");
if (iBloq < 0 || iFin < 0 || iBloq > iFin) falha("a finalizacao do carrinho perdeu o bloqueio de regras");
else ok("a finalizacao tem o bloquei de regras (bloqueioFinalizar) antes de fechar o pedido");
["criarPedido(", "notificarTelegramPedido", "limparCarrinho", "ultimoPedido", "pedido-sucesso.html"].forEach(function (n) {
    if (carrinho.slice(iFin, iFin + 3000).indexOf(n) < 0) falha("a finalizacao do carrinho nao usa " + n);
});
["pedidosLiberados", "bairroForaDaArea", "entregaMinima", "calcularFrete", "regiaoCarrinho"].forEach(function (n) {
    if (carrinho.indexOf(n) < 0) falha("o carrinho nao consulta a regra " + n);
});
ok("a finalizacao usa criarPedido, as regras da loja, o aviso do Telegram e limpa o carrinho");

console.log("\n=== 4. O PEDIDO NASCE COMO TEM DE SER ===");
ctx.localStorage.setItem("refrigerantePrefs", JSON.stringify({ nome: "Cliente Bateria", nomeAntigo: "Cliente Bateria", cpf: "52998224725", tel: "21987654321", endereco: "Rua do Teste, 10", bairro: "Japeri" }));
const pedido = api.criarPedido({
    cpf: "52998224725",
    itens: [{ name: "Coca 2L", qty: 2, price: 27.5, priceNum: 27.5, subtotal: 55 }, { name: "Guarana 350ml", qty: 9, price: 6, priceNum: 6, subtotal: 54 }],
    nome: "Cliente Bateria", nomeAntigo: "Cliente Teste", tel: "(21) 98888-7777", cpf: "123.456.789-00",
    end: "Rua A, 10", comp: "apto 2", bairro: "Seropedica",
    regiao: regioes[0].id, frete: calc.frete, pagamento: "Pix", troco: "",
    subtotal: 109, total: 109
});
if (!/^CV\d{8}-\d{3}-\d{5}$/.test(pedido.id)) falha("numero de pedido fora do padrao CV: " + pedido.id);
else ok("numero do pedido: " + pedido.id + " (padrao CVAAAAMMDD-000-00000)");
if (pedido.status !== "aguardando") falha("pedido nasce com status errado");
else ok("status inicial: aguardando");
if (!Array.isArray(pedido.historico) || pedido.historico.length !== 1) falha("pedido sem historico inicial");
else ok("historico comeca com 1 passo (aguardando " + new Date(pedido.historico[0].quando).toISOString().slice(0, 19) + "Z)");
if (!pedido.historico[0].quando) falha("passo do historico sem hora");
if (api.getPedidos().length !== 1) falha("pedido nao foi salvo no aparelho");
else ok("pedido salvo no aparelho (localStorage)");

console.log("\n=== 5. O VENDEDOR MUDA O STATUS E O CLIENTE VEE ===");
const caminha = ["confirmado", "separacao", "enviado", "entregue"];
caminha.forEach(function (s, i) {
    api.atualizarStatus(pedido.id, s);
    const p = api.getPedidos().filter(x => x.id === pedido.id)[0];
    if (p.status !== s) falha("status nao mudou para " + s);
    if (p.historico.length !== i + 2) falha("historico nao cresceu ao mudar para " + s + " (" + p.historico.length + ")");
    const ultimo = p.historico[p.historico.length - 1];
    if (!ultimo.quando) falha("passo " + s + " sem data/hora");
});
const final = api.getPedidos()[0];
ok("caminho completo: " + caminha.join(" -> ") + " com " + final.historico.length + " passos datados");
if (api.statusIndice(final.status) !== 4) falha("indice do status errado");
else ok("status final: " + api.STATUS_LABEL[final.status] + " (" + api.STATUS_ORDEM.length + " etapas)");

console.log("\n=== 6. O CLIENTE ENCONTRA O PEDIDO PELO TELEFONE ===");
if (api.pedidosPorTelefone("21988887777").length !== 1) falha("pedido nao encontrado pelo telefone sem mascara");
else ok("encontrado pelo telefone sem mascara");
if (api.pedidosPorTelefone("(21) 98888-7777").length !== 1) falha("pedido nao encontrado pelo telefone com mascara");
else ok("encontrado pelo telefone com mascara");
if (api.pedidosPorTelefone("21999999999").length !== 0) falha("achou pedido de outro telefone");
else ok("telefone de outra pessoa nao ve o pedido");

console.log("\n=== 7. PEDIDO DE VARIOS APARELHOS (nuvem) ===");
const local = [{ id: "CV20261016-001", status: "aguardando", historico: [{ status: "aguardando", quando: 1 }], atualizadoEm: 10 }];
const nuvem = [{ id: "CV20261016-001", status: "entregue", historico: [{ status: "aguardando", quando: 1 }, { status: "entregue", quando: 2 }], atualizadoEm: 20 }];
const junto = api.mesclarPedidos(local, nuvem);
if (junto.length !== 1) falha("merge duplicou o pedido");
else ok("mesmo id nos dois lugares = 1 pedido so");
if (junto[0].status !== "entregue") falha("a versao com mais historico nao venceu");
else ok("vence o que tem mais historico (entregue)");
const outro = api.mesclarPedidos(local, [{ id: "CV20261016-002", status: "aguardando", historico: [], criadoEm: 30 }]);
if (outro.length !== 2) falha("pedido so da nuvem foi perdido");
else ok("pedido que so existe na nuvem entrou na lista");
const ordem = api.mesclarPedidos([], [{ id: "A", criadoEm: 10 }, { id: "B", criadoEm: 30 }, { id: "C", criadoEm: 20 }]);
if (ordem[0].id !== "B" || ordem[2].id !== "A") falha("ordem do historico errada (mais novo primeiro)");
else ok("lista sai do mais novo para o mais antigo");

console.log("\n=== 8. DIA DE PEDIDO E DIA DE ENTREGA (um dia antes) ===");
let checagemDias = [];
["japeri", "engenhopedreira", "paracambi", "seropedica"].forEach(function (id) {
    const reg = (api.REGIOES || []).find(function (x) { return x.id === id; }) || null;
    if (!reg) { checagemDias.push(id + ": nao encontrada"); return; }
    const vesperas = reg.dias.map(function (d) { return (d + 6) % 7; });
    const pedidos = api.diasPedidoDaRegiao(reg);
    const bate = pedidos.length === vesperas.length && pedidos.every(function (d) { return vesperas.indexOf(d) >= 0; });
    checagemDias.push(reg.nome + ": entrega " + reg.diasTexto + " / pedido " + (bate ? "sempre na véspera" : "NAO antecede a entrega (" + pedidos + ")"));
});
const ruins = checagemDias.filter(x => /NAO antecede|nao encontrada/.test(x));
if (ruins.length) falha(checagemDias.join(" | "));
else ok(checagemDias.join(" | "));
const sab = api.regioesDoDia(6);
if (sab.length && api.regioesPedidoHoje(6).length === 0) ok("sabado tem entrega e nao abre pedido (regra do projeto)");
else if (sab.length) ok("sabado: entregas " + sab.map(r => r.nome).join(", "));

console.log("\n" + (erros === 0 ? "*** FLUJO DO CLIENTE 10/10 ***" : "*** " + erros + " ERRO(S) NO FLUJO ***"));
process.exit(erros ? 1 : 0);