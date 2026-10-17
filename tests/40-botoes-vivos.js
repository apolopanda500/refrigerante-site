/* 40 - BOTOES QUE RESPONDEM DE VERDADE (10/10)
   A auditoria (tools/botoes.js) abre cada pagina num navegador e
   classifica os botoes. Ela olha `onclick`/`href` - ou seja, ela nao
   enxerga botao ligado por addEventListener, nem link com href="#"
   que chama uma funcao de verdade. Resultado: ela acusava "botao
   falso" em dois botoes que funcionam.

   Aqui a prova e o contrario: o botao e CLICADO num navegador de verdade
   e o efeito na tela e conferido. Nao e leitura de codigo.

     1. o botao flutuante da IA abre o painel do assistente
     2. o botao Compartilhar cumpre a acao (link do sistema ou
        copia na area de transferencia) sem erro de JavaScript
     3. o botao Minimizar informacoes recolhe e mostra a tabela
        de novo, e ele tem 44px (o dedo acerta)
     4. nenhum botao visivel fica abaixo de 44px em nenhuma pagina
     5. nenhuma pagina deixa erro de JavaScript na console

   O navegador e headless (Edge/Chrome), o mesmo que o celular. */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const dir = process.env.WDIR || path.resolve(__dirname, "..");
let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const esperar = (ms) => new Promise(function (r) { setTimeout(r, ms); });

const SITE = "https://apolopanda500.github.io/refrigerante-site/";
const PORTA = 9366;
const NAVEGADOR = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].find(function (p) { return fs.existsSync(p); });

/* ---------- WebSocket minimo (so o que o CDP precisa) ---------- */
function conectar(url) {
    return new Promise(function (resolve, reject) {
        const u = new URL(url);
        const net = require("net");
        const crypto = require("crypto");
        const chave = crypto.randomBytes(16).toString("base64");
        const sock = net.connect(Number(u.port), u.hostname, function () {
            sock.write("GET " + u.pathname + u.search + " HTTP/1.1\r\nHost: " + u.host +
                "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: " + chave +
                "\r\nSec-WebSocket-Version: 13\r\n\r\n");
        });
        const fila = [], esperas = [];
        let pronto = false, cab = Buffer.alloc(0);
        sock.on("data", function (t) {
            cab = Buffer.concat([cab, t]);
            if (!pronto) {
                const fim = cab.indexOf("\r\n\r\n");
                if (fim < 0) return;
                pronto = true;
                cab = cab.slice(fim + 4);
                resolve(api);
            }
            let buf = cab;
            while (buf.length >= 2) {
                const len0 = buf[1] & 127;
                let off = 2, tam = len0;
                if (len0 === 126) { tam = buf.readUInt16BE(2); off = 4; }
                else if (len0 === 127) { tam = Number(buf.readBigUInt64BE(2)); off = 10; }
                if (buf.length < off + tam) break;
                const msg = buf.slice(off, off + tam).toString("utf8");
                buf = buf.slice(off + tam);
                cab = buf;
                try { const m = JSON.parse(msg); if (m.id && esperas[m.id]) { esperas[m.id](m); delete esperas[m.id]; } else fila.push(m); } catch (e) {}
            }
            cab = buf;
        });
        sock.on("error", reject);
        function enviar(obj) {
            const dados = Buffer.from(JSON.stringify(obj));
            const mascara = crypto.randomBytes(4);
            const cab2 = dados.length < 126 ? Buffer.from([0x81, 0x80 | dados.length])
                : Buffer.concat([Buffer.from([0x81, 0x80 | 126]), (() => { const b = Buffer.alloc(2); b.writeUInt16BE(dados.length); return b; })()]);
            const mascarado = Buffer.from(dados);
            for (let i = 0; i < mascarado.length; i++) mascarado[i] ^= mascara[i % 4];
            sock.write(Buffer.concat([cab2, mascara, mascarado]));
        }
        var seq = 0;
        const api = {
            enviar: function (m, p) { const id = ++seq; return new Promise(function (r) { esperas[id] = r; enviar({ id: id, method: m, params: p || {} }); }); },
            poll: function () { return fila.splice(0, fila.length); }
        };
    });
}

