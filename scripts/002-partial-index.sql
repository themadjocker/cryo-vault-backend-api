-- Migration: Add partial unique index for PENDING reservations
-- This ensures only ONE pending reservation can exist per slot at a time
-- Prevents race conditions in concurrent booking scenarios

-- Drop existing index if it exists (idempotent)
DROP INDEX IF EXISTS idx_reservations_slot_pending;

-- Create partial unique index on slot_id WHERE status = 'PENDING'
CREATE UNIQUE INDEX idx_reservations_slot_pending 
ON reservations (slot_id) 
WHERE status = 'PENDING';

-- Add comment for documentation
COMMENT ON INDEX idx_reservations_slot_pending IS 
  'Ensures atomic slot reservation - only one PENDING reservation per slot allowed';
