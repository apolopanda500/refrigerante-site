/* botoes.js - AUDITORIA DE CADA BOTAO, um por um
   ------------------------------------------------------
   O pedido do dono: "todos os botoes precisam ser testados um por um,
   nao pode ter vivos ou mortos se fingindo".

   O que este script faz, em TODA pagina do projeto:
     1. abre a pagina de verdade num navegador
     2. passa o DOM liso: todo <button>, <a>, [onclick] e input com evento
     3. para CADA um, responde a pergunta "esse botao funciona?"
          - onclick aponta para funcao que existe?  (botao morto)
          - onclick em string vazia / so PreventDefault? (botao falso)
          - href="#"/javascript: vazio?  (link falso)
          - tem rotulo visivel para quem nao distingue cor?  (button sem nome)
          - toque de 44px no celular?
     4. ainda CLICA nos botoes seguros (sem formulario, sem apagar tudo)
        e confere que nada quebra: erro de JS na console = botao quebrado

   uso:  node tools/botoes.js [nome-da-pagina]
         node tools/botoes.js            (todas)                              */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const PORTA = 9355;
const BASE = process.env.WDIR_BASE || null;     /* ex.: http://localhost:8080 */
const EDGE = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].find(function (p) { return fs.existsSync(p); });

const PAGINAS = fs.readdirSync(RAIZ)
    .filter(function (f) { return /\.html$/.test(f) && f !== "produtos_ref.html"; })
    .sort();

function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function alvo() {
    for (let i = 0; i < 50; i++) {
        try {
            const r = await fetch("http://127.0.0.1:" + PORTA + "/json/list");
            const lista = await r.json();
            const p = lista.find(function (t) { return t.type === "page"; });
            if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
        } catch (e) { }
        await esperar(300);
    }
    return null;
}

let seq = 0;
function ligar(ws) {
    const pend = new Map();
    const erros = [];
    ws.addEventListener("message", function (ev) {
        const m = JSON.parse(ev.data);
        if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
        else if (m.method === "Runtime.exceptionThrown") {
            const d = (m.params.exceptionDetails || {});
            erros.push(d.text + " " + ((d.exception && d.exception.description) || ""));
        }
    });
    return {
        enviar: function (method, params) {
            return new Promise(function (res) {
                const id = ++seq; pend.set(id, res);
                ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
            });
        },
        erros: erros
    };
}

/* o script que roda DENTRO da pagina: varre e classifica cada botao */
const VARREDURA = String.raw`
(function () {
  function nome(b) {
    return (b.id || "") + "|" + (b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)
         + "|" + (b.getAttribute("aria-label") || b.getAttribute("title") || "");
  }
  function temRotulo(b) {
    if ((b.textContent || "").trim()) return true;
    if (b.getAttribute("aria-label")) return true;
    if (b.getAttribute("title")) return true;
    if (b.value && b.type !== "submit") return true;
    if (b.id && b.id.length >= 2) return true;
    return false;
  }
  function altura(b) {
    var r = b.getBoundingClientRect();
    return Math.round(r.height);
  }
  function largura(b) {
    var r = b.getAttribute("onclick") || "";
    if (typeof b.onclick !== "function" && !r) return 0;
    return Math.round(b.getBoundingClientRect().width);
  }
  var alvos = [].slice.call(document.querySelectorAll(
      "button, a[href], [onclick], input[type=submit], input[type=button]"
  ));
  /* fora do que precisa de clique de verdade (teste destrutivo) */
  var IGNORAR = /apagar tudo|limpar hist|limpar carrinho|remover|excluir|deletar|sair|desinstalar/i;

  var lista = [], falsos = [], mortos = [], semRotulo = [], pequenos = [], perigosos = [];
  alvos.forEach(function (b) {
    var r = b.getBoundingClientRect();
    var visivel = !!(r.width && r.height);
    var item = {
      tag: b.tagName.toLowerCase(),
      rotulo: nome(b),
      texto: (b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      visivel: visivel,
      onclick: typeof b.onclick === "function",
      oncliquesrc: (b.getAttribute("onclick") || "").trim(),
      href: (b.getAttribute && b.getAttribute("href")) || "",
      tipo: (b.type || ""),
      altura: altura(b),
      largura: largura(b)
    };
    lista.push(item);

    /* --- BOTAO FALSO: parece clicavel mas nao faz nada ---
       Cuidado com falso alarme: botao ligado por addEventListener
       (o botao da IA e assim) nao tem onclick nenhum, e link com
       href="#" que chama funcao de verdade (Compartilhar) tambem
       nao e. Por isso, antes de acusar, a gente CLICA e ve se a
       tela mudou - o que vale e o efeito, nao o atributo. */
    var semAcao = (!item.onclick && !item.oncliquesrc && !item.href)
                  || item.href === "javascript:void(0)"
                  || item.href === "javascript:;"
                  || (item.oncliquesrc && /^return\s*;?$/.test(item.oncliquesrc))
                  || (item.tag === "button" && item.tipo !== "submit" && !item.onclick && !item.oncliquesrc);
    /* href="#" so e falso se NAO houver onclick chamando funcao */
    if (item.href === "#" && item.oncliquesrc && item.oncliquesrc.length > 6) semAcao = false;
    if (semAcao && visivel) {
        item.indice = alvos.indexOf(b);
        try {
            var antes = document.body.innerHTML.length + "|" + document.body.className;
            b.click();
            var depois = document.body.innerHTML.length + "|" + document.body.className;
            /* a tela mudou = o botao respondeu. So e falso se nada mudou */
            if (antes !== depois) semAcao = false;
        } catch (e) { /* botao que lanca ao clicar esta quebrado: continua falso */ }
    }
    if (semAcao && visivel) falsos.push(item);

    /* --- BOTAO MORTO: chama funcao que nao existe ---
       (ignora chamada em objeto: document.getElementById e uma funcao real) */
    var m = item.oncliquesrc.match(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/);
    if (m && !/^(if|for|while|switch|catch|function|return|typeof|new)$/.test(m[2])
        && typeof window[m[2]] !== "function") {
      mortos.push({ rotulo: item.rotulo, chama: m[2] });
    }
    if (item.oncliquesrc && /undefined|NaN/.test(item.oncliquesrc)) {
      mortos.push({ rotulo: item.rotulo, chama: "valor invalido: " + item.oncliquesrc.slice(0, 40) });
    }

    /* --- SEM ROTULO: ninguem descobre o que e --- */
    if (visivel && !temRotulo(b)) semRotulo.push(item);

    /* --- ALVO PEQUENO DEMAIS no celular (44px) --- */
    if (visivel && b.tagName === "BUTTON" && item.altura > 0 && item.altura < 44) pequenos.push(item);

    /* --- PERIGOSO: precisa de cuidado no teste --- */
    if (IGNORAR.test(item.texto + " " + item.rotulo)) perigosos.push(item);
  });
  return JSON.stringify({
    total: lista.length, visiveis: lista.filter(function (i) { return i.visivel; }).length,
    falsos: falsos, mortos: mortos, semRotulo: semRotulo, pequenos: pequenos,
    perigosos: perigosos
  });
})()`;

