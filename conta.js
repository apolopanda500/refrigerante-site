/* ============================================
   CONTA DO CLIENTE - fonte unica de verdade
   Usado pelo Perfil, Configuracoes, Checkout,
   Historico e Cabecalho. Sincroniza sozinho.
   ============================================ */
var Conta = (function () {

    var K_CONTA  = "convencao_usuario";   // { nome, tel }
    var K_PERFIL = "refrigerantePerfil";   // { nome, tel, email, endereco, bairro, complemento }
    var K_FOTO   = "refrigeranteFoto";     // dataURL da foto
    var MAX_FOTO = 1.6 * 1024 * 1024;     // 1,5 MB

    function ler(chave, padrao) {
        try {
            var s = localStorage.getItem(chave);
            return s ? JSON.parse(s) : padrao;
        } catch (e) { return padrao; }
    }
    function gravar(chave, valor) {
        try { localStorage.setItem(chave, JSON.stringify(valor)); return true; }
        catch (e) { return false; }
    }

    /* ---------- dados ---------- */
    function dados() {
        var conta  = ler(K_CONTA, {})  || {};
        var perfil = ler(K_PERFIL, {}) || {};
        var nome   = (perfil.nome && perfil.nome.trim()) || (conta.nome && conta.nome.trim()) || "";
        var tel    = (perfil.tel  && perfil.tel.trim())  || (conta.tel  && conta.tel.trim())  || "";
        return {
            nome: nome,
            inicial: nome ? nome.charAt(0).toUpperCase() : "C",
            tel: tel,
            email: perfil.email || "",
            endereco: perfil.endereco || "",
            bairro: perfil.bairro || "",
            complemento: perfil.complemento || "",
            temNome: !!nome,
            temTel: !!tel,
            foto: (function () { try { return localStorage.getItem(K_FOTO) || ""; } catch (e) { return ""; } })()
        };
    }

    function estaVazia() {
        var d = dados();
        return !d.nome && !d.tel;
    }

    /* ---------- salvar ---------- */
    function salvar(novo) {
        var conta  = ler(K_CONTA, {})  || {};
        var perfil = ler(K_PERFIL, {}) || {};

        if (novo.nome !== undefined) {
            conta.nome = String(novo.nome || "").trim();
            perfil.nome = conta.nome;
        }
        if (novo.tel !== undefined) {
            conta.tel = String(novo.tel || "").trim();
            perfil.tel = conta.tel;
        }
        ['email', 'endereco', 'bairro', 'complemento'].forEach(function (k) {
            if (novo[k] !== undefined) perfil[k] = String(novo[k] || "").trim();
        });

        gravar(K_CONTA, conta);
        gravar(K_PERFIL, perfil);
        Conta.aplicarEmTodos();
        return dados();
    }

    function salvarNome(nome) { return salvar({ nome: nome }); }

    /* ---------- foto ---------- */
    function salvarFoto(dataUrl) {
        try { localStorage.setItem(K_FOTO, dataUrl); return true; }
        catch (e) { return false; }
    }
    function lerFoto() {
        try { return localStorage.getItem(K_FOTO) || ""; } catch (e) { return ""; }
    }
    function limparFoto() {
        try { localStorage.removeItem(K_FOTO); } catch (e) {}
        Conta.aplicarEmTodos();
    }

    function escolherArquivo(input, cb) {
        var arq = input && input.files && input.files[0];
        if (!arq) return;
        if (arq.size > MAX_FOTO) {
            if (typeof avisar === "function") avisar("Foto muito grande. Use uma imagem de até 1,5 MB.");
            else alert("Foto muito grande. Use uma imagem de até 1,5 MB.");
            input.value = "";
            return;
        }
        var leitor = new FileReader();
        leitor.onload = function (e) {
            if (salvarFoto(e.target.result) && cb) cb(e.target.result);
            else alert("Não foi possível salvar a foto.");
        };
        leitor.onerror = function () { alert("Não foi possível ler a imagem."); };
        leitor.readAsDataURL(arq);
    }

    /* ---------- aplicar em qualquer elemento da pagina ---------- */
    /* preenche campos com data-nome, data-tel, data-email, etc. */
    function aplicarEmTodos() {
        var d = dados();

        document.querySelectorAll("[data-conta='nome']").forEach(function (el) {
            if (document.activeElement !== el) el.value = d.nome;
            el.placeholder = d.nome || "Seu nome";
        });
        document.querySelectorAll("[data-conta='tel']").forEach(function (el) {
            if (document.activeElement !== el) el.value = d.tel;
            el.placeholder = d.tel || "Seu WhatsApp";
        });
        ['email', 'endereco', 'bairro', 'complemento'].forEach(function (k) {
            document.querySelectorAll("[data-conta='" + k + "']").forEach(function (el) {
                if (document.activeElement !== el) el.value = d[k] || "";
            });
        });

        /* avatares */
        document.querySelectorAll("[data-conta-foto]").forEach(function (box) {
            var img = box.querySelector("img");
            var txt = box.querySelector(".pa-texto, .avatar-texto");
            if (d.foto) {
                if (img) { img.src = d.foto; img.style.display = "block"; }
                if (txt) txt.style.display = "none";
            } else {
                if (img) { img.removeAttribute("src"); img.style.display = "none"; }
                if (txt) { txt.textContent = d.inicial; txt.style.display = "flex"; }
            }
        });

        /* nome de exibicao */
        document.querySelectorAll("[data-conta='nome-mostrar']").forEach(function (el) {
            el.textContent = d.nome || "Cliente";
        });
        document.querySelectorAll("[data-conta='tel-mostrar']").forEach(function (el) {
            el.textContent = d.tel || "WhatsApp não informado";
        });

        return d;
    }

    /* sincroniza se outra aba mudar */
    window.addEventListener("storage", function (e) {
        if (e.key === K_CONTA || e.key === K_PERFIL || e.key === K_FOTO) Conta.aplicarEmTodos();
    });

    document.addEventListener("DOMContentLoaded", function () { Conta.aplicarEmTodos(); });

    return {
        dados: dados,
        estaVazia: estaVazia,
        salvar: salvar,
        salvarNome: salvarNome,
        salvarFoto: salvarFoto,
        lerFoto: lerFoto,
        limparFoto: limparFoto,
        escolherArquivo: escolherArquivo,
        aplicarEmTodos: aplicarEmTodos,
        ler: ler,
        gravar: gravar
    };
})();
