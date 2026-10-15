/* confere o botao de limpar o carrinho: UM so botao, e que funciona
   com o carrinho cheio e vazio (sem quebrar nada). */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || ".";
const html = fs.readFileSync(path.join(dir, "carrinho.html"), "utf8");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

console.log("=== 1. SO UM BOTAO DE LIMPAR ===");
/* conta so os BOTOES (onclick), nao a definicao da funcao */
const botoesLimpar = (html.match(/onclick="confirmarLimpar\(\)"/g) || []).length;
console.log("  botoes na tela que chamam confirmarLimpar(): " + botoesLimpar);
if (botoesLimpar !== 1) falha("deveria existir 1 botao de limpar, existem " + botoesLimpar);

/* o bloco antigo nao pode existir mais */
["caixaLimpar", "btn-limpar-forte", "btn-limpar-mobile"].forEach(function (morto) {
    if (html.indexOf(morto) >= 0) falha("sobrou o codigo antigo: " + morto);
});
console.log("  codigo do botao antigo removido: " +
    (["caixaLimpar", "btn-limpar-forte", "btn-limpar-mobile"].every(function (x) { return html.indexOf(x) < 0; }) ? "sim" : "nao"));

/* o botao fica DENTRO da barra .acoes (que e fixa no celular) */
const acoes = html.match(/<div class="acoes">([\s\S]*?)<\/div>/);
if (!acoes) falha("nao achei a barra .acoes");
else {
    const temBotao = acoes[1].indexOf("confirmarLimpar()") >= 0;
    console.log("  botao dentro da barra de acoes: " + (temBotao ? "sim" : "nao"));
    if (!temBotao) falha("o botao de limpar precisa ficar na barra .acoes");
}

/* a barra e fixa no celular -> o botao aparece sempre */
if (/position:fixed[^}]*\.acoes\{|@media\(max-width:560px\)[\s\S]{0,400}\.acoes\{position:fixed/.test(html)) {
    console.log("  no celular a barra e fixa: sim (botao sempre a vista)");
} else {
    console.log("  no celular a barra e fixa: nao achou a regra");
    falha("a barra de acoes precisa ser fixa no celular");
}
/* a regra antiga escondeva o botao no celular */
if (/btn-limpar-item\{display:none/.test(html)) falha("o botao novo nao pode ser escondido no celular");

console.log("\n=== 2. O COMPORTAMENTO (simulando os dois casos) ===");
/* extrai as funcoes de limpar e simula */
const fLimpar = html.match(/function confirmarLimpar\(\)\{[\s\S]*?\n\}/)[0];
const fRender = html.match(/function renderCarrinho\(\)\{[\s\S]*?\n\}/);

let alerted = "", confirmado = false;
const sandbox = {
    console, Math, JSON, parseInt, parseFloat, isNaN, String, Array, Object, Number, Date,
    cart: [],                                 /* comeca vazio */
    alert: (t) => { alerted = t; },
    confirm: () => { confirmado = true; return true; },
    limparCarrinho: function () { sandbox.cart = []; },
    renderCarrinho: function () { sandbox.rendered = true; },
    location: { href: "" }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fLimpar, sandbox);

/* caso 1: carrinho VAZIO */
sandbox.cart = [];
alerted = ""; confirmado = false;
sandbox.confirmarLimpar();
console.log("  vazio  -> aviso: \"" + alerted + "\"  (confirmou? " + confirmado + ")");
if (!/vazio/i.test(alerted)) falha("com o carrinho vazio o aviso nao diz que ja esta vazio");

/* caso 2: carrinho CHEIO */
sandbox.cart = [{ nm: "Chopp", qty: 3 }, { nm: "Guarana", qty: 2 }];
alerted = ""; confirmado = false;
vm.runInContext("var cart = [];", sandbox);   /* garante escopo */
sandbox.cart = [{ nm: "Chopp", qty: 3 }, { nm: "Guarana", qty: 2 }];
try {
    vm.runInContext(fLimpar.replace("cart.length", "sandbox.cart.length")
        .replace("cart.reduce", "sandbox.cart.reduce"), Object.assign(sandbox, { sandbox }));
} catch (e) { /* usa a versao do escopo normal */ }
sandbox.confirmarLimpar();
console.log("  cheio -> confirma: " + confirmado + " | itens: " + sandbox.cart.length + " | aviso final: \"" + alerted + "\"");
if (!confirmado) falha("com o carrinho cheio o botao deveria pedir confirmacao");
if (sandbox.cart.length !== 0) falha("o carrinho deveria ter ficado vazio");

console.log("\n=== 3. O BOTAO SEMPRE VISIVEL (nao some quando esvazia) ===");
if (fRender) {
    /* procura no render por exibicao condicional do botao */
    if (/btn-limpar-item[\s\S]{0,200}(length\s*===\s*0|length\s*>\s*0)/.test(fRender[0])) {
        falha("o renderCarrinho parece esconder o botao em algum estado");
    } else {
        console.log("  o botao nao e escondido pelo estado do carrinho: ok");
    }
} else {
    console.log("  (renderCarrinho nao encontrado para checar)");
}

console.log("\n" + (erros === 0 ? "*** CARRINHO 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);