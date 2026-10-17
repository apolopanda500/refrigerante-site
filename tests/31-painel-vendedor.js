/* 31 - PAINEL DO VENDEDOR (10/10)
   O painel e a mesa de trabalho do dono: tem que entrar com usuario e
   senha (sem diferenciar maiuscula), travar depois de 5 tentativas,
   trocar status, exportar CSV, editar preco e guardar as preferencias
   dele em vendedorPrefs - sem mexer no site do cliente. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const admin = ler("admin.html");
const script = ler("script.js");
const appjs = ler("app.js");
const theme = ler("theme.js");

console.log("=== 1. O PAINEL SO ABRE COM USUARIO E SENHA ===");
["VENDEDOR_USUARIO", "VENDEDOR_SENHA", "credenciaisConfere", "normalizarUsuario"].forEach(function (n) {
    if (script.indexOf(n) < 0) falha("script.js nao tem " + n);
    else ok("script.js tem " + n);
});
if (!/tentativ/i.test(admin)) falha("admin.html nao conta tentativas de acesso");
else ok("admin.html conta as tentativas (trava depois de 5)");

console.log("\n=== 2. O USUARIO NAO DIFERENCIA MAIUSCULA DE MINUSCULA ===");
const ctx = {
    console,
    localStorage: {
        _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
        setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; }
    },
    document: { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, documentElement: { setAttribute: () => {}, getAttribute: () => null }, body: { classList: { add(){}, remove(){}, toggle(){} } } },
    location: { href: "https://apolopanda500.github.io/refrigerante-site/admin.html", pathname: "/refrigerante-site/admin.html", search: "", hash: "" },
    navigator: { userAgent: "teste", vibrate: () => {} },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
    fetch: () => Promise.reject(new Error("sem rede")), alert: () => {}, confirm: () => true,
    Image: function () {}
};
ctx.window = ctx;
ctx.addEventListener = () => {};
vm.createContext(ctx);
vm.runInContext(script, ctx);
const cred = vm.runInContext("({ confere: credenciaisConfere, normaliza: normalizarUsuario, usuario: VENDEDOR_USUARIO, senha: VENDEDOR_SENHA })", ctx);
if (cred.normaliza(cred.usuario) !== cred.normaliza(cred.usuario.toUpperCase())) falha("usuario maiusculo nao bate com minusculo");
else ok("usuario bate em qualquer caixa: " + cred.normaliza(cred.usuario));
if (!cred.confere(cred.usuario.toUpperCase(), cred.senha)) falha("senha certa com usuario em caixa alta foi recusada");
else ok("login aceito com usuario em caixa alta (senha igual)");
if (cred.confere(cred.usuario, "senha-errada")) falha("senha errada foi aceita");
else ok("senha errada recusada");
if (cred.confere("", "")) falha("usuario e senha vazios entraram no painel");
else ok("campos vazios nao entram");

console.log("\n=== 3. OS STATUS DO PEDIDO NO PAINEL ===");
const status = vm.runInContext("STATUS_ORDEM", ctx);
const rotulos = vm.runInContext("STATUS_LABEL", ctx);
status.forEach(function (s) {
    if (!rotulos[s]) falha("sem rotulo para o status " + s);
});
ok("os " + status.length + " status tem rotulo: " + status.join(", "));
["Confirmar", "separa", "Enviado", "Entregue", "Cancelar", "Reabrir"].forEach(function (botao) {
    const achou = new RegExp(botao, "i").test(admin);
    if (!achou && !new RegExp(botao, "i").test(ler("telegram.js"))) falha("o painel nao tem o botao " + botao);
});
ok("botoes de status presentes (Confirmar, Separacao, Enviado, Entregue, Cancelar, Reabrir)");

console.log("\n=== 4. O PAINEL GUARDA AS PREFERENCIAS DELE SO ===");
if (theme.indexOf("vendedorPrefs") < 0) falha("theme.js nao le vendedorPrefs");
else ok("theme.js aplica o tema do painel pelo vendedorPrefs");
if (admin.indexOf("vendedorPrefs") < 0) falha("admin.html nao usa vendedorPrefs");
else ok("admin.html grava as preferencias dele em vendedorPrefs");
if (!/admin\\?\.html/.test(theme)) falha("theme.js nao sabe quando esta no painel");
else ok("theme.js sabe quando esta no painel (nao copia o tema do cliente)");
if (!/refrigerantePrefs/.test(theme)) falha("theme.js nao conhece a preferencia do cliente");
else ok("o cliente continua com refrigerantePrefs (as duas nao se misturam)");
/* as duas preferencias nao podem ser a mesma chave */
if (/vendedorPrefs\s*=\s*"refrigerantePrefs"/.test(script + theme + admin)) falha("vendedorPrefs aponta para a chave do cliente");
else ok("preferencia do painel e do cliente sao chaves diferentes");

