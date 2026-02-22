# Run as Administrator to allow inbound connections on port 4000 for Marvin API
# Right-click PowerShell → Run as administrator, then: .\scripts\add-firewall-rule.ps1

$ruleName = "Marvin API 4000"
$existing = netsh advfirewall firewall show rule name=$ruleName 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Rule '$ruleName' already exists."
} else {
    netsh advfirewall firewall add rule name=$ruleName dir=in action=allow protocol=tcp localport=4000
    Write-Host "Added firewall rule for port 4000."
}
