$VGenRoot = "$PSScriptRoot\..\..\VGen"

# VGen API (Fastify)
Start-Process -WindowStyle Minimized powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$VGenRoot\app'; pnpm dev"
)

# VGen UI (Vite)
Start-Process -WindowStyle Minimized powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$VGenRoot\ui'; pnpm dev"
)

# EveryMinute (Vite)
Start-Process -WindowStyle Minimized powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$PSScriptRoot\..'; npm run dev"
)

Write-Host 'Started all services:' -ForegroundColor Green
Write-Host '  VGen API   -> http://localhost:3012'
Write-Host '  VGen UI    -> http://localhost:5200'
Write-Host '  EveryMinute -> http://localhost:3010'
