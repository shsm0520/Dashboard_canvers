#!/bin/bash
# Ubuntu 서버 배포 헬퍼 스크립트
# Jenkins에서 SSH로 실행됩니다

set -e

DEPLOY_PATH=${DEPLOY_PATH:-/opt/dashboard-canvers}
COMPOSE_FILES="-f docker-compose.deploy.yml -f docker-compose.prod.yml"

echo "================================================"
echo "Dashboard Canvas - Remote Deployment"
echo "================================================"
echo "Deployment path: $DEPLOY_PATH"
echo "Date: $(date)"
echo ""

# 배포 디렉토리로 이동
cd $DEPLOY_PATH

# .env 파일 확인
if [ ! -f .env ]; then
    echo "오류: .env 파일이 없습니다!"
    exit 1
fi

# Docker 및 Docker Compose 확인
if ! command -v docker &> /dev/null; then
    echo "오류: Docker가 설치되지 않았습니다!"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "오류: Docker Compose가 설치되지 않았습니다!"
    exit 1
fi

# 기존 컨테이너 중지
echo "=== Stopping existing containers ==="
docker compose $COMPOSE_FILES down || true
echo ""

# Docker 이미지 Pull (레지스트리 사용 시)
if [ -n "$DOCKER_REGISTRY" ]; then
    echo "=== Pulling latest images from registry ==="
    docker compose $COMPOSE_FILES pull
    echo ""
fi

# 새 컨테이너 시작
echo "=== Starting new containers ==="
docker compose $COMPOSE_FILES up -d
echo ""

# 서비스 시작 대기
echo "=== Waiting for services to start ==="
sleep 10

# 헬스체크
echo "=== Health check ==="
BACKEND_PORT=$(grep BACKEND_PORT .env | cut -d '=' -f2 || echo "5000")
FRONTEND_PORT=$(grep FRONTEND_PORT .env | cut -d '=' -f2 || echo "80")

echo "Checking backend (port $BACKEND_PORT)..."
for i in {1..30}; do
    if curl -f http://localhost:$BACKEND_PORT/api/health 2>/dev/null; then
        echo "✓ Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Backend health check failed"
        docker compose $COMPOSE_FILES logs --tail=50 backend
        exit 1
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

echo "Checking frontend (port $FRONTEND_PORT)..."
for i in {1..30}; do
    if curl -f http://localhost:$FRONTEND_PORT/health 2>/dev/null; then
        echo "✓ Frontend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Frontend health check failed"
        docker compose $COMPOSE_FILES logs --tail=50 frontend
        exit 1
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

# 서비스 상태 출력
echo ""
echo "=== Service status ==="
docker compose $COMPOSE_FILES ps

# 정리
echo ""
echo "=== Cleaning up old images ==="
docker image prune -f --filter "until=168h"

echo ""
echo "================================================"
echo "Deployment completed successfully!"
echo "================================================"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT"
echo ""
