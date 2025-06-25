# 🏗️ FeastFrenzy Architecture

## System Overview

FeastFrenzy is built on a **layered architecture** pattern, separating concerns between presentation, business logic, and data access layers. The system supports both development and production deployments with Docker containerization.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🌐 Web Browser"]
    end
    
    subgraph "Frontend - Angular 21"
        FE["Angular Application"]
        Guards["Route Guards"]
        Interceptors["HTTP Interceptors"]
        Services["Angular Services"]
    end
    
    subgraph "API Gateway"
        Nginx["Nginx Reverse Proxy"]
    end
    
    subgraph "Backend - Node.js/Express"
        API["Express.js API"]
        Auth["Auth Middleware"]
        RBAC["RBAC Middleware"]
        Validation["Joi Validation"]
        Controllers["Controllers"]
        ServicesB["Service Layer"]
    end
    
    subgraph "Data Layer"
        MySQL[("MySQL 8.0")]
        Redis[("Redis Cache")]
    end
    
    subgraph "Monitoring"
        Prometheus["Prometheus"]
        Grafana["Grafana"]
    end
    
    Browser --> Nginx
    Nginx --> FE
    FE --> Guards
    Guards --> Interceptors
    Interceptors --> Services
    Services --> Nginx
    Nginx --> API
    API --> Auth
    Auth --> RBAC
    RBAC --> Validation
    Validation --> Controllers
    Controllers --> ServicesB
    ServicesB --> Redis
    ServicesB --> MySQL
    API --> Prometheus
    Prometheus --> Grafana
```

## Request Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Angular
    participant Interceptor
    participant Express
    participant Auth
    participant RBAC
    participant Controller
    participant Service
    participant Cache
    participant Database
    
    Browser->>Angular: User Action
    Angular->>Interceptor: HTTP Request
    Interceptor->>Interceptor: Add JWT Token
    Interceptor->>Express: API Request
    Express->>Auth: Verify Token
    Auth->>RBAC: Check Permissions
    RBAC->>Controller: Route Handler
    Controller->>Service: Business Logic
    Service->>Cache: Check Cache
    alt Cache Hit
        Cache-->>Service: Return Cached Data
    else Cache Miss
        Service->>Database: Query Data
        Database-->>Service: Return Results
        Service->>Cache: Update Cache
    end
    Service-->>Controller: Return Data
    Controller-->>Express: Response
    Express-->>Angular: JSON Response
    Angular-->>Browser: Update UI
```

## Backend Layer Architecture

```mermaid
graph LR
    subgraph "HTTP Layer"
        R[Routes/Controllers]
    end
    
    subgraph "Middleware Stack"
        M1[Request ID]
        M2[Rate Limiter]
        M3[Auth]
        M4[RBAC]
        M5[Validation]
        M6[Audit]
    end
    
    subgraph "Business Logic"
        S[Services]
    end
    
    subgraph "Data Access"
        ORM[Sequelize ORM]
        Cache[Cache Service]
    end
    
    subgraph "Storage"
        DB[(MySQL)]
        Redis[(Redis)]
    end
    
    R --> M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> S
    S --> ORM --> DB
    S --> Cache --> Redis
```

## Frontend Module Architecture

