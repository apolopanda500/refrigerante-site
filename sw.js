/* ============================================
   SERVICE WORKER - APP DO CLIENTE
   Deixa o site instalavel no celular e abre
   mesmo sem internet (usa a ultima versao salva).

   Como o cache foi corrigido (a pagina Historico
   ficava mostrando versao antiga depois do Ctrl+F5):

   - o nome do cache leva a VERSAO do site. Publicou
     versao nova? o cache novo tem outro nome, o
     activate apaga o antigo inteiro e nao sobra
     arquivo velho misturado
   - quem manda e a REDE (network first): a pagina
     mostra sempre a versao publicada. O cache so
     entra se a internet nao responder em 3 s
   - recarga forçada (Ctrl+F5 / Shift+Recarregar /
     "Limpar cache") nunca usa o cache: o navegador
     manda Cache-Control: no-cache e a gente obedece
   - os arquivos sao guardados SEM o ?v=..., para
     nao criar uma copia nova a cada publicacao
   ============================================ */

/* precisa bater com a versao do site: o bump-versao.js troca os dois */
var VERSAO = "20261016e";
var BASE = "convencao-cache-" + VERSAO;
var LIMITE_MS = 3000;          /* tempo de espera antes de cair no cache */

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

/* rede com prazo: se a internet nao responder em LIMITE_MS, cai no cache
   (o app abre rapido offline sem ficar esperando eternamente) */
function redeComPrazo(req) {
    return new Promise(function (resolve) {
        var respondeu = false;
        var timer = setTimeout(function () {
            if (!respondido) { respondeu = true; resolve({ timeout: true }); }
        }, LIMITE_MS);
        fetch(req).then(function (resp) {
            if (respondido) return;
            respondeu = true;
            clearTimeout(timer);
            resolve({ timeout: false, resp: resp });
        }).catch(function () {
            if (respondido) return;
            respondeu = true;
            clearTimeout(timer);
            resolve({ timeout: false, erro: true });
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

    /* recarga forcada (Ctrl+F5 / Shift+Recarregar / Limpar cache): o
       navegador marca o pedido com cache:reload ou Cache-Control:no-cache.
       A rede e pasada adiante como veio, entao o proprio HTTP cache tambem
       e ignorado. E so o cache do app que a gente NAO usa como resposta
       neste caso, para o Ctrl+F5 nunca devolver versao velha. */
    var forcarRede = (req.cache === "reload")
        || ((req.headers.get("cache-control") || "").indexOf("no-cache") >= 0)
        || ((req.headers.get("pragma") || "").indexOf("no-cache") >= 0);

    var ehPagina = (req.mode === "navigate") || ((req.headers.get("accept") || "").indexOf("text/html") >= 0);

    /* pagina e arquivo sao tratados do mesmo jeito: rede primeiro,
       cache so quando a internet nao responde */
    e.respondWith(
        redeComPrazo(req).then(function (r) {
            if (!r.timeout && r.resp && r.resp.ok) {
                var copia = r.resp.clone();
                caches.open(BASE).then(function (c) {
                    c.put(req, copia);
                    /* guarda tambem sem o ?v=..., para o app funcionar
                       mesmo antes de a pagina nova terminar de baixar */
                    if (!ehPagina) c.put(new Request(url.pathname), copia.clone());
                });
                return r.resp;
            }
            /* sem rede: o app continua com a copia guardada */
            return caches.open(BASE).then(function (cache) {
                return pegarIgnorandoQuery(cache, req).then(function (antigo) {
                    if (antigo) return antigo;
                    /* nada guardado: arquivo some, pagina mostra o aviso */
                    if (!ehPagina) return new Response("", { status: 504, statusText: "offline" });
                    if (forcarRede) return new Response("", { status: 504, statusText: "offline" });
                    return caches.match("index.html").then(function (p) {
                        return p || new Response("<h1>Sem internet</h1><p>Abra o app de novo quando a conexao voltar.</p>",
                            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 });
                    });
                });
            });
        })
    );
});
