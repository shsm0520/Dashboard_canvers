# 🎉 완성! GitHub → Jenkins → Ubuntu 자동 배포 시스템

## ✅ 생성된 파일 목록

### 📁 Docker 관련

- ✅ `docker-compose.yml` - 로컬 개발용
- ✅ `docker-compose.deploy.yml` - 배포용 (레지스트리 이미지 사용)
- ✅ `docker-compose.prod.yml` - 프로덕션 설정
- ✅ `backend/Dockerfile` - 백엔드 이미지
- ✅ `frontend/Dockerfile` - 프론트엔드 이미지
- ✅ `frontend/nginx.conf` - Nginx 설정
- ✅ `.dockerignore` - Docker 빌드 제외 파일

### 🚀 CI/CD 관련

- ✅ `Jenkinsfile` - Jenkins 파이프라인 (완전 자동화)
- ✅ `deploy-remote.sh` - Ubuntu 서버 배포 스크립트
- ✅ `setup-ubuntu-server.sh` - Ubuntu 서버 초기 설정

### 💾 데이터베이스

- ✅ `backend/data/init.sql` - MariaDB 초기화 스크립트

### ⚙️ 환경 설정

- ✅ `.env.example` - 환경 변수 템플릿
- ✅ `.gitignore` - Git 제외 파일

### 📜 배포 스크립트

- ✅ `deploy.ps1` - Windows 배포 스크립트
- ✅ `deploy.sh` - Linux/Mac 배포 스크립트

### 📚 문서

- ✅ `README.md` - 메인 문서 (업데이트됨)
- ✅ `DEPLOYMENT.md` - 일반 배포 가이드
- ✅ `JENKINS_GITHUB_DEPLOY.md` - **★ 완전 자동화 가이드**
- ✅ `QUICK_DEPLOY.md` - 빠른 배포 명령어
- ✅ `QUICKSTART.md` - 빠른 시작 가이드
- ✅ `ARCHITECTURE.md` - 시스템 아키텍처
- ✅ `SETUP_COMPLETE.md` - 이 문서

## 🎯 다음 단계 (순서대로 진행)

### 1단계: Ubuntu 서버 준비 ⏱️ 10분

```bash
# Ubuntu 서버에 SSH 접속
ssh root@your-ubuntu-server-ip

# 설정 스크립트 실행
wget https://raw.githubusercontent.com/your-repo/Dashboard_canvers/main/setup-ubuntu-server.sh
chmod +x setup-ubuntu-server.sh
sudo ./setup-ubuntu-server.sh deploy /opt/dashboard-canvers
```

**완료 후:**

- ✅ Docker 설치됨
- ✅ 배포 사용자 생성됨
- ✅ 방화벽 설정됨
- ✅ 배포 디렉토리 생성됨

### 2단계: Jenkins 서버 설정 ⏱️ 15분

```bash
# Jenkins를 Docker로 실행
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -u root \
  jenkins/jenkins:lts

# 초기 비밀번호 확인
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

**브라우저에서 Jenkins 설정:**

1. http://jenkins-server:8080 접속
2. 초기 비밀번호 입력
3. 추천 플러그인 설치
4. 관리자 계정 생성

**추가 플러그인 설치:**

- GitHub Integration
- Docker Pipeline
- SSH Agent
- Credentials Binding

### 3단계: SSH 키 설정 ⏱️ 5분

```bash
# Jenkins 서버에서 SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "jenkins-deploy" -f ~/.ssh/jenkins-deploy

# 공개 키 출력
cat ~/.ssh/jenkins-deploy.pub
```

**Ubuntu 서버에 공개 키 추가:**

```bash
# Ubuntu 서버에서
sudo nano /home/deploy/.ssh/authorized_keys
# 위에서 출력한 공개 키 붙여넣기

sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
```

**SSH 연결 테스트:**

```bash
# Jenkins 서버에서
ssh -i ~/.ssh/jenkins-deploy deploy@ubuntu-server-ip
```

### 4단계: Jenkins Credentials 등록 ⏱️ 10분

**Jenkins 관리 > Credentials > System > Global credentials**

| ID                      | Type                          | Value                                |
| ----------------------- | ----------------------------- | ------------------------------------ |
| `deploy-server-ssh-key` | SSH Username with private key | deploy 사용자, ~/.ssh/jenkins-deploy |
| `deploy-server-host`    | Secret text                   | Ubuntu 서버 IP                       |
| `deploy-server-user`    | Secret text                   | deploy                               |
| `dashboard-env-file`    | Secret file                   | .env 파일 업로드                     |
| `github-token`          | Secret text                   | GitHub Personal Access Token         |
| `docker-credentials-id` | Username with password        | Docker Hub (선택)                    |
| `docker-registry-url`   | Secret text                   | Docker Registry URL (선택)           |

### 5단계: Jenkins Pipeline Job 생성 ⏱️ 5분

1. **New Item** → **Pipeline**
2. **이름**: `Dashboard-Canvas-Deploy`
3. **General**:
   - ✅ GitHub project
   - URL: `https://github.com/your-username/Dashboard_canvers`
4. **Build Triggers**:
   - ✅ GitHub hook trigger for GITScm polling
5. **Pipeline**:
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: `https://github.com/your-username/Dashboard_canvers.git`
   - Credentials: github-token
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
6. **저장**

### 6단계: GitHub Webhook 설정 ⏱️ 3분

**GitHub Repository → Settings → Webhooks → Add webhook**

```
Payload URL: http://your-jenkins-url:8080/github-webhook/
Content type: application/json
Events: Just the push event
Active: ✅
```

**저장 후 테스트:**

- Webhook 페이지에서 "Recent Deliveries" 확인
- 초록색 체크마크가 나타나면 성공

### 7단계: Ubuntu 서버 .env 파일 설정 ⏱️ 5분

```bash
# Ubuntu 서버에서
sudo -u deploy nano /opt/dashboard-canvers/.env
```

**.env 파일 내용:**

```env
# Database
DB_ROOT_PASSWORD=YOUR_STRONG_PASSWORD_HERE
DB_NAME=dashboard_db
DB_USER=dashboard_user
DB_PASSWORD=YOUR_DB_PASSWORD_HERE
DB_PORT=3306

# Backend
BACKEND_PORT=5000
JWT_SECRET=YOUR_RANDOM_JWT_SECRET_HERE
CORS_ORIGIN=http://your-domain.com

# Canvas API
CANVAS_API_URL=https://uc.instructure.com/api/v1

# Frontend
FRONTEND_PORT=80
VITE_API_URL=http://your-domain.com:5000
```

### 8단계: 첫 배포 테스트 ⏱️ 5분

**Jenkins에서 수동 빌드:**

1. `Dashboard-Canvas-Deploy` job 클릭
2. **Build Now** 클릭
3. 빌드 진행 상황 확인

**빌드 완료 후 확인:**

```bash
# Ubuntu 서버에서
ssh deploy@ubuntu-server-ip
cd /opt/dashboard-canvers
docker compose ps

# Health check
curl http://localhost:5000/api/health
curl http://localhost:80/health
```

**브라우저에서 접속:**

- Frontend: http://ubuntu-server-ip
- Backend: http://ubuntu-server-ip:5000/api/health

### 9단계: 자동 배포 테스트 ⏱️ 2분

**로컬에서 코드 수정 및 푸시:**

```bash
# 간단한 변경
echo "// Auto deploy test" >> frontend/src/App.tsx

# 커밋 및 푸시
git add .
git commit -m "test: auto deployment"
git push origin main
```

**Jenkins 자동 빌드 확인:**

- Jenkins 대시보드에서 자동으로 빌드 시작되는지 확인
- 빌드 완료 후 Ubuntu 서버에서 변경사항 확인

## 🎊 완료! 자동 배포 시스템 구축 성공!

### ✅ 이제 할 수 있는 것들:

1. **자동 배포**

   ```bash
   git push origin main
   # 자동으로 Jenkins → Ubuntu 서버 배포!
   ```

2. **배포 상태 모니터링**

   - Jenkins: http://jenkins-server:8080
   - Application: http://ubuntu-server-ip

