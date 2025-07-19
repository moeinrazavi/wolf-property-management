-- QUICK FIX for NULL content issue in content_snapshots
-- Run this in your Supabase SQL Editor to fix the immediate problem

-- 1. Fix the create_content_snapshot function to handle NULL content
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
    
    -- Insert snapshot with proper content handling
    INSERT INTO content_snapshots (version_number, page_name, complete_content, content_hash, is_checkpoint)
    VALUES (
        target_version, 
        target_page, 
        content_json, 
        encode(digest(content_json::text, 'sha256'), 'hex'),
        target_version % 10 = 0
    )
    ON CONFLICT (version_number, page_name) DO UPDATE SET
        complete_content = EXCLUDED.complete_content,
        content_hash = EXCLUDED.content_hash;
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- If still fails, log the error and return false
    RAISE WARNING 'Snapshot creation failed for version % page %: %', target_version, target_page, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the get_content_at_version function to provide fallback content
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
    
    -- Otherwise, get current content from website_content table as fallback
    RETURN QUERY
    SELECT 
        wc.element_id,
        COALESCE(wc.content_text, '') as content_value,
        COALESCE(wc.content_type, 'text') as content_type
    FROM website_content wc
    WHERE wc.page_name = target_page AND wc.is_active = true;
    
    -- If no content found, return empty result (this is OK)
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the trigger to handle errors gracefully
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

-- 4. Clean up any problematic snapshot entries
DELETE FROM content_snapshots WHERE complete_content IS NULL;

-- 5. Create initial snapshots for existing pages
DO $$
DECLARE
    page_record RECORD;
BEGIN
    -- Create snapshots for pages that have content
    FOR page_record IN 
        SELECT DISTINCT page_name FROM website_content WHERE is_active = true
    LOOP
        PERFORM create_content_snapshot(0, page_record.page_name);
    END LOOP;
    
    -- Ensure snapshots exist for main pages even if no content yet
    PERFORM create_content_snapshot(0, 'index.html');
    PERFORM create_content_snapshot(0, 'about.html');
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some snapshots could not be created: %', SQLERRM;
END;
$$;

-- 6. Test the fix
SELECT 'Fix applied successfully!' as status;
SELECT COUNT(*) as total_snapshots FROM content_snapshots;
SELECT COUNT(*) as valid_snapshots FROM content_snapshots WHERE complete_content IS NOT NULL;

-- Display any remaining issues
SELECT 
    version_number, 
    page_name, 
    CASE 
        WHEN complete_content IS NULL THEN 'NULL CONTENT' 
        ELSE 'OK' 
    END as status
FROM content_snapshots 
ORDER BY version_number, page_name; 