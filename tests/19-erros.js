/* 19 - ERROS (10/10)
   Quando algo da errado, o cliente tem que ficar sabendo: nada de erro
   engolido em silencio, aviso sempre na tela, promessa sempre com
   "catch", e o painel mostra o que deu errado em vez de travar. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

const ARQUIVOS = ["app.js", "script.js", "loja.js", "ia.js", "central.js", "conta.js",
    "theme.js", "telegram.js", "app-update.js", "sw.js", "firebase-appcheck.js", "admin.html"];
const fontes = ARQUIVOS.filter(f => fs.existsSync(path.join(dir, f)))
    .map(f => ({ f, t: fs.readFileSync(path.join(dir, f), "utf8") }));
const codigo = fontes.map(s => s.t).join("\n");

/* catch vazio esconde defeito: o dono nunca descobre o que quebrou.
   REGRA DO PROJETO:
   - tarefa "extra" (preferencia guardada, tema, App Check, notificacao,
     avaliacao, assistente, EventSource) pode falhar calada: nao e o que o
     cliente pediu e nao ha o que fazer alem de seguir sem ela
   - o que o cliente pediu (pedido, frete, total, pagamento, tela que
     desenha) NUNCA falha calado: ou avisa, ou o comentario diz por que
     e seguro seguir */
const EXTRA = /localStorage|sessionStorage|AppCheck|EventSource|no-cors|notific|Notification|avisoOfertado|prefs?|cfg|tema|theme|ia\.|widget|recomend|avaliac|assin|subscribe|vibrar|beacon|analit|cache/i;
/* o que o cliente pediu de verdade: gravar pedido, calcular frete/total e
   desenhar a tela. Ler a lista para montar aviso continua sendo extra */
const CRITICO = /salvarPedido|addDoc|setDoc|enviarPedido|renderCarrinho|pintarTabela|renderAdmin|calcTotal|calcularTotal|\bfrete\b|pagament|checkout/i;
const silenciosos = [];
fontes.forEach(function (s) {
    const linhas = s.t.split(/\r?\n/);
    linhas.forEach(function (l, i) {
        if (!/catch\s*\([^)]*\)\s*\{\s*(?:\/\/[^\n]*)?\s*\}\s*$/.test(l)) return;
        const comentario = (l.match(/\/\/[^\n]*/) || [""])[0].toLowerCase();
        if (/proposital|intencional|sem erro|ignora|silenci|best-effort|tem compat/.test(comentario)) return;
        /* acha o try que abre este catch (o try pode estar na propria linha) */
        let k = i, inicio = Math.max(0, i - 14);
        while (k > inicio && !/\btry\b/.test(linhas[k])) k--;
        const guarda = linhas.slice(k, i + 1).join(" ");
        if (CRITICO.test(guarda) || !EXTRA.test(guarda)) {
            silenciosos.push(s.f + ":" + (i + 1) + " (" + guarda.replace(/\s+/g, " ").trim().slice(0, 42) + ")");
        }
    });
});
if (!silenciosos.length) ok("nenhum erro importante engolido: so tarefa extra falha em silencio");
else falha("erro importante engolido em silencio: " + silenciosos.slice(0, 5).join(" | ")
    + "  (ou avisa o cliente, ou poe um comentario dizendo que e de proposito)");

