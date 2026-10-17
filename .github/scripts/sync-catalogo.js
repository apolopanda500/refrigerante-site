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
   - preco NUNCA vem do site oficial: quem manda e o
     dono, em precos-base.json. O preco do site so
     entra para produto NOVO, sem preco seu ainda, e
     uma vez so (para nunca aparecer sem preco);
   - horarios, regiones e regras de pedido NAO sao
     tocados aqui (ficam em loja.js).
   ============================================ */

const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..", "..");
const FONTE = process.env.CATALOGO_URL
    || "https://refrigerantesconvencaorio.entregaaki.app.br/Principal/Publico/Produtos";
const SAIDA = path.join(RAIZ, "catalogo.json");
const RESUMO = path.join(RAIZ, ".github", "scripts", "ultimo-resumo.json");
const PASTA_IMG = path.join(RAIZ, "img", "cat");

/* ---------- categorias do site (mesmas do app.js) ---------- */
const GRUPOS = [
    { id: "2l", nm: "Refrigerantes 2L", ic: "fa-bottle-water", chaves: ["2l", "2 litros"] },
    { id: "60", nm: "Refrigerantes 600ml", ic: "fa-glass-water", chaves: ["600ml", "600 ml"] },
    { id: "35", nm: "Refrigerantes Latas", ic: "fa-mug-hot", chaves: ["350ml", "350 ml", "lata"] },
    { id: "re", nm: "Refrescos e Chinotto", ic: "fa-lemon",
      chaves: ["chinotto", "refresco",
               /* guarana zero ACUCAR em lata entra junto com o chinotto */
               "guarana zero acucar lata", "guarana convencional zero acucar lata",
               "guarana zero acucar 269", "guarana convencional zero acucar 269"] },
    { id: "mx", nm: "MSX Energético", ic: "fa-bolt", chaves: ["msx", "energetico", "energético"] },
    { id: "ag", nm: "Água", ic: "fa-tint", chaves: ["agua", "água"] },
    { id: "ch", nm: "Chopp Ravache", ic: "fa-beer-mug-empty", chaves: ["chopp", "barril"] }
];

/* regra pontual: o guarana zero acucar LATA (269ml) fica na classe do
   chinotto, e nao em "Refrigerantes Latas". o 2L continua em Refrigerantes 2L */
const EXCECAO_CLASSE = [
    { id: "500000113", classe: "re" }
];

/* ordem de checagem: mais especifico primeiro (chopp, msx e agua
   antes de 2l/lata, senao "MSX 2L" cairia em Refrigerantes 2L) */
const ORDEM_CATEGORIA = ["ch", "mx", "re", "ag", "2l", "60", "35"];

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

/* ---------- PRECOS ANTIGOS DO SITE (fonte da verdade do dono) ----------
   O robo NAO troca os precos: ele mantem o valor que o dono
   cadastrou. Produto novo (que nao existe na base) usa o preco
   do site oficial, para nunca aparecer sem preco. */
const ARQ_PRECOS = path.join(RAIZ, "precos-base.json");
let PRECOS_BASE = [];
try { PRECOS_BASE = JSON.parse(fs.readFileSync(ARQ_PRECOS, "utf8")); } catch (e) { PRECOS_BASE = []; }

/* palavras que nao distinguem um produto do outro.
   "gas" NAO entra aqui: agua com gas tem preco diferente da sem gas. */
const PARADAS = ["pacote", "pct", "pack", "un", "unidades", "unidade", "und", "c", "pet", "lata", "latas",
    "latinha", "latinhas", "garrafa", "garrafas", "convencao", "conv", "com", "sem", "g"];

