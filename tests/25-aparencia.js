/* 25 - APARENCIA (10/10)
   A opcao "Animações reduzidas" ("Reduzir animações da interface") tem que
   existir de ponta a ponta: o cartao na tela, o interruptor, o salvamento,
   a aplicacao do atributo e o CSS que de fato corta as animacoes. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const cfgH = ler("configuracoes.html");
const tema = ler("theme.js");
const css = ler("style.css");

console.log("=== 1. O CARTAO \"Aparência\" NA TELA ===");
if (!/Apar\u00EAncia/.test(cfgH)) falha("configuracoes.html nao tem o cartao Aparência");
else ok("cartao Aparência presente");
if (!/Anima\u00E7\u00F5es reduzidas/.test(cfgH)) falha("falta o rotulo \"Animações reduzidas\"");
else ok("rotulo \"Animações reduzidas\" presente");
if (!/Reduzir anima\u00E7\u00F5es da interface/.test(cfgH)) falha("falta a descricao \"Reduzir animações da interface\"");
else ok("descricao \"Reduzir animações da interface\" presente");

console.log("\n=== 2. O INTERRUPTOR ===");
const inputs = cfgH.match(/id="cfgReducedMotion"/g) || [];
if (inputs.length !== 1) falha("o interruptor cfgReducedMotion aparece " + inputs.length + " vez(es) (era 1)");
else ok("um interruptor so (cfgReducedMotion)");
if (!/type="checkbox" id="cfgReducedMotion"/.test(cfgH)) falha("cfgReducedMotion nao e um checkbox");
else ok("e um interruptor liga/desliga");

console.log("\n=== 3. O SALVAMENTO ===");
if (!/var ids\s*=\s*\[[^\]]*"cfgReducedMotion"/.test(cfgH)) falha("cfgReducedMotion nao e salvo junto das outras opcoes");
else ok("a escolha e salva nas preferencias");
if (!/salvarPrefs|localStorage\.setItem\("refrigerantePrefs"/.test(cfgH)) falha("configuracoes.html nao grava as preferencias");
else ok("grava em refrigerantePrefs");

console.log("\n=== 4. A APLICACAO (theme.js) ===");
if (!/cfgReducedMotion/.test(tema)) falha("theme.js nao le a opcao cfgReducedMotion");
else ok("theme.js le a opcao");
const liga = /setAttribute\(\s*"data-motion"\s*,\s*"reduced"\s*\)/.test(tema);
const desliga = /removeAttribute\(\s*"data-motion"\s*\)/.test(tema);
if (!liga) falha("theme.js nao liga o atributo data-motion=reduced");
else ok("liga data-motion=\"reduced\" quando marcado");
if (!desliga) falha("theme.js nao tira o atributo quando desmarcado (o botao so ligaria)");
else ok("tira o atributo quando desmarcado");

console.log("\n=== 5. O CSS QUE CORTA AS ANIMACOES ===");
const bloco = (css.match(/\[data-motion="reduced"\][^{]*\{[^}]*\}/g) || []).join(" ");
if (!bloco) falha("style.css nao tem regra [data-motion=\"reduced\"] (o interruptor nao faria nada)");
else {
    ok("existe a regra [data-motion=\"reduced\"]");
    if (!/animation-duration\s*:\s*0*(\.\d+)?m?s/.test(bloco)) falha("nao corta animation-duration");
    else ok("corta a duracao das animacoes");
    if (!/transition-duration\s*:\s*0*(\.\d+)?m?s/.test(bloco)) falha("nao corta transition-duration");
    else ok("corta a duracao das transicoes");
    if (!/!important/.test(bloco)) falha("sem !important outra regra pode vencer e a animacao nao para");
    else ok("usa !important para valer em cima de tudo");
}

console.log("\n=== 6. A OPCAO VALE NAS PAGINAS DO CLIENTE ===");
const paginas = ["index.html", "carrinho.html", "perfil.html",
    "meus-pedidos.html", "pedido-sucesso.html", "configuracoes.html"];
const semTema = paginas.filter(function (f) { return !/theme\.js/.test(ler(f)); });
if (semTema.length) falha("estas paginas nao carregam o theme.js: " + semTema.join(", "));
else ok("as " + paginas.length + " paginas do cliente carregam o theme.js");

console.log("\n" + (erros === 0 ? "*** APARENCIA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);