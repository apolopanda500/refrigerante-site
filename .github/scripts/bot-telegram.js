/* ============================================
   BOT DO TELEGRAM 24/7 (roda no GitHub Actions)
   --------------------------------------------
   O painel (admin.html) so processava os toques e
   comandos ENQUANTO estava aberto. Este robo faz o
   mesmo, mas no servidor, a cada ~5 minutos:

   1) le o Telegram (getUpdates);
   2) aplica o status no pedido gravado no Firebase
      (/pedidos/<id>.json) - o painel baixa e ve;
   3) responde no chat (edita a mensagem, confirma);
   4) guarda o offset no Firebase (/bot/offset.json)
      para nao repetir o mesmo toque.

   O cliente NAO usa este robo: so o dono (chat fixo).
   ============================================ */
"use strict";

const BASE  = process.env.FB_URL   || "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com";
/* O TOKEN NAO VAI AQUI. O repositorio e PUBLICO: com o token escrito no
   arquivo, qualquer pessoa da internet le o bot do dono, ve os pedidos
   que chegam nele (nome, telefone, endereco) e ainda consegue mandar
   mensagem como se fosse o robo. O token vive no segredo do GitHub
   (Settings > Secrets > TG_TOKEN) e para ai. */
const TOKEN = (process.env.TG_TOKEN || "").trim();
if (!TOKEN) {
    /* Sai sem falhar de proposito: o rob roda a cada 5 minutos e um erro a
       cada 5 minutos cansa. Mas o aviso precisa ser IMPOSSIVEL de ignorar,
       porque sem token o dono simplesmente nao recebe aviso de venda. */
    console.error("");
    console.error("==================================================================");
    console.error("  O ROBO DO TELEGRAM ESTA PARADO: falta o segredo TG_TOKEN");
    console.error("  Ele nao le, nao responde e nao avisa venda nenhuma.");
    console.error("  Arrume em: Settings > Secrets > Actions > New repository secret");
    console.error("      Name:   TG_TOKEN");
    console.error("      Secret: o token que o BotFather mostra em /mybots");
    console.error("==================================================================");
    console.error("");
    process.exit(0);
}
const CHAT  = String(process.env.TG_CHAT || "1810807613");
const OFFSET_PATH = "/bot/offset.json";
const PAINEL_URL  = "https://convencao-site.rickjax123.workers.dev/admin.html";

const STATUS_LABEL = {
    aguardando: "Aguardando confirmação",
    confirmado: "Confirmado",
    separacao: "Em separação",
    enviado: "Saiu para entrega",
    entregue: "Entregue",
    cancelado: "Cancelado"
};
const STATUS_CMD = {
    confirmar: "confirmado", confirmado: "confirmado",
    separacao: "separacao", separar: "separacao",
    enviado: "enviado", enviar: "enviado",
    entregue: "entregue", entregar: "entregue",
    cancelar: "cancelado", cancelado: "cancelado",
    reabrir: "aguardando"
};

const COMANDOS = [
    { command: "confirmar", description: "Confirmar pedido: /confirmar CV20261016-001" },
    { command: "separacao", description: "Em separação: /separacao CV20261016-001" },
    { command: "enviado",  description: "Saiu para entrega: /enviado CV20261016-001" },
    { command: "entregue", description: "Entregue: /entregue CV20261016-001" },
    { command: "cancelar", description: "Cancelar pedido: /cancelar CV20261016-001" },
    { command: "reabrir",  description: "Voltar para aguardando: /reabrir CV20261016-001" },
    { command: "status",   description: "Ver um pedido: /status CV20261016-001" },
    { command: "buscar",   description: "Achar por nome, telefone ou bairro: /buscar Japeri" },
    { command: "ultimos",  description: "Ver os últimos pedidos" },
    { command: "hoje",     description: "Resumo dos pedidos de hoje" },
    { command: "ajuda",    description: "Ver a lista de comandos" }
];

