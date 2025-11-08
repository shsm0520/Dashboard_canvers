# Quick Deploy Commands

## Ubuntu 서버 빠른 설정

```bash
# 1. 서버 접속
ssh root@your-ubuntu-server-ip

# 2. 설정 스크립트 다운로드 및 실행
curl -fsSL https://raw.githubusercontent.com/your-username/Dashboard_canvers/main/setup-ubuntu-server.sh -o setup-ubuntu-server.sh
chmod +x setup-ubuntu-server.sh
sudo ./setup-ubuntu-server.sh deploy /opt/dashboard-canvers

# 3. SSH 공개 키 추가 (Jenkins 서버의 공개 키)
sudo nano /home/deploy/.ssh/authorized_keys
# Jenkins 서버의 ~/.ssh/jenkins-deploy.pub 내용 붙여넣기
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys

# 4. 환경 변수 파일 생성
sudo -u deploy nano /opt/dashboard-canvers/.env
# .env.example 내용 복사 후 실제 값으로 수정
```

## Jenkins 서버 빠른 설정

```bash
# 1. Jenkins 설치 (Docker)
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -u root \
  jenkins/jenkins:lts

# 2. 초기 비밀번호 확인
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword

# 3. SSH 키 생성 (Ubuntu 서버 접속용)
ssh-keygen -t rsa -b 4096 -C "jenkins-deploy" -f ~/.ssh/jenkins-deploy

# 4. 공개 키 출력 (Ubuntu 서버에 추가할 것)
cat ~/.ssh/jenkins-deploy.pub
```

## GitHub Webhook 설정

```
Repository → Settings → Webhooks → Add webhook

Payload URL: http://your-jenkins-url:8080/github-webhook/
Content type: application/json
Trigger: Just the push event
```

## Jenkins Credentials 등록

Jenkins 관리 → Credentials → Add Credentials

| ID                      | Type                          | Value                        |
| ----------------------- | ----------------------------- | ---------------------------- |
| `deploy-server-ssh-key` | SSH Username with private key | ~/.ssh/jenkins-deploy 내용   |
| `deploy-server-host`    | Secret text                   | Ubuntu 서버 IP               |
| `deploy-server-user`    | Secret text                   | deploy                       |
| `dashboard-env-file`    | Secret file                   | .env 파일                    |
| `github-token`          | Secret text                   | GitHub Personal Access Token |

## 배포 확인

```bash
# Ubuntu 서버에서
ssh deploy@ubuntu-server-ip
cd /opt/dashboard-canvers
docker compose ps
docker compose logs -f

# Health check
curl http://localhost:5000/api/health
curl http://localhost:80/health
```

## 자동 배포 테스트

```bash
# 로컬에서
git add .
git commit -m "test: auto deploy"
git push origin main

# Jenkins에서 자동 빌드 확인
# Ubuntu 서버에서 배포 확인
```