3. **로그 확인**

   ```bash
   # Ubuntu 서버에서
   docker compose logs -f
   ```

4. **롤백**
   ```bash
   # 이전 빌드로 롤백
   export IMAGE_TAG=previous-build-number
   docker compose up -d
   ```

## 📊 배포 플로우 최종 확인

```
개발자 PC (Windows)
    ↓ git push
GitHub Repository
    ↓ Webhook
Jenkins Server
    ├─ Checkout
    ├─ Build
    ├─ Test
    ├─ Docker Build
    ├─ (Optional) Push to Registry
    └─ SSH Deploy
        ↓
Ubuntu Server
    ├─ Pull deployment files
    ├─ Stop old containers
    ├─ Start new containers
    └─ Health check
        ↓
✅ Live & Running!
```

## 🛠️ 유용한 명령어

### Ubuntu 서버에서

```bash
# 상태 확인
docker compose ps
docker stats

# 로그 확인
docker compose logs -f
docker compose logs -f backend

# 재시작
docker compose restart

# 중지
docker compose down

# 완전 재시작
docker compose down && docker compose up -d

# 백업
docker compose exec db mysqldump -u root -p dashboard_db > backup.sql
```

### Jenkins에서

```bash
# 컨테이너 로그
docker logs -f jenkins

# 재시작
docker restart jenkins
```

### 로컬에서

```bash
# 빠른 배포
git add . && git commit -m "update" && git push

# 배포 상태 확인 (SSH)
ssh deploy@ubuntu-server-ip 'cd /opt/dashboard-canvers && docker compose ps'
```

## 📝 중요 정보 기록

```
Ubuntu Server:
  IP: ___________________
  User: deploy
  Path: /opt/dashboard-canvers

Jenkins Server:
  URL: http://_________________:8080
  User: ___________________

GitHub:
  Repository: https://github.com/_______________/Dashboard_canvers
  Webhook: ✅ Configured

Domain (Optional):
  Frontend: http://___________________
  Backend: http://___________________:5000
```

## 🔐 보안 체크리스트

- [ ] Ubuntu 서버 방화벽 활성화 (UFW)
- [ ] SSH 비밀번호 로그인 비활성화
- [ ] Jenkins 관리자 비밀번호 강력하게 설정
- [ ] .env 파일 보안 (절대 Git에 커밋하지 않기)
- [ ] DB 비밀번호 강력하게 설정
- [ ] JWT_SECRET 랜덤하게 생성
- [ ] SSL/TLS 인증서 설정 (프로덕션)
- [ ] 정기 백업 설정 확인

## 🚀 다음 단계 (선택사항)

### 1. SSL/TLS 설정

```bash
# Let's Encrypt 인증서
sudo certbot certonly --standalone -d your-domain.com
```

### 2. 도메인 연결

- DNS A 레코드 설정
- Nginx SSL 설정 추가

### 3. 모니터링 추가

- Prometheus
- Grafana
- ELK Stack

### 4. 알림 설정

- Slack 알림
- Email 알림
- Discord 알림

## 📚 참고 문서

| 문서                                                 | 용도                 |
| ---------------------------------------------------- | -------------------- |
| [JENKINS_GITHUB_DEPLOY.md](JENKINS_GITHUB_DEPLOY.md) | **상세 설정 가이드** |
| [QUICK_DEPLOY.md](QUICK_DEPLOY.md)                   | 빠른 명령어 레퍼런스 |
| [ARCHITECTURE.md](ARCHITECTURE.md)                   | 시스템 아키텍처      |
| [DEPLOYMENT.md](DEPLOYMENT.md)                       | 일반 배포 가이드     |
| [QUICKSTART.md](QUICKSTART.md)                       | 빠른 시작            |

## 🎉 축하합니다!

완전 자동화된 CI/CD 파이프라인이 구축되었습니다!

이제부터는:

```bash
git push
```

한 번으로 자동으로 배포됩니다! 🚀

---

문제가 발생하면 [JENKINS_GITHUB_DEPLOY.md](JENKINS_GITHUB_DEPLOY.md)의 문제 해결 섹션을 참고하세요.
