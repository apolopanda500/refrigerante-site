/* ============================================
   ROBO DO CATALOGO - CONVENCAO
   Le o catalogo oficial (Entrega Aki), extrai os
   produtos disponiveis, baixa as fotos e grava
   catalogo.json, que e o que o site usa para
   mostrar os produtos.

   Roda de segunda a sexta as 10:00 (ver workflow
   .github/workflows/catalogo.yml). Pode rodar na
   mao tambem:  node .github/scripts/sync-catalogo.js

   Regras:
   - produto que some do site oficial sai do
     catalogo daqui tambem (esta em falta);
   - preco vem sempre do site oficial;
   - horarios, regiões e regras de pedido NAO sao
     tocados aqui (ficam em loja.js).
   ============================================ */

const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..", "..");
const FONTE = process.env.CATALOGO_URL
    || "https://refrigerantesconvencaorio.entregaaki.app.br/Principal/Publico/Produtos";
const SAIDA = path.join(RAIZ, "catalogo.json");
const PASTA_IMG = path.join(RAIZ, "img", "cat");

/* ---------- categorias do site (mesmas do app.js) ---------- */
const GRUPOS = [
    { id: "de", nm: "Destaques", ic: "fa-star",          chaves: ["destaque"] },
    { id: "2l", nm: "Refrigerantes 2L", ic: "fa-bottle-water", chaves: ["2l", "2 litros", "2l"] },
    { id: "60", nm: "Refrigerantes 600ml", ic: "fa-glass-water", chaves: ["600ml", "600 ml"] },
    { id: "35", nm: "Refrigerantes 350ml", ic: "fa-mug-hot",     chaves: ["350ml", "350 ml"] },
    { id: "re", nm: "Refrescos e Chinotto", ic: "fa-lemon",     chaves: ["chinotto", "refresco"] },
    { id: "mx", nm: "MSX Energético", ic: "fa-bolt",           chaves: ["msx", "energetico", "energético"] },
    { id: "ag", nm: "Água", ic: "fa-tint",                     chaves: ["agua", "água"] },
    { id: "ch", nm: "Chopp Ravache", ic: "fa-beer-mug-empty",  chaves: ["chopp", "barril"] }
];

/* ---------- utilidades ---------- */
function texto(x) {
    return String(x || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
        .replace(/\s+/g, " ")
        .trim();
}
function precoBR(valor) {
    return String(valor || "0").replace(/\./g, "").replace(",", ".");
}

/* o site oficial responde em ISO-8859-1 (latin1), nao em UTF-8 */
function lerHtml(buffer, contentType) {
    const buf = Buffer.from(buffer);
    const ct = String(contentType || "").toLowerCase();
    if (ct.indexOf("utf-8") >= 0 || ct.indexOf("utf8") >= 0) return buf.toString("utf8");
    return buf.toString("latin1");
}

/* ---------- site oficial pede cookie de sessao (302 -> /Default) ----------
   Sem isso o fetch fica em laco de redirect. Aqui guardamos o cookie
   e seguimos os redirects na mao. */
let COOKIE = "";
function requisitar(url, tentativas) {
    tentativas = tentativas || 0;
    const headers = {
        "user-agent": "Mozilla/5.0 (compatible; robo-catalogo-convencao)",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9"
    };
    if (COOKIE) headers.cookie = COOKIE;

    return fetch(url, { redirect: "manual", headers: headers }).then(function (r) {
        const sc = (r.headers.getSetCookie ? r.headers.getSetCookie() : []) || [];
        if (sc.length) COOKIE = sc.map(function (c) { return c.split(";")[0]; }).join("; ");
        if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
            if (tentativas >= 6) throw new Error("redirect demais");
            const proxima = new URL(r.headers.get("location"), url).href;
            return requisitar(proxima, tentativas + 1);
        }
        return r;
    });
}

function baixar(url) {
    return requisitar(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
    });
}

/* ---------- grupos: o nome fica depois do <i> do cabecalho ---------- */
function extrairGrupos(html) {
    const mapa = {};
    const re = /data-grupo-id="(Grupo\d+)"[^>]*>\s*<i[^>]*>\s*<\/i>\s*([^<]{2,40}?)\s*</g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const nome = texto(m[2]);
        if (nome && !mapa[m[1]]) mapa[m[1]] = nome.toUpperCase();
    }
    return mapa;
}

