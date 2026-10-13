<#
.SYNOPSIS
    serve.ps1 - Servidor HTTP local para o site "Refrigerantes Convenção"

.DESCRIPTION
    Inicia um servidor HTTP simples usando .NET HttpListener para servir
    os arquivos do site local. Resolve o problema do protocolo file:///
    (Chrome bloqueia localStorage e outras APIs em file:// URLs).

    Uso:  powershell -ExecutionPolicy Bypass -File serve.ps1
    Acesso:  http://localhost:8080

    Para parar: Ctrl+C
#>
param(
    [int]$Port = 8080,
    [string]$Path = (Get-Location)
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
$listener.Start()

Write-Ok "Servidor iniciado em: $prefix"
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
        $context = $listener.GetContext()
        $requestCount++
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.AbsolutePath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }

        $filePath = Join-Path $Path ($urlPath.TrimStart("/"))

        # Prevenir directory traversal
        $resolved = (Resolve-Path $filePath -ErrorAction SilentlyContinue)
        if (-not $resolved) {
            $response.StatusCode = 404
            $response.StatusDescription = "Not Found"
            $body = "404 - Arquivo nao encontrado"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($body)
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
}
finally {
    $listener.Stop()
    Write-Host "`nServidor parado." -ForegroundColor Yellow
}
