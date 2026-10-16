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
    /* preferencias PROPIAS do painel (nunca mistura com as do cliente) */
    var K_PREFS  = "vendedorPrefs";
    var K_CMDS   = "convencao_tg_cmds";   // "1" = menu ja registrado; "tentou" = ja tentou e falhou
    var TIMER = null;
    var LOG = [];

    /* ---------- offset COMPARTILHADO com o robo 24/7 ----------
       O painel e o robo do servidor (.github/scripts/bot-telegram.js)
       usam o MESMO offset, guardado no Firebase (/bot/offset.json).
       Assim, quem processar o toque primeiro avanca o offset e o
       outro nao repete o mesmo status/aviso. */
    var NUVEM_BASE = "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com";
    function baseNuvem() {
        try {
            if (typeof nuvemEnderecos === "function") {
                var l = nuvemEnderecos();
                if (l && l.length) return l[0];
            }
        } catch (e) { /* proposital: o bot nao pode derrubar o painel */ }
        return NUVEM_BASE;
    }
    function lerOffsetNuvem() {
        return fetch(baseNuvem() + "/bot/offset.json?t=" + Date.now(), { cache: "no-store" })
            .then(function (r) { return r.text(); })
            .then(function (t) { var v = parseInt(String(t).replace(/[^0-9]/g, ""), 10); return isNaN(v) ? 0 : v; })
            .catch(function () { return 0; });
    }
    function gravarOffsetNuvem(v) {
        try {
            fetch(baseNuvem() + "/bot/offset.json", { method: "PUT", body: String(v) }).catch(function () {});
        } catch (e) { /* proposital: o bot nao pode derrubar o painel */ }
    }

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
        { command: "reabrir",  description: "Voltar para aguardando: /reabrir CV20261014-001" },
        { command: "editar",   description: "Corrigir dado do pedido: /editar 001 bairro Paracambi" },
        { command: "buscar",   description: "Achar pedido por nome, telefone ou bairro: /buscar Japeri" },
        { command: "ultimos",   description: "Ver os ultimos pedidos" },
        { command: "status",    description: "Ver um pedido: /status CV20261014-001" },
        { command: "hoje",      description: "Resumo dos pedidos de hoje" },
        { command: "ajuda",     description: "Ver a lista de comandos" }
    ];

    /* o que o /editar aceita trocar no pedido */
    var CAMPOS_EDITAVEIS = {
        nome: { rotulo: "Nome do cliente", exemplo: "Maria Silva" },
        telefone: { rotulo: "WhatsApp", exemplo: "21999998888" },
        cpf: { rotulo: "CPF", exemplo: "12345678901" },
        end: { rotulo: "Endereco (rua e numero)", exemplo: "Rua das Flores, 120" },
        bairro: { rotulo: "Bairro", exemplo: "Japeri" },
        comp: { rotulo: "Complemento", exemplo: "Apto 21" },
        regiao: { rotulo: "Regiao de entrega", exemplo: "Japeri" },
        pagamento: { rotulo: "Pagamento", exemplo: "Pix ou Dinheiro" },
        troco: { rotulo: "Troco para", exemplo: "100,00" },
        observacao: { rotulo: "Observacao", exemplo: "telefonar na chegada" }
    };

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
        if (el) { el.innerHTML = txt; el.style.color = cor || "var(--text-muted)"; }
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
        if (typeof renderAdmin === "function") { try { renderAdmin(); } catch(e){/* proposital: o bot nao pode derrubar o painel */} }
        return acharPedido(pedido.id) || pedido;
    }

    /* ---------- texto de ajuda ---------- */
    function textoAjuda() {
        return "COMANDOS DO VENDEDOR\n"
            + "\n/confirmar CV20261014-001 - confirmar pedido"
            + "\n/separacao CV20261014-001 - marcar em separacao"
            + "\n/enviado CV20261014-001 - saiu para entrega"
            + "\n/entregue CV20261014-001 - marcar como entregue"
            + "\n/cancelar CV20261014-001 - cancelar pedido"
            + "\n/reabrir CV20261014-001 - voltar para aguardando"
            + "\n/editar 001 bairro Paracambi - corrigir um dado"
            + "\n/buscar Japeri - achar pedido por nome, telefone ou bairro"
            + "\n/ultimos - ver os ultimos 5 pedidos"
            + "\n/status CV20261014-001 - ver um pedido"
            + "\n/hoje - resumo dos pedidos de hoje"
            + "\n/ajuda - ver esta lista"
            + "\n\nDica: na mensagem de cada pedido tem botoes. E so tocar: Confirmar, Editar, Entregue...";
    }

    /* ---------- /editar: corrige um dado do pedido ---------- */
    function textoEditar(id) {
        var t = "EDITAR PEDIDO " + id + "\n\nDigite assim:\n"
            + "/editar " + id + " campo valor\n\nCampos que da para trocar:\n";
        Object.keys(CAMPOS_EDITAVEIS).forEach(function (k) {
            t += "\n- " + k + " (" + CAMPOS_EDITAVEIS[k].rotulo + ") ex.: " + CAMPOS_EDITAVEIS[k].exemplo;
        });
        t += "\n\nExemplo: /editar " + id + " bairro Paracambi";
        return t;
    }
    function editarPedido(id, campo, valor) {
        var pedido = acharPedido(id);
        if (!pedido) return Promise.reject(new Error("pedido nao encontrado"));
        var chave = String(campo || "").toLowerCase().trim();
        if (!CAMPOS_EDITAVEIS[chave]) {
            return enviar("Campo \"" + chave + "\" nao existe.\n\n" + textoEditar(pedido.id))
                .then(function () { throw new Error("campo invalido"); });
        }
        var lista = getPedidos();
        var alvo = lista.find(function (p) { return p.id === pedido.id; });
        if (!alvo) return Promise.reject(new Error("pedido nao encontrado"));
        var antes = alvo[chave];
        alvo[chave] = valor;
        alvo.atualizadoEm = Date.now();
        alvo.historico = Array.isArray(alvo.historico) ? alvo.historico : [];
        alvo.historico.push({ status: alvo.status, quando: Date.now(), nota: "Editado: " + chave });
        savePedidos(lista);
        if (typeof enviarPedidoNuvem === "function") { try { enviarPedidoNuvem(alvo); } catch(e){/* proposital: o bot nao pode derrubar o painel */} }
        if (typeof renderAdmin === "function") { try { renderAdmin(); } catch(e){/* proposital: o bot nao pode derrubar o painel */} }
        log("Bot: " + pedido.id + " - " + chave + ": " + (antes || "(vazio)") + " -> " + valor);
        var linha = CAMPOS_EDITAVEIS[chave].rotulo + ": " + (antes || "(vazio)") + "  ->  " + valor;
        return enviar("Pedido " + pedido.id + " atualizado\n" + linha
            + "\nStatus: " + (STATUS_LABEL[alvo.status] || alvo.status)).then(function () {
            return { id: alvo.id, campo: chave, valor: valor };
        });
    }

    /* ---------- /buscar ---------- */
    function textoBuscar(termo) {
        var t = String(termo || "").toLowerCase().trim();
        if (!t) return "Falta o que procurar. Exemplo: /buscar Japeri";
        var achados = getPedidos().filter(function (p) {
            return [p.id, p.nome, p.tel, p.bairro, p.end, p.regiao].join(" ")
                .toLowerCase().indexOf(t) >= 0;
        }).slice(0, 8);
        if (!achados.length) return "Nada encontrado para \"" + termo + "\".";
        var r = "BUSCA: " + termo + "\n";
        achados.forEach(function (p) {
            r += "\n- " + p.id + " - " + (p.nome || "") + " - " + (p.bairro || "")
               + " - " + formatBRL(p.total || 0) + " - " + (STATUS_LABEL[p.status] || p.status);
        });
        return r;
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

    /* resumo do dia (mesmo painel de "Resumo de hoje") */
    function resumoHoje() {
        var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        var doDia = getPedidos().filter(function (p) { return (p.criadoEm || 0) >= hoje.getTime(); });
        if (!doDia.length) return "Nenhum pedido hoje ainda.";
        var abertos = doDia.filter(function (p) { return p.status === "aguardando"; }).length;
        var fat = doDia.filter(function (p) { return p.status !== "cancelado"; })
            .reduce(function (t, p) { return t + (p.total || 0); }, 0);
        return "PEDIDOS DE HOJE\n"
            + "\nTotal: " + doDia.length + " pedido(s)"
            + "\nAguardando: " + abertos
            + "\nFaturamento: " + formatBRL(fat)
            + "\n\n(use /ultimos para ver os numeros)";
    }

    /* ---------- 1) registra os comandos no menu do bot ---------- */
    function registrarComandos(btn, automatico) {
        if (!automatico) status("ativando comandos...", "var(--texto-aviso)");
        return api("setMyCommands", { commands: JSON.stringify(COMANDOS) })
            .then(function () {
                try { localStorage.setItem(K_CMDS, "1"); } catch(e){/* proposital: o bot nao pode derrubar o painel */}
                log("Comandos registrados no menu do bot");
                if (!automatico) {
                    status("Comandos ativados no bot. Abra o Telegram e toque no botao / para ver a lista.", "var(--texto-ok)");
                    if (btn) { btn.innerHTML = '<i class="fa fa-check"></i> Comandos ativados'; }
                }
            })
            .catch(function (e) {
                if (automatico) {
                    /* nao deixa o painel piscando vermelho toda vez que abre:
                       anota a tentativa e deixa o botao para o vendedor decidir */
                    try { localStorage.setItem(K_CMDS, "tentou"); } catch(e){/* proposital: o bot nao pode derrubar o painel */}
                    log("Menu de comandos nao registrado: " + e.message + " (use Ativar comandos)");
                } else {
                    try { localStorage.removeItem(K_CMDS); } catch(e){/* proposital: o bot nao pode derrubar o painel */}
                    status("Nao foi possivel ativar: " + e.message + ". Confira o token e o chat do bot em Configurações do painel.", "var(--texto-erro)");
                    log("Falha ao registrar comandos: " + e.message);
                }
            });
    }
    /* registro automatico: so na primeira abertura (depois nao repete erro) */
    function registrarSePendente() {
        try {
            var feito = localStorage.getItem(K_CMDS);
            if (feito === "1") { log("Menu de comandos ja registrado"); return Promise.resolve(); }
            if (feito === "tentou") { log("Menu de comandos: use o botao Ativar comandos para tentar de novo"); return Promise.resolve(); }
        } catch(e){/* proposital: o bot nao pode derrubar o painel */}
        return registrarComandos(null, true);
    }

    /* ---------- 2) le as mensagens/comandos do vendedor ---------- */
    function verificarAgora(btn) {
        var c = cfg();
        if (!c.ligado) { status("Comandos desligados (veja a opcao acima).", "var(--texto-aviso)"); return; }
        status("verificando...", "var(--texto-aviso)");
        var local = Number(localStorage.getItem(K_OFFSET) || 0);
        return lerOffsetNuvem().then(function (naNuvem) {
            /* comeca do maior offset (nuvem x local) para nunca repetir o que
               o robo 24/7 ja processou */
            var offset = Math.max(local, naNuvem || 0);
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
                    try { localStorage.setItem(K_OFFSET, String(offset)); } catch(e){/* proposital: o bot nao pode derrubar o painel */}
                    gravarOffsetNuvem(offset);
                    status(lista.length
                        ? "Verificado as " + horaAgora() + " - " + lista.length + " novidade(s)."
                        : "Verificado as " + horaAgora() + " - nada novo.",
                        "var(--texto-ok)");
                });
        })
            .catch(function (e) {
                var msg = String(e.message || e);
                if (/409|webhook/i.test(msg)) {
                    status("O Telegram tem outra conexao ativa (webhook). Removendo...", "var(--texto-aviso)");
                    try { localStorage.removeItem("convencao_tg_hook"); } catch(e){/* proposital: o bot nao pode derrubar o painel */}
                    api("deleteWebhook", {}).then(function () {
                        try { localStorage.setItem("convencao_tg_hook", "1"); } catch(e){/* proposital: o bot nao pode derrubar o painel */}
                        status("Webhook removido. Toque em Verificar novamente.", "var(--texto-ok)");
                    }).catch(function () {});
                } else if (/fetch|network|failed/i.test(msg)) {
                    status("Sem conexao com o Telegram agora - comandos ficam em espera.", "var(--texto-aviso)");
                } else {
                    status("Falha ao verificar: " + msg, "var(--texto-erro)");
                }
                log("Falha no getUpdates: " + msg);
            });
    }

    /* so obedece o dono da loja (id numerico OU @usuario) */
    function doDono(quem) {
        var c = cfg();
        var id = String((quem && (quem.id || (quem.chat && quem.chat.id))) || "");
        if (id && id === String(c.chat || "")) return true;
        var user = String((quem && quem.username) || "").toLowerCase();
        var alvo = String(c.chat || "").replace(/^@/, "").toLowerCase();
        return !!user && !!alvo && user === alvo;
    }

    /* ---------- 3) botoes da mensagem (Confirmar, Editar, Entregue...) ---------- */
    function tratarBotao(cb) {
        if (!doDono(cb.from) && !doDono(cb.message && cb.message.chat)) {
            return api("answerCallbackQuery", { callback_query_id: cb.id, text: "Nao autorizado" }).catch(function(){});
        }
        var partes = String(cb.data || "").split("|");           // st|ID|status
        var acao = partes[0];

        /* botao EDITAR: mostra como corrigir */
        if (acao === "ed") {
            var idEd = partes[1];
            api("answerCallbackQuery", { callback_query_id: cb.id, text: "Abrindo editor" }).catch(function(){});
            return enviar(textoEditar(idEd)).catch(function(){});
        }
        /* botao REABRIR: volta para aguardando */
        if (acao === "rb") {
            var idRb = partes[1];
            var pRb = acharPedido(idRb);
            api("answerCallbackQuery", { callback_query_id: cb.id, text: pRb ? "Voltando..." : "Pedido nao encontrado" })
                .catch(function(){});
            if (!pRb) return enviar("Pedido " + idRb + " nao encontrado neste navegador.").catch(function(){});
            aplicarStatus(pRb, "aguardando");
            return enviar("Pedido " + pRb.id + " voltou para aguardando.").catch(function(){});
        }
        if (partes.length < 3 || acao !== "st") {
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
        if (cmd === "hoje") {
            enviar(resumoHoje()).then(function(){ log("Bot: /hoje enviado"); });
            return;
        }
        if (cmd === "status") {
            if (!arg) {
                enviar("Falta o numero do pedido. Exemplo: /status CV20261014-001").catch(function(){});
                return;
            }
            var detalhe = acharPedido(arg);
            if (!detalhe) {
                enviar("Nao encontrei o pedido \"" + arg + "\". Use /ultimos para ver os numeros.").catch(function(){});
                return;
            }
            enviar("PEDIDO " + detalhe.id
                 + "\nCliente: " + (detalhe.nome || "-")
                 + "\nStatus: " + (STATUS_LABEL[detalhe.status] || detalhe.status)
                 + "\nTotal: " + formatBRL(detalhe.total || 0)
                 + "\nEntrega: " + (detalhe.end || "-") + " - " + (detalhe.bairro || "-")
                 + "\nItens: " + (detalhe.itens || []).map(function(i){ return i.name + " x" + i.qty; }).join(", "))
                .then(function(){ log("Bot: /status " + detalhe.id); })
                .catch(function(){});
            return;
        }

        if (cmd === "buscar" || cmd === "acha") {
            enviar(textoBuscar(arg)).then(function(){ log("Bot: /buscar " + arg); });
            return;
        }
        if (cmd === "editar") {
            if (!arg) { enviar("Falta o pedido. Exemplo: /editar 001 bairro Paracambi").catch(function(){}); return; }
            var partesEd = arg.split(/\s+/);
            if (partesEd.length < 3) {
                var alvoEd = acharPedido(partesEd[0] || "");
                if (!alvoEd) {
                    enviar("Nao encontrei o pedido \"" + arg + "\". Use /ultimos para ver os numeros.").catch(function(){});
                    return;
                }
                enviar(textoEditar(alvoEd.id)).catch(function(){});
                log("Bot: /editar sem valor - mandei a lista de campos");
                return;
            }
            editarPedido(partesEd[0], partesEd[1], partesEd.slice(2).join(" "))
                .then(function () { log("Bot: /editar aplicado"); })
                .catch(function (e) { log("Bot: /editar falhou: " + e.message); });
            return;
        }
        var novo = STATUS_CMD[cmd];
        if (novo === undefined && cmd === "reabrir") novo = "aguardando";
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
        /* webhook antigo derruba o getUpdates com erro 409:
           remove uma vez e guarda que ja foi feito */
        try {
            if (!localStorage.getItem("convencao_tg_hook")) {
                api("deleteWebhook", {})
                    .then(function () {
                        localStorage.setItem("convencao_tg_hook", "1");
                        log("Webhook antigo removido (getUpdates livre)");
                    })
                    .catch(function () {});
            }
        } catch(e){/* proposital: o bot nao pode derrubar o painel */}
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
        try { localStorage.setItem(K_PREFS, JSON.stringify(p)); } catch(e){/* proposital: o bot nao pode derrubar o painel */}
        if (checkbox.checked) iniciar(); else parar();
        status(checkbox.checked ? "Comandos ligados." : "Comandos desligados.", checkbox.checked ? "var(--texto-ok)" : "var(--accent-color)");
    }

    return {
        iniciar: iniciar,
        parar: parar,
        cfg: cfg,
        registrarComandos: registrarComandos,
        registrarSePendente: registrarSePendente,
        verificarAgora: verificarAgora,
        ligadoMudou: ligadoMudou,
        status: status,
        log: log,
        /* exposto para o painel (e para os testes) */
        comandos: COMANDOS,
        camposEditaveis: CAMPOS_EDITAVEIS,
        editar: editarPedido,
        textoAjuda: textoAjuda,
        textoEditar: textoEditar,
        textoBuscar: textoBuscar
    };
})();
