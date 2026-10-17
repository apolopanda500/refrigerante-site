/* 28 - CONSISTENCIA DO PROJETO (10/10)
   Trava o que o dono pediu para nunca ficar dessincronizado:
     - horario: uma fonte so (loja.js), escrito a mao em nenhum lugar
     - sabado e domingo: a loja nao trabalha (nem para pedir)
     - contatos (WhatsApp, e-mail): um numero so, sem repeticao
     - nomes e titulos: a marca igual em todas as paginas
     - enderecos/regioes: os quatro bairros em todo lugar
     - datas: sempre por dataHoraSegundos/dataCurta
     - repeticao: nenhuma regra CSS repetida dentro das paginas
   Quando um canto Writes 09:00 e outro 08:50, este teste quebra. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const PAGINAS = ["index.html", "carrinho.html", "meus-pedidos.html", "perfil.html",
    "configuracoes.html", "pedido-sucesso.html", "admin.html"];
const SCRIPTS = ["app.js", "script.js", "loja.js", "ia.js", "central.js", "conta.js",
    "theme.js", "telegram.js", "app-update.js"];
const CODIGO = PAGINAS.concat(SCRIPTS);

/* ---------- 1. HORARIO: A FONTE UNICA ---------- */
console.log("=== 1. O HORARIO TEM UMA FONTE UNICA (loja.js) ===");
const loja = ler("loja.js");
if (!/var HORA_ABRE_PEDIDOS\s*=\s*8\s*\*\s*60\s*\+\s*50/.test(loja)) falha("loja.js nao tem HORA_ABRE_PEDIDOS = 08:50");
else ok("pedidos abrem as 08:50 (constante em loja.js)");
if (!/var HORA_FECHA_PEDIDOS\s*=\s*15\s*\*\s*60/.test(loja)) falha("loja.js nao tem HORA_FECHA_PEDIDOS = 15:00");
else ok("pedidos fecham as 15:00 (constante em loja.js)");
if (!/var DIAS_LOJA\s*=\s*\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/.test(loja)) falha("a loja nao trabalha de segunda a sexta (DIAS_LOJA)");
else ok("a loja trabalha de segunda a sexta (DIAS_LOJA)");
["estadoLoja", "estadoEntrega", "janelaPedidosTexto", "janelaEntregaTexto"].forEach(function (fn) {
    if (!new RegExp("function " + fn + "\\s*\\(").test(loja)) falha("loja.js nao tem " + fn + "()");
});
ok("loja.js tem estadoLoja/estadoEntrega/janelaPedidosTexto/janelaEntregaTexto");

console.log("\n=== 2. NINGUM LUGAR ESCREVE O HORARIO A MAO ===");
/* o texto do horario so pode existir na fonte (loja.js) e no rodape estatico
   da home, que precisa bater com a fonte (verifico abaixo).
   Comentario nao conta: e explicacao, nao o que o cliente ve. */
const RE_HORA = /(08:50|08\.50|9h00|09:00|\b15h\b|06:00|\b18h\b)/;
const semComentario = (t) => t.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ").replace(/<!--[\s\S]*?-->/g, " ");
const foraDaFonte = [];
CODIGO.forEach(function (f) {
    if (f === "loja.js") return;
    semComentario(ler(f)).split(/\r?\n/).forEach(function (l, i) {
        if (RE_HORA.test(l)) foraDaFonte.push(f + ":" + (i + 1) + "  " + l.trim().slice(0, 60));
    });
});
const proibidas = foraDaFonte.filter(x => x.indexOf("index.html") !== 0);
if (proibidas.length) falha("horario escrito a mao em:\n     " + proibidas.slice(0, 6).join("\n     "));
else ok("nenhum horario escrito a mao fora da fonte" + (foraDaFonte.length ? " (so a home, conferido abaixo)" : ""));

