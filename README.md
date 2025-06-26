<div align="center">
  <h1>🍔 FeastFrenzy v1.2</h1>
  <p><strong>Modern Full-Stack Enterprise Application (Node.js + Angular)</strong></p>

  <h3>🌐 <a href="https://feastfrenzy.dev">Live Demo: feastfrenzy.dev</a></h3>

  <p>
    <a href="#-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-api-documentation">API</a> •
    <a href="#-testing">Testing</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Backend_Tests-385-brightgreen" alt="Backend Tests">
    <img src="https://img.shields.io/badge/Frontend_Tests-394-brightgreen" alt="Frontend Tests">
    <img src="https://img.shields.io/badge/E2E_Tests-609-brightgreen" alt="E2E Tests">
    <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
  </p>

  <p>
    <img src="https://img.shields.io/badge/Angular-21-DD0031?logo=angular" alt="Angular">
    <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs" alt="Node.js">
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql" alt="MySQL">
    <img src="https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis" alt="Redis">
  </p>
</div>

---

A **polyglot full-stack** enterprise application showcasing versatility across different technology stacks. This project demonstrates **senior-level software engineering practices** including JWT authentication with RBAC, API versioning, Redis caching, audit logging, and **1,388 automated tests** across unit, integration, and E2E test suites.

## 🎯 Portfolio Context

This is a **complementary portfolio project** demonstrating full-stack capabilities alongside my primary expertise in distributed systems and microservices architecture. 

**What This Project Shows:**
- ✅ **Polyglot Capability**: Node.js + Angular proficiency alongside Java/Spring Boot
- ✅ **Full-Stack Development**: Modern Angular 21 with TypeScript, RxJS, and reactive patterns
- ✅ **Production-Ready Practices**: Docker, Kubernetes, CI/CD, comprehensive testing, security hardening
- ✅ **Clean Architecture**: Layered design, separation of concerns, maintainable codebase

