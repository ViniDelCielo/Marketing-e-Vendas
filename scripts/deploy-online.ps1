# Deploy online — SOMENTE conta ViniDelCielo (NUNCA Gerson)
# Uso: npm run deploy:online

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Run-Cli {
  param(
    [Parameter(Mandatory = $true)][string[]]$Command,
    [string]$Label = ""
  )
  if ($Label) { Write-Host "   → $Label" -ForegroundColor DarkGray }

  $quoted = ($Command | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }) -join ' '

  $fullCmd = "npx $quoted"
  cmd /c "$fullCmd 2>&1"
  if ($LASTEXITCODE -ne 0) {
    throw "Falhou (exit $LASTEXITCODE): $fullCmd"
  }
}

$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) { throw "Arquivo .env não encontrado" }
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k, $v = $_ -split '=', 2
  Set-Item -Path "env:$k" -Value $v
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
$vercelScope = "vini-del-cielo-s-projects"

if (-not $supabaseUrl -or -not $anonKey) {
  throw "Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env"
}

Write-Host "`n=== Vercel (marketing-kaizen) ===" -ForegroundColor Cyan
Run-Cli @("vercel", "link", "--project", "marketing-kaizen", "--scope", $vercelScope, "--yes") -Label "vercel link"

foreach ($name in @("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")) {
  cmd /c "npx vercel env rm $name production --scope $vercelScope --yes 2>nul"
}

Run-Cli @(
  "vercel", "env", "add", "VITE_SUPABASE_URL", "production",
  "--scope", $vercelScope, "--force", "--yes", "--value", $supabaseUrl
) -Label "env VITE_SUPABASE_URL"

Run-Cli @(
  "vercel", "env", "add", "VITE_SUPABASE_ANON_KEY", "production",
  "--scope", $vercelScope, "--force", "--yes", "--value", $anonKey
) -Label "env VITE_SUPABASE_ANON_KEY"

Run-Cli @("vercel", "--prod", "--yes", "--scope", $vercelScope) -Label "vercel deploy --prod"

Write-Host "`n=== Supabase Edge Functions (KAIZEN) ===" -ForegroundColor Cyan
$ref = ($supabaseUrl -replace 'https://', '' -replace '\.supabase\.co', '').Trim()
Run-Cli @("supabase", "link", "--project-ref", $ref) -Label "supabase link"

if ($serviceKey) {
  Run-Cli @(
    "supabase", "secrets", "set",
    "SUPABASE_URL=$supabaseUrl",
    "SUPABASE_SERVICE_ROLE_KEY=$serviceKey",
    "SUPABASE_ANON_KEY=$anonKey"
  ) -Label "supabase secrets"
}

Get-ChildItem (Join-Path $root "supabase\functions") -Directory | ForEach-Object {
  Run-Cli @("supabase", "functions", "deploy", $_.Name) -Label "function $($_.Name)"
}

Write-Host "`n✅ Deploy concluído" -ForegroundColor Green
Write-Host "   Site: https://marketing-kaizen.vercel.app"
Write-Host "   Supabase: $supabaseUrl"
