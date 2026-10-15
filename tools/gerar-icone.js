/* ============================================================
   GERA O ICONE DO APP/SITE (PNG de verdade, sem programa externo)

   Desenha em memoria e grava o PNG usando o zlib que ja vem
   no Node. Cores e formato seguem a identidade da loja.

   uso:  node tools/gerar-icone.js
   ============================================================ */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const RAIZ = path.resolve(__dirname, "..");

/* ---------- codificador de PNG (RGBA, sem dependencias) ---------- */
function crc32(buf) {
    let c, crc = 0xFFFFFFFF;
    for (let n = 0; n < buf.length; n++) {
        c = (crc ^ buf[n]) & 0xFF;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        crc = c ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(tipo, dados) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dados.length, 0);
    const tipoBuf = Buffer.from(tipo, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([tipoBuf, dados])), 0);
    return Buffer.concat([len, tipoBuf, dados, crc]);
}
function png(largura, altura, rgba) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(largura, 0);
    ihdr.writeUInt32BE(altura, 4);
    ihdr[8] = 8;      /* 8 bits por canal */
    ihdr[9] = 6;      /* RGBA */
    /* cada linha ganha um byte 0 de filtro */
    const linhas = Buffer.alloc((largura * 4 + 1) * altura);
    for (let y = 0; y < altura; y++) {
        linhas[y * (largura * 4 + 1)] = 0;
        rgba.copy(linhas, y * (largura * 4 + 1) + 1, y * largura * 4, (y + 1) * largura * 4);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(linhas, { level: 9 })),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

/* ---------- desenho ---------- */
function novoCanvas(tam) {
    return { tam: tam, px: Buffer.alloc(tam * tam * 4, 0) };
}
function cor(c) {
    return [c[0], c[1], c[2], c.length > 3 ? c[3] : 255];
}
function pinta(canvas, x, y, c, alpha) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= canvas.tam || y >= canvas.tam) return;
    const [r, g, b, a] = cor(c);
    const A = (alpha === undefined ? 1 : alpha) * (a / 255);
    if (A <= 0) return;
    const i = (y * canvas.tam + x) * 4;
    const d = canvas.px;
    const ia = 1 - A;
    d[i] = Math.round(r * A + d[i] * ia);
    d[i + 1] = Math.round(g * A + d[i + 1] * ia);
    d[i + 2] = Math.round(b * A + d[i + 2] * ia);
    d[i + 3] = Math.max(d[i + 3], Math.round(A * 255));
}
function retangulo(canvas, x, y, w, h, c, alpha) {
    for (let j = Math.round(y); j < Math.round(y + h); j++)
        for (let i = Math.round(x); i < Math.round(x + w); i++) pinta(canvas, i, j, c, alpha);
}
function disco(canvas, cx, cy, r, c) {
    for (let j = Math.round(cy - r); j <= Math.round(cy + r); j++)
        for (let i = Math.round(cx - r); i <= Math.round(cx + r); i++) {
            const d = Math.sqrt((i - cx) * (i - cx) + (j - cy) * (j - cy));
            if (d <= r) pinta(canvas, i, j, c, Math.min(1, r - d + 0.5));
        }
}
/* cantinho arredondado (android usa "adaptive icon") */
function quadradoArredondado(canvas, x, y, w, h, r, c) {
    for (let j = Math.round(y); j < Math.round(y + h); j++) {
        for (let i = Math.round(x); i < Math.round(x + w); i++) {
            const dx = Math.max(x + r - i, 0, i - (x + w - r));
            const dy = Math.max(y + r - j, 0, j - (y + h - r));
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= r) pinta(canvas, i, j, c, Math.min(1, r - dist + 0.5));
        }
    }
}

/* ---------- o desenho do icone ----------
   uma garrafinha de refrigerante em cima de um circulo,
   com as cores da loja (azul + vermelho)                  */
function desenhaIcone(tam, corFundo, corLiquido, corGargalo, corTampa) {
    const cv = novoCanvas(tam);
    const u = tam / 100;                 /* 1 unidade = 1% do tamanho */

    /* fundo arredondado */
    quadradoArredondado(cv, 0, 0, tam, tam, 24 * u, corFundo);

    /* sombra suave e oval embaixo (bem discreta) */
    for (let j = 0; j < 7 * u; j++) {
        const alpha = (1 - j / (7 * u)) * 0.16;
        const largura = (48 - j * 2.2) * u;
        retangulo(cv, 50 * u - largura / 2, 77 * u + j, largura, 1 * u, [0, 0, 0, 255], alpha);
    }

    /* gargalo */
    retangulo(cv, 45 * u, 18 * u, 10 * u, 12 * u, corGargalo);
    /* tampa */
    retangulo(cv, 43.5 * u, 15 * u, 13 * u, 4 * u, corTampa);

    /* corpo da garrafa */
    retangulo(cv, 38 * u, 30 * u, 24 * u, 46 * u, [255, 255, 255, 245]);
    /* ombro arredondado do vidro */
    for (let j = 0; j < 6 * u; j++) {
        const largura = 24 * u - j * 2 * u;
        retangulo(cv, 38 * u + j * u, 30 * u + j, largura, 1, [255, 255, 255, 245]);
    }

    /* liquido dentro */
    retangulo(cv, 40 * u, 44 * u, 20 * u, 32 * u, corLiquido);

    /* rotulo no meio */
    retangulo(cv, 40 * u, 52 * u, 20 * u, 13 * u, [255, 255, 255, 255]);
    /* duas listras no rotulo (lembra refrigerante) */
    retangulo(cv, 43 * u, 55 * u, 14 * u, 2.4 * u, corLiquido);
    retangulo(cv, 43 * u, 59 * u, 14 * u, 2.4 * u, corFundo);

    /* gargalo escuro do vidro */
    retangulo(cv, 46.5 * u, 20 * u, 7 * u, 11 * u, corGargalo);

    return png(tam, tam, cv.px);
}

/* ---------- gera os arquivos ---------- */
const VARIANTES = {
    "img/icon-512.png": [512, [61, 68, 101], [214, 40, 40], [235, 235, 240], [255, 255, 255]],
    "img/icon-192.png": [192, [61, 68, 101], [214, 40, 40], [235, 235, 240], [255, 255, 255]],
    "img/icon-512-maskable.png": [512, [61, 68, 101], [214, 40, 40], [235, 235, 240], [255, 255, 255]],
    "img/icon-192-maskable.png": [192, [61, 68, 101], [214, 40, 40], [235, 235, 240], [255, 255, 255]],
    "img/icon-512-vendedor.png": [512, [29, 63, 110], [255, 184, 34], [235, 235, 240], [255, 255, 255]],
    "img/icon-192-vendedor.png": [192, [29, 63, 110], [255, 184, 34], [235, 235, 240], [255, 255, 255]],
    "img/icon-512-vendedor-maskable.png": [512, [29, 63, 110], [255, 184, 34], [235, 235, 240], [255, 255, 255]],
    "img/icon-192-vendedor-maskable.png": [192, [29, 63, 110], [255, 184, 34], [235, 235, 240], [255, 255, 255]]
};

console.log("=== gerando os icones ===");
Object.keys(VARIANTES).forEach(function (destino) {
    const v = VARIANTES[destino];
    const dados = desenhaIcone(v[0], v[1], v[2], v[3], v[4]);
    const arq = path.join(RAIZ, destino);
    fs.writeFileSync(arq, dados);
    console.log("  " + destino + "  (" + v[0] + "x" + v[0] + ", " + Math.round(dados.length / 1024) + " KB)");
});
console.log("\nIcones gerados. O app Android usa os mesmos arquivos.");