-- CLEANUP DUPLICATE TEAM MEMBERS
-- This script fixes the database corruption caused by the version control restore function
-- which was creating duplicate team members instead of updating existing ones.

-- Step 1: Identify and log duplicate team members
SELECT 
    'BEFORE CLEANUP - Duplicate team members found:' as info,
    name, 
    page_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as all_ids
FROM team_members 
WHERE page_name = 'about.html' 
    AND is_active = true
GROUP BY name, page_name 
HAVING COUNT(*) > 1;

-- Step 2: Keep only the most recent version of each team member and deactivate the rest
WITH latest_team_members AS (
    SELECT 
        name,
        page_name,
        MAX(updated_at) as latest_updated_at
    FROM team_members 
    WHERE page_name = 'about.html' 
        AND is_active = true
    GROUP BY name, page_name
),
members_to_keep AS (
    SELECT DISTINCT tm.id
    FROM team_members tm
    INNER JOIN latest_team_members ltm ON 
        tm.name = ltm.name 
        AND tm.page_name = ltm.page_name 
        AND tm.updated_at = ltm.latest_updated_at
    WHERE tm.page_name = 'about.html' 
        AND tm.is_active = true
)
UPDATE team_members 
SET is_active = false, 
    updated_at = NOW()
WHERE page_name = 'about.html' 
    AND is_active = true 
    AND id NOT IN (SELECT id FROM members_to_keep);

-- Step 3: Verify cleanup - should show no duplicates
SELECT 
    'AFTER CLEANUP - Active team members:' as info,
    name, 
    page_name,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as ids
FROM team_members 
WHERE page_name = 'about.html' 
    AND is_active = true
GROUP BY name, page_name 
ORDER BY name;

-- Step 4: Show total cleanup summary
SELECT 
    'CLEANUP SUMMARY:' as info,
    (SELECT COUNT(*) FROM team_members WHERE page_name = 'about.html' AND is_active = true) as active_members,
    (SELECT COUNT(*) FROM team_members WHERE page_name = 'about.html' AND is_active = false) as inactive_duplicates,
    COUNT(*) as total_records
FROM team_members 
WHERE page_name = 'about.html';

-- Optional: Delete the inactive duplicates completely (uncomment if desired)
-- DELETE FROM team_members 
-- WHERE page_name = 'about.html' 
--     AND is_active = false;

SELECT 'Database cleanup completed! Please refresh the about page to see the results.' as completion_message; 