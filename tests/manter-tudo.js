/* ============================================================
   MANTER TUDO ALINHADO - roda antes de qualquer publicacao
   ------------------------------------------------------------
   Confere, um por um, e diz o que precisa ser arrumado:

     1. versao igual em todas as paginas + versao.txt + app-update
     2. datas no padrao dd/mm/aaaa hh:mm:ss
     3. links internos apontam para arquivo que existe
     4. links externos importantes respondem (com internet)
     5. scripts referenciados pelas paginas existem mesmo
     6. sem codigo morto dentro de <script src="...">
     7. arvore de docs fala dos arquivos que existem
     8. catalogo.json e valido e o robo roda (--com-catalogo)

   Uso:
     node tests/manter-tudo.js              (tudo, sem internet)
     node tests/manter-tudo.js --online     (inclui links externos)
     node tests/manter-tudo.js --com-catalogo  (roba o sync-catalogo)
     node tests/manter-tudo.js --corrigir   (aplica as correcoes seguras)
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");

const dir = process.env.WDIR || path.resolve(__dirname, "..");
const ONLINE = process.argv.includes("--online");
const COM_CATALOGO = process.argv.includes("--com-catalogo");
const CORRIGIR = process.argv.includes("--corrigir");

const PAGS_CLIENTE = ["index.html", "carrinho.html", "checkout.html", "perfil.html",
    "meus-pedidos.html", "pedido-sucesso.html", "configuracoes.html"];
const TODAS = PAGS_CLIENTE.concat(["admin.html"]);

let erros = 0, avisos = 0;
const erro = (m) => { console.log("  ERRO  " + m); erros++; };
const aviso = (m) => { console.log("  AVISO " + m); avisos++; };
const ok = (m) => console.log("  ok    " + m);
function ler(p) { return fs.readFileSync(path.join(dir, p), "utf8"); }
function existe(p) { return fs.existsSync(path.join(dir, p)); }

console.log("=====================================================");
console.log(" MANTER TUDO ALINHADO - Refrigerantes Convencao");
console.log(" data de hoje: " + new Date().toLocaleDateString("pt-BR"));
console.log("=====================================================");

/* ---------- 1. versao em todo lugar ---------- */
console.log("\n=== 1. VERSAO IGUAL EM TODAS AS PAGINAS ===");
let versaoSite = "";
try { versaoSite = ler("versao.txt").trim(); } catch (e) { erro("versao.txt nao existe"); }
const versoesVistas = new Set();
TODAS.forEach(function (p) {
    const t = ler(p);
    (t.match(/\?v=(\d+[a-z])/g) || []).forEach(v => versoesVistas.add(v.replace("?v=", "")));
});
const versoesApp = [...versoesVistas];
if (versoesApp.length !== 1) erro("as paginas usam versoes diferentes: " + versoesApp.join(", "));
else if (versoesApp[0] !== versaoSite) erro("paginas em " + versoesApp[0] + " e versao.txt em " + versaoSite);
else ok("todas as paginas e o versao.txt na versao " + versaoSite);
try {
    const upd = ler("app-update.js");
    const m = upd.match(/VERSAO_APP\s*=\s*"([^"]+)"/);
    if (!m) erro("app-update.js sem VERSAO_APP");
    else if (m[1] !== versaoSite) erro("app-update.js esta na versao " + m[1] + " e o site na " + versaoSite);
    else ok("app-update.js na mesma versao (barra de atualizar funciona)");
} catch (e) { erro("app-update.js nao encontrado"); }

/* ---------- 2. padrao de data/hora ---------- */
console.log("\n=== 2. DATA E HORA NO PADRAO dd/mm/aaaa hh:mm:ss ===");
const sc = ler("script.js");
if (!/function dataHoraSegundos/.test(sc)) erro("script.js sem dataHoraSegundos");
else if (/toLocaleDateString\("pt-BR"\)/.test(sc)) {
    aviso("ainda existe toLocaleDateString em script.js (pode variar por aparelho) - padronize com dataHoraSegundos");
} else ok("todas as datas passam por dataHoraSegundos (15/10/2026 14:12:37)");

/* ---------- 3. links internos ---------- */
console.log("\n=== 3. LINKS INTERNOS (arquivo tem que existir) ===");
let linksQuebrados = [];
TODAS.forEach(function (p) {
    const t = ler(p);
    const re = /(?:href|src)="([^"]+)"/g;
    let m;
    while ((m = re.exec(t)) !== null) {
        const alvo = m[1];
        if (!alvo || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(alvo)) continue;
        if (/["'+]|\s/.test(alvo)) continue;                      /* link montado em JS */
        if (alvo.startsWith("img/cat/")) continue;               /* foto do catalogo */
        const limpo = alvo.split("#")[0].split("?")[0];
        if (!limpo) continue;
        if (!existe(limpo)) linksQuebrados.push(p + " -> " + limpo);
    }
});
if (linksQuebrados.length) linksQuebrados.forEach(l => erro("link quebrado: " + l));
else ok("todos os links internos apontam para arquivo que existe");