function semAcento(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function tokenVolume(t) {
    /* 1500ml -> 1.5l | 269 ml -> 0.269l | 2 litros -> 2l | 1,5L -> 1.5l */
    return t
        .replace(/(\d+)[.,](\d+)\s*ml/g, function (_, a, b) { return (parseInt(a, 10) + parseInt(b, 10) / 10) + "l"; })
        .replace(/(\d+)\s*ml/g, function (_, a) { return (parseInt(a, 10) / 1000) + "l"; })
        .replace(/(\d+)[.,](\d+)\s*l\b/g, "$1.$2l")
        .replace(/(\d+)\s*litros?/g, "$1l");
}
function palavrasChave(nome) {
    let base = tokenVolume(semAcento(nome).toLowerCase());
    base = base.replace(/c\s*\/\s*gas/g, "gas").replace(/\bgas\b/g, "gas");   // "c/gas" vira "gas"
    return base.split(/[^a-z0-9.]+/)
        .filter(function (p) {
            if (p.length < 2) return false;
            if (PARADAS.indexOf(p) >= 0) return false;
            if (/^c\d+$/.test(p)) return false;          // c6, c12 = quantidade do pacote
            return true;
        });
}
/* procura o preco antigo que mais combina com o produto do site oficial */
function precoBaseDe(nome) {
    if (!PRECOS_BASE.length) return null;
    const alvo = palavrasChave(nome);
    let melhor = null, pontos = 0, empate = false;
    PRECOS_BASE.forEach(function (b) {
        const cand = palavrasChave(b.nm);
        let p = 0;
        cand.forEach(function (t) { if (alvo.indexOf(t) >= 0) p++; });
        if (p > pontos) { pontos = p; melhor = b; empate = false; }
        else if (p === pontos && p > 0 && melhor) {
            /* empate: vence o nome mais parecido (menos palavras sobrando) */
            empate = true;
            if (Math.abs(cand.length - alvo.length) < Math.abs(palavrasChave(melhor.nm).length - alvo.length)) {
                melhor = b;
            }
        }
    });
    /* precisa combinar pelo menos sabor + medida */
    if (!melhor || pontos < 2) return null;
    return melhor.pr;
}

/* ---------- categorias do site ---------- */
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

/* ---------- categoria pelo NOME do produto (ignora o grupo DESTAQUES do site) ---------- */
function categoriaPeloNome(nome, descricao, grupoNome) {
    /* sem acento: assim "acucar" acha "Açúcar" e "energetico" acha "energético" */
    const bruto = semAcento(nome + " " + descricao + " " + (grupoNome || "")).toLowerCase();
    for (let i = 0; i < ORDEM_CATEGORIA.length; i++) {
        const g = GRUPOS.find(function (x) { return x.id === ORDEM_CATEGORIA[i]; });
        if (g && g.chaves.some(function (c) { return bruto.indexOf(semAcento(c).toLowerCase()) >= 0; })) return g.id;
    }
    return "2l";
}

/* excecao por codigo oficial: tem prioridade sobre o nome */
function classeDaExcecao(codigo) {
    const e = EXCECAO_CLASSE.find(function (x) { return x.id === codigo; });
    return e ? e.classe : null;
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

        /* categoria pelo proprio produto (o grupo DESTAQUES do site oficial
           nao define a classe real: Chinotto e MSX voltam para suas classes) */
        const grupoNome = gruposOficiais[grupo] || "";
        const catId = classeDaExcecao(key) || categoriaPeloNome(nome, descricao, grupoNome);

        /* nome limpo + descricao curta */
        const nm = nomeLimpo(nome);
        const ds = descricaoCurta(nome, descricao);

        /* preco: mantem o do dono (precos-base.json); produto novo usa o do site */
        const base = precoBaseDe(nome);
        const precoFinal = base !== null ? parseFloat(String(base).replace(/\./g, "").replace(",", "."))
                                         : (valor > 0 ? valor : null);

        lista.push({
            ct: catId,
            nm: nm,
            ds: ds || "Ver detalhes",
            pr: precoFinal,
            precoOficial: valor > 0 ? valor : null,
            precoBase: base !== null ? base : null,
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

                    /* ---------- RESGATE DO PRECO DO DONO ----------
                       Regra do dono: o preco e DELE, nunca o do site oficial.
                       O casamento de nome com precos-base.json e por palavra
                       chave, entao se o site oficial mudar o nome do produto
                       (sabor novo, "2L" virando "2 L") o casamento cai e o
                       preco oficial entraria no catalogo.

                       Aqui o preco anterior e resgatado pelo CODIGO do produto
                       (key), que NAO muda quando o nome muda. Assim:
                         - produto nunca perde o preco do dono por mudanca de nome;
                         - nada nunca entra no catalogo pelo preco do site
                           oficial sem ser produto realmente novo;
                         - e o robo avisa qual ficou com o preco pendente. */
                    const precoAnterior = {};
                    (anterior ? (anterior.produtos || []) : []).forEach(function (p) {
                        if (p.key && p.pr) precoAnterior[p.key] = p.pr;
                    });
                    const resgatados = [], semPrecoDono = [];
                    produtos.forEach(function (p) {
                        if (p.precoBase !== null) return;                 /* ja tem preco do dono */
                        const velho = p.key ? precoAnterior[p.key] : null;
                        const antigoNum = velho ? parseFloat(String(velho).replace(/R\$/i, "").replace(/\./g, "").replace(",", ".")) : null;
                        if (!isNaN(antigoNum) && antigoNum > 0) {
                            p.pr = antigoNum;
                            p.precoResgatado = true;
                            resgatados.push(p.nm);
                        } else if (p.pr) {
                            /* produto realmente novo: so agora entra pelo preco do site */
                            semPrecoDono.push(p.nm);
                        }
                    });

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

                    /* ---------- resumo: o catalogo mudou? ---------- */
                    const antesMap = {};
                    (anterior ? (anterior.produtos || []) : []).forEach(function (p) { antesMap[p.key || p.nm] = p; });
                    const agoraMap = {};
                    saida.produtos.forEach(function (p) { agoraMap[p.key || p.nm] = p; });

                    const novos = [], sumiram = [];
                    saida.produtos.forEach(function (p) {
                        if (!antesMap[p.key || p.nm]) novos.push(p.nm);
                    });
                    if (anterior) {
                        (anterior.produtos || []).forEach(function (p) {
                            if (!agoraMap[p.key || p.nm]) sumiram.push(p.nm);
                        });
                    }

                    /* preco: o robo NUNCA muda. So produto novo (sem preco
                       do dono E sem preco anterior) pega o preco do site
                       uma unica vez. */
                    const doDono = produtos.filter(function (p) { return p.precoBase !== null; }).length;
                    const novosComPrecoOficial = produtos.filter(function (p) {
                        return p.precoBase === null && !p.precoResgatado;
                    });

                    /* DETECCAO: o dono mudou o preco no site oficial.
                       O robo NAO aplica sozinho (preco e do dono): ele avisa
                       para o painel receber a mudanca com um clique. */
                    const precoOficialMudou = produtos.filter(function (p) {
                        if (p.precoBase === null || p.precoOficial === null) return false;
                        var doDono = parseFloat(String(p.precoBase).replace(/\./g, "").replace(",", "."));
                        return !isNaN(doDono) && Math.abs(doDono - p.precoOficial) > 0.004;
                    }).map(function (p) {
                        return { nm: p.nm, base: p.precoBase, oficial: p.precoOficial };
                    });

                    const catalogoMudou = novos.length > 0 || sumiram.length > 0 ||
                        JSON.stringify(anterior ? anterior.produtos : null) !== JSON.stringify(saida.produtos);

                    const resumo = {
                        geradoEm: saida.geradoEm,
                        total: saida.produtos.length,
                        antes: antes,
                        novos: novos,
                        sumiram: sumiram,
                        precosDoDono: doDono,
                        precosResgatados: resgatados,
                        precosOficiaisNovos: novosComPrecoOficial.map(function (p) {
                            return { nm: p.nm, pr: p.precoOficial };
                        }),
                        precosOficiaisMudaram: precoOficialMudou,
                        catalogoMudou: catalogoMudou
                    };
                    fs.writeFileSync(RESUMO, JSON.stringify(resumo, null, 2), "utf8");

                    console.log("\n=== RESUMO DA ATUALIZACAO ===");
                    console.log("Produtos no catalogo: " + saida.produtos.length + " (antes " + antes + ")");
                    console.log("Entraram: " + novos.length + (novos.length ? " -> " + novos.join(", ") : ""));
                    console.log("Saíram (acabaram): " + sumiram.length + (sumiram.length ? " -> " + sumiram.join(", ") : ""));
                    console.log("Preços do dono mantidos: " + doDono + " de " + saida.produtos.length + " (o robo não altera preços)");
                    if (resgatados.length) {
                        console.log("\n!! NOME MUDOU NO SITE OFICIAL - o preco do dono foi RESGATADO pelo codigo do produto:");
                        resgatados.forEach(function (nm) { console.log("   " + nm + " (continua com o preco que voce cadastrou)"); });
                        console.log("   Se o produto ganhou sabor/medida nova, cadastre o preco em precos-base.json.");
                    }
                    if (novosComPrecoOficial.length) {
                        console.log("Produto NOVO usando preço do site (ajuste no painel quando quiser):");
                        novosComPrecoOficial.forEach(function (p) { console.log("   " + p.nm + " — R$ " + p.precoOficial); });
                    }
                    if (precoOficialMudou.length) {
                        console.log("\n!! PRECO MUDOU NO SITE OFICIAL (" + precoOficialMudou.length + ") - o robo NAO alterou:");
                        precoOficialMudou.forEach(function (p) { console.log("   " + p.nm + ": seu R$ " + p.base + " -> site R$ " + p.oficial); });
                        console.log("   Ajuste no painel do vendedor para acompanhar o site.");
                    }
                    console.log("Catalogo mudou: " + (catalogoMudou ? "SIM" : "NAO"));
                    console.log("=======================\n");
                    return saida;
                });
        });
}

principal().catch(function (e) {
    console.error("FALHOU:", e.message);
    process.exit(1);
});