/* ---------- utilidades de texto/número (iguais ao site) ---------- */
function formatBRL(n) {
    const v = parseFloat(n);
    if (isNaN(v) || !isFinite(v)) return "R$ 0,00";
    const partes = Math.abs(v).toFixed(2).split(".");
    let inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "R$ " + (v < 0 ? "-" : "") + inteiro + "," + partes[1];
}
function dataHoraSegundos(ts) {
    const d = new Date(ts || Date.now());
    const p = (n) => ("0" + n).slice(-2);
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear()
        + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
function soDigitos(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function rotulo(st) { return STATUS_LABEL[st] || st; }

/* ---------- Telegram ---------- */
function tg(metodo, params) {
    const url = "https://api.telegram.org/bot" + TOKEN + "/" + metodo;
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params || {})
    }).then((r) => r.json()).then((j) => {
        if (!j || !j.ok) throw new Error((j && j.description) || "erro na API");
        return j.result;
    });
}
function responder(cb, texto) {
    return tg("answerCallbackQuery", { callback_query_id: cb.id, text: texto }).catch(() => {});
}
function enviar(texto) {
    return tg("sendMessage", { chat_id: CHAT, text: texto, disable_web_page_preview: true }).catch(() => {});
}

/* ---------- Firebase Realtime Database ----------
   MODO GATEWAY (o banco fechado): com GATEWAY_URL e BOT_SEGREDO no
   GitHub, o robo passa a falar com o gateway, que e o unico que
   tem permissao no banco. Sem essas variaveis, ele continua no
   caminho antigo (banco aberto) - que e o botao de voltar.

   O gateway ja entrega tudo que o robo precisa em uma chamada:
   GET /api/bot devolve {pedidos, offset}; POST /api/bot grava o
   offset e o pedido inteiro (o robo muda o status localmente e
   devolve o pedido, como sempre fez). */
const GATEWAY = (process.env.GATEWAY_URL || "").trim().replace(/\/+$/, "");
const BOT_SEGREDO = (process.env.BOT_SEGREDO || "").trim();
const VIA_GATEWAY = Boolean(GATEWAY && BOT_SEGREDO);
const CAB_BOT = { "Content-Type": "application/json", "X-Bot-Segredo": BOT_SEGREDO };

function gatewayGet() {
    return fetch(GATEWAY + "/api/bot?t=" + Date.now(), { cache: "no-store", headers: CAB_BOT })
        .then((r) => {
            if (r.status === 403) throw new Error("o gateway nao aceitou o segredo do robo (BOT_SEGREDO)");
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        });
}
function gatewayGravar(valores) {
    /* valores = {offset?, pedido?} */
    return fetch(GATEWAY + "/api/bot", { method: "POST", headers: CAB_BOT, body: JSON.stringify(valores) })
        .then((r) => {
            if (r.status === 403) throw new Error("o gateway nao aceitou o segredo do robo (BOT_SEGREDO)");
            if (!r.ok) throw new Error("HTTP " + r.status);
        });
}

function fbGet(path) {
    if (VIA_GATEWAY) return gatewayGet().then((d) => {
        d = d || {};
        /* /api/bot devolve {pedidos, offset} - sem a barra do caminho */
        if (/^\/pedidos\.json$/.test(path)) return d.pedidos || null;
        if (/offset/.test(path)) return (d.offset === undefined ? null : d.offset);
        return null;
    });
    return fetch(BASE + path + "?t=" + Date.now(), { cache: "no-store" })
        .then((r) => r.text())
        .then((t) => { try { return JSON.parse(t); } catch (e) { return null; } });
}
function fbPut(path, valor) {
    if (VIA_GATEWAY) {
        if (/\/pedidos\//.test(path)) {
            return gatewayGravar({ pedido: valor }).then(function () { return fbGet("/pedidos.json"); });
        }
        if (/\/bot\/offset\.json/.test(path)) return gatewayGravar({ offset: valor });
    }
    return fetch(BASE + path, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valor)
    }).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); });
}

/* ---------- pedidos ---------- */
function todosPedidos() {
    return fbGet("/pedidos.json").then((m) => {
        if (!m || typeof m !== "object") return [];
        return Object.keys(m).map((k) => m[k]).filter((p) => p && p.id);
    });
}
function acharPedido(termo) {
    const t = soDigitos(termo);
    if (!t) return Promise.resolve(null);
    return todosPedidos().then((lista) => {
        const exato = lista.find((p) => soDigitos(p.id) === t);
        if (exato) return exato;
        return lista.find((p) => soDigitos(p.id).indexOf(t) >= 0) || null;
    });
}
function gravarPedido(p) {
    return fbPut("/pedidos/" + encodeURIComponent(p.id) + ".json", p);
}
function aplicarStatus(p, novo) {
    const agora = Date.now();
    p.status = novo;
    p.historico = Array.isArray(p.historico) ? p.historico : [];
    p.historico.push({ status: novo, quando: agora });
    return gravarPedido(p).then(() => p);
}

