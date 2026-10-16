/* ============================================
   APP CHECK (Firebase)
   Protege o banco de precos: so o site oficial
   consegue ler e gravar. Ninguem de fora.

   COMO CONFIGURAR (uma vez, no console do Firebase):
   1) Projeto > Configuracoes > Seus apps > Web (</>)
      Copie a "apiKey" e cole no CONFIG abaixo.
   2) Build > App Check > Registrar app Web
      Escolha reCAPTCHA v3, cole o mesmo endereco do site
      (apolopanda500.github.io) e copie a "chave do site".
   3) Build > App Check > Realtime Database
      Comece em MONITOR e depois ative a protecao.

   Sem essas chaves o site continua funcionando normal
   (so que o banco fica sem a protecao extra).
   ============================================ */
var APPCHECK_CONFIG = {
    apiKey: "",
    authDomain: "planning-with-ai-9b2c9.firebaseapp.com",
    projectId: "planning-with-ai-9b2c9",
    databaseURL: "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com",
    storageBucket: "planning-with-ai-9b2c9.firebasestorage.app",
    messagingSenderId: "45318659756",
    appId: "1:45318659756:web:8e5872f6b43d162c2e0909",   // app "CONVENCAO"
    siteKey: ""      // <- cole aqui a chave do site do reCAPTCHA v3 (tela App Check)
};

var AppCheck = (function () {
    var token = null;
    var pronto = false;
    var tentativaFeita = false;

    function temChaves() {
        return !!(APPCHECK_CONFIG.apiKey && APPCHECK_CONFIG.siteKey);
    }

    function carregarSDK() {
        return new Promise(function (resolver, rejeitar) {
            if (window.firebase && window.firebase.appCheck) { resolver(); return; }
            var s = document.createElement("script");
            s.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check-compat.js";
            s.onload = function () { resolver(); };
            s.onerror = function () { rejeitar(new Error("SDK do Firebase nao carregou")); };
            document.head.appendChild(s);
        });
    }

    function iniciar() {
        if (pronto) return Promise.resolve(token);
        if (tentativaFeita) return Promise.resolve(token);
        tentativaFeita = true;
        if (!temChaves() || typeof window.firebase === "undefined") return Promise.resolve(null);

        return carregarSDK().then(function () {
            var app = null;
            try {
                app = firebase.initializeApp({
                    apiKey: APPCHECK_CONFIG.apiKey,
                    projectId: APPCHECK_CONFIG.projectId,
                    databaseURL: APPCHECK_CONFIG.databaseURL,
                    appId: APPCHECK_CONFIG.appId || undefined
                });
                firebase.appCheck().initialize({
                    provider: new firebase.appCheck.ReCaptchaV3Provider(APPCHECK_CONFIG.siteKey),
                    isTokenAutoRefreshEnabled: true
                });
                pronto = true;
                return firebase.appCheck().getToken(/* forceRefresh */ false)
                    .then(function (r) { token = (r && r.token) || null; return token; })
                    .catch(function () { return null; });
            } catch (e) {
                return null;
            }
        }).catch(function () { return null; });
    }

    /* cabecalhos para as requisicoes ao banco de precos */
    function cabecalhos() {
        var h = { "Content-Type": "application/json" };
        if (token) h["X-Firebase-AppCheck"] = token;
        return h;
    }

    return {
        iniciar: iniciar,
        cabecalhos: cabecalhos,
        ativo: function () { return !!token; },
        temChaves: temChaves
    };
})();

/* usado pelo app.js e pelo painel */
/* (cada script ja tem a sua copia local: nao deixamos nada global) */