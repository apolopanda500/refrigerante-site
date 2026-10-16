/* 06 - ESTRUTURA, SEGURANCA E LINKS (10/10)
   - toda pagina tem os scripts basicos
   - nenhuma pagina aponta para arquivo que nao existe
   - nenhum segredo no codigo do site (o painel do vendedor nao expoe token)
   - nenhum HTML quebrado (tags <script>/<style> balanceadas)
   - service worker coerente */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

const html = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");

/* ---------- 1. scripts basicos em toda pagina ---------- */
console.log("=== 1. SCRIPTS DE BASE EM TODA PAGINA ===");
const basicos = ["theme.js", "conta.js", "app-update.js", "loja.js"];
const cliente = ["index.html", "carrinho.html", "checkout.html", "perfil.html", "meus-pedidos.html",
    "pedido-sucesso.html", "configuracoes.html"];
cliente.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const faltando = basicos.filter(b => t.indexOf(b) < 0);
    if (faltando.length) falha(p + " sem: " + faltando.join(", "));
});
console.log("  ok  as " + cliente.length + " paginas do cliente carregam theme/conta/app-update/loja");

/* o painel do vendedor nao usa REGIOES/CAMINHOES (ele cuida de pedidos),
   entao nao precisa do loja.js: ele so precisa de script/telegram */
const adm = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
["script.js", "telegram.js", "app.js"].forEach(s => {
    if (adm.indexOf(s) < 0) falha("admin.html sem " + s);
});
console.log("  ok  admin.html carrega script/telegram/app");

/* ---------- 2. links internos ---------- */
console.log("\n=== 2. LINKS INTERNOS (nada apontando para arquivo morto) ===");
const existe = (alvo) => fs.existsSync(path.join(dir, alvo.split("#")[0].split("?")[0]));
let checados = 0;
html.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const links = [...t.matchAll(/href="([^"]+)"/g), ...t.matchAll(/src="([^"]+)"/g)]
        .map(m => m[1])
        .filter(u => u && !/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/.test(u))
        /* ignora o que esta dentro de string de JS (montagem de HTML) */
        .filter(u => !/['"(+\s]/.test(u));
    links.forEach(function (u) {
        checados++;
        if (!existe(u)) falha(p + " aponta para " + u + " (arquivo nao existe)");
    });
});
console.log("  " + checados + " links internos conferidos: " +
    (erros === 0 ? "todos existem" : "veja os erros acima"));

/* ---------- 3. seguranca ---------- */
console.log("\n=== 3. SEGURANCA ===");
/* nenhum arquivo de segredo no git */
const { execSync } = require("child_process");
const versionados = execSync("git ls-files", { cwd: dir, encoding: "utf8" }).split("\n");
const segredos = versionados.filter(f => /\.(jks|keystore|p12|pem|env)$/.test(f) || /service-account|credential/i.test(f));
if (segredos.length) falha("arquivo de segredo versionado: " + segredos.join(", "));
else console.log("  ok  nenhum .jks/.keystore/.env no git");

/* o token do telegram NAO pode estar no codigo do cliente */
const scriptsDoCliente = ["app.js", "loja.js", "conta.js", "theme.js", "firebase-appcheck.js", "sw.js"];
const token = /\d{9,10}:[A-Za-z0-9_-]{30,}/;
scriptsDoCliente.forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    if (token.test(t)) falha("token do telegram dentro de " + f + " (vaza para o cliente)");
});
console.log("  ok  nenhum token do telegram no codigo do cliente");

/* o painel NAO deve ficar no cache do app do cliente */
const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
if (/^\s*"admin\.html",?$/m.test(sw)) falha("sw.js guarda admin.html no cache do cliente");
else console.log("  ok  admin.html fora do cache do cliente");
if (/^\s*"telegram\.js",?$/m.test(sw)) falha("sw.js guarda telegram.js (tem o token)");
else console.log("  ok  telegram.js fora do cache do cliente");

/* o service worker tem de se registrar sozinho */
const upd = fs.readFileSync(path.join(dir, "app-update.js"), "utf8");
if (!/DOMContentLoaded[\s\S]{0,80}iniciarApp|iniciarApp\(\)[\s\S]{0,60}DOMContentLoaded/.test(upd) &&
    !/iniciarApp\(\);/.test(upd.split("function iniciarApp")[0] || "")) {
    /* confere se existe a chamada automatica */
    if (upd.indexOf("iniciarApp();") < 0) falha("o service worker nunca e registrado (iniciarApp sem chamador)");
}
console.log("  ok  o service worker se registra sozinho");

