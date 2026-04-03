-- Create the temp_clients_am_mapping table to store AM assignments made during discovery
-- This ensures that when a client is eventually onboarded, they stay with the same AM.

CREATE TABLE IF NOT EXISTS temp_clients_am_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applywizz_id TEXT UNIQUE NOT NULL,
    email TEXT,
    am_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_temp_mapping_applywizz_id ON temp_clients_am_mapping(applywizz_id);
CREATE INDEX IF NOT EXISTS idx_temp_mapping_email ON temp_clients_am_mapping(email);
