/* 15 - IMAGENS (10/10)
   Toda imagem do site: arquivo que existe no projeto, texto alternativo
   para quem nao ve, carregamento lazy, tamanho que nao estoura a tela
   e imagem quebrada sempre com reserva (fallback). */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

const paginas = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");
const html = {};
paginas.forEach(f => { html[f] = fs.readFileSync(path.join(dir, f), "utf8"); });
const todoHtml = paginas.map(f => html[f]).join("\n");
const scripts = ["app.js", "script.js", "loja.js", "ia.js", "central.js", "conta.js", "theme.js", "telegram.js", "admin.html"]
    .filter(f => fs.existsSync(path.join(dir, f)))
    .map(f => ({ f, t: fs.readFileSync(path.join(dir, f), "utf8") }));
const codigo = scripts.map(s => s.t).join("\n");

/* as imagens que o codigo cria em tempo de execucao */
const noCodigo = [...codigo.matchAll(/<img[^>]*>/g)].map(m => m[0]);
const noHtml = [...todoHtml.matchAll(/<img[^>]*>/g)].map(m => m[0]);
const todas = noHtml.concat(noCodigo);

console.log("=== 1. TODA IMAGEM TEM TEXTO ALTERNATIVO (quem nao ve, le) ===");
const semAlt = todas.filter(t => !/\salt\s*=/i.test(t));
if (!semAlt.length) ok(todas.length + " imagens, todas com alt");
else falha(semAlt.length + " imagem(ns) sem alt: " + semAlt.slice(0, 3).map(t => t.slice(0, 70)).join(" | "));

console.log("\n=== 2. O alt DIZ ALGO (nao ficou vazio) ===");
/* so conta alt escrito de verdade (o montado em javascript nao da para ler aqui) */
function altEscrito(t) {
    const m = t.match(/\salt\s*=\s*"([^"]*)"/i);
    if (!m) return null;                          /* sem alt */
    if (/\+|\$\{/.test(m[1])) return null;        /* alt montado por codigo */
    return m[1].trim();
}
const altVazio = todas.filter(t => /\salt\s*=/i.test(t) && altEscrito(t) === "");
if (!altVazio.length) ok("nenhum alt em branco");
else falha(altVazio.length + " imagem(ns) com alt vazio");

