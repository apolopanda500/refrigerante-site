package br.com.convencao.vendedor

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * APP DE VERDADE DO PAINEL (tela propria, sem a barra do navegador).
 *
 * Antes o app so abria o Chrome. Agora ele e um programa: tela propria,
 * icone proprio, e as permissoes sao DO APP - notificacao, GPS, camera,
 * fotos e contatos. O pedido de permissao acontece aqui, uma vez so, e o
 * cliente nao precisa mexer em nada.
 */
class MainActivity : AppCompatActivity() {

    private val endereco: String = "https://convencao-site.rickjax123.workers.dev/admin.html"
    private val corBarra: String = "#1d3f6e"
    private val nomeCanal: String = "convencao-pedidos"

    private lateinit var web: WebView
    private var arquivoEscolhido: ValueCallback<Array<Uri>>? = null
    private var geoPermitido = false

    /* ---------- permissoes que o app pede (e so as que o site usa) ----------
       GPS e a localizacao da entrega; camera e galeria sao para a foto do
       perfil; notificacao e o aviso de pedido; contatos e para o cliente
       puxar o proprio numero. Armazenamento so em Android antigo (no
       novo, quem controla foto e video sao READ_MEDIA_*). */
    private val permissoes = mutableListOf(
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.CAMERA
    ).apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
            add(Manifest.permission.READ_MEDIA_IMAGES)
            add(Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            add(Manifest.permission.READ_EXTERNAL_STORAGE)
            add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
        add(Manifest.permission.READ_CONTACTS)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        criarCanalDeAviso()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = android.graphics.Color.parseColor(corBarra)
        }
        montarTela()
        pedirFaltando()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun montarTela() {
        web = WebView(this)
        web.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        setContentView(web)

        val s: WebSettings = web.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        s.loadWithOverviewMode = true
        s.useWideViewPort = true
        s.builtInZoomControls = true
        s.displayZoomControls = false
        s.setSupportZoom(true)
        s.cacheMode = WebSettings.LOAD_DEFAULT
        s.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        s.mediaPlaybackRequiresUserGesture = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.safeBrowsingEnabled = true

        /* o GPS do site depende disto */
        try { s.setGeolocationEnabled(true) } catch (e: Exception) { /* navegador antigo */ }

        web.addJavascriptInterface(PonteNotificacao(), "PonteNotificacao")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url.toString()
                /* o que nao e do site (WhatsApp, telefone, mapa) abre no app de verdade */
                if (!u.startsWith("https://convencao-site.rickjax123.workers.dev")) {
                    try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u))) } catch (e: Exception) { }
                    return true
                }
                return false
            }

            override fun onPageFinished(view: WebView, url: String) {
                injetarPonteDeNotificacao()
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            /* camera e microfone pedidos pelo site */
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }

            /* GPS: o site pergunta, o app responde */
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                runOnUiThread {
                    val ok = tem(Manifest.permission.ACCESS_FINE_LOCATION) || tem(Manifest.permission.ACCESS_COARSE_LOCATION)
                    callback.invoke(origin, ok, false)
                    geoPermitido = ok
                }
            }

            /* a foto do perfil: o cliente escolhe da galeria ou tira uma */
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                arquivoEscolhido?.onReceiveValue(null)
                arquivoEscolhido = callback
                return try {
                    startActivityForResult(params.createIntent(), 900)
                    true
                } catch (e: Exception) {
                    arquivoEscolhido = null
                    false
                }
            }
        }

        web.loadUrl(endereco)
    }

    /* ---------- ponte: o site chama new Notification() e isso precisa virar
       um aviso DE VERDADE do Android. Sem esta ponte, dentro do WebView a
       Notification API nao existe e o cliente nunca receberia aviso. ----- */
    private fun injetarPonteDeNotificacao() {
        val js = """
(function () {
  if (window.__notificacaoApp) return;
  window.__notificacaoApp = true;
  function P() { return window.PonteNotificacao; }
  function avisar(titulo, corpo, tag) {
    try { P().mostra(String(titulo || ""), String(corpo || ""), String(tag || "")); } catch (e) {}
  }
  function Notificacao(titulo, opcoes) {
    opcoes = opcoes || {};
    avisar(titulo, opcoes.body, opcoes.tag);
    this.close = function () {};
  }
  Notificacao.requestPermission = function (cb) {
    function responde(v) { try { if (typeof cb === "function") cb(v); else if (cb && cb.resolve) cb.resolve(v); } catch (e) {} }
    try {
      var atual = P().permissao();
      if (atual === "granted") { responde("granted"); return Promise.resolve("granted"); }
      P().pedir();
      var tentativas = 0;
      var relogio = setInterval(function () {
        tentativas++;
        if (P().permissao() === "granted") { clearInterval(relogio); responde("granted"); }
        else if (tentativas > 20) { clearInterval(relogio); responde(P().permissao()); }
      }, 400);
      return Promise.resolve(atual);
    } catch (e) { try { if (typeof cb === "function") cb("denied"); } catch (e2) {} }
  };
  try { Object.defineProperty(Notificacao, "permission", { get: function () { try { return P().permissao(); } catch (e) { return "denied"; } } }); } catch (e) {}
  window.Notification = Notificacao;
})();
"""
        web.evaluateJavascript(js, null)
    }

    private inner class PonteNotificacao {
        @android.webkit.JavascriptInterface
        fun mostra(titulo: String, texto: String, tag: String) {
            runOnUiThread { avisarNoCelular(titulo, texto, tag) }
        }

        @android.webkit.JavascriptInterface
        fun permissao(): String {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return "granted"
            return if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) "granted" else "default"
        }

        @android.webkit.JavascriptInterface
        fun pedir() {
            runOnUiThread { pedirNotificacao() }
        }
    }

    private fun avisarNoCelular(titulo: String, texto: String, tag: String) {
        val n = NotificationCompat.Builder(this, nomeCanal)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(if (titulo.isBlank()) "Convencao" else titulo)
            .setContentText(texto)
            .setStyle(NotificationCompat.BigTextStyle().bigText(texto))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        try {
            NotificationManagerCompatDisparo(this).notify((if (tag.isBlank()) 1 else tag.hashCode()), n)
        } catch (e: Exception) {
            try { NotificationManager(this).notify((if (tag.isBlank()) 1 else tag.hashCode()), n) } catch (e2: Exception) { }
        }
    }

    /* atalho: manager de notificacao, isolado para o compilador nao inventar moda */
    private fun NotificationManagerCompatDisparo(ctx: MainActivity) =
        androidx.core.app.NotificationManagerCompat.from(ctx)

    private fun criarCanalDeAviso() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val canal = NotificationChannel(
            nomeCanal,
            getString(R.string.app_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply { description = "Avisos do seu pedido" }
        NotificationManager(this).createNotificationChannel(canal)
    }

    private fun tem(permissao: String) =
        ContextCompat.checkSelfPermission(this, permissao) == PackageManager.PERMISSION_GRANTED

    private fun pedirFaltando() {
        val faltando = permissoes.filter { !tem(it) }
        if (faltando.isEmpty()) return
        ActivityCompat.requestPermissions(this, faltando.toTypedArray(), 1001)
    }

    private fun pedirNotificacao() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (tem(Manifest.permission.POST_NOTIFICATIONS)) return
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1002)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        /* recarrega para o site passar a enxergar o que foi liberado */
        web.postDelayed({ web.evaluateJavascript("if (window.Notification && Notification.requestPermission) { try { Notification.requestPermission(function(){}); } catch(e){} }", null) }, 400)
    }

    @Deprecated("continua funcionando nas versoes antigas do Android")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 900) {
            val retorno = if (resultCode == Activity.RESULT_OK) {
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            } else null
            arquivoEscolhido?.onReceiveValue(retorno)
            arquivoEscolhido = null
        }
    }

    /* o botao voltar do celular volta no historico do site */
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::web.isInitialized) {
            web.removeJavascriptInterface("PonteNotificacao")
            web.destroy()
        }
        super.onDestroy()
    }
}