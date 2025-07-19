-- Fix Version Control Restore Compatibility
-- Run this script in your Supabase SQL Editor to fix restore errors

-- Ensure content_versions table exists with minimal structure
CREATE TABLE IF NOT EXISTS content_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number INTEGER NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    description TEXT,
    version_type VARCHAR(20) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_content_versions_page_version 
ON content_versions(page_name, version_number DESC);

-- Ensure a basic version exists for each page if none exist
INSERT INTO content_versions (version_number, page_name, description, version_type)
SELECT 1, 'index.html', 'Initial version', 'auto'
WHERE NOT EXISTS (
    SELECT 1 FROM content_versions WHERE page_name = 'index.html'
);

INSERT INTO content_versions (version_number, page_name, description, version_type)
SELECT 1, 'about.html', 'Initial version', 'auto'
WHERE NOT EXISTS (
    SELECT 1 FROM content_versions WHERE page_name = 'about.html'
);

-- Verify setup
SELECT 'Version control compatibility fix completed!' as status;
SELECT page_name, COUNT(*) as version_count 
FROM content_versions 
GROUP BY page_name; 