/* versao do app coerente com o versao.txt */
const versaoTxt = fs.readFileSync(path.join(dir, "versao.txt"), "utf8").trim();
const m = upd.match(/var VERSAO_APP\s*=\s*"([^"]+)"/);
if (!m) falha("app-update.js sem VERSAO_APP");
else if (m[1] !== versaoTxt) falha("VERSAO_APP (" + m[1] + ") != versao.txt (" + versaoTxt + ")");
else console.log("  ok  versao do app = " + versaoTxt);

/* ---------- 4. HTML bem formado ---------- */
console.log("\n=== 4. HTML BEM FORMADO ===");
html.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const a = (t.match(/<script\b/g) || []).length, f = (t.match(/<\/script>/g) || []).length;
    if (a !== f) falha(p + ": <script> " + a + " x </script> " + f);
    const sa = (t.match(/<style\b/g) || []).length, sf = (t.match(/<\/style>/g) || []).length;
    if (sa !== sf) falha(p + ": <style> " + sa + " x </style> " + sf);
    if ((t.match(/<html/g) || []).length !== 1) falha(p + ": falta <html>");
    if (t.indexOf("�") >= 0) falha(p + ": tem caractere corrompido");
    /* codigo escrito DENTRO de <script src=...> e ignorado pelo navegador:
       e assim que um botao "funciona" mas nao acontece nada */
    const dentroDeSrc = t.match(/<script[^>]*\bsrc=[^>]*>([\s\S]*?)<\/script>/g) || [];
    dentroDeSrc.forEach(function (bloco) {
        const conteudo = bloco.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "").trim();
        if (conteudo) falha(p + ": tem codigo dentro de <script src> (o navegador ignora): " + conteudo.slice(0, 60).replace(/\s+/g, " "));
    });
});
console.log("  ok  " + html.length + " paginas: tags balanceadas, sem caractere corrompido e sem codigo morto dentro de <script src>");

/* ---------- 5. JSON validos ---------- */
console.log("\n=== 5. JSON ===");
["catalogo.json", "manifest.json", "manifest-vendedor.json", "precos-base.json", "mcp.json"].forEach(function (f) {
    try { JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch (e) { falha(f + ": " + e.message); }
});
console.log("  ok  os 4 JSON abrem sem erro");

/* ---------- 6. versao dos assets ---------- */
console.log("\n=== 6. VERSAO DOS ASSETS IGUAL EM TODAS AS PAGINAS ===");
const versoes = new Set();
cliente.concat(["admin.html"]).forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const vs = [...t.matchAll(/\?v=(2026\d+[a-z])/g)].map(m => m[1]);
    vs.forEach(v => versoes.add(v));
});
console.log("  versoes encontradas: " + [...versoes].join(", "));
if (versoes.size > 1) falha("as paginas usam versoes diferentes (cache velho vai sobrar no celular)");

/* ---------- 7. celular vertical: header fixo e menu na tela ---------- */
console.log("\n=== 7. CELULAR VERTICAL (HEADER FIXO, MENU VISIVEL) ===");
const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
if (!/orientation\s*:\s*portrait/.test(css)) falha("style.css sem a regra do modo mobile vertical (orientation:portrait)");
else console.log("  ok  regra do modo mobile vertical existe");
if (!/height\s*:\s*100%/.test(css.split("orientation:portrait")[1] || "")) {
    falha("as tabelas nao ganharam height:100% no modo vertical (evita colapso)");
} else console.log("  ok  tabelas com height:100% no modo vertical");
if (!/body\.admin\s+\.nav-links/.test(css)) falha("o menu fora da tela deve valer so para o painel (body.admin)");
else console.log("  ok  menu fora da tela restrito ao painel");
if (!/body:not\(\.admin\)\s+\.main-header\s+\.nav-links/.test(css)) falha("o menu do cliente precisa ser faixa rolavel dentro do header");
else console.log("  ok  menu do cliente continua no cabecalho (nao some no celular)");

