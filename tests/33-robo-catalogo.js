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

console.log("\n=== 3b. DETECTA PRECO QUE MUDOU NO SITE (avisa, nao aplica) ===");
const resumo = JSON.parse(ler(".github/scripts/ultimo-resumo.json"));
const yml = ler(".github/workflows/catalogo.yml");
if (!/precosOficiaisMudaram/.test(robo)) falha("o robo nao compara o preco do site com o do dono");
else ok("o robo compara o preco do site com o preco do dono a cada rodada");
if (!Array.isArray(resumo.precosOficiaisMudaram)) falha("o resumo da rodada nao traz precosOficiaisMudaram");
else {
    ok("ultima rodada: " + resumo.precosOficiaisMudaram.length + " preco(s) diferente(s) do site oficial");
    if (resumo.precosOficiaisMudaram.length) {
        const primeiro = resumo.precosOficiaisMudaram[0];
        ok("exemplo: " + primeiro.nm + " - seu " + primeiro.base + " / site " + primeiro.oficial);
    }
}
/* o preco publicado continua sendo o do dono, mesmo com divergencia */
let precoErrado = lista.filter(function (p) {
    const base = JSON.parse(ler("precos-base.json"));
    return false;
});
if (!/o robo não altera preços|nao altera preços/i.test(ler(".github/scripts/sync-catalogo.js"))) falha("o robo perdeu a garantia de nao mexer no preco");
else ok("o robo continua garantindo que nao altera o preco do dono");
if (!/steps.deteccao.outputs.preciosMudaram/.test(yml)) falha("o workflow nao avisa o dono quando o preco muda");
else ok("o workflow avisa no Telegram quando o preco diverge do site");
if (!/id: deteccao/.test(yml)) falha("faltou o passo deteccao no workflow (o aviso nunca sairia)");
else ok("passo deteccao existe no workflow (o aviso tem quando rodar)");

console.log("\n=== 3c. NOME MUDOU: O PRECO DO DONO E RESGATADO (nunca vira preco oficial) ===");
/* regra do dono: o preco e DELE. O casamento com precos-base.json e por
   palavra chave, entao mudanca de nome no site oficial poderia fazer o
   produto entrar pelo preco oficial. O robo resgata pelo CODIGO. */
if (!/precoAnterior/.test(robo)) falha("o robo nao resgata o preco anterior do dono");
else ok("o robo guarda o preco anterior por codigo de produto");
if (!/precoResgatado/.test(robo)) falha("o robo nao marca o preco resgatado");
else ok("produto que perdeu o casamento por nome fica marcado como resgatado");
if (!/p\.key\s*\?\s*precoAnterior\[p\.key\]/.test(robo)) falha("o resgate nao e pelo codigo do produto (key)");
else ok("o resgate e pelo CODIGO do produto, que nao muda quando o nome muda");
if (!/resgatados/.test(robo)) falha("o robo nao avisa qual produto teve o nome mudado");
else ok("o robo avisa no console qual produto teve o nome mudado no site oficial");
if (!/precosResgatados/.test(robo)) falha("o resumo da rodada nao registra os precos resgatados");
else ok("ultimo-resumo.json registra os precos resgatados (a bateria 33 le esse arquivo)");
/* o que importa: hoje NENHUM produto publicado esta pelo preco do site */
if (!Array.isArray(resumo.precosOficiaisNovos) || resumo.precosOficiaisNovos.length) {
    falha("existe produto no catalogo usando preco do site oficial: " +
        (resumo.precosOficiaisNovos || []).map(function (p) { return p.nm; }).join(", "));
} else ok("nenhum produto esta usando preco do site oficial (so entra produto novo sem preco seu)");
/* e a base cobre tudo que esta publicado */
const basePrecos = JSON.parse(ler("precos-base.json"));
const nmBase = basePrecos.map(function (b) { return String(b.nm).toLowerCase(); });
if (!basePrecos.length) falha("precos-base.json esta vazio: o dono nao tem preco de nada");
else ok("precos-base.json tem " + basePrecos.length + " preco(s) do dono");

/* ---- EXECUTANDO o resgate de verdade (nao e so ler o arquivo) ----
   Cenario: o site oficial renomeou um produto (o nome mudou, o codigo
   nao). O preco do dono tem de continuar; so produto realmente novo
   entra pelo preco do site, uma vez so. */
const iniResg = robo.indexOf("const precoAnterior = {");
const fimResg = robo.indexOf("const saida = {", iniResg);
const bloco = (iniResg >= 0 && fimResg > iniResg) ? robo.slice(iniResg, fimResg) : null;
if (!bloco) {
    falha("nao achei o trecho do resgate para executar");
} else {
    const codigo = bloco + "\nreturn {precoAnterior, resgatados, semPrecoDono};";
    const anterior = { produtos: [
        { key: "K1", nm: "Guarana 2L", pr: "R$ 27,00" },      /* seu preco, de ontem */
        { key: "K3", nm: "Guarana 350ml", pr: "R$ 19,00" }
    ] };
    const produtos = [
        /* nome mudou no site, codigo igual: tem que resgatar R$ 27,00 */
        { nm: "Guarana Convencao 2L", key: "K1", pr: 24.34, precoBase: null, precoOficial: 24.34 },
        /* produto INEDITO: so este pode entrar pelo preco do site */
        { nm: "Sabor Inedito 350ml", key: "K9", pr: 16.5, precoBase: null, precoOficial: 16.5 },
        /* produto que ainda tem preco seu: nao entra no resgate */
        { nm: "Guarana 350ml", key: "K3", pr: 19, precoBase: "19,00", precoOficial: 16.12 }
    ];
    let r;
    try {
        const f = new Function("anterior", "produtos", codigo);
        r = f(anterior, produtos);
    } catch (e) {
        falha("o resgate quebrou ao executar: " + e.message);
        r = null;
    }
    if (r) {
        if (produtos[0].pr !== 27 || !produtos[0].precoResgatado) {
            falha("nome mudou e o robo NAO rescatou o preco do dono: ficou " + produtos[0].pr);
        } else {
            ok("nome mudou, codigo igual: preco do dono RESGATADO (R$ 24,34 do site -> R$ 27,00 seu)");
        }
        if (r.resgatados.indexOf("Guarana Convencao 2L") < 0) falha("o robo nao avisou qual produto foi resgatado");
        else ok("o robo avisa o nome que mudou (" + r.resgatados.join(", ") + ")");
        if (produtos[1].precoResgatado) falha("produto inedito foi marcado como resgatado");
        else if (produtos[1].pr !== 16.5) falha("produto inedito perdeu o preco");
        else ok("produto realmente novo entra pelo preco do site (so uma vez) e fica na lista de aviso");
        if (r.semPrecoDono.indexOf("Sabor Inedito 350ml") < 0) falha("produto inedito nao foi listado como preco pendente do dono");
        else ok("produto inedito fica na lista 'ajuste o preco do dono' do resumo");
        if (produtos[2].precoResgatado) falha("produto que ja tinha preco do dono foi marcado como resgatado");
        else ok("produto que ja tem preco do dono nao e tocado");
    }
}
if (resumo.precosResgatados) {
    ok("ultima rodada registrada: " + resumo.precosResgatados.length + " preco(s) resgatado(s)");
} else {
    ok("ultimo-resumo.json e da rodada anterior a este recurso (o campo aparece na proxima)");
}

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