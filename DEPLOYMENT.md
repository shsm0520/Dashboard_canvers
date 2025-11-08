# Dashboard Canvas - 배포 가이드

## 목차

1. [개요](#개요)
2. [사전 요구사항](#사전-요구사항)
3. [로컬 개발 환경](#로컬-개발-환경)
4. [Docker Compose 배포](#docker-compose-배포)
5. [Jenkins CI/CD 설정](#jenkins-cicd-설정)
6. [운영 환경 배포](#운영-환경-배포)
7. [문제 해결](#문제-해결)

## 개요

이 프로젝트는 Docker와 Jenkins를 사용하여 자동화된 배포를 지원합니다.

### 아키텍처

- **Frontend**: React 19 + Vite (Nginx로 서빙)
- **Backend**: Node.js + Express + TypeScript
- **Database**: MariaDB 11.2
- **컨테이너화**: Docker & Docker Compose
- **CI/CD**: Jenkins

## 사전 요구사항

### 필수 설치 항목

- Docker (버전 24.0 이상)
- Docker Compose (버전 2.20 이상)
- Git
- Jenkins (CI/CD 자동화용)

### 시스템 요구사항

- CPU: 2코어 이상
- RAM: 4GB 이상
- 디스크: 10GB 이상의 여유 공간

## 로컬 개발 환경

### 1. 저장소 클론

```bash
git clone <repository-url>
cd Dashboard_canvers
```

### 2. 환경 변수 설정

```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env

# .env 파일을 편집하여 실제 값 입력
```

### 3. Docker Compose로 실행

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그 확인
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### 4. 서비스 접속

- Frontend: http://localhost:80
- Backend API: http://localhost:5000
- MariaDB: localhost:3306

### 5. 서비스 중지

```bash
# 모든 서비스 중지
docker-compose down

# 볼륨까지 삭제 (데이터 초기화)
docker-compose down -v
```

## Docker Compose 배포

### 환경 변수 설정

`.env` 파일에서 다음 변수들을 설정하세요:

```env
# Database
DB_ROOT_PASSWORD=strong_root_password_here
DB_NAME=dashboard_db
DB_USER=dashboard_user
DB_PASSWORD=strong_password_here
DB_PORT=3306

# Backend
BACKEND_PORT=5000
JWT_SECRET=your_very_secure_jwt_secret_key_change_this
CORS_ORIGIN=http://your-domain.com

# Canvas API
CANVAS_API_URL=https://uc.instructure.com/api/v1

# Frontend
FRONTEND_PORT=80
VITE_API_URL=http://your-domain.com:5000
```

### 빌드 및 실행

```bash
# 이미지 빌드
docker-compose build

# 백그라운드에서 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 헬스체크 확인
docker-compose ps | grep healthy
```

### 데이터베이스 초기화

데이터베이스는 첫 실행 시 자동으로 초기화됩니다. `backend/data/init.sql` 파일이 자동으로 실행됩니다.

## Jenkins CI/CD 설정

### 1. Jenkins 설치 및 설정

```bash
# Jenkins를 Docker로 실행
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

### 2. Jenkins 플러그인 설치

Jenkins 관리 > 플러그인 관리에서 다음 플러그인을 설치하세요:

- Docker Pipeline
- Git Plugin
- Credentials Binding Plugin
- Pipeline
- NodeJS Plugin

### 3. Jenkins Credentials 설정

Jenkins 관리 > Credentials에서 다음을 추가하세요:

#### a) Docker Registry Credentials (선택사항)

- Kind: Username with password
- ID: `docker-credentials-id`
- Username: Docker Hub 사용자명
- Password: Docker Hub 비밀번호

#### b) Environment File

- Kind: Secret file
- ID: `dashboard-env-file`
- File: `.env` 파일 업로드

### 4. Jenkins Pipeline 생성

1. Jenkins 대시보드에서 "New Item" 클릭
2. "Pipeline" 선택
3. Pipeline 설정:
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: 저장소 URL
   - **Branch**: \*/main (또는 원하는 브랜치)
   - **Script Path**: Jenkinsfile

### 5. Webhook 설정 (선택사항)

GitHub/GitLab에서 webhook을 설정하여 푸시 시 자동 배포:

```
Payload URL: http://your-jenkins-url/github-webhook/
Content type: application/json
Events: Push events
```

### 6. 빌드 실행

- "Build Now" 클릭하여 수동 실행
- 또는 Git push로 자동 트리거

## 운영 환경 배포

### 프로덕션 환경 체크리스트

#### 보안

- [ ] `.env` 파일의 모든 비밀번호를 강력한 값으로 변경
- [ ] `JWT_SECRET` 변경
- [ ] 데이터베이스 root 비밀번호 변경
- [ ] CORS 설정을 프로덕션 도메인으로 제한

#### 성능

- [ ] Nginx 캐싱 설정 확인
- [ ] 데이터베이스 인덱스 최적화
- [ ] Docker 리소스 제한 설정

#### 모니터링

- [ ] 로그 수집 설정 (ELK, Prometheus 등)
- [ ] 헬스체크 엔드포인트 확인
- [ ] 알림 설정

### Docker Compose 프로덕션 설정

프로덕션용 `docker-compose.prod.yml` 사용:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### SSL/TLS 설정

Nginx에 Let's Encrypt 인증서 추가:

```bash
# Certbot 설치
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d your-domain.com
```

## 문제 해결

### 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose logs

# 특정 서비스 재시작
docker-compose restart backend
```

### 데이터베이스 연결 오류

```bash
# 데이터베이스 컨테이너 상태 확인
docker-compose exec db mysql -u root -p -e "SHOW DATABASES;"

# 데이터베이스 재시작
docker-compose restart db
```

### 포트 충돌

```bash
# 사용 중인 포트 확인 (Windows)
netstat -ano | findstr :5000

# .env 파일에서 포트 변경
BACKEND_PORT=5001
FRONTEND_PORT=8080
```

### 빌드 오류

```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 모든 것 초기화하고 재시작
docker-compose down -v
docker-compose up -d --build
```

### Jenkins 빌드 실패

```bash
# Jenkins 컨테이너 로그 확인
docker logs jenkins

# Jenkins에서 Docker 권한 확인
docker exec -u root jenkins chmod 666 /var/run/docker.sock
```

## 유지보수

### 백업

```bash
# 데이터베이스 백업
docker-compose exec db mysqldump -u root -p dashboard_db > backup.sql

# 볼륨 백업
docker run --rm -v dashboard-canvers_mariadb_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mariadb-backup.tar.gz /data
```

### 복원

```bash
# 데이터베이스 복원
docker-compose exec -T db mysql -u root -p dashboard_db < backup.sql
```

### 업데이트

```bash
# 최신 코드 가져오기
git pull origin main

# 재배포
docker-compose down
docker-compose up -d --build
```

## 모니터링 명령어

```bash
# 리소스 사용량 확인
docker stats

# 실시간 로그
docker-compose logs -f --tail=100

# 컨테이너 상태
docker-compose ps

# 헬스체크 상태
docker inspect --format='{{.State.Health.Status}}' dashboard-backend
```

## 추가 리소스

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [MariaDB Documentation](https://mariadb.org/documentation/)

## 지원

문제가 발생하면 GitHub Issues에 등록해주세요.