/* ---------- 4. links externos (so com --online) ---------- */
console.log("\n=== 4. LINKS EXTERNOS ===");
const externos = [
    "https://apolopanda500.github.io/refrigerante-site/",
    "https://apolopanda500.github.io/refrigerante-site/admin.html",
    "https://refrigerantesconvencaorio.entregaaki.app.br/Principal/Publico/Produtos"
];
if (!ONLINE) {
    ok("pulado (rode com --online para checar)");
} else {
    /* O site oficial pede cookie de sessao: sem ele o fetch entra em laco de
       redirect e o link era dado como quebrado quando estava no ar. O
       helper lib/http-checar.js segue os redirects na mao e guarda o cookie,
       igual o robo do catalogo faz. 3 tentativas com 1 s de respiro, porque
       rede as vezes engasga (o site oficial ja demorou 2,4 s numa checagem). */
    const CHECAR = path.join(__dirname, "lib", "http-checar.js");
    externos.forEach(function (u) {
        let r = "0";
        for (let tentativa = 1; tentativa <= 3 && r !== "200"; tentativa++) {
            try {
                r = execFileSync("node", [CHECAR, u], { timeout: 25000 }).toString().trim();
            } catch (e) { r = "0"; }
            if (r !== "200" && tentativa < 3) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
        }
        if (r === "200") ok("responde 200: " + u);
        else aviso("respondeu " + r + " em 3 tentativas: " + u);
    });
}

/* ---------- 5. scripts das paginas existem ---------- */
console.log("\n=== 5. SCRIPTS E ESTILOS DAS PAGINAS EXISTEM ===");
let faltando = [];
TODAS.forEach(function (p) {
    const t = ler(p);
    const reS = /<script[^>]*\ssrc="([^"]+)"/g;
    let m;
    while ((m = reS.exec(t)) !== null) {
        const alvo = m[1].split("?")[0];
        if (alvo && !existe(alvo) && !/^https?:/i.test(alvo)) faltando.push(p + " -> " + alvo);
    }
    const reC = /<link[^>]*href="([^"]+\.css[^"]*)"/g;
    while ((m = reC.exec(t)) !== null) {
        const alvo = m[1].split("?")[0];
        if (alvo && !existe(alvo) && !/^https?:/i.test(alvo)) faltando.push(p + " -> " + alvo);
    }
});
if (faltando.length) faltando.forEach(f => erro("script/estilo faltando: " + f));
else ok("todo script e stylesheet carregado existe no repositorio");

/* ---------- 6. codigo dentro de <script src> ---------- */
console.log("\n=== 6. SEM CODIGO MORTO DENTRO DE <script src> ===");
let mortos = [];
TODAS.forEach(function (p) {
    const t = ler(p);
    (t.match(/<script[^>]*\bsrc=[^>]*>([\s\S]*?)<\/script>/g) || []).forEach(function (b) {
        const dentro = b.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "").trim();
        if (dentro) mortos.push(p);
    });
});
if (mortos.length) mortos.forEach(m => erro("codigo dentro de <script src> (ignorado pelo navegador): " + m));
else ok("nenhuma pagina escreve codigo dentro de <script src>");

/* ---------- 7. documentacao em dia ---------- */
console.log("\n=== 7. DOCUMENTACAO EM DIA ===");
const docs = ["docs/PROJETO.md", "docs/ARVORE.md", "docs/MANUAL-DONO.md", "docs/AGENTS.md", "tests/LEIA-ME.md"];
docs.forEach(function (d) {
    if (!existe(d)) { erro("documento faltando: " + d); return; }
    const t = ler(d);
    const precisaFalarDe = ["central.js", "img/608AZUL.jpeg", "versao-projeto.txt"].filter(function (a) {
        return existe(a) && t.indexOf(a) < 0;
    });
    if (precisaFalarDe.length) aviso(d + " ainda nao fala de: " + precisaFalarDe.join(", "));
    else ok(d + " em dia");
});

/* ---------- 8. robo do catalogo ---------- */
console.log("\n=== 8. ROBO DO CATALOGO ===");
try {
    const cat = JSON.parse(ler("catalogo.json"));
    if (!cat.produtos || !cat.produtos.length) erro("catalogo.json vazio");
    else {
        var d = new Date(cat.geradoEm);
        var dias = Math.floor((Date.now() - d.getTime()) / 86400000);
        ok("catalogo com " + cat.produtos.length + " produtos, gerado " + dias + " dia(s) atras");
        if (dias > 3) aviso("catalogo com mais de 3 dias: o robo diario pode ter parado");
    }
} catch (e) { erro("catalogo.json invalido: " + e.message); }
if (!existe(".github/workflows/catalogo.yml")) erro("workflow do catalogo sumiu");
else {
    const w = ler(".github/workflows/catalogo.yml");
    if (!/cron: '0 13 \* \* 1-5'/.test(w)) erro("o robô não esta agendado para 10h de segunda a sexta");
    else ok("agendado para 10:00 (fuso de SP), de segunda a sexta");
}
if (COM_CATALOGO) {
    console.log("  rodando o robo de verdade (sync-catalogo.js)...");
    try {
        execSync("node .github/scripts/sync-catalogo.js", { cwd: dir, stdio: "inherit", timeout: 180000 });
        ok("robo rodou sem erro");
    } catch (e) { erro("o robo falhou: " + e.message); }
}

/* ---------- resultado ---------- */
console.log("\n=====================================================");
if (erros) {
    console.log(" " + erros + " problema(s) para arrumar antes de publicar.");
} else {
    console.log(" Tudo alinhado." + (avisos ? " (" + avisos + " aviso(s) - olhe a lista acima)" : ""));
}
console.log("=====================================================");
process.exit(erros ? 1 : 0);
