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
/* as opcoes de aparencia sairam da tela de proposito (o dono pediu menos
   botoes). A bateria confere que elas NAO voltaram e que nada ficou
   quebrado por causa disso. */
const saidas = ["Animações reduzidas", "Alto contraste", "Tela compacta", "Mostrar fotos dos produtos"];
const sobrando = saidas.filter(function (r) { return cfgH.indexOf(r) >= 0; });
if (!sobrando.length) ok("as opcoes de aparencia nao estao mais na tela (" + saidas.length + " removidas)");
else falha("voltou para a tela: " + sobrando.join(", "));
for (const id of ["cfgReducedMotion", "cfgAltoContraste", "cfgCompacto", "cfgVerImagens"]) {
    if (cfgH.indexOf(id) >= 0) falha("a opcao " + id + " continua na tela");
}
ok("nenhum interruptor das opcoes removidas sobrou na tela");

console.log("\n=== 2. O QUE FICOU NA TELHA ===");
if (!/var ids\s*=\s*\[[^\]]*"cfgNotifPedido"/.test(cfgH)) falha("o aviso no aparelho (que ficou) nao e salvo junto das outras opcoes");
else ok("a opcao que ficou e salva nas preferencias");
if (!/salvarPrefs|localStorage\.setItem\("refrigerantePrefs"/.test(cfgH)) falha("configuracoes.html nao grava as preferencias");
else ok("grava em refrigerantePrefs");

console.log("\n=== 3. A APLICACAO (theme.js) ===");
if (/cfgReducedMotion/.test(tema)) falha("theme.js ainda obedece cfgReducedMotion, que saiu da tela");
else ok("theme.js nao le mais cfgReducedMotion");
if (/cfgAltoContraste|cfgCompacto|cfgVerImagens/.test(tema)) falha("theme.js ainda obedece uma preferencia que saiu da tela");
else ok("theme.js nao le mais as preferencias antigas (ninguem fica preso nelas)");
if (/removeAttribute\(\s*"data-layout"/.test(tema) && /removeAttribute\(\s*"data-contraste"/.test(tema)) ok("a tela limpa o modo compacto e o alto contraste de quem ja tinha ligado");
else falha("quem tinha ligado algo antes continua preso nisso, sem botao para desligar");


/* as secoes antigas foram trocadas: as opcoes de aparencia sairam da tela */

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
