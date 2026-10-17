/* 41 - PAINEL DO VENDEDOR DE VERDADE
   A bateria 40 abre as paginas do CLIENTE. O painel do dono e outra
   coisa: quase tudo que ele tem fica atras da tela de login, entao a
   auditoria comum so enxergava 3 dos 52 botoes. E o painel e a tela
   que o dono usa o dia inteiro.

   Aqui o painel e aberto de verdade no navegador, com um pedido
   semeado no aparelho (para a tabela ter o que mostrar), e cada coisa
   e clicada e conferida:

     1. tela de login aparece e o painel fica fechado
     2. senha ERRADA nao abre o painel (e nao trava a tela)
     3. senha CERTA abre o painel
     4. o pedido semeado aparece na tabela e no resumo do dia
     5. os botoes de status mudam o status e o historico cresce
     6. a busca filtra e volta
     7. a ficha abre e mostra a hora em dd/mm/aaaa hh:mm:ss
     8. Minimizar abre e fecha os blocos longos
     9. tema e leitura das tabelas aplicam de verdade
    10. Exportar monta o CSV com as 13 colunas
    11. nenhum controle do painel fica abaixo de 44px
    12. o painel nao deixa erro de JavaScript

   O login usa a senha real do script.js: e teste LOCAL, no navegador
   desta maquina, e nada e enviado para fora.

   Estabilidade: porta sorteada por execucao, espera por CONDICAO em
   vez de dormir tempo fixo, e o navegador e fechado pela ARVORE de
   processos (matar so o pai deixava os filhos vivos). */
const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");
const crypto = require("crypto");
const { spawn, execSync } = require("child_process");

const dir = process.env.WDIR || path.resolve(__dirname, "..");
let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const esperar = (ms) => new Promise(function (r) { setTimeout(r, ms); });

const SITE = "https://apolopanda500.github.io/refrigerante-site/";
const PORTA_BASE = 9470;
const PORTA = PORTA_BASE + Math.floor(Math.random() * 400);
const NAVEGADOR = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].find(function (p) { return fs.existsSync(p); });

