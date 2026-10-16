<#
.SYNOPSIS
    serve.ps1 - Servidor HTTP local para o site "Refrigerantes Convenção"

.DESCRIPTION
    Inicia um servidor HTTP simples usando .NET HttpListener para servir
    os arquivos do site local. Resolve o problema do protocolo file:///
    (Chrome bloqueia localStorage e outras APIs em file:// URLs).

    Uso:  powershell -ExecutionPolicy Bypass -File serve.ps1
    Do celular:  powershell -ExecutionPolicy Bypass -File serve.ps1 -Rede
    Acesso:  http://localhost:8080  (ou http://IP-DO-PC:8080 com -Rede)

    Para parar: Ctrl+C

    -Rede  abre tambem na rede local, para o CELULAR carregar o site.
           Se pedir administrador, rode o PowerShell como administrador
           ou use:  netsh http add urlacl url=http://+:8080/ user=%USERNAME%
#>
param(
    [int]$Port = 8080,
    [string]$Path = (Get-Location),
    [switch]$Rede
)

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host $msg -ForegroundColor Green }
function Write-Err($msg)  { Write-Host $msg -ForegroundColor Red }

Write-Info "=========================================="
Write-Info "  SERVIDOR LOCAL - Refrigerantes Convenção"
Write-Info "=========================================="
Write-Info ""

if (-not (Test-Path "$Path\index.html")) {
    Write-Err "ERRO: index.html nao encontrado em $Path"
    Write-Err "Execute este script a partir da pasta do site."
    exit 1
}

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
if ($Rede) {
    # "+" = todas as interfaces: e o que faz o CELULAR (na mesma rede)
    # conseguir carregar o site. No Windows isso costuma pedir admin.
    $listener.Prefixes.Add("http://+:$Port/")
}
try {
    $listener.Start()
}
catch {
    Write-Err "ERRO ao abrir a porta $Port : $($_.Exception.Message)"
    if ($Rede) {
        Write-Err "Para abrir na rede local rode o PowerShell como ADMINISTRADOR,"
        Write-Err "ou libere a porta uma vez:"
        Write-Err "  netsh http add urlacl url=http://+:$Port/ user=%USERNAME%"
    }
    exit 1
}

Write-Ok "Servidor iniciado em: $prefix"
if ($Rede) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
           Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254*" } |
           Select-Object -First 1).IPAddress
    if ($ip) { Write-Ok "No celular (mesmo wifi): http://${ip}:$Port/" }
}
Write-Info "Servando arquivos de: $Path"
Write-Info ""
Write-Info "Pressione Ctrl+C para parar."
Write-Info ""

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
}

$requestCount = 0

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
        } catch {
            # servidor sendo fechado (Ctrl+C): sai do laco sem quebrar
            break
        }
        $requestCount++
        $request = $context.Request
        $response = $context.Response

        # UM pedido ruim nao pode derrubar o servidor: arquivo sendo
        # gravado, pasta, request quebrado... o site precisa continuar
        # no ar (foi assim que a porta fechava sozinha e o "site nao
        # carregava" voltava).
        try {
            $urlPath = $request.Url.AbsolutePath
            if ($urlPath -eq "/") { $urlPath = "/index.html" }

            $filePath = Join-Path $Path ($urlPath.TrimStart("/"))

            # Prevenir directory traversal
            $resolved = (Resolve-Path $filePath -ErrorAction SilentlyContinue)
            if (-not $resolved) {
                $body = "404 - Arquivo nao encontrado"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($body)
                $response.StatusCode = 404
                $response.StatusDescription = "Not Found"
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }

            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mimeType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) { $mimeType = $mimeTypes[$ext] }

            $bytes = [System.IO.File]::ReadAllBytes($resolved.Path)
            $response.StatusCode = 200
            $response.ContentType = $mimeType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()

            $icon = if ($ext -eq ".html") { "[HTML]" } elseif ($ext -eq ".css") { "[CSS]" } elseif ($ext -eq ".js") { "[JS]" } elseif ($ext -eq ".svg") { "[SVG]" } else { "[FILE]" }
            Write-Host ("  {0} {1} (#{2})" -f $icon, $urlPath, $requestCount) -ForegroundColor DarkGray
        }
        catch {
            Write-Host ("  [ERRO] {0}: {1}" -f $request.Url.AbsolutePath, $_.Exception.Message) -ForegroundColor Yellow
            try { $response.Abort() } catch { }
        }
    }
}
finally {
    $listener.Stop()
    Write-Host "`nServidor parado." -ForegroundColor Yellow
}
