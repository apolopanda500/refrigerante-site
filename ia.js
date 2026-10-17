/* ============================================================
   IA DO SITE - ASSISTENTE, RESPOSTAS E RECOMENDACOES
   ------------------------------------------------------------
   Tres camadas em cadeia (nunca fica mudo, sempre funciona):

   1) MOTOR LOCAL (iaRespostaLocal)
      Intents + conhecimento real da loja (regioes, horarios,
      frete, catalogo, pedidos). Offline, instantaneo e
      DETERMINISTICO: fato, o motor local acerta sempre.

   2) IA NA NUVEM (opcional, cfgIAProvedor)
      - "puter": IA real gratis via js.puter.com (sem chave)
      - "custom": endpoint compativel com OpenAI (URL+chave)
      Timeout de 8 segundos.

   3) VOLTA AO MOTOR LOCAL se a nuvem falhar (nunca quebra).

   Recomendacoes: "quem levou X levou Y" com o historico de
   compras do aparelho + variedade do catalogo.
   ============================================================ */

/* ---------- preferencias ---------- */
function iaPrefs() {
    try { return JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); }
    catch (e) { return {}; }
}
function iaProvedor() {
    var p = iaPrefs().cfgIAProvedor;
    return (p === "puter" || p === "custom") ? p : "local";
}

