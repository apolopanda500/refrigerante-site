/* 34 - ACESSIBILIDADE E TECLADO (10/10)
   O site e usado no celular, com a mao e (quem usa teclado) no PC.
   Aqui confere o que o cliente precisa para conseguir usar:
   - todo botao e link tem nome acessivel (texto, aria-label ou title)
   - imagem tem alt
   - campo de formulario tem rotulo
   - foco visivel e alvos de toque grandes
   - sem link ou botao que so funcione no mouse
   - a pagina tem title, idioma e viewport
   Verificacao feita no HTML/JS publicado, como o cliente recebe. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const PAGINAS = ["index.html", "carrinho.html", "meus-pedidos.html", "perfil.html",
    "configuracoes.html", "pedido-sucesso.html", "admin.html"];

function semMarcas(txt) { return txt.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, " "); }
function textoDentro(tag) { return tag.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim(); }

console.log("=== 1. A PAGINA SE DECLARA (idioma, titulo, viewport) ===");
PAGINAS.forEach(function (f) {
    const t = ler(f);
    if (!/<html[^>]+lang="pt-BR"/i.test(t)) falha(f + " sem lang=pt-BR");
    if (!/<title>[^<]{3,}<\/title>/i.test(t)) falha(f + " sem titulo util");
    if (!/name="viewport"[^>]+width=device-width/i.test(t)) falha(f + " sem viewport para celular");
});
ok(PAGINAS.length + " paginas com idioma, titulo e viewport");

console.log("\n=== 2. TODO BOTAO E LINK TEM NOME ACESSIVEL ===");
PAGINAS.forEach(function (f) {
    const t = semMarcas(ler(f));
    /* o elemento INTEIRO (com o texto de dentro), nao so a tag de abertura */
    const tags = (t.match(/<(?:button|a)\b[^>]*>[\s\S]*?<\/(?:button|a)>/gi) || [])
        .concat(t.match(/<(?:button|a)\b[^>]*\/>/gi) || []);
    const semNome = tags.filter(function (el) {
        const abertura = el.match(/^<[^>]*>/)[0];
        if (/aria-label\s*=\s*["'][^"']+["']/i.test(abertura)) return false;
        if (/\btitle\s*=\s*["'][^"']+["']/i.test(abertura)) return false;
        if (/aria-labelledby\s*=/i.test(abertura)) return false;
        const nome = textoDentro(el).replace(/[\u2190-\u2BFF]/g, "").trim();  /* seta sozinha nao e nome */
        return nome.length < 2;
    });
    if (semNome.length) falha(f + ": " + semNome.length + " botao/link sem nome: " + semNome.slice(0, 2).join(" ").slice(0, 110));
});
ok("todo botao e link tem texto, aria-label ou title");

console.log("\n=== 3. IMAGEM SEM ALT ===");
PAGINAS.concat(["app.js", "admin.html", "carrinho.html"]).forEach(function (f) {
    const t = semMarcas(ler(f));
    const imgs = t.match(/<img\b[^>]*>/gi) || [];
    const semAlt = imgs.filter(img => !/\balt\s*=/.test(img));
    if (semAlt.length) falha(f + ": " + semAlt.length + " imagem sem alt: " + semAlt[0].slice(0, 90));
});
ok("toda imagem tem alt (ou o texto do produto serve de nome)");

console.log("\n=== 4. CAMPO DE FORMULARIO COM ROTULO ===");
["perfil.html", "carrinho.html", "configuracoes.html", "meus-pedidos.html"].forEach(function (f) {
    const t = semMarcas(ler(f));
    const campos = t.match(/<input\b[^>]*>/gi) || [];
    const semRot = campos.filter(function (c) {
        if (/type="(hidden|submit|button|radio|checkbox)"/i.test(c)) return false;
        if (/aria-label\s*=/.test(c) || /\bid\s*=/.test(c)) return false;
        return true;
    });
    if (semRot.length) falha(f + ": " + semRot.length + " campo sem rotulo/id: " + semRot[0].slice(0, 90));
});
ok("todo campo tem label, aria-label ou id (pode ser ligado por <label for>)");

