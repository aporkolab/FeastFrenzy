# 🍽️ FeastFrenzy - Enterprise Factory Canteen Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Angular Version](https://img.shields.io/badge/angular-%5E15.0.0-red.svg)](https://angular.io/)

FeastFrenzy is a modern, scalable factory canteen management system built with enterprise-grade architecture and best practices. This project demonstrates senior-level software engineering with comprehensive CI/CD, monitoring, and documentation.

## 🚀 Features

### Core Functionality
- 👥 **Employee Management**: Complete CRUD operations for factory employees
- 🛍️ **Purchase System**: Real-time transaction processing with balance tracking
- 📦 **Product Catalog**: Dynamic product management with categorization
- 📊 **Advanced Reporting**: Monthly consumption, product analytics, and revenue reports
- 💰 **Balance Tracking**: Automatic employee balance management

### Enterprise Features
- 🔐 **JWT Authentication**: Secure token-based authentication with refresh tokens
- 🔒 **Role-Based Access Control**: Employee, Manager, and Admin permission levels
- 📈 **Monitoring & Analytics**: Prometheus metrics with Grafana dashboards
- 🐳 **Containerization**: Full Docker support with multi-stage builds
- ⚡ **Performance**: Redis caching, database optimization, and CDN support
- 📱 **Responsive Design**: Modern UI with Bootstrap 5 and Bootswatch themes

## 🏗️ Architecture Overview

FeastFrenzy follows modern microservices principles with a clean, maintainable architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     CDN/Cache   │    │   Monitoring    │
│     (Nginx)     │    │     (Redis)     │    │  (Prometheus)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │    Database     │
│   (Angular)     │◄──►│   (Node.js)     │◄──►│    (MySQL)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📅 Technology Stack

### Frontend
- **Framework**: Angular 15+ with TypeScript
- **UI/UX**: Bootstrap 5 + Bootswatch themes
- **State Management**: RxJS + Services
- **Testing**: Jasmine, Karma, E2E with Protractor
- **Build**: Angular CLI with Webpack

### Backend
- **Runtime**: Node.js 18+ with Express.js
- **Database**: MySQL 8.0 with Sequelize ORM
- **Authentication**: JWT with refresh tokens
- **Caching**: Redis for session and data caching
- **Testing**: Mocha, Chai, Supertest
- **Documentation**: OpenAPI 3.0 with Swagger UI

### DevOps & Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions with multi-stage deployments
- **Monitoring**: Prometheus + Grafana + AlertManager
- **Code Quality**: ESLint, Prettier, SonarQube, Husky
- **Security**: Helmet.js, CORS, rate limiting, input validation

## ⚡ Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd FeastFrenzy

# Start all services with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:4200
# Backend API: http://localhost:3000
# API Documentation: http://localhost:3000/api-docs
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

### Manual Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install --legacy-peer-deps

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with your database configuration

