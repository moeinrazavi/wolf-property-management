-- Fix Team Members Database Schema
-- Run this in your Supabase SQL Editor to fix the "value too long for type character varying(255)" error

-- Update existing table columns to handle longer content
-- Please run each ALTER statement one by one if you encounter issues.
ALTER TABLE team_members ALTER COLUMN name TYPE VARCHAR(500);
ALTER TABLE team_members ALTER COLUMN position TYPE VARCHAR(500);
ALTER TABLE team_members ALTER COLUMN image_filename TYPE VARCHAR(500);
ALTER TABLE team_members ALTER COLUMN linkedin_url TYPE TEXT;
ALTER TABLE team_members ALTER COLUMN email TYPE TEXT;
ALTER TABLE team_members ALTER COLUMN page_name TYPE VARCHAR(200);

-- Verify the changes have been applied
SELECT 
    column_name,
    data_type,
    character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'team_members' 
ORDER BY ordinal_position; 