/* Ajuda compartilhada pelas baterias de cor e de letra.
   Fala "rgb" e "contraste" (WCAG) sem depender de navegador. */
"use strict";

/* "#3d4465" | "#abc" | "rgb(1,2,3)" -> [r,g,b] */
function paraRgb(cor) {
    cor = String(cor || "").trim();
    if (/^#/.test(cor)) {
        let h = cor.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length < 6) return null;
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const m = cor.match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const p = m[1].split(",").map(s => parseFloat(s));
    if (p.length < 3 || p.some(isNaN)) return null;
    return [p[0], p[1], p[2]];
}

const canal = (v) => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

/* luminancia relativa de 0 (preto) a 1 (branco) */
function luminancia(rgb) {
    return 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
}

/* contraste de 1 a 21 (WCAG 2.1) */
function contraste(a, b) {
    const la = luminancia(a), lb = luminancia(b);
    const claro = Math.max(la, lb), escuro = Math.min(la, lb);
    return (claro + 0.05) / (escuro + 0.05);
}

/* true/false para cor que e "clara de verdade" */
const ehClara = (rgb) => luminancia(rgb) > 0.45;
const ehEscura = (rgb) => luminancia(rgb) <= 0.12;

/* var(--nome) -> null (depende do :root, quem chama resolve) */
function ehVariavel(cor) {
    return /^var\(--/.test(String(cor || "").trim());
}

/* todas as cores hex/rgb de um texto CSS */
function coresDo(texto) {
    const achadas = [];
    const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g;
    let m;
    while ((m = re.exec(texto)) !== null) achadas.push(m[0]);
    return achadas;
}

/* le as variaveis do :root (e dos blocos [data-theme="x"]) */
function variaveisDe(css) {
    const mapa = {};
    const re = /(:root|\[data-theme="[^"]+"\])\s*\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(css)) !== null) {
        const bloco = m[1], corpo = m[2];
        const reV = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
        let v;
        while ((v = reV.exec(corpo)) !== null) {
            const chave = bloco + " " + v[1].toLowerCase();
            if (mapa[chave] === undefined) mapa[chave] = v[2].trim();
        }
    }
    return mapa;
}

/* resolve var(--x) numa variavel, com ate 3 niveis */
function resolver(valor, mapa, bloco) {
    let v = String(valor || "").trim();
    for (let i = 0; i < 3; i++) {
        const m = v.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,([^)]*))?\)$/i);
        if (!m) break;
        const achado = mapa[bloco + " " + m[1].toLowerCase()] || mapa[":root " + m[1].toLowerCase()];
        if (achado === undefined) return m[2] ? m[2].trim() : null;
        v = achado;
    }
    return v;
}

module.exports = { paraRgb, luminancia, contraste, ehClara, ehEscura, ehVariavel, coresDo, variaveisDe, resolver };