/* ---------- catalogo (PD quando existe; senao baixa o do dia) ---------- */
var iaCacheCatalogo = [];
function iaUsarCatalogo(lista) {
    iaCacheCatalogo = Array.isArray(lista) ? lista : [];
    return iaCacheCatalogo;
}
function iaCatalogo() {
    if (typeof PD !== "undefined" && Array.isArray(PD) && PD.length) return PD;
    return iaCacheCatalogo;
}
function iaCarregarCatalogo() {
    if (typeof PD !== "undefined" && PD && PD.length) return Promise.resolve(PD);
    if (iaCacheCatalogo.length) return Promise.resolve(iaCacheCatalogo);
    if (typeof fetch !== "function") return Promise.resolve([]);
    return fetch("catalogo.json", { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (cat) {
            if (cat && Array.isArray(cat.produtos)) iaUsarCatalogo(cat.produtos);
            return iaCacheCatalogo;
        })
        .catch(function () { return iaCacheCatalogo; });
}

/* ---------- utilidades ---------- */
function iaNum(v) {
    var s = String(v == null ? "" : v).replace(/[^\d,.-]/g, "");
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}
function iaEsc(t) {
    return String(t == null ? "" : t)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function iaNormal(t) {
    return String(t || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
var IA_PARADAS = ["para", "por", "com", "que", "uma", "uns", "dos", "das", "voc", "site", "favor", "ola", "oi"];
function iaTokens(t) {
    return iaNormal(t).split(/[^a-z0-9]+/).filter(function (w) {
        return w.length >= 3 && IA_PARADAS.indexOf(w) < 0;
    });
}

/* ---------- conhecimento da loja (contexto) ---------- */
function iaContexto() {
    var linhas = [];
    try {
        linhas.push("Loja: Refrigerantes Convencao (delivery de bebidas).");
        /* horario vem da loja.js (fonte unica): a IA nao pode discordar da tela */
        linhas.push("Horario de pedidos: " + janelaPedidosTexto() + ", de segunda a sexta.");
        linhas.push("Entrega nas ruas: " + janelaEntregaTexto() + ".");
        linhas.push("Pagamento: Pix ou Dinheiro na entrega (sem cartao).");
        linhas.push("Frete gratis em pedidos a partir de " +
            (typeof formatBRL === "function" ? formatBRL(typeof freteGratisMinimo === "function" ? freteGratisMinimo() : 150) : "R$ 150,00") + ".");
        if (typeof BAIRROS_ATENDIDOS_TEXTO !== "undefined") {
            linhas.push("Regioes atendidas: " + BAIRROS_ATENDIDOS_TEXTO + ".");
        }
        if (typeof REGIOES !== "undefined") {
            REGIOES.forEach(function (r) {
                linhas.push("- " + r.nome + ": entrega " + String(r.diasTexto || "").toLowerCase() +
                    ", frete " + (typeof formatBRL === "function" ? formatBRL(r.frete) : r.frete) + ".");
            });
        }
        var cat = iaCatalogo();
        if (cat.length) {
            linhas.push("Produtos (nome = preco): " + cat.slice(0, 45).map(function (p) {
                return p.nm + " = " + p.pr;
            }).join("; ") + ".");
        }
        linhas.push("Contato/WhatsApp: " + iaZapFmt() + ".");
    } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
    var txt = linhas.join("\n");
    if (txt.length > 4000) txt = txt.slice(0, 3950) + "\n...(catalogo cortado)";
    return txt;
}

/* ---------- intents do motor local ----------
   devolve { texto, intencao, confianca, rapido }
   rapido = fato: responde SEMPRE local (nunca erra um fato) */
/* ---------- RESPOSTAS ESPECIFICAS (antes das genericas) ----------
   Aqui mora o que tem palavra propria: "sabado", "cancelar", "chave pix",
   "prazo". Se ficassem depois, as regras genericas ("entrega", "horario",
   "pagamento") engoliam a pergunta e a IA respondia a coisa errada. */
function iaRespostaEspecifica(q, bruto, res) {
    /* falar com humano (vendedor x motorista) */
    if (/falar com|atendente|humano|alguem|reclamacao|reclamar|problema com|ajuda com|ligar|motorista/.test(q)) {
        var alvoH = (typeof iaHumanoPara === "function") ? iaHumanoPara(bruto) : null;
        if (alvoH && alvoH.numero) {
            return res(alvoH.quem + ": " + alvoH.numeroFmtado + "\n" + alvoH.link +
                (alvoH.motivo ? "\n(" + alvoH.motivo + ")" : ""), "humano", 0.96, true);
        }
        return res("Posso chamar o vendedor: WhatsApp " + iaZapFmt() + ".", "humano", 0.8, false);
    }


    /* 10) contato */
    if (/telefone|whatsapp|zap|contato|numero/.test(q)) {
        return res("WhatsApp da loja: " + iaZapFmt() + "\nhttps://wa.me/" + iaZapNum() + "\nE-mail: " + iaEmail(), "contato", 0.98, true);
    }

    /* 11) valor MINIMO do pedido (regra do carrinho) */
    if (/minimo|minima|quanto.*(pedido|compra)|pedido minimo|valor minimo/.test(q)) {
        var minE = (typeof entregaMinima === "function") ? entregaMinima() : 100;
        return res("O pedido minimo para entrega e " +
            (typeof formatBRL === "function" ? formatBRL(minE) : "R$ " + minE) +
            ". Abaixo disso o site nao deixa fechar o pedido e mostra quanto falta.", "minimo", 0.97, true);
    }

    /* 12) entrega hoje / chega hoje / prazo */
    if (/chega hoje|entrega hoje|hoje entrega|demora|prazo|quando chega|recebo hoje|entregam hoje/.test(q)) {
        var stE = (typeof estadoEntrega === "function") ? estadoEntrega() : null;
        var stL = (typeof estadoLoja === "function") ? estadoLoja() : null;
        var regioesHoje = (typeof regioesDoDia === "function" && typeof agoraSP === "function")
            ? regioesDoDia(agoraSP().dia).map(function (r) { return r.nome; }).join(", ") : "";
        return res(
            (regioesHoje ? "Hoje entregamos em: " + regioesHoje + ".\n" : "Hoje nao tem entrega na rua.\n")
            + (stE ? "Freteiro: " + stE.texto.toLowerCase() + " (das " + janelaEntregaTexto() + ").\n" : "")
            + (stL ? "Loja: " + stL.texto.toLowerCase() + ".\n" : "")
            + "O pedido e feito um dia antes da entrega.",
            "prazo", 0.95, true);
    }

    /* 13) saturday / sunday / fim de semana */
    if (/sabado|domingo|fim de semana|final de semana/.test(q)) {
        var stS = (typeof estadoLoja === "function") ? estadoLoja({ dia: 6, minutos: 10 * 60 }) : null;
        return res("No sabado a loja fica fechada e sai so a entrega (" + (stS ? stS.texto.toLowerCase() : "so entrega") + ").\n"
            + "No domingo a loja nao abre e o freteiro nao entrega.",
            "fimDeSemana", 0.98, true);
    }

    /* 14) cancelar / mudar um pedido ja feito */
    if (/cancel[a-z]*|desistir|nao quero mais|nao quero o pedido|alterar meu pedido|mudar o pedido|refazer o pedido/.test(q)) {
        var meusC = (typeof getPedidos === "function") ? getPedidos().slice(0, 2) : [];
        var ultimo = meusC[0];
        if (ultimo) {
            return res("Seu pedido mais recente e o " + ultimo.id + " (" +
                (typeof STATUS_LABEL !== "undefined" ? (STATUS_LABEL[ultimo.status] || ultimo.status) : ultimo.status) + ").\n"
                + "Para cancelar ou corrigir dados, chame a loja no WhatsApp " + iaZapFmt() + " e diga o numero do pedido. "
                + "No painel o vendedor usa o comando /cancelar ou /editar.",
                "cancelar", 0.94, true);
        }
        return res("Nao achei pedido seu neste aparelho. Se voce ja fez um pedido, chame a loja no WhatsApp " +
            iaZapFmt() + " com o numero do pedido que o vendedor cancela ou corrige.", "cancelar", 0.9, true);
    }

    /* 15) dados / perfil / endereco (antes de cancelar: "corrigir o endereco" e perfil) */
    if (/meus dados|meu perfil|cadastro|atualizar telefone|meu telefone|meu endereco|endereco|corrigir o endereco|alterar endereco|meu cep|\bcep\b/.test(q)) {
        return res("Nome, WhatsApp, CPF, endereco e bairro ficam na pagina Perfil (menu superior).\n"
            + "O endereco tambem aparece no carrinho, na parte \"Entrega e pagamento\", e o que voce digitar la e salvo no perfil.",
            "perfil", 0.95, true);
    }

    /* 16) chave pix / como pagar */
    if (/chave pix|como pagar|pagar por pix|qr.?code|gerar pix|transferir/.test(q)) {
        return res("O Pix e confirmado na hora, na entrega.\nO que a loja precisa e so o nome e o WhatsApp no Perfil.\n"
            + "Se preferir, leve dinheiro: o pedido tambem aceita Dinheiro (com troco).", "pix", 0.95, true);
    }

    /* 17) vou receber aviso? notificacao */
    if (/vou ser avisado|recebo aviso|notificacao|avisam quando|me avisaram/.test(q)) {
        return res("Sim. Ligue o aviso em Configuracoes > Notificacoes: o celular avisa cada mudanca de status "
            + "(aguardando, confirmado, em separacao, saiu para entrega, entregue). Tem um botao \"Testar agora\" para conferir.",
            "aviso", 0.95, true);
    }

    /* 18) limpar historico / apagar pedidos */
    if (/limpar historico|apagar (meu |os |todos os )?(historico|pedido|pedidos)|remover (meu )?pedido|zerar historico/.test(q)) {
        return res("O historico fica na pagina Historico (menu superior). Para nao ficar acumulando pedido antigo, "
            + "o proprio site oferece o botao de limpar na pagina. Se precisar apagar tudo, chame a loja no WhatsApp " +
            iaZapFmt() + ".", "limparHistorico", 0.92, true);
    }

    /* 19) recomendacao: o que beber / combina com */
    if (/recomenda|o que beber|o que combina|qual escolho|sugestao|indicacao/.test(q)) {
        if (typeof iaOfertaDoDia === "function") {
            var odR = iaOfertaDoDia();
            if (odR && odR.nm) {
                return res("Hoje eu indicaria: " + odR.nm + " (" + odR.pr + ").\n"
                    + "A vitrine tem a aba \"Escolhas para voce\", que muda com o catalogo do dia.",
                    "recomendacao", 0.94, true);
            }
        }
        return res("Olhe a aba \"Escolhas para voce\" na pagina inicial: ela monta a combinacao pelo que voce ja comprou.\n"
            + "Quer que eu indique pelo dia da semana (churrasco, festa, drinks)?", "recomendacao", 0.85, true);
    }



    /* frete gratis (antes da regra geral de frete) */
    if (/frete gratis|gratis/.test(q) && !/produto|refri|cerveja|agua|chopp/.test(q)) {
        var mg = (typeof freteGratisMinimo === "function") ? freteGratisMinimo() : 150;
        return res("Sim! Frete gratis em pedidos a partir de " +
            (typeof formatBRL === "function" ? formatBRL(mg) : "R$ " + mg) + ".", "freteGratis", 0.96, true);
    }


    return null;
}

function iaRespostaLocal(pergunta) {
    var q = iaNormal(pergunta);
    var bruto = String(pergunta || "");
    var res = function (texto, intencao, confianca, rapido) {
        return { texto: texto, intencao: intencao, confianca: confianca, rapido: !!rapido };
    };
    if (!q.trim()) return res("Escreva sua duvida que eu respondo na hora.", "vazio", 1, true);

    /* 1) produto / preco */
    var cat = iaCatalogo();
    var achados = [];
    if (cat.length) {
        var toks = iaTokens(bruto);
        cat.forEach(function (p) {
            var np = iaNormal(p.nm);
            var hit = 0;
            toks.forEach(function (t) { if (t.length >= 3 && np.indexOf(t) >= 0) hit++; });
            if (hit && (/\d/.test(q) || /preco|custa|valor|quanto/.test(q) || toks.length === hit)) achados.push({ p: p, hit: hit });
        });
        achados.sort(function (a, b) { return b.hit - a.hit; });
    }
    if (achados.length && /quanto|custa|preco|valor|tem /.test(q)) {
        var linhas = achados.slice(0, 4).map(function (a) { return "- " + a.p.nm + ": " + a.p.pr; });
        return res("Encontrei no catalogo:\n" + linhas.join("\n") +
            (achados.length > 4 ? "\n...e mais. Use a busca do site para ver todos." : ""), "preco", 0.98, true);
    }

    /* assunto com palavra propria? resolve antes das regras genericas */
    var especifico = iaRespostaEspecifica(q, bruto, res);
    if (especifico) return especifico;

    /* 2) horario de pedidos / funcionamento */
    if (/que horas|horario|abre|fecha|atendem|funciona|expediente/.test(q)) {
        var janPed = janelaPedidosTexto();
        var janEnt = janelaEntregaTexto();
        var stI = (typeof estadoLoja === "function") ? estadoLoja() : null;
        return res("Pedidos das " + janPed + ", de segunda a sexta (sabado e domingo nao abrem pedido; sabado sai so entrega).\n"
            + "A entrega nas ruas vai das " + janEnt + "."
            + (stI ? "\nAgora: " + stI.texto.toLowerCase() + "." : ""),
            "horario", 0.97, true);
    }

    /* 3) frete / custo de entrega */
    if (/frete|entrega custa|custa a entrega|taxa/.test(q)) {
        var min = (typeof freteGratisMinimo === "function") ? freteGratisMinimo() : 150;
        return res("O frete varia por regiao e aparece no carrinho antes de confirmar.\nAcima de " +
            (typeof formatBRL === "function" ? formatBRL(min) : "R$ " + min) + " o frete fica GRATIS em toda a regiao.", "frete", 0.97, true);
    }

    /* 5) dias de entrega / regiao */
    if (/entrega|entregam|dia|quando|semana|calendario/.test(q) && typeof REGIOES !== "undefined") {
        var mencionada = null;
        REGIOES.forEach(function (r) { if (q.indexOf(iaNormal(r.nome).slice(0, 5)) >= 0) mencionada = r; });
        if (mencionada) {
            return res(mencionada.nome + ": faca o pedido sempre um dia antes da entrega.\nEntrega em " +
                String(mencionada.diasTexto || "").toLowerCase() + ".\n" + (mencionada.obs || ""), "regiao", 0.96, true);
        }
        var todas = REGIOES.map(function (r) {
            return "- " + r.nome + ": pedido um dia antes -> entrega " + String(r.diasTexto || "").toLowerCase();
        }).join("\n");
        return res("Cada bairro tem seus dias (pedido sempre um dia antes da entrega):\n" + todas, "entregaDias", 0.94, true);
    }

    /* 6) bairro atendido / nao atendido */
    if (/bairro|atendem|atende|regiao|moro/.test(q) && typeof BAIRROS_ATENDIDOS_TEXTO !== "undefined") {
        var fora = true;
        if (typeof BAIRROS_ATENDIDOS !== "undefined") {
            BAIRROS_ATENDIDOS.forEach(function (b) { if (q.indexOf(b) >= 0) fora = false; });
        }
        if (fora) {
            return res("Atendemos apenas: " + BAIRROS_ATENDIDOS_TEXTO +
                ".\nSe o seu bairro nao esta ai, infelizmente nao conseguimos entregar (o site bloqueia o pedido na finalizacao).", "bairro", 0.93, true);
        }
        return res("Atendemos " + BAIRROS_ATENDIDOS_TEXTO +
            ". Escolha sua regiao no carrinho/checkout que o site calcula o frete e o dia.", "bairro", 0.95, true);
    }

    /* 7) pagamento */
    if (/pagamento|\bpagar\b|pix|dinheiro|cartao|credito|debito|boleto/.test(q)) {
        return res("Aceitamos Pix e Dinheiro na entrega (sem cartao de credito).\nNo Pix a confirmacao e na hora; em dinheiro da para pedir troco no checkout.", "pagamento", 0.98, true);
    }

    /* 8) status do pedido */
    if (/meu pedido|status do pedido|onde esta|andamento|rastre|acompanhar/.test(q)) {
        if (typeof getPedidos === "function") {
            try {
                var meus = getPedidos().slice(0, 3);
                if (meus.length) {
                    var l2 = meus.map(function (p) {
                        return "- " + p.id + ": " + (typeof STATUS_LABEL !== "undefined" ? (STATUS_LABEL[p.status] || p.status) : p.status);
                    }).join("\n");
                    return res("Seus pedidos recentes:\n" + l2 + "\n\nMais detalhes em Historico no menu.", "meuPedido", 0.96, true);
                }
            } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
        }
        return res("Acompanhe na pagina Historico (menu superior). Se nao achar, chame a loja no WhatsApp " + iaZapFmt() + ".", "meuPedido", 0.9, true);
    }

    /* 20) app / instalar */
    if (/aplicativo|instalar|baixar app/.test(q)) {
        return res("Da para instalar o site: Configuracoes > Aplicativo do celular > Baixar aplicativo (APK).\nNo iPhone: Compartilhar > Adicionar a Tela de Inicio.", "app", 0.95, true);
    }

    /* 21) saudacao */
    if (/^(ola|oi|bom dia|boa tarde|boa noite|e ai|salve)/.test(q.trim())) {
        return res("Oi! Sou o assistente da Convencao. Posso responder sobre precos, entrega, frete, pagamento e os seus pedidos.", "saudacao", 0.8, false);
    }

    /* 22) compra / carrinho */
    if (/comprar|carrinho|adicionar|quero levar/.test(q)) {
        return res("Monte o carrinho na vitrine (toque em Adicionar) e finalize em Finalizar pedido. O site calcula o frete e o dia de entrega da sua regiao.", "comprar", 0.8, false);
    }

    /* 23) oferta do dia (atualiza sozinha todo dia com o catalogo) */
    if (/oferta do dia|oferta de hoje|promocao de hoje|promocao do dia|desconto de hoje/.test(q)) {
        var od = (typeof iaOfertaDoDia === "function") ? iaOfertaDoDia() : null;
        if (od && od.nm) {
            return res("Oferta de hoje (" + od.quando + "):\n- " + od.nm + ": " + od.pr +
                (od.motivo ? " (" + od.motivo + ")" : ""), "ofertaDia", 0.97, true);
        }
        return res("Olhe a faixa \"Oferta da semana\" na pagina inicial e as \"Escolhas para voce\" (IA).", "ofertaDia", 0.8, false);
    }


    /* fallback: baixa confianca (candidato a IA da nuvem) */
    return res("Nao tenho essa resposta no motor local. Posso ajudar com precos, entrega, frete, pagamento e pedidos - ou fale com o vendedor: WhatsApp " + iaZapFmt() + ".", "fallback", 0.35, false);
}

/* ---------- IA na nuvem (opcional, com timeout) ---------- */
function iaComTimeout(promessa, ms) {
    return new Promise(function (ok, erro) {
        var t = setTimeout(function () { erro(new Error("tempo esgotado")); }, ms || 8000);
        promessa.then(function (v) { clearTimeout(t); ok(v); })
                .catch(function (e) { clearTimeout(t); erro(e); });
    });
}
function iaNuvemPuter(pergunta) {
    function chamar() {
        var r = window.puter.ai.chat(pergunta, { timeout: 7000 });
        return Promise.resolve(r).then(function (res) {
            var t = (res && res.text) ? res.text : (typeof res === "string" ? res : "");
            if (!t && res && res.toString) t = res.toString();
            if (!t) throw new Error("resposta vazia");
            return t;
        });
    }
    if (typeof window !== "undefined" && window.puter) return iaComTimeout(chamar(), 8000);
    /* carrega a SDK na hora (gratis, sem chave) */
    return new Promise(function (ok, erro) {
        if (typeof document === "undefined" || !document.head) return erro(new Error("sem documento"));
        var s = document.createElement("script");
        s.src = "https://js.puter.com/v2/";
        s.onload = function () { chamar().then(ok).catch(erro); };
        s.onerror = function () { erro(new Error("sem rede para a IA")); };
        document.head.appendChild(s);
    });
}
function iaNuvemCustom(pergunta) {
    var p = iaPrefs();
    var url = String(p.cfgIAURL || "").trim();
    var chave = String(p.cfgIAChave || "").trim();
    if (!url) return Promise.reject(new Error("URL da IA nao configurada (Configuracoes)"));
    var corpo = {
        model: String(p.cfgIAModelo || "gpt-4o-mini"),
        messages: [
            { role: "system", content: "Voce e o assistente da loja Refrigerantes Convencao (delivery de bebidas). Responda em portugues, curto e so com os fatos abaixo:\n" + iaContexto() },
            { role: "user", content: pergunta }
        ],
        temperature: 0.4
    };
    var cabecalhos = { "Content-Type": "application/json" };
    if (chave) cabecalhos["Authorization"] = "Bearer " + chave;
    return iaComTimeout(
        fetch(url, { method: "POST", headers: cabecalhos, body: JSON.stringify(corpo) })
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(function (d) {
                var t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
                if (!t) throw new Error("resposta inesperada da API");
                return t;
            }), 8000);
}

/* ---------- orquestrador: fato=local; conversa=nuvem; falha=local ---------- */
function iaResponder(pergunta, pronto) {
    var local = iaRespostaLocal(pergunta);
    var provedor = iaProvedor();

    /* fato forte: responde na hora, sem depender de rede */
    if (local.rapido && local.confianca >= 0.9) { pronto(local.texto, "local"); return; }
    /* nuvem desligada */
    if (provedor === "local") { pronto(local.texto, "local"); return; }

    var nuvem = (provedor === "puter") ? iaNuvemPuter : iaNuvemCustom;
    var contexto = pergunta +
        "\n\nContexto da loja (responda so com isso; se nao souber diga que o vendedor responde no WhatsApp " + iaZapFmt() + "):\n" +
        iaContexto().slice(0, 2500);
    var concluido = false;
    nuvem(contexto).then(function (txt) {
        if (concluido) return;
        concluido = true;
        pronto(String(txt).trim(), provedor);
    }).catch(function () {
        if (concluido) return;
        concluido = true;
        /* nunca fica mudo: volta ao motor local */
        pronto(local.texto, "local");
    });
}

/* ---------- cache de respostas (mesma pergunta = mesma resposta) ---------- */
function iaCacheGet(p) {
    try {
        var m = JSON.parse(sessionStorage.getItem("iaCache") || "{}");
        return m[iaNormal(p)] || null;
    } catch (e) { return null; }
}
function iaCacheSet(p, texto) {
    try {
        var m = JSON.parse(sessionStorage.getItem("iaCache") || "{}");
        var chaves = Object.keys(m);
        if (chaves.length > 40) delete m[chaves[0]];
        m[iaNormal(p)] = texto;
        sessionStorage.setItem("iaCache", JSON.stringify(m));
    } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
}

/* ---------- RECOMENDACOES ("quem levou X levou Y") ---------- */
function iaHistoricoCompras() {
    var contagem = {};
    function soma(nome, qtd) {
        String(nome || "").split(/\s+/).forEach(function (t) {
            t = iaNormal(t);
            if (t.length >= 4 && IA_PARADAS.indexOf(t) < 0) contagem[t] = (contagem[t] || 0) + (qtd || 1);
        });
    }
    try {
        if (typeof getPedidos === "function") {
            getPedidos().slice(0, 30).forEach(function (p) {
                (p.itens || []).forEach(function (i) { soma(i.name, i.qty); });
            });
        }
    } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
    try {
        (JSON.parse(localStorage.getItem("refrigeranteCart") || "[]")).forEach(function (i) { soma(i.name, i.qty); });
    } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
    return contagem;
}
function variedadeCatalogo(cat, n, jaTem) {
    var usados = {};
    (jaTem || []).forEach(function (p) { usados[p.nm] = true; });
    var porCt = {};
    cat.forEach(function (p) { (porCt[p.ct] = porCt[p.ct] || []).push(p); });
    var cats = Object.keys(porCt);
    var saida = (jaTem || []).slice();
    var i = 0;
    while (saida.length < n && i < 300 && cats.length) {
        var ct = cats[i % cats.length];
        var fila = porCt[ct] || [];
        while (fila.length && usados[fila[0].nm]) fila.shift();
        if (fila.length) {
            var escolhido = fila.shift();
            usados[escolhido.nm] = true;
            saida.push(escolhido);
        } else {
            cats = cats.filter(function (c) { return c !== ct; });
        }
        i++;
    }
    return saida.slice(0, n);
}
function recomendarProdutos(n, cat, historico) {
    n = n || 4;
    cat = cat || iaCatalogo();
    if (!Array.isArray(cat) || !cat.length) return [];
    historico = (historico === undefined) ? iaHistoricoCompras() : historico;

    var tokens = Object.keys(historico || {});
    if (tokens.length) {
        var pontuados = cat.map(function (p) {
            var np = iaNormal(p.nm + " " + (p.ct || "")), s = 0;
            tokens.forEach(function (t) {
                if (np.indexOf(t) >= 0) s += historico[t] || 1;
                else if (t.slice(0, 5).length >= 4 && np.indexOf(t.slice(0, 5)) >= 0) s += 0.5;
            });
            return { p: p, s: s };
        }).filter(function (x) { return x.s > 0; })
          .sort(function (a, b) { return b.s - a.s; });
        if (pontuados.length) {
            var saida = pontuados.slice(0, n).map(function (x) { return x.p; });
            if (saida.length >= n) return saida;
            return variedadeCatalogo(cat, n, saida);
        }
    }
    return variedadeCatalogo(cat, n, []);
}

/* ============================================
   O CLIENTE VEE SO O BOTAO FLUTUANTE
   A secao "Escolhas para voce (IA)", o bloco de
   configuracao da IA e o resto da interface de IA
   nao sao mostrados ao cliente: ficam guardados
   para o painel do dono. O chat flutuante continua.
   ============================================ */
function iaRecomendacoesAtivas() {
    try {
        var p = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}");
        return p.cfgIARecs === true;
    } catch (e) { return false; }
}

function pintarRecomendados() {
    if (typeof document === "undefined") return;
    if (!iaRecomendacoesAtivas()) {
        var fora = document.getElementById("recomendados");
        if (fora) fora.innerHTML = "";
        return;
    }
    var el = document.getElementById("recomendados");
    if (!el) return;
    var cat = iaCatalogo();
    if (!cat.length) return;
    var itens = recomendarProdutos(4, cat);
    if (!itens.length) return;
    var podeBusca = (typeof fs === "function");
    var h = '<div class="sec-titulo"><i class="fa fa-wand-magic-sparkles"></i> Escolhas para voce (IA)</div>'
          + '<div class="ia-rec">';
    itens.forEach(function (p) {
        h += '<div class="ia-rec-card">'
           + '<b>' + iaEsc(p.nm) + '</b>'
           + '<span class="ia-rec-preco">' + iaEsc(p.pr) + '</span>'
           + (podeBusca
                ? '<button type="button" class="ia-rec-btn" onclick="fs(\'' + String(p.nm).replace(/'/g, "") + '\')">Ver no catalogo</button>'
                : '<a class="ia-rec-btn" href="index.html">Ver no catalogo</a>')
           + '</div>';
    });
    h += '</div>';
    el.innerHTML = h;
}
function iaRepintarRecomendados() {
    try { pintarRecomendados(); } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
}

/* ---------- ATENDIMENTO ROBOTICO + HUMANO REAL ----------
   - iaOfertaDoDia: escolhe todo dia um produto do catalogo de
     forma deterministica (data = semente). Atualiza sozinha.
   - iaHumanoPara: decide VENDEDOR ou MOTORISTA pelo assunto:
     entrega/atraso/caminhao -> motorista da regiao do cliente;
     preco/pedido/pagamento -> vendedor. Responde com WhatsApp. */
function iaSementeDia() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function iaOfertaDoDia(cat) {
    cat = cat || iaCatalogo();
    if (!Array.isArray(cat) || !cat.length) return null;
    var ordem = iaSementeDia();
    var i = ordem % cat.length;
    var p = cat[i] || cat[0];
    if (!p) return null;
    var d = new Date(ordem.toString().slice(0, 4) + "-" + ordem.toString().slice(4, 6) + "-" + ordem.toString().slice(6, 8) + "T12:00:00");
    var quando = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2);
    return { nm: p.nm, pr: p.pr, ct: p.ct, quando: quando, motivo: "escolha automatica da IA" };
}
/* contato da loja: tudo vem de loja.js (fonte unica) */
function iaZapNum() { return (typeof contatoLoja === "function") ? contatoLoja().whatsapp : ""; }
function iaZapFmt() { return (typeof contatoLoja === "function") ? contatoLoja().telefone : ""; }
function iaEmail() { return (typeof contatoLoja === "function") ? contatoLoja().email : ""; }

function iaZapLink(numero, texto) {
    return "https://wa.me/" + numero + (texto ? "?text=" + encodeURIComponent(texto) : "");
}
function iaHumanoPara(textoLivre) {
    var q = iaNormal(textoLivre);
var vendedorNum = iaZapNum();
var vendedorFmt = iaZapFmt();
    /* motorista: entrega, atraso, caminhao, troca na hora */
    var eLogistica = /entrega|entregador|atras|atraso|demor|caminhao|motorista|rota|troca|devolu|erra(d|o)|faltan/.test(q);
    if (eLogistica && typeof CAMINHOES !== "undefined" && typeof caminhaoDaRegiao === "function") {
        var regiaoId = "";
        try {
            var bairro = "";
            if (typeof Conta !== "undefined") bairro = (Conta.dados().bairro || "");
            regiaoId = (typeof regiaoDoBairro === "function") ? (regiaoDoBairro(bairro) || "") : "";
        } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
        var cam = null;
        try { cam = regiaoId ? caminhaoDaRegiao(regiaoId) : null; } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
        if (!cam && CAMINHOES.length) cam = CAMINHOES[0];
        if (cam && cam.whatsapp) {
            return {
                quem: "Motorista " + (cam.motorista || "") + " (" + (cam.corNome || "frota") + ")",
                numero: cam.whatsapp,
                numeroFmtado: cam.telefone || cam.whatsapp,
                link: iaZapLink(cam.whatsapp, "Ola, sou cliente da Convencao - preciso de ajuda com a entrega."),
                motivo: "assunto de entrega: encaminhei para o motorista"
            };
        }
    }
    /* padrao: vendedor */
    return {
        quem: "Vendedor",
        numero: vendedorNum,
        numeroFmtado: vendedorFmt,
        link: iaZapLink(vendedorNum, "Ola, preciso de ajuda com meu pedido."),
        motivo: eLogistica ? "motorista sem WhatsApp cadastrado: encaminhei para o vendedor" : ""
    };
}

/* ---------- WIDGET (chat flutuante, todas as paginas do cliente) ---------- */
function iaMontarWidget() {
    if (typeof document === "undefined" || !document.body) return;
    try { if (/admin\.html$/i.test(location.pathname || "")) return; } catch (e) { return; }
    if (document.getElementById("iaFab")) return;

    var fab = document.createElement("button");
    fab.id = "iaFab";
    fab.className = "ia-fab";
    fab.setAttribute("aria-label", "Assistente de IA");
    fab.innerHTML = '<i class="fa fa-robot"></i><span>IA</span>';

    var painel = document.createElement("div");
    painel.id = "iaPainel";
    painel.className = "ia-painel";
    painel.innerHTML =
        '<div class="ia-topo"><span><i class="fa fa-robot"></i> Assistente Convencao</span>'
        + '<button type="button" class="ia-fechar" aria-label="Fechar">&times;</button></div>'
        + '<div class="ia-historico" id="iaHistorico"></div>'
        + '<div class="ia-dica" id="iaDicas">'
        + '<button type="button" class="ia-chip" data-q="Quando voces entregam?">Quando entregam?</button>'
        + '<button type="button" class="ia-chip" data-q="Quanto custa o frete?">Quanto e o frete?</button>'
        + '<button type="button" class="ia-chip" data-q="Quais formas de pagamento?">Pagamento?</button>'
        + '<button type="button" class="ia-chip ia-chip-clientes" data-clientes="1"><i class="fa fa-phone"></i> Bot Clientes</button>'
        + '</div>'
        + '<div class="ia-form"><input type="text" id="iaTexto" placeholder="Pergunte a IA..." autocomplete="off">'
        + '<button type="button" class="ia-enviar" aria-label="Enviar"><i class="fa fa-paper-plane"></i></button></div>';

    document.body.appendChild(fab);
    document.body.appendChild(painel);

    /* sobe um pouco quando a barra de oferta esta embaixo */
    function ajustarBase() {
        var barra = document.getElementById("avisosOferta");
        var base = (barra && barra.offsetHeight) ? (barra.offsetHeight + 14) : 20;
        fab.style.bottom = base + "px";
        painel.style.bottom = (base + 66) + "px";
    }
    ajustarBase();
    try {
        if (typeof MutationObserver !== "undefined") {
            new MutationObserver(ajustarBase).observe(document.body, { childList: true });
        }
    } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}

    fab.addEventListener("click", function () {
        painel.classList.toggle("aberto");
        if (painel.classList.contains("aberto")) {
            restaurarHistorico();
            var inp = document.getElementById("iaTexto");
            if (inp) inp.focus();
        }
    });
    painel.querySelector(".ia-fechar").addEventListener("click", function () {
        painel.classList.remove("aberto");
    });
    painel.querySelectorAll(".ia-chip").forEach(function (c) {
        c.addEventListener("click", function () {
            if (c.classList.contains("ia-chip-clientes")) {
                var tel = iaZapNum();
                var txt = "Olá, sou cliente da Convencao. Quero falar com o bot de clientes.";
                window.open("https://wa.me/" + tel + "?text=" + encodeURIComponent(txt), "_blank");
                return;
            }
            iaEnviarPergunta(c.getAttribute("data-q") || c.textContent);
        });
    });
    var enviarBtn = painel.querySelector(".ia-enviar");
    var campo = document.getElementById("iaTexto");
    if (enviarBtn) enviarBtn.addEventListener("click", function () {
        if (campo && campo.value.trim()) { iaEnviarPergunta(campo.value.trim()); campo.value = ""; }
    });
    if (campo) campo.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" && campo.value.trim()) { iaEnviarPergunta(campo.value.trim()); campo.value = ""; }
    });

    /* catalogo pronto = responde preco na hora; recomendacao repinta */
    restaurarHistorico();
    iaCarregarCatalogo().then(function () { iaRepintarRecomendados(); });
    iaRepintarRecomendados();
    setTimeout(iaRepintarRecomendados, 1500);
}

