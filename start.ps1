Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   FundIQ - AI Mutual Fund Portfolio Platform" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Start Frontend
Write-Host "[1/2] Starting Frontend (React + Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Frontend starting on http://localhost:5173' -ForegroundColor Green; npm run dev"

# Wait a second
Start-Sleep -Seconds 2

# Start Backend
Write-Host "[2/2] Starting Backend (Node.js + Express)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Backend starting on http://localhost:5000' -ForegroundColor Yellow; npm run dev"

Write-Host ""
Write-Host "✅ Both servers launching in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Make sure MongoDB URI is set in backend\.env" -ForegroundColor Yellow
Write-Host ""
