package br.com.convencao.vendedor

import android.os.Bundle
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat

/**
 * Abre a loja dentro de uma Custom Tab (a aba nativa do Chrome).
 * Vantagens sobre WebView: carrega rapido, usa o login do navegador,
 * nao fica com tela branca e o usuario ve o enderejo real.
 */
class MainActivity : androidx.appcompat.app.AppCompatActivity() {

    /** endereco da loja */
    private val endereco: String = "https://convencao-site.rickjax123.workers.dev/admin.html"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        abrirLoja()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        abrirLoja()
    }

    private fun abrirLoja() {
        val cor = android.graphics.Color.parseColor("#1d3f6e")
        val cores = androidx.browser.customtabs.CustomTabColorSchemeParams.Builder()
            .setToolbarColor(cor)
            .build()

        val intent = CustomTabsIntent.Builder()
            .setDefaultColorSchemeParams(cores)
            .setShowTitle(true)
            .setShareState(CustomTabsIntent.SHARE_STATE_ON)
            .build()

        try {
            intent.launchUrl(this, Uri.parse(endereco))
        } catch (e: Exception) {
            // navegador sem Custom Tab: abre o site normal
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(endereco)))
        }
    }
}