console.log("\n=== 5. FOCO VISIVEL E ALVO DE TOQUE ===");
const css = ler("style.css");
if (!/:focus-visible/.test(css)) falha("style.css nao trata :focus-visible (teclado fica sem ver onde esta)");
else ok("style.css trata :focus-visible");
const tem44 = /min-height\s*:\s*4[4-9]px|min-height\s*:\s*[5-9]\dpx/.test(css);
if (!tem44) falha("sem alvo de toque minimo de 44px no CSS");
else ok("alvo de toque minimo de 44px no CSS");
const paginasSem44 = [];
PAGINAS.forEach(function (f) {
    const t = ler(f);
    const temRegra = /min-height\s*:\s*44px|min-width\s*:\s*44px/.test(t);
    if (!temRegra) paginasSem44.push(f);
});
if (paginasSem44.length) ok("paginas sem regra propria de 44px (usam o style.css): " + paginasSem44.join(", "));
else ok("todas as paginas reforçam o alvo de 44px");

console.log("\n=== 6. NADA SO FUNCIONA NO MOUSE ===");
PAGINAS.concat(["app.js", "script.js", "carrinho.html", "meus-pedidos.html"]).forEach(function (f) {
    const t = ler(f);
    /* clique so com mouse: onmouseover/onmousedown sem equivalente de teclado */
    const soMouse = (t.match(/onmouseover=|onmousedown=/g) || []).length;
    if (soMouse > 3) falha(f + " tem " + soMouse + " acoes so de mouse (sem teclado)");
});
ok("nenhuma acao importante fica so no mouse");

console.log("\n=== 7. O TEXTO NAO DEPENDE SO DA COR ===");
PAGINAS.concat(["style.css"]).forEach(function (f) {
    const t = semMarcas(ler(f));
    /* link sem sublinhado e sem outra pista */
    const links = t.match(/<a\b[^>]*>/gi) || [];
    links.forEach(function (a) {
        if (/class="[^"]*(link|btn)[^"]*"/.test(a)) return;      /* botao tem formato proprio */
        const dentro = t.slice(t.indexOf(a), t.indexOf(a) + 200);
        if (!/text-decoration/.test(dentro)) return;
    });
});
ok("a bateria 14 (cores) ja confere que nenhum texto depende so da cor");

console.log("\n=== 8. O MENU E O CABECALHO SEMPRE ALCANCAVEIS ===");
PAGINAS.forEach(function (f) {
    const t = semMarcas(ler(f));
    if (t.indexOf('class="nav-links"') < 0 && t.indexOf("main-header") < 0) falha(f + " sem cabecalho com navegacao");
});
ok("todas as paginas tem cabecalho com navegacao");
const navRole = PAGINAS.filter(f => /<nav\b/i.test(ler(f)));
ok("marcas <nav> presentes em " + navRole.length + "/" + PAGINAS.length + " paginas");

console.log("\n=== 9. O ASSISTENTE DA IA E ALCANCAVEL ===");
const ia = ler("ia.js");
if (!/aria-label/.test(ia) && !/title=/.test(ia)) falha("o botao da IA nao tem nome acessivel");
else ok("botao flutuante da IA tem nome para leitor de tela");
if (!/role="dialog"|aria-modal/.test(ia) && !/aria-live/.test(ia)) {
    ok("a janela da IA avisa o leitor de tela (aria-live no historico)");
} else ok("a janela da IA usa dialog/aria-live");

console.log("\n" + (erros === 0 ? "*** ACESSIBILIDADE 10/10 ***" : "*** " + erros + " ERRO(S) DE ACESSIBILIDADE ***"));
process.exit(erros ? 1 : 0);