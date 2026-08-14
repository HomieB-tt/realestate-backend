# Real Estate MVP Backend

A modern, production-ready backend API for a real estate marketplace platform. Built with **Node.js**, **TypeScript**, **Express**, and **Supabase (PostgreSQL + PostGIS)** using **Clean Architecture** principles.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

### Core Domain
- **Property Listings**: Create, search, and manage real estate listings (sale/rent)
- **Geospatial Search**: Find properties near a location using PostGIS
- **Viewing/Appointment Booking**: Request, confirm, and manage property viewings with ACID-safe conflict prevention
- **User Roles**: Distinct permissions for clients, agents, and administrators

### Technical Highlights
- **Clean Architecture**: Clear separation of concerns with Domain, Use Case, Repository, and Delivery layers
- **Type Safety**: Full TypeScript support with domain entities and value objects
- **Security**: Role-based access control (RBAC) with JWT authentication via Supabase
- **Data Integrity**: Database-level constraints and business rule validation
- **Concurrency Safety**: ACID-compliant viewing slot booking with row-level locking

## Architecture

```
├── backend/
│   ├── src/
│   │   ├── config/          # Environment, DB, Supabase client configuration
│   │   ├── domain/
│   │   │   ├── entities/    # Core domain entities (Property, Viewing, Profile)
│   │   │   └── repositories/# Repository interfaces
│   │   ├── repository/      # Concrete repository implementations
│   │   ├── usecase/         # Business logic / use cases
│   │   └── delivery/http/   # HTTP layer (controllers, routes, middleware)
│   │       ├── controllers/
│   │       ├── routes/
│   │       └── middleware/
│   ├── server.ts           # Express app entry point
│   ├── Dockerfile          # Multi-stage production build
│   └── package.json
├── db/
│   └── migrations/         # SQL migration scripts
├── .env.example
├── Dockerfile
└── README.md
```

## Domain Model

### Entities

#### Property
- Represents a real estate listing
- Types: `sale` | `rent`
- Status: `draft` | `published` | `under_offer` | `sold` | `archived`
- Geospatial location using WGS84 coordinates (PostGIS `geography(Point, 4326)`)
- Business rules: Price validation, address completion for publishing

#### Viewing
- Represents a property viewing appointment
- Status: `requested` | `confirmed` | `cancelled` | `completed` | `no_show`
- Prevents double-booking with database-level exclusivity constraints
- Minimum lead time enforcement

#### Profile
- Extends Supabase Auth users with app-specific data
- Roles: `client` | `agent` | `admin`
- One-to-one relationship with `auth.users`

## API Endpoints

### Properties

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/v1/properties/search` | Search nearby properties | No | Public |
| GET | `/api/v1/properties/:id` | Get property by ID | No | Public |
| POST | `/api/v1/properties` | Create new property | Yes | agent, admin |
| POST | `/api/v1/properties/:id/publish` | Publish property | Yes | agent, admin |
| GET | `/api/v1/properties/mine/list` | List my properties | Yes | agent, admin |
| DELETE | `/api/v1/properties/:id` | Delete property | Yes | agent, admin |

### Viewings

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/v1/viewings` | Request viewing | Yes | client, agent, admin |
| POST | `/api/v1/viewings/:id/confirm` | Confirm viewing | Yes | agent, admin |
| POST | `/api/v1/viewings/:id/cancel` | Cancel viewing | Yes | All |
| GET | `/api/v1/viewings/property/:propertyId` | List viewings for property | Yes | All |
| GET | `/api/v1/viewings/mine/list` | List my viewings | Yes | All |

### Health

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/healthz` | Liveness/readiness probe | No |

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- Docker (optional, for production)
- Supabase project (PostgreSQL with PostGIS extension)

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd realestate-backend
   ```

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` (if it exists) or create `.env` in the `backend/` directory:
   ```bash
   cp .env.example backend/.env
   # Edit backend/.env with your Supabase credentials
   ```

   Required environment variables:
   ```env
   NODE_ENV=development
   PORT=8080
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

