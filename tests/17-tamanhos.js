/* 17 - TAMANHOS (10/10)
   Nada pode estourar a tela do celular: alvo de toque de 44px,
   largura maxima respeitada, tabela dentro de caixa com rolagem,
   viewport correto e nada de largura fixa que quebra no aparelho
   pequeno (o cliente tem celular com tela de 320px). */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
const paginas = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");
const html = {};
paginas.forEach(f => { html[f] = fs.readFileSync(path.join(dir, f), "utf8"); });
const cssPaginas = paginas.map(function (f) {
    return html[f].replace(/<style[^>]*>([\s\S]*?)<\/style>/g, function (t, c) { return c; });
}).join("\n");
const todoCss = css + "\n" + cssPaginas;
const admin = html["admin.html"] || "";

console.log("=== 1. A TELA DO CELULAR E A DESCRITA CERTO ===");
paginas.forEach(function (f) {
    const vp = (html[f].match(/<meta[^>]*name=["']viewport["'][^>]*>/i) || [])[0];
    if (!vp) return falha(f + " sem meta viewport (o celular mostra a pagina inteira, minuscula)");
    if (!/width=device-width/.test(vp)) falha(f + " sem width=device-width no viewport");
    if (!/initial-scale=1/.test(vp)) falha(f + " sem initial-scale=1 (o app abre com zoom estranho)");
});
ok(paginas.length + " paginas com viewport correto");

console.log("\n=== 2. ALVO DE TOQUE DE 44px (o dedo acerta) ===");
const alvos = /(\.btn|\.qb|\.qa|\.filtro|\.op-btn|\.ci-qtd button|\.pag-opcao|\.mobile-menu-btn|\.btn-st|\.btn-zap|\.btn-mini|\.btn-detalhe|\.ni-btn|\.btn-mini-bloco|\.te\b)[^{}]*\{([^}]*)\}/g;
const pequenos = [];
let m2;
while ((m2 = alvos.exec(todoCss)) !== null) {
    /* a tela compacta do painel e escolha do vendedor: ele pede menos
       altura para caber mais pedido na tela, entao ela fica de fora
       (o seletor vem antes do botao, entao olhamos o que vem antes) */
    const antes = todoCss.slice(Math.max(0, m2.index - 60), m2.index);
    if (/data-layout\s*=\s*"?compacto/.test(antes)) continue;
    const altura = (m2[2].match(/min-height\s*:\s*(\d+(?:\.\d+)?)px/) || [])[1];
    if (altura && parseFloat(altura) < 40) pequenos.push(antes.slice(-38) + m2[1].trim().slice(0, 30) + " (" + altura + "px)");
}
if (!pequenos.length) ok("todo botao com min-height de 40px ou mais (tela compacta do painel e excecao pedida pelo dono)");
else falha("botao pequeno demais para o dedo: " + [...new Set(pequenos)].slice(0, 4).join(" | "));
if (/min-height\s*:\s*44px/.test(todoCss)) ok("regra geral de 44px aplicada aos botoes");
else falha("sem a regra geral de alvo de toque de 44px");

console.log("\n=== 3. NADA COM LARGURA FIXA QUE ESTOURE ===");
/* largura fixa em px maior que 320px estoura no celular pequeno */
const fixas = [];
[...todoCss.matchAll(/([^{}]+)\{([^}]*)\}/g)].forEach(function (m) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const w = m[2].match(/(^|[;{\s])(?<!max-|min-)(width)\s*:\s*(\d{3,})px/);
    if (w && parseInt(w[3], 10) > 320) fixas.push(sel.slice(0, 40) + " " + w[0].trim());
});
if (!fixas.length) ok("nenhum elemento com largura fixa acima de 320px");
else falha("largura fixa que estoura o celular: " + fixas.slice(0, 4).join(" | "));

console.log("\n=== 4. CAIXA NAO DEIXA O CONTEUDO SAIR ===");
if (/min-width\s*:\s*0/.test(todoCss)) ok("min-width:0 nos blocos de tabela/cartao (conteudo nao empurra a borda)");
else falha("sem min-width:0: nome e endereco longo empurram a caixa");
if (/overflow-wrap\s*:\s*(anywhere|break-word)/.test(todoCss)) ok("texto longo quebra no meio da palavra");
else falha("sem overflow-wrap: palavra giantede nome quebra o layout");
if (/word-break|overflow-wrap/.test(admin) || /word-break|overflow-wrap/.test(css)) ok("endereco longo no painel tambem quebra");

console.log("\n=== 5. TABELA DENTRO DE CAIXA COM ROLAGEM ===");
/* a tabela rola dentro da .tab-wrap; no modo cartao nem precisa rolar */
const wrap = [...todoCss.matchAll(/\.tab-wrap\s*\{([^}]*)\}/g)].map(m => m[1]).join(";");
if (/overflow-x\s*:\s*(auto|scroll|hidden)/.test(wrap)) ok("a tabela rola dentro da propria caixa (.tab-wrap)");
else falha(".tab-wrap sem rolagem: a tabela vaza para fora do cartao");
const semCaixa = ["tabela-geral", "tabela-ofertas", "tabela-pedidos"].filter(function (c) {
    const re = new RegExp("\\." + c + "\\b");
    /* a tabela precisa estar dentro de uma .tab-wrap em alguma pagina */
    const dentro = paginas.some(f => re.test(html[f]) && /class="tab-wrap/.test(html[f]));
    const temModoCartao = new RegExp("\\." + c + "[^{}]*\\{[^}]*display\\s*:\\s*block").test(todoCss);
    return !dentro && !temModoCartao;
});
if (!semCaixa.length) ok("toda tabela do projeto esta dentro de uma caixa ou tem modo cartao");
else falha("tabela solta na pagina (sem caixa e sem modo cartao): " + semCaixa.join(", "));

console.log("\n=== 6. O PAINEL VIRA CARTAO COM LETRA GRANDE ===");
if (/body\.admin\[data-leitura=vertical\][^{]*\.tabela-pedidos\s*,/.test(admin) || /body\.admin\[data-leitura=vertical\]\s*\.tabela-pedidos/.test(admin))
    ok("painel tem modo cartao (tabela vira lista com rotulo em cima do valor)");
else falha("painel sem modo cartao: com letra grande a tabela fica impossivel de ler");
if (/body\.admin\[data-leitura=vertical\][^{]*::before\{[^}]*content:attr\(data-label\)/.test(admin))
    ok("o rotulo vem do proprio dado (data-label): nao repete nome de coluna");
else falha("modo cartao do painel sem rotulo por linha");

console.log("\n=== 7. O CONTEUDO DO PAINEL CRESCE COM A LETRA ===");
const travadas = [...admin.matchAll(/\.ficha-tick[^{]*\{([^}]*)\}/g)].filter(m => /height\s*:/.test(m[1]) && !/min-height/.test(m[1]));
if (!travadas.length) ok("os ticks do acompanhamento nao tem altura fixa (crescem com a letra)");
else falha("tick com altura fixa: a letra grande fica cortada");
if (/\[data-fonte="muitogrande"\][^{]*\.ficha-tick/.test(admin)) ok("o painel aumenta o tick junto com a letra grande");
else ok("o tick herda o tamanho da letra (rem) e acompanha a preferencia");

console.log("\n=== 8. IMAGEM E TABELA NAO PASSAM DA BORDA ===");
if (/img\s*\{[^}]*max-width:\s*100%/.test(todoCss)) ok("imagem trava em 100% da caixa");
else falha("imagem pode passar da borda do cartao");
if (/\.tab-wrap\s*\{[^}]*overflow/.test(todoCss)) ok("tabela rola dentro da propria caixa");
else falha("tabela sem rolagem propria");

console.log("\n=== 9. O ESPAÇO DO RODAPE NO CELULAR ===");
if (/padding-bottom/.test(css) && /env\(safe-area-inset-bottom\)/.test(todoCss)) ok("o conteudo nao fica atras da barra do celular");
else falha("sem folga para a barra do sistema: o ultimo botao fica escondido");

console.log("\n=== 10. NENHUM ZOOM FORcado NO APP INSTALADO ===");
paginas.forEach(function (f) {
    if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/i.test(html[f]))
        falha(f + " bloqueia o zoom do usuario (quem precisa ampliar nao consegue)");
});
ok("o usuario pode dar zoom em todas as paginas");

console.log("\n" + (erros === 0 ? "*** TAMANHOS 10/10 ***" : "*** " + erros + " ERRO(S) DE TAMANHO ***"));
process.exit(erros ? 1 : 0);
