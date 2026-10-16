"use strict";

var TOKEN = process.env.TG_TOKEN_CLIENTES || "";
var CHAT_ID_CLIENTE = process.env.TG_CHAT_CLIENTES || "";

var COMANDOS = [
    { command: "start", description: "Iniciar o bot" },
    { command: "ajuda", description: "Lista de comandos" },
    { command: "meuspedidos", description: "Ver meus pedidos" },
    { command: "status", description: "Status de um pedido: /status CV20261016-001" },
    { command: "telefone", description: "Cadastrar WhatsApp: /telefone 21999999999" }
];

function tg(metodo, params) {
    if (!TOKEN) return Promise.reject(new Error("TOKEN não configurado"));
    var url = "https://api.telegram.org/bot" + TOKEN + "/" + metodo;
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function (e) { console.log("Erro Telegram:", e.message); return null; });
}

function fbGet(caminho) {
    var url = "https://refrigerantes-convencao-default-rtdb.firebaseio.com/" + caminho + ".json";
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function (e) { console.log("Erro FB GET:", e.message); return null; });
}

function fbPut(caminho, dados) {
    var url = "https://refrigerantes-convencao-default-rtdb.firebaseio.com/" + caminho + ".json";
    return fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function (e) { console.log("Erro FB PUT:", e.message); return null; });
}

