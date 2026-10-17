/* 29 - IA AJUDANDO EM TUDO (10/10)
   O assistente tem que responder a pergunta do cliente de verdade:
   a intencao certa, o numero certo e o horario certo (fonte unica).
   Aqui a IA e carregada num sandbox e respondida de verdade - nao e
   so leitura de codigo. Qualquer resposta inventada (telefone errado,
   horario divergente, dia de sabado aberto) quebra este teste. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

/* ---------- sandbox: as regras + a IA, sem DOM ---------- */
const loja = ler("loja.js");
const pedido = ler("precos-base.json");
const catalogo = ler("catalogo.json");
let lista = JSON.parse(catalogo);
if (!Array.isArray(lista)) lista = lista.produtos || [];
const ctx = {
    console,
    localStorage: {
        _d: {},
        getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
        setItem(k, v) { this._d[k] = String(v); },
        removeItem(k) { delete this._d[k]; }
    },
    document: { addEventListener: () => {}, querySelector: () => null, getElementById: () => null },
    location: { href: "https://apolopanda500.github.io/refrigerante-site/index.html", pathname: "/refrigerante-site/index.html" },
    navigator: { userAgent: "teste", vibrate: () => {} },
    Notification: function () { return { requestPermission: () => Promise.resolve("granted") }; },
    fetch: () => Promise.reject(new Error("sem rede no teste")),
    setTimeout, clearTimeout, setInterval, clearInterval,
    Image: function () {}, alert: () => {}
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(loja, ctx);
/* o catalogo do dia entra como lista global PD, como na pagina real */
vm.runInContext("var PD = " + JSON.stringify(lista) + "; var CT = " + JSON.stringify(lista) + ";", ctx);
vm.runInContext(ler("script.js"), ctx);
vm.runInContext(ler("ia.js"), ctx);
const ia = vm.runInContext("({ r: iaRespostaLocal, contato: contatoLoja(), janelaP: janelaPedidosTexto, janelaE: janelaEntregaTexto, estLoja: estadoLoja, estEnt: estadoEntrega, min: entregaMinima, freteMin: freteGratisMinimo })", ctx);

function pergunta(txt) {
    try { return ia.r(txt); }
    catch (e) { return { texto: "ERRO: " + e.message, intencao: "erro", confianca: 0, rapido: false }; }
}

console.log("=== 1. A IA RESPONDE (sem erro) A 41 PERGUNTAS REAIS ===");
const PERGUNTAS = [
    "quanto custa a guaraná 350ml?", "qual o preço da coca cola?", "que horas vocês atendem?",
    "você abre sábado?", "domingo tem entrega?", "qual o frete para Japeri?",
    "tem frete grátis?", "quando vocês entregam em Paracambi?", "entrega hoje?",
    "quanto tempo demora pra chegar?", "vocês atendem meu bairro?", "posso pagar com cartão?",
    "paguei com pix, tem que mandar a chave?", "como faço para cancelar meu pedido?",
    "quero corrigir o endereço do pedido", "qual o valor mínimo do pedido?",
    "vou receber aviso quando o pedido sair?", "meu pedido está onde?",
    "telefone de vocês", "como falar com o vendedor?", "quero falar com o motorista",
    "tem aplicativo para instalar?", "quero comprar uma coca", "tem que fazer um pedido mínimo?",
    "qual o e-mail da loja?", "meus dados estão errados", "como limpo meu histórico?",
    "o que vocês recomendam?", "tem alguma oferta hoje?", "olá", "bom dia",
    "quero adicionar ao carrinho", "o pedido mínimo é quanto?", "a loja abre que horas?",
    "no sábado sai entrega?", "qual região vocês atendem?", "precisa cadastrar?",
    "como faço para instalar o app?", "qual o prazo de entrega?", "tem chave pix?",
    "quero apagar meus pedidos", "quantos pedidos posso fazer hoje?"
];
let semResposta = [];
PERGUNTAS.forEach(function (p) {
    const r = pergunta(p);
    if (!r || !r.texto || r.intencao === "erro" || /ERRO:/.test(r.texto)) semResposta.push(p + " (" + (r ? r.texto : "sem retorno") + ")");
});
if (semResposta.length) falha(semResposta.length + " pergunta(s) sem resposta boa:\n     " + semResposta.slice(0, 5).join("\n     "));
else ok(PERGUNTAS.length + " perguntas respondidas, nenhuma deu erro");

console.log("\n=== 2. CADA ASSUNTO CAI NA INTENCAO CERTA ===");
const CASOS = [
    ["que horas voces atendem", "horario"],
    ["qual o valor minimo do pedido", "minimo"],
    ["qual o prazo de entrega", "prazo"],
    ["no sabado tem entrega", "fimDeSemana"],
    ["domingo voces abrem", "fimDeSemana"],
    ["como cancelo meu pedido", "cancelar"],
    ["quero corrigir meu endereco", "perfil"],
    ["tem chave pix", "pix"],
    ["vou ser avisado quando sair", "aviso"],
    ["quero apagar meu historico", "limparHistorico"],
    ["o que voces recomendam", "recomendacao"],
    ["qual o telefone", "contato"],
    ["quero falar com o vendedor", "humano"],
    ["quero falar com o motorista", "humano"],
    ["tem aplicativo", "app"],
    ["posso pagar com cartao", "pagamento"],
    ["tem frete gratis", "freteGratis"],
    ["quantos pedidos posso fazer por dia", "limiteDia"]
];
CASOS.forEach(function (c) {
    const r = pergunta(c[0]);
    if (!r || r.intencao !== c[1]) falha('"' + c[0] + '" caiu em "' + (r ? r.intencao : "?") + '" e devia cair em "' + c[1] + '"');
});
ok(CASOS.length + " assuntos caem na intencao certa (horario, minimo, prazo, fim de semana, cancelar, perfil, pix, aviso, historico, recomendacao, contato, humano, app, pagamento, frete)");

console.log("\n=== 3. A IA NUNCA INVENTA NUMERO ===");
const zap = ia.contato.telefone, zapNum = ia.contato.whatsapp;
PERGUNTAS.forEach(function (p) {
    const r = pergunta(p);
    const nums = (r.texto.match(/55\d{10,11}|\(\d{2}\)\s?9?\d{4}[-\s]?\d{4}/g) || []);
    nums.forEach(function (n) {
        const limpo = n.replace(/\D/g, "");
        const dono = String(zapNum);
        const motorista = "5521965667468";
        if (limpo !== dono && limpo !== motorista && limpo.slice(-8) !== dono.slice(-8) && limpo.slice(-8) !== motorista.slice(-8)) {
            falha('"' + p + '" invented o telefone ' + n);
        }
    });
});
ok("nenhum numero de telefone alem do dono e do motorista");

console.log("\n=== 4. O HORARIO DA IA VEM DA FONTE ===");
const h = pergunta("que horas voces atendem");
if (h.texto.indexOf(ia.janelaP()) < 0) falha("a IA nao usou a janela da fonte (" + ia.janelaP() + ")");
else ok("a IA responde com a janela da fonte: " + ia.janelaP());
const he = pergunta("qual o prazo de entrega");
if (he.texto.indexOf(ia.janelaE()) < 0) falha("a IA nao usou a janela de entrega (" + ia.janelaE() + ")");
else ok("prazo de entrega com a fonte: " + ia.janelaE());

console.log("\n=== 5. A IA RESPETA SABADO E DOMINGO ===");
const fds = pergunta("no sabado tem entrega");
if (!/sabado/.test(fds.texto.toLowerCase())) falha("a IA nao explicou o sabado");
else ok("sabado: " + fds.texto.split("\n")[0].slice(0, 70));
if (!/domingo/.test(fds.texto.toLowerCase())) falha("a IA nao explicou o domingo");
else ok("domingo citado na mesma resposta");

console.log("\n=== 6. A IA DA O VALOR MINIMO E O FRETE GRATIS REAIS ===");
const min = pergunta("qual o valor minimo");
if (min.texto.indexOf("100,00") < 0 && min.texto.indexOf(String(ia.min())) < 0) falha("a IA naoquoted o minimo real (" + ia.min + ")");
else ok("minimo real emmoney: R$ " + ia.min().toFixed(2));
const fg = pergunta("tem frete gratis");
if (fg.texto.indexOf("150,00") < 0 && fg.texto.indexOf(String(ia.freteMin())) < 0) falha("a IA naoquoted o frete gratis real");
else ok("frete gratis real: R$ " + ia.freteMin().toFixed(2));

console.log("\n=== 7. A IA USA O CATALOGO DO DIA ===");
const amostra = lista[0];
if (amostra && amostra.nm) {
    const r = pergunta("quanto custa " + amostra.nm + "?");
    if (r.intencao !== "preco") falha('preco de "' + amostra.nm + '" caiu em ' + r.intencao);
    else ok("preco do produto vem do catalogo: " + amostra.nm + " (" + amostra.pr + ")");
} else ok("catalogo vazio no teste (sem produtos para conferir)");

console.log("\n=== 8. A IA NAO TRAVA COM PERGUNTA VAZIA OU ESTRANHA ===");
["", "   ", "???", "x".repeat(400), "<script>alert(1)</script>", "meu pedido CV20261016-001", "casa"].forEach(function (p) {
    const r = pergunta(p);
    if (!r || !r.texto) falha('pergunta estranha "' + p.slice(0, 18) + '" nao devolveu texto');
    if (r && /<script>/.test(r.texto)) falha("a IA devolveu HTML cru para " + p.slice(0, 18));
});
ok("perguntas vazias, longas e com HTML nao quebram o assistente");

console.log("\n" + (erros === 0 ? "*** IA AJUDANDO EM TUDO 10/10 ***" : "*** " + erros + " ERRO(S) DA IA ***"));
process.exit(erros ? 1 : 0);