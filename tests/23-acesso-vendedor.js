/* 23 - ACESSO DO VENDEDOR (10/10)
   Um acesso so (usuario + senha) e a trava de 5 tentativas, e o painel
   baixo os pedidos de TODO aparelho pela nuvem. O usuario nao distingue
   maiuscula/minuscula: o dono nao pode ficar trancado fora por causa da caixa. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = process.env.WDIR || path.resolve(__dirname, "..");
const txt = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const ini = txt.indexOf("const VENDEDOR_USUARIO");
const fim = txt.indexOf("/* ---------- validacao de CPF", ini);
const sb = { console, String, parseInt, Math };
vm.createContext(sb);
vm.runInContext(txt.slice(ini, fim), sb, { filename: "script.js" });
/* const/let nao viram propriedade do sandbox: le por expressao */
const ler = function (nome) {
    return vm.runInContext(nome, sb);
};
const USU = ler("VENDEDOR_USUARIO"), SENHA = ler("VENDEDOR_SENHA");
const conferir = function (u, s) {
    return ler("credenciaisConfere(" + JSON.stringify(String(u)) + "," + JSON.stringify(String(s)) + ")");
};

let erros = 0;
const falha = function (m) { console.log("  ERRO " + m); erros++; };
const ok = function (m) { console.log("  ok   " + m); };

console.log("=== 1. AS CREDENCIAIS DO DONO ===");
const usuario = USU, senha = SENHA;
console.log("  usuario cadastrado: " + usuario);
console.log("  tamanho da senha  : " + senha.length + " caracteres");
if (!usuario) falha("usuario vazio");
if (senha.length < 8) falha("senha curta demais (" + senha.length + "): facil de adivinhar");

console.log("\n=== 2. A SENHA CERTA ABRE ===");
[[usuario, senha, "como o dono digita"],
[usuario.toLowerCase(), senha, "usuario em minuscula"],
[usuario.toUpperCase(), senha, "usuario em maiuscula"],
["  " + usuario + "  ", senha, "usuario com espaco nas pontas"]].forEach(function (c) {
    if (conferir(c[0], c[1]) === true) ok("abre com " + c[2]);
    else falha("NAO abriu com " + c[2] + " (o dono ficaria trancado fora)");
});

console.log("\n=== 3. SENHA ERRADA NAO ABRE ===");
[["Apolopanda500", "naruto123@", "senha com outra caixa"],
[usuario, senha + "a", "senha com letra a mais"],
["" + senha.slice(0, -1), "senha sem o ultimo caractere"],
["", "senha vazia"],
[usuario, ""], "senha vazia de novo"].slice(0, 4).forEach(function (c) {
    if (conferir(c[0], c[1]) === false) ok("rejeita " + c[2]);
    else falha("ACEITOU " + c[2] + " - qualquer um entra no painel!");
});

console.log("\n=== 4. USUARIO ERRADO NAO ABRE ===");
[["admin", senha], ["apolopanda", senha], [usuario + "x", senha], [usuario + " ", senha + " "]].forEach(function (c) {
    if (conferir(c[0], c[1]) === false) ok('rejeita "' + c[0].trim() + '"');
    else falha('ACEITOU o usuario "' + c[0].trim() + '"');
});

console.log("\n=== 5. UM ACESSO SO, PARA TODOS OS PEDIDOS ===");
const painel = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
if (/sincronizarPedidosNuvem/.test(painel)) ok("o painel chama sincronizarPedidosNuvem (baixa os pedidos de todo aparelho)");
else falha("o painel nao sincroniza com a nuvem: so veria os pedidos deste aparelho");
if (/function sincronizarPedidosNuvem/.test(txt) && /\/pedidos\.json/.test(txt)) ok("a sincronizacao le /pedidos.json da nuvem");
else falha("sincronizarPedidosNuvem nao le a nuvem");
if (/\/pedidos\//.test(txt) && /"PUT"/.test(txt)) ok("o pedido do cliente e gravado na nuvem (PUT)");
else falha("o cliente nao grava o pedido na nuvem: o dono so veria apos trocar de aparelho");

console.log("\n" + (erros === 0 ? "*** ACESSO DO VENDEDOR 10/10 ***" : "*** " + erros + " FALHA(S) ***"));
process.exit(erros ? 1 : 0);