function formatBRL(n) {
    var v = parseFloat(n);
    if (isNaN(v)) return "R$ 0,00";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHoraSegundos(ts) {
    var d = new Date(ts || Date.now());
    var p = function (n) { return ("0" + n).slice(-2); };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear()
        + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function textoStart() {
    return (
        "🤖 *Bem-vindo ao Refrigerantes Convenção!*\n\n" +
        "Sou o bot da loja. Posso te ajudar com:\n\n" +
        "• /meuspedidos - Ver seus pedidos\n" +
        "• /status <ID> - Status de um pedido\n" +
        "• /telefone <número> - Cadastrar seu WhatsApp\n" +
        "• /ajuda - Lista de comandos\n\n" +
        "Exemplo: /status CV20261016-001"
    );
}

function textoAjuda() {
    return (
        "🤖 *Comandos disponíveis:*\n\n" +
        "• /start - Iniciar o bot\n" +
        "• /ajuda - Lista de comandos\n" +
        "• /meuspedidos - Ver meus pedidos\n" +
        "• /status <ID> - Status de um pedido\n" +
        "• /telefone <número> - Cadastrar WhatsApp\n\n" +
        "Exemplo: /status CV20261016-001"
    );
}

function textoStatus(p) {
    var STATUS_LABEL = {
        aguardando: "⏳ Aguardando confirmação",
        confirmado: "✅ Confirmado",
        separacao: "📦 Em separação",
        enviado: "🚚 Saiu para entrega",
        entregue: "✅ Entregue",
        cancelado: "❌ Cancelado"
    };
    var status = STATUS_LABEL[p.status] || p.status;
    return (
        "📦 *Pedido " + p.id + "*\n" +
        "Status: " + status + "\n" +
        "Data: " + dataHoraSegundos(p.criadoEm) + "\n" +
        "Total: " + formatBRL(p.total) + "\n"
    );
}

function textoMeusPedidos(pedidos) {
    if (!pedidos || pedidos.length === 0) {
        return "📭 Você não tem pedidos cadastrados.";
    }
    var texto = "📋 *Seus Pedidos:*\n\n";
    pedidos.slice(0, 5).forEach(function (p) {
        texto += "• " + p.id + " - " + p.status + " - " + formatBRL(p.total) + "\n";
    });
    texto += "\nPara detalhes: /status <ID do pedido>";
    return texto;
}

function buscarPedidosPorTelefone(tel) {
    var telLimpo = String(tel).replace(/\D/g, "");
    return fbGet("/pedidos.json").then(function (dados) {
        if (!dados || typeof dados !== "object") return [];
        var pedidos = Object.keys(dados).map(function (k) {
            var p = dados[k];
            p.id = k;
            return p;
        }).filter(function (p) {
            var pTel = String(p.tel || "").replace(/\D/g, "");
            return pTel === telLimpo;
        }).sort(function (a, b) {
            return (b.criadoEm || 0) - (a.criadoEm || 0);
        });
        return pedidos;
    });
}

/* ---------- Tratar mensagens ---------- */
function tratarMensagem(m) {
    var texto = String(m.text || "").trim();
    var chatId = m.chat.id;
function textoConfirmado(p) {
    return (
        "✅ *Pedido Confirmado!*\n" +
        "Pedido: " + p.id + "\n" +
        "Cliente: " + (p.nome || "Cliente") + "\n" +
        "Total: " + formatBRL(p.total) + "\n" +
        "Status: Confirmado\n" +
        "Aguardando separação..."
    );
}

function textoEnviado(p) {
    return (
        "🚚 *Pedido Enviado!*\n" +
        "Pedido: " + p.id + "\n" +
        "Cliente: " + (p.nome || "Cliente") + "\n" +
        "Total: " + formatBRL(p.total) + "\n" +
        "Status: Saiu para entrega\n" +
        "Aguardando entrega..."
    );
}

function textoEntregue(p) {
    return (
        "✅ *Pedido Entregue!*\n" +
        "Pedido: " + p.id + "\n" +
        "Cliente: " + (p.nome || "Cliente") + "\n" +
        "Total: " + formatBRL(p.total) + "\n" +
        "Status: Entregue\n" +
        "Obrigado pela preferência!"
    );
}

function textoCancelado(p) {
    return (
        "❌ *Pedido Cancelado*\n" +
        "Pedido: " + p.id + "\n" +
        "Cliente: " + (p.nome || "Cliente") + "\n" +
        "Status: Cancelado\n" +
        "Entre em contato para mais informações."
    );
}

    var nome = m.chat.first_name || "Cliente";
    var tel = m.text ? String(m.text).replace(/\D/g, "") : "";

    if (!texto) return Promise.resolve();

    // Comando /start
    if (texto === "/start") {
        return tg("sendMessage", {
            chat_id: chatId,
            text: textoStart(),
            parse_mode: "Markdown"
        });
    }

    // Comando /ajuda
    if (texto === "/ajuda") {
        return tg("sendMessage", {
            chat_id: chatId,
            text: textoAjuda(),
            parse_mode: "Markdown"
        });
    }

    // Comando /telefone
    if (texto.startsWith("/telefone")) {
        var partes = texto.split(/\s+/);
        var telDigitado = partes[1] || "";
        if (!telDigitado) {
            return tg("sendMessage", {
                chat_id: chatId,
                text: "❌ Use: /telefone 21999999999\nExemplo: /telefone 21999999999",
                parse_mode: "Markdown"
            });
        }
        // Salvar telefone associado ao chat ID
        return fbGet("/clientes/" + chatId + ".json").then(function (dados) {
            var cliente = dados || {};
            cliente.tel = telDigitado;
            cliente.nome = m.chat.first_name || "";
            cliente.username = m.chat.username || "";
            cliente.atualizadoEm = Date.now();
            return fbPut("/clientes/" + chatId + ".json", cliente).then(function () {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "✅ WhatsApp cadastrado: " + telDigitado + "\n\nUse /meuspedidos para ver seus pedidos.",
                    parse_mode: "Markdown"
                });
            });
        });
    }

    // Comando /meuspedidos
    if (texto === "/meuspedidos") {
        // Primeiro tentar pegar telefone cadastrado
        return fbGet("/clientes/" + chatId + ".json").then(function (dados) {
            var telSalvo = dados && dados.tel ? String(dados.tel).replace(/\D/g, "") : "";
            var telParaBuscar = telSalvo || tel;
            if (!telParaBuscar) {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "❌ Você não tem WhatsApp cadastrado.\n\nUse: /telefone 21999999999\nDepois use /meuspedidos para ver seus pedidos.",
                    parse_mode: "Markdown"
                });
            }
            return buscarPedidosPorTelefone(telParaBuscar).then(function (pedidos) {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: textoMeusPedidos(pedidos),
                    parse_mode: "Markdown"
                });
            });
        });
    }

    // Comando /status <ID>
    if (texto.startsWith("/status")) {
        var partes = texto.split(/\s+/);
        var idPedido = partes[1] || "";
        if (!idPedido) {
            return tg("sendMessage", {
                chat_id: chatId,
                text: "❌ Use: /status CV20261016-001\nExemplo: /status CV20261016-001",
                parse_mode: "Markdown"
            });
        }
        return fbGet("/pedidos.json").then(function (dados) {
            if (!dados || typeof dados !== "object") {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "❌ Não foi possível carregar os pedidos. Tente novamente.",
                    parse_mode: "Markdown"
                });
            }
            var pedido = Object.keys(dados).map(function (k) {
                var p = dados[k];
                p.id = k;
                return p;
            }).find(function (p) {
                return p.id === idPedido;
            });
            if (!pedido) {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "❌ Pedido '" + idPedido + "' não encontrado.\nVerifique o ID e tente novamente.",
                    parse_mode: "Markdown"
                });
            }
            return tg("sendMessage", {
                chat_id: chatId,
                text: textoStatus(pedido),
                parse_mode: "Markdown"
            });
        });
    }

    // Comando não reconhecido
    return tg("sendMessage", {
        chat_id: chatId,
        text: "❓ Comando não reconhecido.\nUse /ajuda para ver os comandos disponíveis.",
        parse_mode: "Markdown"
    });
}

