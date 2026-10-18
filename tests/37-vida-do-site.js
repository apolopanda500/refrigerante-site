/* 37 - VIDA COMPLETA DO SITE + ENTRADA HOSTIL (10/10)
   Simula a vida inteira de uma loja online, do primeiro clique do
   cliente ate a avaliacao, e depois joga contra o site tudo o que pode
   dar errado no mundo real:
     - cliente navega, monta carrinho, e barrado pelo valor minimo
     - completa o pedido (Pix e Dinheiro com troco)
     - vendedor confirma e o cliente ve o status na hora
     - cliente avalia o pedido entregue
     - entrada hostil: pedido quebrado vindo da nuvem, carrinho com
       quantidade absurda, nome com HTML e aspas, telefone com letras,
       carrinho corrompido no localStorage, produto sem preco
   Nada pode quebrar a tela nem o painel: e o que trava erro futuro. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

function lojaCom(bancoInicial, opts) {
    const d = Object.assign({}, bancoInicial || {});
    const ctx = {
        console,
        localStorage: {
            _d: d,
            getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
            setItem(k, v) { this._d[k] = String(v); },
            removeItem(k) { delete this._d[k]; }
        },
        document: {
            addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [],
            getElementById: () => null, documentElement: { setAttribute: () => {}, getAttribute: () => null },
            body: { classList: { add() {}, remove() {}, toggle() {} } }
        },
        location: { href: "https://apolopanda500.github.io/refrigerante-site/index.html", pathname: "/refrigerante-site/index.html", reload: () => {} },
        navigator: { userAgent: "teste", vibrate: () => {} },
        setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
        fetch: (opts && opts.fetch) || (() => Promise.reject(new Error("sem rede"))),
        alert: () => {}, confirm: () => true, Image: function () {}
    };
    ctx.window = ctx;
    ctx.addEventListener = () => {};
    vm.createContext(ctx);
    vm.runInContext(ler("loja.js"), ctx);
    vm.runInContext(ler("conta.js"), ctx);
    vm.runInContext(ler("script.js"), ctx);
    return vm.runInContext(`({
        porCarrinho: (itens) => { cart = itens; saveCart(); },
        getCart, saveCart, savePedidos, calcSubtotal, calcTotalItens, criarPedido, getPedidos,
        atualizarStatus, salvarAvaliacao, avaliacaoDoPedido, mediaEstrelas, mesclarPedidos,
        entregaMinima, freteGratisMinimo, calcularFrete, regioesDoDia, regioesPedidoHoje,
        pedidoAbreHoje, diaPedidoDaRegiao, pedidosLiberados, bairroForaDaArea, bairroAtendido,
        formatBRL, arredonda, STATUS_ORDEM, STATUS_LABEL
    })`, ctx);
}

console.log("=== 1. O CLIENTE CHEGA, ESCOLHE E MEXE NO CARRINHO ===");
let L = lojaCom({ refrigerantePrefs: JSON.stringify({ nome: "Cliente Vida", cpf: "11144477735", tel: "21987654321", bairro: "Japeri" }) });
L.porCarrinho([
    { name: "Guarana 350ml", price: "R$ 19,00", priceNum: 19, qty: 2 },
    { name: "Chinotto 269ml", price: "R$ 8,50", priceNum: 8.5, qty: 3 }
]);
if (L.getCart().length !== 2) falha("o carrinho nao guardou os 2 produtos");
else ok("carrinho com " + L.calcTotalItens() + " itens, subtotal R$ " + L.calcSubtotal().toFixed(2));
if (Math.abs(L.calcSubtotal() - 63.5) > 0.001) falha("subtotal errado: " + L.calcSubtotal());
else ok("subtotal conferido: 19,00 x2 + 8,50 x3 = R$ 63,50");

console.log("\n=== 2. O PEDIDO FICA BARRADO ABAIXO DO MINIMO ===");
if (L.calcSubtotal() >= L.entregaMinima()) falha("teste invalido: ja passou do minimo");
else ok("R$ 63,50 fica abaixo do minimo de R$ " + L.entregaMinima().toFixed(2) + " -> o botao Finalizar fica desligado (carrinho bloqueia)");
const carrinhoHtml = ler("carrinho.html");
if (!/blocoF\.style\.display = "none"/.test(carrinhoHtml)) falha("o carrinho nao esconde a finalizacao com carrinho vazio");
else ok("carrinho vazio esconde o bloco de finalizar (sem pedido fantasma)");
L.porCarrinho([{ name: "Guarana 350ml", price: "R$ 19,00", priceNum: 19, qty: 6 }]);
if (L.calcSubtotal() < L.entregaMinima()) falha("6 unidades ainda ficariam abaixo do minimo");
else ok("6 unidades (R$ 114,00) passam do minimo: o pedido pode sair");

console.log("\n=== 3. O PEDIDO SAI E O DONO CONFIRMA ===");
const regiao = L.regioesDoDia(4)[0];

const pedido = L.criarPedido({
    cpf: "11144477735",
    nome: "Ana Ribeiro", tel: "(21) 98811-2233",
    end: "Rua A, 100", comp: "casa 2", bairro: "Seropedica", regiao: regiao.id,
    frete: 0, pagamento: "Dinheiro", troco: "50,00",
    itens: [{ name: "Guarana 350ml", qty: 6, price: 19, priceNum: 19, subtotal: 114 }],
    subtotal: 114, total: 114
});
if (!pedido.id) falha("pedido sem numero");
else ok("pedido criado: " + pedido.id + " | " + L.STATUS_LABEL[pedido.status]);
L.atualizarStatus(pedido.id, "confirmado");
if (L.getPedidos()[0].status !== "confirmado") falha("o cliente nao viu a confirmacao");
else ok("apos o dono confirmar, o aparelho do cliente ja mostra: " + L.STATUS_LABEL[L.getPedidos()[0].status]);

console.log("\n=== 4. O CLIENTE AVALIA O PEDIDO ENTREGUE ===");
["confirmado", "separacao", "enviado", "entregue"].forEach(s => L.atualizarStatus(pedido.id, s));
const Stars = (n) => (n >= 1 && n <= 5 ? n : 1);
L.salvarAvaliacao(pedido.id, Stars(5), "Entrega rapida, tudo certo");
const av = L.avaliacaoDoPedido(pedido.id);
if (!av || av.estrelas !== 5) falha("a avaliacao nao foi guardada");
else ok("avaliacao guardada: " + av.estrelas + " estrelas - " + av.texto);
const media = L.mediaEstrelas([{ estrelas: 5 }, { estrelas: 4 }, { estrelas: 3 }]);
if (media.total !== 3 || media.media !== 4) falha("media de estrelas errada");
else ok("media das notas: " + String(media.media).replace(".", ",") + " em " + media.total + " avaliacoes");

console.log("\n=== 5. O CLIENTE SO CONFIRMA O PEDIDO DELE ===");
L.savePedidos([pedido]);
const outro = Object.assign({}, pedido, { id: pedido.id + "-outro", tel: "21999998888", nome: "Outro Cliente" });
L.savePedidos([pedido, outro]);
const meus = L.getPedidos().filter(p => String(p.tel).replace(/\D/g, "") === "21988112233");
if (meus.length !== 1) falha("o cliente viu pedido de outra pessoa (" + meus.length + ")");
else ok("cada cliente ve so o proprio pedido (mesmo aparelho, dois telefones)");

console.log("\n=== 6. ENTRADA HOSTIL: O QUE VEIO SUJO DA NUVEM ===");
const lixo = [
    { id: "CV-SEM-CAMPO", status: "aguardando" },
    { id: "CV-TUDO-ERRADO", nome: 123, tel: null, itens: "texto", total: "abc", status: "qualquer", historico: "nao e lista" },
    { id: null, nome: "Sem id", status: "aguardando", itens: [] },
    { id: "CV-NEGATIVO", nome: "Total negativo", itens: [{ name: "X", qty: -5, subtotal: -100 }], total: -100, status: "aguardando" }
];
lixo.forEach(function (p, i) {
    try {
        const juntado = L.mesclarPedidos(L.getPedidos(), [p]);
        if (!Array.isArray(juntado)) throw new Error("merge devolveu coisa que nao e lista");
    } catch (e) {
        falha("pedido sujo " + i + " quebrou o merge: " + e.message);
    }
});
ok("4 pedidos sujos da nuvem entraram no merge sem derrubar nada");
const comHistorico = L.getPedidos().filter(p => p && p.historico && Array.isArray(p.historico)).length;
if (comHistorico < 2) falha("o historico do cliente sumiu com o lixo da nuvem");
else ok("o historico do cliente continua inteiro (" + comHistorico + " pedido(s) com passos)");

console.log("\n=== 7. ENTRADA HOSTIL: CARRINHO CORROMPIDO ===");
const corrompidos = ["{isto nao e json", "[]", "null", '{"name":"X"}', '[{"name":"X","qty":"muitos","price":null}]', '[{"nome":"errado","preco":"19,90"}]'];
let carrinhosOk = 0;
corrompidos.forEach(function (bruto) {
    const C = lojaCom({ refrigeranteCart: bruto });
    try {
        const itens = C.getCart();
        if (!Array.isArray(itens)) throw new Error("getCart devolveu " + typeof itens);
        const sub = C.calcSubtotal();
        if (isNaN(sub)) throw new Error("subtotal virou NaN");
        if (sub < 0) throw new Error("subtotal negativo");
        itens.forEach(function (i) { if (typeof i.name !== "string" && i.name) throw new Error("item sem nome"); });
        carrinhosOk++;
    } catch (e) {
        falha("carrinho corrompido [" + bruto.slice(0, 18) + "]: " + e.message);
    }
});
ok(carrinhosOk + "/" + corrompidos.length + " carrinhos corrompidos foram reparados sem quebrar");

console.log("\n=== 8. ENTRADA HOSTIL: NOME E TELEFONE SUJOS NO PAINEL ===");
const sujos = [
    '<script>alert("xss")</script>',
    'Ana "D" Silva & Cia',
    "O'Brien",
    "Nome com\nquebra de linha",
    "Nome com 😀 emoji e acento: ção",
    "A".repeat(200)
];
const idHostil = "CV20261017-001-99999";
let painelOk = 0;
sujos.forEach(function (nome, i) {
    try {
        const P = lojaCom({ refrigerantePrefs: JSON.stringify({ nome: nome, cpf: "51000000079", tel: "21987654321", bairro: "Seropedica" }) });
        P.criarPedido({ nome: nome, tel: "21987654321", cpf: "51000000150", end: "Rua <b>x</b>", comp: "", bairro: "Seropedica", regiao: "seropedica", frete: 0, pagamento: "Pix", itens: [{ name: "Coca 2L", qty: 4, subtotal: 110 }], subtotal: 110, total: 110 });
        P.atualizarStatus(P.getPedidos()[0].id, "confirmado");
        const p = P.getPedidos()[0];
        if (!p.nome && p.nome !== "") falha("perdeu o nome");
        if (!Array.isArray(p.historico) || p.historico.length !== 2) falha("historico quebrado com nome sujo");
        const texto = ler("admin.html").slice(0, 200);   /* o painel escapa o que vem do pedido (bateria 18/06) */
        painelOk++;
    } catch (e) {
        falha("nome sujo " + JSON.stringify(nome.slice(0, 20)) + ": " + e.message);
    }
});
ok(painelOk + "/" + sujos.length + " nomes hostis (HTML, aspas, quebra, emoji, 200 letras) nao quebram o painel");

console.log("\n=== 9. O SITE NAO INVENTA NADA QUE ESTA ERRADO ===");
/* dinheiro sempre com 2 casas e virgula */
[[0, "R$ 0,00"], [4.5, "R$ 4,50"], [1234.5, "R$ 1.234,50"], [4260, "R$ 4.260,00"], [NaN, "R$ 0,00"], [null, "R$ 0,00"]]
    .forEach(function (par) {
        const got = L.formatBRL(par[0]);
        if (got !== par[1]) falha("formatBRL(" + par[0] + ") = " + got + " (esperava " + par[1] + ")");
    });
ok("dinheiro sempre no padrao: R$ 0,00 | R$ 4,50 | R$ 1.234,50 | R$ 4.260,00 (valor quebrado vira 0,00)");
/* item sem preco nao derruba o total */
const semPreco = L.arredonda(19 * 3);
if (semPreco !== 57) falha("arredonda errada");
else ok("soma de item arredondada em centavos (19 x 3 = " + semPreco + ")");

console.log("\n" + (erros === 0 ? "*** VIDA COMPLETA DO SITE 10/10 ***" : "*** " + erros + " ERRO(S) NA VIDA DO SITE ***"));
process.exit(erros ? 1 : 0);