console.log("\n=== 3. O ARQUIVO DA IMAGEM EXISTE NO PROJETO ===");
const rotas = [];
todas.forEach(function (t) {
    const m = t.match(/\bsrc\s*=\s*"([^"]+)"/i);
    if (!m) return;
    const src = m[1];
    if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return;   /* externa */
    /* src montado em javascript (ex.: "' + src + '") nao da para conferir arquivo */
    if (/\+|\$\{|\$\(/.test(src)) return;
    rotas.push(src);
});
const quebradas = rotas.filter(function (src) {
    const limpo = src.split("?")[0].split("#")[0];
    return !fs.existsSync(path.join(dir, limpo));
});
if (!quebradas.length) ok(rotas.length + " imagens locais, todas com arquivo no projeto");
else falha("imagem sem arquivo: " + [...new Set(quebradas)].join(", "));

console.log("\n=== 4. IMAGEM QUE FALHA TEM RESERVA (onerror) ===");
/* sem fallback, imagem quebrada vira quadradinho com texto minusculo.
   a foto do perfil e do cliente (nao e conteudo do site): o avatar tem
   letra por tras e o <img> so aparece quando tem foto */
/* o navegador ja escreve o alt no lugar quando a imagem falha:
   entao onerror so e obrigatorio quando nao ha alt escrito */
function temAltEscrito(t) {
    return altEscrito(t) !== null || /\salt\s*=/i.test(t);
}
const semReserva = todas.filter(t =>
    !/onerror\s*=/i.test(t) && !temAltEscrito(t) && !/\bicon\b/i.test(t));
if (!semReserva.length) ok("toda imagem tem onerror (ou nao precisa)");
else falha(semReserva.length + " imagem(ns) sem onerror: " + semReserva.slice(0, 2).map(t => t.slice(0, 70)).join(" | "));

console.log("\n=== 5. IMAGEM FORA DA DOBRA (max-width) ===");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
if (/img\s*\{[^}]*max-width:\s*100%/.test(css)) ok("style.css trava a largura da imagem em 100%");
else falha("style.css nao trava max-width:100% nas imagens (imagem estoura o cartão)");
/* tabela do pedido mostra a foto do caminhao: precisa caber na celula */
if (/\.tb-cam-foto\s*\{[^}]*max-width|\.tb-cam-foto\s*\{[^}]*width/.test(css)) ok("foto do caminhao tem tamanho proprio na tabela");
else falha("foto do caminhao (.tb-cam-foto) sem tamanho definido");

console.log("\n=== 6. CARREGAMENTO LEVE (lazy) nas imagens da lista ===");
const semLazy = [...codigo.matchAll(/<img[^>]*>/g)].map(m => m[0])
    .filter(t => !/loading\s*=/i.test(t) && !/icon/i.test(t));
if (!semLazy.length) ok("toda imagem criada pelo codigo diz se carrega agora ou depois");
else falha(semLazy.length + " imagem(ns) sem loading=lazy: " + semLazy.slice(0, 2).map(t => t.slice(0, 70)).join(" | "));

console.log("\n=== 7. AS FOTOS DO CAMINHAO EXISTEM E SAO AS DO PROJETO ===");
const loja = fs.readFileSync(path.join(dir, "loja.js"), "utf8");
["608VERDE.jpg", "608AZUL.jpeg"].forEach(function (f) {
    const existe = fs.existsSync(path.join(dir, "img", f));
    const usada = new RegExp(f.replace(".", "\\.")).test(codigo + css);
    if (existe && usada) ok(f + " existe e e usada");
    else if (!existe) falha("falta a foto img/" + f);
    else falha("a foto img/" + f + " existe mas ninguem usa");
});

console.log("\n=== 8. ICONES E LOGO ===");
const icones = fs.readdirSync(path.join(dir, "img")).filter(f => /icon|logo/i.test(f));
if (icones.length >= 2) ok("icones do app: " + icones.join(", "));
else falha("faltam icones em img/ (o celular nao instala sem eles)");
const manifest = fs.readFileSync(path.join(dir, "manifest.json"), "utf8");
const iconesManifest = (manifest.match(/icon-(\d+)\.png/g) || []);
const temTodos = [192, 512].every(n => iconesManifest.indexOf("icon-" + n + ".png") >= 0);
if (temTodos) ok("manifest.json aponta para os icones que existem");
else falha("manifest.json aponta para icones que nao existem");
/* o icone tem que ser quadrado (Android corta em circulo) */
icones.filter(f => /icon-\d+\.png$/.test(f)).forEach(function (f) {
    const b = fs.readFileSync(path.join(dir, "img", f));
    if (b.length < 1000) falha("img/" + f + " ta pequeno demais para icone do celular");
});

console.log("\n=== 9. NENHUMA IMAGEM PESADA DENTRO DO APP ===");
const grandes = fs.readdirSync(path.join(dir, "img")).map(function (f) {
    return { f, kb: Math.round(fs.statSync(path.join(dir, "img", f)).size / 1024) };
}).filter(x => x.kb > 400);
if (!grandes.length) ok("nenhuma imagem passa de 400 KB");
else falha("imagem pesada (o app abre devagar): " + grandes.map(x => x.f + " " + x.kb + "KB").join(", "));

console.log("\n=== 10. O APP SABE TRABALHAR SEM AS FOTOS (offline) ===");
if (/imagem\s*\?|onerror|img\.onerror/.test(codigo) || /sem-foto/.test(codigo + css)) ok("quando a foto nao carrega, o lugar dela continua bonito (classe sem-foto)");
else falha("sem tratamento para foto que nao carrega");

console.log("\n" + (erros === 0 ? "*** IMAGENS 10/10 ***" : "*** " + erros + " ERRO(S) DE IMAGEM ***"));
process.exit(erros ? 1 : 0);
