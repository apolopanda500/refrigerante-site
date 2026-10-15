/* ============================================
   SERVICE WORKER - APP DO CLIENTE
   Deixa o site instalavel no celular e abre
   mesmo sem internet (usa a ultima versao salva).

   Regras que evitam "erro de cache" no Android:
   - o nome do cache tem versao: trocar de versao
     apaga o cache antigo inteiro (activate)
   - os arquivos sao guardados SEM o ?v=..., para
     nao criar uma copia nova a cada publicacao
   - se a versao nova nao baixou ainda, o app usa
     a copia antiga do mesmo arquivo em vez de ficar
     em branco
   ============================================ */
var VERSAO = "convencao-v4";
var BASE = "convencao-cache-v4";

/* o essencial para o app abrir rapido e funcionar offline
   (sem ?v=... de proposito: um arquivo = uma entrada no cache) */
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
    "firebase-appcheck.js",
    "versao.txt",
    "catalogo.json",
    "manifest.json",
    "img/icon-192.png",
    "img/icon-512.png"
];

/*paginas que NAO entram no app do cliente
   (o vendedor usa no celular dele, nao o cliente)*/
var NAO_CACHEIA = ["admin.html", "telegram.js", "manifest-vendedor.json", "produtos_ref.html"];

self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(BASE).then(function (cache) {
            /* um a um: se UM arquivo faltar, os outros ainda salvam */
            return Promise.all(ESSENCIAL.map(function (u) {
                return cache.add(new Request(u, { cache: "reload" })).catch(function () { });
            }));
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (chaves) {
            /* apaga TODO cache que nao seja o atual (inclusive os antigos v3) */
            return Promise.all(chaves.map(function (c) {
                if (c !== BASE) return caches.delete(c);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

/* procura no cache ignorando o ?v=... (ex.: style.css?v=20261014r) */
function pegarIgnorandoQuery(cache, req) {
    if (cache) return cache.match(req);
    var alvo = new URL(req.url).pathname;
    return caches.open(BASE).then(function (c) {
        return c.keys().then(function (chaves) {
            for (var i = 0; i < chaves.length; i++) {
                if (new URL(chaves[i].url).pathname === alvo) return c.match(chaves[i]);
            }
            return null;
        });
    });
}

self.addEventListener("fetch", function (e) {
    var req = e.request;
    if (req.method !== "GET") return;

    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;   // ignora fora do site (fontes, APIs)

    /* o painel do vendedor nunca entra no cache do cliente */
    for (var i = 0; i < NAO_CACHEIA.length; i++) {
        if (url.pathname.indexOf(NAO_CACHEIA[i]) >= 0) return;
    }

    /* paginas: tenta a rede primeiro (precos/pedidos novos), cai no cache */
    if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") >= 0) {
        e.respondWith(
            fetch(req).then(function (resp) {
                var copia = resp.clone();
                caches.open(BASE).then(function (c) { c.put(req, copia); });
                return resp;
            }).catch(function () {
                return caches.match(req).then(function (r) {
                    return r || caches.match("index.html").then(function (p) {
                        return p || new Response("<h1>Sem internet</h1><p>Abra o app de novo quando a conexao voltar.</p>",
                            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });
                    });
                });
            })
        );
        return;
    }

    /* arquivos (css, js, json, imagens):
       mostra o que ja tem e atualiza em segundo plano (stale-while-revalidate).
       se ainda nao tem nada guardado, busca na rede; se a rede falhar,
       tenta o mesmo arquivo de uma versao antiga em vez de deixar em branco. */
    e.respondWith(
        caches.open(BASE).then(function (cache) {
            return cache.match(req).then(function (cacheado) {
                var rede = fetch(req).then(function (resp) {
                    if (resp && resp.ok) {
                        var copia = resp.clone();
                        cache.put(req, copia);
                        /* guarda tambem sem o ?v=..., para o app funcionar
                           mesmo antes de a pagina nova terminar de baixar */
                        cache.put(new Request(url.pathname), copia.clone());
                    }
                    return resp;
                }).catch(function () {
                    return pegarIgnorandoQuery(cache, req).then(function (antigo) {
                        return antigo || new Response("", { status: 504, statusText: "offline" });
                    });
                });
                return cacheado || rede;
            });
        })
    );
});