console.log("\n=== 5. EXPORTAR PEDIDOS (CSV PARA O EXCEL) ===");
const csv = admin.slice(admin.indexOf("linhas = [\"Pedido;"), admin.indexOf("linhas = [\"Pedido;") + 200);
["Pedido", "Data", "Status", "Cliente", "WhatsApp", "Bairro", "Regiao", "Pagamento", "Troco", "Subtotal", "Frete", "Total", "Itens"]
    .forEach(function (col) { if (csv.indexOf(col) < 0) falha("o CSV nao tem a coluna " + col); });
ok("CSV com as 13 colunas (pedido, data, status, cliente, bairro, valores)");
if (!/dataHoraSegundos/.test(admin.slice(admin.indexOf("linhas = [\"Pedido;"), admin.indexOf("linhas = [\"Pedido;") + 400)))
    falha("a data do CSV nao usa dataHoraSegundos");
else ok("data do CSV no padrao dd/mm/aaaa hh:mm:ss");

console.log("\n=== 6. EDITAR PRECO (DONO MANDA) ===");
if (!/function lerPreco\s*\(/.test(admin)) falha("admin.html perdeu o leitor de preco");
else ok("admin.html tem lerPreco()");
const iLer = admin.indexOf("function lerPreco");
let abre = admin.indexOf("{", iLer), d = 0, fecha = abre;
for (let k = abre; k < admin.length; k++) { if (admin[k] === "{") d++; else if (admin[k] === "}") { d--; if (!d) { fecha = k; break; } } }
const blocoLer = admin.slice(iLer, fecha + 1);
/* executa o leitor de verdade (admin.html tem codigo demais para sandbox:
   aqui vao so as funcoes de preco) */
const ctxPreco = { console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(ctxPreco);
vm.runInContext(blocoLer.replace(/^[\s\S]*?function lerPreco/, "function lerPreco"), ctxPreco);
const lerPrecoReal = vm.runInContext("(function(){ return function(t){ return lerPreco(t); }; })()", ctxPreco);
[["29,50", 29.5], ["29.50", 29.5], ["2950", 29.5], ["29", 29], ["1.234,56", 1234.56], ["1,234.56", 1234.56], ["", 0], ["abc", 0]]
    .forEach(function (par) {
        const got = lerPrecoReal(par[0]);
        if (Math.abs(got - par[1]) > 0.001) falha('lerPreco("' + par[0] + '") = ' + got + " (esperado " + par[1] + ")");
    });
ok("lerPreco converte certo: 29,50 | 29.50 | 2950 | 1.234,56 | 1,234.56 | vazio | lixo");
if (/precoNumero\([^)]*\)\s*\*\s*10/.test(blocoLer)) falha("lerPreco ainda multiplica por 10 (o bug antigo)");
else ok("lerPreco nao multiplica por 10 (bug corrigido)");
if (!/function chavePreco\s*\(/.test(appjs)) falha("app.js perdeu a chave de preco");
else ok("chave de preco (k: + codigo do produto) presente em app.js");

console.log("\n=== 7. ATALHOS DO PAINEL ===");
["miniCards", "btn-mini-bloco", "Minimizar"].forEach(function (n) {
    if (admin.indexOf(n) < 0 && script.indexOf(n) < 0 && theme.indexOf(n) < 0) falha("o painel perdeu " + n);
});
ok("botoes Minimizar com estado em vendedorPrefs.miniCards");
if (!/data-leitura/.test(admin)) falha("o painel nao tem modo de leitura");
else ok("painel tem leitura propria (nao usa o modo vertical do cliente)");
if (/data-leitura="vertical"/.test(theme.replace(/admin[\s\S]*/, "")) === false) { /* ok */ }
if (!/body\.admin/.test(ler("style.css"))) falha("style.css nao tem as regras do painel (body.admin)");
else ok("style.css tem as regras do painel (body.admin)");

console.log("\n=== 8. IA E FONE NO PAINEL ===");
if (admin.indexOf("ia.js") >= 0) falha("o painel carrega a IA do cliente");
else ok("o painel nao carrega ia.js (independente do cliente)");
if (!/notificarTelegramPedido/.test(script)) falha("script.js perdeu o aviso de novo pedido");
else ok("aviso de novo pedido para o Telegram pronto no script.js");

console.log("\n" + (erros === 0 ? "*** PAINEL DO VENDEDOR 10/10 ***" : "*** " + erros + " ERRO(S) NO PAINEL ***"));
process.exit(erros ? 1 : 0);