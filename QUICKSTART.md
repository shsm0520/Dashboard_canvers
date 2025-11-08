# Dashboard Canvas - Quick Start

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일을 편집하여 실제 값 입력 (필수!)
# - DB_ROOT_PASSWORD
# - DB_PASSWORD
# - JWT_SECRET
```

### 2. Docker로 실행

#### Windows (PowerShell)

```powershell
# 개발 환경 시작
.\deploy.ps1

# 프로덕션 환경 시작
.\deploy.ps1 -Environment prod

# 로그 확인
.\deploy.ps1 -Logs

# 중지
.\deploy.ps1 -Down
```

#### Linux/Mac

```bash
# 실행 권한 부여
chmod +x deploy.sh

# 개발 환경 시작
./deploy.sh dev up

# 프로덕션 환경 시작
./deploy.sh prod up

# 로그 확인
./deploy.sh dev logs

# 중지
./deploy.sh dev down
```

### 3. 접속

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:5000
- **Database**: localhost:3306

## 📋 주요 명령어

### Docker Compose 직접 사용

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 로그 확인
docker-compose logs -f

# 재시작
docker-compose restart

# 상태 확인
docker-compose ps
```

### 데이터베이스 관리

```bash
# 데이터베이스 접속
docker-compose exec db mysql -u dashboard_user -p dashboard_db

# 백업
docker-compose exec db mysqldump -u root -p dashboard_db > backup.sql

# 복원
docker-compose exec -T db mysql -u root -p dashboard_db < backup.sql
```

## 🔧 문제 해결

### 포트 충돌

`.env` 파일에서 포트 변경:

```env
BACKEND_PORT=5001
FRONTEND_PORT=8080
DB_PORT=3307
```

### 컨테이너 재빌드

```bash
docker-compose down -v
docker-compose up -d --build
```

### 로그 확인

```bash
# 모든 서비스
docker-compose logs -f

# 특정 서비스
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

## 📚 더 자세한 정보

자세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참조하세요.
