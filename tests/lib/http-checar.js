/* lib/http-checar.js - confere se um link externo responde
   --------------------------------------------------
   O site oficial dos produtos (entregaaki) pede cookie de sessao: sem ele
   o fetch entra em laco de redirect e o link era dado como quebrado
   quando estava no ar. Aqui seguimos os redirects na mao e guardamos o
   cookie, do mesmo jeito que o robo do catalogo faz
   (.github/scripts/sync-catalogo.js).

   uso:  node tests/lib/http-checar.js <url>
   sai:  o codigo HTTP (ou 0 se nao respondeu) */
let cookie = "";

function requisitar(url, tentativas) {
    tentativas = tentativas || 0;
    const headers = {
        "user-agent": "Mozilla/5.0 (compatible; confere-links-convencao)",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9"
    };
    if (cookie) headers.cookie = cookie;

    return fetch(url, { redirect: "manual", headers: headers }).then(function (r) {
        const sc = (r.headers.getSetCookie ? r.headers.getSetCookie() : []) || [];
        if (sc.length) cookie = sc.map(function (c) { return c.split(";")[0]; }).join("; ");
        if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
            if (tentativas >= 6) throw new Error("redirect demais");
            return requisitar(new URL(r.headers.get("location"), url).href, tentativas + 1);
        }
        return r;
    });
}

requisitar(process.argv[2])
    .then(function (r) { console.log(r.status); })
    .catch(function () { console.log(0); })
    /* process.exit: o keep-alive do fetch segura o processo vivo e quem
       chama (manter-tudo) estoura o tempo limite esperando ele sair */
    .then(function () { process.exit(0); });