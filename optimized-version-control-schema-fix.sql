-- Fixed Optimized Version Control Database Schema
-- This fixes the NULL content issue and provides proper fallbacks

-- ================================
-- 1. UPDATED STORED PROCEDURES (FIXED)
-- ================================

-- Fixed function to get content at specific version (handles empty content)
CREATE OR REPLACE FUNCTION get_content_at_version(target_version INTEGER, target_page VARCHAR(100))
RETURNS TABLE(element_id VARCHAR(255), content_value TEXT, content_type VARCHAR(50)) AS $$
BEGIN
    -- First, try to get from snapshot cache
    IF EXISTS (SELECT 1 FROM content_snapshots WHERE version_number = target_version AND page_name = target_page) THEN
        RETURN QUERY
        SELECT 
            key as element_id,
            value::text as content_value,
            'text' as content_type
        FROM content_snapshots cs,
        jsonb_each_text(cs.complete_content)
        WHERE cs.version_number = target_version AND cs.page_name = target_page;
        RETURN;
    END IF;
    
    -- Check if any versions exist for this page
    IF NOT EXISTS (SELECT 1 FROM content_versions WHERE page_name = target_page AND is_active = true) THEN
        -- No versions exist, get current content from website_content table
        RETURN QUERY
        SELECT 
            wc.element_id,
            wc.content_text as content_value,
            wc.content_type
        FROM website_content wc
        WHERE wc.page_name = target_page AND wc.is_active = true;
        RETURN;
    END IF;
    
    -- Build from changes (slower but accurate)
    RETURN QUERY
    WITH version_changes AS (
        SELECT DISTINCT ON (cc.element_id)
            cc.element_id,
            cc.new_value,
            cc.content_type
        FROM content_changes cc
        JOIN content_versions cv ON cc.version_id = cv.id
        WHERE cv.version_number <= target_version 
        AND cv.page_name = target_page
        AND cv.is_active = true
        AND cc.change_type != 'delete'
        ORDER BY cc.element_id, cv.version_number DESC
    )
    SELECT vc.element_id, vc.new_value as content_value, vc.content_type
    FROM version_changes vc
    
    UNION ALL
    
    -- Include current content that hasn't been changed yet
    SELECT 
        wc.element_id,
        wc.content_text as content_value,
        wc.content_type
    FROM website_content wc
    WHERE wc.page_name = target_page 
    AND wc.is_active = true
    AND wc.element_id NOT IN (
        SELECT DISTINCT cc.element_id
        FROM content_changes cc
        JOIN content_versions cv ON cc.version_id = cv.id
        WHERE cv.version_number <= target_version 
        AND cv.page_name = target_page
        AND cv.is_active = true
    );
END;
$$ LANGUAGE plpgsql;

