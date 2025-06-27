# Contributing to FeastFrenzy

First off, thank you for considering contributing to FeastFrenzy! 🎉

This document provides guidelines and steps for contributing. Following these guidelines helps communicate that you respect the time of the developers managing and developing this open source project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

---

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming environment. Please be respectful and constructive in all interactions.

### Our Standards

✅ **Do:**
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the project

❌ **Don't:**
- Use offensive or exclusionary language
- Engage in personal attacks
- Publish others' private information
- Behave unprofessionally

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Docker & Docker Compose (recommended)
- Git
- A code editor (VS Code recommended)

### Development Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/feastfrenzy.git
cd feastfrenzy

# 3. Add upstream remote
git remote add upstream https://github.com/AProkolab/feastfrenzy.git

# 4. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 5. Copy environment files
cp backend/.env.example backend/.env

# 6. Start development environment
docker-compose up -d

# 7. Run migrations and seed data
cd backend
npm run migrate
npm run seed
```

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- Angular Language Service
- Docker
- GitLens

---

## Development Process

### 1. Pick an Issue

- Check [open issues](https://github.com/AProkolab/feastfrenzy/issues)
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to claim it
- If you have a new idea, open an issue first to discuss

### 2. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Write clean, readable code
- Follow the code standards below
- Add tests for new functionality
- Update documentation if needed

### 4. Test Your Changes

```bash
# Backend tests
cd backend
npm test
npm run lint

# Frontend tests
cd frontend
npm test
npm run lint

# E2E tests (requires running app)
npm run e2e:headless
```

### 5. Submit a Pull Request

- Push your branch to your fork
- Open a PR against the `main` branch
- Fill out the PR template
- Wait for review

---

## Code Standards

### Backend (Node.js/Express)

#### File Structure
```
controller/
  feature-name/
    router.js       # Express routes
    controller.js   # Request handlers (if complex)

services/
  feature.service.js  # Business logic

model/
  feature.js          # Sequelize model
```

#### Style Guide

```javascript
// ✅ Good: Async/await with proper error handling
async function getProduct(req, res, next) {
  try {
    const product = await productService.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ data: product });
  } catch (error) {
    next(error);
  }
}

// ❌ Bad: Callback hell, no error handling
function getProduct(req, res) {
  Product.findById(req.params.id, function(err, product) {
    res.json(product);
  });
}
```

#### Naming Conventions
- Files: `kebab-case.js`
- Variables/functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### Frontend (Angular/TypeScript)

#### File Structure
```
features/
  feature-name/
    components/
      feature-form/
        feature-form.component.ts
        feature-form.component.spec.ts
    feature.routes.ts

shared/
  components/      # Reusable UI components
  directives/      # Custom directives
  pipes/           # Custom pipes
  services/        # Shared services
```

#### Style Guide

```typescript
// ✅ Good: Strong typing, reactive patterns
interface Product {
  id: number;
  name: string;
  price: number;
}

@Component({
  selector: 'app-product-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  products$: Observable<Product[]>;
  
  constructor(private productService: ProductService) {
    this.products$ = this.productService.getProducts();
  }
}

// ❌ Bad: Any types, imperative code
@Component({...})
export class ProductListComponent {
  products: any[] = [];
  
  ngOnInit() {
    this.productService.getProducts().subscribe(data => {
      this.products = data;
    });
  }
}
```

#### Angular Best Practices
- Use `OnPush` change detection when possible
- Unsubscribe from observables (use `takeUntilDestroyed()`)
- Use reactive forms over template-driven forms
- Keep components small and focused
- Use TypeScript strict mode

---

## Testing Requirements

### Backend Testing

```javascript
// Unit test example
describe('ProductService', () => {
  describe('findById', () => {
    it('should return product when found', async () => {
      // Arrange
      const mockProduct = { id: 1, name: 'Coffee' };
      jest.spyOn(Product, 'findByPk').mockResolvedValue(mockProduct);
      
      // Act
      const result = await productService.findById(1);
      
      // Assert
      expect(result).toEqual(mockProduct);
    });
    
    it('should return null when not found', async () => {
      jest.spyOn(Product, 'findByPk').mockResolvedValue(null);
      
      const result = await productService.findById(999);
      
      expect(result).toBeNull();
    });
  });
});
```

### Frontend Testing

```typescript
// Component test example
describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        { provide: ProductService, useValue: mockProductService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should validate required fields', () => {
    component.form.patchValue({ name: '' });
    expect(component.form.valid).toBeFalsy();
  });
});
```

### Coverage Requirements

| Metric | Backend | Frontend |
|--------|---------|----------|
| Statements | 80% | 80% |
| Branches | 50% | 50% |
| Functions | 75% | 75% |
| Lines | 80% | 80% |

---

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

### Examples

```bash
# Feature
feat(products): add bulk import functionality

# Bug fix
fix(auth): resolve token refresh race condition

# Documentation
docs(readme): update installation instructions

# With breaking change
feat(api)!: change response format for pagination

BREAKING CHANGE: List endpoints now return `data` array instead of direct array
```

---

## Pull Request Process

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New functionality has tests
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe tests that you ran

## Screenshots (if applicable)

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests
- [ ] Documentation has been updated
```

### Review Process

1. **Automated Checks**: CI must pass (tests, linting)
2. **Code Review**: At least one approving review required
3. **Response Time**: Reviewers aim to respond within 48 hours
4. **Feedback**: Address all review comments
5. **Merge**: Squash and merge after approval

---

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g. macOS 14]
- Browser: [e.g. Chrome 120]
- Node version: [e.g. 18.19]
```

### Feature Requests

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
Any other context or screenshots.
```

---

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

Thank you for contributing! 🙏
