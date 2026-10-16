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
var VERSAO_APP = "20261016i";

/* nome do cache vivo: sw.js monta "convencao-cache-" + VERSAO.
   Mantido aqui so para conferir; o service worker e a fonte da verdade. */
var CACHE_ATUAL = "convencao-cache-20261016i";

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

/* ---------- RECUPERACAO AUTOMATICA ----------
   O cache do aparelho pode ficar quebrado depois de publicar: o HTML vem da
   rede mas o CSS/JS nao, e a tela fica branca. O cliente nao sabe o que
   fazer - ele so ve uma pagina em branco.

   Aqui o proprio app detecta a pagina quebrada (nenhuma folha de estilo
   com regra E o corpo praticamente vazio), apaga o cache, registra o worker
   novo e recarrega UMA vez. O "uma vez" e guardado: sem isso a pagina
   quebrada recarregaria para sempre, queimando a bateria do cliente. */
function recuperarSeQuebrou() {
    if (typeof document === "undefined") return;
    var jaTentou = false;
    try { jaTentou = sessionStorage.getItem("appTentouRecuperar") === "1"; } catch (e) { }

    var folhaComRegra = 0;
    try {
        var folhas = [].slice.call(document.styleSheets || []);
        for (var i = 0; i < folhas.length; i++) {
            /* uma folha de outro dominio (a fonte do icone) lanca ao ler
               cssRules: conta como folha, nao como erro */
            try { if (folhas[i].cssRules && folhas[i].cssRules.length) folhaComRegra++; }
            catch (e2) { /* proposital: folha de origem externa nao abre as regras */ }
        }
    } catch (e3) { /* proposital: sem styleSheets (navegador muito antigo), seguimos sem estilo */ }
    var texto = (document.body ? (document.body.innerText || "") : "").trim().length;

    /* quebrada = sem estilo nenhum E quase nada escrito na tela */
    var quebrada = folhaComRegra === 0 && texto < 40;
    if (!quebrada) return;

    /* a pagina e valida em branco de proposito? (ex.: login vazio) */
    if (document.querySelector("body.login, .login-card")) return;

    if (jaTentou) {
        /* ja tentou e ainda assim: mostra o que fazer, em vez de recarregar em loop */
        try {
            var aviso = document.getElementById("avisoSemCache");
            if (!aviso) {
                aviso = document.createElement("div");
                aviso.id = "avisoSemCache";
                aviso.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));"
                    + "z-index:9999;background:#3d4465;color:#fff;padding:14px 16px;border-radius:14px;"
                    + "font:600 .92rem/1.45 'Segoe UI',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)";
                aviso.innerHTML = '<i class="fa fa-wifi"></i> Não conseguimos carregar a página. '
                    + 'Feche o app e abra de novo — se continuar, feche a internet e abra outra vez.';
                document.body.appendChild(aviso);
            }
        } catch (e4) { }
        return;
    }

    try { sessionStorage.setItem("appTentouRecuperar", "1"); } catch (e5) { }
    try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "LIMPAR_CACHE" });
        }
    } catch (e6) { }
    if (typeof caches !== "undefined") {
        caches.keys().then(function (chaves) {
            return Promise.all(chaves.map(function (c) { return caches.delete(c); }));
        }).catch(function () { }).then(function () { location.reload(); });
    } else {
        location.reload();
    }
}

function iniciarApp() {
    /* 1) registra o service worker */
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
            navigator.serviceWorker.register("sw.js").then(function (reg) {
                /* versao nova esperando: naomos nada na tela, o proprio
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
    /* a recuperacao roda DEPOIS que a pagina tentou se montar: se o CSS e o
       JS nao chegaram, e agora que a gente sabe */
    if (document.readyState === "complete") {
        setTimeout(recuperarSeQuebrou, 1200);
    } else {
        window.addEventListener("load", function () { setTimeout(recuperarSeQuebrou, 1200); });
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