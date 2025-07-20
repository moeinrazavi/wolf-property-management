-- Optimized Version Control Database Schema
-- This schema implements differential versioning for maximum efficiency and speed
-- Similar to WordPress revisions, it stores only what changed between versions

-- ================================
-- 1. MAIN VERSION TRACKING TABLE
-- ================================

-- Drop old inefficient tables
DROP TABLE IF EXISTS website_states;
DROP TABLE IF EXISTS version_history;

-- Create efficient version tracking table
CREATE TABLE content_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    description TEXT,
    version_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'auto', 'restore'
    change_summary JSONB, -- Brief summary of what changed
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    parent_version INTEGER, -- For tracking version lineage
    is_active BOOLEAN DEFAULT true,
    
    -- Performance indexes
    CONSTRAINT unique_version_page UNIQUE(version_number, page_name)
);

-- ================================
-- 2. DIFFERENTIAL CHANGE TRACKING
-- ================================

-- Track individual element changes (like WordPress post revisions)
CREATE TABLE content_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_id UUID REFERENCES content_versions(id) ON DELETE CASCADE,
    element_id VARCHAR(255) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    old_value TEXT, -- Previous content (null for create)
    new_value TEXT, -- New content (null for delete)
    content_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB -- Additional metadata about the change
);

-- Track team member changes separately for efficiency
CREATE TABLE team_member_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_id UUID REFERENCES content_versions(id) ON DELETE CASCADE,
    member_id UUID,
    change_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    field_name VARCHAR(100), -- 'name', 'title', 'image_url', 'bio', etc.
    old_value TEXT,
    new_value TEXT
);

-- Create indexes separately for better compatibility
CREATE INDEX idx_content_changes_version_element ON content_changes(version_id, element_id);
CREATE INDEX idx_content_changes_element ON content_changes(element_id, version_id);
CREATE INDEX idx_team_changes_version_member ON team_member_changes(version_id, member_id);
CREATE INDEX idx_team_changes_member ON team_member_changes(member_id, version_id);

-- ================================
-- 3. FAST RESTORATION CACHE
-- ================================

-- Cache complete content state at key versions for instant restoration
CREATE TABLE content_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    complete_content JSONB NOT NULL, -- Full content at this version
    content_hash VARCHAR(64) NOT NULL, -- For change detection
    created_at TIMESTAMP DEFAULT NOW(),
    is_checkpoint BOOLEAN DEFAULT false, -- Major milestone versions
    
    -- Unique constraint
    CONSTRAINT unique_snapshot_version UNIQUE(version_number, page_name)
);

-- Create indexes for content_snapshots separately
CREATE INDEX idx_content_snapshots_page ON content_snapshots(page_name, version_number DESC);
CREATE INDEX idx_content_snapshots_hash ON content_snapshots(content_hash);

-- ================================
-- 4. PERFORMANCE INDEXES
-- ================================

-- Optimized indexes for fast queries
CREATE INDEX idx_content_versions_page_version ON content_versions(page_name, version_number DESC);
CREATE INDEX idx_content_versions_active ON content_versions(is_active, created_at DESC);
CREATE INDEX idx_content_versions_type ON content_versions(version_type, created_at DESC);

CREATE INDEX idx_content_changes_type ON content_changes(change_type, version_id);
CREATE INDEX idx_team_changes_type ON team_member_changes(change_type, version_id);

-- ================================
-- 5. EFFICIENT RESTORATION VIEWS
-- ================================

-- View for getting latest changes efficiently
DROP VIEW IF EXISTS latest_content_changes;
CREATE VIEW latest_content_changes AS
SELECT DISTINCT ON (cc.element_id) 
    cc.element_id,
    cc.new_value as current_value,
    cc.content_type,
    cv.version_number,
    cv.created_at
FROM content_changes cc
JOIN content_versions cv ON cc.version_id = cv.id
WHERE cv.is_active = true
ORDER BY cc.element_id, cv.version_number DESC;

-- View for getting version summaries
DROP VIEW IF EXISTS version_summaries;
CREATE VIEW version_summaries AS
SELECT 
    cv.version_number,
    cv.page_name,
    cv.description,
    cv.created_at,
    cv.version_type,
    COUNT(cc.id) as content_changes_count,
    COUNT(tmc.id) as team_changes_count
FROM content_versions cv
LEFT JOIN content_changes cc ON cv.id = cc.version_id
LEFT JOIN team_member_changes tmc ON cv.id = tmc.version_id
WHERE cv.is_active = true
GROUP BY cv.id, cv.version_number, cv.page_name, cv.description, cv.created_at, cv.version_type
ORDER BY cv.version_number DESC;

-- ================================
-- 6. STORED PROCEDURES FOR FAST OPERATIONS
-- ================================

