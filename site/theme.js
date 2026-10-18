// ============================================
//  Aplica as configuracoes salvas em TODAS as paginas
//  Roda antes da pagina pintar, para nao piscar
// ============================================
(function () {
    /* o PAINEL DO VENDEDOR tem preferencias PROPIAS (vendedorPrefs):
       tema/comandos escolhidos no painel nunca mexem no site do
       cliente e vice-versa. Na primeira visita o painel copia o que
       ja existia, para nao mudar de cara. */
    function ehPainel() {
        try { return /admin\.html$/i.test(location.pathname || ""); }
        catch (e) { return false; }
    }
    /* O PAINEL NAO HERDA A CARA DO CLIENTE.
       Antes o painel copiava a preferencia do cliente na primeira
       visita - ai mexer no tema/tamanho da loja mudava o painel
       tambem. Agora o painel nasce com a configuracao dele
       (escuro) e so aproveita do cliente o que NAO e visual:
       conexao do bot e URL do banco de precos. */
    function migrarPainel() {
        if (!ehPainel()) return;
        try {
            if (localStorage.getItem("vendedorPrefs")) return;
            var cliente = {};
            try { cliente = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); } catch (e) {}
            /* o painel abre no escuro: e a tela de trabalho do dono. */
var painel = { cfgTema: "dark", cfgFonteTamanho: "normal", cfgLeitura: "horizontal" };
            ["cfgTelegramToken", "cfgTelegramChatId", "cfgBotComandos", "cfgPrecosURL"].forEach(function (k) {
                if (cliente[k] !== undefined) painel[k] = cliente[k];
            });
            localStorage.setItem("vendedorPrefs", JSON.stringify(painel));
        } catch (e) {}
    }
    function chavePrefs() { return ehPainel() ? "vendedorPrefs" : "refrigerantePrefs"; }
    function prefs() {
        migrarPainel();
        try { return JSON.parse(localStorage.getItem(chavePrefs()) || "{}"); }
        catch (e) { return {}; }
    }

    function aplicar() {
        var p = prefs();
        var h = document.documentElement;
        var b = document.body;

        // O painel do vendedor (body.admin[data-...]) e os cartoes do
        // cliente (body[data-...]) leem o <body>; as tabelas da loja
        // (html[data-...]) leem o <html>. Grava nos DOIS para o modo
        // escolhido valer em todas as paginas e em todas as tabelas.

// Tema: claro | guara | rosa | vermelho | dark
        var tema = p.cfgTema;
        var temasBoa = ["claro", "guara", "rosa", "vermelho", "dark"];
        if (temasBoa.indexOf(tema) < 0) tema = "claro";
        if (tema === "chopp") tema = "rosa";   // tema azul saiu do ar -> rosa
        if (tema === "claro") { h.removeAttribute("data-theme"); if (b) b.removeAttribute("data-theme"); }
        else { h.setAttribute("data-theme", tema); if (b) b.setAttribute("data-theme", tema); }

        // Animacao: a opcao saiu da tela (o dono pediu menos botoes). O
        // site fica sempre com as animacoes normais, e a preferencia
        // antiga, se ainda estiver salva no aparelho, e descartada aqui.
        h.removeAttribute("data-motion"); if (b) b.removeAttribute("data-motion");

        // Tamanho da fonte
        var tam = p.cfgFonteTamanho || "normal";
        if (tam !== "normal") { h.setAttribute("data-fonte", tam); if (b) b.setAttribute("data-fonte", tam); }
        else { h.removeAttribute("data-fonte"); if (b) b.removeAttribute("data-fonte"); }

        // Leitura das tabelas: horizontal (padrao) ou vertical (empilhada).
        // O painel usa as regras proprias (cartao com rotulo); o cliente
        // usa as da loja. Aplicado no <html> e no <body> conforme o lado.
        if ((p.cfgLeitura || "horizontal") === "vertical") { h.setAttribute("data-leitura", "vertical"); if (b) b.setAttribute("data-leitura", "vertical"); }
        else { h.removeAttribute("data-leitura"); if (b) b.removeAttribute("data-leitura"); }

        // Alto contraste, tela compacta e fotos dos produtos: as tres
        // opcoes sairam da tela. O site fica sempre no visual normal,
        // com as fotos aparecendo - e a preferencia antiga que ainda
        // estiver salva no aparelho e descartada aqui.
        h.removeAttribute("data-contraste"); if (b) b.removeAttribute("data-contraste");
        h.removeAttribute("data-layout"); if (b) b.removeAttribute("data-layout");
        h.removeAttribute("data-imagens"); if (b) b.removeAttribute("data-imagens");
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", aplicar);
    } else { aplicar(); }

    window.addEventListener("storage", aplicar);
    window.aplicarTema = aplicar;
})();