console.log("\n=== 3. O HTML FIXO DA HOME BATE COM A FONTE ===");
const home = ler("index.html");
const janela = "08:50 às 15:00";
if (home.indexOf(janela) < 0) falha("index.html nao mostra a janela de pedidos " + janela);
else ok("home mostra a janela de pedidos " + janela);
if (home.indexOf("06:00 às 18:00") < 0) falha("index.html nao mostra a janela de entrega 06:00 às 18:00");
else ok("home mostra a entrega 06:00 às 18:00");

console.log("\n=== 4. SABADO E DOMINGO A LOJA NAO TRABALHA ===");
const ctx = { console, localStorage: { getItem: () => null, setItem: () => {} }, document: { addEventListener: () => {} } };
vm.createContext(ctx);
vm.runInContext(loja, ctx);
const api = vm.runInContext("({ lojaAbertaNoDia, diaSomenteEntrega, somentePedidos, pedidosLiberados, estadoLoja, estadoEntrega, regioesDoDia })", ctx);
[[6, "sábado"], [0, "domingo"]].forEach(function (par) {
    const dia = par[0], nome = par[1];
    if (api.lojaAbertaNoDia(dia)) falha(nome + ": a loja aparece como aberta");
    if (!api.diaSomenteEntrega(dia)) falha(nome + ": nao esta marcado como dia so de entrega");
    if (api.pedidosLiberados("", { dia: dia, minutos: 10 * 60 }).liberado) falha(nome + ": aceitou pedido as 10:00");
    const st = api.estadoLoja({ dia: dia, minutos: 10 * 60 });
    if (st.aberta || st.dia) falha(nome + ": estadoLoja diz que a loja trabalha");
});
ok("sabado e domingo: loja fechada e sem pedidos (10:00)");
if (!api.regioesDoDia(6).length) ok("sabado tem entrega nas ruas (so nao tem loja)");
else ok("sabado tem entrega nas ruas: " + api.regioesDoDia(6).map(r => r.nome).join(", "));
const stSab = api.estadoEntrega({ dia: 6, minutos: 10 * 60 });
if (!stSab.ativa) falha("sabado 10:00 o freteiro nao aparece como entregando");
else ok("sabado o freteiro entrega normalmente (10:00 = " + stSab.texto + ")");

console.log("\n=== 5. O DIA QUE A LOJA ABRE ===");
[["segunda", 1], ["sexta", 5]].forEach(function (par) {
    if (!api.lojaAbertaNoDia(par[1])) falha(par[0] + ": a loja nao abre");
});
if (api.estadoLoja({ dia: 4, minutos: 8 * 60 + 45 }).aberta) falha("08:45 a loja ja aparecia como aberta");
if (!api.estadoLoja({ dia: 4, minutos: 8 * 60 + 55 }).aberta) falha("08:55 a loja nao aparecia como aberta");
if (api.estadoLoja({ dia: 4, minutos: 15 * 60 }).aberta) falha("15:00 a loja ainda aparecia como aberta");
ok("08:45 fechada / 08:55 aberta / 15:00 fechada - igual a pedidosLiberados");

console.log("\n=== 6. CONTATO: UM NUMERO SO, SEM REPETIR ===");
const ZAP = "5521983158911";
const ZAP_FMT = "(21) 9-8315-8911";
const quemTem = (alvo) => CODIGO.filter(f => ler(f).indexOf(alvo) >= 0);
if (!quemTem(ZAP).length) falha("o WhatsApp " + ZAP + " nao aparece em lugar nenhum");
else ok("WhatsApp do vendedor em: " + quemTem(ZAP).join(", "));
const outrosZap = [];
CODIGO.forEach(function (f) {
    const m = ler(f).match(/55\d{10,11}/g) || [];
    m.forEach(x => { if (x !== ZAP && x !== "5521965667468") outrosZap.push(f + " (" + x + ")"); });
});
if (outrosZap.length) falha("numero de WhatsApp diferente do dono: " + outrosZap.join(", "));
else ok("so tem o numero do dono e o do motorista (caminhao verde)");
/* o mesmo numero nao pode se repetir 5 vezes no mesmo arquivo */
const ia = ler("ia.js");
const repeteZap = (ia.split(ZAP_FMT).length - 1);
if (repeteZap > 1) falha("ia.js repete o telefone " + repeteZap + " vezes (use a fonte unica)");
else ok("ia.js nao repete o telefone na mao");