**For My Core Expertise:**
- 🔹 **Microservices Architecture & Distributed Systems** → See [Chaos Symphony](https://github.com/aporkolab/chaos-symphony) (Java/Spring Boot)
  - Saga orchestration, event-driven architecture, CQRS/Event Sourcing
  - Outbox pattern with CDC, distributed transactions, circuit breakers
- 🔹 **Additional Projects** → [Portfolio Overview](https://www.aporkolab.com)

> **Tech Stack Note**: This project uses **Node.js/Express** to demonstrate adaptability. For enterprise-scale Java/Spring Boot microservices with advanced distributed patterns, see my other repositories.

## 🤔 Why Node.js for This Project?

This project deliberately uses **Node.js** alongside my primary Java/Spring expertise to demonstrate:

| Reason | Explanation |
|--------|-------------|
| **Polyglot Capability** | Senior developers adapt to project needs, not the other way around |
| **Rapid Prototyping** | Node.js + Express enables fast iteration for portfolio projects |
| **Full-Stack JavaScript** | Unified language across frontend (Angular/TS) and backend |
| **Lightweight Architecture** | Perfect for demonstrating clean code without enterprise boilerplate |
| **Industry Relevance** | Node.js powers Netflix, LinkedIn, PayPal — knowing both ecosystems is valuable |

> *For enterprise Java/Spring Boot examples, see my other repositories.*

## ✨ Features

### For Employees
- 🛒 Browse cafeteria products with pagination, filtering, and sorting
- 📝 Create and manage purchases with real-time balance tracking
- 📊 View personal consumption history and monthly spending reports
- 💰 Automatic balance deduction and low-balance alerts

### For Managers
- 👥 Manage employee records with complete CRUD operations
- 📈 Generate detailed consumption and revenue reports
- 🔍 Monitor purchase patterns and product popularity
- 📋 Export data for external analysis

### For Administrators
- 🔐 Full system access with user management capabilities
- 👤 Role assignment and permission management
- 📋 Comprehensive audit logging for compliance
- ⚙️ System configuration and monitoring dashboards

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express** | 5.x | Web framework |
| **Sequelize** | 6.x | ORM with migrations |
| **MySQL** | 8.0 | Primary database |
| **Redis** | 7.x | Caching layer |
| **JWT** | — | Stateless authentication |
| **Joi** | 17.x | Request validation |
| **Winston** | 3.x | Structured logging |
| **Swagger** | 5.x | API documentation |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Angular** | 21.x | Framework (latest) |
| **TypeScript** | 5.8 | Type-safe JavaScript |
| **RxJS** | 7.8 | Reactive programming |
| **Bootstrap** | 5.x | UI components |
| **SCSS** | — | Styling with variables |

### DevOps & Testing

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization with multi-stage builds |
| **Docker Compose** | Local development orchestration |
| **Kubernetes** | Production deployment (Helm charts) |
| **GitHub Actions** | CI/CD pipeline |
| **Jest** | Unit & integration testing |
| **Cypress** | E2E testing with accessibility |
| **Prometheus** | Metrics collection |
| **Grafana** | Monitoring dashboards |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Quick Start (Docker) — Recommended

```bash
# Clone repository
git clone https://github.com/AProkolab/feastfrenzy.git
cd feastfrenzy

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up --build

# Access application
# Frontend: http://localhost:4200
# Backend:  http://localhost:3000
# Swagger:  http://localhost:3000/api-docs
# Grafana:  http://localhost:3001 (admin/admin)
```

### Manual Setup

```bash
# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run seed
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm start
```

### Demo Credentials (for https://feastfrenzy.dev)

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@feastfrenzy.com | Admin123! |
| Manager | manager@feastfrenzy.com | Manager123! |
| Employee | employee@feastfrenzy.com | Employee123! |

---

## 📚 API Documentation

Full interactive API documentation is available at `/api-docs` when running the backend.

### Authentication Endpoints

```
POST   /api/v1/auth/register    Register new user
POST   /api/v1/auth/login       Login and receive tokens
POST   /api/v1/auth/refresh     Refresh access token
POST   /api/v1/auth/logout      Invalidate tokens
```

### Resource Endpoints

All list endpoints support **pagination**, **filtering**, and **sorting**:

```
# Products
GET    /api/v1/products                    List products
GET    /api/v1/products/:id                Get single product
POST   /api/v1/products                    Create product (Admin/Manager)
PUT    /api/v1/products/:id                Update product (Admin/Manager)
DELETE /api/v1/products/:id                Delete product (Admin)

# Employees
GET    /api/v1/employees                   List employees
GET    /api/v1/employees/:id               Get single employee
POST   /api/v1/employees                   Create employee (Admin/Manager)
PUT    /api/v1/employees/:id               Update employee (Admin/Manager)
DELETE /api/v1/employees/:id               Delete employee (Admin)

# Purchases
GET    /api/v1/purchases                   List purchases
GET    /api/v1/purchases/:id               Get single purchase with items
POST   /api/v1/purchases                   Create purchase
PUT    /api/v1/purchases/:id               Update purchase (Admin)
DELETE /api/v1/purchases/:id               Delete purchase (Admin)
```

### Query Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `page` | `?page=2` | Page number (default: 1) |
| `limit` | `?limit=25` | Items per page (default: 10, max: 100) |
| `sort` | `?sort=name:asc` | Sort field and direction |
| `search` | `?search=coffee` | Full-text search |
| `filter` | `?filter[category]=beverage` | Field-specific filtering |

See [docs/API.md](docs/API.md) for complete documentation.

---

## 🧪 Testing

### Test Statistics

| Test Type | Count |
|-----------|-------|
| Backend Unit/Integration | 385 |
| Frontend Unit | 394 |
| E2E (Cypress) | 609 |
| **Total** | **1,388** |

### Running Tests

```bash
# Backend tests
cd backend
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
npm run test:watch          # Watch mode

# Frontend tests
cd frontend
npm test                    # Run unit tests
npm run test:coverage       # Run with coverage report
npm run test:watch          # Watch mode

# E2E tests
cd frontend
npm run e2e                 # Interactive Cypress
npm run e2e:headless        # Headless mode (CI)
npm run e2e:chrome          # Chrome browser
npm run e2e:firefox         # Firefox browser
```

---

## 📁 Project Structure

```
feastfrenzy/
├── backend/
│   ├── config/               # Environment configurations
│   ├── controller/           # Route controllers by feature
│   │   ├── auth/             # Authentication endpoints
│   │   ├── base/             # Base controller/service classes
│   │   ├── employee/         # Employee CRUD
│   │   ├── product/          # Product CRUD
│   │   └── purchase/         # Purchase management
│   ├── middleware/           # Express middleware
│   │   ├── auth.js           # JWT verification
│   │   ├── audit.js          # Audit logging
│   │   ├── cache.js          # Redis caching
│   │   ├── pagination.js     # Pagination helper
│   │   └── validation/       # Joi schemas
│   ├── model/                # Sequelize models
│   ├── migrations/           # Database migrations
│   ├── seeders/              # Sample data
│   ├── services/             # Business logic layer
│   ├── test/                 # Jest test files
│   └── utils/                # Helper utilities
│
├── frontend/
│   └── src/app/
│       ├── core/             # Singleton services & guards
│       ├── features/         # Feature modules (lazy-loaded)
│       ├── shared/           # Reusable components
│       │   ├── components/   # UI components
│       │   ├── directives/   # Custom directives
│       │   ├── pipes/        # Custom pipes
│       │   └── services/     # Shared services
│       ├── guards/           # Route guards
│       ├── interceptors/     # HTTP interceptors
│       ├── model/            # TypeScript interfaces
│       ├── page/             # Page components
│       └── service/          # API services
│
├── docs/                     # Documentation
├── helm/                     # Kubernetes Helm charts
├── monitoring/               # Prometheus & Grafana configs
├── nginx/                    # Reverse proxy configuration
└── docker-compose.yml        # Development orchestration
```

---

## 🏗 Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture diagrams.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Layered Architecture** | Clear separation: Controllers → Services → Models |
| **Feature Modules** | Angular lazy-loaded modules for code splitting |
| **JWT + RBAC** | Stateless authentication with role-based access |
| **Redis Caching** | Reduced database load for frequent reads |
| **Audit Trail** | Complete logging for compliance requirements |
| **Request ID Tracking** | End-to-end request tracing for debugging |
| **API Versioning** | Future-proof API evolution (/api/v1/) |

### Security Features

- 🔐 JWT authentication with refresh token rotation
- 🛡️ Helmet.js security headers
- 🚫 Rate limiting on sensitive endpoints
- 🔒 Password hashing with bcrypt (12 rounds)
- 🚷 Account lockout after failed attempts
- 🧹 Input sanitization and validation
- 🔍 SQL injection prevention via ORM
- 🌐 CORS configuration for production

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📝 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) file.

---

## 👤 Author

**Ádám Dr. Porkoláb**

- Portfolio: [aporkolab.com](https://aporkolab.com)
- GitHub: [@AProkolab](https://github.com/AProkolab)
- LinkedIn: [Adam Porkolab](https://linkedin.com/in/adamporkolab)

---

<div align="center">
  <p>Built with ❤️ as a Senior Full-Stack Developer Portfolio Project</p>
  <p><sub>Demonstrating enterprise-grade architecture, comprehensive testing, and production-ready deployment</sub></p>
</div>
