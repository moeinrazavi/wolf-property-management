/**
 * Debug Version Control System
 * Run this in browser console to diagnose issues
 */

// Debug function to check version control system status
window.debugVersionControl = async function() {
    console.log('🔍 Debug Version Control System');
    console.log('=====================================');
    
    // 1. Check if modules are loaded
    console.log('📦 Checking module availability...');
    console.log('- adminVersionControlUI:', typeof window.adminVersionControlUI !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- aboutAdminManager:', typeof window.aboutAdminManager !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log('- dbService:', typeof window.dbService !== 'undefined' ? '✅ Available' : '❌ Missing');
    
    // 2. Check if admin is logged in
    console.log('\n🔐 Checking admin login status...');
    if (typeof window.dbService !== 'undefined') {
        console.log('- Admin authenticated:', window.dbService.isAuthenticated() ? '✅ Yes' : '❌ No');
        console.log('- Current user:', window.dbService.currentUser || 'None');
    }
    
    // 3. Check database connection
    console.log('\n🗄️ Checking database connection...');
    try {
        if (typeof window.dbService !== 'undefined' && window.dbService.supabase) {
            // Test basic connection
            const { data, error } = await window.dbService.supabase
                .from('admin_users')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                console.log('❌ Database connection error:', error);
            } else {
                console.log('✅ Database connection successful');
            }
        } else {
            console.log('❌ Database service not available');
        }
    } catch (error) {
        console.log('❌ Database test failed:', error);
    }
    
    // 4. Check if website_states table exists
    console.log('\n📋 Checking website_states table...');
    try {
        if (typeof window.dbService !== 'undefined' && window.dbService.supabase) {
            const { data, error } = await window.dbService.supabase
                .from('website_states')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                console.log('❌ website_states table missing or inaccessible:', error);
                console.log('📝 You need to run the database setup script:');
                console.log(`
-- Run this in Supabase SQL Editor:
DROP TABLE IF EXISTS version_history;

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

CREATE INDEX idx_website_states_version ON website_states(version_number);
CREATE INDEX idx_website_states_page ON website_states(page_context);
CREATE INDEX idx_website_states_temp ON website_states(is_temporary);
CREATE INDEX idx_website_states_hash ON website_states(state_hash);
CREATE INDEX idx_website_states_created ON website_states(created_at);

ALTER TABLE website_states ADD CONSTRAINT unique_version_page UNIQUE(version_number, page_context);
                `);
            } else {
                console.log('✅ website_states table exists');
                console.log('- Row count:', data);
            }
        }
    } catch (error) {
        console.log('❌ Table check failed:', error);
    }
    
    // 5. Check version control manager status
    console.log('\n🔄 Checking version control manager...');
    try {
        if (typeof window.adminVersionControlUI !== 'undefined') {
            const versionControlManager = window.adminVersionControlUI.getVersionControlManager();
            if (versionControlManager) {
                console.log('✅ Version control manager available');
                console.log('- Initialized:', versionControlManager.isInitialized ? '✅ Yes' : '❌ No');
                console.log('- Has changes:', versionControlManager.hasChanges() ? '✅ Yes' : '❌ No');
                console.log('- Current version:', versionControlManager.getCurrentVersion());
                console.log('- Version history count:', versionControlManager.getVersionHistory().length);
            } else {
                console.log('❌ Version control manager not available');
            }
        } else {
            console.log('❌ Admin version control UI not available');
        }
    } catch (error) {
        console.log('❌ Version control manager check failed:', error);
    }
    
    // 6. Check current page elements
    console.log('\n📄 Checking current page elements...');
    const editableElements = document.querySelectorAll('.editable-text');
    const adminControls = document.querySelector('.admin-controls');
    const versionControlUI = document.getElementById('version-control-ui');
    
    console.log('- Editable elements:', editableElements.length);
    console.log('- Admin controls visible:', adminControls && adminControls.style.display !== 'none' ? '✅ Yes' : '❌ No');
    console.log('- Version control UI present:', versionControlUI ? '✅ Yes' : '❌ No');
    
    // 7. Test save functionality
    console.log('\n💾 Testing save functionality...');
    if (typeof window.adminVersionControlUI !== 'undefined' && window.adminVersionControlUI.isReady()) {
        try {
            const versionControlManager = window.adminVersionControlUI.getVersionControlManager();
            console.log('✅ Version control ready for testing');
            console.log('💡 To test save, make a change and press the Save Changes button');
        } catch (error) {
            console.log('❌ Save test failed:', error);
        }
    } else {
        console.log('❌ Version control not ready for testing');
    }
    
    console.log('\n🏁 Debug complete!');
    console.log('=====================================');
};

// Auto-run if in admin mode
if (document.body.classList.contains('admin-mode')) {
    console.log('🔧 Version Control Debug Mode - run debugVersionControl() in console');
}

export default window.debugVersionControl; 