/* ---------- historico do chat + mensagens ---------- */
function iaHistoricoLer() {
    try { return JSON.parse(sessionStorage.getItem("iaHistorico") || "[]"); }
    catch (e) { return []; }
}
function iaHistoricoGravar(lista) {
    try { sessionStorage.setItem("iaHistorico", JSON.stringify(lista.slice(-20))); } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
}
function iaDesenharMensagem(texto, quem, fonte) {
    var box = document.getElementById("iaHistorico");
    if (!box) return null;
    var d = document.createElement("div");
    d.className = "ia-msg " + (quem === "voce" ? "ia-voce" : "ia-ia");
    d.textContent = texto;
    if (fonte && fonte !== "local" && quem !== "voce") {
        d.setAttribute("data-fonte", fonte);
        d.title = "Resposta da IA (" + fonte + ")";
    }
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    return d;
}
function restaurarHistorico() {
    var box = document.getElementById("iaHistorico");
    if (!box || box.childNodes.length) return;
    iaHistoricoLer().forEach(function (m) { iaDesenharMensagem(m.t, m.q); });
    if (!box.childNodes.length) {
        iaDesenharMensagem("Oi! Pergunte sobre precos, entrega, frete, pagamento ou seus pedidos.", "ia");
    }
}
function iaEnviarPergunta(txt) {
    txt = String(txt || "").trim();
    if (!txt) return;
    iaDesenharMensagem(txt, "voce");
    iaHistoricoGravar(iaHistoricoLer().concat([{ t: txt, q: "voce" }]));

    var cache = iaCacheGet(txt);
    if (cache) {
        iaDesenharMensagem(cache, "ia");
        iaHistoricoGravar(iaHistoricoLer().concat([{ t: cache, q: "ia" }]));
        return;
    }
    var pensando = iaDesenharMensagem("pensando...", "ia");
    iaResponder(txt, function (resposta, fonte) {
        if (pensando && pensando.parentNode) pensando.parentNode.removeChild(pensando);
        iaDesenharMensagem(resposta, "ia", fonte);
        iaHistoricoGravar(iaHistoricoLer().concat([{ t: resposta, q: "ia" }]));
        iaCacheSet(txt, resposta);
    });
}

/* ---------- boot seguro (sem navegador nao quebra nada) ---------- */
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iaMontarWidget);
    } else {
        try { iaMontarWidget(); } catch(e){/* proposital: o assistente e um extra, a tela nao pode travar por causa dele */}
    }
}