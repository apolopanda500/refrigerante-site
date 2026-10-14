/* ============================================
   BOT DO TELEGRAM - COMANDOS DO VENDEDOR
   Roda dentro do painel (admin.html).

   O que faz:
   1) registra os comandos no MENU do bot
      (botao "/" do Telegram): confirmar, separacao,
      enviado, entregue, cancelar, ultimos, ajuda
   2) le o que o vendedor manda (texto ou botoes)
      usando getUpdates e aplica nos pedidos
   3) responde no chat (sendMessage /
      answerCallbackQuery / editMessageText)

   IMPORTANTE: os pedidos ficam gravados no
   navegador do painel. Por isso os comandos so
   mudam o status enquanto o painel estiver aberto.
   ============================================ */
var TelegramBot = (function () {

    var K_OFFSET = "convencao_tg_offset";
    var K_PREFS  = "refrigerantePrefs";
    var TIMER = null;
    var LOG = [];

    /* ---------- config (token/chat do dono) ---------- */
    function prefs() {
        try { return JSON.parse(localStorage.getItem(K_PREFS) || "{}"); }
        catch (e) { return {}; }
    }
    function cfg() {
        var p = prefs();
        return {
            token: String(p.cfgTelegramToken || "8673434736:AAEit4J3TMwdWsPfP0qZ_hvUbQrmhLKKiAU").trim(),
            chat: String(p.cfgTelegramChatId || "1810807613").trim(),
            ligado: p.cfgBotComandos !== false
        };
    }

    /* ---------- comandos que aparecem no menu do bot ---------- */
    var COMANDOS = [
        { command: "confirmar", description: "Confirmar pedido: /confirmar CV20261014-001" },
        { command: "separacao", description: "Marcar em separacao: /separacao CV20261014-001" },
        { command: "enviado",  description: "Marcar como enviado: /enviado CV20261014-001" },
        { command: "entregue",  description: "Marcar como entregue: /entregue CV20261014-001" },
        { command: "cancelar",  description: "Cancelar pedido: /cancelar CV20261014-001" },
        { command: "ultimos",   description: "Ver os ultimos pedidos" },
        { command: "ajuda",     description: "Ver a lista de comandos" }
    ];

    /* apelidos aceitos -> status do sistema */
    var STATUS_CMD = {
        confirmar: "confirmado", confirmado: "confirmado", confirm: "confirmado",
        separacao: "separacao", separar: "separacao",
        enviado: "enviado", enviar: "enviado",
        entregue: "entregue", entregar: "entregue",
        cancelar: "cancelado", cancelado: "cancelado"
    };

    /* ---------- chamada na API (CORS liberado pelo Telegram) ---------- */
    function api(metodo, params) {
        var c = cfg();
        if (!c.token) return Promise.reject(new Error("token nao configurado"));
        var url = "https://api.telegram.org/bot" + c.token + "/" + metodo;
        var qs = Object.keys(params || {}).map(function (k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
        }).join("&");
        if (qs) url += (url.indexOf("?") >= 0 ? "&" : "?") + qs;
        return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
            if (!j || !j.ok) throw new Error((j && j.description) || "erro na API");
            return j.result;
        });
    }
    function enviar(texto) {
        var c = cfg();
        return api("sendMessage", { chat_id: c.chat, text: texto, disable_web_page_preview: true });
    }

    /* ---------- log visivel no painel ---------- */
    function log(texto) {
        LOG.unshift(horaAgora() + " " + texto);
        if (LOG.length > 12) LOG.pop();
        var el = document.getElementById("botLog");
        if (el) el.innerHTML = LOG.map(function (l) { return "<div>" + l + "</div>"; }).join("");
    }
    function horaAgora() {
        var d = new Date();
        return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);
    }
    function status(txt, cor) {
        var el = document.getElementById("botStatus");
        if (el) { el.innerHTML = txt; el.style.color = cor || "#666"; }
    }

    /* ---------- procura o pedido pelo numero (CV20261014-001, 001, cv...) ---------- */
    function soDigitos(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
    function acharPedido(trecho) {
        var t = soDigitos(trecho);
        if (!t) return null;
        var pedidos = getPedidos();
        var exato = pedidos.find(function (p) { return soDigitos(p.id) === t; });
        if (exato) return exato;
        if (t.length >= 3) {
            return pedidos.find(function (p) { return soDigitos(p.id).indexOf(t) >= 0; }) || null;
        }
        return null;
    }

    /* aplica o status e devolve o pedido ja atualizado (recem-lido) */
    function aplicarStatus(pedido, novo) {
        if (typeof atualizarStatus !== "function") return pedido;
        var antes = pedido.status;
        atualizarStatus(pedido.id, novo);
        log("Pedido " + pedido.id + " -> " + (STATUS_LABEL[antes] || antes) + " para " + (STATUS_LABEL[novo] || novo));
        if (typeof renderAdmin === "function") { try { renderAdmin(); } catch (e) {} }
        return acharPedido(pedido.id) || pedido;
    }

    /* ---------- texto de ajuda ---------- */
    function textoAjuda() {
        return "COMANDOS DO VENDEDOR\n"
            + "\n/confirmar CV20261014-001 - confirmar pedido"
            + "\n/separacao CV20261014-001 - marcar em separacao"
            + "\n/enviado CV20261014-001 - Saiu para entrega"
            + "\n/entregue CV20261014-001 - marcar como entregue"
            + "\n/cancelar CV20261014-001 - cancelar pedido"
            + "\n/ultimos - ver os ultimos 5 pedidos"
            + "\n/ajuda - ver esta lista"
            + "\n\nDica: na mensagem de cada pedido tem botoes. E so tocar para mudar o status.";
    }

    function listarUltimos() {
        var pedidos = getPedidos().slice(0, 5);
        if (!pedidos.length) return "Nenhum pedido no painel ainda.";
        var t = "ULTIMOS PEDIDOS\n";
        pedidos.forEach(function (p) {
            t += "\n- " + p.id + " - " + (p.nome || "").split(" ")[0]
               + " - " + formatBRL(p.total)
               + " - " + (STATUS_LABEL[p.status] || p.status);
        });
        return t;
    }

    /* ---------- 1) registra os comandos no menu do bot ---------- */
    function registrarComandos(btn) {
        var c = cfg();
        status("ativando comandos...", "#8a6100");
        return api("setMyCommands", { commands: JSON.stringify(COMANDOS) })
            .then(function () {
                status("Comandos ativados no bot. Abra o Telegram e toque no botao / para ver a lista.", "#2e7d32");
                log("Comandos registrados no menu do bot");
                if (btn) { btn.innerHTML = '<i class="fa fa-check"></i> Comandos ativados'; }
            })
            .catch(function (e) {
                status("Nao foi possivel ativar: " + e.message + ". Veja se o chat do bot esta correto.", "#c62828");
                log("Falha ao registrar comandos: " + e.message);
            });
    }

    /* ---------- 2) le as mensagens/comandos do vendedor ---------- */
    function verificarAgora(btn) {
        var c = cfg();
        if (!c.ligado) { status("Comandos desligados (veja a opcao acima).", "#8a6100"); return; }
        status("verificando...", "#8a6100");
        var offset = Number(localStorage.getItem(K_OFFSET) || 0);
        return api("getUpdates", { offset: offset || undefined, timeout: 0, limit: 20 })
            .then(function (ups) {
                var lista = ups || [];
                lista.forEach(function (u) {
                    if (u.update_id >= offset) { offset = u.update_id + 1; }
                    try {
                        if (u.callback_query) tratarBotao(u.callback_query);
                        else if (u.message) tratarMensagem(u.message);
                    } catch (e) { log("erro: " + e.message); }
                });
                localStorage.setItem(K_OFFSET, String(offset));
                status(lista.length
                    ? "Verificado as " + horaAgora() + " - " + lista.length + " novidade(s)."
                    : "Verificado as " + horaAgora() + " - nada novo.",
                    "#2e7d32");
            })
            .catch(function (e) {
                status("Falha ao verificar: " + e.message, "#c62828");
                log("Falha no getUpdates: " + e.message);
            });
    }

    /* so obedece o dono da loja */
    function doDono(quem) {
        var c = cfg();
        var id = String((quem && (quem.id || (quem.chat && quem.chat.id))) || "");
        return id && id === c.chat;
    }

    /* ---------- 3) botoes da mensagem (Confirmar, Entregue...) ---------- */
    function tratarBotao(cb) {
        if (!doDono(cb.from) && !doDono(cb.message && cb.message.chat)) {
            return api("answerCallbackQuery", { callback_query_id: cb.id, text: "Nao autorizado" }).catch(function(){});
        }
        var partes = String(cb.data || "").split("|");           // st|ID|status
        if (partes.length < 3 || partes[0] !== "st") {
            return api("answerCallbackQuery", { callback_query_id: cb.id }).catch(function(){});
        }
        var id = partes[1], novo = partes[2];
        var pedido = acharPedido(id);
        api("answerCallbackQuery", { callback_query_id: cb.id, text: pedido ? "Aplicando..." : "Pedido nao encontrado" })
            .catch(function(){});

        if (!pedido) {
            log("Bot: pedido " + id + " nao existe neste navegador");
            return enviar("Pedido " + id + " nao encontrado no painel deste navegador.").catch(function(){});
        }

        var antes = pedido.status;
        pedido = aplicarStatus(pedido, novo);

        /* atualiza a propria mensagem do Telegram com o novo status */
        var msg = cb.message || {};
        if (msg.chat && msg.message_id && typeof mensagemPedidoTG === "function") {
            var texto = mensagemPedidoTG(pedido) + "\n\nAtualizado por " + (cb.from && cb.from.first_name ? cb.from.first_name : "voce")
                      + " - " + (STATUS_LABEL[pedido.status] || pedido.status);
            api("editMessageText", {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                text: texto,
                disable_web_page_preview: true,
                reply_markup: JSON.stringify(tecladoPedidoTG(pedido.id))
            }).catch(function(){});
        }
        if (antes === pedido.status) {
            log("Bot: " + pedido.id + " ja estava " + (STATUS_LABEL[novo] || novo));
        }
    }

    /* ---------- 4) comandos digitados (/confirmar CV...) ---------- */
    function tratarMensagem(msg) {
        var texto = String(msg.text || "").trim();
        if (!texto) return;
        if (!doDono(msg.from) && !doDono(msg.chat)) return;      // ignora quem nao e o dono

        var m = texto.match(/^\/([a-z]+)(?:@\w+)?\s*(.*)$/i);
        if (!m) return;                                          // conversa normal, ignora
        var cmd = m[1].toLowerCase(), arg = (m[2] || "").trim();

        if (cmd === "start" || cmd === "ajuda" || cmd === "comandos" || cmd === "help") {
            enviar(textoAjuda()).then(function(){ log("Bot: /ajuda enviado"); });
            return;
        }
        if (cmd === "ultimos" || cmd === "pedidos") {
            enviar(listarUltimos()).then(function(){ log("Bot: /ultimos enviado"); });
            return;
        }

        var novo = STATUS_CMD[cmd];
        if (!novo) {
            enviar("Comando nao reconhecido. Use /ajuda para ver a lista.").catch(function(){});
            return;
        }
        if (!arg) {
            enviar("Falta o numero do pedido. Exemplo: /" + cmd + " CV20261014-001").catch(function(){});
            return;
        }

        var pedido = acharPedido(arg);
        if (!pedido) {
            enviar("Nao encontrei o pedido \"" + arg + "\" no painel deste navegador. Use /ultimos para ver os numeros.").catch(function(){});
            log("Bot: pedido nao encontrado (" + arg + ")");
            return;
        }
        pedido = aplicarStatus(pedido, novo);
        enviar("Pedido " + pedido.id + " atualizado: " + (STATUS_LABEL[pedido.status] || pedido.status)
             + "\nCliente: " + pedido.nome + " - " + formatBRL(pedido.total))
            .then(function(){ log("Bot: /" + cmd + " " + pedido.id); })
            .catch(function(){});
    }

    /* ---------- liga/desliga a vigia automatica ---------- */
    function iniciar() {
        parar();
        if (!cfg().ligado) return;
        TIMER = setInterval(function () {
            if (document.getElementById("painelTela") && document.getElementById("painelTela").style.display !== "none") {
                verificarAgora();
            }
        }, 20000);
    }
    function parar() { if (TIMER) { clearInterval(TIMER); TIMER = null; } }

    function ligadoMudou(checkbox) {
        var p = prefs();
        p.cfgBotComandos = checkbox.checked;
        try { localStorage.setItem(K_PREFS, JSON.stringify(p)); } catch (e) {}
        if (checkbox.checked) iniciar(); else parar();
        status(checkbox.checked ? "Comandos ligados." : "Comandos desligados.", checkbox.checked ? "#2e7d32" : "#8a6100");
    }

    return {
        iniciar: iniciar,
        parar: parar,
        registrarComandos: registrarComandos,
        verificarAgora: verificarAgora,
        ligadoMudou: ligadoMudou,
        status: status,
        log: log
    };
})();
