#!/bin/bash

# Ubuntu 서버 초기 설정 스크립트
# Dashboard Canvas 배포 환경 구축

set -e

echo "================================================"
echo "Dashboard Canvas - Ubuntu 서버 초기 설정"
echo "================================================"
echo ""

# 사용자 확인
if [ "$EUID" -ne 0 ]; then 
    echo "이 스크립트는 root 권한이 필요합니다."
    echo "sudo ./setup-ubuntu-server.sh 로 실행하세요."
    exit 1
fi

# 변수 설정
DEPLOY_USER=${1:-deploy}
DEPLOY_PATH=${2:-/opt/dashboard-canvers}

echo "배포 사용자: $DEPLOY_USER"
echo "배포 경로: $DEPLOY_PATH"
echo ""

# 시스템 업데이트
echo "=== 시스템 업데이트 ==="
apt update
apt upgrade -y

# 필수 패키지 설치
echo ""
echo "=== 필수 패키지 설치 ==="
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    git \
    vim \
    ufw \
    fail2ban

# Docker 설치
echo ""
echo "=== Docker 설치 ==="
if ! command -v docker &> /dev/null; then
    # Docker GPG 키 추가
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Docker 리포지토리 추가
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Docker 설치
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Docker 서비스 시작 및 자동 시작 설정
    systemctl start docker
    systemctl enable docker
    
    echo "Docker 설치 완료: $(docker --version)"
else
    echo "Docker가 이미 설치되어 있습니다: $(docker --version)"
fi

# Docker Compose 설치 확인
echo ""
echo "=== Docker Compose 확인 ==="
if docker compose version &> /dev/null; then
    echo "Docker Compose 설치됨: $(docker compose version)"
else
    echo "오류: Docker Compose가 설치되지 않았습니다."
    exit 1
fi

# 배포 사용자 생성
echo ""
echo "=== 배포 사용자 설정 ==="
if id "$DEPLOY_USER" &>/dev/null; then
    echo "사용자 $DEPLOY_USER 이미 존재합니다."
else
    useradd -m -s /bin/bash $DEPLOY_USER
    echo "사용자 $DEPLOY_USER 생성 완료"
fi

# 배포 사용자를 docker 그룹에 추가
usermod -aG docker $DEPLOY_USER
echo "사용자 $DEPLOY_USER를 docker 그룹에 추가했습니다."

# SSH 디렉토리 생성 (Jenkins에서 SSH 접속용)
mkdir -p /home/$DEPLOY_USER/.ssh
chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh

echo ""
echo "SSH 공개 키를 추가하려면 다음을 실행하세요:"
echo "  sudo -u $DEPLOY_USER nano /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "  sudo chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys"

# 배포 디렉토리 생성
echo ""
echo "=== 배포 디렉토리 설정 ==="
mkdir -p $DEPLOY_PATH
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH
chmod 755 $DEPLOY_PATH
echo "배포 디렉토리 생성: $DEPLOY_PATH"

# 방화벽 설정
echo ""
echo "=== 방화벽 설정 (UFW) ==="
ufw --force enable

# SSH 포트 허용
ufw allow 22/tcp
echo "SSH (22) 포트 허용"

# HTTP/HTTPS 포트 허용
ufw allow 80/tcp
ufw allow 443/tcp
echo "HTTP (80), HTTPS (443) 포트 허용"

# 애플리케이션 포트 허용 (필요시)
# ufw allow 5000/tcp  # Backend API
echo "방화벽 규칙 적용 완료"

ufw status

# Fail2ban 설정
echo ""
echo "=== Fail2ban 설정 ==="
systemctl start fail2ban
systemctl enable fail2ban
echo "Fail2ban 활성화 완료"

# Docker 로그 로테이션 설정
echo ""
echo "=== Docker 로그 로테이션 설정 ==="
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker
echo "Docker 로그 로테이션 설정 완료"

# 시스템 리소스 제한 설정 (선택 사항)
echo ""
echo "=== 시스템 최적화 ==="
cat >> /etc/sysctl.conf << EOF

# Dashboard Canvas 최적화
vm.max_map_count=262144
fs.file-max=65536
EOF

sysctl -p

# Cron job 설정 (자동 백업 등)
echo ""
echo "=== Cron job 설정 ==="
cat > /etc/cron.d/dashboard-backup << EOF
# Dashboard Canvas 데이터베이스 백업 (매일 새벽 2시)
0 2 * * * $DEPLOY_USER cd $DEPLOY_PATH && docker compose exec -T db mysqldump -u root -p\${DB_ROOT_PASSWORD} dashboard_db > $DEPLOY_PATH/backup/db-backup-\$(date +\%Y\%m\%d).sql 2>&1
EOF

# 백업 디렉토리 생성
mkdir -p $DEPLOY_PATH/backup
chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH/backup

echo "자동 백업 설정 완료 (매일 새벽 2시)"

# 설정 완료 메시지
echo ""
echo "================================================"
echo "Ubuntu 서버 설정 완료!"
echo "================================================"
echo ""
echo "다음 단계:"
echo "1. Jenkins에서 사용할 SSH 공개 키 추가:"
echo "   sudo nano /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "   sudo chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys"
echo ""
echo "2. 배포 디렉토리에 .env 파일 생성:"
echo "   sudo -u $DEPLOY_USER nano $DEPLOY_PATH/.env"
echo ""
echo "3. Jenkins에서 다음 정보를 Credentials로 등록:"
echo "   - Deploy Server Host: $(hostname -I | awk '{print $1}')"
echo "   - Deploy Server User: $DEPLOY_USER"
echo "   - Deploy Server SSH Key: Jenkins 서버의 SSH private key"
echo "   - Deploy Path: $DEPLOY_PATH"
echo ""
echo "4. GitHub Webhook 설정:"
echo "   Repository Settings > Webhooks > Add webhook"
echo "   Payload URL: http://your-jenkins-url/github-webhook/"
echo ""
echo "서버 정보:"
echo "  IP: $(hostname -I | awk '{print $1}')"
echo "  배포 사용자: $DEPLOY_USER"
echo "  배포 경로: $DEPLOY_PATH"
echo "  Docker 버전: $(docker --version)"
echo "  Docker Compose 버전: $(docker compose version)"
echo ""
