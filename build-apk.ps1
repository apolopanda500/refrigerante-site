# ==========================================================
#  GERA O APK (cliente e vendedor) A PARTIR DO SITE
#  Uso:  powershell -ExecutionPolicy Bypass -File build-apk.ps1
#
#  O que ele faz:
#   1. instala o JDK 17 e o Android SDK (se faltarem)
#   2. instala o Bubblewrap (npm)
#   3. gera o APK do cliente e o do vendedor
#
#  Os APK ficam em:
#    apk\convencao-cliente.apk
#    apk\convencao-vendedor.apk
# ==========================================================
$ErrorActionPreference = "Stop"
$SITE = "https://apolopanda500.github.io/refrigerante-site"
$SDK = "$env:LOCALAPPDATA\Android\Sdk"

function Say($t) { Write-Host ""
$t
    Write-Host "" }

Say "1/4  Conferindo o Java"
$temJava17 = $false
try {
    $jv = (java -version 2>&1 | Out-String)
    if ($jv -match '"17\.|"21\.') { $temJava17 = $true }
} catch {}
if (-not $temJava17) {
    Say "    Java 17+ ausente. Instalando (OpenJDK 17)..."
    winget install --id EclipseAdoptium.Temurin.17.JDK --silent --accept-package-agreements --accept-source-agreements | Out-Null
    Say "    Java instalado. Feche e abra o terminal de novo e rode este script outra vez."
    exit 1
}
Say "    Java OK"

Say "2/4  Conferindo o Android SDK"
if (-not (Test-Path "$SDK\cmdline-tools")) {
    Say "    Baixando as ferramentas de linha de comando do Android (~150 MB)..."
    $tmp = "$env:TEMP\android-cmdline.zip"
    $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
    New-Item -ItemType Directory -Force -Path "$SDK\cmdline-tools" | Out-Null
    Expand-Archive -Path $tmp -DestinationPath "$SDK\cmdline-tools" -Force
    Move-Item "$SDK\cmdline-tools\cmdline-tools" "$SDK\cmdline-tools\latest" -Force
    Say "    Ferramentas instaladas."
}
$env:ANDROID_HOME = $SDK
$sdkm = "$SDK\cmdline-tools\latest\bin\sdkmanager.bat"
Say "    Instalando platform-tools, platforms e build-tools (~1 GB)..."
& $sdkm --sdk_root="$SDK" "platform-tools" "platforms;android-34" "build-tools;34.0.0" | Out-Null
Say "    Android SDK pronto."

Say "3/4  Instalando o Bubblewrap"
npm install -g @bubblewrap/cli | Out-Null
Say "    Bubblewrap instalado."

Say "4/4  Gerando os APK"
# a versao dos dois APK e SEMPRE a do site (versao.txt): assim o app
# instalado nunca fica com uma versao diferente da loja.
$versaoSite = (Get-Content "versao.txt" -Raw).Trim()
$codigo = [int]($versaoSite -replace '\D','')
Say "    Versao do site: $versaoSite  (versionCode $codigo)"

Say "    JDK: " + (& java -version 2>&1 | Select-Object -First 1)
Say "    Versao do site: $versaoSite  (versionCode $codigo)"
# o init baixa o manifesto da loja; o build usa o arquivo local
bubblewrap init --manifest "https://apolopanda500.github.io/refrigerante-site/manifest.json" --asset "logo.png:img/icon-512.png" | Out-Null
# app do CLIENTE
bubblewrap build --manifest "manifest.json" --appVersionName "$versaoSite" --appVersionCode "$codigo" | Out-Null
Copy-Item "app-release-signed.apk" "apk\convencao-cliente.apk" -Force -ErrorAction SilentlyContinue
# app do VENDEDOR (+100 no codigo para nunca colidir com o do cliente)
Copy-Item "manifest-vendedor.json" "manifest-vendedor-local.json" -Force -ErrorAction SilentlyContinue
bubblewrap build --manifest "manifest-vendedor-local.json" --appName "Painel Vendedor" --appVersionName "$versaoSite" --appVersionCode ($codigo + 100) --package "br.com.convencao.painel" | Out-Null
Copy-Item "app-release-signed.apk" "apk\convencao-vendedor.apk" -Force -ErrorAction SilentlyContinue
Remove-Item "manifest-vendedor-local.json" -Force -ErrorAction SilentlyContinue

[System.IO.File]::WriteAllText("apk\versao-apk.txt", $versaoSite, (New-Object System.Text.UTF8Encoding($false)))
Say "    APK cliente e vendedor gravados na versao $versaoSite"

Say "Pronto!"
Say "APKs em:"
Get-ChildItem "apk\*.apk" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("   " + $_.Name + "  (" + [math]::Round($_.Length / 1MB, 1) + " MB)  " + $_.LastWriteTime)
}
