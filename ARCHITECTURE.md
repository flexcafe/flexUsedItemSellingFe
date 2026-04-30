# Flex Used Market – Clean Architecture (Onion Architecture)

Flex Used Market is a React Native (Expo) mobile application that implements **Onion Architecture** to separate concerns across domain, application, infrastructure, and presentation layers. This provides a clean, testable, and maintainable codebase.

## Tech Stack

- **Runtime:** React 19, React Native 0.81, Expo SDK 54
- **Routing:** Expo Router 6 (file-based routing)
- **HTTP:** Axios with interceptors for auth tokens
- **Server State:** TanStack React Query v5
- **Validation:** Zod v4
- **Token Storage:** expo-secure-store (native) / localStorage (web)
- **DI:** Manual dependency injection container

## Folder Structure

```
flex-used-market-fe/
├── app/                          # Expo Router – routes only (thin screens)
│   ├── _layout.tsx               # Root layout: providers + auth gate
│   ├── (auth)/                   # Unauthenticated route group
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/                   # Authenticated tab navigator
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home / Dashboard
│   │   ├── products.tsx          # Products list
│   │   └── explore.tsx           # Explore
│   └── modal.tsx
│
├── core/                         # Onion Architecture layers
│   ├── domain/                   # INNERMOST – pure business logic
│   │   ├── entities/             # Product, User
│   │   ├── repositories/         # IProductRepository, IAuthRepository
│   │   ├── services/             # IProductService, IAuthService
│   │   ├── types/                # Shared types (Id, PaginationParams, auth)
│   │   └── value-objects/        # Money
│   │
│   ├── application/              # Use cases & data transformation
│   │   ├── dtos/                 # ProductDto, AuthDto
│   │   ├── services/             # ProductService, AuthService (implementations)
│   │   └── mappers/              # ProductMapper, AuthMapper
│   │
│   └── infrastructure/           # OUTERMOST – external concerns
│       ├── api/                  # HttpClient (Axios), API constants/endpoints
│       ├── repositories/         # ApiProductRepository, ApiAuthRepository
│       ├── storage/              # TokenStorage (expo-secure-store wrapper)
│       └── di/                   # Dependency injection container
│
├── features/                     # Feature modules (vertical slices)
│   ├── auth/
│   │   └── presentation/         # LoginScreen
│   └── products/
│       └── presentation/         # ProductListScreen
│
├── presentation/                 # Shared presentation concerns
│   ├── providers/                # QueryProvider, AuthProvider
│   └── hooks/                    # useProducts, useAuth, etc.
│
├── components/                   # Shared UI components (existing)
├── constants/                    # Theme, colors, fonts
├── hooks/                        # Platform-specific hooks (useColorScheme)
└── assets/                       # Images, fonts, etc.
```

## Architecture Layers

### Domain Layer (`core/domain/`)
The innermost layer. Contains pure TypeScript interfaces and types with **zero framework dependencies**. Defines:
- **Entities** – core business objects (Product, AuthUser)
- **Repository interfaces** – contracts for data access
- **Service interfaces** – contracts for business operations
- **Types** – shared value types
- **Value Objects** – domain primitives (Money)

### Application Layer (`core/application/`)
Orchestrates domain logic. Contains:
- **DTOs** – data transfer objects for API communication
- **Service implementations** – fulfill domain service contracts by delegating to repositories
- **Mappers** – transform between DTOs and domain entities

### Infrastructure Layer (`core/infrastructure/`)
The outermost core layer. Implements domain interfaces with concrete dependencies:
- **HttpClient** – Axios instance with auth token interceptor (reads from SecureStore)
- **API constants** – endpoint definitions and base URL config
- **Repository implementations** – API-backed repos (ApiProductRepository, ApiAuthRepository)
- **TokenStorage** – expo-secure-store wrapper for secure token persistence
- **DI Container** – wires all dependencies together

### Presentation Layer (`presentation/`)
Shared React hooks and providers:
- **AuthProvider** – manages auth state, login/logout, token lifecycle
- **QueryProvider** – configures TanStack React Query client
- **Hooks** – useProducts, useAuth (consume core services via `useServices()`)

**Strict Clean Architecture note**

- **Composition root only**: the DI container and infrastructure wiring must live only in the composition root (currently `app/_layout.tsx`).
- **Shared hooks/providers**: any new shared hook/provider that needs core logic (e.g. `useOrders`, `useProfile`, etc.) should follow the same pattern:
  - consume services via `useServices()`
  - never import the DI container or `core/infrastructure/*` directly

### Features (`features/`)
Feature-specific modules containing their own presentation components. Each feature is a vertical slice:
- `features/auth/presentation/` – LoginScreen
- `features/products/presentation/` – ProductListScreen

### App Routes (`app/`)
Expo Router file-based routing. Screens are **thin** – they import feature components and render them. Route protection is handled via the AuthGate in the root layout (replacing Next.js middleware).

## Dependency Flow

```
app/ → features/ → presentation/ → core/application/ → core/domain/
                                  ↘ core/infrastructure/ (implements domain interfaces)
```

- `app/` depends on `features/` and `presentation/`
- `features/` use `presentation/hooks/` which consume services via `useServices()` (services are wired in the composition root)
- `core/application/services/` depend only on `core/domain/` interfaces
- `core/infrastructure/` implements `core/domain/` interfaces and is wired via the DI container
- `core/domain/` has **zero external dependencies**

## Auth Flow (replacing NextAuth)

1. App launches → `AuthProvider` calls `AuthService.bootstrap()` (delegates token check + profile hydration behind abstractions)
2. If token exists → calls `getProfile()` to validate and hydrate user state
3. If no token or invalid → `AuthGate` redirects to `(auth)/login`
4. Login → `AuthService.login()` → repository persists token (infrastructure concern) → updates context
5. `HttpClient` interceptor reads token from `TokenStorage` for every request
6. On 401 → clears tokens, triggers logout, redirects to login
7. Logout → `AuthService.logout()` clears tokens, clears React Query cache, resets auth state

## Environment Variables

Copy `.env` and set:
- `EXPO_PUBLIC_API_URL` – backend API base URL (e.g., `http://localhost:3000/api`)

## Adding a New Feature

1. **Domain:** Define entity in `core/domain/entities/`, repository interface in `core/domain/repositories/`, service interface in `core/domain/services/`
2. **Application:** Create DTO in `core/application/dtos/`, mapper in `core/application/mappers/`, service implementation in `core/application/services/`
3. **Infrastructure:** Implement repository in `core/infrastructure/repositories/`, register in `core/infrastructure/di/container.ts`
4. **Presentation:** Create hook/provider in `presentation/` that consumes services via `useServices()` (no direct infrastructure imports)
5. **Feature:** Build screen components in `features/<name>/presentation/`
6. **Route:** Add route file in `app/` that imports the feature component
