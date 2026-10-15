/* ============================================================
   PROJETO ANDROID DO APP (rebuild a partir do zero)

   Converte o site em um app Android usando Custom Tabs
   (abre o site dentro de um navegador nativo, semoodles de
   tela em branco e com o mesmo login do navegador).

   Como gerar:
     node apk/android/build.js            (gera so os arquivos)
     gradle -p apk/android assembleRelease

   Estrutura:
     app/src/main/AndroidManifest.xml
     app/src/main/java/br/com/convencao/<cliente|vendedor>/MainActivity.kt
     app/src/main/res/...
   ============================================================ */

const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");            /* apk/           */
const PROJ = path.join(RAIZ, "android");
const SITE_CLIENTE = "https://apolopanda500.github.io/refrigerante-site/index.html";
const SITE_VENDEDOR = "https://apolopanda500.github.io/refrigerante-site/admin.html";
const VERSAO = "1.0";
const VERSAO_CODE = 2;

const APLICATIVOS = [
    {
        nome: "cliente",
        pacote: "br.com.convencao.cliente",
        rotulo: "Convenção",
        url: SITE_CLIENTE,
        icone: "ic_launcher.png",
        fundo: "#3d4465"
    },
    {
        nome: "vendedor",
        pacote: "br.com.convencao.vendedor",
        rotulo: "Convenção Vendedor",
        url: SITE_VENDEDOR,
        icone: "ic_launcher_vendedor.png",
        fundo: "#1d3f6e"
    }
];

function escrever(caminho, conteudo) {
    const dir = path.dirname(caminho);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(caminho, conteudo, "utf8");
    console.log("  criado: " + caminho.replace(PROJ + "\\", "").replace(PROJ + "/", ""));
}

/* ---------------- manifesto ---------------- */
function manifesto(app) {
    /* IMPORTANTE: o nome da activity tem que ser IGUAL ao pacote.
       Foi exatamente essa troca de nome que quebrou a versao anterior. */
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${app.pacote}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/${app.icone.replace(".png", "")}"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/${app.icone.replace(".png", "")}"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;
}

/* ---------------- MainActivity ---------------- */
function mainActivity(app) {
    return `package ${app.pacote}

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
    private val endereco: String = "${app.url}"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        abrirLoja()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        abrirLoja()
    }

    private fun abrirLoja() {
        val cor = android.graphics.Color.parseColor("${app.fundo}")
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
`;
}

/* ---------------- recursos ---------------- */
function strings(app) {
    return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${app.rotulo}</string>
</resources>
`;
}

function styles() {
    return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@android:color/black</item>
        <item name="android:statusBarColor">#3d4465</item>
    </style>
</resources>
`;
}

/* ---------------- build.gradle ---------------- */
function buildGradleApp(app) {
    return `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${app.pacote}'
    compileSdk 34

    defaultConfig {
        applicationId "${app.pacote}"
        minSdk 24
        targetSdk 34
        versionCode ${VERSAO_CODE}
        versionName "${VERSAO}"
    }

    signingConfigs {
        release {
            // o arquivo fica fora do git (ver .gitignore)
            storeFile file("../../convencao.jks")
            storePassword System.getenv("KS_PASS") ?: "convencao2026"
            keyAlias System.getenv("KS_ALIAS") ?: "convencao"
            keyPassword System.getenv("KS_PASS") ?: "convencao2026"
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            signingConfig signingConfigs.release
        }
        debug {
            applicationIdSuffix ".debug"
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.browser:browser:1.5.0'
    implementation 'androidx.core:core-ktx:1.10.1'
}
`;
}

/* ---------------- gera tudo ---------------- */
console.log("=== gerando o projeto Android ===");

escrever(path.join(PROJ, "settings.gradle"), `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "convencao"
include ':app'
`);

escrever(path.join(PROJ, "build.gradle"), `plugins {
    id 'com.android.application' version '8.1.4' apply false
    id 'org.jetbrains.kotlin.android' version '1.9.25' apply false
}
`);

escrever(path.join(PROJ, "gradle.properties"), `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
kotlin.code.style=official
`);

/* os dois apps no mesmo projeto: um module por aplicativo */
APLICATIVOS.forEach(function (app) {
    console.log("\n  --- " + app.nome + " ---");
    escrever(path.join(PROJ, app.nome, "build.gradle"), buildGradleApp(app));
    escrever(path.join(PROJ, app.nome, "src", "main", "AndroidManifest.xml"), manifesto(app));
    escrever(path.join(PROJ, app.nome, "src", "main", "java",
        app.pacote.replace(/\./g, path.sep), "MainActivity.kt"), mainActivity(app));
    escrever(path.join(PROJ, app.nome, "src", "main", "res", "values", "strings.xml"), strings(app));
    escrever(path.join(PROJ, app.nome, "src", "main", "res", "values", "themes.xml"), styles());
});

console.log("\n=== adjustando o settings.gradle para os dois apps ===");
escrever(path.join(PROJ, "settings.gradle"), `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "convencao"
include ':cliente'
include ':vendedor'
project(':cliente').projectDir = file('cliente')
project(':vendedor').projectDir = file('vendedor')
`);

console.log("\nPronto. Para gerar os APKs:");
console.log("  cd apk/android");
console.log("  gradle :cliente:assembleRelease :vendedor:assembleRelease");
console.log("  (use o gradle 8.4 com JDK 17)");