-- Debug Team Members Table Schema
-- Run this in Supabase SQL Editor to check current column types and limits

-- Check current table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_members' 
ORDER BY ordinal_position;

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'team_members'
) as table_exists;

-- Sample a few records to see current data
SELECT 
    id,
    name,
    LENGTH(name) as name_length,
    position,
    LENGTH(position) as position_length,
    LENGTH(bio) as bio_length,
    page_name,
    LENGTH(page_name) as page_name_length
FROM team_members 
LIMIT 3; 