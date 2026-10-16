/* ============================================
   SERVICE WORKER - APP DO CLIENTE (reconstruido)
   Site leve, offline-first e sem tela branca.

   Estrategia:
   - Assets (CSS, JS, imagens): cache-first. Se estiver no cache, usa direto.
     Sem espera de rede, sem tela branca.
   - Paginas (HTML): rede primeiro com timeout curto (3 s). Se a internet
     responder, mostra a versao publicada. Se nao, cai no cache.
   - Ativacao: apaga caches antigos imediatamente. Nao espera "90% completo".
   - Ctrl+F5 / limpar cache: ignora o service worker cache e vai direto na rede.
   ============================================ */

var VERSAO = "20261016j";
var BASE = "convencao-cache-" + VERSAO;
/* 3 s: tempo maximo de espera pela rede antes de usar o cache */
var LIMITE_MS = 3000;

var ESSENCIAL = [
    "./",
    "index.html",
    "carrinho.html",
    "checkout.html",
    "perfil.html",
    "meus-pedidos.html",
    "pedido-sucesso.html",
    "configuracoes.html",
    "style.css",
    "theme.js",
    "conta.js",
    "loja.js",
    "script.js",
    "app.js",
    "app-update.js",
    "ia.js",
    "central.js",
    "firebase-appcheck.js",
    "versao.txt",
    "catalogo.json",
    "manifest.json",
    "img/icon-192.png",
    "img/icon-512.png",
    "img/608VERDE.jpg",
    "img/608AZUL.jpeg"
];

/* paginas que NAO entram no cache do cliente */
var NAO_CACHEIA = ["admin.html", "telegram.js", "manifest-vendedor.json", "produtos_ref.html"];

function pathnameOf(req) {
    try { return new URL(req.url).pathname; } catch (e) { return ""; }
}

function estaNaLista(lista, caminho) {
    for (var i = 0; i < lista.length; i++) {
        if (caminho.indexOf(lista[i]) >= 0) return true;
    }
    return false;
}

function ehPagina(req) {
    var mode = req.mode;
    var accept = req.headers.get("accept") || "";
    return (mode === "navigate") || (accept.indexOf("text/html") >= 0);
}

function forcarRede(req) {
    return (req.cache === "reload")
        || ((req.headers.get("cache-control") || "").indexOf("no-cache") >= 0)
        || ((req.headers.get("pragma") || "").indexOf("no-cache") >= 0);
}

/* rede com prazo curto: se nao responder em LIMITE_MS, resolve com timeout */
function redeComPrazo(req) {
    return new Promise(function (resolve) {
        var respondido = false;
        var timer = setTimeout(function () {
            if (!respondido) { respondido = true; resolve({ timeout: true }); }
        }, LIMITE_MS);
        fetch(req).then(function (resp) {
            if (respondido) return;
            respondido = true;
            clearTimeout(timer);
            resolve({ timeout: false, resp: resp });
        }).catch(function () {
            if (respondido) return;
            respondido = true;
            clearTimeout(timer);
            resolve({ timeout: false, erro: true });
        });
    });
}

self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(BASE).then(function (cache) {
            return Promise.all(ESSENCIAL.map(function (u) {
                return cache.add(new Request(u, { cache: "no-cache" })).catch(function () { });
            }));
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (chaves) {
            /* apaga TODOS os caches antigos imediatamente */
            return Promise.all(chaves.map(function (c) {
                if (c !== BASE) return caches.delete(c);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener("message", function (e) {
    var dados = (e && e.data) || {};
    if (dados.type === "SKIP_WAITING") self.skipWaiting();
    if (dados.type === "LIMPAR_CACHE" && typeof caches !== "undefined") {
        e.waitUntil(caches.keys().then(function (chaves) {
            return Promise.all(chaves.map(function (c) { return caches.delete(c); }));
        }).then(function () { return self.clients.claim(); }));
    }
});

self.addEventListener("fetch", function (e) {
    var req = e.request;
    if (req.method !== "GET") return;

    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    /* painel do vendedor nunca entra no cache do cliente */
    if (estaNaLista(NAO_CACHEIA, pathnameOf(req))) return;

    var caminho = pathnameOf(req);
    var pagina = ehPagina(req);
    var forcado = forcarRede(req);

    e.respondWith(
        caches.open(BASE).then(function (cache) {
            return cache.match(req).then(function (cacheRes) {
                /* se e recarga forcada, ignora cache e vai na rede */
                if (forcado) {
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var copia = r.resp.clone();
                            cache.put(req, copia);
                            if (!pagina) cache.put(new Request(caminho), copia.clone());
                            return r.resp;
                        }
                        return cacheRes || new Response("", { status: 504, statusText: "offline" });
                    });
                }

                /* NAO e paginas: cache-first (nao espera rede) */
                if (!pagina) {
                    if (cacheRes) return cacheRes;
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var copia = r.resp.clone();
                            cache.put(req, copia);
                            cache.put(new Request(caminho), copia.clone());
                            return r.resp;
                        }
                        return cacheRes || new Response("", { status: 504, statusText: "offline" });
                    });
                }

                /* e pagina: rede primeiro com timeout curto, depois cache */
                return redeComPrazo(req).then(function (r) {
                    if (!r.timeout && r.resp && r.resp.ok) {
                        var copia = r.resp.clone();
                        cache.put(req, copia);
                        return r.resp;
                    }
                    if (cacheRes) return cacheRes;
                    /* nem na rede nem no cache: mostra index.html como fallback */
                    return cache.match("index.html").then(function (p) {
                        if (p) return p;
                        return new Response(
                            "<h1>Sem internet</h1><p>Abra o app de novo quando a conexao voltar.</p>",
                            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }
                        );
                    });
                });
            });
        })
    );
});