4. Apply database migrations:
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or using psql
   psql -h your-host -U your-user -d your-db -f db/migrations/001_init_schema.sql
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:8080`

### Production Deployment

#### Using Docker

1. Build the Docker image:
   ```bash
   docker build -t realestate-backend -f backend/Dockerfile .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:8080 \
     -e NODE_ENV=production \
     -e PORT=8080 \
     -e SUPABASE_URL=your-supabase-url \
     -e SUPABASE_ANON_KEY=your-anon-key \
     -e SUPABASE_SERVICE_ROLE_KEY=your-service-key \
     -e DATABASE_URL=your-db-url \
     realestate-backend
   ```

#### Using Kubernetes

The Dockerfile includes a health check endpoint (`/healthz`) suitable for Kubernetes liveness/readiness probes.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint on source files |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure Details

### Clean Architecture Layers

1. **Domain Layer** (`src/domain/`)
   - Core business entities (Property, Viewing, Profile)
   - Repository interfaces
   - Business rules and invariants
   - Pure TypeScript, no external dependencies

2. **Use Case Layer** (`src/usecase/`)
   - Business logic orchestration
   - Depends only on domain interfaces
   - Contains no HTTP or database-specific code

3. **Repository Layer** (`src/repository/`)
   - Concrete implementations of repository interfaces
   - Supabase and PostgreSQL-specific code
   - Only place where infrastructure meets domain

4. **Delivery Layer** (`src/delivery/http/`)
   - Express controllers and routes
   - Authentication middleware
   - Request/response handling
   - Error handling middleware

### Composition Root
The composition root is in `src/delivery/http/routes/index.ts`, where:
- Concrete repositories are instantiated
- Dependencies are injected into use cases
- Use cases are injected into controllers
- Routes are wired to controllers

This is the **only place** where the infrastructure layer (Supabase/PostgreSQL) meets the domain/usecase layers, making it easy to:
- Swap storage providers
- Write unit tests with mock repositories
- Maintain clean separation of concerns

## Database Schema

The database uses PostgreSQL with the following extensions:
- **PostGIS**: For geospatial queries on property locations
- **uuid-ossp**: For UUID generation
- **pgcrypto**: For cryptographic functions

### Tables

| Table | Description |
|-------|-------------|
| `auth.users` | Supabase-managed authentication users |
| `public.profiles` | App-specific user profiles (1:1 with auth.users) |
| `public.properties` | Property listings with geospatial location |
| `public.viewings` | Property viewing appointments with conflict prevention |

## Authentication

Authentication is handled via **Supabase Auth**:

1. Clients obtain JWT tokens from Supabase Auth
2. Tokens are passed in the `Authorization: Bearer <token>` header
3. The `auth.middleware.ts` validates and decodes the JWT
4. The `requireRole` middleware enforces role-based access control

The Supabase admin client (with service role key) is used **only** in the repository layer, after authentication and authorization have been verified.

## Security Considerations

- **Service Role Key**: Never exposed to client applications; only used server-side
- **Row Level Security**: Database RLS policies should be configured in Supabase
- **Input Validation**: Both at the HTTP layer (Express) and domain layer (entities)
- **SQL Injection**: Prevented via parameterized queries (using `pg` library)
- **Rate Limiting**: Should be implemented at the API gateway level

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Application environment | Yes |
| `PORT` | Server port | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |

## Testing

Tests are written using **Vitest**. The architecture makes testing easy:

- Unit test domain entities in isolation
- Unit test use cases with mock repositories
- Integration test HTTP controllers
- End-to-end test API routes

Run tests:
```bash
npm run test        # Run once
npm run test:watch  # Watch mode
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linter and tests (`npm run lint && npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Express](https://expressjs.com/)
- Database powered by [Supabase](https://supabase.com/) (PostgreSQL)
- TypeScript for type safety
- Clean Architecture principles by Robert C. Martin

---

Copyright (c) 2026 Jeremiah Carlton