/* ---------- Loop principal ---------- */
async function rodar() {
    try {
        await tg("setMyCommands", { commands: JSON.stringify(COMANDOS) });
    } catch (e) {
        console.log("aviso: não registrei o menu de comandos: " + e.message);
    }

    let offset = 0;
    try {
        offset = Number(await fbGet("/bot_clientes/offset.json")) || 0;
    } catch (e) { offset = 0; }

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
            if (u.message) await tratarMensagem(u.message);
        } catch (e) { console.log("erro ao tratar atualização: " + e.message); }
    }

    if (novoOffset !== offset) {
        try { await fbPut("/bot_clientes/offset.json", novoOffset); } catch (e) { console.log("aviso: não guardei o offset: " + e.message); }
    }
    console.log("OK - " + updates.length + " atualização(ões), offset " + offset + " -> " + novoOffset);
}

rodar().catch((e) => { console.log("erro geral: " + e.message); process.exitCode = 1; });
/* ---------- Montar mensagens ---------- */
function STATUS_LABEL_MAP() {
    return {
        aguardando: "⏳ Aguardando confirmação",
        confirmado: "✅ Confirmado",
        separacao: "📦 Em separação",
        enviado: "🚚 Saiu para entrega",
        entregue: "✅ Entregue",
        cancelado: "❌ Cancelado"
    };
}

function textoStatus(p) {
    var STATUS_LABEL = STATUS_LABEL_MAP();
    var status = STATUS_LABEL[p.status] || p.status;
    var itens = (p.itens || []).map(function (i) {
        return "• " + i.nm + " x" + i.qtd + " = " + formatBRL(i.pr * i.qtd);
    }).join("\n");
    return (
        "📦 *Pedido " + p.id + "*\n" +
        "Status: *" + status + "*\n" +
        "Data: " + dataHoraSegundos(p.criadoEm) + "\n" +
        "Total: *" + formatBRL(p.total) + "*\n" +
        "Itens:\n" + itens + "\n" +
        "Frete: " + formatBRL(p.frete || 0) + "\n" +
        "Região: " + (p.regiao || "Não informada") + "\n" +
        "WhatsApp: " + (p.tel || "Não informado")
    );
}

function textoMeusPedidos(pedidos) {
    if (!pedidos.length) {
        return "📭 Você não tem pedidos cadastrados.\n\nUse /start para ver os comandos disponíveis.";
    }
    var texto = "📋 *Seus Pedidos:*\n\n";
    pedidos.slice(0, 10).forEach(function (p) {
        var STATUS_LABEL = STATUS_LABEL_MAP();
        var status = STATUS_LABEL[p.status] || p.status;
        texto += "• *" + p.id + "* - " + status + "\n";
        texto += "  " + dataHoraSegundos(p.criadoEm) + " - " + formatBRL(p.total) + "\n\n";
    });
    texto += "\nPara detalhes de um pedido: /status <ID do pedido>";
    return texto;
}