/* a senha do dono, sem mostrar */
const SENHA = (fs.readFileSync(path.join(dir, "script.js"), "utf8")
    .match(/VENDEDOR_SENHA\s*=\s*"([^"]*)"/) || [])[1];

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
    if (!NAVEGADOR) { console.log("  ERRO nenhum navegador (Edge/Chrome) encontrado"); process.exit(1); }
    if (!SENHA) { console.log("  ERRO nao achei a senha do painel no script.js"); process.exit(1); }

    const perfil = path.join(os.tmpdir(), "bateria41-" + Date.now());
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

    /* o pedido semeado: existe so na memoria do navegador de teste */
    const SEMENTE = `(function () {
        var p = {
            id: "CV20260101-001-12345",
            nome: "TESTE BATERIA 41", tel: "21988887777", cpf: "00000000000",
            end: "Rua do Teste, 99", bairro: "Japeri", regiao: "japeri", frete: 12,
            pagamento: "Pix", troco: "",
            itens: [{ name: "Guarana 350ml", qty: 2, price: 19, priceNum: 19, subtotal: 38 }],
            subtotal: 38, total: 50, status: "aguardando",
            criadoEm: Date.now(), historico: [{ status: "aguardando", quando: Date.now() }]
        };
        try { localStorage.setItem("convencao_pedidos", JSON.stringify([p])); } catch (e) {}
    })();`;

    async function rodar(codigo) {
        const r = await cdp.enviar("Runtime.evaluate", { expression: codigo, returnByValue: true, awaitPromise: true });
        if (r.result && r.result.exceptionDetails) return { erro: true, valor: null };
        return { valor: r.result && r.result.result ? r.result.result.value : null };
    }
    /* espera a CONDICAO acontecer: dormir tempo fixo cria alarme falso */
    async function esperarAte(condicao, msMax) {
        const fim = Date.now() + (msMax || 15000);
        while (Date.now() < fim) {
            const r = await rodar(condicao);
            if (r.valor) return r.valor;
            await esperar(250);
        }
        return null;
    }
    async function abrirPainel(semente) {
        await cdp.enviar("Page.addScriptToEvaluateOnNewDocument", { source: SEMENTE });
        await cdp.enviar("Page.navigate", { url: SITE + "admin.html" });
        await esperarAte("document.readyState === 'complete'", 20000);
        await esperarAte('!!document.getElementById("fSenha")', 15000);
        cdp.poll();
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
    const entrarCom = (senha) => `(function () {
        document.getElementById("fUsuario").value = "apolopanda500";
        document.getElementById("fSenha").value = ${JSON.stringify(senha)};
        window.__alert = "";
        var antigo = window.alert; window.alert = function (m) { window.__alert = String(m); };
        entrar();
        window.alert = antigo;
        return "tentou";
    })()`;

    console.log("=== 1. A TELA DE LOGIN SEGURA O PAINEL ===");
    await abrirPainel();
    const tela = await rodar('(function(){return (getComputedStyle(document.getElementById("loginTela")).display!=="none")+"|"+(getComputedStyle(document.getElementById("painelTela")).display==="none");})()');
    if (String(tela.valor) === "true|true") ok("abre na tela de login, com o painel fechado");
    else falha("estado inicial do painel errado: " + tela.valor);

    console.log("\n=== 2. SENHA ERRADA NAO ABRE O PAINEL ===");
    await rodar(entrarCom("senha-errada-de-proposito"));
    await esperar(600);
    const errado = await rodar('(function(){var av=document.getElementById("loginErro");return (getComputedStyle(document.getElementById("painelTela")).display==="none"?"fechado":"ABRIU")+"|"+((av&&av.style.display!=="none"&&av.innerText)?"com aviso":"sem aviso");})()');
    if (String(errado.valor).indexOf("fechado") === 0) ok("senha errada: painel continua fechado (" + String(errado.valor).split("|")[1] + ")");
    else falha("senha errada ABRIU o painel: " + errado.valor);
    if (errosConsole().length) falha("erro de JavaScript ao tentar entrar errado: " + errosConsole()[0].slice(0, 90));
    else ok("nenhum erro de JavaScript na tentativa errada");

    console.log("\n=== 3. SENHA CERTA ABRE O PAINEL ===");
    await abrirPainel();
    await rodar(entrarCom(SENHA));
    const aberto = await esperarAte('(function(){return getComputedStyle(document.getElementById("painelTela")).display === "none" ? "" : "aberto";})()', 15000);
    if (aberto) ok("senha certa: painel abriu para o dono");
    else falha("senha certa e o painel ficou fechado");
    await esperarAte('(function(){var t=document.getElementById("listaPedidos");return t && t.innerText.indexOf("TESTE BATERIA 41")>=0 ? "achou" : "";})()', 15000);
    cdp.poll();

    console.log("\n=== 4. O PEDIDO APARECE NA TABELA ===");
    const naLista = await rodar('(function(){var t=document.getElementById("listaPedidos");if(!t)return "sem lista";return t.innerText.indexOf("TESTE BATERIA 41")>=0?"achou":"nao achou";})()');
    if (naLista.valor === "achou") ok("o pedido semeado aparece na lista de pedidos do dono");
    else falha("o pedido nao apareceu na lista: " + naLista.valor);
    const resumo = await rodar('(function(){var r=document.getElementById("resumoDia");return r?r.innerText.replace(/\\s+/g," ").trim().slice(0,70):"";})()');
    if (resumo.valor) ok("resumo do dia mostra: " + resumo.valor);
    else falha("o resumo do dia ficou vazio");

    console.log("\n=== 5. OS BOTOES DE STATUS MUDAM O PEDIDO ===");
    const status = await rodar(`(function () {
        var alvo = document.querySelector("#listaPedidos .b-confirmar");
        if (!alvo) return "sem botao de status";
        alvo.click();
        var p = null;
        try { p = JSON.parse(localStorage.getItem("convencao_pedidos") || "[]")[0]; } catch (e) {}
        return (p && p.status) + "|" + (p && p.historico ? p.historico.length : 0);
    })()`);
    const ps = String(status.valor || "").split("|");
    if (ps[0] === "confirmado" && Number(ps[1]) >= 2) ok("clicou em Confirmar: status = " + ps[0] + ", historico com " + ps[1] + " passos");
    else falha("o botao de status nao mudou o pedido: " + status.valor);

    console.log("\n=== 6. A BUSCA FILTRA ===");
    const busca = await rodar(`(function () {
        var c = document.getElementById("buscaAdmin");
        if (!c) return "sem campo de busca";
        c.value = "JAPERI";
        c.dispatchEvent(new Event("input", { bubbles: true }));
        var comJaperi = document.getElementById("listaPedidos").innerText.indexOf("TESTE BATERIA 41") >= 0;
        c.value = "NAOEXISTEXYZ";
        c.dispatchEvent(new Event("input", { bubbles: true }));
        var semNada = document.getElementById("listaPedidos").innerText.indexOf("TESTE BATERIA 41") < 0;
        c.value = "";
        c.dispatchEvent(new Event("input", { bubbles: true }));
        var voltou = document.getElementById("listaPedidos").innerText.indexOf("TESTE BATERIA 41") >= 0;
        return [comJaperi, semNada, voltou].join("|");
    })()`);
    const bb = String(busca.valor || "").split("|");
    if (bb[0] === "true" && bb[1] === "true" && bb[2] === "true") ok("busca por bairro acha, por texto inexistente some, e limpar volta tudo");
    else falha("a busca nao filtrou direito: " + busca.valor);

    console.log("\n=== 7. A FICHA DO PEDIDO ABRE COM A HORA ===");
    const ficha = await rodar(`(function () {
        var linhas = document.querySelectorAll("#listaPedidos tr, #listaPedidos .linha-pedido");
        for (var i = 0; i < linhas.length; i++) {
            if ((linhas[i].innerText || "").indexOf("TESTE BATERIA 41") >= 0) { linhas[i].click(); break; }
        }
        var t = document.body.innerText;
        return /\\d{2}\\/\\d{2}\\/\\d{4} \\d{2}:\\d{2}:\\d{2}/.test(t) ? "com hora" : "sem hora";
    })()`);
    if (ficha.valor === "com hora") ok("a ficha abre e mostra a hora no formato dd/mm/aaaa hh:mm:ss");
    else falha("a ficha nao mostrou a hora: " + ficha.valor);

    console.log("\n=== 8. MINIMIZAR ABRE E FECHA OS BLOCOS LONGOS ===");
    const mini = await rodar(`(function () {
        var b = document.querySelector("#painelTela .btn-mini-bloco[aria-expanded]");
        if (!b) return "sem botao";
        var alvo = document.getElementById(String(b.getAttribute("data-mini-btn") || ""));
        function estado() {
            return (b.getAttribute("aria-expanded") || "?") + "/" + (alvo ? (alvo.style.display || "visivel") : "sem-alvo");
        }
        var antes = estado();
        b.click();
        var meio = estado();
        b.click();
        return [antes, meio, estado()].join(" | ");
    })()`);
    const mm = String(mini.valor || "").split(" | ");
    if (mm.length === 3 && mm[0] !== mm[1] && mm[1] !== mm[2]) ok("Minimizar: " + mm[0] + " -> " + mm[1] + " -> " + mm[2] + " (recolhe e volta)");
    else falha("o botao Minimizar nao alternou o bloco: " + mini.valor);

    console.log("\n=== 9. TEMA E LEITURA DAS TABELAS APLICAM ===");
    const tema = await rodar(`(function () {
        var antes = document.documentElement.getAttribute("data-theme") || "";
        var botoes = document.querySelectorAll("#painelTela .tema-btn, #painelTela [id^=opcoesTema] .op-btn");
        if (!botoes.length) return "sem botao|" + antes;
        for (var i = 0; i < botoes.length; i++) {
            if ((botoes[i].getAttribute("data-v") || "") !== antes) { botoes[i].click(); break; }
        }
        return "clicou|" + (document.documentElement.getAttribute("data-theme") || "") + "|" + antes;
    })()`);
    const tt = String(tema.valor || "").split("|");
    if (tt[0] === "clicou" && tt[1] !== tt[2]) ok("trocar o tema aplica de verdade (" + tt[2] + " -> " + tt[1] + ")");
    else falha("tema nao mudou: " + tema.valor);
    const leitura = await rodar(`(function () {
        var antes = document.body.getAttribute("data-leitura") || "";
        var b = document.querySelector("#painelTela [id^=opcoesLeitura] .op-btn[data-v=vertical]") || document.querySelector("#painelTela [id^=opcoesLeitura] .op-btn");
        if (!b) return "sem botao";
        b.click();
        return (document.body.getAttribute("data-leitura") || "") + "|" + antes;
    })()`);
    const ll = String(leitura.valor || "").split("|");
    if (ll[0] && ll[0] !== ll[1]) ok("leitura das tabelas mudou (" + ll[1] + " -> " + ll[0] + ")");
    else falha("leitura nao mudou: " + leitura.valor);

    console.log("\n=== 10. EXPORTAR MONTA O CSV SEM ERRO ===");
    const csv = await rodar(`(function () {
        var orig = URL.createObjectURL;
        window.__csv = "";
        URL.createObjectURL = function (blob) {
            try {
                var leitor = new FileReader();
                leitor.onload = function () { window.__csv = String(leitor.result || ""); };
                leitor.readAsText(blob);
            } catch (e) {}
            return "blob:interceptado";
        };
        try { exportarPedidos(); } catch (e) { URL.createObjectURL = orig; return "ERRO: " + e.message; }
        URL.createObjectURL = orig;
        return new Promise(function (r) { setTimeout(function () { r(window.__csv || "vazio"); }, 500); });
    })()`);
    const texto = String(csv.valor || "");
    const colunas = (texto.split(/\r?\n/)[0] || "").split(";").length;
    const temCabecalho = /Pedido;Data;Status/.test(texto);
    const temCliente = texto.indexOf("TESTE BATERIA 41") >= 0;
    if (temCabecalho && colunas >= 13 && temCliente) ok("Exportar montou o CSV com " + colunas + " colunas e o pedido do cliente");
    else falha("CSV sem cabecalho/" + colunas + " colunas/cliente: " + texto.slice(0, 90));

    console.log("\n=== 11. NENHUM CONTROLE DO PAINEL ABAIXO DE 44PX ===");
    const pequenos = await rodar(`(function () {
        var controles = 'button, [role=button], input[type=submit], input[type=button], a[class*=btn]';
        var out = [];
        [].slice.call(document.querySelectorAll(controles)).forEach(function (b) {
            var q = b.getBoundingClientRect();
            if (!(q.width && q.height)) return;
            var st = getComputedStyle(b);
            if (b.tagName === 'A' && st.display === 'inline' && !b.getAttribute('role')) return;
            var t = (b.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 26);
            if (Math.round(q.height) < 44) out.push(b.tagName + ' ' + t + '=' + Math.round(q.height) + 'px');
        });
        return out.join(' | ');
    })()`);
    const peq = String(pequenos.valor || "").split(" | ").filter(Boolean);
    if (!peq.length) ok("todo controle visivel do painel com 44px ou mais");
    else falha("controle pequeno no painel: " + peq.join(" | "));

    console.log("\n=== 12. O PAINEL NAO DEIXA ERRO DE JAVASCRIPT ===");
    if (errosConsole().length) falha("erro de JavaScript no painel: " + errosConsole()[0].slice(0, 110));
    else ok("nenhum erro de JavaScript no painel do vendedor");

    fecharNavegador();
    console.log("\n" + (erros === 0 ? "*** PAINEL DO VENDEDOR 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
    process.exit(erros ? 1 : 0);
})();