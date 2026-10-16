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

        // Tema: claro | guara | rosa | vermelho | dark  (ou o interruptor antigo)
        var tema = p.cfgTema;
        if (!tema) tema = p.cfgModoEscuro ? "dark" : "claro";
        if (tema === "chopp") tema = "rosa";   // tema azul saiu do ar -> rosa
        if (tema === "claro") h.removeAttribute("data-theme");
        else h.setAttribute("data-theme", tema);

        // Animate? — controla a animacao
        if (p.cfgReducedMotion) h.setAttribute("data-motion", "reduced");
        else h.removeAttribute("data-motion");

        // Tamanho da fonte
        var tam = p.cfgFonteTamanho || "normal";
        if (tam !== "normal") h.setAttribute("data-fonte", tam);
        else h.removeAttribute("data-fonte");

        // Leitura das tabelas: horizontal (padrao) ou vertical (empilhada)
        // SO no site do cliente: no painel as colunas ficam embaralhadas.
        if (!ehPainel() && (p.cfgLeitura || "horizontal") === "vertical") h.setAttribute("data-leitura", "vertical");
        else h.removeAttribute("data-leitura");

        // Alto contraste
        if (p.cfgAltoContraste) h.setAttribute("data-contraste", "alto");
        else h.removeAttribute("data-contraste");

        // Modo compacto
/* ------ compacto desativado globalmente para evitar conflito com tema ------ */
/* if (p.cfgCompacto) h.setAttribute("data-layout", "compacto"); else h.removeAttribute("data-layout"); */

        // Ver imagens dos produtos
        if (p.cfgVerImagens === false) h.setAttribute("data-imagens", "ocultas");
        else h.removeAttribute("data-imagens");

        // Banner de avisos/ofertas
        var bd = document.getElementById("avisosOferta");
        if (bd) bd.style.display = p.cfgNotifPromo ? "" : "none";
    }

    // Aviso de ofertas (aparece em todas as telas do CLIENTE)
    // O painel do vendedor nao usa: la atrapalha a lista de pedidos.
    function avisoOferta() {
        if (ehPainel()) return;
        var p = prefs();
        if (!p.cfgNotifPromo) return;
        if (sessionStorage.getItem("avisoOfertado")) return;
        if (document.getElementById("avisosOferta")) return;

        var box = document.createElement("div");
        box.id = "avisosOferta";
        box.className = "aviso-oferta";
        box.innerHTML =
            '<i class="fa fa-bullhorn"></i>'
            + '<span><b>Oferta da semana!</b> Frete grátis acima de R$ 150 em toda a região.</span>'
            + '<button class="ao-fechar" aria-label="Fechar">&times;</button>';
        box.querySelector(".ao-fechar").addEventListener("click", function () {
            box.remove();
            try { sessionStorage.setItem("avisoOfertado", "1"); } catch (e) {}
        });
        document.body.appendChild(box);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { aplicar(); avisoOferta(); });
    } else { aplicar(); avisoOferta(); }

    window.addEventListener("storage", aplicar);
    window.aplicarTema = aplicar;
})();