```mermaid
graph TB
    subgraph "Core Module (Singleton)"
        Guards["Auth Guard<br/>Role Guard"]
        Interceptors["Auth Interceptor<br/>Error Interceptor<br/>Loading Interceptor"]
        CoreServices["Auth Service"]
    end
    
    subgraph "Feature Modules (Lazy Loaded)"
        Auth["Auth Module<br/>(Login/Register)"]
        Dashboard["Dashboard Module"]
        Products["Products Module"]
        Employees["Employees Module"]
        Purchases["Purchases Module"]
    end
    
    subgraph "Shared Module"
        Components["Common Components<br/>- Data Table<br/>- Form Field<br/>- Loading Spinner<br/>- Toast Container"]
        Directives["Directives<br/>- Has Role<br/>- Focus Trap"]
        Pipes["Pipes<br/>- Date Format<br/>- Currency Format"]
        SharedServices["Services<br/>- Toast<br/>- Loading"]
    end
    
    Core --> Auth
    Core --> Dashboard
    Core --> Products
    Core --> Employees
    Core --> Purchases
    
    Auth --> Shared
    Dashboard --> Shared
    Products --> Shared
    Employees --> Shared
    Purchases --> Shared
```

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ PURCHASES : makes
    EMPLOYEES ||--o{ PURCHASES : has
    PURCHASES ||--|{ PURCHASE_ITEMS : contains
    PRODUCTS ||--o{ PURCHASE_ITEMS : included_in
    USERS ||--o{ AUDIT_LOGS : generates
    
    USERS {
        int id PK
        string email UK
        string password
        string role
        boolean active
        int failedLoginAttempts
        timestamp lockedUntil
        timestamp createdAt
        timestamp updatedAt
    }
    
    EMPLOYEES {
        int id PK
        string name
        string department
        decimal balance
        int userId FK
        boolean active
        timestamp createdAt
        timestamp updatedAt
    }
    
    PRODUCTS {
        int id PK
        string name
        string category
        decimal price
        string description
        boolean active
        timestamp createdAt
        timestamp updatedAt
    }
    
    PURCHASES {
        int id PK
        int employeeId FK
        int userId FK
        decimal totalAmount
        string status
        timestamp purchaseDate
        timestamp createdAt
        timestamp updatedAt
    }
    
    PURCHASE_ITEMS {
        int id PK
        int purchaseId FK
        int productId FK
        int quantity
        decimal unitPrice
        decimal subtotal
        timestamp createdAt
    }
    
    AUDIT_LOGS {
        int id PK
        string action
        string entityType
        int entityId
        int userId FK
        json oldValues
        json newValues
        string ipAddress
        string requestId
        timestamp createdAt
    }
```

## Authentication Flow

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> LoginAttempt: Submit Credentials
    LoginAttempt --> ValidatingCredentials: Validate
    
    ValidatingCredentials --> FailedAttempt: Invalid Credentials
    ValidatingCredentials --> GeneratingTokens: Valid Credentials
    
    FailedAttempt --> IncrementFailures: Record Failure
    IncrementFailures --> CheckLockout: Check Threshold
    CheckLockout --> AccountLocked: Exceeded (5 attempts)
    CheckLockout --> Unauthenticated: Under Threshold
    
    AccountLocked --> Unauthenticated: Lockout Expired (15 min)
    
    GeneratingTokens --> Authenticated: Issue JWT + Refresh Token
    
    Authenticated --> RefreshingToken: Token Expired
    RefreshingToken --> Authenticated: Valid Refresh Token
    RefreshingToken --> Unauthenticated: Invalid/Expired Refresh
    
    Authenticated --> LoggingOut: Logout
    LoggingOut --> Unauthenticated: Tokens Invalidated
```

## Caching Strategy

```mermaid
graph TB
    subgraph "Cache Strategy"
        Request[Incoming Request]
        CacheCheck{Cache Hit?}
        DB[(Database)]
        Cache[(Redis)]
        Response[Response]
        
        Request --> CacheCheck
        CacheCheck -->|Yes| Cache
        CacheCheck -->|No| DB
        DB --> Cache
        Cache --> Response
    end
    
    subgraph "Cache Invalidation"
        Write[Write Operation]
        Invalidate[Invalidate Cache]
        Pattern[Pattern-based Keys]
        
        Write --> Invalidate
        Invalidate --> Pattern
    end
    
    subgraph "Cached Endpoints"
        Products["/products - 5min TTL"]
        Employees["/employees - 5min TTL"]
        SingleItem["/resource/:id - 5min TTL"]
    end
```

## Deployment Architecture

### Development Environment

```mermaid
graph TB
    subgraph "Docker Compose - Development"
        FE["Frontend Container<br/>:4200"]
        BE["Backend Container<br/>:3000"]
        DB["MySQL Container<br/>:3306"]
        Redis["Redis Container<br/>:6379"]
        
        FE --> BE
        BE --> DB
        BE --> Redis
    end
```

### Production Environment

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            IG[Ingress Controller]
        end
        
        subgraph "Frontend Pods"
            FE1[Frontend Pod 1]
            FE2[Frontend Pod 2]
        end
        
        subgraph "Backend Pods"
            BE1[Backend Pod 1]
            BE2[Backend Pod 2]
            BE3[Backend Pod 3]
        end
        
        subgraph "Data Services"
            DB[(MySQL StatefulSet)]
            Redis[(Redis Cluster)]
        end
        
        subgraph "Monitoring"
            Prom[Prometheus]
            Graf[Grafana]
        end
        
        IG --> FE1 & FE2
        FE1 & FE2 --> BE1 & BE2 & BE3
        BE1 & BE2 & BE3 --> DB
        BE1 & BE2 & BE3 --> Redis
        BE1 & BE2 & BE3 --> Prom
        Prom --> Graf
    end
```

## Key Design Patterns

### Backend Patterns

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Repository Pattern** | Service Layer | Abstract data access |
| **Middleware Chain** | Express middleware | Request processing pipeline |
| **Factory Pattern** | Model definitions | Create ORM instances |
| **Singleton** | Cache service | Single Redis connection |
| **Strategy Pattern** | Validation schemas | Different validation rules |

### Frontend Patterns

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Smart/Dumb Components** | Page/Component split | Separation of concerns |
| **Observable Pattern** | RxJS throughout | Reactive data flow |
| **Interceptor Pattern** | HTTP Interceptors | Cross-cutting concerns |
| **Guard Pattern** | Route Guards | Access control |
| **Dependency Injection** | Angular DI | Loose coupling |

## Performance Optimizations

### Backend
- Connection pooling for MySQL
- Redis caching with TTL
- Pagination on all list endpoints
- Database indexes on frequently queried columns
- Gzip compression
- Request ID tracking for debugging

### Frontend
- Lazy loading of feature modules
- OnPush change detection strategy
- Virtual scrolling for large lists
- Image optimization
- Service Worker caching (production)

## Security Layers

```mermaid
graph TB
    subgraph "Security Stack"
        L1["Layer 1: HTTPS/TLS"]
        L2["Layer 2: Rate Limiting"]
        L3["Layer 3: CORS"]
        L4["Layer 4: Helmet Headers"]
        L5["Layer 5: JWT Authentication"]
        L6["Layer 6: RBAC Authorization"]
        L7["Layer 7: Input Validation"]
        L8["Layer 8: SQL Injection Prevention"]
        L9["Layer 9: Audit Logging"]
        
        L1 --> L2 --> L3 --> L4 --> L5 --> L6 --> L7 --> L8 --> L9
    end
```
