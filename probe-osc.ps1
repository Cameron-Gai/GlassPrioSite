# Probe the GlassReports OSC quote endpoint exactly as GlassPrioSite's intake does.
# Usage:  ./probe-osc.ps1                      (uses GLASSREPORTS_BASE_URL from .env.local, port 5173)
#         ./probe-osc.ps1 -BaseUrl http://localhost:5174
#         ./probe-osc.ps1 -BaseUrl https://your-deployed-glassreports
param(
  [string]$BaseUrl = "",
  [string[]]$Zips = @("98501","98516"),
  [string]$JobTypeName = "Glass Replacement (1-4 Panes) - Consultation"
)

function Get-EnvVal($file, $key) {
  if (-not (Test-Path $file)) { return "" }
  $line = Get-Content $file | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
  if ($line) { return ($line -replace "^\s*$key\s*=", "").Trim() } else { return "" }
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $BaseUrl) { $BaseUrl = Get-EnvVal "$here\.env.local" "GLASSREPORTS_BASE_URL" }
if (-not $BaseUrl) { $BaseUrl = "http://localhost:5173" }
$BaseUrl = $BaseUrl.TrimEnd('/')

# Token: must match ZONE_MAP_QUOTE_TOKEN in BOTH apps' .env.local
$token = Get-EnvVal "$here\.env.local" "ZONE_MAP_QUOTE_TOKEN"
if (-not $token) { $token = Get-EnvVal "$here\..\GlassReports\.env.local" "ZONE_MAP_QUOTE_TOKEN" }

Write-Host "Base URL : $BaseUrl"
Write-Host "Job type : $JobTypeName"
Write-Host ("Token    : {0}" -f $(if ($token) { "present (len $($token.Length))" } else { "MISSING" }))
Write-Host ""

foreach ($zip in $Zips) {
  $uri = "$BaseUrl/api/zone-map/quote?zip=$zip&jobTypeName=$([uri]::EscapeDataString($JobTypeName))"
  try {
    $r = Invoke-RestMethod -Uri $uri -Headers @{ "x-zone-map-token" = $token; "accept" = "application/json" } -TimeoutSec 6
    "{0} -> serviced={1}  osc=`${2}  matchedBy={3}  zone='{4}'  jobTypeId={5}" -f `
      $zip, $r.serviced, $r.osc, $r.matchedBy, $r.zoneName, $r.jobTypeId
  } catch {
    "{0} -> NO RESPONSE / ERROR: {1}" -f $zip, $_.Exception.Message
  }
}

Write-Host ""
Write-Host "How to read it:"
Write-Host "  NO RESPONSE / ERROR ............. root cause A: wrong URL/port or GlassReports not running"
Write-Host "  matchedBy=name|id  & osc=175 .... working; the `$0 was stale/port-drift, not a data bug"
Write-Host "  matchedBy=zone-default & osc<>175  root cause B: name didn't match the catalog -> zone default"
Write-Host "  98501 zone <> 98516 zone ........ root cause C: the two ZIPs are in different zones"
