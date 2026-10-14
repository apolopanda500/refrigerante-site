/* ============================================
   SERVICE WORKER - APP DO CLIENTE
   Deixa o site instalavel no celular e abre
   mesmo sem internet (usa a ultima versao salva).
   ============================================ */
var VERSAO = "convencao-v3";
var BASE = "convencao-cache-v3";

/* o essencial para o app abrir rapido e funcionar offline */
var ESSENCIAL = [
    "./",
    "index.html",
    "carrinho.html",
    "checkout.html",
    "perfil.html",
    "meus-pedidos.html",
    "pedido-sucesso.html",
    "configuracoes.html",
    "style.css?v=20261014g",
    "theme.js?v=20261014g",
    "conta.js?v=20261014g",
    "loja.js?v=20261014g",
    "script.js?v=20261014g",
    "app.js?v=20261014g",
    "app-update.js?v=20261014g",
    "telegram.js?v=20261014g",
    "versao.txt",
    "catalogo.json",
    "manifest.json",
    "manifest-vendedor.json",
    "admin.html",
    "img/icon-192.png",
    "img/icon-512.png",
    "img/icon-192-vendedor.png",
    "img/icon-512-vendedor.png"
];

self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(BASE).then(function (cache) {
            // addAll falha inteiro se um arquivo faltar;_adiciona um a um
            return Promise.all(ESSENCIAL.map(function (u) {
                return cache.add(u).catch(function () { });
            }));
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (chaves) {
            return Promise.all(chaves.map(function (c) {
                if (c !== BASE) return caches.delete(c);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener("fetch", function (e) {
    var req = e.request;
    if (req.method !== "GET") return;

    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;   // ignora fora do site (ex.: fontes, APIs)

    /* paginas: tenta a rede primeiro (precos/pedidos novos), cai no cache */
    if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") >= 0) {
        e.respondWith(
            fetch(req).then(function (resp) {
                var copia = resp.clone();
                caches.open(BASE).then(function (c) { c.put(req, copia); });
                return resp;
            }).catch(function () {
                return caches.match(req).then(function (r) { return r || caches.match("index.html"); });
            })
        );
        return;
    }

    /* arquivos (css, js, imagens): cache primeiro e atualiza em segundo plano */
    e.respondWith(
        caches.match(req).then(function (cacheado) {
            var rede = fetch(req).then(function (resp) {
                if (resp && resp.ok) {
                    var copia = resp.clone();
                    caches.open(BASE).then(function (c) { c.put(req, copia); });
                }
                return resp;
            }).catch(function () { return cacheado; });
            return cacheado || rede;
        })
    );
});