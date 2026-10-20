/* 40 - BOTOES QUE RESPONDEM DE VERDADE (paginas do CLIENTE)
   Abre o site num navegador de verdade (Edge/Chrome headless), sem
   sandbox, e CLIICA nos botoes: o que vale e o efeito na tela, nao o
   atributo do codigo.

     1. o botao flutuante da IA abre e fecha o painel do assistente
     2. ele existe em todas as paginas do cliente
     2b. o X de fechar o assistente tem 44px (so aparece com o painel
         aberto - por isso so da para conferir depois do clique)
     3. o botao Compartilhar cumpre a acao
     4. o botao Minimizar informacoes recolhe e volta, com 44px
     5. nenhum botao/controle visivel abaixo de 44px
     6. o gateway esta de pe (o site depende dele no modo banco fechado)

   Duas regras que evitam teste instavel:
     - porta do debug sorteada a cada execucao (duas rodadas nunca
       disputam a mesma porta);
     - espera a CONDICAO acontecer em vez de dormir um tempo fixo
       (em rede lenta, dormir nao prova nada - so cria alarme falso).

   E o navegador e fechado pela ARVORE de processos: matar so o processo
   pai deixava os filhos vivos e acumulavaedorfas na maquina. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");
const crypto = require("crypto");
const { spawn, execSync } = require("child_process");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const esperar = (ms) => new Promise(function (r) { setTimeout(r, ms); });

const SITE = "https://convencao-site.rickjax123.workers.dev/";
const GATEWAY = "https://convencao-gateway.rickjax123.workers.dev";
const PORTA_BASE = 9370;
const PORTA = PORTA_BASE + Math.floor(Math.random() * 400);
const NAVEGADOR = [
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(function (p) { return p && fs.existsSync(p); });

/* ---------- WebSocket minimo (o que o CDP precisa) ---------- */
function conectar(url) {
    return new Promise(function (resolve, reject) {
        const u = new URL(url);
        const chave = crypto.randomBytes(16).toString("base64");
        const sock = net.connect(Number(u.port), u.hostname, function () {
            sock.write("GET " + u.pathname + u.search + " HTTP/1.1\r\nHost: " + u.host +
                "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: " + chave +
                "\r\nSec-WebSocket-Version: 13\r\n\r\n");
        });
        const esperas = [];
        const fila = [];
        let pronto = false, cab = Buffer.alloc(0);
        sock.on("data", function (t) {
            cab = Buffer.concat([cab, t]);
            if (!pronto) {
                const fim = cab.indexOf("\r\n\r\n");
                if (fim < 0) return;
                pronto = true; cab = cab.slice(fim + 4); resolve(api);
            }
            let buf = cab;
            while (buf.length >= 2) {
                const l0 = buf[1] & 127;
                let off = 2, tam = l0;
                if (l0 === 126) { tam = buf.readUInt16BE(2); off = 4; }
                else if (l0 === 127) { tam = Number(buf.readBigUInt64BE(2)); off = 10; }
                if (buf.length < off + tam) break;
                const msg = buf.slice(off, off + tam).toString("utf8");
                buf = buf.slice(off + tam); cab = buf;
                try {
                    const m = JSON.parse(msg);
                    if (m.id && esperas[m.id]) { esperas[m.id](m); delete esperas[m.id]; }
                    else fila.push(m);
                } catch (e) { /* quadro de controle */ }
            }
        });
        sock.on("error", reject);
        var seq = 0;
        function enviar(obj) {
            const dados = Buffer.from(JSON.stringify(obj));
            const mascara = crypto.randomBytes(4);
            const cab2 = dados.length < 126 ? Buffer.from([0x81, 0x80 | dados.length])
                : Buffer.concat([Buffer.from([0x81, 0x80 | 126]), (function () { const b = Buffer.alloc(2); b.writeUInt16BE(dados.length); return b; })()]);
            const mascarado = Buffer.from(dados);
            for (let i = 0; i < mascarado.length; i++) mascarado[i] ^= mascara[i % 4];
            sock.write(Buffer.concat([cab2, mascara, mascarado]));
        }
        const api = {
            enviar: function (m, p) {
                const id = ++seq;
                return new Promise(function (r) { esperas[id] = r; enviar({ id: id, method: m, params: p || {} }); });
            },
            poll: function () { return fila.splice(0, fila.length); }
        };
    });
}

