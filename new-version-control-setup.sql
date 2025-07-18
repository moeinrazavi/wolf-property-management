-- New Version Control System Database Setup
-- Run this script in your Supabase SQL Editor to set up the robust version control system

-- Drop the old version_history table and create the new website_states table
DROP TABLE IF EXISTS version_history;

-- Create the new website_states table for complete state snapshots
CREATE TABLE website_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    description TEXT,
    complete_state JSONB NOT NULL,
    state_hash VARCHAR(64) NOT NULL,
    page_context VARCHAR(100),
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    is_temporary BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_website_states_version ON website_states(version_number);
CREATE INDEX idx_website_states_page ON website_states(page_context);
CREATE INDEX idx_website_states_temp ON website_states(is_temporary);
CREATE INDEX idx_website_states_hash ON website_states(state_hash);
CREATE INDEX idx_website_states_created ON website_states(created_at);

-- Add unique constraint
ALTER TABLE website_states ADD CONSTRAINT unique_version_page UNIQUE(version_number, page_context); 