-- Function to get content at specific version (fast restoration)
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
    
    -- Otherwise, build from changes (slower but accurate)
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
    FROM version_changes vc;
END;
$$ LANGUAGE plpgsql;

-- Function to create efficient snapshots
CREATE OR REPLACE FUNCTION create_content_snapshot(target_version INTEGER, target_page VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    content_json JSONB;
BEGIN
    -- Build complete content JSON from changes
    SELECT jsonb_object_agg(element_id, content_value)
    INTO content_json
    FROM get_content_at_version(target_version, target_page);
    
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

-- ================================
-- 7. AUTOMATIC MAINTENANCE
-- ================================

-- Function to clean up old versions (keep last N versions)
CREATE OR REPLACE FUNCTION cleanup_old_versions(keep_count INTEGER DEFAULT 50)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old versions beyond keep_count, but preserve checkpoints
    WITH versions_to_delete AS (
        SELECT id FROM content_versions
        WHERE is_active = true
        AND version_number NOT IN (
            SELECT version_number 
            FROM content_versions 
            WHERE is_active = true 
            ORDER BY version_number DESC 
            LIMIT keep_count
        )
        AND version_number NOT IN (
            SELECT version_number 
            FROM content_snapshots 
            WHERE is_checkpoint = true
        )
    )
    DELETE FROM content_versions WHERE id IN (SELECT id FROM versions_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up orphaned snapshots
    DELETE FROM content_snapshots 
    WHERE version_number NOT IN (
        SELECT version_number FROM content_versions WHERE is_active = true
    )
    AND is_checkpoint = false;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 8. TRIGGERS FOR AUTOMATIC SNAPSHOTS
-- ================================

-- Create snapshots automatically for major versions
CREATE OR REPLACE FUNCTION auto_create_snapshot() RETURNS TRIGGER AS $$
BEGIN
    -- Create snapshot for every 5th version or major changes
    IF NEW.version_number % 5 = 0 OR 
       (NEW.change_summary->>'major_change')::boolean = true THEN
        PERFORM create_content_snapshot(NEW.version_number, NEW.page_name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_snapshot
    AFTER INSERT ON content_versions
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_snapshot();

-- ================================
-- 9. INITIAL DATA AND CONFIGURATION
-- ================================

-- Set up initial configuration
INSERT INTO content_versions (version_number, page_name, description, version_type, change_summary)
VALUES 
    (0, 'index.html', 'Initial version', 'manual', '{"change_count": 0, "initial_setup": true}'),
    (0, 'about.html', 'Initial version', 'manual', '{"change_count": 0, "initial_setup": true}')
ON CONFLICT (version_number, page_name) DO NOTHING;

-- ================================
-- 10. PERFORMANCE MONITORING
-- ================================

-- View for monitoring system performance
CREATE OR REPLACE VIEW version_control_stats AS
SELECT 
    'Total Versions' as metric,
    COUNT(*)::text as value
FROM content_versions WHERE is_active = true

UNION ALL

SELECT 
    'Total Changes' as metric,
    COUNT(*)::text as value
FROM content_changes

UNION ALL

SELECT 
    'Cached Snapshots' as metric,
    COUNT(*)::text as value
FROM content_snapshots

UNION ALL

SELECT 
    'Average Changes per Version' as metric,
    ROUND(AVG(change_count), 2)::text as value
FROM (
    SELECT COUNT(cc.id) as change_count
    FROM content_versions cv
    LEFT JOIN content_changes cc ON cv.id = cc.version_id
    WHERE cv.is_active = true
    GROUP BY cv.id
) stats;

-- ================================
-- SCHEMA OPTIMIZATION COMPLETE
-- ================================

-- Grant permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON content_versions, content_changes, team_member_changes TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable Row Level Security (optional, for additional security)
-- ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE content_changes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_member_changes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE content_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies if RLS is enabled
-- CREATE POLICY "Allow authenticated users" ON content_versions FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated users" ON content_changes FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated users" ON team_member_changes FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated users" ON content_snapshots FOR ALL TO authenticated USING (true);

COMMENT ON TABLE content_versions IS 'Efficient version tracking with differential changes';
COMMENT ON TABLE content_changes IS 'Individual element changes for precise version control';
COMMENT ON TABLE team_member_changes IS 'Team member specific changes for efficient restoration';
COMMENT ON TABLE content_snapshots IS 'Cached complete states for instant restoration';
COMMENT ON FUNCTION get_content_at_version IS 'Fast content retrieval for any version';
COMMENT ON FUNCTION create_content_snapshot IS 'Create cached snapshots for performance';
COMMENT ON FUNCTION cleanup_old_versions IS 'Maintain optimal database size'; 