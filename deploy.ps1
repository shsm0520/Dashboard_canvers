# Docker 빌드 및 배포 스크립트 (PowerShell)

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [switch]$Build,
    
    [Parameter(Mandatory=$false)]
    [switch]$Down,
    
    [Parameter(Mandatory=$false)]
    [switch]$Logs,
    
    [Parameter(Mandatory=$false)]
    [switch]$Status
)

$ErrorActionPreference = "Stop"

Write-Host "Dashboard Canvas - Docker 배포 스크립트" -ForegroundColor Cyan
Write-Host "환경: $Environment" -ForegroundColor Yellow
Write-Host ""

# 환경 변수 파일 확인
if (-not (Test-Path ".env")) {
    Write-Host "오류: .env 파일이 없습니다." -ForegroundColor Red
    Write-Host ".env.example 파일을 복사하여 .env 파일을 생성하세요." -ForegroundColor Yellow
    Write-Host "명령어: cp .env.example .env" -ForegroundColor Yellow
    exit 1
}

# Docker Compose 파일 설정
$composeFiles = @("-f", "docker-compose.yml")
if ($Environment -eq 'prod') {
    $composeFiles += @("-f", "docker-compose.prod.yml")
}

# Down 명령
if ($Down) {
    Write-Host "컨테이너를 중지하고 제거합니다..." -ForegroundColor Yellow
    docker-compose $composeFiles down
    Write-Host "완료!" -ForegroundColor Green
    exit 0
}

# Status 명령
if ($Status) {
    Write-Host "컨테이너 상태:" -ForegroundColor Yellow
    docker-compose $composeFiles ps
    Write-Host ""
    Write-Host "리소스 사용량:" -ForegroundColor Yellow
    docker stats --no-stream
    exit 0
}

# Logs 명령
if ($Logs) {
    Write-Host "로그를 표시합니다... (Ctrl+C로 종료)" -ForegroundColor Yellow
    docker-compose $composeFiles logs -f --tail=100
    exit 0
}

# Build 명령
if ($Build) {
    Write-Host "Docker 이미지를 빌드합니다..." -ForegroundColor Yellow
    docker-compose $composeFiles build --no-cache
    Write-Host "빌드 완료!" -ForegroundColor Green
}

# 컨테이너 시작
Write-Host "컨테이너를 시작합니다..." -ForegroundColor Yellow
docker-compose $composeFiles up -d

# 상태 확인
Write-Host ""
Write-Host "컨테이너 상태 확인 중..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

docker-compose $composeFiles ps

Write-Host ""
Write-Host "배포 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "서비스 접속 정보:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:80" -ForegroundColor White
Write-Host "- Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "- Database: localhost:3306" -ForegroundColor White
Write-Host ""
Write-Host "유용한 명령어:" -ForegroundColor Cyan
Write-Host "- 로그 확인: .\deploy.ps1 -Logs" -ForegroundColor White
Write-Host "- 상태 확인: .\deploy.ps1 -Status" -ForegroundColor White
Write-Host "- 중지: .\deploy.ps1 -Down" -ForegroundColor White
Write-Host "- 재빌드: .\deploy.ps1 -Build" -ForegroundColor White
