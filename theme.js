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

        // Tema: claro | guara | rosa | vermelho | dark  (ou o interruptor antigo)
        var tema = p.cfgTema;
        if (!tema) tema = p.cfgModoEscuro ? "dark" : "claro";
        if (tema === "chopp") tema = "rosa";   // tema azul saiu do ar -> rosa
        if (tema === "claro") { h.removeAttribute("data-theme"); if (b) b.removeAttribute("data-theme"); }
        else { h.setAttribute("data-theme", tema); if (b) b.setAttribute("data-theme", tema); }

        // Animate? — controla a animacao
        if (p.cfgReducedMotion) { h.setAttribute("data-motion", "reduced"); if (b) b.setAttribute("data-motion", "reduced"); }
        else { h.removeAttribute("data-motion"); if (b) b.removeAttribute("data-motion"); }

        // Tamanho da fonte
        var tam = p.cfgFonteTamanho || "normal";
        if (tam !== "normal") { h.setAttribute("data-fonte", tam); if (b) b.setAttribute("data-fonte", tam); }
        else { h.removeAttribute("data-fonte"); if (b) b.removeAttribute("data-fonte"); }

        // Leitura das tabelas: horizontal (padrao) ou vertical (empilhada).
        // O painel usa as regras proprias (cartao com rotulo); o cliente
        // usa as da loja. Aplicado no <html> e no <body> conforme o lado.
        if ((p.cfgLeitura || "horizontal") === "vertical") { h.setAttribute("data-leitura", "vertical"); if (b) b.setAttribute("data-leitura", "vertical"); }
        else { h.removeAttribute("data-leitura"); if (b) b.removeAttribute("data-leitura"); }

        // Alto contraste
        if (p.cfgAltoContraste) { h.setAttribute("data-contraste", "alto"); if (b) b.setAttribute("data-contraste", "alto"); }
        else { h.removeAttribute("data-contraste"); if (b) b.removeAttribute("data-contraste"); }

        // Modo compacto (tela mais fechada, menos rolagem).
        // Precisa LIGAR e DESLIGAR: se o atributo nao for removido,
        // o botao so liga e a tela fica compacta para sempre.
        if (p.cfgCompacto === true || p.cfgCompacto === "1") { h.setAttribute("data-layout", "compacto"); if (b) b.setAttribute("data-layout", "compacto"); }
        else { h.removeAttribute("data-layout"); if (b) b.removeAttribute("data-layout"); }

        // Ver imagens dos produtos
        if (p.cfgVerImagens === false) { h.setAttribute("data-imagens", "ocultas"); if (b) b.setAttribute("data-imagens", "ocultas"); }
        else { h.removeAttribute("data-imagens"); if (b) b.removeAttribute("data-imagens"); }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", aplicar);
    } else { aplicar(); }

    window.addEventListener("storage", aplicar);
    window.aplicarTema = aplicar;
})();