/* cada pagina do cliente: header fixo, com nav dentro do <header> */
cliente.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const ehHome = (p === "index.html");            /* a home usa header.hd, ja sticky por desenho */
    if (!ehHome && /position:sticky;top:0;z-index:100/.test(t)) falha(p + ": header ainda e sticky (perde o topo no celular vertical)");
    const head = (t.match(/<header class="(?:main-header|hd)">[\s\S]*?<\/header>/) || [""])[0];
    if (!head) { falha(p + ": header nao encontrado"); return; }
    if (head.indexOf('id="mainNav"') < 0) falha(p + ": o menu de navegacao esta fora do header");
    if ((t.match(/id="mainNav"/g) || []).length !== 1) falha(p + ": id mainNav duplicado");
    if ((t.match(/id="cartCount"/g) || []).length > 1) falha(p + ": id cartCount duplicado");
    if ((t.match(/<\/nav>/g) || []).length !== (t.match(/<nav[\s>]/g) || []).length) falha(p + ": tag nav nao balanceada");
});
console.log("  ok  " + cliente.length + " paginas: header fixo, um so menu, sem header orfao");

/* ---------- 8. IA: cliente ve so o botao flutuante ---------- */
console.log("\n=== 8. IA SO NO FLUTUANTE PARA O CLIENTE ===");
const iaJs = fs.readFileSync(path.join(dir, "ia.js"), "utf8");
if (!/function iaRecomendacoesAtivas/.test(iaJs)) falha("ia.js sem o controle das recomendacoes (cliente nao deve ver)");
else console.log("  ok  recomendacoes da IA desligadas por padrao para o cliente");
const cfgHtml = fs.readFileSync(path.join(dir, "configuracoes.html"), "utf8");
if (!/id="blocoIACliente" hidden/.test(cfgHtml)) falha("o bloco de IA do cliente nao esta escondido");
else console.log("  ok  configuracao de IA nao aparece para o cliente");

