/* ============================================
   ATUALIZACAO DO APP
   O app instalado (celular ou PC) fica com cache
   antigo e nao pega as melhorias nem os temas novos.
   Aqui conferimos a versao e, se houver versao nova,
   aparece uma barra para atualizar na hora.
   ============================================ */
var VERSAO_APP = "20261016b";

function barraAtualizar() {
    if (document.getElementById("barraAtualizar")) return;

    var box = document.createElement("div");
    box.id = "barraAtualizar";
    box.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9998;"
        + "display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;"
        + "background:#3d4465;color:#fff;padding:13px 16px;border-radius:16px;"
        + "box-shadow:0 8px 26px rgba(0,0,0,.28);font:600 .95rem/1.3 'Segoe UI',sans-serif";

    var txt = document.createElement("span");
    txt.textContent = "Versão nova disponível!";
    var btn = document.createElement("button");
    btn.textContent = "Atualizar agora";
    btn.style.cssText = "background:#ffb822;color:#3d4465;border:0;border-radius:20px;"
        + "padding:9px 18px;font:800 .92rem/1 'Segoe UI',sans-serif;cursor:pointer;min-height:40px";
    btn.onclick = function () {
        btn.disabled = true;
        txt.textContent = "Atualizando...";
        reiniciarCacheApp().then(function () {
            if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
                navigator.serviceWorker.getRegistration().then(function (r) {
                    if (r) { r.update(); }
                    setTimeout(function () { location.reload(); }, 900);
                }).catch(function () { location.reload(); });
            } else {
                location.reload();
            }
        });
    };
    var fechar = document.createElement("button");
    fechar.textContent = "\u00D7";
    fechar.setAttribute("aria-label", "Fechar");
    fechar.style.cssText = "position:absolute;top:6px;right:10px;background:none;border:0;color:#fff;font-size:1.3rem;cursor:pointer;line-height:1;padding:6px";
    fechar.onclick = function () { box.remove(); };

    box.appendChild(txt);
    box.appendChild(btn);
    box.appendChild(fechar);
    document.body.appendChild(box);
}

/* tira os caches ANTIGOS (o do service worker atual fica de pe:
   se apagassemos tudo, o app ficaria sem nada offline) */
function limparCacheApp() {
    if (typeof caches === "undefined") return Promise.resolve();
    return caches.keys().then(function (chaves) {
        return Promise.all(chaves.map(function (c) {
            if (c === "convencao-cache-v4") return null;   /* o cache ativo */
            return caches.delete(c);
        }));
    }).catch(function () { });
}

/* tira TUDO (so quando o usuario pede "atualizar agora") e
   recarrega o service worker para ele repopular o cache */
function reiniciarCacheApp() {
    if (typeof caches === "undefined") return Promise.resolve();
    return caches.keys().then(function (chaves) {
        return Promise.all(chaves.map(function (c) { return caches.delete(c); }));
    }).catch(function () { }).then(function () {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
            return navigator.serviceWorker.getRegistration().then(function (r) {
                if (r) return r.update();
            }).catch(function () { });
        }
    });
}

function iniciarApp() {
    /* 1) registra o service worker */
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
            navigator.serviceWorker.register("sw.js").then(function (reg) {
                /* ja tem versao nova esperando? mostra a barra */
                if (reg.waiting) barraAtualizar();
                reg.addEventListener("updatefound", function () {
                    var novo = reg.installing;
                    if (!novo) return;
                    novo.addEventListener("statechange", function () {
                        if (novo.state === "installed" && navigator.serviceWorker.controller) barraAtualizar();
                    });
                });
            }).catch(function () { });

            /* confere de tempos em tempos (ao voltar para o app) */
            setInterval(function () {
                if (document.visibilityState === "visible") reg.update().catch(function () { });
            }, 5 * 60 * 1000);
            document.addEventListener("visibilitychange", function () {
                if (document.visibilityState === "visible") reg.update().catch(function () { });
            });
        });
    }

    /* 2) confere a versao do site (a rede e a fonte da verdade) */
    fetch("versao.txt", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (v) {
            v = String(v || "").trim();
            if (!v) return;
            try {
                var antes = localStorage.getItem("versaoAppVista");
                if (antes !== v) {
                    /* versao nova vista pela primeira vez: limpa caches antigos */
                    if (antes) limparCacheApp();
                    localStorage.setItem("versaoAppVista", v);
                }
            } catch (e) { }
        })
        .catch(function () { });
}

/* ---------- o app se registra sozinho em toda pagina ---------- */
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarApp);
    } else {
        iniciarApp();
    }
}

/* botao "Instalar app" igual ao da home */
function instalarApp() {
    /* se ja existe APK pronto, o celular baixa direto */
    var apk = document.body && document.body.getAttribute ? document.body.getAttribute("data-apk") : null;
    if (apk && /android/i.test(navigator.userAgent)) {
        var link = document.createElement("a");
        link.href = apk;
        link.download = apk.split("/").pop();
        document.body.appendChild(link);
        link.click();
        return;
    }
    if (!window.__promptInstalacao) {
        alert("Para instalar o app:\n\nAndroid: menu do navegador (⋮) > Instalar app.\niPhone: botão Compartilhar > Adicionar à Tela de Início.\nPC (Chrome/Edge): ícone de instalar na barra de endereços.");
        return;
    }
    window.__promptInstalacao.prompt();
    window.__promptInstalacao.userChoice.then(function () { window.__promptInstalacao = null; });
}

window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window.__promptInstalacao = e;
    var b = document.getElementById("btnInstalar");
    if (b) b.style.display = "inline-flex";
});