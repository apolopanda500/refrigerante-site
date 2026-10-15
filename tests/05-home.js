/* 05 - PAGINA INICIAL: calendario, tabela geral, ofertas e fotos
   monta as tres funcoes em memoria (sem navegador) e confere o resultado */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
function extrair(nome) {
    const m = app.match(new RegExp("function " + nome + "\\(\\)\\s*\\{[\\s\\S]*?\\n\\}"));
    if (!m) throw new Error("nao achei a funcao " + nome);
    return m[0];
}
const mk = () => ({ _h: "", set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; } });
const cal = mk(), tab = mk(), ofe = mk();

const sandbox = {
    console, Date, Math, JSON, parseInt, parseFloat, isNaN, isFinite, String, Array, Object, Number,
    document: {
        readyState: "complete", addEventListener() {}, querySelectorAll: () => [],
        getElementById: (id) => id === "calendario" ? cal : id === "tabelaInfo" ? tab : id === "tabelaOfertas" ? ofe : null
    },
    localStorage: { getItem: () => null, setItem() {} },
    window: {}, setInterval() {}, setTimeout() {},
    location: { pathname: "/index.html" }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "loja.js"), "utf8"), sandbox, { filename: "loja.js" });
vm.runInContext([
    "var CAMINHOES = [",
    " {id:'verde',cor:'verde',corNome:'Verde',modelo:'Mercedes-Benz L-608 D',placa:'LKC5610',motorista:'LEANDRO',whatsapp:'5521965667468',telefone:'(21) 9-965667468',imagem:'img/608VERDE.jpg',regioes:['seropedica','japeri']},",
    " {id:'azul',cor:'azul',corNome:'Azul',modelo:'Mercedes-Benz L-608 E',placa:'A INFORMAR',motorista:'A INFORMAR',whatsapp:'',telefone:'A INFORMAR',imagem:'',regioes:['paracambi']}",
    "];",
    /* helpers que o app.js usa e que vivem no proprio app.js */
    "function horaTexto(hh,mm){hh=Number(hh);mm=Number(mm)||0;return (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;}",
    "function horaDeMinutos(m){m=Math.floor((Number(m)||0)/60);return {h:m,m:Math.round((Number(m)||0)-m*60)};}",
    "var BANNERS = [",
    " {pos:'topo',acao:'frete',alvo:'',icone:'fa fa-truck',titulo:'Frete grátis',texto:'Calcule.',cor:'#3d4465',ativo:true},",
    " {pos:'topo',acao:'categoria',alvo:'2l',icone:'fa fa-box-open',titulo:'Refrigerantes 2L',texto:'Pack 6.',cor:'#646c9a',ativo:true},",
    " {pos:'meio',acao:'regiao',alvo:'',icone:'fa fa-map-marker-alt',titulo:'Dia de entrega',texto:'Agenda.',cor:'#1dc9b7',ativo:true},",
    " {pos:'meio',acao:'resumo',alvo:'',icone:'fa fa-receipt',titulo:'DUPLICADA',texto:'Nao deve aparecer.',cor:'#646c9a',ativo:false},",
    " {pos:'fim',acao:'carrinho',alvo:'',icone:'fa fa-shopping-cart',titulo:'Ir para o carrinho',texto:'Finalize.',cor:'#ffb822',ativo:true},",
    " {pos:'fim',acao:'categoria',alvo:'35',icone:'fa fa-mug-hot',titulo:'Refrigerantes 350ml',texto:'Pack 6.',cor:'#00752e',ativo:true}",
    "];",
    "var NOMES_CURTOS = { seropedica:'SER', japeri:'JAP', engenhopedreira:'ENG', paracambi:'PAR' };",
    extrair("pintarCalendarioSemanal"), extrair("pintarTabelaGeral"), extrair("pintarTabelaOfertas")
].join("\n"), sandbox, { filename: "partes.js" });

sandbox.pintarCalendarioSemanal();
sandbox.pintarTabelaGeral();
sandbox.pintarTabelaOfertas();

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

console.log("=== MINI CALENDARIO ===");
const h = cal.innerHTML;
const dias = (h.match(/class="cal-dia/g) || []).length;
console.log("  dias: " + dias);
if (dias !== 7) falha("o calendario precisa dos 7 dias, veio " + dias);
["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"].forEach(d => {
    if (h.toLowerCase().indexOf(d) < 0) falha("falta o dia " + d);
});
console.log("  os 7 dias (segunda a domingo)");
["SER", "JAP", "ENG", "PAR"].forEach(s => {
    if ((h.match(new RegExp(s, "g")) || []).length < 2) falha("a sigla " + s + + " aparece de menos");
});
console.log("  as 4 regioes aparecem com pedido e com entrega");

console.log("\n=== TABELA GERAL ===");
const t = tab.innerHTML;
const linhas = (t.match(/<tr/g) || []).length;
console.log("  linhas: " + linhas);
["Pedidos e entregas", "Horários de hoje", "Pagamento, frete e contato", "Nossa frota", "Garantia"]
    .forEach(s => { if (t.indexOf(s) < 0) falha("falta a secao: " + s); });
console.log("  5 secoes presentes");
if (t.indexOf("undefined") >= 0 || t.indexOf("NaN") >= 0) {
    const m = t.match(/.{0,90}(undefined|NaN).{0,60}/);
    falha("a tabela tem undefined/NaN -> ..." + (m ? m[0] : "?"));
} else console.log("  sem undefined/NaN");
if (t.indexOf("608VERDE.jpg") < 0) falha("a foto do caminhao sumiu");
else console.log("  foto do caminhao verde presente");
if ((t.match(/tb-cam-foto/g) || []).length !== 2) falha("esperava 2 espacos de foto na frota");
else console.log("  espaco reservado para o caminhao sem foto");
if (t.indexOf("Hoje (") >= 0) falha("a tabela repete o dia de hoje (o calendario ja mostra)");
else console.log("  nao repete o dia de hoje");

console.log("\n=== TABELA DE OFERTAS ===");
const o = ofe.innerHTML;
const linhasO = (o.match(/<tr>/g) || []).length;
console.log("  linhas: " + linhasO + " (1 cabecalho + ofertas ativas)");
if (o.indexOf("DUPLICADA") >= 0) falha("oferta desativada (duplicada) apareceu");
else console.log("  oferta desativada nao aparece");
if ((o.match(/of-btn/g) || []).length !== linhasO - 1) falha("cada oferta precisa de um botao");
else console.log("  cada oferta tem seu botao");
if (o.indexOf("undefined") >= 0 || o.indexOf("NaN") >= 0) falha("ofertas com undefined/NaN");

console.log("\n" + (erros === 0 ? "*** HOME 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);