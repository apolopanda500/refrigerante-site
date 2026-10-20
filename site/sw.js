/* ============================================
   SERVICE WORKER - APP DO CLIENTE (reconstruido v3 - CORRECAO ERR_FAILED)
   Corrigido: nao causa mais ERR_FAILED nas paginas.
    - Timeout reduzido para 3 s (era 8 s, causava travamento)
    - Imagens: rede primeiro com timeout curto, depois cache
    - CSS/JS essenciais: cache-first (instantaneo)
    - Paginas HTML: rede primeiro com timeout curto, depois cache
    - Ativacao: apaga caches antigos imediatamente
   ============================================ */

var VERSAO = "20261020c";
var BASE = "convencao-cache-" + VERSAO;
/* 8 s: tempo maximo de espera pela rede antes de cair no cache.
   No 4G a rede frequentemente passa de 3 s, entao um prazo curto demais
   fazia a pagina falhar antes da resposta chegar. */
var LIMITE_MS = 8000;

var ESSENCIAL = [
    "./",
    "index.html",
    "carrinho.html",
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
                if (forcado) {
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var c1 = r.resp.clone();
                            var c2 = r.resp.clone();
                            cache.put(req, c1);
                            if (!pagina) cache.put(new Request(caminho), c2);
                            return r.resp;
                        }
                        return cacheRes || pegarEmQualquerCache(req).then(function (qualquer) {
                            return qualquer || new Response("", { status: 504, statusText: "offline" });
                        });
                    });
                }

                if (imagem) {
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var c1 = r.resp.clone();
                            var c2 = r.resp.clone();
                            cache.put(req, c1);
                            cache.put(new Request(caminho), c2);
                            return r.resp;
                        }
                        if (cacheRes) return cacheRes;
                        return new Response("", { status: 204, statusText: "no content" });
                    });
                }

                if (!pagina) {
                    if (cacheRes) return cacheRes;
                    return redeComPrazo(req).then(function (r) {
                        if (!r.timeout && r.resp && r.resp.ok) {
                            var c1 = r.resp.clone();
                            var c2 = r.resp.clone();
                            cache.put(req, c1);
                            cache.put(new Request(caminho), c2);
                            return r.resp;
                        }
                        return cacheRes || pegarEmQualquerCache(req).then(function (qualquer) {
                            return qualquer || new Response("", { status: 504, statusText: "offline" });
                        });
                    });
                }

                return redeComPrazo(req).then(function (r) {
                    if (!r.timeout && r.resp && r.resp.ok) {
                        var copia = r.resp.clone();
                        cache.put(req, copia);
                        return r.resp;
                    }
                    if (cacheRes) return cacheRes;
                    /* a PROPRIA pagina, se ela ja foi visitada antes */
                    return cache.match(caminho).then(function (minha) {
                        if (minha) return minha;
                        return cache.match("index.html");
                    }).then(function (p) {
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

function pegarEmQualquerCache(req) {
    return caches.match(req).then(function (achou) {
        if (achou) return achou;
        var alvo = new URL(req.url).pathname;
        return caches.keys().then(function (nomes) {
            var resto = nomes.filter(function (n) { return n !== BASE; });
            return resto.reduce(function (corrente, nome) {
                return corrente.then(function (res) {
                    if (res) return res;
                    return caches.open(nome).then(function (c) {
                        return c.keys().then(function (chaves) {
                            for (var i = 0; i < chaves.length; i++) {
                                if (new URL(chaves[i].url).pathname === alvo) return c.match(chaves[i]);
                            }
                            return null;
                        });
                    }).catch(function () { return null; });
                });
            }, Promise.resolve(null));
        });
    }).catch(function () { return null; });
}