function textoAjuda() {
    return (
        "🤖 *Bot do Refrigerantes Convenção*\n\n" +
        "Comandos disponíveis:\n" +
        "/start - Iniciar e ver comandos\n" +
        "/ajuda - Lista de comandos\n" +
        "/meuspedidos - Ver meus pedidos\n" +
        "/status <ID> - Status de um pedido\n" +
        "/telefone <número> - Registrar meu WhatsApp\n\n" +
        "Exemplo: /status CV20261016-001\n\n" +
        "📞 Precisa de ajuda? Entre em contato pelo WhatsApp da loja."
    );
}

function textoStart() {
    return (
        "👋 *Bem-vindo ao Refrigerantes Convenção!*\n\n" +
        "Sou o bot da loja. Posso te ajudar com:\n\n" +
        "• Ver seus pedidos\n" +
        "• Consultar status de entrega\n" +
        "• Cadastrar seu WhatsApp\n\n" +
        "Use /ajuda para ver todos os comandos."
    );
}
/* ============================================
   BOT DO TELEGRAM PARA CLIENTES - CONVENÇÃO
   Roda no GitHub Actions a cada 5 minutos
   ============================================ */
"use strict";

const BASE  = process.env.FB_URL   || "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com";
const TOKEN = process.env.TG_TOKEN_CLIENTES || "";
const CHAT  = String(process.env.TG_CHAT_CLIENTES || "");

/* Comandos do bot para clientes */
const COMANDOS = [
    { command: "start", description: "Iniciar o bot e ver comandos" },
    { command: "ajuda", description: "Lista de comandos disponíveis" },
    { command: "meuspedidos", description: "Ver meus pedidos recentes" },
    { command: "status", description: "Status de um pedido: /status CV20261016-001" },
    { command: "telefone", description: "Registrar meu WhatsApp: /telefone 21999999999" }
];

/* ---------- utilitários ---------- */
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

function soDigitos(s) {
    return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* ---------- Telegram API ---------- */
function tg(metodo, params) {
    const url = "https://api.telegram.org/bot" + TOKEN + "/" + metodo;
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
    }).then(function (r) { return r.ok ? r.json() : null; });
}

/* ---------- Firebase ---------- */
function fbGet(caminho) {
    const url = BASE + caminho + ".json";
    return fetch(url, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; });
}

function fbPut(caminho, dados) {
    const url = BASE + caminho + ".json";
    return fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    }).then(function (r) { return r.ok ? r.json() : null; });
}