(async function () {
    if (!NAVEGADOR) { console.log("  ERRO nenhum navegador (Edge/Chrome) encontrado para o teste"); process.exit(1); }

    const perfil = path.join(os.tmpdir(), "bateria40-" + Date.now());
    const nav = spawn(NAVEGADOR, ["--headless=new", "--disable-gpu", "--no-sandbox",
        "--remote-debugging-port=" + PORTA, "--user-data-dir=" + perfil, "about:blank"], { stdio: "ignore" });

    /* fecha a ARVORE inteira do navegador, sempre */
    function fecharNavegador() {
        try { execSync("taskkill /F /T /PID " + nav.pid, { stdio: "ignore" }); }
        catch (e) { try { nav.kill(); } catch (e2) {} }
        /* o Edge se reaparenta e escapa do /T: mata tambem quem
           estiver usando a pasta de perfil desta execucao */
        try {
            execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \'Name = \'\"\"msedge.exe\"\"\' | Where-Object { $_.CommandLine -like \'\"\"*' + perfil + '*\"\"\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }\'"', { stdio: "ignore" });
        } catch (e) { /* sem permissao ou powershell velho: nao e fatal */ }
    }
    process.on("exit", fecharNavegador);

    let alvo = null;
    for (let i = 0; i < 60 && !alvo; i++) {
        await esperar(400);
        try {
            const lista = await (await fetch("http://127.0.0.1:" + PORTA + "/json/list")).json();
            alvo = lista.find(function (t) { return t.type === "page" && t.webSocketDebuggerUrl; });
        } catch (e) { /* ainda subindo */ }
    }
    if (!alvo) {
        fecharNavegador();
        console.log("  ERRO o navegador nao subiu na porta " + PORTA);
        process.exit(1);
    }

    const cdp = await conectar(alvo.webSocketDebuggerUrl);
    await cdp.enviar("Page.enable");
    await cdp.enviar("Runtime.enable");

    /* roda codigo na pagina */
    async function rodar(codigo) {
        const r = await cdp.enviar("Runtime.evaluate", { expression: codigo, returnByValue: true, awaitPromise: true });
        if (r.result && r.result.exceptionDetails) return { erro: true, valor: null };
        return { valor: r.result && r.result.result ? r.result.result.value : null };
    }
    /* espera a CONDICAO: em rede lenta, dormir um tempo fixo cria alarme falso */
    async function esperarAte(condicao, msMax) {
        const fim = Date.now() + (msMax || 15000);
        while (Date.now() < fim) {
            const r = await rodar(condicao);
            if (r.valor) return r.valor;
            await esperar(250);
        }
        return null;
    }
    async function abrir(pagina) {
        await cdp.enviar("Page.navigate", { url: SITE + pagina });
        await esperarAte("document.readyState === 'complete'", 20000);
        await esperar(500);   /* deixa o JS da pagina montar os botoes */
        cdp.poll();          /* joga o ruido da navegacao */
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
    await abrir("index.html");
    const temFab = await esperarAte('!!document.getElementById("iaFab")', 45000);
    if (!temFab) falha("a home nao criou o botao da IA (iaFab)");
    else ok("o botao da IA existe na home (criado por ia.js, ligado por addEventListener)");

    const abriu = await rodar('(function(){var f=document.getElementById("iaFab");if(!f)return "sem fab";f.click();var p=document.getElementById("iaPainel");return (p&&p.classList.contains("aberto"))?"abriu":"nao abriu";})()');
    if (abriu.valor === "abriu") ok("clicou e o painel abriu: o botao responde de verdade");
    else falha("clicou no botao da IA e o painel NAO abriu (" + abriu.valor + ")");

    const fechou = await rodar('(function(){var f=document.getElementById("iaFab");if(!f)return "sem fab";f.click();var p=document.getElementById("iaPainel");return (p&&!p.classList.contains("aberto"))?"fechou":"nao fechou";})()');
    if (fechou.valor === "fechou") ok("segundo clique fecha: o botao alterna de verdade");
    else falha("o botao da IA nao fecha o painel no segundo clique (" + fechou.valor + ")");

    if (errosConsole().length) falha("a home deu erro de JavaScript: " + errosConsole()[0].slice(0, 90));
    else ok("nenhum erro de JavaScript na home");

    console.log("\n=== 2. O BOTAO DA IA EXISTE EM TODA PAGINA DO CLIENTE ===");
    const paginas = ["carrinho.html", "meus-pedidos.html", "perfil.html", "configuracoes.html", "pedido-sucesso.html"];
    for (const p of paginas) {
        await abrir(p);
        const r = await esperarAte('!!document.getElementById("iaFab")', 45000);
        if (r) ok(p + ": botao da IA presente e clicavel");
        else falha(p + ": sem botao da IA (o cliente ficaria sem o assistente nessa tela)");
    }

    console.log("\n=== 2b. O X DE FECHAR O ASSISTENTE TEM 44PX (so aparece aberto) ===");
    for (const p of ["index.html", "carrinho.html", "perfil.html"]) {
        await abrir(p);
        const v = await esperarAte(`(function () {
            var fab = document.getElementById("iaFab");
            if (!fab) return null;
            fab.click();
            var fechar = document.querySelector(".ia-fechar");
            if (!fechar) return "sem botao de fechar";
            var q = fechar.getBoundingClientRect();
            if (!(q.width && q.height)) return "invisivel";
            return Math.round(q.height) + "|" + Math.round(q.width);
        })()`, 15000);
        if (v && /\d+\|\d+/.test(String(v))) {
            const partes = String(v).split("|");
            if (Number(partes[0]) >= 44 && Number(partes[1]) >= 44) ok(p + ": X de fechar " + partes[0] + "x" + partes[1] + "px");
            else falha(p + ": X de fechar tem " + partes[0] + "x" + partes[1] + "px - menor que 44, o dedo erra");
        } else falha(p + ": nao deu para medir o X de fechar (" + v + ")");
    }

    console.log("\n=== 3. COMPARTILHAR CUMPRE A ACAO (carrinho) ===");
    await abrir("carrinho.html");
    await rodar(`(function () {
        window.__share = 0; window.__copiou = ""; window.__texto = "";
        if (navigator.share) { var o = navigator.share; navigator.share = function (d) { window.__share = 1; window.__texto = (d && d.url) || ""; return Promise.resolve(); }; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            var c = navigator.clipboard.writeText;
            navigator.clipboard.writeText = function (t) { window.__copiou = t; return c.apply(this, arguments); };
        }
        return 1;
    })()`);
    const clicou = await rodar('(function(){var a=document.querySelector(".share-btn");if(!a)return "sem botao";a.click();return "clicou";})()');
    if (clicou.valor !== "clicou") falha("o botao Compartilhar nao existe no carrinho");
    else {
        await esperar(700);
        const eff = await rodar('(window.__share||0)+"|"+(window.__copiou?1:0)+"|"+((window.__texto||"").indexOf("refrigerante-site")>=0?1:0)');
        const partes = String(eff.valor || "").split("|");
        if (partes[0] === "1" || partes[1] === "1") ok("Compartilhar cumpriu a acao (abriu o compartilhamento do sistema ou copiou o link)");
        else falha("clicou em Compartilhar e nada aconteceu");
        if (partes[0] === "1" && partes[2] === "1") ok("o link compartilhado e mesmo o do site");
    }
    if (errosConsole().length) falha("o carrinho deu erro de JavaScript ao compartilhar: " + errosConsole()[0].slice(0, 90));
    else ok("nenhum erro de JavaScript ao compartilhar");

    console.log("\n=== 4. MINIMIZAR INFORMACOES RECOLHE E VOLTA (44px) ===");
    await abrir("index.html");
    const achouMini = await esperarAte('!!document.querySelector(".tb-mini-btn")', 15000);
    if (!achouMini) falha("a home nao tem o botao Minimizar informacoes (.tb-mini-btn)");
    else {
        const estado0 = await rodar('document.querySelector(".tb-mini-btn").getAttribute("aria-expanded")');
        const depois = await rodar('(function(){var b=document.querySelector(".tb-mini-btn");b.click();return b.getAttribute("aria-expanded");})()');
        if (depois.valor !== estado0.valor) ok("o clique trocou o estado (aria-expanded " + estado0.valor + " -> " + depois.valor + ")");
        else falha("clicou em Minimizar e o estado nao mudou");
        const voltou = await rodar('(function(){var b=document.querySelector(".tb-mini-btn");b.click();return b.getAttribute("aria-expanded");})()');
        if (voltou.valor === estado0.valor) ok("segundo clique volta ao estado inicial: a tabela recolhe e abre");
        else falha("o segundo clique nao voltou ao estado inicial");
        const tam = await rodar('(function(){return Math.round(document.querySelector(".tb-mini-btn").getBoundingClientRect().height);})()');
        if (Number(tam.valor) >= 44) ok("altura do botao: " + tam.valor + "px (o dedo acerta, minimo 44)");
        else falha("o botao Minimizar tem " + tam.valor + "px: menor que 44, o dedo erra");
    }

    console.log("\n=== 5. NENHUM BOTAO/CONTROLE VISIVEL ABAIXO DE 44PX ===");
    /* botao e controle precisam de 44px (o dedo acerta). Link DENTRO de
       texto fica de fora: link de frase e inline por natureza e forcar
       44px quebraria a leitura do texto. */
    const medir = `(function () {
        var controles = 'button, [role=button], input[type=submit], input[type=button], a[class*=btn], a[class*=filtro], a[class*=op-], a[class*=pag-]';
        var out = [];
        [].slice.call(document.querySelectorAll(controles)).forEach(function (b) {
            var q = b.getBoundingClientRect();
            if (!(q.width && q.height)) return;
            var st = getComputedStyle(b);
            if (b.tagName === 'A' && st.display === 'inline' && !b.getAttribute('role')) return;
            var t = (b.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30);
            if (Math.round(q.height) < 44) out.push(b.tagName + ' ' + t + '=' + Math.round(q.height) + 'px');
        });
        return out.join(' | ');
    })()`;
    for (const p of paginas.concat(["index.html"])) {
        await abrir(p);
        await esperarAte("document.readyState === 'complete'", 20000);
        const r = await esperarAte(`(function () { var o = ${medir}; return o === "" ? "vazio" : o; })()`, 8000);
        const lista = String(r || "").split(" | ").filter(Boolean);
        if (String(r) === "vazio") ok(p + ": todo botao/controle visivel com 44px ou mais");
        else falha(p + ": botao pequeno -> " + lista.join(" | "));
    }

    console.log("\n=== 6. O GATEWAY ESTA DE PE (o site depende dele no banco fechado) ===");
    const saude = await fetch(GATEWAY + "/api/saude").then(function (r) { return r.json(); }).catch(function () { return null; });
    if (saude && saude.ok && saude.banco && saude.servo) ok("gateway de pe, com banco e conta de servico: " + JSON.stringify(saude));
    else falha("gateway fora do ar ou sem conta de servico: " + JSON.stringify(saude));

    fecharNavegador();
    console.log("\n" + (erros === 0 ? "*** BOTOES DE VERDADE 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
    process.exit(erros ? 1 : 0);
})();