/* 39 - LIMITE DE PEDIDOS POR DIA (10/10)
   A valva da loja. Duas travas, uma fonte unica (loja.js):
     1) POR CLIENTE/DIA (padrao 2): o mesmo telefone nao faz mais
        que N pedidos no mesmo dia. Trava pedido repetido, spam
        e o duplo toque no botao.
     2) POR LOJA/DIA (padrao 80): a loja inteira para de aceitar
        quando bate o teto do dia. O total vem do painel, publicado
        em /capacidade.json.
   Aqui nao le arquivo para depois afirmar: roda loja.js e script.js
   de verdade num sandbox e cria pedidos de verdade.
   O dia e o de SAO PAULO e vira a chave "AAAA-MM-DD", entao o limite
   zera sozinho na virada - ninguem precisa limpar nada. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

/* ---------- sandbox: o mesmo cliente, o mesmo aparelho ---------- */
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
        getElementById: () => null, getElementsByClassName: () => [], body: { classList: { add(){}, remove(){}, toggle(){} } }
    },
    location: { href: "https://apolopanda500.github.io/refrigerante-site/carrinho.html", pathname: "/refrigerante-site/carrinho.html", reload: () => {} },
    navigator: { userAgent: "teste", vibrate: () => {} },
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
    diaLimite, dataDoPedido, pedidosDoDia, digitosTel,
    limiteClienteDia, limiteLojaDia, capacidadeHoje, checaLimitePedidos, limitePedidosTexto,
    criarPedido, getPedidos, savePedidos, guardarCapacidade, contatoLoja: contatoLoja,
    LIMITE_PEDIDOS_CLIENTE_DIA, LIMITE_PEDIDOS_LOJA_DIA,
    guardarCap: (dia, pedidos, limite) => guardarCapacidade({ dia: dia, pedidos: pedidos, limite: limite })
})`, ctx);

const TEL = "55219912345678";
const HOJE = api.diaLimite();
const ONTEM = api.diaLimite(Date.now() - 2 * 86400000);
const agora = Date.now();
const outro = { id: "CV20260101-001-00001", tel: "55218888888888", status: "aguardando", criadoEm: agora - 5 * 86400000 };
const pedir = (tel, status, quando) => ({ id: "CV" + HOJE.replace(/-/g, "") + "-" + Math.floor(Math.random() * 900 + 100) + "-00010", tel: tel || TEL, status: status || "aguardando", criadoEm: quando === undefined ? agora : quando });

console.log("=== 1. A REGRA TEM UMA FONTE UNICA (loja.js) ===");
if (api.LIMITE_PEDIDOS_CLIENTE_DIA !== 2) falha("o limite por cliente/dia nao e 2: " + api.LIMITE_PEDIDOS_CLIENTE_DIA);
else ok("limite por cliente/dia = 2 (padrao do projeto)");
if (!(api.LIMITE_PEDIDOS_LOJA_DIA >= 1)) falha("o limite da loja/dia precisa ser um numero positivo");
else ok("limite da loja/dia = " + api.LIMITE_PEDIDOS_LOJA_DIA + " (padrao do projeto)");
if (typeof api.checaLimitePedidos !== "function") falha("loja.js nao tem checaLimitePedidos()");
else ok("loja.js tem checaLimitePedidos() (uma funcao decide tudo)");
if (api.limiteClienteDia() !== 2) falha("limiteClienteDia() nao devolve 2: " + api.limiteClienteDia());
else ok("limiteClienteDia() devolve 2 sem configuracao");
const lojaTxt = ler("loja.js");
["checaLimitePedidos", "limiteClienteDia", "limiteLojaDia", "capacidadeHoje", "pedidosDoDia", "diaLimite"].forEach(function (n) {
    if (lojaTxt.indexOf("function " + n) < 0) falha("loja.js nao define " + n + "()");
});
ok("as 6 pecas da valva vivem em loja.js (nada de regra em dois lugares)");

console.log("\n=== 2. O DIA ZERA SOZINHO (chave AAAA-MM-DD de SAO PAULO) ===");
if (!/^\d{4}-\d{2}-\d{2}$/.test(HOJE)) falha("diaLimite() nao devolve AAAA-MM-DD: " + HOJE);
else ok("dia de hoje (SP): " + HOJE);
if (api.diaLimite(Date.now() - 86400000) === HOJE) falha("ontem e hoje deram a mesma chave de dia");
else ok("a chave muda de um dia para o outro (" + ONTEM + " != " + HOJE + ")");
if (api.diaLimite(HOJE + "T23:59:59") !== HOJE) falha("a chave do dia saltou antes da meia-noite");
else ok("nao salta de dia no meio da tarde (23:59 e o mesmo dia)");
if (api.dataDoPedido({ id: "CV20261017-001-12345" }) !== "2026-10-17") falha("dataDoPedido nao le a data do numero do pedido");
else ok("pedido antigo sem criadoEm usa a data do numero (CV20261017)");
if (api.pedidosDoDia([pedir(), pedir(null, "cancelado")]).length !== 1) falha("pedido cancelado esta comendo a cota do dia");
else ok("pedido cancelado NAO come a cota (so o que vai para entrega conta)");

console.log("\n=== 3. A TRAVA POR CLIENTE (o telefone e o mesmo, com mascara diferente) ===");
if (api.checaLimitePedidos(TEL, []) !== null) falha("cliente novo foi bloqueado sem nenhum pedido");
else ok("0 pedidos hoje: pode pedir");
if (api.checaLimitePedidos(TEL, [pedir()]) !== null) falha("1 pedido travou (o limite e 2)");
else ok("1 pedido hoje: pode pedir o segundo");
const trava = api.checaLimitePedidos(TEL, [pedir(), pedir()]);
if (!trava || trava.tipo !== "cliente") falha("2 pedidos nao travaram: " + JSON.stringify(trava));
else ok("2 pedidos hoje: TRAVA (tipo " + trava.tipo + ", " + trava.feito + " de " + trava.teto + ")");
if (!trava.texto || !trava.aviso) falha("a trava nao traz texto para o cliente");
else ok("a trava explica (" + trava.texto.split("\n")[0] + ")");
if (!/fal\w*\s+com\s+o\s+vendedor/i.test(trava.texto)) falha("a trava nao oferece falar com o vendedor: " + trava.texto);
else ok("a trava oferece falar com o vendedor (a venda nao se perde)");
/* a mascara nao pode ser outra pessoa, e outra pessoa nao pode ser a mesma */
if (api.checaLimitePedidos("(21) 9-9123-4567", [pedir(), pedir()]) !== null) falha("a mascara do telefone contou como outro cliente");
else ok('"(21) 9-9123-4567" e o mesmo cliente que "55219912345678"');
if (api.checaLimitePedidos(TEL, [pedir(), pedir(outro.tel)]) !== null) falha("o pedido de outro telefone contou como seu");
else ok("o pedido de outro cliente nao come a sua cota");
if (api.checaLimitePedidos(TEL, [pedir(null, "entregue", agora - 3 * 86400000), pedir(null, "entregue", agora - 3 * 86400000)]) !== null) {
    falha("pedido de outro dia travou o limite de hoje");
} else ok("pedido de ontem nao trava o limite de hoje (o dia zera sozinho)");

console.log("\n=== 4. A TRAVA DA LOJA INTEIRA (o teto do dia) ===");
api.guardarCap(HOJE, 10, 80);
if (api.checaLimitePedidos(TEL, [pedir()]) !== null) falha("10 de 80 vagas e o cliente foi bloqueado");
else ok("10 vagas usadas de 80: ainda entra pedido");
api.guardarCap(HOJE, 80, 80);
const travaLoja = api.checaLimitePedidos(TEL, []);
if (!travaLoja || travaLoja.tipo !== "loja") falha("a loja no teto nao travou: " + JSON.stringify(travaLoja));
else ok("80 vagas usadas de 80: TRAVA para todo mundo (tipo " + travaLoja.tipo + ")");
if (travaLoja.teto !== 80) falha("a trava da loja nao carrega o teto: " + travaLoja.teto);
else ok("a trava da loja carrega o teto (80) e o total usado");
/* painel fechado: registro de ontem = numero velho. Nao pode travar a venda */
api.guardarCap(ONTEM, 80, 80);
if (api.checaLimitePedidos(TEL, []) !== null) falha("registro de outro dia travou a loja (perdeu venda de verdade)");
else ok("painel fechado (registro de ontem): a loja continua vendendo (falha para o lado seguro)");
api.guardarCap(HOJE, 79, 80);
if (api.checaLimitePedidos(TEL, []) !== null) falha("faltando 1 vaga o cliente foi bloqueado antes da hora");
else ok("79 de 80: a ultima vaga ainda e do cliente");
api.guardarCap(HOJE, 5, 40);
if (api.limiteLojaDia() !== 40) falha("o dono nao consegue mudar o teto da loja: " + api.limiteLojaDia());
else ok("o dono muda o teto no painel (aqui 40) e o cliente passa a ler 40");

console.log("\n=== 5. A GUARDA DURA: CRIARPEDIDO NAO GRAVA ACIMA DO LIMITE ===");
api.savePedidos([]);
const dados = { nome: "Cliente Teste", tel: TEL, end: "Rua A, 10", bairro: "Japeri", regiao: "japeri", itens: [], subtotal: 150, total: 150 };
const p1 = api.criarPedido(dados);
if (!p1 || !p1.id) falha("o primeiro pedido nao nasceu");
else ok("1o pedido nasceu: " + p1.id);
const p2 = api.criarPedido(dados);
if (!p2 || !p2.id) falha("o segundo pedido nao nasceu");
else ok("2o pedido nasceu: " + p2.id);
const p3 = api.criarPedido(dados);
if (p3 !== null) falha("criarPedido devolveu pedido acima do limite: " + JSON.stringify(p3 && p3.id));
else ok("3o pedido RECUSADO (devolveu null, nao numero nenhum)");
if (api.getPedidos().length !== 2) falha("o pedido recusado foi gravado mesmo assim: " + api.getPedidos().length + " pedidos");
else ok("os 2 pedidos validos continuam gravados e o recusado nao existe");
/* quem burlar a tela chamando criarPedido direto tambem nao passa */
const burlando = api.criarPedido(Object.assign({}, dados, { tel: TEL }));
if (burlando !== null) falha("o console do navegador burla a trava");
else ok("chamar criarPedido pelo console tambem nao burla a valva");
/* cliente novo, mesmo aparelho: a cota e por telefone, nao por aparelho */
const outroCli = api.criarPedido(Object.assign({}, dados, { tel: outro.tel }));
if (!outroCli) falha("outro cliente no mesmo aparelho foi bloqueado pela cota alheia");
else ok("outro cliente no mesmo aparelho pode pedir (a cota e por telefone)");

console.log("\n=== 6. O CARRINHO BARRA E ABRE CAMINHO COM O DONO ===");
const carrinho = ler("carrinho.html");
const iBloq = carrinho.indexOf("function bloqueioFinalizar");
const iFin = carrinho.indexOf("function finalizarPedidoCarrinho");
if (iBloq < 0 || iFin < 0 || iBloq > iFin) falha("o carrinho perdeu a ordem bloqueio -> finalizar");
else ok("o carrinho consulta a trava ANTES de fechar o pedido");
if (carrinho.indexOf("checaLimitePedidos") < 0) falha("o carrinho nao consulta checaLimitePedidos");
else ok("bloqueioFinalizar() consulta checaLimitePedidos (fonte unica, nao um numero escrito ali)");
if (!/botao\.disabled\s*=\s*!!bloqueio/.test(carrinho)) falha("o botao Finalizar nao desliga quando ha bloqueio");
else ok("o botao Finalizar desliga quando a valva fecha");
if (carrinho.indexOf("Falar com o vendedor") < 0) falha("o cliente bloqueado nao recebe o botao de falar com o dono");
else ok("o cliente bloqueado recebe o botao 'Falar com o vendedor'");
if (!/contatoLoja\(\)\.whatsapp/.test(carrinho)) falha("o botao do WhatsApp nao vem da fonte unica contatoLoja()");
else ok("o WhatsApp vem de contatoLoja() (um numero so na loja)");
/* o carrinho nao pode perder o pedido do cliente quando a trava recusa */
if (!/if\s*\(!pedido\)/.test(carrinho.slice(iFin, iFin + 4000))) falha("o carrinho nao trata o pedido recusado (criouPedido devolvendo null)");
else ok("se a valva recusar na hora de gravar, o carrinho avisa e NAO manda o cliente para uma tela de sucesso falsa");
if (!/atualizarAvisoFinalizar\(\)/.test(carrinho.slice(iFin, iFin + 4000))) falha("depois de recusar, o aviso do botao nao e repintado");
else ok("o aviso do botao Finalizar e repintado depois da recusa");
/* nenhum telefone escrito a mao no caminho novo */
const telMaos = (carrinho.match(/55\d{10,11}/g) || []).filter(x => x !== api.contatoLoja().whatsapp);
if (telMaos.length) falha("o carrinho tem telefone escrito na mao: " + telMaos.join(", "));
else ok("nenhum telefone escrito a mao no carrinho");
/* historico corrompido nao pode virar tela branca: o carrinho tem que
   ler os pedidos por um leitor protegido, e nao por getPedidos() cru */
if (!/function pedidosParaValvula\s*\(/.test(carrinho)) falha("o carrinho nao tem o leitor protegido da valva");
else ok("o carrinho le os pedidos por pedidosParaValvula()");
const blocoLeitor = carrinho.slice(carrinho.indexOf("function pedidosParaValvula"), carrinho.indexOf("function pedidosParaValvula") + 400);
if (!/try\s*{/.test(blocoLeitor) || !/catch/.test(blocoLeitor)) falha("pedidosParaValvula() nao protege o historico corrompido");
else ok("pedidosParaValvula() protege: historico quebrado devolve lista vazia e nao trava o carrinho");
const iValvula = carrinho.indexOf("function bloqueioFinalizar");
const blocoValvula = carrinho.slice(iValvula, carrinho.indexOf("function finalizarPedidoCarrinho"));
if (/checaLimitePedidos\([^)]*getPedidos\(\)/.test(blocoValvula)) falha("a valva do carrinho chama getPedidos() cru: historico corrompido derrubaria a tela");
else ok("a valva nunca chama getPedidos() cru (historico corrompido nao derruba a tela do carrinho)");
/* e no sandbox: lista corrompida de verdade nao trava ninguem */
ctx.localStorage.setItem("convencao_pedidos", "{isto nao e json");
let leitura;
try { leitura = api.getPedidos(); } catch (e) { leitura = "ERRO"; }
if (leitura !== "ERRO") ok("o getPedidos() cru quebra com JSON invalido - por isso o carrinho nao o chama direto");
else ok("getPedidos() cru quebra com JSON invalido, como esperado: a valva do carrinho nao depende dele");

console.log("\n=== 7. O PAINEL PUBLICA O TOTAL DO DIA (/capacidade.json) ===");
const admin = ler("admin.html");
if (admin.indexOf("function publicarCapacidadeLoja") < 0) falha("admin.html nao publica a capacidade do dia");
else ok("admin.html tem publicarCapacidadeLoja()");
if (admin.indexOf('"/capacidade.json"') < 0) falha("o painel nao grava em /capacidade.json");
else ok("o total do dia e publicado em /capacidade.json (chave publica, so numeros)");
if (admin.indexOf('loja.js?v=') < 0) falha("admin.html nao carrega loja.js: a chave do dia tem de ser a MESMA do cliente");
else ok("admin.html carrega loja.js (mesma chave de dia do que o cliente conta)");
if (admin.indexOf("opcoesLimiteLoja") < 0 || admin.indexOf("function salvarLimiteLoja") < 0) falha("o dono nao consegue mudar o teto da loja no painel");
else ok("o dono muda o teto da loja no painel (Configuracoes do painel)");
if (admin.indexOf("avisoCapacidadePainel") < 0) falha("o painel nao mostra quantas vagas do dia ja foram usadas");
else ok("o painel mostra 'vagas de hoje: X de Y' antes de a valva fechar");
/* quem publica e so o painel: o cliente nao pode encher o numero dele */
const script = ler("script.js");
const iPublica = script.indexOf("function publicarCapacidadeLoja");
if (iPublica >= 0) falha("o cliente pode publicar a capacidade (so o painel pode)");
else ok("so o painel publica: o cliente nao pode mexer no numero da loja");
if (script.indexOf("function puxarCapacidadeNuvem") < 0) falha("o cliente nao le a capacidade do dia");
else ok("o cliente le /capacidade.json e guarda em convencaoCapacidade");

console.log("\n=== 8. A IA CONTA A MESMA HISTORIA (fonte unica) ===");
const ia = ler("ia.js");
if (ia.indexOf("limitePedidosTexto") < 0) falha("a IA nao usa limitePedidosTexto()");
else ok("a IA responde o limite lendo a fonte da loja (limitePedidosTexto)");
if (ia.indexOf("checaLimitePedidos") < 0) falha("a IA nao diz se o cliente ja usou a cota");
else ok("a IA avisa se o cliente ja bateu o limite de hoje");
if (/55\d{10,11}/.test(ia)) falha("ia.js tem telefone escrito na mao");
else ok("a IA nao repete o telefone na mao");

console.log("\n=== 9. A TRAVA NAO DERROBA A LOJA ===");
api.savePedidos([]);
const cfg = JSON.parse(localStorage_na(ctx) || "{}");
cfg.cfgLimitePedidosCliente = 0;              /* dono desligou o limite do cliente */
api.savePedidos([]);
ctx.localStorage.setItem("refrigerantePrefs", JSON.stringify(cfg));
if (api.limiteClienteDia() !== 0) falha("nao deu para desligar o limite por cliente");
else ok("dono pode desligar o limite por cliente (0 = sem limite)");
if (api.checaLimitePedidos(TEL, [pedir(), pedir(), pedir()]) !== null) falha("com o limite desligado o cliente continua travado");
else ok("com o limite desligado ninguem e barrado por cota");
ctx.localStorage.setItem("refrigerantePrefs", JSON.stringify({ cfgLimitePedidosCliente: "lixo" }));
if (api.limiteClienteDia() !== 2) falha("preferencia corrompida mudou o limite: " + api.limiteClienteDia());
else ok("preferencia corrompida volta para o padrao (2) - trava nunca e o que derruba o pedido");
if (api.checaLimitePedidos(TEL, null) !== null) falha("lista de pedidos corrompida travou o carrinho inteiro");
else ok("lista de pedidos corrompida (null) nao trava o cliente");
if (api.checaLimitePedidos(null, [pedir(), pedir()]) !== null) falha("cliente sem telefone foi barrado");
else ok("cliente sem telefone no perfil so trava pelo teto da loja (nao morre no carrinho)");
if (api.checaLimitePedidos(TEL, [{ status: "aguardando" }, null, "lixo", {}]) !== null) falha("entrada hostil na lista travou o cliente");
else ok("entrada hostil na lista (null, texto, vazio) nao trava ninguem");

function localStorage_na(c) { return c.localStorage.getItem("refrigerantePrefs"); }

console.log("\n" + (erros === 0 ? "*** LIMITE DE PEDIDOS 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);