/* ---------- Buscar pedidos por telefone ---------- */
function buscarPedidosPorTelefone(tel) {
    const telLimpo = String(tel).replace(/\D/g, "");
    return fbGet("/pedidos.json").then(function (dados) {
        if (!dados || typeof dados !== "object") return [];
        const pedidos = Object.keys(dados).map(function (k) {
            var p = dados[k];
            p.id = k;
            return p;
        }).filter(function (p) {
            var pTel = String(p.tel || "").replace(/\D/g, "");
            return pTel === telLimpo || pTel.endsWith(telLimpo);
        }).sort(function (a, b) {
            return (b.criadoEm || 0) - (a.criadoEm || 0);
        });
        return pedidos;
    });
}
/* ---------- Loop principal ---------- */
/* ---------- Tratar mensagens ---------- */
function tratarMensagem(m) {
    var texto = String(m.text || "").trim();
    var chatId = m.chat.id;
    var nome = m.chat.first_name || "Cliente";
    var tel = m.text ? String(m.text).replace(/\D/g, "") : "";

    if (!texto) return Promise.resolve();

    // Comando /start
    if (texto === "/start") {
        return tg("sendMessage", {
            chat_id: chatId,
            text: textoStart(),
            parse_mode: "Markdown"
        });
    }

    // Comando /ajuda
    if (texto === "/ajuda") {
        return tg("sendMessage", {
            chat_id: chatId,
            text: textoAjuda(),
            parse_mode: "Markdown"
        });
    }

    // Comando /telefone
    if (texto.startsWith("/telefone")) {
        var partes = texto.split(/\s+/);
        var telDigitado = partes[1] || "";
        if (!telDigitado) {
            return tg("sendMessage", {
                chat_id: chatId,
                text: "❌ Use: /telefone 21999999999\nExemplo: /telefone 21999999999",
                parse_mode: "Markdown"
            });
        }
        // Salvar telefone associado ao chat ID
        return fbGet("/clientes/" + chatId + ".json").then(function (dados) {
            var cliente = dados || {};
            cliente.tel = telDigitado;
            cliente.nome = m.chat.first_name || "";
            cliente.username = m.chat.username || "";
            cliente.atualizadoEm = Date.now();
            return fbPut("/clientes/" + chatId + ".json", cliente).then(function () {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "✅ WhatsApp cadastrado: " + telDigitado + "\n\nUse /meuspedidos para ver seus pedidos.",
                    parse_mode: "Markdown"
                });
            });
        });
    }

    // Comando /meuspedidos
    if (texto === "/meuspedidos") {
        // Primeiro tentar pegar telefone cadastrado
        return fbGet("/clientes/" + chatId + ".json").then(function (dados) {
            var telSalvo = dados && dados.tel ? String(dados.tel).replace(/\D/g, "") : "";
            var telParaBuscar = telSalvo || tel;
            if (!telParaBuscar) {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "❌ Você não tem WhatsApp cadastrado.\n\nUse: /telefone 21999999999\nDepois use /meuspedidos para ver seus pedidos.",
                    parse_mode: "Markdown"
                });
            }
            return buscarPedidosPorTelefone(telParaBuscar).then(function (pedidos) {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: textoMeusPedidos(pedidos),
                    parse_mode: "Markdown"
                });
            });
        });
    }

    // Comando /status <ID>
    if (texto.startsWith("/status")) {
        var partes = texto.split(/\s+/);
        var idPedido = partes[1] || "";
        if (!idPedido) {
            return tg("sendMessage", {
                chat_id: chatId,
                text: "❌ Use: /status CV20261016-001\nExemplo: /status CV20261016-001",
                parse_mode: "Markdown"
            });
        }
        return fbGet("/pedidos.json").then(function (dados) {
            if (!dados || typeof dados !== "object") {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "❌ Não foi possível carregar os pedidos. Tente novamente.",
                    parse_mode: "Markdown"
                });
            }
            var pedido = Object.keys(dados).map(function (k) {
                var p = dados[k];
                p.id = k;
                return p;
            }).find(function (p) {
                return p.id === idPedido;
            });
            if (!pedido) {
                return tg("sendMessage", {
                    chat_id: chatId,
                    text: "❌ Pedido '" + idPedido + "' não encontrado.\nVerifique o ID e tente novamente.",
                    parse_mode: "Markdown"
                });
            }
            return tg("sendMessage", {
                chat_id: chatId,
                text: textoStatus(pedido),
                parse_mode: "Markdown"
            });
        });
    }

    // Comando não reconhecido
    return tg("sendMessage", {
        chat_id: chatId,
        text: "❓ Comando não reconhecido.\nUse /ajuda para ver os comandos disponíveis.",
        parse_mode: "Markdown"
    });
}
async function rodar() {
    try {
        await tg("setMyCommands", { commands: JSON.stringify(COMANDOS) });
    } catch (e) {
        console.log("aviso: não registrei o menu de comandos: " + e.message);
    }

    let offset = 0;
    try {
        offset = Number(await fbGet("/bot_clientes/offset.json")) || 0;
    } catch (e) { offset = 0; }

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
            if (u.message) await tratarMensagem(u.message);
        } catch (e) { console.log("erro ao tratar atualização: " + e.message); }
    }

    if (novoOffset !== offset) {
        try { await fbPut("/bot_clientes/offset.json", novoOffset); } catch (e) { console.log("aviso: não guardei o offset: " + e.message); }
    }
    console.log("OK - " + updates.length + " atualização(ões), offset " + offset + " -> " + novoOffset);
}

rodar().catch((e) => { console.log("erro geral: " + e.message); process.exitCode = 1; });