/* ---------- descricao curta: "Pacote com 6 unidades" ---------- */
function descricaoCurta(nome, descricao) {
    const fonte = (nome + " " + descricao).toLowerCase();
    let m = fonte.match(/(\d+)\s*unidades?/);
    if (!m) m = fonte.match(/c\/\s*(\d+)\s*un/);
    if (!m) m = fonte.match(/c\/\s*(\d+)/);
    if (!m) m = fonte.match(/pack\s*(\d+)/);
    if (!m) m = fonte.match(/pacote\s*(\d+)/);
    if (m) return "Pacote com " + parseInt(m[1], 10) + " un.";
    const rotulo = (nome.match(/-\s*pacote\s*(.*)$/i) || [])[1];
    if (rotulo && rotulo.length < 40) return texto(rotulo);
    if (/barril/i.test(fonte)) return "Barril";
    return "Ver detalhes";
}

/* ---------- nomes: tira caixa alta e sobras do site ---------- */
const SIGLAS = { MSX: 1, PET: 1, PVP: 1, APA: 1, LEV: 1, IPA: 1, REF: 1, CONVENCAO: 1 };
function nomeLimpo(nome) {
    let nm = String(nome || "")
        .replace(/\s*-\s*pacote\b.*$/i, "")
        .replace(/\s*pacote\b.*$/i, "")
        .replace(/\s+c\/\s*\d+\s*\.?$/i, "")
        .replace(/\s+pct\.?\s*$/i, "")
        .replace(/\s+/g, " ")
        .replace(/´/g, "")
        .replace(/\s*$/, "")
        .trim();

    /* se veio todo em caixa alta, deixa Bonito (Chopp Ravache Gold Pet 500ml) */
    if (nm && nm === nm.toUpperCase()) {
        nm = nm.toLowerCase().replace(/(^|[\s(\/-])([a-zà-ÿ]+)/g, function (_, sep, pal) {
            return sep + pal.charAt(0).toUpperCase() + pal.slice(1);
        });
        nm = nm.replace(/(^|[\s(\/-])(msx|pet|pvp|apa|lev|ipa)(?=([\s)/-]|$))/g, function (_, sep, s) {
            return sep + s.toUpperCase();
        });
    }
    return nm.length >= 3 ? nm : String(nome || "").trim();
}

/* ---------- categoria local a partir do grupo oficial ---------- */
const GRUPO_OFICIAL = [
    { grupo: "DESTAQUE", id: "de" },
    { grupo: "2L", id: "2l" },
    { grupo: "600ML", id: "60" },
    { grupo: "600 ML", id: "60" },
    { grupo: "350ML", id: "35" },
    { grupo: "350 ML", id: "35" },
    { grupo: "CHINOTTO", id: "re" },
    { grupo: "REFRESCO", id: "re" },
    { grupo: "MSX", id: "mx" },
    { grupo: "ENERG", id: "mx" },
    { grupo: "AGUA", id: "ag" },
    { grupo: "ÁGUA", id: "ag" },
    { grupo: "CHOPP", id: "ch" },
    { grupo: "BARRIL", id: "ch" }
];
function categoriaPeloGrupo(nomeGrupo) {
    const g = String(nomeGrupo || "").toUpperCase();
    const achado = GRUPO_OFICIAL.find(function (r) { return g.indexOf(r.grupo) >= 0; });
    return achado ? achado.id : null;
}

/* ---------- 2) produtos ---------- */
function extrairProdutos(html, gruposOficiais) {
    const partes = html.split(/class="col-sm-12 col-md-4 ncjc-produto-box"/).slice(1);
    const lista = [];
    for (const b of partes) {
        const nome = texto((b.match(/class="nc-produto-box-header">([\s\S]*?)<\/div>\s*<\/div>/) || [])[1]);
        if (!nome) continue;
        const descricao = texto((b.match(/data-item-desc='([^']*)'/) || [])[1]);
        const grupo = (b.match(/data-item-ref-grupo='([^']*)'/) || [])[1] || "";
        const precoTxt = texto((b.match(/class="nc-produto-preco">([\s\S]*?)<\/span>/) || [])[1]);
        const img = (b.match(/data-src="([^"]+)"/) || [])[1] || "";
        const key = (b.match(/iniciaModalVendaItem\("NO", (\d+)\)/) || [])[1] || "";
        const valor = parseFloat(precoBR((precoTxt.match(/R\$\s*([\d.,]+)/) || [])[1]));

        /* 1) pelo grupo do site oficial (confiavel) 2) pelo nome do produto */
        const grupoNome = gruposOficiais[grupo] || "";
        const bruto = (nome + " " + descricao + " " + grupoNome).toLowerCase();
        const catId = categoriaPeloGrupo(grupoNome)
            || (GRUPOS.find(function (g) { return g.chaves.some(function (c) { return bruto.indexOf(c) >= 0; }); }) || GRUPOS[0]).id;

        /* nome limpo + descricao curta */
        const nm = nomeLimpo(nome);
        const ds = descricaoCurta(nome, descricao);

        lista.push({
            ct: catId,
            nm: nm,
            ds: ds || "Ver detalhes",
            pr: valor > 0 ? valor.toFixed(2) : null,
            key: key,
            grupo: grupo,
            imgUrl: img ? img.replace(/&amp;/g, "&") : ""
        });
    }
    return lista;
}

/* ---------- 3) imagem local (para o site nao depender do site oficial) ---------- */
function garantirImagem(prod) {
    if (!prod.key) return Promise.resolve(null);
    const arquivo = "img/cat/" + prod.key + ".jpg";
    const destino = path.join(RAIZ, arquivo);
    if (fs.existsSync(destino)) { prod.im = arquivo; return Promise.resolve(arquivo); }
    if (!prod.imgUrl) return Promise.resolve(null);
    return baixar(prod.imgUrl).then(function (buf) {
        fs.writeFileSync(destino, Buffer.from(buf));
        prod.im = arquivo;
        return arquivo;
    }).catch(function () { return null; });
}

/* ---------- execução ---------- */
function principal() {
    console.log("Catalogo oficial:", FONTE);
    console.log("Baixando...");
    return requisitar(FONTE)
        .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.arrayBuffer().then(function (buf) {
                return lerHtml(buf, r.headers.get("content-type"));
            });
        })
        .then(function (html) {
            console.log("Pagina recebida:", html.length, "caracteres");
            const gruposOficiais = extrairGrupos(html);
            const produtos = extrairProdutos(html, gruposOficiais);
            console.log("Grupos:", Object.keys(gruposOficiais).length, "| produtos:", produtos.length);

            const comPreco = produtos.filter(function (p) { return p.pr; });
            if (comPreco.length < 5) throw new Error("Poucos produtos com preco - cancelando para nao apagar o catalogo.");

            console.log("Baixando imagens...");
            return Promise.all(produtos.map(function (p) { return garantirImagem(p); }))
                .then(function () { return produtos; })
                .then(function (produtos) {
                    const anterior = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, "utf8")) : null;
                    const antes = anterior ? (anterior.produtos || []).length : 0;

                    /* preco no formato do site: R$ 31,00 */
                    const brl = function (v) { return "R$ " + Number(v).toFixed(2).replace(".", ","); };

                    const saida = {
                        geradoEm: new Date().toISOString(),
                        fonte: FONTE,
                        gruposOficiais: gruposOficiais,
                        grupos: GRUPOS.map(function (g) { return { id: g.id, nm: g.nm, ic: g.ic }; }),
                        produtos: produtos.map(function (p) {
                            return {
                                ct: p.ct, nm: p.nm, ds: p.ds,
                                pr: p.pr ? brl(p.pr) : null,
                                im: p.im || "", key: p.key
                            };
                        })
                    };
                    fs.writeFileSync(SAIDA, JSON.stringify(saida, null, 2), "utf8");
                    console.log("catalogo.json gravado: " + saida.produtos.length + " produtos (antes " + antes + ")");

                    /* resumo do que mudou (para o log do GitHub) */
                    const antesPrecos = {};
                    (anterior ? (anterior.produtos || []) : []).forEach(function (p) { antesPrecos[p.key || p.nm] = p.pr; });
                    let mudou = 0;
                    const novosPreco = [];
                    saida.produtos.forEach(function (p) {
                        const antigo = antesPrecos[p.key || p.nm];
                        if (antigo !== undefined && String(antigo) !== String(p.pr)) {
                            mudou++;
                            novosPreco.push(p.nm + ": " + antigo + " -> " + p.pr);
                        }
                    });
                    let sumiram = [];
                    if (anterior) {
                        const novos = {};
                        saida.produtos.forEach(function (p) { novos[p.key || p.nm] = 1; });
                        (anterior.produtos || []).forEach(function (p) { if (!novos[p.key || p.nm]) sumiram.push(p.nm); });
                    }
                    console.log("\n=== RESUMO DA ATUALIZACAO ===");
                    console.log("Produtos: " + saida.produtos.length);
                    console.log("Precos alterados: " + mudou);
                    if (novosPreco.length) console.log(novosPreco.slice(0, 20).join("\n"));
                    console.log("Produtos que sairam (acabaram): " + sumiram.length);
                    if (sumiram.length) console.log(sumiram.join(", "));
                    console.log("=======================\n");
                    return saida;
                });
        });
}

principal().catch(function (e) {
    console.error("FALHOU:", e.message);
    process.exit(1);
});