$ErrorActionPreference = 'Stop'

$applicationIdentifier = 'com.restomaster.os'
$cachePath = Join-Path $env:LOCALAPPDATA "$applicationIdentifier\EBWebView"
$confirmationText = 'SUPPRIMER LE CACHE'

$runningProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
  $_.ProcessName -match 'restomaster' -or $_.MainWindowTitle -like 'RestoMaster OS*'
}

if ($runningProcesses) {
  throw "RestoMaster OS est encore ouvert. Fermez l'application et relancez ce script."
}

Write-Warning "Cette opération est réservée aux machines de test."
Write-Warning "Le dossier EBWebView peut contenir le cache Firestore hors ligne, y compris des ventes non synchronisées."
Write-Warning "Ne lancez jamais ce script sur un poste client avant d'avoir confirmé la synchronisation des opérations."

if (-not (Test-Path -LiteralPath $cachePath -PathType Container)) {
  Write-Output "Aucun cache WebView trouvé à l'emplacement attendu : $cachePath"
  exit 0
}

$confirmation = Read-Host "Tapez $confirmationText pour supprimer uniquement $cachePath"
if ($confirmation -cne $confirmationText) {
  throw 'Confirmation incorrecte. Le cache WebView n’a pas été supprimé.'
}

Remove-Item -LiteralPath $cachePath -Recurse -Force
Write-Output "Cache WebView supprimé : $cachePath"
