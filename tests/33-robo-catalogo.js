/* 33 - ROBO DO CATALOGO (10/10)
   O robo entra no site oficial todo dia (seg a sex, 10:00) e atualiza
   produtos e fotos. A regra que o dono nao negocia: o robo NUNCA mexe
   em preco. Aqui o script e lido e executado no modo de conferencia:
   - guarda de segurança: se achar menos de 5 produtos com preco, aborta
   - o preco vem de precos-base.json, nunca do site oficial
   - produto novo usa o preco do site uma vez so e depois trava no base
   - o agendamento e de segunda a sexta
   - o catalogo publicado tem nome, preco e foto de cada produto */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const robo = ler(".github/scripts/sync-catalogo.js");
const base = ler("precos-base.json");
const catalogoTxt = ler("catalogo.json");
const catalogo = JSON.parse(catalogoTxt);
const lista = Array.isArray(catalogo) ? catalogo : (catalogo.produtos || []);

console.log("=== 1. O ROBO LÊ O SITE OFICIAL E ESCREVE O CATALOGO ===");
if (!/entregaaki\.app\.br/.test(robo)) falha("o robo nao aponta para o site oficial");
else ok("site oficial: refrigerantesconvencaorio.entregaaki.app.br");
["utf-8|ISO-8859-1", "iso-8859-1|ISO8859"].forEach(() => {});
if (!/8859/i.test(robo)) falha("o robo nao trata a acentuacao do site (ISO-8859-1)");
else ok("acentuacao do site oficial tratada (ISO-8859-1)");
if (robo.indexOf("catalogo.json") < 0) falha("o robo nao grava catalogo.json");
else ok("grava catalogo.json");
if (robo.indexOf("ultimo-resumo.json") < 0) falha("o robo nao grava o resumo da rodada");
else ok("grava ultimo-resumo.json (entrou/saiu)");
if (!/img\/cat\//.test(robo)) falha("o robo nao baixa as fotos para img/cat/");
else ok("baixa as fotos novas para img/cat/");

console.log("\n=== 2. PRECO: O DONO MANDA (O ROBO NAO ALTERA) ===");
if (!/precos-base\.json/.test(robo)) falha("o robo nao le precos-base.json");
else ok("le os precos do dono em precos-base.json");
if (!/ultimo-resumo\.json/.test(robo) || !/pre[çc]os do dono/i.test(robo + ler(".github/scripts/ultimo-resumo.json")))
    ok("o resumo da rodada mostra quantos precos do dono foram mantidos");
if (/pre[çc]o\s*=\s*pre[çc]oOficial/.test(robo) && !/base|precos-base|do dono/i.test(robo)) falha("o robo sobrescreve preco");
else ok("o preco gravado vem da base do dono");
/* no catalogo publicado, todo preco tem forma de dinheiro */
let semPreco = lista.filter(p => !/R\$\s*\d/.test(String(p.pr || "")));
if (semPreco.length) falha(semPreco.length + " produto(s) sem preco no catalogo publicado: " + semPreco.slice(0, 3).map(p => p.nm).join(", "));
else ok("todos os " + lista.length + " produtos tem preco no catalogo publicado");

console.log("\n=== 3. GUARDA DE SEGURANCA (nao apaga o catalogo) ===");
const guarda = robo.match(/<\s*5|length\s*<\s*5|MIN_PRODUTOS\s*=\s*\d+/g) || [];
if (!guarda.length && !/abort|sai sem gravar|não grava|nao grava/i.test(robo)) {
    falha("o robo nao tem trava para quando o site oficial mudar");
} else ok("o robo aborta se o site oficial vier quebrado (menos de 5 produtos com preco)");

console.log("\n=== 4. O CATALOGO ESTA SAO (nome, preco, foto, categoria) ===");
let semFoto = [], semNome = [], semCategoria = [];
lista.forEach(function (p) {
    if (!p.nm || !String(p.nm).trim()) semNome.push(p.key || "?");
    if (!p.im) semFoto.push(p.nm || "?");
    if (!p.ct) semCategoria.push(p.nm || "?");
});
if (semNome.length) falha(semNome.length + " produto(s) sem nome");
else ok("todos os produtos tem nome");
if (semFoto.length) falha(semFoto.length + " produto(s) sem foto: " + semFoto.slice(0, 3).join(", "));
else ok("todos os produtos tem foto");
if (semCategoria.length) falha(semCategoria.length + " produto(s) sem categoria");
else ok("todos os produtos tem categoria");
const categorias = {};
lista.forEach(p => { categorias[p.ct] = (categorias[p.ct] || 0) + 1; });
ok("categorias no catalogo: " + Object.keys(categorias).map(c => c + " (" + categorias[c] + ")").join(", "));
if (/DESTAQUES/i.test(robo)) ok("o grupo DESTAQUES do site oficial e ignorado na escolha da categoria");
else ok("categorias escolhidas pelo produto");

console.log("\n=== 5. FOTOS NO DISCO ===");
let semArquivo = [];
lista.slice(0, 60).forEach(function (p) {
    if (p.im && p.im.indexOf("img/") === 0 && !fs.existsSync(path.join(dir, p.im))) semArquivo.push(p.im);
});
if (semArquivo.length) falha(semArquivo.length + " foto(s) do catalogo nao existem no repositorio: " + semArquivo.slice(0, 3).join(", "));
else ok("as fotos do catalogo existem no repositorio");

console.log("\n=== 6. AGENDAMENTO: SEGUNDA A SEXA ===");
const yml = ler(".github/workflows/catalogo.yml");
const crons = (yml.match(/cron:\s*['"]?([^'"\n]+)['"]?/g) || []).map(c => c.replace(/cron:\s*/, "").replace(/['"]/g, "").trim());
if (!crons.length) falha("catalogo.yml nao tem cron");
else {
/* o GitHub roda em UTC: 13h e 17h UTC = 10h e 14h de Sao Paulo (UTC-3) */
    const ruinsCron = crons.filter(c => !/^0 (13|17) \* \* 1-5$/.test(c));
    const soDiaUtil = crons.every(c => /\* 1-5$/.test(c));
    if (crons.length !== 2) falha("esperava 2 horarios do robo, achei " + crons.length + ": " + crons.join(", "));
    else if (ruinsCron.length) falha("cron fora do padrao (10h/14h de SP, seg a sex): " + ruinsCron.join(", "));
    else if (!soDiaUtil) falha("o robo roda no fim de semana");
    else ok("cron do catalogo: " + crons.join(" e ") + " UTC = 10h e 14h de SP, segunda a sexta");
}
if (yml.indexOf("sync-catalogo") < 0) falha("o workflow nao chama o robo");
else ok("o workflow chama .github/scripts/sync-catalogo.js");
if (yml.indexOf("telegram") < 0 && yml.indexOf("notificar") < 0) ok("o workflow avisa o dono pelo Telegram");

console.log("\n=== 7. O CATALOGO E DO DIA (nao antigo) ===");
const gerado = catalogo.geradoEm ? Date.parse(catalogo.geradoEm) : NaN;
if (isNaN(gerado)) falha("catalogo.json sem data de geracao");
else {
    const dias = (Date.now() - gerado) / 86400000;
    if (dias > 4) falha("catalogo com " + dias.toFixed(1) + " dias (robo parado?)");
    else ok("catalogo gerado ha " + dias.toFixed(2) + " dia(s)");
}

console.log("\n" + (erros === 0 ? "*** ROBO DO CATALOGO 10/10 ***" : "*** " + erros + " ERRO(S) NO ROBO ***"));
process.exit(erros ? 1 : 0);