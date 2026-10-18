/* 27 - VALOR MINIMO PARA ENTREGA (10/10)
   A loja exige um pedido minimo (padrao R$ 100,00) para ENTREGAR.
   Abaixo disso o carrinho NAO finaliza e avisa quanto falta.
   O valor sai de uma fonte unica (loja.js: entregaMinima()).
   O carrinho hoje e tambem a tela de finalizacao (nao existe mais
   checkout.html), entao e la que a regra barra o pedido. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const loja = ler("loja.js");
const carrinho = ler("carrinho.html");

console.log("=== 1. A REGRA TEM UMA FONTE UNICA (loja.js) ===");
if (!/function entregaMinima\s*\(/.test(loja)) falha("loja.js nao tem a funcao entregaMinima()");
else ok("loja.js tem entregaMinima()");
if (!/cfgPedidoMinimoEntrega/.test(loja)) falha("entregaMinima() nao le a configuracao (cfgPedidoMinimoEntrega)");
else ok("le a configuracao cfgPedidoMinimoEntrega");
if (!/var doServidor = 100/.test(loja)) falha("o valor padrao nao e R$ 100,00");
else ok("valor padrao = R$ 100,00");

console.log("\n=== 2. A FINALIZACAO BARRAS ABAIXO DO MINIMO ===");
if (!/entregaMinima\s*\(/.test(carrinho)) falha("carrinho.html nao usa a regra do minimo");
else ok("carrinho usa entregaMinima()");
if (!/Pedido m[ií]nimo para entrega/.test(carrinho)) falha("o carrinho nao avisa sobre o pedido minimo");
else ok("carrinho avisa sobre o pedido minimo");
/* precisa BLOQUEAR de verdade: o bloqueio vem no return e o botao fica disabled */
if (!/sub < min[\s\S]{0,400}?return/.test(carrinho)) {
    falha("o carrinho avisa mas nao bloqueia (falta o return no bloqueio)");
} else ok("o carrinho bloqueia a finalizacao (return)");
if (!/botao\.disabled\s*=\s*!!bloqueio/.test(carrinho)) falha("o botao de finalizar nao desliga quando o pedido esta bloqueado");
else ok("botao Finalizar desliga com o pedido bloqueado");
if (!/function finalizarPedidoCarrinho\s*\(\s*\)[\s\S]{0,400}?if\s*\(bloqueio\)[\s\S]{0,200}?return/.test(carrinho)) {
    falha("finalizarPedidoCarrinho() nao para quando ha bloqueio");
} else ok("finalizarPedidoCarrinho() para no bloqueio");

console.log("\n=== 3. O CLIENTE VEE O QUANTO FALTA ===");
if (!/Faltam/.test(carrinho)) falha("carrinho.html nao mostra quanto falta para o minimo");
else ok("carrinho mostra quanto falta (Faltam ...)");

console.log("\n=== 4. O MINIMO APARECE NA TELA DE FINALIZACAO ===");
if (!/id="avisoFinalizar"/.test(carrinho)) falha("falta o bloco de aviso (id=avisoFinalizar) na finalizacao");
else ok("carrinho tem o bloco avisoFinalizar");
if (!/atualizarAvisoFinalizar\s*\(\)/.test(carrinho)) falha("o aviso da finalizacao nunca e atualizado");
else ok("o aviso da finalizacao e repintado");

console.log("\n=== 5. A REGRA VALE PARA O PADRAO DO PROJETO ===");
/* o padrao de R$ 100,00 tem que aparecer em loja.js e nos fallbacks usados na tela */
if (!/entregaMinima[\s\S]{0,700}doServidor = 100/.test(loja)) falha("a loja nao tem o padrao 100");
else ok("padrao 100 confirmado em loja.js");

console.log("\n" + (erros === 0 ? "*** ENTREGA MINIMA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);