# make_svgs.ps1 - Gera imagens SVG estilizadas por tipo de bebida (identidade Convenção)
$dir = "C:\Users\Micro\refrigerante-site\img"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

# tipo => [corLiquido, corRotulo, corFundo, nomeExibicao, formato]
$types = @{
  G  = @("#8B4513", "#FFC107", "#FFF8E1", "Guarana", "bottle")
  C  = @("#3E2723", "#D32F2F", "#FFEBEE", "Cola", "bottle")
  L  = @("#C0CA33", "#558B2F", "#F1F8E9", "Limao", "bottle")
  O  = @("#FB8C00", "#EF6C00", "#FFF3E0", "Laranja", "bottle")
  U  = @("#7B1FA2", "#6A1B9A", "#F3E5F5", "Uva", "bottle")
  A  = @("#FBC02D", "#F9A825", "#FFFDE7", "Abacaxi", "bottle")
  T  = @("#EC407A", "#AD1457", "#FCE4EC", "Frutaina", "bottle")
  V  = @("#9CCC65", "#33691E", "#F1F8E9", "Vitts Limao", "bottle")
  E  = @("#00ACC1", "#00838F", "#E0F7FA", "Energetico", "can")
  H  = @("#5D4037", "#3E2723", "#EFEBE9", "Chinotto", "bottle")
  R  = @("#42A5F5", "#1976D2", "#E3F2FD", "Refresco", "bottle")
  W  = @("#29B6F6", "#0288D1", "#E1F5FE", "Agua", "bottle")
  B  = @("#FFB300", "#E65100", "#FFF8E1", "Chopp", "mug")
}

function Bottle($liq,$label,$bg,$name){
  return @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="$bg"/>
  <rect x="0" y="330" width="400" height="70" fill="#eeeeee"/>
  <text x="200" y="358" font-family="Segoe UI,Arial" font-size="26" font-weight="bold" fill="#333" text-anchor="middle">$name</text>
  <text x="200" y="384" font-family="Segoe UI,Arial" font-size="16" fill="#777" text-anchor="middle">Convencao</text>
  <rect x="182" y="60" width="36" height="30" rx="4" fill="#c62828"/>
  <rect x="176" y="86" width="48" height="16" fill="#b71c1c"/>
  <path d="M160 105 Q160 130 150 145 L150 300 Q150 315 165 315 L235 315 Q250 315 250 300 L250 145 Q240 130 240 105 Z" fill="$liq" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
  <rect x="158" y="180" width="84" height="90" rx="6" fill="$label"/>
  <rect x="166" y="196" width="68" height="8" rx="4" fill="rgba(255,255,255,0.85)"/>
  <rect x="166" y="212" width="52" height="6" rx="3" fill="rgba(255,255,255,0.7)"/>
  <rect x="166" y="226" width="60" height="6" rx="3" fill="rgba(255,255,255,0.7)"/>
  <circle cx="200" cy="252" r="10" fill="rgba(255,255,255,0.9)"/>
  <path d="M188 250 L196 258 L214 242" stroke="$label" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
"@
}

function Can($liq,$label,$bg,$name){
  return @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="$bg"/>
  <rect x="0" y="330" width="400" height="70" fill="#eeeeee"/>
  <text x="200" y="358" font-family="Segoe UI,Arial" font-size="26" font-weight="bold" fill="#333" text-anchor="middle">$name</text>
  <text x="200" y="384" font-family="Segoe UI,Arial" font-size="16" fill="#777" text-anchor="middle">Convencao</text>
  <rect x="150" y="95" width="100" height="220" rx="16" fill="$liq" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
  <ellipse cx="200" cy="97" rx="50" ry="10" fill="#cfd8dc"/>
  <ellipse cx="200" cy="97" rx="50" ry="10" fill="none" stroke="#90a4ae" stroke-width="2"/>
  <rect x="158" y="160" width="84" height="100" rx="6" fill="$label"/>
  <rect x="168" y="180" width="64" height="9" rx="4" fill="rgba(255,255,255,0.9)"/>
  <rect x="168" y="198" width="48" height="6" rx="3" fill="rgba(255,255,255,0.7)"/>
  <rect x="168" y="212" width="56" height="6" rx="3" fill="rgba(255,255,255,0.7)"/>
  <path d="M175 245 L192 245 L185 230 L205 230 L180 262 L188 248 L172 248 Z" fill="#FFEB3B"/>
</svg>
"@
}

function Mug($liq,$label,$bg,$name){
  return @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="$bg"/>
  <rect x="0" y="330" width="400" height="70" fill="#eeeeee"/>
  <text x="200" y="358" font-family="Segoe UI,Arial" font-size="26" font-weight="bold" fill="#333" text-anchor="middle">$name</text>
  <text x="200" y="384" font-family="Segoe UI,Arial" font-size="16" fill="#777" text-anchor="middle">Convencao</text>
  <path d="M140 130 L150 300 Q151 318 170 318 L230 318 Q249 318 250 300 L260 130 Z" fill="#ECEFF1" stroke="rgba(0,0,0,0.12)" stroke-width="2"/>
  <path d="M144 150 L256 150 L250 300 Q249 310 238 310 L162 310 Q151 310 150 300 Z" fill="$liq"/>
  <ellipse cx="200" cy="150" rx="56" ry="12" fill="#FFE0B2"/>
  <ellipse cx="200" cy="150" rx="56" ry="12" fill="none" stroke="#FFF" stroke-width="3"/>
  <path d="M260 170 Q300 175 300 205 Q300 235 258 238" fill="none" stroke="#ECEFF1" stroke-width="16" stroke-linecap="round"/>
  <rect x="165" y="200" width="70" height="70" rx="8" fill="$label"/>
  <text x="200" y="232" font-family="Segoe UI,Arial" font-size="18" font-weight="bold" fill="#fff" text-anchor="middle">CHOPP</text>
  <text x="200" y="255" font-family="Segoe UI,Arial" font-size="13" fill="rgba(255,255,255,0.85)" text-anchor="middle">Ravache</text>
</svg>
"@
}

foreach($k in $types.Keys){
  $liq = $types[$k][0]; $label = $types[$k][1]; $bg = $types[$k][2]; $name = $types[$k][3]; $fmt = $types[$k][4]
  $svg = ""
  if($fmt -eq "bottle"){ $svg = Bottle $liq $label $bg $name }
  elseif($fmt -eq "can"){ $svg = Can $liq $label $bg $name }
  else { $svg = Mug $liq $label $bg $name }
  $file = Join-Path $dir "$k.svg"
  [System.IO.File]::WriteAllText($file, $svg, (New-Object System.Text.UTF8Encoding $false))
  Write-Output "criado: $k.svg ($name)"
}
Write-Output "Total: $($types.Count) SVGs"