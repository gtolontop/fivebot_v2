# Complete bot restart script
$botId = "5ad66b0d-b8e6-4f81-92e3-b32a518a8764"

Write-Host "Starting backend if not running..."
$backend = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like "*nest*"}
if (-not $backend) {
    Start-Process -WorkingDirectory "backend" -FilePath "cmd" -ArgumentList "/c npm run start:dev" -WindowStyle Hidden
    Start-Sleep -Seconds 10
}

Write-Host "Waiting for backend to be ready..."
$maxRetries = 30
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -Method Get -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend is ready!"
            break
        }
    } catch {
        # Backend not ready yet
    }
    $retryCount++
    Start-Sleep -Seconds 1
}

Write-Host "Stopping bot..."
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/bots/$botId/stop" -Method POST
    Write-Host "Bot stop command sent"
} catch {
    Write-Host "Bot was already stopped or error occurred: $_"
}

Start-Sleep -Seconds 3

Write-Host "Starting bot..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/bots/$botId/start" -Method POST
    Write-Host "Bot start command sent"
} catch {
    Write-Host "Failed to start bot: $_"
}

Write-Host "Done! Check the bot logs in the dashboard."