# SSH Connect Script
$ErrorActionPreference = "Stop"

# Install Posh-SSH if needed
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH module..."
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}

Import-Module Posh-SSH -Force

$password = ConvertTo-SecureString 'T=*4%mZ6' -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential('root', $password)

Write-Host "Connecting to 82.41.119.192..."
try {
    $session = New-SSHSession -ComputerName '82.41.119.192' -Credential $credential -AcceptKey -Force -ConnectionTimeout 30

    if ($session) {
        Write-Host "Connected! Running command..."
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $args[0]
        Write-Output $result.Output
        Remove-SSHSession -SessionId $session.SessionId | Out-Null
    } else {
        Write-Error "Session is null"
    }
} catch {
    Write-Error "Error: $_"
}
