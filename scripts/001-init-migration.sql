-- CryoVault Initial Migration
-- PostgreSQL Database Setup

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('MANAGER', 'AUDITOR');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');
CREATE TYPE temp_status AS ENUM ('NORMAL', 'WARNING', 'CRITICAL');
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED');
CREATE TYPE priority AS ENUM ('STANDARD', 'PRIORITY', 'EMERGENCY');

-- Users table
CREATE TABLE users (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'MANAGER',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Slots table
CREATE TABLE slots (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(50) NOT NULL UNIQUE,
    status slot_status NOT NULL DEFAULT 'AVAILABLE',
    temp_status temp_status NOT NULL DEFAULT 'NORMAL',
    temperature DECIMAL(5,2) NOT NULL DEFAULT -70.0,
    target_temp DECIMAL(5,2) NOT NULL DEFAULT -70.0,
    last_maintenance TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slots_status ON slots(status);
CREATE INDEX idx_slots_temp_status ON slots(temp_status);

-- Reservations table
CREATE TABLE reservations (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slot_id VARCHAR(30) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status reservation_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_slot_status ON reservations(slot_id, status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);

-- Partial unique index: Only one PENDING reservation per slot (concurrency control)
CREATE UNIQUE INDEX idx_reservations_pending_unique 
ON reservations(slot_id) 
WHERE status = 'PENDING';

-- Bookings table
CREATE TABLE bookings (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slot_id VARCHAR(30) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reservation_id VARCHAR(30) UNIQUE REFERENCES reservations(id) ON DELETE SET NULL,
    manifest_id VARCHAR(100) NOT NULL,
    priority priority NOT NULL DEFAULT 'STANDARD',
    vaccine_type VARCHAR(255),
    batch_number VARCHAR(100),
    quantity INTEGER,
    confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_manifest_id ON bookings(manifest_id);

-- Ledger table (blockchain audit trail)
CREATE TABLE ledger (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    booking_id VARCHAR(30) NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    previous_hash VARCHAR(64) NOT NULL,
    data_hash VARCHAR(64) NOT NULL,
    nonce INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    slot_name VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_timestamp ON ledger(timestamp);
CREATE INDEX idx_ledger_data_hash ON ledger(data_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slots_updated_at
    BEFORE UPDATE ON slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