/* ---------- texto e botoes da mensagem ---------- */
function mensagemPedido(p) {
    let itens = "";
    (p.itens || []).forEach((i) => { itens += "\n  - " + i.name + " x" + i.qty + " = " + formatBRL(i.subtotal); });
    if (itens.length > 900) itens = itens.slice(0, 900) + "\n  ...(demais itens no painel)";
    const cab = (p.status === "aguardando" ? "NOVO PEDIDO " : "PEDIDO ") + p.id;
    let msg = cab + "\n"
        + "\nCliente: " + (p.nome || "-")
        + (p.cpf ? "\nCPF: " + p.cpf : "")
        + "\nWhatsApp: " + (p.tel || "-")
        + "\nRecebido em: " + dataHoraSegundos(p.criadoEm)
        + "\nEndereco: " + (p.end || "-") + (p.comp ? " (" + p.comp + ")" : "") + " - " + (p.bairro || "-")
        + "\nRegiao: " + (p.regiao || "-")
        + "\nPagamento: " + (p.pagamento || "-") + (p.pagamento === "Dinheiro" && p.troco ? " (troco para " + p.troco + ")" : "")
        + "\nFrete: " + (p.frete === 0 ? "GRATIS" : formatBRL(p.frete))
        + "\n\nItens:" + itens
        + "\n\nTOTAL: " + formatBRL(p.total)
        + "\n\nStatus: " + rotulo(p.status);
    if (msg.length > 3500) msg = msg.slice(0, 3450) + "\n...(veja o pedido completo no painel)";
    return msg;
}
function tecladoPedido(id) {
    return {
        inline_keyboard: [
            [ { text: "✅ Confirmar", callback_data: "st|" + id + "|confirmado" },
              { text: "📦 Em separação", callback_data: "st|" + id + "|separacao" } ],
            [ { text: "🚚 Saiu p/ entrega", callback_data: "st|" + id + "|enviado" },
              { text: "🏁 Entregue", callback_data: "st|" + id + "|entregue" } ],
            [ { text: "✏️ Editar", callback_data: "ed|" + id },
              { text: "↩️ Reabrir", callback_data: "rb|" + id } ],
            [ { text: "❌ Cancelar", callback_data: "st|" + id + "|cancelado" } ],
            [ { text: "🖥️ Abrir painel", url: PAINEL_URL } ]
        ]
    };
}
/* ---------- aviso de pedido novo ----------
   O cliente pode estar sem token no aparelho (o token vive no segredo do
   GitHub). Por isso quem avisa e ESTE robo: ele ve os pedidos que chegaram
   na nuvem e ainda nao foram avisados (campo tgAviso). */
async function avisarPedidosNovos() {
    let lista = [];
    try { lista = await todosPedidos(); } catch (e) { return; }
    const limiteIdade = Date.now() - 24 * 3600 * 1000;
    const pendentes = lista
        .filter((p) => p && p.id && p.status === "aguardando" && !p.tgAviso
            && Number(p.criadoEm || 0) >= limiteIdade)
        .sort((a, b) => Number(a.criadoEm || 0) - Number(b.criadoEm || 0))
        .slice(0, 10);                       /* no maximo 10 por rodada */

    for (const p of pendentes) {
        try {
            await tg("sendMessage", {
                chat_id: CHAT,
                text: mensagemPedido(p) + "\n\nToque nos botoes ou digite /status " + p.id,
                disable_web_page_preview: true,
                reply_markup: JSON.stringify(tecladoPedido(p.id))
            });
            p.tgAviso = Date.now();
            await gravarPedido(p);
        } catch (e) {
            console.log("aviso de pedido novo falhou: " + e.message);
            break;
        }
    }
}

function editarMensagemPedido(chatId, msgId, p) {
    return tg("editMessageText", {
        chat_id: chatId, message_id: msgId,
        text: mensagemPedido(p) + "\n\nToque nos botoes ou digite /status " + p.id,
        disable_web_page_preview: true,
        reply_markup: JSON.stringify(tecladoPedido(p.id))
    }).catch(() => {});
}

