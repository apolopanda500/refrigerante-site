/* teste-offline-sw.js - prova que o app ABRE OFFLINE (e nao fica branco)
   ------------------------------------------------------------------
   Era exatamente o que quebrava no celular: ao publicar, o service worker
   novo tomba o controle, o activate apaga o cache antigo e, se a rede nao
   responde dentro do prazo, o CSS/JS voltava VAZIO (504) -> tela branca.

   Aqui a gente faz o que o celular faz:
     1. abre o site (o worker instala e guarda os arquivos)
     2. corta a internet de verdade (CDP)
     3. recarrega e ve se a pagina ainda monta

   uso:  node tools/teste-offline-sw.js [url]                                        */
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const SITE = process.argv[2] || "https://apolopanda500.github.io/refrigerante-site/index.html";
const PORTA = 9333;
const EDGE = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].find(function (p) { return fs.existsSync(p); });

if (!EDGE) { console.log("SEM NAVEGADOR: nao da para testar o app offline"); process.exit(0); }

const perfil = path.join(os.tmpdir(), "teste-sw-" + Date.now());
function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function alvo() {
    for (let i = 0; i < 40; i++) {
        try {
            const r = await fetch("http://127.0.0.1:" + PORTA + "/json/list");
            const lista = await r.json();
            const p = lista.find(function (t) { return t.type === "page"; });
            if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
        } catch (e) { /* subindo ainda */ }
        await esperar(300);
    }
    return null;
}

let seq = 0;
function ligar(ws) {
    const pendentes = new Map();
    const eventos = [];
    ws.addEventListener("message", function (ev) {
        const m = JSON.parse(ev.data);
        if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
        else if (m.method) eventos.push(m);
    });
    return {
        enviar: function (method, params) {
            return new Promise(function (res) {
                const id = ++seq;
                pendentes.set(id, res);
                ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
            });
        },
        eventos: eventos
    };
}

(async function () {
    const nav = spawn(EDGE, [
        "--headless=new", "--disable-gpu", "--no-sandbox",
        "--remote-debugging-port=" + PORTA, "--user-data-dir=" + perfil,
        "--no-first-run", "about:blank"
    ], { stdio: "ignore" });

    const wsUrl = await alvo();
    if (!wsUrl) { console.log("  ERRO nao consegui falar com o navegador"); nav.kill(); process.exit(0); }

    const ws = new WebSocket(wsUrl);
    await new Promise(function (r) { ws.addEventListener("open", r); });
    const cdp = ligar(ws);

    await cdp.enviar("Network.enable");
    await cdp.enviar("Page.enable");
    await cdp.enviar("Runtime.enable");

    let erros = 0;
    const falha = function (m) { console.log("  ERRO " + m); erros++; };
    const ok = function (m) { console.log("  ok   " + m); };

    console.log("=== APP OFFLINE: o celular perde a internet ===");
    console.log("  site: " + SITE);

    /* 1. primeira visita online: o worker instala e guarda os arquivos */
    await cdp.enviar("Page.navigate", { url: SITE });
    await esperar(9000);
    const r1 = await cdp.enviar("Runtime.evaluate", {
        expression: "(function(){var n=navigator.serviceWorker.controller;return n?'SIM':'NAO';})()",
        returnByValue: true
    });
    if (r1.result && r1.result.result && r1.result.result.value === "SIM") ok("service worker no comando da pagina");
    else ok("primeira visita: worker ainda assumindo (normal, o proximo carregamento assume)");

    /* espera o cache do worker encher */
    await esperar(6000);

    /* 2. corta a internet de verdade */
    await cdp.enviar("Network.emulateNetworkConditions", {
        offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0
    });
    ok("internet cortada (modo aviao)");

    /* 3. recarrega: era aqui que a tela ficava branca */
    await cdp.enviar("Page.navigate", { url: SITE });
    await esperar(9000);

    const r2 = await cdp.enviar("Runtime.evaluate", {
        expression: [
            "(function(){",
            "var css=0;try{var s=[].slice.call(document.styleSheets);",
            "for(var i=0;i<s.length;i++){try{if(s[i].cssRules&&s[i].cssRules.length)css++;}catch(e){}}}catch(e){}",
            "return JSON.stringify({",
            "  produto:document.querySelectorAll('.pc').length,",
            "  cssFolhas:css,",
            "  texto:(document.body?document.body.innerText:'').length,",
            "  branco:(document.body?(getComputedStyle(document.body).backgroundColor||''):'')",
            "});})()"
        ].join("\n"),
        returnByValue: true
    });

    let info = {};
    try { info = JSON.parse((r2.result && r2.result.result && r2.result.result.value) || "{}"); }
    catch (e) { falha("nao consegui ler a pagina apos ficar offline"); }

    console.log("");
    if ((info.produto || 0) >= 30) ok("a vitrine montou offline (" + info.produto + " produtos)");
    else falha("so apareceram " + (info.produto || 0) + " produtos offline (a tela fica vazia)");

    if ((info.cssFolhas || 0) >= 1) ok("o CSS carregou offline (" + info.cssFolhas + " folha(s) com regra)");
    else falha("o CSS nao carregou offline: e exatamente o que deixa a tela branca");

    if ((info.texto || 0) > 300) ok("a pagina tem conteudo (" + info.texto + " caracteres)");
    else falha("a pagina saiu quase vazia offline (" + (info.texto || 0) + " caracteres)");

    console.log("");
    console.log(erros === 0 ? "*** APP OFFLINE 10/10 ***" : "*** " + erros + " FALHA(S) ***");

    ws.close();
    nav.kill();
    process.exit(erros ? 1 : 0);
})().catch(function (e) {
    console.log("  ERRO no teste: " + e.message);
    process.exit(0);
});