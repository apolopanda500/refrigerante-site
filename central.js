/* ============================================================
   CENTRAL DO CLIENTE - parte 1: vigia de erros e permissoes
   ------------------------------------------------------------
   - vigiaErro/fetchSeguro: rede com retentativa (3 tentativas)
     e registro de erros em localStorage ("vigiaErros") para a
     IA diagnosticar depois.
   - notificacoes: checagem de pedidos do cliente de 30 em 30s
     (local + nuvem) e aviso REAL quando o status muda:
     Notification API (precisa de permissao, uma vez por
     aparelho) + aviso visivel na pagina (toast). So acontece
     se cfgNotifPedido estiver ligado nas Configuracoes.
   ============================================================ */
var NOTIF_INTERVALO = 30000;
var NOTIF_TIMER = null;

/* ---------- vigia de erros (a IA se corrige sozinha) ---------- */
function vigiaErro(onde, erro) {
    try {
        var lista = JSON.parse(localStorage.getItem("vigiaErros") || "[]");
        lista.unshift({
            quando: Date.now(),
            onde: String(onde || "").slice(0, 80),
            erro: String((erro && (erro.message || erro)) || erro || "").slice(0, 200)
        });
        if (lista.length > 50) lista = lista.slice(0, 50);
        localStorage.setItem("vigiaErros", JSON.stringify(lista));
    } catch (e) {}
}
function vigiaLerErros() {
    try { return JSON.parse(localStorage.getItem("vigiaErros") || "[]"); }
    catch (e) { return []; }
}
/* fetch com retentativa: tenta 3 vezes com espera crescente */
function fetchSeguro(url, opcoes, nome) {
    opcoes = opcoes || {};
    var esperas = [0, 1200, 3500];
    function tentar(i) {
        return new Promise(function (ok, erro) {
            function ir() {
                fetch(url, opcoes).then(ok).catch(function (e) {
                    if (i + 1 < esperas.length) {
                        setTimeout(function () { tentar(i + 1).then(ok).catch(erro); }, esperas[i + 1]);
                    } else {
                        vigiaErro(nome || url, e);
                        erro(e);
                    }
                });
            }
            if (esperas[i]) setTimeout(ir, esperas[i]); else ir();
        });
    }
    return tentar(0);
}

/* ---------- permissoes ---------- */
function notifPermitida() {
    try {
        var p = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}");
        if (p.cfgNotifPedido === false) return false;
    } catch (e) {}
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    return "pedir";
}
function notifPedirPermissao(cb) {
    if (typeof Notification === "undefined") { if (cb) cb("nao-suportado"); return; }
    if (Notification.permission === "granted") { if (cb) cb("ok"); return; }
    if (Notification.permission === "denied") { if (cb) cb("negado"); return; }
    try {
        Notification.requestPermission().then(function (r) { if (cb) cb(r === "granted" ? "ok" : "negado"); });
    } catch (e) {
        try { Notification.requestPermission(function (r) { if (cb) cb(r === "granted" ? "ok" : "negado"); }); }
        catch (e2) { if (cb) cb("negado"); }
    }
}

/* ============================================================
   CENTRAL DO CLIENTE - parte 2: rodada de notificacao
   Baixa o status novo da nuvem, compara com a foto anterior
   e avisa de verdade o que mudou (sistema + toast na pagina).
   ============================================================ */
function notifMapaLocal() {
    var mapa = {};
    try { getPedidos().forEach(function (p) { if (p && p.id) mapa[p.id] = p.status; }); } catch (e) {}
    return mapa;
}
function notifFotoStatus(mapa) {
    try { localStorage.setItem("notifUltimoStatus", JSON.stringify(mapa)); } catch (e) {}
}
function notifFotoAnterior() {
    try { return JSON.parse(localStorage.getItem("notifUltimoStatus") || "{}"); }
    catch (e) { return {}; }
}
/* aviso real: sistema (se liberado) + aviso visivel na pagina */
function notifAvisar(pedido, antes, depois) {
    var rotulo = (typeof STATUS_LABEL !== "undefined") ? (STATUS_LABEL[depois] || depois) : depois;
    var titulo = "Pedido " + pedido.id + ": " + rotulo;
    var texto = "Total " + (typeof formatBRL === "function" ? formatBRL(pedido.total || 0) : pedido.total);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification(titulo, { body: texto, tag: pedido.id + "-" + depois }); } catch (e) { vigiaErro("notificacao-sistema", e); }
    }
    notifToast(titulo, texto);
}
function notifToast(titulo, texto) {
    if (typeof document === "undefined" || !document.body) return;
    if (document.getElementById("notifToast")) return;
    var d = document.createElement("div");
    d.id = "notifToast";
    d.className = "notif-toast";
    d.innerHTML = '<i class="fa fa-bell"></i><div><b></b><small></small></div>'
        + '<button type="button" aria-label="Fechar">&times;</button>';
    d.querySelector("b").textContent = String(titulo);
    d.querySelector("small").textContent = String(texto);
    d.querySelector("button").addEventListener("click", function () { d.remove(); });
    d.addEventListener("click", function () { d.remove(); });
    document.body.appendChild(d);
    setTimeout(function () { try { d.remove(); } catch (e) {} }, 12000);
}
/* uma rodada: traz a nuvem, compara, avisa o que mudou */
function notifRodada() {
    if (notifPermitida() === false) return;
    function conferir() {
        var antes = notifFotoAnterior();
        var atuais = notifMapaLocal();
        Object.keys(atuais).forEach(function (id) {
            if (antes[id] && antes[id] !== atuais[id]) {
                var p = null;
                try { p = getPedidos().find(function (x) { return x.id === id; }); } catch (e) {}
                if (p) notifAvisar(p, antes[id], atuais[id]);
            }
        });
        notifFotoStatus(atuais);
    }
    if (typeof sincronizarPedidosCliente === "function") {
        try { sincronizarPedidosCliente(function () { conferir(); }); return; }
        catch (e) { vigiaErro("notif-sync", e); }
    }
    conferir();
}
function notifIniciar() {
    if (NOTIF_TIMER) return;
    if (typeof getPedidos === "undefined") return;
    if (notifPermitida() === false) return;
    try { notifFotoStatus(notifMapaLocal()); } catch (e) {}
    NOTIF_TIMER = setInterval(notifRodada, NOTIF_INTERVALO);
}
/* se o cliente desligar nas Configuracoes, a vigia para na hora */
if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
        window.addEventListener("storage", function (e) {
            if (e && e.key === "refrigerantePrefs") {
                try {
                    var p = JSON.parse(e.newValue || "{}");
                    if (p.cfgNotifPedido === false && NOTIF_TIMER) {
                        clearInterval(NOTIF_TIMER);
                        NOTIF_TIMER = null;
                    } else if (p.cfgNotifPedido !== false && !NOTIF_TIMER && typeof notifIniciar === "function") {
                        notifIniciar();
                    }
                } catch (err) {}
            }
        });
    } catch (e) {}
}

/* ---------- boot: comeca a vigiar os pedidos do cliente ---------- */
if (typeof document !== "undefined") {
    var bootCentral = function () { try { notifIniciar(); } catch (e) { vigiaErro("boot-central", e); } };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootCentral);
    else bootCentral();
}