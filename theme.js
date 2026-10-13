// Aplica o tema salvo em TODAS as paginas (roda antes do render)
(function () {
    function prefs() {
        try { return JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); }
        catch (e) { return {}; }
    }
    function aplicar() {
        var p = prefs();
        if (p.cfgModoEscuro) document.documentElement.setAttribute("data-theme", "dark");
        else document.documentElement.removeAttribute("data-theme");

        if (p.cfgReducedMotion) document.documentElement.setAttribute("data-motion", "reduced");
        else document.documentElement.removeAttribute("data-motion");
    }
    aplicar();
    window.addEventListener("storage", aplicar);
    window.aplicarTema = aplicar;
})();