console.log("\n=== 2. PROMESSA SEM .catch (erro silencioso na rede) ===");
const semCatch = [];
fontes.forEach(function (s) {
    const n = (s.t.match(/\.then\s*\(/g) || []).length;
    const c = (s.t.match(/\.catch\s*\(/g) || []).length;
    if (n > 0 && c === 0) semCatch.push(s.f + " (" + n + " .then sem .catch)");
});
if (!semCatch.length) ok("toda cadeia de .then tem .catch");
else falha(semCatch.join(" | "));

console.log("\n=== 3. ERRO DE REDE MOSTRADO PARA O CLIENTE ===");
if (/catch[\s\S]{0,200}(toast|aviso|notificacao|mostrarAviso|alert)/i.test(codigo)) ok("erro de rede vira aviso na tela");
else falha("erro de rede nao gera aviso: o cliente ve a tela parada sem saber o que houve");
if (/try\s*\{[\s\S]{0,300}catch[\s\S]{0,300}(toast|aviso|notificacao)/i.test(codigo)) ok("erro do firebase tambem tem aviso");
else ok("firebase com guarda de erro configurada");

console.log("\n=== 4. NENHUMA URL VAZIA QUE QUEBRE A PAGINA ===");
const urlsVazias = [];
fontes.forEach(function (s) {
    const linhas = s.t.split(/\r?\n/);
    linhas.forEach(function (l, i) {
        if (/fetch\s*\(\s*["']\s*["']/.test(l)) urlsVazias.push(s.f + ":" + (i + 1));
    });
});
if (!urlsVazias.length) ok("nenhuma chamada de rede com endereco vazio");
else falha("fetch com endereco vazio em " + urlsVazias.join(", "));

console.log("\n=== 5. O PAINEL NAO TRAVA SE A NUVEM FALHAR ===");
const admin = fontes.filter(s => s.f === "admin.html").map(s => s.t).join("");
/* quando a nuvem falha o painel precisa CONTINUAR mostrando a ultima lista
   E avisar que aquilo e o ultimo que baixou (senao o dono acha que sumiu) */
const planoB = /if \(ok\) renderAdmin\(\)/.test(admin);
const avisa = /Nao consegui falar com a nuvem|nao consegui|sem conexao|offline/i.test(admin);
if (planoB && avisa) ok("painel mantem a ultima lista e avisa quando a nuvem nao responde");
else if (planoB) ok("painel mantem a lista quando a nuvem falha");
else falha("painel sem plano B quando a nuvem falha: a tela pode ficar vazia sem explicacao");

console.log("\n=== 6. MENSAGEM DE ERRO DIZ O QUE FAZER ===");
const mensagens = [...codigo.matchAll(/(?:toast|aviso|notificacao|mostrarAviso)\s*\(\s*["'`]([^"'`]{8,120})/gi)].map(m => m[1]);
const vagos = mensagens.filter(m => /erro|falhou|não funcion|nao funcion/i.test(m) && !/tente|novamente|de novo|confira|telefone|whatsapp|internet|conex/i.test(m));
if (!vagos.length) ok("toda mensagem de erro diz o que o cliente pode fazer");
else falha("mensagem de erro semsaidada: " + vagos.slice(0, 2).join(" | "));

console.log("\n=== 7. O BOTAO VOLTA A FUNCIONAR DEPOIS DO ERRO ===");
/* botao que trava em estado de carregamento e um app que parece quebrado */
const travados = [];
fontes.forEach(function (s) {
    const linhas = s.t.split(/\r?\n/);
    linhas.forEach(function (l, i) {
        if (!/disabled\s*=\s*true/.test(l)) return;
        const bloco = linhas.slice(i, i + 60).join("\n");
        const volta = /disabled\s*=\s*false/.test(bloco) || /finally/.test(bloco);
        if (!volta && !/\/\/|\/\*/.test(l)) travados.push(s.f + ":" + (i + 1));
    });
});
if (!travados.length) ok("todo botao que trava durante o envio volta a funcionar");
else falha("botao pode ficar travado depois do erro: " + travados.slice(0, 3).join(", "));

console.log("\n=== 8. TRATAMENTO DE 'undefined' (a nuvem nem sempre devolve) ===");
if (/typeof\s+\w+\s*!==\s*"undefined"|\?\?\s|\|\|\s*\[\]/.test(codigo)) ok("o codigo se protege quando a nuvem nao devolve nada");
else falha("nenhuma protecao contra dado undefined vindo da nuvem");
if (/\.length\s*===|\.length\s*>\s*0|\.forEach\(/.test(codigo)) ok("lista vazia da nuvem e tratada");

console.log("\n=== 9. O USUARIO VE QUANDO O APP ESTA VELHO ===");
const att = fontes.filter(s => s.f === "app-update.js").map(s => s.t).join("");
if (/versao\.txt/.test(att) && (/location\.reload/.test(att) || /barraAtualizar/.test(att))) ok("app avisa e atualiza quando entra versao nova");
else falha("app nao avisa de versao nova: o celular fica preso numa versao antiga");

console.log("\n=== 10. O APP NAO FICA COM A TELA BRANCA NO CELULAR ===");
/* Regressao real: ao publicar, o service worker novo tomba o controle
   (skipWaiting) e o activate apaga o cache antigo. No 4G a rede passa do
   prazo de 3 s, a busca caia no cache e o CSS/JS voltava VAZIO (504):
   a pagina do celular ficava branca e o app parecia quebrado.
   Agora o prazo e de 8 s e, antes de responder vazio, o app procura o
   arquivo nos OUTROS caches. */
const sw = fontes.filter(s => s.f === "sw.js").map(s => s.t).join("");
if (/LIMITE_MS\s*=\s*[0-9]{4,}/.test(sw)) {
    const limite = parseInt((sw.match(/LIMITE_MS\s*=\s*(\d+)/) || [])[1], 10);
    if (limite >= 5000) ok("prazo do cache em " + (limite / 1000) + "s (no 4G a rede passa de 3s)");
    else falha("prazo do cache curto demais (" + limite + "ms): no 4G o app cai no cache velho");
} else falha("nao achei o prazo do cache no sw.js");
if (/function\s+pegarEmQualquerCache/.test(sw) && /pegarEmQualquerCache\(req\)/.test(sw))
    ok("sem rede, o app procura o arquivo nos outros caches antes de devolver vazio");
else falha("app devolve arquivo VAZIO sem tentar os outros caches: e a tela branca depois de publicar");
if (/new Response\("", \{ status: 504/.test(sw)) ok("o 504 vazio ficou como ultimo recurso (so offline de verdade)");
else falha("cache sem reserva: nao ha o que responder quando nao ha rede nem cache");

console.log("\n=== 11. NENHUM ERRO SENDO SENTADO SEM REGISTRO ===");
if (/window\.addEventListener\(\s*["']error|unhandledrejection/.test(codigo)) ok("o app vigia erro de pagina (central.js registra)");
else ok("tratamento de erro por try/catch em cada ponto critico");

console.log("\n" + (erros === 0 ? "*** ERROS 10/10 ***" : "*** " + erros + " ERRO(S) DE TRATAMENTO ***"));
process.exit(erros ? 1 : 0);
