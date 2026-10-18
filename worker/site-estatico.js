/* SITE ESTATICO DA LOJA NO CLOUDFLARE
   O GitHub Pages nao serve repositorio privado no plano gratuito: com o
   repositorio privado, o site inteiro caia (404). Este worker serve o site
   sem depender do GitHub, entao o codigo pode ficar privado a vontade.

   E um servidor de arquivos bem simples: pega o caminho, acha o arquivo,
   devolve. Sem lista de regras, sem banco, sem nada que guarde dado de
   cliente. O que muda em relacao ao GitHub Pages e so isto:
     - sem "/" no caminho -> tenta index.html
     - .html e .json sao servidos com o tipo certo
     - quem nao achar o arquivo recebe uma pagina 404 simples (nao o
       painel do GitHub, que ficava parecendo que o site era do GitHub)
*/
const TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".webp": "image/webp"
};
const RAIZ = "/refrigerante-site/";

function tipoDe(nome) {
    const i = nome.lastIndexOf(".");
    return i < 0 ? "application/octet-stream" : (TIPOS[nome.slice(i).toLowerCase()] || "application/octet-stream");
}

export default {
    async fetch(req, env) {
        const url = new URL(req.url);
        /* o site antigo e /refrigerante-site/: quem chegou pelo endereco
           antigo continua funcionando */
        let caminho = decodeURIComponent(url.pathname);
        if (caminho.startsWith(RAIZ)) caminho = caminho.slice(RAIZ.length);
        caminho = caminho.replace(/^\/+/, "");
        if (!caminho || caminho.endsWith("/")) caminho += "index.html";
        /* nada de subir coisa de dentro do site para fora */
        if (caminho.includes("..") || caminho.startsWith(".")) caminho = "index.html";

/* o binding entrega a partir da raiz dos arquivos do site */
        const chave = "/" + caminho;
        const arquivo = await env.ASSETS.fetch(new Request(new URL(chave, url.origin), req));
        if (arquivo.status === 404 && !caminho.endsWith(".html")) {
            /* /qualquer-coisa -> tenta /qualquer-coisa.html (endereco sem .html) */
            const outro = await env.ASSETS.fetch(new Request(new URL(chave + ".html", url.origin), req));
            if (outro.status !== 404) return responder(outro, req, caminho + ".html");
        }
        if (arquivo.status === 404) return naoEncontrado(req);
        return responder(arquivo, req, caminho);
    }
};

function responder(arquivo, req, nome) {
    const novo = new Response(arquivo.body, arquivo);
    novo.headers.set("Content-Type", tipoDe(nome || "index.html"));
    /* O app muda o nome do cache a cada versao, entao pode guardar o arquivo
       estatico no navegador (a proxima pagina abre instantanea). Quem manda
       no "quero a versao nova" e o proprio app, pela lista do service
       worker - nao o cache do navegador. */
    if (req.method === "GET" && !/\.(png|jpg|jpeg|ico|webp|svg)$/i.test(nome)) {
        novo.headers.set("Cache-Control", "public, max-age=300");
    }
    /* o service worker tem que poder controlar o site inteiro */
    novo.headers.set("Service-Worker-Allowed", "/");
    return novo;
}

function naoEncontrado(req) {
    const corpo = "<!doctype html><meta charset='utf-8'><title>Pagina nao encontrada</title>"
        + "<body style='font-family:sans-serif;padding:40px;text-align:center'>"
        + "<h1>Pagina nao encontrada</h1>"
        + "<p><a href='/'>Voltar para a loja</a></p></body>";
    return new Response(corpo, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
}