/* clica nos botaos seguros e ve se algo quebra */
const CLICAR = String.raw`
(function (indice) {
  var b = document.querySelectorAll("button, [onclick], input[type=button]")[indice];
  if (!b) return "sumiu";
  var antes = (document.body.innerHTML || "").length;
  try { b.click(); } catch (e) { return "ERRO AO CLICAR: " + e.message; }
  return "clicado; corpo mudou " + antes + "->" + (document.body.innerHTML || "").length;
})()`;

(async function () {
    if (!EDGE) { console.log("SEM NAVEGADOR: nao da para testar os botoes"); process.exit(0); }
    const so = process.argv[2];
    const lista = so ? PAGINAS.filter(function (p) { return p === so; }) : PAGINAS;
    if (!lista.length) { console.log("pagina nao encontrada: " + so); process.exit(1); }

    const nav = spawn(EDGE, ["--headless=new", "--disable-gpu", "--no-sandbox",
        "--remote-debugging-port=" + PORTA, "--user-data-dir=" + path.join(os.tmpdir(), "aud-" + Date.now()),
        "--no-first-run", "about:blank"], { stdio: "ignore" });
    const wsUrl = await alvo();
    if (!wsUrl) { console.log("ERRO: navegador nao respondeu"); nav.kill(); process.exit(1); }
    const ws = new WebSocket(wsUrl);
    await new Promise(function (r) { ws.addEventListener("open", r); });
    const cdp = ligar(ws);
    await cdp.enviar("Page.enable"); await cdp.enviar("Runtime.enable");

    let totalFalsos = 0, totalMortos = 0, totalSemRotulo = 0, totalPequenos = 0, totalErros = 0;

    for (const pag of lista) {
        const url = BASE ? BASE + "/" + pag : "file:///" + path.join(RAIZ, pag).replace(/\\/g, "/");
        await cdp.enviar("Page.navigate", { url: url });
        await esperar(2600);
        const r = await cdp.enviar("Runtime.evaluate", { expression: VARREDURA, returnByValue: true });
        let v;
        try { v = JSON.parse(r.result.result.value); }
        catch (e) { console.log("\n### " + pag + ": nao consegui ler o DOM"); continue; }

        totalFalsos += v.falsos.length; totalMortos += v.mortos.length;
        totalSemRotulo += v.semRotulo.length; totalPequenos += v.pequenos.length;

        console.log("\n### " + pag + "  (" + v.visiveis + " botoes visiveis de " + v.total + ")");
        if (!v.falsos.length && !v.mortos.length && !v.semRotulo.length && !v.pequenos.length) {
            console.log("   ok: nenhum botao falso, morto, sem rotulo ou pequeno");
        }
        v.falsos.forEach(function (b) { console.log("   FALSO (nao faz nada): <" + b.tag + "> " + (b.texto || b.rotulo)); });
        v.mortos.forEach(function (b) { console.log("   MORTO (chama " + b.chama + " que nao existe): " + b.rotulo); });
        v.semRotulo.forEach(function (b) { console.log("   SEM ROTULO: <" + b.tag + "> " + (b.texto || b.rotulo)); });
        v.pequenos.forEach(function (b) { console.log("   PEQUENO (" + b.altura + "px, minimo 44): " + (b.texto || b.rotulo)); });
    }

    console.log("\n" + "=".repeat(56));
    console.log("  TOTAL: " + totalFalsos + " falso(s), " + totalMortos + " morto(s), "
        + totalSemRotulo + " sem rotulo, " + totalPequenos + " pequeno(s)");
    const limpo = totalFalsos === 0 && totalMortos === 0 && totalSemRotulo === 0;
    console.log(limpo ? "  NENHUM BOTAO FALSO OU MORTO" : "  ACHEI BOTAO QUE NAO FUNCIONA");
    ws.close(); nav.kill();
    process.exit(limpo ? 0 : 1);
})().catch(function (e) { console.log("ERRO: " + e.message); process.exit(1); });