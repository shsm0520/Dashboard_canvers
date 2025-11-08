# Dashboard Canvas - Course Management System

A personal dashboard application to help organize and track current courses, assignments, and academic performance trends integrated with Canvas LMS.

## ✨ Features

- 📚 Course overview and organization
- 📝 Assignment tracking and due dates
- 📊 Score trends and performance analytics
- 📈 Visual progress indicators
- 🎯 Personal academic dashboard
- 🔄 Canvas LMS integration and auto-sync
- 🌐 Multi-language support (English/Korean)
- 🎨 Theme customization
- 🐳 Docker containerization
- 🚀 Jenkins CI/CD automation

## 🏗️ Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Query (React Query)

### Backend

- Node.js
- Express
- TypeScript
- MariaDB / SQLite

### DevOps

- Docker & Docker Compose
- Jenkins
- Nginx

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Dashboard_canvers
   ```

2. **Setup environment variables**

   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. **Run with Docker**

   **Windows (PowerShell)**

   ```powershell
   .\deploy.ps1
   ```

   **Linux/Mac**

   ```bash
   chmod +x deploy.sh
   ./deploy.sh dev up
   ```

4. **Access the application**
   - Frontend: http://localhost:80
   - Backend API: http://localhost:5000

### Option 2: Local Development

#### Prerequisites

- Node.js (version 20 or higher)
- npm or yarn package manager
- SQLite or MariaDB

#### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd Dashboard_canvers
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Setup environment:

   ```bash
   cd backend
   cp .env.example .env
   # Configure your environment variables
   ```

4. Start the development server:

   ```bash
   # From root directory
   npm run dev

   # Or separately
   npm run dev:frontend  # Frontend only
   npm run dev:backend   # Backend only
   ```

## 📖 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get started in minutes
- **[Deployment Guide](DEPLOYMENT.md)** - Full deployment documentation
- **[Jenkins + GitHub Auto Deploy](JENKINS_GITHUB_DEPLOY.md)** - Complete CI/CD setup guide
- **[Quick Deploy Commands](QUICK_DEPLOY.md)** - Command reference
- **[React 19 Updates](REACT_19_UPDATES.md)** - React 19 migration notes

## 🚀 Automated CI/CD Pipeline

This project supports **full automation from GitHub to production**:

```
GitHub Push → Webhook → Jenkins Build → Docker Images → Ubuntu Server → Live!
```

### Quick Setup

1. **Setup Ubuntu Server**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/your-repo/Dashboard_canvers/main/setup-ubuntu-server.sh | sudo bash
   ```

2. **Configure Jenkins**

   - Install plugins: GitHub, Docker Pipeline, SSH Agent
   - Add credentials for Ubuntu server
   - Create pipeline job from `Jenkinsfile`

3. **Setup GitHub Webhook**

   ```
   Repository Settings → Webhooks → Add webhook
   URL: http://your-jenkins-url:8080/github-webhook/
   ```

4. **Push to Deploy**
   ```bash
   git push origin main  # Auto-deployment starts!
   ```

See **[JENKINS_GITHUB_DEPLOY.md](JENKINS_GITHUB_DEPLOY.md)** for detailed instructions.

## 🐳 Docker Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild images
docker-compose up -d --build

# Check status
docker-compose ps
```

## 🔄 CI/CD with Jenkins

This project includes a complete Jenkins pipeline for automated deployment.

1. Setup Jenkins with Docker support
2. Install required plugins (Docker Pipeline, Git, Credentials)
3. Add credentials in Jenkins:
   - `dashboard-env-file`: Your `.env` file
   - `docker-credentials-id`: Docker registry credentials (optional)
4. Create a new Pipeline job pointing to the `Jenkinsfile`
5. Run the build

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📁 Project Structure

```
Dashboard_canvers/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utility functions
│   ├── Dockerfile
│   └── nginx.conf
├── backend/              # Express backend
│   ├── src/
│   │   ├── config/       # Configuration
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Express middleware
│   ├── data/
│   │   └── init.sql      # Database initialization
│   └── Dockerfile
├── docker-compose.yml    # Docker Compose configuration
├── docker-compose.prod.yml  # Production overrides
├── Jenkinsfile          # CI/CD pipeline
├── deploy.ps1           # Windows deployment script
├── deploy.sh            # Linux/Mac deployment script
└── .env.example         # Environment variables template
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_ROOT_PASSWORD=your_root_password
DB_NAME=dashboard_db
DB_USER=dashboard_user
DB_PASSWORD=your_password
DB_PORT=3306

# Backend
BACKEND_PORT=5000
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost

# Canvas API
CANVAS_API_URL=https://uc.instructure.com/api/v1

# Frontend
FRONTEND_PORT=80
VITE_API_URL=http://localhost:5000
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## 📊 Database Management

### Backup

```bash
docker-compose exec db mysqldump -u root -p dashboard_db > backup.sql
```

### Restore

```bash
docker-compose exec -T db mysql -u root -p dashboard_db < backup.sql
```

### Access Database

```bash
docker-compose exec db mysql -u dashboard_user -p dashboard_db
```

## 🛠️ Troubleshooting

### Port Conflicts

Change ports in `.env` file:

```env
BACKEND_PORT=5001
FRONTEND_PORT=8080
DB_PORT=3307
```

### Container Issues

```bash
# Check logs
docker-compose logs -f

# Restart services
docker-compose restart

# Clean rebuild
docker-compose down -v
docker-compose up -d --build
```

### Database Connection Issues

```bash
# Check database health
docker-compose exec db healthcheck.sh --connect

# Restart database
docker-compose restart db
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is for personal use only.

## 📧 Contact

For questions or support, please open an issue in the repository.

## 🙏 Acknowledgments

- Canvas LMS API
- React Team
- Docker Community
- Jenkins Community
