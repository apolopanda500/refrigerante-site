/* ============================================
   SERVICE WORKER - APP DO CLIENTE (reconstruido v2)
    - Imagens: rede primeiro com timeout curto, depois cache (sempre tenta mostrar a imagem nova)
    - CSS/JS essenciais: cache-first (instantaneo, sem espera de rede)
    - Paginas HTML: rede primeiro com timeout curto, depois cache
    - Ativacao: apaga caches antigos imediatamente
    - Ctrl+F5 / limpar cache: ignora cache e vai direto na rede
   ============================================ */

var VERSAO = "20261016k";
var BASE = "convencao-cache-" + VERSAO;
/* 8 s: tempo maximo de espera pela rede antes de usar o cache.
   No 4G a rede passa de 3 s com facilidade; com 3 s o site caia no cache
   velho (ou vazio) e abria a tela branca depois de publicar. */
var LIMITE_MS = 8000;

/* Arquivos essenciais para abrir o site rapido e funcionar offline */
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
    "img/icon-192-maskable.png",
    "img/icon-512-maskable.png",
    "img/608VERDE.jpg",
    "img/608AZUL.jpeg",
    "img/p01.jpg",
    "img/p02.jpg",
    "img/p03.jpg",
    "img/p04.jpg",
    "img/p05.jpg",
    "img/p06.jpg",
    "img/p07.jpg",
    "img/p08.jpg",
    "img/p09.jpg",
    "img/p10.jpg",
    "img/p11.jpg",
    "img/p12.jpg",
    "img/p13.jpg",
    "img/p14.jpg",
    "img/p15.jpg",
    "img/p16.jpg",
    "img/p17.jpg",
    "img/p18.jpg",
    "img/p19.jpg",
    "img/p20.jpg",
    "img/p21.jpg",
    "img/p22.jpg",
    "img/p23.jpg",
    "img/p24.jpg",
    "img/p25.jpg",
    "img/p26.jpg",
    "img/p27.jpg",
    "img/p28.jpg",
    "img/p29.jpg",
    "img/p30.jpg",
    "img/p31.jpg",
    "img/p32.jpg",
    "img/p33.jpg",
    "img/p34.jpg",
    "img/p35.jpg",
    "img/p36.jpg"
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

function ehImagem(req) {
    var accept = req.headers.get("accept") || "";
    return accept.indexOf("image/") >= 0;
}

function forcarRede(req) {
    return (req.cache === "reload")
        || ((req.headers.get("cache-control") || "").indexOf("no-cache") >= 0)
        || ((req.headers.get("pragma") || "").indexOf("no-cache") >= 0);
}

/* rede com prazo curto */
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

/* ultimo recurso antes de devolver vazio: procura o arquivo em QUALQUER
   cache. Publicou versao nova e o cache antigo ainda nao foi limpo? O
   arquivo pode estar la, e melhor servir ele do que a tela branca. */
function pegarEmQualquerCache(req) {
    return caches.keys().then(function (nomes) {
        return Promise.all(nomes.map(function (n) {
            return caches.open(n).then(function (c) { return c.match(req); });
        })).then(function (achados) {
            return achados.find(function (r) { return r; }) || null;
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

    if (estaNaLista(NAO_CACHEIA, pathnameOf(req))) return;

    var caminho = pathnameOf(req);
    var pagina = ehPagina(req);
    var imagem = ehImagem(req);
    var forcado = forcarRede(req);

    e.respondWith(
        caches.open(BASE).then(function (cache) {
            return cache.match(req).then(function (cacheRes) {
                /* recarga forcada: ignora cache, vai na rede */
                if (forcado) {
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var copia = r.resp.clone();
                            cache.put(req, copia);
                            if (!pagina) cache.put(new Request(caminho), copia.clone());
                            return r.resp;
                        }
                        return cacheRes || pegarEmQualquerCache(req).then(function (qualquer) {
                            return qualquer || new Response("", { status: 504, statusText: "offline" });
                        });
                    });
                }

                /* IMAGENS: rede primeiro (sempre tenta a nova), depois cache */
                if (imagem) {
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var copia = r.resp.clone();
                            cache.put(req, copia);
                            cache.put(new Request(caminho), copia.clone());
                            return r.resp;
                        }
                        /* rede falhou ou timeout: usa o que tiver no cache */
                        if (cacheRes) return cacheRes;
                        /* nada em lugar nenhum: imagem transparente pequena em vez de sumir */
                        return new Response("", { status: 204, statusText: "no content" });
                    });
                }

                /* NAO e paginas (CSS, JS): cache-first (instantaneo) */
                if (!pagina) {
                    if (cacheRes) return cacheRes;
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var copia = r.resp.clone();
                            cache.put(req, copia);
                            cache.put(new Request(caminho), copia.clone());
                            return r.resp;
                        }
                        return cacheRes || pegarEmQualquerCache(req).then(function (qualquer) {
                            return qualquer || new Response("", { status: 504, statusText: "offline" });
                        });
                    });
                }

                /* PAGINAS: rede primeiro com timeout curto, depois cache */
                return redeComPrazo(req).then(function (r) {
                    if (!r.timeout && r.resp && r.resp.ok) {
                        var copia = r.resp.clone();
                        cache.put(req, copia);
                        return r.resp;
                    }
                    if (cacheRes) return cacheRes;
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