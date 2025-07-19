/**
 * Debug Optimized Version Control System
 * Run this in browser console to diagnose initialization issues
 */

// Main debug function
window.debugOptimizedVersionControl = async function() {
    console.log('🔍 Debugging Optimized Version Control System');
    console.log('==============================================');
    
    // 1. Check module imports
    console.log('\n📦 Module Import Check:');
    console.log('- adminVersionControlUI:', typeof window.adminVersionControlUI !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- dbService:', typeof window.dbService !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    
    if (typeof window.adminVersionControlUI === 'undefined') {
        console.log('❌ CRITICAL: adminVersionControlUI not loaded. Check browser console for import errors.');
        return;
    }
    
    // 2. Check if admin is logged in
    console.log('\n🔐 Authentication Check:');
    const isAuthenticated = window.dbService?.isAuthenticated();
    console.log('- Admin logged in:', isAuthenticated ? '✅ Yes' : '❌ No');
    
    if (!isAuthenticated) {
        console.log('⚠️ Please log in as admin first, then run this debug function.');
        return;
    }
    
    // 3. Test database connection
    console.log('\n🗄️ Database Connection Test:');
    try {
        const { data, error } = await window.dbService.supabase
            .from('admin_users')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.log('❌ Database connection failed:', error);
            return;
        }
        console.log('✅ Database connection successful');
    } catch (error) {
        console.log('❌ Database connection error:', error);
        return;
    }
    
    // 4. Check optimized tables
    console.log('\n📋 Optimized Schema Check:');
    const requiredTables = ['content_versions', 'content_changes', 'team_member_changes', 'content_snapshots'];
    
    for (const table of requiredTables) {
        try {
            const { data, error } = await window.dbService.supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                console.log(`❌ Table '${table}' missing or inaccessible:`, error.message);
                if (error.code === '42P01') {
                    console.log(`   → Table '${table}' does not exist in database`);
                }
            } else {
                console.log(`✅ Table '${table}' exists and accessible`);
            }
        } catch (error) {
            console.log(`❌ Error checking table '${table}':`, error);
        }
    }
    
    // 5. Check required functions
    console.log('\n⚙️ Database Functions Check:');
    const requiredFunctions = ['create_content_snapshot', 'get_content_at_version', 'cleanup_old_versions'];
    
    for (const func of requiredFunctions) {
        try {
            // Test function existence by calling with safe parameters
            if (func === 'create_content_snapshot') {
                await window.dbService.supabase.rpc(func, { target_version: 0, target_page: 'test' });
            } else if (func === 'get_content_at_version') {
                await window.dbService.supabase.rpc(func, { target_version: 0, target_page: 'test' });
            } else if (func === 'cleanup_old_versions') {
                await window.dbService.supabase.rpc(func, { keep_count: 100 });
            }
            console.log(`✅ Function '${func}' exists and callable`);
        } catch (error) {
            if (error.code === '42883') {
                console.log(`❌ Function '${func}' does not exist`);
            } else {
                console.log(`✅ Function '${func}' exists (test call had expected error)`);
            }
        }
    }
    
    // 6. Test version control manager initialization
    console.log('\n🚀 Version Control Manager Test:');
    try {
        const versionManager = window.adminVersionControlUI.getVersionManager();
        if (!versionManager) {
            console.log('❌ Version manager not accessible');
            return;
        }
        
        console.log('✅ Version manager accessible');
        console.log('- Is initialized:', versionManager.isInitialized ? '✅ Yes' : '❌ No');
        
        if (!versionManager.isInitialized) {
            console.log('\n🔧 Attempting manual initialization...');
            const result = await versionManager.initialize();
            if (result.success) {
                console.log('✅ Manual initialization successful');
            } else {
                console.log('❌ Manual initialization failed:', result.error);
            }
        }
        
    } catch (error) {
        console.log('❌ Version manager test failed:', error);
    }
    
    // 7. Generate diagnosis and recommendations
    console.log('\n📋 DIAGNOSIS & RECOMMENDATIONS:');
    console.log('=====================================');
    
    // Check if schema issues exist
    const hasSchemaIssues = await checkSchemaIssues();
    
    if (hasSchemaIssues) {
        console.log('❌ DATABASE SCHEMA ISSUE DETECTED');
        console.log('   → The optimized version control schema is not properly set up');
        console.log('   → SOLUTION: Run the verification script in Supabase SQL Editor:');
        console.log('     1. Go to Supabase Dashboard → SQL Editor');
        console.log('     2. Copy and run the script from: verify-optimized-schema.sql');
        console.log('     3. If schema is incomplete, run the complete optimized schema SQL');
    } else {
        console.log('✅ Database schema appears to be correctly set up');
    }
    
    // Final recommendations
    console.log('\n🎯 NEXT STEPS:');
    if (hasSchemaIssues) {
        console.log('1. Fix database schema issues (see above)');
        console.log('2. Refresh the page and try logging in again');
        console.log('3. Run this debug function again to verify the fix');
    } else {
        console.log('1. Check browser console for any JavaScript errors');
        console.log('2. Verify all files are properly uploaded to your server');
        console.log('3. Clear browser cache and try again');
    }
    
    console.log('\n✅ Debug complete! Check the messages above for specific issues.');
};

// Helper function to check schema issues
async function checkSchemaIssues() {
    const requiredTables = ['content_versions', 'content_changes', 'team_member_changes', 'content_snapshots'];
    let missingTables = 0;
    
    for (const table of requiredTables) {
        try {
            const { error } = await window.dbService.supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
            
            if (error && error.code === '42P01') {
                missingTables++;
            }
        } catch (error) {
            missingTables++;
        }
    }
    
    return missingTables > 0;
}

// Auto-run helper message
console.log('🔧 Optimized Version Control Debug Tool Loaded');
console.log('Run: debugOptimizedVersionControl() to diagnose issues'); 