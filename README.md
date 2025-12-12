# CryoVault Backend Server

Production-ready Express + Socket.io + Prisma backend for the CryoVault vaccine cold chain management system.

## Architecture

- **Express.js** - REST API server
- **Socket.io** - Real-time bidirectional communication
- **Prisma** - Type-safe ORM for PostgreSQL
- **node-cron** - Scheduled cleanup jobs

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Render, Supabase, etc.)

## Setup

1. **Install dependencies:**
   \`\`\`bash
   cd server
   npm install
   \`\`\`

2. **Configure environment:**
   Create a `.env` file:
   \`\`\`env
   DATABASE_URL="postgresql://user:password@host:5432/cryovault"
   CLIENT_URL="http://localhost:3000"
   PORT=4000
   HMAC_SECRET="your-secure-secret-key"
   \`\`\`

3. **Generate Prisma client:**
   \`\`\`bash
   npm run db:generate
   \`\`\`

4. **Run migrations:**
   \`\`\`bash
   # Apply migrations
   npm run db:push
   
   # Or use raw SQL
   psql $DATABASE_URL < ../scripts/001-init-migration.sql
   \`\`\`

5. **Seed database:**
   \`\`\`bash
   npm run db:seed
   \`\`\`

6. **Start server:**
   \`\`\`bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   \`\`\`

## API Endpoints

### Slots

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/slots` | Get all slots with status |
| GET | `/api/slots/:id` | Get single slot details |

### Reservations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hold` | Create 2-min reservation |
| POST | `/api/book` | Confirm booking |

### Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ledger` | Last 10 ledger entries |
| GET | `/api/ledger/verify` | Verify chain integrity |

### Simulation (Demo)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulate/traffic` | Randomize slot statuses |
| POST | `/api/simulate/failure` | Create temp failure |

## Socket.io Events

### Server → Client

- `slot_update` - Slot status/temp change
- `ledger_update` - New ledger entry
- `reservation_expired` - Reservation timeout

### Client → Server

- `join` - Join room for updates

## Concurrency Control

The system uses Prisma transactions and a partial unique index to prevent race conditions:

\`\`\`sql
CREATE UNIQUE INDEX idx_reservations_pending_unique 
ON reservations(slot_id) 
WHERE status = 'PENDING';
\`\`\`

This ensures only one pending reservation can exist per slot.

## Ledger Integrity

The blockchain-style ledger uses HMAC SHA-256 hashing:

1. Each entry contains `previousHash` linking to prior entry
2. `dataHash` is generated from booking data + previousHash
3. `nonce` provides proof-of-work (simplified)
4. Chain integrity can be verified via `/api/ledger/verify`

## Deployment

### Render

1. Create a new Web Service
2. Set build command: `npm install && npm run build`
3. Set start command: `npm start`
4. Add environment variables

### Railway

1. Connect GitHub repo
2. Set `server` as root directory
3. Add PostgreSQL plugin
4. Configure environment variables