/* ---------- ajuda / listagens ---------- */
function textoAjuda() {
    return "COMANDOS DO BOT\n\n"
        + "/confirmar <id>  - confirma o pedido\n"
        + "/separacao <id>  - em separação\n"
        + "/enviado <id>    - saiu para entrega\n"
        + "/entregue <id>   - entregue\n"
        + "/cancelar <id>   - cancela\n"
        + "/reabrir <id>    - volta para aguardando\n"
        + "/status <id>     - mostra o pedido\n"
        + "/buscar <termo>  - acha por nome, telefone ou bairro\n"
        + "/ultimos         - últimos pedidos\n"
        + "/hoje            - resumo de hoje\n\n"
        + "Ou simplesmente toque nos botoes da mensagem do pedido.";
}
function textoStatus(p) {
    return mensagemPedido(p);
}
function textoBuscar(lista) {
    if (!lista.length) return "Nenhum pedido encontrado.";
    let h = "PEDIDOS ENCONTRADOS (" + lista.length + ")\n";
    lista.slice(0, 10).forEach((p) => {
        h += "\n" + p.id + " - " + (p.nome || "-") + " - " + rotulo(p.status) + " - " + formatBRL(p.total);
    });
    if (lista.length > 10) h += "\n\n(mostrando 10 de " + lista.length + ")";
    return h;
}
function textoUltimos(lista) {
    if (!lista.length) return "Nenhum pedido ainda.";
    let h = "ULTIMOS PEDIDOS\n";
    lista.slice(-10).reverse().forEach((p) => {
        h += "\n" + p.id + " - " + (p.nome || "-") + " - " + rotulo(p.status) + " - " + formatBRL(p.total);
    });
    return h;
}
function textoHoje(lista) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const doDia = lista.filter((p) => (p.criadoEm || 0) >= hoje.getTime());
    const abertos = doDia.filter((p) => p.status === "aguardando").length;
    const fat = doDia.filter((p) => p.status !== "cancelado").reduce((t, p) => t + (p.total || 0), 0);
    return "PEDIDOS DE HOJE\n\nTotal: " + doDia.length + " pedido(s)"
        + "\nAguardando: " + abertos
        + "\nFaturamento: " + formatBRL(fat);
}

/* ---------- autorizacao: so o dono ---------- */
function doDono(quem) {
    const id = String((quem && (quem.id || (quem.chat && quem.chat.id))) || "");
    if (id && id === CHAT) return true;
    const user = String((quem && quem.username) || "").toLowerCase();
    const alvo = CHAT.replace(/^@/, "").toLowerCase();
    return !!user && !!alvo && user === alvo;
}

/* ---------- botoes ---------- */
function tratarBotao(cb) {
    if (!doDono(cb.from) && !doDono(cb.message && cb.message.chat)) {
        return responder(cb, "Nao autorizado");
    }
    const partes = String(cb.data || "").split("|");
    const acao = partes[0];
    const chatId = cb.message && cb.message.chat && cb.message.chat.id;
    const msgId  = cb.message && cb.message.message_id;

    if (acao === "ed") {
        return responder(cb, "Abrindo editor").then(() => enviar(
            "Para corrigir, digite:\n/editar " + partes[1] + " <campo> <valor>\n\nCampos: nome, telefone, cpf, end, bairro, comp, regiao, pagamento, troco, observacao"));
    }
    if (acao === "rb") {
        return acharPedido(partes[1]).then((p) => {
            if (!p) return responder(cb, "Pedido nao encontrado").then(() => enviar("Pedido " + partes[1] + " nao encontrado na nuvem."));
            return aplicarStatus(p, "aguardando").then((novo) => {
                responder(cb, "Voltou para aguardando");
                if (chatId && msgId) editarMensagemPedido(chatId, msgId, novo);
                return novo;
            });
        });
    }
    if (partes.length < 3 || acao !== "st") return responder(cb, null);

    const st = partes[2];
    return acharPedido(partes[1]).then((p) => {
        if (!p) return responder(cb, "Pedido nao encontrado").then(() => enviar("Pedido " + partes[1] + " nao encontrado na nuvem."));
        return aplicarStatus(p, st).then((novo) => {
            responder(cb, "Status: " + rotulo(st));
            if (chatId && msgId) editarMensagemPedido(chatId, msgId, novo);
            return novo;
        });
    });
}

