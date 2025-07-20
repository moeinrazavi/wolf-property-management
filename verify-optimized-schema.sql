-- Verification Script for Optimized Version Control Schema
-- Run this in Supabase SQL Editor to check if the optimized schema is properly set up

-- Check if optimized tables exist
SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All optimized tables exist'
        ELSE '❌ Missing optimized tables: ' || (4 - COUNT(*))::text || ' tables missing'
    END as table_status,
    string_agg(table_name, ', ') as existing_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('content_versions', 'content_changes', 'team_member_changes', 'content_snapshots');

-- Check if required functions exist
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ All required functions exist'
        ELSE '❌ Missing functions: ' || (3 - COUNT(*))::text || ' functions missing'
    END as function_status,
    string_agg(routine_name, ', ') as existing_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_content_snapshot', 'get_content_at_version', 'cleanup_old_versions');

-- Check if old tables exist (should be removed)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Old tables properly removed'
        ELSE '⚠️ Old tables still exist: ' || string_agg(table_name, ', ')
    END as cleanup_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('website_states', 'version_history');

-- Test basic functionality
SELECT 'Testing basic website_content access...' as test;

-- Check if website_content table exists and has data
SELECT 
    COUNT(*) as content_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Website content exists'
        ELSE '❌ No website content found'
    END as content_status
FROM website_content 
WHERE is_active = true;

-- Check initial versions setup
SELECT 
    COUNT(*) as version_count,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ Initial versions created'
        ELSE '❌ Initial versions missing'
    END as version_status
FROM content_versions 
WHERE version_type = 'manual' AND version_number = 0;

-- Overall system status
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('content_versions', 'content_changes', 'team_member_changes', 'content_snapshots')
        ) = 4 
        AND (
            SELECT COUNT(*) FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('create_content_snapshot', 'get_content_at_version', 'cleanup_old_versions')
        ) >= 3
        THEN '🚀 OPTIMIZED SCHEMA READY - Your version control system should work perfectly!'
        ELSE '❌ SCHEMA INCOMPLETE - Please run the complete optimized schema SQL'
    END as overall_status;

-- Instructions if schema is incomplete
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('content_versions', 'content_changes', 'team_member_changes', 'content_snapshots')
        ) < 4 
        THEN 'ACTION NEEDED: Run the complete optimized schema SQL that was provided earlier'
        ELSE 'No action needed - schema is complete'
    END as action_required; 