/* 03 - PRECOS (10/10)
   - ler o que o dono digita ("27,50", "27.5", "1.234,56")
   - travar o erro de digito (275,00 no lugar de 27,50)
   - formatar sempre com 2 casas: "R$ 27,50" (nunca 27.0) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

const loja = fs.readFileSync(path.join(dir, "loja.js"), "utf8");
const bloco = loja.slice(loja.indexOf("/* ---------- DINHEIRO"), loja.indexOf("function semAcento(t)"));
const sb = { console, parseFloat, isFinite, isNaN, String, Math };
vm.createContext(sb);
vm.runInContext(bloco, sb, { filename: "loja.js" });

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

console.log("=== precoNumero: ler o que o dono digita ===");
[["R$ 27,50", 27.5], ["27,50", 27.5], ["27.50", 27.5], ["27.5", 27.5], ["2750", 2750],
["R$ 1.234,56", 1234.56], ["1,234.56", 1234.56], ["R$ 0,90", 0.9], ["33,40", 33.4],
["", 0], [null, 0], ["abc", 0], [27.5, 27.5], ["R$ 19,00", 19]].forEach(function (e) {
    const got = sb.precoNumero(e[0]);
    if (Math.abs(got - e[1]) > 0.005) falha("precoNumero(" + JSON.stringify(e[0]) + ") = " + got + " (esperado " + e[1] + ")");
});
console.log("  ok  14 formatos lidos sem errar a casa");

console.log("\n=== precoSaneio: trava o erro de digito (x10) ===");
[["R$ 275,00", "R$ 27,50", 27.5], [275, "R$ 27,50", 27.5], ["R$ 2,75", "R$ 27,50", 27.5],
["R$ 330,00", "R$ 33,00", 33], ["R$ 27,50", "R$ 27,50", 27.5], ["R$ 29,50", "R$ 29,50", 29.5],
[0, "R$ 27,50", 27.5]].forEach(function (c) {
    const got = sb.precoSaneio(c[0], c[1]);
    if (Math.abs(got - c[2]) > 0.005) falha("precoSaneio(" + c[0] + ", " + c[1] + ") = " + got + " (esperado " + c[2] + ")");
});
console.log("  ok  275 vira 27,50; 2,75 vira 27,50; preco certo passa intacto");

console.log("\n=== precoTexto: como o preco aparece na tela ===");
[[27.5, "R$ 27,50"], ["R$ 27,50", "R$ 27,50"], [27, "R$ 27,00"], [27.0, "R$ 27,00"],
[33.4, "R$ 33,40"], [0, "R$ 0,00"], [455, "R$ 455,00"], [27.499, "R$ 27,50"]].forEach(function (e) {
    const got = sb.precoTexto(e[0]);
    if (got !== e[1]) falha("precoTexto(" + e[0] + ") = \"" + got + "\" (esperado \"" + e[1] + "\")");
});
console.log("  ok  sempre 2 casas, com virgula e com R$");

console.log("\n=== precoNumeroBR (sem o R$) ===");
[[27.5, "27,50"], [27, "27,00"], [0, "0,00"]].forEach(function (e) {
    const got = sb.precoNumeroBR(e[0]);
    if (got !== e[1]) falha("precoNumeroBR(" + e[0] + ") = " + got);
});
console.log("  ok");

console.log("\n=== formatBRL: o dinheiro como o cliente ve (carrinho, checkout, painel) ===");
/* formatBRL e a fonte unica de dinheiro do site inteiro (carrinho, checkout,
   meus-pedidos, painel e a mensagem do Telegram). Sem separador de milhar o
   total do carrinho aparecia "R$ 4260,00" e o cliente nao via a quebra. */
const scriptTxt = fs.readFileSync(path.join(dir, "script.js"), "utf8");
const iniFmt = scriptTxt.indexOf("function formatBRL");
const fimFmt = scriptTxt.indexOf("\n}", iniFmt) + 2;
const sbF = { console, parseFloat, isFinite, isNaN, Math, String };
vm.createContext(sbF);
vm.runInContext(scriptTxt.slice(iniFmt, fimFmt), sbF, { filename: "script.js" });
[[27.5, "R$ 27,50"], [27, "R$ 27,00"], [0, "R$ 0,00"], [0.9, "R$ 0,90"],
[999.99, "R$ 999,99"],
[1000, "R$ 1.000,00"], [1375, "R$ 1.375,00"], [4260, "R$ 4.260,00"],
[12345.67, "R$ 12.345,67"], [1000000, "R$ 1.000.000,00"],
[-12.5, "R$ -12,50"],
[NaN, "R$ 0,00"], [undefined, "R$ 0,00"], [null, "R$ 0,00"], ["abc", "R$ 0,00"]
].forEach(function (e) {
    const got = sbF.formatBRL(e[0]);
    if (got !== e[1]) falha("formatBRL(" + e[0] + ") = \"" + got + "\" (esperado \"" + e[1] + "\")");
});
console.log("  ok  2 casas, virgula, ponto de milhar e valor quebrado vira 0,00");
/* nenhuma pagina pode montar dinheiro na mao (regressao do milhar) */
const paginasDinheiro = ["app.js", "carrinho.html", "meus-pedidos.html",
    "pedido-sucesso.html", "admin.html"].map(f => [f, fs.readFileSync(path.join(dir, f), "utf8")]);
const montaNaMao = [];
paginasDinheiro.forEach(function (par) {
    [...par[1].matchAll(/R\$\s*["']?\s*\+?\s*[a-zA-Z_$][\w.$]*\.toFixed/g)]
        .forEach(m => montaNaMao.push(par[0] + ": " + m[0]));
});
if (!montaNaMao.length) console.log("  ok  ninguem escreve \"R$ \" + valor.toFixed na mao");
montaNaMao.forEach(m => falha("dinheiro montado na mao (use formatBRL): " + m));

console.log("\n=== NENHUM PRECO CRU NA TELA (sem formatar) ===");
const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const cart = fs.readFileSync(path.join(dir, "carrinho.html"), "utf8");
const junto = app + cart;
const linhasRuins = junto.split("\n").map((l, i) => [i + 1, l])
    .filter(([, l]) => /<span class="pp">\s*\+?\s*[a-z]\.pr/.test(l) || /'>\s*\+\s*[a-z]\.pr\s*\+/.test(l));
linhasRuins.forEach(([n, l]) => falha("linha " + n + " mostra o preco cru: " + l.trim().substring(0, 70)));
if (!linhasRuins.length) console.log("  ok  o preco do produto sempre passa pelo precoTexto()");

console.log("\n" + (erros === 0 ? "*** PRECOS 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);