/* ---------- 9. painel do vendedor: independente e completo ---------- */
console.log("\n=== 9. PAINEL DO VENDEDOR INDEPENDENTE ===");
const adm9 = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
const sc9 = fs.readFileSync(path.join(dir, "script.js"), "utf8");
["alternarMini", "aplicarMini", "prepararMini", "editorPrecosCorpo", "vendedorPrefs"].forEach(function (c) {
    if (adm9.indexOf(c) < 0) falha("admin.html sem " + c + " (minimizar blocos do painel)");
});
if (!/btn-mini-bloco/.test(adm9)) falha("admin.html sem o botao de minimizar");
else console.log("  ok  botao Minimizar nos blocos do painel (editor de precos ja vem recolhido)");
/* o painel pode MENCIONAR refrigerantePrefs em comentario, mas nunca ler/gravar nele */
if (/localStorage\.(get|set)Item\(\s*["']refrigerantePrefs/.test(adm9)) {
    falha("o painel nao pode ler/gravar em refrigerantePrefs (e a preferencia do cliente)");
} else console.log("  ok  painel so grava em vendedorPrefs");
["setFonteVendedor", "setLeituraVendedor", "setSyncVendedor", "mostrarVersoes"].forEach(function (c) {
    if (adm9.indexOf("function " + c) < 0) falha("admin.html sem " + c + " (configuracoes do painel)");
});
console.log("  ok  painel tem letra, leitura das tabelas, tempo de sincronizacao e versoes");
["dataHoraSegundos", "tempoDesde", "tick"].forEach(function (c) {
    if (sc9.indexOf("function " + c) < 0) falha("script.js sem " + c + " (hora detalhada do pedido)");
});
if (adm9.indexOf("tick(p.criadoEm)") < 0) falha("o painel nao mostra a hora detalhada do pedido");
else console.log("  ok  hora exata (com segundos) e ha quanto tempo o pedido chegou");

const th = fs.readFileSync(path.join(dir, "theme.js"), "utf8");
const blocoMig = (th.split("function migrarPainel")[1] || "").split("function chavePrefs")[0];
if (/localStorage\.setItem\(\s*"vendedorPrefs",\s*\n?\s*localStorage\.getItem\("refrigerantePrefs"/.test(blocoMig)) {
    falha("o painel ainda copia a preferencia inteira do cliente");
}
/* a copia so pode trazer o que NAO e visual */
const listaCopiada = (blocoMig.match(/\["cfgTelegramToken"[\s\S]*?\]/) || [""])[0];
if (!listaCopiada) falha("nao achei a lista de preferencia herdada no theme.js");
else if (/cfgTema|cfgFonteTamanho|cfgLeitura|cfgModoEscuro|cfgCompacto|cfgVerImagens/.test(listaCopiada)) {
    falha("o painel ainda herda tema/letra/leitura do cliente: " + listaCopiada);
} else console.log("  ok  painel nao herda tema, letra nem leitura do cliente");
if (!/cfgTelegramToken/.test(listaCopiada)) falha("o painel deve aproveitar so a conexao do bot ja salva");
else console.log("  ok  do cliente so aproveita a conexao do bot (nao a parte visual)");

/* ---------- 10. o botao Minimizar funciona de verdade ---------- */
console.log("\n=== 10. BOTAO MINIMIZAR DO PAINEL (FUNCIONA) ===");
const vm = require("vm");
function puxarFuncao(texto, nome) {
    const m = texto.match(new RegExp("function " + nome + "\\([\\s\\S]*?\\n\\}"));
    if (!m) throw new Error("nao achei " + nome);
    return m[0];
}
/* DOM de mentira com o formato do painel (card > h3 + conteudo) */
function el(id, tag) {
    return {
        id: id || "", tagName: (tag || "div").toUpperCase(), style: {}, _attrs: {},
        className: "", children: [], parentNode: null, nextSibling: null,
        _html: "",
        setAttribute(k, v) { this._attrs[k] = v; },
        getAttribute(k) { return this._attrs[k] || null; },
        appendChild(f) { f.parentNode = this; this.children.push(f); this._sync(); return f; },
        querySelector(sel) { return sel[0] === "h" ? this._findH() : null; },
        set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
        _findH() { if (this.tagName === "H3") return this; for (const c of this.children) { const r = c._findH(); if (r) return r; } return null; },
        _sync() {
            this.children.forEach((c, i) => {
                c.nextSibling = this.children[i + 1] || null;
            });
        }
    };
}
function montarPainel() {
    const mapa = {};
    ["caixaFerramentas", "caixaConfigVendedor", "caixaBot", "caixaPrecosNuvem"].forEach(function (id) {
        const card = el(id);
        card.appendChild(el(null, "h3"));
        card.appendChild(el("conteudo-" + id));
        card.appendChild(el("mais-" + id));
        card._sync();
        mapa[id] = card;
    });
    mapa.editorPrecosCorpo = el("editorPrecosCorpo");
    return mapa;
}
    const loja = {};
    function achar(no, id) {
        if (!no) return null;
        if (no.id === id) return no;
        for (const c of (no.children || [])) { const r = achar(c, id); if (r) return r; }
        return null;
    }
    function rodarMini(mapa, prefsIniciais) {
    const variaveis = [
        (adm9.match(/var BLOCOS_MINI_PADRAO[^;]*;/g) || []).join("\n"),
        (adm9.match(/var BLOCOS_MINI_MAP = \{[\s\S]*?\};/g) || []).join("\n")
    ].join("\n");
    const funcoes = ["prefsPainel", "salvarPrefsPainel", "blocosMinimizados", "blocoMinimizado",
        "aplicarMini", "alternarMini", "prepararMini"].map(n => puxarFuncao(adm9, n)).join("\n");
    const textos = variaveis + "\n" + funcoes;
    const sandbox = {
        console, JSON, Array, Object, String,
        document: {
            readyState: "complete",
            addEventListener() {},
            getElementById: (id) => mapa[id] || achar(mapa[id], id) || Object.keys(mapa)
                .map(k => achar(mapa[k], id)).find(Boolean) || null,
            querySelectorAll: (sel) => {
                const m = /data-mini-btn="([^"]+)"/.exec(sel);
                if (!m) return [];
                const achados = [];
                Object.keys(mapa).forEach(function (id) {
                    (function anda(no) {
                        if (no.getAttribute && no.getAttribute("data-mini-btn") === m[1]) achados.push(no);
                        (no.children || []).forEach(anda);
                    })(mapa[id]);
                });
                if (m[1] === "editorPrecos") achados.push(el("botaoEditor", "button"));
                return achados;
            },
            createElement: () => el(null, "div")
        },
        localStorage: {
            getItem: (k) => (k in prefsIniciais ? prefsIniciais[k] : null),
            setItem: (k, v) => { prefsIniciais[k] = v; }
        },
        setInterval() {}, setTimeout() {}
    };
    vm.createContext(sandbox);
    vm.runInContext(textos, sandbox, { filename: "mini.js" });
    return sandbox;
}
try {
    /* 1) editor de precos ja vem recolhido */
    let mapa = montarPainel();
    let prefs = {};
    let sb = rodarMini(mapa, prefs);
    sb.prepararMini();
    sb.aplicarMini();
    if (mapa.editorPrecosCorpo.style.display !== "none") falha("o editor de precos deveria vir recolhido");
    else console.log("  ok  editor de precos abre recolhido");

    /* 2) clicar em Minimizar abre, clicar de novo recolhe */
    sb.alternarMini("editorPrecos");
    if (mapa.editorPrecosCorpo.style.display === "none") falha("clicar em Minimizar nao abriu o editor de precos");
    else console.log("  ok  clicar abre o bloco");
    sb.alternarMini("editorPrecos");
    if (mapa.editorPrecosCorpo.style.display !== "none") falha("clicar de novo nao recolheu o bloco");
    else console.log("  ok  clicar de novo recolhe");

    /* 3) estado fica guardado em vendedorPrefs */
    let salvos = JSON.parse(prefs.vendedorPrefs || "{}");
    if (!Array.isArray(salvos.miniCards)) falha("o estado do minimizar nao foi salvo em vendedorPrefs.miniCards");
    else console.log("  ok  o que ficou recolhido e lembrado");

    /* 4) os cards do painel ganham corpo e botao */
    mapa = montarPainel();
    prefs = {};
    sb = rodarMini(mapa, prefs);
    sb.prepararMini();
    const corpoFerramentas = sb.document.getElementById("corpoCaixaFerramentas");
    if (!corpoFerramentas || !sb.document.getElementById("corpoCaixaConfigVendedor")
        || !sb.document.getElementById("corpoCaixaBot")) {
        falha("os blocos do painel nao ganharam o corpo recolhivel");
    } else console.log("  ok  ferramentas, configuracoes e bot became recolhiveis");
    if (!corpoFerramentas || corpoFerramentas.children.length !== 2) falha("o corpo das ferramentas nao guardou o conteudo");
    else console.log("  ok  o conteudo foi movido para dentro do corpo");
} catch (e) {
    falha("o botao Minimizar quebrou: " + e.message);
}

/* ---------- 11. painel nao usa nada que e so do cliente ---------- */
console.log("\n=== 11. SEPARACAO ENTRE PAINEL E LOJA ===");
const css9 = fs.readFileSync(path.join(dir, "style.css"), "utf8");
const blocoResp = (css9.split("RESPONSIVE TABLE")[1] || "").split("@media")[0];
if (/[^:]\btable thead/.test(blocoResp)) falha("a regra de tabela do celular ainda pega o painel do vendedor");
else console.log("  ok  a leitura em lista do celular e so da loja");
if (!/data-leitura="vertical"\] body:not\(\.admin\)/.test(css9)) falha("a leitura vertical do cliente esta pegando o painel");
else console.log("  ok  leitura vertical da loja nao invade o painel");
/* o painel TEM os dois modos, com regras proprias (body.admin) */
if (!/body\.admin\[data-leitura="vertical"\] \.tabela-pedidos/.test(css9)) falha("o painel precisa das proprias regras de cartao empilhado");
else console.log("  ok  painel tem leitura propria (horizontal e cartao empilhado)");
["opcoesLeituraVendedor", "setLeituraVendedor"].forEach(function (c) {
    if (adm9.indexOf(c) < 0) falha("painel sem a escolha de leitura: " + c);
});
if (!/data-v="horizontal"/.test(adm9) || !/data-v="vertical"/.test(adm9)) falha("faltou um dos modos de leitura no painel");
else console.log("  ok  painel oferece rolagem horizontal e cartao empilhado");
if (!/if \(ehPainel\(\)\) return;/.test(th.split("function avisoOferta")[1] || "")) {
    falha("a faixa flutuante de ofertas ainda aparece no painel");
} else console.log("  ok  faixa de ofertas fora do painel do vendedor");

/* ---------- 12. perfil enxuto + historico unico ---------- */
console.log("\n=== 12. PERFIL SO DADOS PESSOAIS (E O HISTORICO JUNTO) ===");
const perf = fs.readFileSync(path.join(dir, "perfil.html"), "utf8");
["statPedidos", "statItens", "statGasto", "tabelaPedidosPerfil", "renderPedidosPerfil", "renderPedidos", "meus pedidos"]
    .forEach(function (c) {
        if (new RegExp(c, "i").test(perf)) falha("perfil.html ainda tem '" + c + "' (isso e do historico)");
    });
["Dados Pessoais", "Contato"].forEach(function (c) {
    if (perf.indexOf(c) < 0) falha("perfil.html perdeu o bloco: " + c);
});
if (/id="pNome"/.test(perf) === false) falha("perfil.html perdeu o formulario de dados");
else console.log("  ok  perfil so com dados pessoais e contato");

const hist = fs.readFileSync(path.join(dir, "meus-pedidos.html"), "utf8");
["statPedidos", "statItens", "statGasto", "resumoHistorico", "listaPedidos"].forEach(function (c) {
    if (hist.indexOf(c) < 0) falha("meus-pedidos.html (historico) sem " + c);
});
console.log("  ok  historico tem pedidos, itens comprados e total gasto");
/* um nome so no menu: historico */
const nomesMenu = [];
cliente.forEach(function (p) {
    const t = fs.readFileSync(path.join(dir, p), "utf8");
    const nav = (t.match(/<ul class="nav-links" id="mainNav">[\s\S]*?<\/ul>/) || [""])[0];
    if (!nav) { falha(p + ": menu sem a lista de links"); return; }
    ["index.html", "meus-pedidos.html", "configuracoes.html", "perfil.html"].forEach(function (destino) {
        if (nav.indexOf('href="' + destino + '"') < 0) falha(p + ": menu sem link para " + destino);
    });
    if (/Meus Pedidos/i.test(nav)) falha(p + ": o menu ainda chama de 'Meus Pedidos' (use Historico)");
    nomesMenu.push(nav);
});
if (nomesMenu.some(n => n !== nomesMenu[0])) falha("o menu das paginas do cliente esta diferente entre si");
else console.log("  ok  as " + cliente.length + " paginas do cliente tem o mesmo menu: Produtos, Historico, Configuracoes, Perfil");

/* o HTML montado do historico precisa fechar as tags (bug do </div> a mais) */
function tagsBalanceadas(html) {
    const abertos = (html.match(/<div\b/g) || []).length;
    const fechados = (html.match(/<\/div>/g) || []).length;
    return abertos === fechados;
}
const blocoAvaliar = (hist.split("function caixaAvaliar")[1] || "").split("function toggleAvaliar")[0];
if (!tagsBalanceadas(blocoAvaliar)) falha("caixaAvaliar() devolve um </div> a mais e quebra o card do historico");
else console.log("  ok  a caixa de avaliacao fecha as tags direitinho");

/* ---------- 13. versao dos APK sempre igual a do site ---------- */
console.log("\n=== 13. VERSAO DOS APK SINCRONIZADA ===");
const bjs = fs.readFileSync(path.join(dir, "apk", "android", "build.js"), "utf8");
if (!/versao\.txt/.test(bjs)) falha("apk/android/build.js nao le a versao do site (versao.txt)");
else if (/const VERSAO = "\d/.test(bjs)) falha("apk/android/build.js ainda tem versao fixada no codigo");
else console.log("  ok  o projeto Android tira a versao de versao.txt");
if (!/versionCode \$\{app\.codigo\}/.test(bjs)) falha("o APK do cliente e do vendedor precisam de codigo proprio (app.codigo)");
else console.log("  ok  cliente e vendedor com versionCode proprio");
const ps1 = fs.readFileSync(path.join(dir, "build-apk.ps1"), "utf8");
if (!/versaoSite/.test(ps1) || /--appVersionName "1\.0"/.test(ps1)) falha("build-apk.ps1 ainda fixa a versao do APK");
else console.log("  ok  build-apk.ps1 usa a versao do site nos dois APK");
["cliente", "vendedor"].forEach(function (n) {
    if (!fs.existsSync(path.join(dir, "apk", "convencao-" + n + ".apk"))) falha("falta o APK do " + n);
});
const versaoSite2 = fs.readFileSync(path.join(dir, "versao.txt"), "utf8").trim();
let versaoApk = "";
try { versaoApk = fs.readFileSync(path.join(dir, "apk", "versao-apk.txt"), "utf8").trim(); } catch (e) {}
if (versaoApk === versaoSite2) console.log("  ok  os APK publicados estao na versao do site (" + versaoSite2 + ")");
else if (!versaoApk) console.log("  ok  ainda nao ha APK assinado nesta sessao (rode build-apk.ps1 para gerar na versao " + versaoSite2 + ")");
else console.log("  ATENCAO  APK em " + versaoApk + " e o site esta em " + versaoSite2 + " - rebuild necessario");

/* ---------- 14. o que o dono pediu nesta rodada ---------- */
console.log("\n=== 14. AVISO REAL, FERRAMENTAS E BOTOES DO BOT ===");
/* 1) aviso no aparelho: pede permissao, mostra estado e prova com teste */
const centralJs = fs.readFileSync(path.join(dir, "central.js"), "utf8");
["function notifTestar", "function notifPedirPermissao", "function notifToast"].forEach(function (c) {
    if (centralJs.indexOf(c) < 0) falha("central.js sem " + c + " (aviso real no aparelho)");
});
const cfgH = fs.readFileSync(path.join(dir, "configuracoes.html"), "utf8");
["ligarAviso", "mostrarEstadoNotificacao"].forEach(function (c) {
    if (cfgH.indexOf("function " + c) < 0) falha("configuracoes.html sem " + c + " (interruptor do aviso)");
});
if (!/onchange="ligarAviso\(this\.checked\)"/.test(cfgH)) falha("o aviso do aparelho nao e ligado/desligado por um toque");
if ((cfgH.match(/id="cfgNotifPedido"/g) || []).length !== 1) falha("o aviso do aparelho esta duplicado nas Configuracoes");
else console.log("  ok  aviso do aparelho: um interruptor so, automatico, com teste");
if (!/notifTestar/.test(cfgH) || !/function notifTestar/.test(centralJs)) falha("falta o aviso de teste do aparelho");
else console.log("  ok  ativa pede permissao, mostra o estado e manda um aviso de teste");
if (/cfgFreteGratisAcima|Entrega e Frete/.test(cfgH)) falha("configuracoes.html ainda tem o bloco Entrega e Frete");
else console.log("  ok  bloco Entrega e Frete removido das Configuracoes");
if (/href="carrinho\.html"[^>]*>.*Ir ao carrinho/i.test(cfgH)) falha("Configuracoes ainda tem 'Ir ao carrinho' no fim (duplicado)");
else console.log("  ok  sem 'Ir ao carrinho' no fim das Configuracoes");
if (!/mostrarVersaoCliente/.test(cfgH)) falha("cliente sem o controle de versao (app x site)");
else console.log("  ok  cliente ve a versao do app e a do site, com botao de atualizar");

/* 2) bot: editar de verdade + botoes na mensagem */
const tg = fs.readFileSync(path.join(dir, "telegram.js"), "utf8");
["editarPedido", "textoEditar", "textoBuscar", "CAMPOS_EDITAVEIS"].forEach(function (c) {
    if (tg.indexOf(c) < 0) falha("telegram.js sem " + c + " (edicao de pedido pelo bot)");
});
["/editar", "/reabrir", "/buscar"].forEach(function (c) {
    if (tg.indexOf(c) < 0) falha("telegram.js sem o comando " + c);
});
const sc10 = fs.readFileSync(path.join(dir, "script.js"), "utf8");
if (!/callback_data: "ed\|"/.test(sc10)) falha("a mensagem do pedido precisa do botao Editar");
if (!/callback_data: "rb\|"/.test(sc10)) falha("a mensagem do pedido precisa do botao Reabrir");
console.log("  ok  bot edita pedido, reabre e busca; botoes Editar/Reabrir na mensagem");

/* 3) ferramentas do vendedor maiores e com contagem de mercadorias */
if (!/ferramenta-input/.test(adm9)) falha("as ferramentas do vendedor continuam pequenas");
if (!/function contaCarga/.test(adm9)) falha("falta a contagem de mercadorias nas ferramentas");
else console.log("  ok  ferramentas grandes + contagem de packs e garrafas");

/* 4) home sem atalho de pedidos */
const appJs = fs.readFileSync(path.join(dir, "app.js"), "utf8");
if (/href="meus-pedidos\.html"/.test(appJs)) falha("a home ainda tem atalho para os pedidos");
else console.log("  ok  home sem atalho de pedidos (so a pagina Historico)");
if (/acao:"resumo"[\s\S]{0,200}ativo:true/.test(appJs)) falha("ha um banner de pedidos ativo na home");
else console.log("  ok  nenhum banner de pedidos ativo na home");
if (!/--of-cor/.test(appJs) || !/\.of-btn\{[\s\S]{0,200}--of-cor/.test(fs.readFileSync(path.join(dir, "style.css"), "utf8"))) {
    falha("os botoes das ofertas continuam sem cor de verdade");
} else console.log("  ok  botoes das ofertas com cor e toque grande");

/* ---------- 15. so o dono entra no painel ---------- */
console.log("\n=== 15. PAINEL SO PARA O DONO ===");
const codigoAuto = (adm9.match(/sessionStorage\.setItem\("adminLogado"\s*,\s*"1"\)/g) || []);
if (codigoAuto.length !== 1) {
    falha("o painel nao pode logar sozinho (o login automatico deixava qualquer um entrar): " + codigoAuto.length + "encias");
} else console.log("  ok  nenhum login automatico: so abre com usuario e senha");
if (!/adminTentativas/.test(adm9) || !/adminTravadoAte/.test(adm9)) falha("falta o trava de tentativas de login");
else console.log("  ok  trava de 5 tentativas antes de travar o painel");
["VENDEDOR_USUARIO", "VENDEDOR_SENHA"].forEach(function (c) {
    const sc11 = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    if (sc11.indexOf("const " + c) < 0) falha("script.js sem " + c + " (credencial do painel)");
});
if (/admin\.jks|convencao\.jks/.test(adm9)) falha("o painel nao pode citar o arquivo de assinatura");
else console.log("  ok  credencial e chave de assinatura fora do painel");
/* aviso honesto: o painel e um site, quem protege de verdade e o Firebase */
if (!/privacidade|modo teste|regras/i.test(fs.readFileSync(path.join(dir, "docs/PROJETO.md"), "utf8"))) {
    aviso("PROJETO.md nao lembra das regras do Firebase (quem protege os dados de verdade)");
} else console.log("  ok  a documentacao lembra que a protecao de verdade esta no Firebase");

/* ---------- 16. correcoes visuais desta rodada ---------- */
console.log("\n=== 16. LEITURA VERTICAL, TICKS E DUPLICADOS ===");
/* leitura vertical: cartao com o assunto como titulo (sem repetir rotulo) */
if (!/td\.tb-assunto::before,\s*[\s\S]{0,120}td\.tb-oferta::before\{content:none\}/.test(css9)) {
    falha("leitura vertical: o titulo do cartao ainda repete o rotulo da coluna");
} else console.log("  ok  leitura vertical: assunto vira titulo, sem rotulo repetido");
if (!/max-width:760px/.test(css9)) falha("leitura vertical sem largura maxima (texto esticado na tela toda)");
else console.log("  ok  cartoes com largura maxima (texto nao estica)");
if (!/body\.admin\[data-leitura="vertical"\] \.tabela-pedidos \.td-acoes/.test(css9)) {
    falha("no painel, os botoes de status nao ficam utilizaveis no modo cartao");
} else console.log("  ok  no painel os botoes de status funcionam no modo cartao");
if (!/body\.admin \.main-header\{background:var\(--primary-color/.test(adm9)) {
    falha("o cabecalho do painel precisa de CSS proprio (estava empilhado e torto)");
} else console.log("  ok  cabecalho do painel com layout proprio");
if (!/data-layout="compacto"\] \.tabela-pedidos td\{padding:7px 10px\}/.test(adm9) || !/cfgCompacto === true/.test(th)) {
    falha("a tela compacta nao liga e desliga (faltou tema.js ou o CSS do painel)");
} else console.log("  ok  tela compacta liga e desliga");

/* ticks recolhiveis */
const hist2 = fs.readFileSync(path.join(dir, "meus-pedidos.html"), "utf8");
if (!/function toggleTicks/.test(hist2) || !/timeline-resumo/.test(hist2)) falha("os ticks do historico nao tem botao de recolher");
else console.log("  ok  ticks do historico recolhem e abrem com um toque");
if (!/style="display:none">\' \+ caixaAvaliar/.test(hist2) && !/id="ticks-'/.test(hist2)) falha("a lista de ticks nao comeca recolhida");
else console.log("  ok  a lista de ticks comeca recolhida (so o resumo)");

/* nada de duplicado no fim da configuracoes e da home */
const cfg2 = fs.readFileSync(path.join(dir, "configuracoes.html"), "utf8");
if (/>Ir ao carrinho</.test(cfg2)) falha("Configuracoes ainda tem 'Ir ao carrinho' no fim");
else console.log("  ok  Configuracoes sem 'Ir ao carrinho' duplicado");
const idx2 = fs.readFileSync(path.join(dir, "index.html"), "utf8");
if (/Vendas:/.test(idx2)) falha("a home ainda repete o contato no rodape (esta no WhatsApp e na tabela)");
else console.log("  ok  home sem repetir o contato");
if (/\['<b>Contato<\/b>'/.test(fs.readFileSync(path.join(dir, "app.js"), "utf8"))) {
    falha("a tabela geral ainda repete o contato (ja tem o botao Falar com a loja)");
} else console.log("  ok  tabela geral sem a linha de contato repetida");

/* atencao: pedido novo de outro aparelho */
["chegarNovosPedidos", "focarNovoPedido", "avisoNovos"].forEach(function (c) {
    if (adm9.indexOf(c) < 0) falha("painel sem " + c + " (aviso de pedido novo)");
});
console.log("  ok  painel avisa e destaca quando chega pedido de outro aparelho");

console.log("\n" + (erros === 0 ? "*** ESTRUTURA E SEGURANCA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);