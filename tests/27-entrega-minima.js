/* 27 - VALOR MINIMO PARA ENTREGA (10/10)
   A loja exige um pedido minimo (padrao R$ 100,00) para ENTREGAR.
   Abaixo disso o checkout nao finaliza e o carrinho avisa quanto falta.
   O valor sai de uma fonte unica (loja.js: entregaMinima()). */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const loja = ler("loja.js");
const checkout = ler("checkout.html");
const carrinho = ler("carrinho.html");

console.log("=== 1. A REGRA TEM UMA FONTE UNICA (loja.js) ===");
if (!/function entregaMinima\s*\(/.test(loja)) falha("loja.js nao tem a funcao entregaMinima()");
else ok("loja.js tem entregaMinima()");
if (!/cfgPedidoMinimoEntrega/.test(loja)) falha("entregaMinima() nao le a configuracao (cfgPedidoMinimoEntrega)");
else ok("le a configuracao cfgPedidoMinimoEntrega");
if (!/\?\s*100\s*:/.test(loja) && !/return 100/.test(loja)) falha("o valor padrao nao e R$ 100,00");
else ok("valor padrao = R$ 100,00");

console.log("\n=== 2. O CHECKOUT BLOQUEIA ABAIXO DO MINIMO ===");
if (!/entregaMinima\s*\(/.test(checkout)) falha("checkout.html nao usa a regra do minimo");
else ok("checkout usa entregaMinima()");
if (!/Pedido m[ií]nimo para entrega/.test(checkout)) falha("o checkout nao avisa sobre o pedido minimo");
else ok("checkout avisa sobre o pedido minimo");
/* precisa BLOQUEAR de verdade: return depois do aviso */
if (!/abaixoMinimo[\s\S]{0,900}?return/.test(checkout) && !/_sub < _min[\s\S]{0,900}?return/.test(checkout)) {
    falha("o checkout avisa mas nao bloqueia (falta o return)");
} else ok("o checkout bloqueia a finalizacao (return)");
if (!/id="avisoMinimo"/.test(checkout)) falha("falta o bloco de aviso (id=avisoMinimo) no checkout");
else ok("checkout tem o bloco avisoMinimo");

console.log("\n=== 3. O CARRINHO AVISA O QUANTO FALTA ===");
if (!/entregaMinima\s*\(/.test(carrinho)) falha("carrinho.html nao usa entregaMinima()");
else ok("carrinho usa entregaMinima()");
if (!/Pedido m[ií]nimo para entrega/.test(carrinho)) falha("carrinho.html nao avisa sobre o minimo");
else ok("carrinho avisa sobre o minimo");

console.log("\n=== 4. O MINIMO APARECE NA TELA DE ENTREGA ===");
if (!/id="infoFreteTexto"/.test(checkout)) falha("checkout.html nao mostra a regra do minimo (infoFreteTexto)");
else ok("checkout mostra a regra na secao de entrega");

console.log("\n=== 5. A REGRA VALE PARA O PADRAO DO PROJETO ===");
/* o padrao de R$ 100,00 tem que aparecer em loja.js e nos fallbacks usados na tela */
if (!/entregaMinima[^\n]*100|100[^\n]*entregaMinima|return 100/.test(loja)) falha("a loja nao tem o padrao 100");
else ok("padrao 100 confirmado em loja.js");

console.log("\n" + (erros === 0 ? "*** ENTREGA MINIMA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);
