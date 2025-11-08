# Jenkins + GitHub + Ubuntu 자동 배포 완벽 가이드

## 📋 목차

1. [개요](#개요)
2. [사전 준비사항](#사전-준비사항)
3. [Ubuntu 서버 설정](#ubuntu-서버-설정)
4. [Jenkins 서버 설정](#jenkins-서버-설정)
5. [GitHub 연동](#github-연동)
6. [배포 테스트](#배포-테스트)
7. [문제 해결](#문제-해결)

## 개요

이 가이드는 GitHub → Jenkins → Ubuntu 서버로의 완전 자동화된 배포 파이프라인을 구축합니다.

### 배포 플로우

```
GitHub Push → GitHub Webhook → Jenkins → Docker Build →
→ Push to Registry (Optional) → SSH to Ubuntu → Docker Deploy
```

## 사전 준비사항

### 필요한 것들

- ✅ Ubuntu 서버 (20.04 LTS 이상 권장)
- ✅ Jenkins 서버 (또는 Jenkins를 설치할 서버)
- ✅ GitHub 저장소
- ✅ Docker Hub 계정 (선택사항)

### IP 주소 및 접속 정보 확인

- Ubuntu 서버 IP: `________________`
- Jenkins 서버 URL: `________________`
- GitHub 저장소: `________________`

---

## Ubuntu 서버 설정

### 1. Ubuntu 서버 접속

```bash
ssh root@your-ubuntu-server-ip
```

### 2. 자동 설정 스크립트 실행

저장소에서 스크립트를 다운로드하거나 복사:

```bash
# Git으로 저장소 클론
git clone https://github.com/your-username/Dashboard_canvers.git
cd Dashboard_canvers

# 스크립트 실행 권한 부여
chmod +x setup-ubuntu-server.sh

# 스크립트 실행 (배포 사용자: deploy, 경로: /opt/dashboard-canvers)
sudo ./setup-ubuntu-server.sh deploy /opt/dashboard-canvers
```

이 스크립트는 다음을 수행합니다:

- ✅ 시스템 업데이트
- ✅ Docker 및 Docker Compose 설치
- ✅ 배포 전용 사용자 생성
- ✅ 방화벽 설정 (UFW)
- ✅ Fail2ban 설정
- ✅ 배포 디렉토리 생성
- ✅ 자동 백업 Cron job 설정

### 3. SSH 키 설정 (Jenkins 접속용)

#### Jenkins 서버에서 SSH 키 생성

```bash
# Jenkins 서버에서 실행
ssh-keygen -t rsa -b 4096 -C "jenkins-deploy" -f ~/.ssh/jenkins-deploy
```

#### Ubuntu 서버에 공개 키 추가

```bash
# Ubuntu 서버에서 실행
sudo nano /home/deploy/.ssh/authorized_keys

# Jenkins 서버의 ~/.ssh/jenkins-deploy.pub 내용을 붙여넣기

# 권한 설정
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
```

#### SSH 접속 테스트

```bash
# Jenkins 서버에서 테스트
ssh -i ~/.ssh/jenkins-deploy deploy@ubuntu-server-ip
```

### 4. 환경 변수 파일 생성

```bash
# Ubuntu 서버에서 실행
sudo -u deploy nano /opt/dashboard-canvers/.env
```

`.env` 파일 내용:

```env
# Database Configuration
DB_ROOT_PASSWORD=your_strong_root_password
DB_NAME=dashboard_db
DB_USER=dashboard_user
DB_PASSWORD=your_strong_password
DB_PORT=3306

# Backend Configuration
BACKEND_PORT=5000
JWT_SECRET=your_jwt_secret_key_change_this_to_random_string
CORS_ORIGIN=http://your-domain.com

# Canvas API
CANVAS_API_URL=https://uc.instructure.com/api/v1

# Frontend Configuration
FRONTEND_PORT=80
VITE_API_URL=http://your-domain.com:5000
```

---

## Jenkins 서버 설정

### 1. Jenkins 설치 (Docker 사용)

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

# Jenkins 초기 비밀번호 확인
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

브라우저에서 `http://jenkins-server-ip:8080` 접속하여 초기 설정 완료

### 2. 필수 플러그인 설치

Jenkins 관리 > 플러그인 관리에서 다음 플러그인 설치:

- ✅ **GitHub Integration Plugin**
- ✅ **Docker Pipeline**
- ✅ **SSH Agent Plugin**
- ✅ **Credentials Binding Plugin**
- ✅ **Pipeline Plugin**
- ✅ **Git Plugin**

### 3. Jenkins Credentials 설정

**Jenkins 관리 > Credentials > System > Global credentials 추가**

#### a) GitHub 연동 (Personal Access Token)

- **Kind**: Secret text
- **Secret**: GitHub Personal Access Token
- **ID**: `github-token`
- **Description**: GitHub Access Token

GitHub Token 생성 방법:

1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
2. 권한 선택: `repo`, `admin:repo_hook`
3. 생성된 토큰을 복사하여 Jenkins에 등록

#### b) Deploy Server SSH Key

- **Kind**: SSH Username with private key
- **ID**: `deploy-server-ssh-key`
- **Username**: `deploy`
- **Private Key**: Jenkins 서버의 `~/.ssh/jenkins-deploy` 파일 내용
- **Description**: Ubuntu Deploy Server SSH Key

#### c) Deploy Server Host

- **Kind**: Secret text
- **Secret**: Ubuntu 서버 IP (예: `192.168.1.100`)
- **ID**: `deploy-server-host`
- **Description**: Ubuntu Server IP

#### d) Deploy Server User

- **Kind**: Secret text
- **Secret**: `deploy`
- **ID**: `deploy-server-user`
- **Description**: Deploy User

#### e) Environment File

- **Kind**: Secret file
- **File**: `.env` 파일 업로드
- **ID**: `dashboard-env-file`
- **Description**: Application Environment File

#### f) Docker Registry (선택사항)

- **Kind**: Username with password
- **Username**: Docker Hub 사용자명
- **Password**: Docker Hub 비밀번호 또는 토큰
- **ID**: `docker-credentials-id`
- **Description**: Docker Hub Credentials

### 4. Jenkins Pipeline Job 생성

1. **New Item** 클릭
2. **이름**: `Dashboard-Canvas-Deploy`
3. **타입**: Pipeline 선택
4. **OK** 클릭

#### Pipeline 설정:

- **General**:

  - ✅ GitHub project 체크
  - Project url: `https://github.com/your-username/Dashboard_canvers`

- **Build Triggers**:

  - ✅ GitHub hook trigger for GITScm polling 체크

- **Pipeline**:
  - **Definition**: Pipeline script from SCM
  - **SCM**: Git
  - **Repository URL**: `https://github.com/your-username/Dashboard_canvers.git`
  - **Credentials**: github-token 선택
  - **Branch Specifier**: `*/main` (또는 `*/nov07`)
  - **Script Path**: `Jenkinsfile`

5. **저장** 클릭

---

## GitHub 연동

### 1. GitHub Webhook 설정

1. GitHub 저장소 → **Settings** → **Webhooks** → **Add webhook**

2. Webhook 설정:

   ```
   Payload URL: http://your-jenkins-url:8080/github-webhook/
   Content type: application/json
   Secret: (비워둠)
   ```

3. **Which events would you like to trigger this webhook?**

   - ✅ Just the push event 선택

4. **Active** 체크

5. **Add webhook** 클릭

### 2. Webhook 테스트

저장소에 간단한 변경사항 커밋:

```bash
# 로컬에서
git add .
git commit -m "test: Jenkins webhook test"
git push origin main
```

Jenkins에서 자동으로 빌드가 시작되는지 확인

---

## 배포 테스트

### 1. 수동 빌드 테스트

Jenkins에서:

1. `Dashboard-Canvas-Deploy` job 클릭
2. **Build Now** 클릭
3. 빌드 진행 상황 확인

### 2. 빌드 로그 확인

빌드 번호 클릭 → **Console Output**에서 로그 확인

주요 단계:

- ✅ Checkout 코드
- ✅ 환경 설정
- ✅ 의존성 설치
- ✅ Docker 이미지 빌드
- ✅ Ubuntu 서버로 파일 전송
- ✅ 원격 배포 실행
- ✅ Health Check

### 3. Ubuntu 서버에서 확인

```bash
# Ubuntu 서버에서
ssh deploy@ubuntu-server-ip

# 배포 디렉토리로 이동
cd /opt/dashboard-canvers

# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f

# Health check
curl http://localhost:5000/api/health
curl http://localhost:80/health
```

### 4. 브라우저에서 접속

- Frontend: `http://ubuntu-server-ip`
- Backend API: `http://ubuntu-server-ip:5000/api/health`

---

## 자동 배포 플로우 확인

### 전체 프로세스

```
1. 개발자가 코드 수정 및 커밋
   ↓
2. GitHub에 Push
   ↓
3. GitHub Webhook이 Jenkins 트리거
   ↓
4. Jenkins가 자동으로 빌드 시작
   ├─ 코드 체크아웃
   ├─ 의존성 설치
   ├─ 테스트 실행
   ├─ Docker 이미지 빌드
   ├─ (Optional) Docker Registry에 Push
   └─ Ubuntu 서버로 배포
   ↓
5. Ubuntu 서버에서 Docker Compose로 실행
   ├─ 기존 컨테이너 중지
   ├─ 새 이미지로 컨테이너 시작
   └─ Health Check
   ↓
6. 배포 완료 ✅
```

### 실제 테스트

```bash
# 로컬에서 코드 수정
echo "// Test auto deploy" >> frontend/src/App.tsx

# 커밋 및 푸시
git add .
git commit -m "feat: test auto deployment"
git push origin main

# Jenkins에서 자동으로 빌드 시작되는지 확인
# 빌드 완료 후 Ubuntu 서버에서 변경사항 확인
```

---

## 문제 해결

### Jenkins 빌드 실패

#### 1. SSH 연결 오류

```
오류: Permission denied (publickey)
```

**해결방법:**

```bash
# Ubuntu 서버에서
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# Jenkins Credentials 확인
# - SSH Key가 올바르게 등록되었는지 확인
```

#### 2. Docker 권한 오류

```
오류: permission denied while trying to connect to the Docker daemon
```

**해결방법:**

```bash
# Ubuntu 서버에서
sudo usermod -aG docker deploy

# 다시 로그인하거나 재부팅
sudo reboot
```

#### 3. 환경 변수 파일 없음

```
오류: .env file not found
```

**해결방법:**

- Jenkins Credentials에 `dashboard-env-file` 등록 확인
- Ubuntu 서버의 `/opt/dashboard-canvers/.env` 파일 확인

### Docker 컨테이너 오류

#### 1. 포트 충돌

```bash
# 사용 중인 포트 확인
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :5000

# 프로세스 종료 또는 .env에서 포트 변경
```

#### 2. 데이터베이스 연결 오류

```bash
# 로그 확인
docker compose logs db

# 데이터베이스 재시작
docker compose restart db
```

### GitHub Webhook 작동 안 함

#### 확인 사항:

1. Jenkins URL이 외부에서 접근 가능한지 확인
2. GitHub Webhook 설정 확인
3. Jenkins의 "GitHub hook trigger" 설정 확인

#### Jenkins가 방화벽 안에 있는 경우:

- ngrok 같은 터널링 서비스 사용
- 또는 Jenkins를 공개 IP로 노출

---

## 보안 권장사항

### 1. 방화벽 강화

```bash
# Ubuntu 서버에서
sudo ufw status
sudo ufw allow from jenkins-server-ip to any port 22
```

### 2. SSH 보안

```bash
# 비밀번호 로그인 비활성화
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
sudo systemctl restart sshd
```

### 3. 정기 업데이트

```bash
# 자동 보안 업데이트 설정
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. SSL/TLS 설정

Let's Encrypt로 HTTPS 설정:

```bash
# Certbot 설치
sudo apt install certbot

# 인증서 발급
sudo certbot certonly --standalone -d your-domain.com

# Nginx 설정에 SSL 추가
```

---

## 모니터링 및 유지보수

### 로그 확인

```bash
# 애플리케이션 로그
docker compose logs -f --tail=100

# 시스템 로그
sudo journalctl -u docker -f
```

### 백업 확인

```bash
# 자동 백업 파일 확인
ls -lh /opt/dashboard-canvers/backup/

# 수동 백업
docker compose exec db mysqldump -u root -p dashboard_db > backup-$(date +%Y%m%d).sql
```

### 리소스 모니터링

```bash
# Docker 컨테이너 리소스
docker stats

# 시스템 리소스
htop
```

---

## 참고 자료

- [Docker Documentation](https://docs.docker.com/)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

---

## 요약 체크리스트

### Ubuntu 서버 ✅

- [ ] Docker 설치
- [ ] 배포 사용자 생성
- [ ] SSH 키 설정
- [ ] 방화벽 설정
- [ ] 환경 변수 파일 생성

### Jenkins 서버 ✅

- [ ] Jenkins 설치
- [ ] 플러그인 설치
- [ ] Credentials 등록
- [ ] Pipeline Job 생성

### GitHub ✅

- [ ] Webhook 설정
- [ ] Personal Access Token 생성

### 테스트 ✅

- [ ] 수동 빌드 성공
- [ ] 자동 배포 성공
- [ ] Health Check 성공
- [ ] 브라우저 접속 확인

모든 단계가 완료되면 완전 자동화된 CI/CD 파이프라인이 구축됩니다! 🎉