# Start services
cd backend && npm run dev     # Terminal 1
cd frontend && npm start      # Terminal 2
```

## 📚 Documentation

- 🏗️ **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and component overview
- 🛠️ **[API Documentation](docs/API.md)** - Complete REST API reference
- 🚀 **[Production Deployment](docs/PRODUCTION_DEPLOYMENT.md)** - Enterprise-grade production deployment with Docker and Kubernetes
- 🤖 **[CI/CD Setup Guide](docs/CI_CD_SETUP.md)** - GitHub Actions pipeline configuration with optional tokens
- 👍 **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project
- 📊 **[Monitoring Setup](monitoring/)** - Prometheus and Grafana configuration

## 📁 Project Structure

```
FeastFrenzy/
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
├── backend/
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Custom middleware
│   ├── models/              # Sequelize models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── test/                # Test files
│   └── logger/              # Winston logging
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── core/           # Singleton services
│       │   ├── shared/         # Reusable components
│       │   └── features/       # Feature modules
│       └── environments/       # Environment configs
├── docs/                    # Project documentation
├── monitoring/              # Prometheus & Grafana
└── docker-compose.yml       # Multi-service setup
```

## 💼 Development

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher  
- **Docker** 20.x or higher (optional but recommended)
- **MySQL** 8.0+ (if not using Docker)

### Development Commands

#### Backend Commands
```bash
cd backend
npm run dev          # Start with hot reload
npm test             # Run tests
npm run test:coverage # Run tests with coverage
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
```

#### Frontend Commands
```bash
cd frontend
npm start            # Start development server
npm run build:prod   # Production build
npm run test         # Run unit tests
npm run test:coverage # Run tests with coverage
npm run lint         # Run ESLint
npm run e2e          # Run E2E tests
```

#### Docker Commands
```bash
docker-compose up -d              # Start all services
docker-compose logs -f [service]   # View logs
docker-compose down                # Stop all services
docker-compose up --build          # Rebuild and start
```

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Configure database settings:**
   ```env
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=feastfrenzy
   JWT_SECRET=your-super-secret-jwt-key
   ```

3. **Create database:**
   ```sql
   CREATE DATABASE feastfrenzy;
   ```

## 🧪 Testing

FeastFrenzy includes comprehensive testing at all levels:

### Backend Testing
- **Unit Tests**: Individual function and service testing
- **Integration Tests**: API endpoint testing with database
- **Coverage**: 80%+ code coverage requirement
- **Test Database**: Isolated SQLite database for tests

### Frontend Testing
- **Unit Tests**: Component and service testing
- **E2E Tests**: Full user workflow testing
- **Coverage**: 70%+ code coverage requirement

### Running Tests
```bash
# Backend
cd backend
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
npm run test:watch          # Watch mode

# Frontend  
cd frontend
npm test                    # Run unit tests
npm run test:coverage       # Run with coverage
npm run e2e                 # Run E2E tests
```

## 📊 Monitoring & Analytics

FeastFrenzy includes production-ready monitoring:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Beautiful dashboards and visualization
- **Health Checks**: Application and dependency monitoring
- **Logging**: Structured logging with Winston
- **Alerts**: Automated alerting for critical issues

### Access Monitoring
- Grafana Dashboard: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- Application Metrics: http://localhost:3000/metrics

## 📚 API Documentation

Comprehensive API documentation is available:
- **Swagger UI**: Interactive API documentation
- **OpenAPI 3.0**: Machine-readable API specification  
- **Postman Collection**: Ready-to-use API testing

Access API docs at: http://localhost:3000/api-docs

## 👍 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development setup
- Coding standards
- Pull request process
- Issue reporting

### Quick Contribution Setup
```bash
# Fork the repo and clone your fork
git clone https://github.com/your-username/FeastFrenzy.git
cd FeastFrenzy

# Install dependencies
npm run install:all

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run test:all
npm run lint:all

# Commit and push
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

## 🛡️ Security

FeastFrenzy implements enterprise-grade security:

- **JWT Authentication** with refresh tokens
- **Role-based Access Control** (RBAC)
- **Input Validation** and sanitization
- **SQL Injection** prevention with Sequelize ORM
- **XSS Protection** with Helmet.js
- **Rate Limiting** to prevent abuse
- **HTTPS** enforced in production
- **Security Headers** configured


## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Roadmap

### Upcoming Features
- [ ] Real-time notifications with WebSockets
- [ ] Mobile application (React Native)
- [ ] Advanced analytics with ML predictions
- [ ] Multi-tenant support
- [ ] Inventory management integration
- [ ] Payment gateway integration
- [ ] Barcode/QR code scanning

### Performance Improvements
- [ ] GraphQL API implementation
- [ ] Database sharding for high-scale deployments
- [ ] Advanced caching strategies
- [ ] CDN integration for static assets

## 📞 Support

For support and questions:

- **Documentation**: Check our comprehensive [docs](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/FeastFrenzy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/FeastFrenzy/discussions)
- **Email**: support@feastfrenzy.com

## 🙏 Acknowledgments

- Angular team for the amazing framework
- Node.js and Express.js communities
- Bootstrap and Bootswatch for beautiful UI components
- All contributors who made this project possible

---

⭐ **Star this repository if you find it useful!**

Built with ❤️ by the FeastFrenzy team
