# 자동 배포 아키텍처

## 전체 배포 플로우

```
┌─────────────────┐
│  개발자 로컬    │
│  (Windows PC)   │
└────────┬────────┘
         │ git push
         ↓
┌─────────────────┐
│     GitHub      │
│  (Repository)   │
└────────┬────────┘
         │ Webhook
         ↓
┌─────────────────┐
│     Jenkins     │
│  (CI/CD Server) │
├─────────────────┤
│ 1. Checkout     │
│ 2. Build        │
│ 3. Test         │
│ 4. Docker Build │
│ 5. Push Image   │
│ 6. SSH Deploy   │
└────────┬────────┘
         │ SSH
         ↓
┌─────────────────┐
│ Ubuntu Server   │
│ (Production)    │
├─────────────────┤
│ ┌─────────────┐ │
│ │  Frontend   │ │
│ │  (Nginx)    │ │
│ │  Port: 80   │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │  Backend    │ │
│ │  (Node.js)  │ │
│ │  Port: 5000 │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │  MariaDB    │ │
│ │  Port: 3306 │ │
│ └─────────────┘ │
└─────────────────┘
         ↓
    ┌─────────┐
    │  Users  │
    └─────────┘
```

## 상세 배포 프로세스

### 1단계: 개발 및 커밋

```bash
개발자 로컬 환경
├── 코드 수정
├── git add .
├── git commit -m "feat: new feature"
└── git push origin main
```

### 2단계: GitHub Webhook 트리거

```
GitHub Repository
├── Push 이벤트 감지
├── Webhook 실행
└── Jenkins에 알림 전송
    └── POST http://jenkins-url:8080/github-webhook/
```

### 3단계: Jenkins 빌드 파이프라인

#### Stage 1: Cleanup & Checkout

```groovy
- Workspace 정리
- Git 저장소 클론
- 커밋 해시 확인
```

#### Stage 2: Setup Environment

```groovy
- .env 파일 로드
- 환경 변수 설정
- 빌드 태그 생성
```

#### Stage 3: Install Dependencies

```groovy
병렬 실행:
├── Backend Dependencies
│   └── npm ci
└── Frontend Dependencies
    └── npm ci
```

#### Stage 4: Lint & Test

```groovy
병렬 실행:
├── Backend Lint
├── Frontend Lint
└── Backend Tests
```

#### Stage 5: Build Docker Images

```groovy
- Backend Image 빌드
  └── docker build -t registry/backend:tag
- Frontend Image 빌드
  └── docker build -t registry/frontend:tag
```

#### Stage 6: Push to Registry (Optional)

```groovy
- Docker Hub/Private Registry에 이미지 푸시
  ├── backend:latest
  ├── backend:build-number
  ├── frontend:latest
  └── frontend:build-number
```

#### Stage 7: Prepare Deployment

```groovy
배포 패키지 생성:
├── docker-compose.deploy.yml
├── docker-compose.prod.yml
├── deploy-remote.sh
├── init.sql
└── .env
```

#### Stage 8: Deploy to Ubuntu Server

```bash
SSH로 Ubuntu 서버 접속
├── 배포 파일 전송
│   └── scp deploy/* user@server:/opt/dashboard/
├── 배포 스크립트 실행
│   └── ./deploy-remote.sh
└── 서비스 시작
    ├── docker compose down (기존 컨테이너 중지)
    ├── docker compose pull (이미지 pull)
    └── docker compose up -d (새 컨테이너 시작)
```

#### Stage 9: Health Check

```bash
서비스 헬스 체크:
├── Backend Health
│   └── curl http://localhost:5000/api/health
├── Frontend Health
│   └── curl http://localhost:80/health
└── Database Health
    └── docker compose ps
```

#### Stage 10: Cleanup

```groovy
- 사용하지 않는 Docker 이미지 삭제
- Workspace 정리
```

### 4단계: 배포 완료

```
Ubuntu Server
├── 서비스 실행 중
├── Health Check 통과
└── 사용자 접근 가능
    ├── http://server-ip (Frontend)
    └── http://server-ip:5000 (Backend API)
```

## 네트워크 구성

```
Internet
    ↓
┌──────────────────────────────┐
│    Nginx (Frontend)          │
│    Port: 80/443              │
│    /api → Backend Proxy      │
└──────────┬───────────────────┘
           │
    Docker Network
    (dashboard-network)
           │
    ┌──────┴──────┬──────────┐
    ↓             ↓          ↓
┌─────────┐  ┌─────────┐  ┌─────────┐
│Frontend │  │Backend  │  │MariaDB  │
│Container│  │Container│  │Container│
│Port: 80 │  │Port:5000│  │Port:3306│
└─────────┘  └─────────┘  └─────────┘
```

