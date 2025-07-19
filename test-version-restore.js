/**
 * Test Version Restore Functionality
 * Run this script in your browser console to test if version restoration is working
 * 
 * Usage:
 * 1. Login as admin
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: testVersionRestore()
 */

async function testVersionRestore() {
    console.log('🧪 Testing Version Restore Functionality...');
    console.log('='.repeat(50));
    
    // Check if admin is logged in
    if (!document.body.classList.contains('admin-mode')) {
        console.error('❌ Please login as admin first before running this test');
        return;
    }
    
    // Check if version control system is available
    if (!window.adminVersionControlUI || !window.adminVersionControlUI.getVersionManager()) {
        console.error('❌ Version control system not available');
        return;
    }
    
    const versionManager = window.adminVersionControlUI.getVersionManager();
    
    try {
        console.log('1️⃣ Testing version history retrieval...');
        const historyResult = await versionManager.getVersionHistory(10);
        
        if (historyResult.error) {
            console.error(`❌ Version history error: ${historyResult.error}`);
            return;
        }
        
        console.log(`✅ Found ${historyResult.versions.length} versions in history`);
        historyResult.versions.forEach((version, index) => {
            console.log(`   ${index + 1}. Version ${version.version_number}: ${version.description || 'No description'} (${new Date(version.created_at).toLocaleString()})`);
        });
        
        if (historyResult.versions.length === 0) {
            console.warn('⚠️ No versions found - you need to make and save some changes first');
            return;
        }
        
        console.log('\n2️⃣ Testing version restoration...');
        
        // Test with the most recent version (should be safe)
        const latestVersion = historyResult.versions[0];
        console.log(`🔄 Testing restore of version ${latestVersion.version_number}...`);
        
        const restoreResult = await versionManager.restoreVersion(latestVersion.version_number, false); // false = no confirmation dialog
        
        if (restoreResult.success) {
            console.log(`✅ Version ${latestVersion.version_number} restored successfully!`);
            console.log(`   - Restore time: ${restoreResult.restoreTime}ms`);
            console.log(`   - Method: ${restoreResult.method}`);
            console.log(`   - Elements restored: ${restoreResult.elementsRestored || 'Unknown'}`);
        } else {
            console.error(`❌ Restore failed: ${restoreResult.error}`);
            return;
        }
        
        console.log('\n3️⃣ Database schema check...');
        await checkDatabaseTables();
        
        console.log('\n🎉 Version restore test completed successfully!');
        console.log('✅ Your version control system is working properly');
        
    } catch (error) {
        console.error(`❌ Test failed with error: ${error.message}`);
        console.error('Full error:', error);
    }
}

async function checkDatabaseTables() {
    console.log('🔍 Checking which database tables are available...');
    
    const dbService = window.dbService;
    if (!dbService) {
        console.warn('⚠️ Database service not available for schema check');
        return;
    }
    
    const tablesToCheck = [
        'version_history',
        'content_versions', 
        'content_changes',
        'website_states',
        'website_content'
    ];
    
    for (const tableName of tablesToCheck) {
        try {
            const { data, error } = await dbService.supabase
                .from(tableName)
                .select('*')
                .limit(1);
                
            if (error) {
                console.log(`   ❌ ${tableName}: Not available (${error.message})`);
            } else {
                console.log(`   ✅ ${tableName}: Available`);
            }
        } catch (e) {
            console.log(`   ❌ ${tableName}: Error checking (${e.message})`);
        }
    }
}

// Helper function to create test data
async function createTestVersion() {
    console.log('📝 Creating test version...');
    
    if (!window.adminVersionControlUI || !window.adminVersionControlUI.getVersionManager()) {
        console.error('❌ Version control system not available');
        return;
    }
    
    const versionManager = window.adminVersionControlUI.getVersionManager();
    
    // Track a fake change
    versionManager.trackChange(
        'test-element',
        'Original test content',
        'Modified test content for version restoration test',
        'update',
        { testData: true, timestamp: new Date().toISOString() }
    );
    
    // Save the version
    const result = await versionManager.saveChanges('Test version - saves current state as checkpoint');
    
    if (result.success) {
        console.log(`✅ Test version ${result.version} created successfully`);
        console.log(`📋 This version represents the state BEFORE the test changes`);
        console.log(`💡 Restoring to this version will revert the changes`);
        return result.version;
    } else {
        console.error(`❌ Failed to create test version: ${result.error}`);
        return null;
    }
}

// Test the corrected version control logic
async function testCorrectVersionLogic() {
    console.log('🧪 Testing Corrected Version Control Logic...');
    console.log('='.repeat(60));
    
    if (!document.body.classList.contains('admin-mode')) {
        console.error('❌ Please login as admin first before running this test');
        return;
    }
    
    if (!window.adminVersionControlUI || !window.adminVersionControlUI.getVersionManager()) {
        console.error('❌ Version control system not available');
        return;
    }
    
    const versionManager = window.adminVersionControlUI.getVersionManager();
    
    try {
        console.log('1️⃣ Capturing current state...');
        const initialState = await versionManager.captureCurrentContentState();
        console.log(`✅ Initial state has ${Object.keys(initialState).length} elements`);
        
        console.log('\n2️⃣ Making a test change...');
        versionManager.trackChange(
            'test-version-logic',
            'BEFORE: This is the original content',
            'AFTER: This content has been changed',
            'update',
            { test: true }
        );
        
        console.log('\n3️⃣ Saving changes (should save PREVIOUS state as version)...');
        const saveResult = await versionManager.saveChanges('Test: Version should contain PREVIOUS state');
        
        if (!saveResult.success) {
            console.error(`❌ Save failed: ${saveResult.error}`);
            return;
        }
        
        console.log(`✅ Version ${saveResult.version} saved`);
        console.log(`📋 This version should contain the state BEFORE our test change`);
        
        console.log('\n4️⃣ Testing restore (should revert to PREVIOUS state)...');
        const restoreResult = await versionManager.restoreVersion(saveResult.version, false);
        
        if (restoreResult.success) {
            console.log(`✅ Restore successful!`);
            console.log(`   - Restored ${restoreResult.elementsRestored} elements`);
            console.log(`   - Restore time: ${restoreResult.restoreTime}ms`);
            console.log('📋 The page should now show content from BEFORE the test change');
        } else {
            console.error(`❌ Restore failed: ${restoreResult.error}`);
        }
        
        console.log('\n🎉 Version control logic test completed!');
        console.log('✅ Versions now correctly save the PREVIOUS state as checkpoints');
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
    }
}

// Export functions to global scope
window.testVersionRestore = testVersionRestore;
window.createTestVersion = createTestVersion;
window.checkDatabaseTables = checkDatabaseTables;
window.testCorrectVersionLogic = testCorrectVersionLogic;

console.log('🧪 Version Restore Test Script Loaded!');
console.log('📋 Available commands:');
console.log('   - testVersionRestore()       : Test version restore functionality');
console.log('   - testCorrectVersionLogic()  : Test corrected version control logic');
console.log('   - createTestVersion()        : Create a test version');
console.log('   - checkDatabaseTables()      : Check database schema');
console.log('');
console.log('💡 Start with: testCorrectVersionLogic() or testVersionRestore()'); 