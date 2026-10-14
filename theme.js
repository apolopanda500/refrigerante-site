// ============================================
//  Aplica as configuracoes salvas em TODAS as paginas
//  Roda antes da pagina pintar, para nao piscar
// ============================================
(function () {
    function prefs() {
        try { return JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); }
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

    // Aviso de ofertas (aparece em todas as telas)
    function avisoOferta() {
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