-- Fixed function to create efficient snapshots (handles NULL content)
CREATE OR REPLACE FUNCTION create_content_snapshot(target_version INTEGER, target_page VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    content_json JSONB;
    content_count INTEGER;
BEGIN
    -- Build complete content JSON from changes
    SELECT jsonb_object_agg(element_id, content_value), COUNT(*)
    INTO content_json, content_count
    FROM get_content_at_version(target_version, target_page);
    
    -- Handle case where no content exists (provide empty JSON object)
    IF content_json IS NULL OR content_count = 0 THEN
        content_json := '{}'::jsonb;
    END IF;
    
    -- Insert snapshot
    INSERT INTO content_snapshots (version_number, page_name, complete_content, content_hash, is_checkpoint)
    VALUES (
        target_version, 
        target_page, 
        content_json, 
        encode(digest(content_json::text, 'sha256'), 'hex'),
        target_version % 10 = 0 -- Mark every 10th version as checkpoint
    )
    ON CONFLICT (version_number, page_name) DO UPDATE SET
        complete_content = EXCLUDED.complete_content,
        content_hash = EXCLUDED.content_hash;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fixed auto-create snapshot trigger (with error handling)
CREATE OR REPLACE FUNCTION auto_create_snapshot() RETURNS TRIGGER AS $$
BEGIN
    -- Only create snapshots for certain conditions and handle errors gracefully
    BEGIN
        IF NEW.version_number % 5 = 0 OR 
           (NEW.change_summary->>'major_change')::boolean = true THEN
            PERFORM create_content_snapshot(NEW.version_number, NEW.page_name);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the insert
        RAISE WARNING 'Failed to create snapshot for version % on page %: %', NEW.version_number, NEW.page_name, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 2. INITIALIZATION FIXES
-- ================================

-- Create initial snapshots for existing content
DO $$
DECLARE
    page_name VARCHAR(100);
BEGIN
    -- Create snapshots for each page with existing content
    FOR page_name IN SELECT DISTINCT wc.page_name FROM website_content wc WHERE wc.is_active = true
    LOOP
        -- Create snapshot for version 0 (initial state)
        PERFORM create_content_snapshot(0, page_name);
    END LOOP;
    
    -- Also create for standard pages even if no content exists yet
    PERFORM create_content_snapshot(0, 'index.html');
    PERFORM create_content_snapshot(0, 'about.html');
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create initial snapshots: %', SQLERRM;
END;
$$;

-- ================================
-- 3. HELPER FUNCTIONS FOR MIGRATION
-- ================================

-- Function to migrate existing version_history data (if it exists)
CREATE OR REPLACE FUNCTION migrate_existing_version_data()
RETURNS TEXT AS $$
DECLARE
    rec RECORD;
    result_msg TEXT := '';
    migrated_count INTEGER := 0;
BEGIN
    -- Check if old version_history table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'version_history') THEN
        result_msg := 'Found existing version_history table. Migrating data...' || chr(10);
        
        -- Migrate existing version history to new format
        FOR rec IN 
            SELECT version_number, description, changes, created_at, created_by
            FROM version_history 
            ORDER BY version_number
        LOOP
            -- Insert into new content_versions table
            INSERT INTO content_versions (
                version_number, 
                page_name, 
                description, 
                version_type, 
                change_summary,
                created_by,
                created_at
            ) VALUES (
                rec.version_number,
                'index.html', -- Assume old versions were for index.html
                rec.description,
                'manual',
                jsonb_build_object('migrated', true, 'change_count', jsonb_array_length(rec.changes::jsonb)),
                rec.created_by,
                rec.created_at
            ) ON CONFLICT (version_number, page_name) DO NOTHING;
            
            migrated_count := migrated_count + 1;
        END LOOP;
        
        result_msg := result_msg || 'Migrated ' || migrated_count || ' versions successfully.' || chr(10);
        result_msg := result_msg || 'Old version_history table can be safely dropped if migration looks good.';
    ELSE
        result_msg := 'No existing version_history table found. Clean installation.';
    END IF;
    
    RETURN result_msg;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 4. DIAGNOSTIC FUNCTIONS
-- ================================

-- Function to check system health
CREATE OR REPLACE FUNCTION check_version_control_health()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check table existence
    RETURN QUERY
    SELECT 
        'Tables Exist'::TEXT,
        CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'ERROR' END::TEXT,
        'Found ' || COUNT(*) || ' of 4 required tables'::TEXT
    FROM information_schema.tables 
    WHERE table_name IN ('content_versions', 'content_changes', 'team_member_changes', 'content_snapshots');
    
    -- Check for content
    RETURN QUERY
    SELECT 
        'Content Versions'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Found ' || COUNT(*) || ' content versions'::TEXT
    FROM content_versions WHERE is_active = true;
    
    -- Check for snapshots
    RETURN QUERY
    SELECT 
        'Content Snapshots'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Found ' || COUNT(*) || ' cached snapshots'::TEXT
    FROM content_snapshots;
    
    -- Check functions
    RETURN QUERY
    SELECT 
        'Functions Exist'::TEXT,
        CASE WHEN COUNT(*) >= 3 THEN 'OK' ELSE 'ERROR' END::TEXT,
        'Found ' || COUNT(*) || ' version control functions'::TEXT
    FROM information_schema.routines 
    WHERE routine_name IN ('get_content_at_version', 'create_content_snapshot', 'cleanup_old_versions');
    
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 5. RUN MIGRATION AND HEALTH CHECK
-- ================================

-- Run the migration (if needed)
SELECT migrate_existing_version_data();

-- Check system health
SELECT * FROM check_version_control_health();

-- ================================
-- INSTALLATION COMPLETE MESSAGE
-- ================================

DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'OPTIMIZED VERSION CONTROL SCHEMA INSTALLED';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed Issues:';
    RAISE NOTICE '✅ NULL content handling in snapshots';
    RAISE NOTICE '✅ Empty content graceful fallbacks';
    RAISE NOTICE '✅ Error handling in triggers';
    RAISE NOTICE '✅ Migration from old version_history';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Check health status above';
    RAISE NOTICE '2. Test snapshot creation';
    RAISE NOTICE '3. Update your application code';
    RAISE NOTICE '';
    RAISE NOTICE 'Troubleshooting:';
    RAISE NOTICE 'Run: SELECT * FROM check_version_control_health();';
    RAISE NOTICE '===============================================';
END;
$$; 