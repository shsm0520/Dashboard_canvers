#!/bin/bash

# Docker 빌드 및 배포 스크립트 (Linux/Mac)

set -e

ENVIRONMENT=${1:-dev}
COMMAND=${2:-up}

echo "================================================"
echo "Dashboard Canvas - Docker 배포 스크립트"
echo "환경: $ENVIRONMENT"
echo "================================================"
echo ""

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    echo "오류: .env 파일이 없습니다."
    echo ".env.example 파일을 복사하여 .env 파일을 생성하세요."
    echo "명령어: cp .env.example .env"
    exit 1
fi

# Docker Compose 파일 설정
COMPOSE_FILES="-f docker-compose.yml"
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.prod.yml"
fi

case $COMMAND in
    up)
        echo "컨테이너를 시작합니다..."
        docker-compose $COMPOSE_FILES up -d
        echo ""
        echo "컨테이너 상태:"
        docker-compose $COMPOSE_FILES ps
        echo ""
        echo "배포 완료!"
        echo ""
        echo "서비스 접속 정보:"
        echo "- Frontend: http://localhost:80"
        echo "- Backend API: http://localhost:5000"
        echo "- Database: localhost:3306"
        ;;
    
    down)
        echo "컨테이너를 중지하고 제거합니다..."
        docker-compose $COMPOSE_FILES down
        echo "완료!"
        ;;
    
    build)
        echo "Docker 이미지를 빌드합니다..."
        docker-compose $COMPOSE_FILES build --no-cache
        echo "빌드 완료!"
        ;;
    
    logs)
        echo "로그를 표시합니다... (Ctrl+C로 종료)"
        docker-compose $COMPOSE_FILES logs -f --tail=100
        ;;
    
    restart)
        echo "컨테이너를 재시작합니다..."
        docker-compose $COMPOSE_FILES restart
        echo "재시작 완료!"
        ;;
    
    status)
        echo "컨테이너 상태:"
        docker-compose $COMPOSE_FILES ps
        echo ""
        echo "리소스 사용량:"
        docker stats --no-stream
        ;;
    
    backup)
        echo "데이터베이스 백업 중..."
        mkdir -p backup
        BACKUP_FILE="backup/db-backup-$(date +%Y%m%d-%H%M%S).sql"
        docker-compose $COMPOSE_FILES exec -T db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > $BACKUP_FILE
        echo "백업 완료: $BACKUP_FILE"
        ;;
    
    *)
        echo "사용법: $0 [dev|prod] [up|down|build|logs|restart|status|backup]"
        echo ""
        echo "명령어:"
        echo "  up      - 컨테이너 시작"
        echo "  down    - 컨테이너 중지 및 제거"
        echo "  build   - 이미지 빌드"
        echo "  logs    - 로그 확인"
        echo "  restart - 컨테이너 재시작"
        echo "  status  - 상태 확인"
        echo "  backup  - 데이터베이스 백업"
        exit 1
        ;;
esac