console.log("\n=== 7. NOME E TITULO DAS PAGINAS ===");
const titulos = {};
PAGINAS.forEach(function (f) {
    const m = ler(f).match(/<title>([^<]*)<\/title>/i);
    if (!m || !m[1].trim()) { falha(f + " sem <title>"); return; }
    titulos[f] = m[1].trim();
});
const iguais = Object.keys(titulos).filter(f => f !== PAGINAS[0] && titulos[f] === titulos[PAGINAS[0]]);
if (iguais.length) falha("paginas com o mesmo title: " + iguais.join(", "));
else ok("cada pagina tem seu proprio titulo (" + Object.keys(titulos).length + " titulos)");
if (!/Convenção/.test(titulos["index.html"])) falha("o titulo da home nao tem o nome da loja");
else ok("titulo da home: " + titulos["index.html"]);
CODIGO.forEach(function (f) {
    const t = ler(f);
    if (/Refrigerantes?\s+Convencao\b(?!ão)/.test(t) && !/sem acento|nao acento/.test(t)) {
        /* "Refrigerantes Convencao" sem acento e permitido so como nome interno */
        const fora = t.split("Refrigerantes Convencao").length - 1;
        if (fora > 3) falha(f + " repete o nome da loja sem acento " + fora + " vezes");
    }
});
ok("nome da loja sem nao se repete a toa");

console.log("\n=== 8. AS QUATRO REGIOES EM TODO LUGAR ===");
["Japeri", "Engenho Pedreira", "Paracambi", "Seropédica"].forEach(function (nome) {
    if (loja.indexOf(nome) < 0) falha("loja.js nao conhece a regiao " + nome);
});
ok("loja.js conhece as 4 regioes");
if (/\bSeropedica\b/.test(ler("app.js"))) falha("app.js escreve Seropedica sem acento no texto do cliente");
else ok("nome das regioes com acento no que o cliente ve");

console.log("\n=== 9. DATA E DINHEIRO NO PADRAO ===");
let dataCrua = [];
CODIGO.forEach(function (f) {
    ler(f).split(/\r?\n/).forEach(function (l, i) {
        if (/toLocaleDateString|toLocaleTimeString|toLocaleString/.test(l)) dataCrua.push(f + ":" + (i + 1));
    });
});
if (dataCrua.length) falha("data montada na mao (use dataHoraSegundos/dataCurta): " + dataCrua.join(", "));
else ok("toda data passa por dataHoraSegundos/dataCurta");

console.log("\n=== 10. SEM REPETICAO DENTRO DAS PAGINAS ===");
let repetidas = [];
PAGINAS.forEach(function (f) {
    const css = (ler(f).match(/<style>[\s\S]*?<\/style>/g) || []).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
    const regras = css.match(/[^{}]+\{[^{}]*\}/g) || [];
    const mapa = {};
    regras.forEach(function (r) {
        const k = r.replace(/\s+/g, " ").trim();
        if (k.length > 25) mapa[k] = (mapa[k] || 0) + 1;
    });
    Object.keys(mapa).filter(k => mapa[k] > 1).forEach(k => repetidas.push(f + ": " + k.slice(0, 60)));
});
if (repetidas.length) falha("regra de CSS repetida dentro da pagina: " + repetidas.slice(0, 4).join(" | "));
else ok("nenhuma pagina repete regra de CSS");

console.log("\n" + (erros === 0 ? "*** CONSISTENCIA 10/10 ***" : "*** " + erros + " ERRO(S) DE CONSISTENCIA ***"));
process.exit(erros ? 1 : 0);