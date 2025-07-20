/**
 * Debug Version Control System
 * Run this in browser console to trace exactly what's happening
 */

async function debugVersionControl() {
    console.log('🔍 DEBUGGING VERSION CONTROL SYSTEM');
    console.log('='.repeat(60));
    
    if (!document.body.classList.contains('admin-mode')) {
        console.error('❌ Please login as admin first');
        return;
    }
    
    if (!window.adminVersionControlUI || !window.adminVersionControlUI.getVersionManager()) {
        console.error('❌ Version control system not available');
        return;
    }
    
    const versionManager = window.adminVersionControlUI.getVersionManager();
    const dbService = window.dbService;
    
    try {
        console.log('\n1️⃣ CHECKING CURRENT DATABASE STATE');
        console.log('-'.repeat(40));
        
        // Check what's currently in the database
        const { data: currentContent, error: currentError } = await dbService.supabase
            .from('website_content')
            .select('element_id, content_text')
            .eq('page_name', versionManager.currentPage)
            .eq('is_active', true)
            .order('updated_at', { ascending: false });
            
        if (currentError) {
            console.error('❌ Error getting current content:', currentError);
            return;
        }
        
        console.log('📋 Current content in database:');
        currentContent.forEach(item => {
            console.log(`   ${item.element_id}: "${item.content_text}"`);
        });
        
        console.log('\n2️⃣ CHECKING PAGE CONTENT');
        console.log('-'.repeat(40));
        
        // Check what's currently on the page
        const editableElements = document.querySelectorAll('[data-editable-id], [contenteditable="true"]');
        console.log('📋 Current content on page:');
        editableElements.forEach(el => {
            const id = el.getAttribute('data-editable-id') || el.id || 'unknown';
            const content = el.textContent || el.innerText || '';
            console.log(`   ${id}: "${content}"`);
        });
        
        console.log('\n3️⃣ MAKING A TEST CHANGE');
        console.log('-'.repeat(40));
        
        // Find first editable element to test with
        const testElement = editableElements[0];
        if (!testElement) {
            console.error('❌ No editable elements found on page');
            return;
        }
        
        const originalTestContent = testElement.textContent;
        const testElementId = testElement.getAttribute('data-editable-id') || testElement.id || 'test-element';
        const newTestContent = `CHANGED AT ${new Date().toLocaleTimeString()}`;
        
        console.log(`📝 Test element: ${testElementId}`);
        console.log(`   Original: "${originalTestContent}"`);
        console.log(`   New: "${newTestContent}"`);
        
        // Track the change
        versionManager.trackChange(
            testElementId,
            originalTestContent,
            newTestContent,
            'update',
            { debug: true }
        );
        
        console.log('✅ Change tracked');
        
        console.log('\n4️⃣ TESTING SAVE PROCESS');
        console.log('-'.repeat(40));
        
        console.log('📸 Capturing current state before save...');
        const capturedState = await versionManager.captureCurrentContentState();
        console.log('📋 Captured state:');
        Object.entries(capturedState).forEach(([id, content]) => {
            console.log(`   ${id}: "${content}"`);
        });
        
        console.log('\n💾 Saving changes...');
        const saveResult = await versionManager.saveChanges('DEBUG: Test version');
        
        if (!saveResult.success) {
            console.error(`❌ Save failed: ${saveResult.error}`);
            return;
        }
        
        console.log(`✅ Save successful - Version ${saveResult.version} created`);
        
        console.log('\n5️⃣ CHECKING WHAT WAS SAVED');
        console.log('-'.repeat(40));
        
        // Check all possible version tables
        const tables = ['version_history', 'content_versions', 'website_states'];
        
        for (const tableName of tables) {
            try {
                const { data, error } = await dbService.supabase
                    .from(tableName)
                    .select('*')
                    .eq('version_number', saveResult.version)
                    .limit(1);
            
                if (!error && data && data.length > 0) {
                    console.log(`✅ Found version in ${tableName}:`);
                    console.log(data[0]);
                    
                    if (tableName === 'version_history' && data[0].changes) {
                        console.log('📋 Version content:');
                        Object.entries(data[0].changes).forEach(([id, content]) => {
                            console.log(`   ${id}: "${content}"`);
                        });
                    }
                }
            } catch (e) {
                console.log(`⚠️ ${tableName}: Not available`);
            }
        }
        
        console.log('\n6️⃣ CHECKING CURRENT STATE AFTER SAVE');
        console.log('-'.repeat(40));
        
        const { data: afterSaveContent } = await dbService.supabase
            .from('website_content')
            .select('element_id, content_text')
            .eq('page_name', versionManager.currentPage)
            .eq('is_active', true)
            .order('updated_at', { ascending: false });
            
        console.log('📋 Content in database after save:');
        afterSaveContent.forEach(item => {
            console.log(`   ${item.element_id}: "${item.content_text}"`);
        });
        
        console.log('\n7️⃣ TESTING RESTORE');
        console.log('-'.repeat(40));
        
        console.log(`🔄 Attempting to restore version ${saveResult.version}...`);
        const restoreResult = await versionManager.restoreVersion(saveResult.version, false);
        
        if (restoreResult.success) {
            console.log('✅ Restore completed');
            console.log(`   Elements restored: ${restoreResult.elementsRestored}`);
            console.log(`   Restore time: ${restoreResult.restoreTime}ms`);
        } else {
            console.error(`❌ Restore failed: ${restoreResult.error}`);
            return;
        }
        
        console.log('\n8️⃣ CHECKING FINAL STATE');
        console.log('-'.repeat(40));
        
        const { data: finalContent } = await dbService.supabase
            .from('website_content')
            .select('element_id, content_text')
            .eq('page_name', versionManager.currentPage)
            .eq('is_active', true)
            .order('updated_at', { ascending: false });
            
        console.log('📋 Final content in database:');
        finalContent.forEach(item => {
            console.log(`   ${item.element_id}: "${item.content_text}"`);
        });
        
        console.log('📋 Final content on page:');
        editableElements.forEach(el => {
            const id = el.getAttribute('data-editable-id') || el.id || 'unknown';
            const content = el.textContent || el.innerText || '';
            console.log(`   ${id}: "${content}"`);
        });
        
        console.log('\n🎯 ANALYSIS');
        console.log('-'.repeat(40));
        
        // Compare what should have happened
        const testElementFinalContent = document.querySelector(`[data-editable-id="${testElementId}"]`)?.textContent || '';
        
        console.log(`Expected behavior:`);
        console.log(`   1. Version should contain: "${originalTestContent}" (before changes)`);
        console.log(`   2. After restore, element should show: "${originalTestContent}"`);
        console.log(`   3. Actual element shows: "${testElementFinalContent}"`);
        
        if (testElementFinalContent === originalTestContent) {
            console.log('🎉 SUCCESS: Version control is working correctly!');
        } else {
            console.log('❌ PROBLEM: Content was not properly restored');
            
            // Find what went wrong
            console.log('\n🔍 TROUBLESHOOTING:');
            
            // Check if version was saved properly
            const versionFound = await checkVersionWasSaved(saveResult.version, originalTestContent);
            if (!versionFound) {
                console.log('❌ Issue: Version was not saved properly');
            } else {
                console.log('✅ Version was saved correctly');
                console.log('❌ Issue: Restore process is not working properly');
            }
        }
        
        console.log('\n✅ DEBUG COMPLETE');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

async function checkVersionWasSaved(versionNumber, expectedContent) {
    const dbService = window.dbService;
    const versionManager = window.adminVersionControlUI.getVersionManager();
    
    // Check version_history table
    try {
        const { data, error } = await dbService.supabase
            .from('version_history')
            .select('changes')
            .eq('version_number', versionNumber)
            .eq('page_name', versionManager.currentPage)
            .single();
            
        if (!error && data && data.changes) {
            console.log('📋 Checking saved version content...');
            Object.entries(data.changes).forEach(([id, content]) => {
                console.log(`   ${id}: "${content}"`);
                if (content === expectedContent) {
                    console.log(`✅ Found expected content in version`);
                    return true;
                }
            });
        }
    } catch (e) {
        console.log('⚠️ Could not check version_history table');
    }
    
    return false;
}

// Export to global
window.debugVersionControl = debugVersionControl;

console.log('🔍 Debug Version Control Script Loaded!');
console.log('💡 Run: debugVersionControl()'); 