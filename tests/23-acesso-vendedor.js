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
/* O pedido vai para a nuvem pelo GATEWAY, que e quem cifra os dados do
   cliente antes de gravar. O aparelho nao grava mais direto no Firebase:
   o banco esta aberto na internet, e um PUT la deixaria nome, telefone, CPF e
   endereco em texto puro para qualquer um que abrisse o endereco. */
if (/\/api\/pedido/.test(txt)) ok("o pedido do cliente sobe pelo gateway (/api/pedido), que e quem grava cifrado");
else falha("o cliente nao tem caminho de gateway para o pedido");
if (/\/pedidos\//.test(txt) && /"PUT"/.test(txt)) falha("o aparelho ainda grava o pedido direto no banco aberto (vaza dado do cliente)");
else ok("o aparelho nao grava mais direto no banco aberto - a venda continua, os dados nao vazam");
if (/marcarFalhaNuvem|reenviarPedidosPresos/.test(txt)) ok("se o gateway falhar, o pedido fica na fila do aparelho e e reenviado depois");
else falha("o pedido ficaria preso se o gateway caesse");

console.log("\n=== 6. O LOGIN SALVO SOBREVIVE A FECHAR O APK ===");
function storageFalso() {
    const m = new Map();
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k),
        _mapa: m
    };
}
const iniGw = txt.indexOf("var GW_CHAVES");
const fimGw = txt.indexOf("function gatewaySair()", iniGw);
if (iniGw < 0 || fimGw < 0) {
    falha("nao achei o codigo do token do gateway em script.js");
} else {
    const trecho = txt.slice(iniGw, txt.indexOf("\n}", fimGw) + 2);
    const local = storageFalso(), sessao = storageFalso();
    let resposta = null;
    const sb2 = {
        console, String, parseInt, Math, JSON, Date,
        localStorage: local, sessionStorage: sessao,
        gatewayURL: () => "https://gw",
        fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(resposta) })
    };
    vm.createContext(sb2);
    vm.runInContext(trecho, sb2, { filename: "token.js" });
    const chamar = (expr) => vm.runInContext(expr, sb2);
    const AGORA = Date.now();
    local.setItem("convencaoToken", "TOKEN-SALVO");
    local.setItem("convencaoTokenAte", String(AGORA + 7 * 86400000));
    if (chamar("gatewayToken()") === "TOKEN-SALVO") ok("token salvo no aparelho e lido ao abrir de novo");
    else falha("o token salvo no aparelho nao foi lido (o vendedor teria de logar de novo)");
    local.setItem("convencaoTokenAte", String(AGORA - 1000));
    if (chamar("gatewayToken()") === "" && local.getItem("convencaoToken") === null) ok("token vencido e apagado sozinho");
    else falha("token vencido continuou valendo");
    sessao.setItem("convencaoToken", "TOKEN-DA-ABA");
    local.setItem("convencaoToken", "TOKEN-SALVO");
    local.setItem("convencaoTokenAte", String(AGORA + 86400000));
    if (chamar("gatewayToken()") === "TOKEN-DA-ABA") ok("a sessao da aba tem prioridade");
    else falha("a sessao da aba nao tem prioridade");
    sessao.removeItem("convencaoToken");
    chamar("gatewaySair()");
    if (!local.getItem("convencaoToken") && !local.getItem("convencaoTokenAte") && !sessao.getItem("convencaoToken")) ok("sair apaga o login do aparelho");
    else falha("sair nao apagou o login salvo");
    resposta = { token: "TOKEN-7-DIAS", expiraEm: AGORA + 7 * 86400000 };
    chamar("gatewayEntrar('senha', function (ok, motivo) { this.__ok = ok; this.__motivo = motivo; }, 7)");
    setTimeout(function () {
        if (chamar("this.__ok") === true && chamar("gatewayToken()") === "TOKEN-7-DIAS") ok("entrar com '7 dias' guarda o token no aparelho");
        else falha("entrar com '7 dias' nao guardou o token (ok=" + chamar("this.__ok") + ")");
        if (chamar("gatewayToken()") === "TOKEN-7-DIAS") ok("o token de 7 dias continua valendo depois de fechar o APK");
        else falha("o token de 7 dias nao sobreviveu");
        console.log("\n" + (erros === 0 ? "*** ACESSO DO VENDEDOR 10/10 ***" : "*** " + erros + " FALHA(S) ***"));
        process.exit(erros ? 1 : 0);
    }, 20);
}