/* ---------- texto/comandos ---------- */
function tratarMensagem(msg) {
    if (!doDono(msg.from) && !doDono(msg.chat)) return Promise.resolve();
    const texto = String(msg.text || "").trim();
    if (!texto) return Promise.resolve();
    const m = texto.match(/^\/([a-zA-Z]+)\s*(.*)$/);
    if (!m) return Promise.resolve();
    const cmd = m[1].toLowerCase();
    const arg = (m[2] || "").trim();

    if (cmd === "ajuda" || cmd === "start") return enviar(textoAjuda());

    if (cmd === "ultimos") return todosPedidos().then((l) => enviar(textoUltimos(l)));
    if (cmd === "hoje")    return todosPedidos().then((l) => enviar(textoHoje(l)));

    if (cmd === "buscar") {
        const t = soDigitos(arg).toLowerCase();
        const bruto = arg.toLowerCase();
        return todosPedidos().then((l) => {
            const achados = l.filter((p) => {
                if (!t && !bruto) return false;
                return soDigitos(p.id).toLowerCase().indexOf(t) >= 0
                    || soDigitos(p.tel).toLowerCase().indexOf(t) >= 0
                    || String(p.nome || "").toLowerCase().indexOf(bruto) >= 0
                    || String(p.bairro || "").toLowerCase().indexOf(bruto) >= 0;
            });
            return enviar(textoBuscar(achados));
        });
    }

    if (cmd === "status") {
        return acharPedido(arg).then((p) => enviar(p ? textoStatus(p) : "Pedido " + arg + " nao encontrado na nuvem."));
    }

    if (cmd === "editar") {
        const partes = arg.split(/\s+/);
        const id = partes.shift();
        const campo = (partes.shift() || "").toLowerCase();
        const valor = partes.join(" ").trim();
        const CAMPOS = ["nome", "telefone", "cpf", "end", "bairro", "comp", "regiao", "pagamento", "troco", "observacao"];
        if (!id || !campo || !valor || CAMPOS.indexOf(campo) < 0) {
            return enviar("Use: /editar <id> <campo> <valor>\nCampos: " + CAMPOS.join(", "));
        }
        const mapa = { nome: "nome", telefone: "tel", cpf: "cpf", end: "end", bairro: "bairro",
                       comp: "comp", regiao: "regiao", pagamento: "pagamento", troco: "troco", observacao: "observacao" };
        return acharPedido(id).then((p) => {
            if (!p) return enviar("Pedido " + id + " nao encontrado na nuvem.");
            p[mapa[campo]] = valor;
            return gravarPedido(p).then(() => enviar("Pedido " + p.id + " atualizado: " + campo + " = " + valor));
        });
    }

    if (STATUS_CMD[cmd]) {
        return acharPedido(arg).then((p) => {
            if (!p) return enviar("Pedido " + arg + " nao encontrado na nuvem.");
            return aplicarStatus(p, STATUS_CMD[cmd]).then((novo) =>
                enviar("Pedido " + novo.id + " atualizado: " + rotulo(novo.status)
                    + "\nCliente: " + (novo.nome || "-") + " - " + formatBRL(novo.total)));
        });
    }

    return enviar("Nao entendi. Digite /ajuda para ver os comandos.");
}

/* ---------- loop principal (uma rodada) ---------- */
async function rodar() {
    try {
        const me = await tg("getMe");
        console.log("Bot ligado: @" + me.username + " (id " + me.id + ")");
    } catch (e) {
        console.log("aviso: nao consegui identificar o bot: " + e.message);
    }
    try { await tg("setMyCommands", { commands: JSON.stringify(COMANDOS) }); }
    catch (e) { console.log("aviso: nao registrei o menu de comandos: " + e.message); }

    let offset = 0;
    try { offset = Number(await fbGet(OFFSET_PATH)) || 0; } catch (e) { offset = 0; }

    let updates = [];
    try {
        updates = await tg("getUpdates", { offset: offset || undefined, timeout: 0, limit: 50 }) || [];
    } catch (e) {
        console.log("falha no getUpdates: " + e.message);
        return;
    }

    let novoOffset = offset;
    for (const u of updates) {
        if (u.update_id >= novoOffset) novoOffset = u.update_id + 1;
        try {
            if (u.callback_query) await tratarBotao(u.callback_query);
            else if (u.message) await tratarMensagem(u.message);
        } catch (e) { console.log("erro ao tratar atualizacao: " + e.message); }
    }

    /* avisa no chat do dono os pedidos que chegaram desde a ultima rodada */
    try { await avisarPedidosNovos(); }
    catch (e) { console.log("aviso: nao avisei pedidos novos: " + e.message); }

    if (novoOffset !== offset) {
        try { await fbPut(OFFSET_PATH, novoOffset); } catch (e) { console.log("aviso: nao guardei o offset: " + e.message); }
    }
    console.log("OK - " + updates.length + " atualizacao(oes), offset " + offset + " -> " + novoOffset);
}

rodar().catch((e) => { console.log("erro geral: " + e.message); process.exitCode = 1; });
