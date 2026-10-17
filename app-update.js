/* ============================================
   ATUALIZACAO DO APP
   O app instalado (celular ou PC) fica com cache
   antigo e nao pega as melhorias nem os temas novos.
   Aqui conferimos a versao e, se houver versao nova,
   o app se atualiza SOZINHO e em silencio: nao existe
   mais a barra "Versao nova disponivel" flutuando na
   tela (o dono pediu para tirar - ela cobria o botao
   do carrinho e empurrava o rodape para cima).

   O que continua igual e importante: quando a versao
   do site muda, o cache velho e apagado e o service
   worker atualizado sozinho. E o que impede o cliente
   de ficar preso numa versao antiga (foi o defeito do
   Historico mostrar versao velha depois do Ctrl+F5).
   ============================================ */
var VERSAO_APP = "20261017r";

/* nome do cache vivo: sw.js monta "convencao-cache-" + VERSAO.
   Mantido aqui so para conferir; o service worker e a fonte da verdade. */
var CACHE_ATUAL = "convencao-cache-20261017r";

/* tira os caches ANTIGOS (o do service worker atual fica de pe:
   se apagassemos tudo, o app ficaria sem nada offline) */
function limparCacheApp() {
    if (typeof caches === "undefined") return Promise.resolve();
    return caches.keys().then(function (chaves) {
        return Promise.all(chaves.map(function (c) {
            if (c === CACHE_ATUAL) return null;     /* o cache ativo */
            return caches.delete(c);
        }));
    }).catch(function () { });
}

function iniciarApp() {
    /* 1) registra o service worker */
    if ("serviceWorker" in navigator) {
        var swReg = null;  /* guarda o registro para usar em setInterval/visibilitychange */
        window.addEventListener("load", function () {
            navigator.serviceWorker.register("sw.js").then(function (reg) {
                swReg = reg;  /* guarda para uso fora deste then */
                /* versao nova esperando: nao faz nada na tela, o proprio
                   activate troca o service worker e limpa o cache velho */
                reg.addEventListener("updatefound", function () {
                    var novo = reg.installing;
                    if (!novo) return;
                    novo.addEventListener("statechange", function () {
                        if (novo.state === "installed") {
                            if (navigator.serviceWorker.controller) {
                                /* ja estava sendo usado: pode assumir agora */
                                if (novo.postState) novo.postState({ type: "SKIP_WAITING" });
                            } else if (novo.waiting) {
                                /* primeiro acesso com worker novo: ja vale */
                                novo.postMessage({ type: "SKIP_WAITING" });
                            }
                        }
                    });
                });
            }).catch(function () { });

            /* confere de tempos em tempos (ao voltar para o app) */
            setInterval(function () {
                if (document.visibilityState === "visible" && swReg) swReg.update().catch(function () { });
            }, 5 * 60 * 1000);
            document.addEventListener("visibilitychange", function () {
                if (document.visibilityState === "visible" && swReg) swReg.update().catch(function () { });
            });
        });
    }

    /* 2) confere a versao do site (a rede e a fonte da verdade) */
    fetch("versao.txt", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (v) {
            v = String(v || "").trim();
            if (!v) return;
            /* o cache comeca a mudar de nome a cada publicacao:
               o service worker novo usa o nome novo e apaga o antigo */
            CACHE_ATUAL = "convencao-cache-" + v;
            try {
                var antes = localStorage.getItem("versaoAppVista");
                if (antes !== v) {
                    /* versao nova vista pela primeira vez: garante que o
                       service worker ja esteja na versao nova, senao o
                       app continua servindo a copia antiga do cache */
                    if (antes) {
                        limparCacheApp();
                        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
                            navigator.serviceWorker.getRegistration().then(function (r) {
                                if (r) r.update().catch(function () { });
                            }).catch(function () { });
                        }
                    }
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