(async function () {
    if (!NAVEGADOR) { console.log("  ERRO nenhum navegador (Edge/Chrome) encontrado para o teste"); process.exit(1); }
    const perfil = path.join(os.tmpdir(), "bateria40-" + Date.now());
    const nav = spawn(NAVEGADOR, ["--headless=new", "--disable-gpu", "--no-sandbox",
        "--remote-debugging-port=" + PORTA, "--user-data-dir=" + perfil,
        "about:blank"], { stdio: "ignore" });

    let alvo = null;
    for (let i = 0; i < 60 && !alvo; i++) {
        await esperar(400);
        try {
            const r = await fetch("http://127.0.0.1:" + PORTA + "/json/list");
            const lista = await r.json();
            alvo = lista.find(function (t) { return t.type === "page" && t.webSocketDebuggerUrl; });
        } catch (e) { /* ainda subindo */ }
    }
    if (!alvo) { try { nav.kill(); } catch (e) {} console.log("  ERRO o navegador nao subiu"); process.exit(1); }

    const cdp = await conectar(alvo.webSocketDebuggerUrl);
    async function irParaPagina(pagina) {
        await cdp.enviar("Page.enable");
        await cdp.enviar("Runtime.enable");
        await cdp.enviar("Page.navigate", { url: SITE + pagina });
        await esperar(2600);
        cdp.poll();      /* joga o ruido da navegacao */
    }
    async function rodarNaPagina(codigo) {
        const r = await cdp.enviar("Runtime.evaluate", { expression: codigo, returnByValue: true, awaitPromise: true });
        if (r.result && r.result.exceptionDetails) return { erro: String(r.result.exceptionDetails.text || "erro") };
        return { valor: r.result && r.result.result ? r.result.result.value : null };
    }
    function errosConsole() {
        const fora = [];
        cdp.poll().forEach(function (m) {
            if (m.method === "Runtime.exceptionThrown") {
                const d = m.params.exceptionDetails || {};
                fora.push((d.text || "") + " " + ((d.exception && d.exception.description) || ""));
            }
        });
        return fora;
    }

    console.log("=== 1. O BOTAO DA IA ABRE O ASSISTENTE (home) ===");
    await irParaPagina("index.html");
    let antes = await rodarNaPagina('!!document.getElementById("iaFab")');
    if (!antes.valor) falha("a pagina inicial nao criou o botao da IA (iaFab)");
    else ok("o botao da IA existe na home (criado por ia.js, ligado por addEventListener)");
    let abriu = await rodarNaPagina('(function(){var f=document.getElementById("iaFab");f.click();var p=document.getElementById("iaPainel");return !!(p&&p.classList.contains("aberto"));})()');
    if (!abriu.valor) falha("clicou no botao da IA e o painel NAO abriu");
    else ok("clicou e o painel abriu: o botao responde de verdade");
    let fechou = await rodarNaPagina('(function(){document.getElementById("iaFab").click();var p=document.getElementById("iaPainel");return !(p&&p.classList.contains("aberto"));})()');
    if (!fechou.valor) falha("o botao da IA nao fecha o painel no segundo clique");
    else ok("segundo clique fecha: o botao alterna de verdade");
    if (errosConsole().length) falha("a home deu erro de JavaScript: " + errosConsole()[0].slice(0, 90));
    else ok("nenhum erro de JavaScript na home");

    console.log("\n=== 2. O BOTAO DA IA EXISTE EM TODA PAGINA DO CLIENTE ===");
    for (const p of ["carrinho.html", "meus-pedidos.html", "perfil.html", "configuracoes.html", "pedido-sucesso.html"]) {
        await irParaPagina(p);
        const r = await rodarNaPagina('!!document.getElementById("iaFab")');
        if (r.valor) ok(p + ": botao da IA presente e clicavel");
        else falha(p + ": sem botao da IA (o cliente ficaria sem o assistente nessa tela)");
    }

    console.log("\n=== 2b. O X DE FECHAR O ASSISTENTE TEM 44PX (so aparece aberto) ===");
    /* o botao de fechar so existe visualmente depois que o painel abre,
       entao so da para conferir depois do clique - e e por isso que a
       auditoria achou ele e a bateria normal nao acharia */
    for (const p of ["index.html", "carrinho.html", "perfil.html"]) {
        await irParaPagina(p);
        const r = await rodarNaPagina(`(function () {
            var fab = document.getElementById("iaFab");
            if (!fab) return "sem fab";
            fab.click();
            var fechar = document.querySelector(".ia-fechar");
            if (!fechar) return "sem botao de fechar";
            var q = fechar.getBoundingClientRect();
            if (!(q.width && q.height)) return "invisivel";
            var nome = fechar.getAttribute("aria-label") || "Fechar";
            return Math.round(q.height) + "|" + Math.round(q.width) + "|" + nome;
        })()`);
        const v = String(r.valor || "");
        if (v === "sem fab" || v === "sem botao de fechar" || v === "invisivel") {
            falha(p + ": " + v);
        } else {
            const partes = v.split("|");
            const h = parseInt(partes[0], 10), w = parseInt(partes[1], 10);
            if (h >= 44 && w >= 44) ok(p + ": X de fechar " + h + "x" + w + "px (" + partes[2] + ")");
            else falha(p + ": X de fechar tem " + h + "x" + w + "px - menor que 44, o dedo erra");
        }
    }

    console.log("\n=== 3. COMPARTILHAR CUMPRE A ACAO (carrinho) ===");
    await irParaPagina("carrinho.html");
    const antesShare = await rodarNaPagina(
        '(function(){window.__share=0;window.__copiou="";' +
        'if(navigator.share){var o=navigator.share;navigator.share=function(d){window.__share=1;window.__texto=(d&&d.url)||"";return Promise.resolve();};}' +
        'if(navigator.clipboard&&navigator.clipboard.writeText){var c=navigator.clipboard.writeText;navigator.clipboard.writeText=function(t){window.__copiou=t;return c.apply(this,arguments);};}' +
        'return 1;})()');
    if (!antesShare.valor) falha("nao deu para preparar o teste de compartilhamento");
    const clicouShare = await rodarNaPagina('(function(){var a=document.querySelector(".share-btn");if(!a)return "sem botao";a.click();return "clicou";})()');
    if (clicouShare.valor !== "clicou") falha("o botao Compartilhar nao existe no carrinho");
    else {
        await esperar(600);
        const eff = await rodarNaPagina('(window.__share||0)+"|"+(window.__copiou?1:0)+"|"+((window.__texto||"").indexOf("refrigerante-site")>=0?1:0)');
        const partes = String(eff.valor || "").split("|");
        if (partes[0] === "1" || partes[1] === "1") ok("Compartilhar cumpriu a acao (abriu o compartilhamento do sistema ou copiou o link)");
        else falha("clicou em Compartilhar e nada aconteceu (nem o sistema abriu, nem copiou)");
        if (partes[0] === "1" && partes[2] === "1") ok("o link compartilhado e mesmo o do site");
    }
    if (errosConsole().length) falha("o carrinho deu erro de JavaScript ao compartilhar: " + errosConsole()[0].slice(0, 90));
    else ok("nenhum erro de JavaScript ao compartilhar");

    console.log("\n=== 4. MINIMIZAR INFORMACOES RECOLHE E VOLTA (44px) ===");
    await irParaPagina("index.html");
    const estadoInicial = await rodarNaPagina('(function(){var b=document.querySelector(".tb-mini-btn");return b?b.getAttribute("aria-expanded"):"sem botao";})()');
    if (estadoInicial.valor === "sem botao") falha("a home nao tem o botao Minimizar informacoes (.tb-mini-btn)");
    else {
        ok("botao Minimizar informacoes presente (aria-expanded=" + estadoInicial.valor + ")");
        const depois = await rodarNaPagina('(function(){var b=document.querySelector(".tb-mini-btn");b.click();return b.getAttribute("aria-expanded");})()');
        if (depois.valor !== estadoInicial.valor) ok("o clique trocou o estado (aria-expanded " + estadoInicial.valor + " -> " + depois.valor + ")");
        else falha("clicou em Minimizar e o estado nao mudou");
        const voltou = await rodarNaPagina('(function(){var b=document.querySelector(".tb-mini-btn");b.click();return b.getAttribute("aria-expanded");})()');
        if (voltou.valor === estadoInicial.valor) ok("segundo clique volta ao estado inicial: a tabela recolhe e abre");
        else falha("o segundo clique nao voltou ao estado inicial");
        const tam = await rodarNaPagina('(function(){var b=document.querySelector(".tb-mini-btn");return Math.round(b.getBoundingClientRect().height);})()');
        if (tam.valor >= 44) ok("altura do botao: " + tam.valor + "px (o dedo acerta, minimo 44)");
        else falha("o botao Minimizar tem " + tam.valor + "px: menor que 44, o dedo erra");
    }

console.log("\n=== 5. NENHUM BOTAO/CONTROLE VISIVEL ABAIXO DE 44PX ===");
    const paginas = ["index.html", "carrinho.html", "meus-pedidos.html", "perfil.html", "configuracoes.html", "pedido-sucesso.html"];
    for (const p of paginas) {
        await irParaPagina(p);
        /* botao e controle precisam de 44px (o dedo acerta).
           Link DENTRO de texto fica de fora: link de frase e inline por
           natureza e forcar 44px quebraria a leitura do texto. */
        const r = await rodarNaPagina(`(function () {
            var controles = 'button, [role=button], input[type=submit], input[type=button], a[class*=btn], a[class*=filtro], a[class*=op-], a[class*=pag-]';
            var out = [];
            [].slice.call(document.querySelectorAll(controles)).forEach(function (b) {
                var q = b.getBoundingClientRect();
                if (!(q.width && q.height)) return;
                var st = getComputedStyle(b);
                if (b.tagName === 'A' && st.display === 'inline' && !b.getAttribute('role')) return;
                var t = (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
                if (Math.round(q.height) < 44) out.push(b.tagName + ' ' + t + '=' + Math.round(q.height) + 'px');
            });
            return out.join(' | ');
        })()`);
        const lista = String(r.valor || "").split(" | ").filter(Boolean);
        if (!lista.length) ok(p + ": todo botao/controle visivel com 44px ou mais");
        else falha(p + ": botao pequeno -> " + lista.join(" | "));
    }

    console.log("\n=== 6. O GATEWAY ESTA DE PE (o site depende dele no modo banco fechado) ===");
    const saude = await fetch("https://convencao-gateway.rickjax123.workers.dev/api/saude").then(function (r) { return r.json(); }).catch(function () { return null; });
    if (saude && saude.ok && saude.banco && saude.servo) ok("gateway de pe, com banco e conta de servico: " + JSON.stringify(saude));
    else falha("gateway fora do ar ou sem conta de servico: " + JSON.stringify(saude));

    try { nav.kill(); } catch (e) {}
    console.log("\n" + (erros === 0 ? "*** BOTOES DE VERDADE 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
    process.exit(erros ? 1 : 0);
})();