## 데이터 흐름

### 사용자 요청

```
User Browser
    ↓ HTTP Request
Nginx (Frontend Container)
    ↓ API Request (/api/*)
Backend (Node.js Container)
    ↓ SQL Query
MariaDB (Database Container)
    ↑ Response
Backend
    ↑ JSON Response
Nginx
    ↑ HTML/JSON
User Browser
```

## 보안 계층

```
┌─────────────────────────────────┐
│  1. GitHub Access Token         │
│     - Repository 접근 권한       │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  2. Jenkins Credentials         │
│     - SSH Private Key           │
│     - Environment File          │
│     - Docker Registry Token     │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  3. Ubuntu Server Firewall      │
│     - UFW 방화벽                │
│     - Fail2ban                  │
│     - SSH Key Only              │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  4. Docker Network Isolation    │
│     - Internal Network          │
│     - Container 간 통신만 허용   │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  5. Application Security        │
│     - JWT Authentication        │
│     - Environment Variables     │
│     - Database Credentials      │
└─────────────────────────────────┘
```

## 롤백 전략

### 자동 롤백

```
배포 실패 시:
├── Health Check 실패 감지
├── 기존 컨테이너 유지
└── Jenkins 빌드 실패로 마크
```

### 수동 롤백

```bash
# Ubuntu 서버에서
cd /opt/dashboard-canvers

# 이전 버전으로 롤백
export IMAGE_TAG=previous-build-number
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 모니터링 포인트

### Jenkins 모니터링

```
- 빌드 성공/실패율
- 빌드 소요 시간
- 배포 빈도
```

### Ubuntu Server 모니터링

```bash
# 컨테이너 상태
docker compose ps

# 리소스 사용량
docker stats

# 로그 확인
docker compose logs -f

# 헬스체크
curl http://localhost:5000/api/health
curl http://localhost:80/health
```

### 애플리케이션 모니터링

```
- API 응답 시간
- 에러 로그
- 데이터베이스 연결 상태
- 사용자 접속 로그
```

## 백업 전략

### 자동 백업 (Cron)

```bash
# 매일 새벽 2시 데이터베이스 백업
0 2 * * * cd /opt/dashboard-canvers && \
  docker compose exec -T db mysqldump \
  -u root -p${DB_ROOT_PASSWORD} dashboard_db \
  > backup/db-backup-$(date +%Y%m%d).sql
```

### 수동 백업

```bash
# 데이터베이스
docker compose exec db mysqldump -u root -p dashboard_db > backup.sql

# 볼륨
docker run --rm -v dashboard_mariadb_data:/data \
  -v $(pwd):/backup alpine \
  tar czf /backup/mariadb-backup.tar.gz /data
```

## 성능 최적화

### Docker 이미지 최적화

```dockerfile
- Multi-stage builds
- Alpine Linux 베이스 이미지
- .dockerignore 활용
- Layer 캐싱 최적화
```

### 네트워크 최적화

```
- Nginx 캐싱 설정
- Gzip 압축
- Static 파일 CDN 활용
```

### 데이터베이스 최적화

```
- Connection Pooling
- 인덱스 최적화
- 쿼리 캐싱
```

## 확장 가능성

### 수평 확장

```
Load Balancer
    ↓
┌────┬────┬────┐
│App1│App2│App3│ (Multiple Backend Instances)
└────┴────┴────┘
    ↓
Database Cluster
```

### 수직 확장

```
docker-compose.prod.yml:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

## 비용 최적화

### 리소스 제한

```yaml
# CPU 및 메모리 제한
deploy:
  resources:
    limits:
      cpus: "1.0"
      memory: 1G
```

### 이미지 정리

```bash
# 오래된 이미지 자동 삭제 (7일)
docker image prune -f --filter "until=168h"
```

### 로그 관리

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## 문제 발생 시 대응

### 1단계: 로그 확인

```bash
docker compose logs -f
```

### 2단계: 컨테이너 상태 확인

```bash
docker compose ps
docker stats
```

### 3단계: 헬스체크

```bash
curl http://localhost:5000/api/health
curl http://localhost:80/health
```

### 4단계: 롤백 또는 재시작

```bash
docker compose restart
# 또는
docker compose down && docker compose up -d
```

## 참고 문서

- [JENKINS_GITHUB_DEPLOY.md](JENKINS_GITHUB_DEPLOY.md) - 상세 설정 가이드
- [DEPLOYMENT.md](DEPLOYMENT.md) - 일반 배포 가이드
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - 빠른 배포 명령어
