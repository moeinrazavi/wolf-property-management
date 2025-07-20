/**
 * Comprehensive Version Control Test
 * Tests both Clear All Versions functionality and Team Members version control
 * 
 * Usage:
 * 1. Login as admin
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: testCompleteVersionControl()
 */

async function testCompleteVersionControl() {
    console.log('🧪 COMPREHENSIVE VERSION CONTROL TEST');
    console.log('='.repeat(60));
    
    // Check prerequisites
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
        console.log('\n🔍 1. TESTING UI ELEMENTS');
        console.log('-'.repeat(40));
        
        // Check if Clear All Versions button exists
        const clearButton = document.getElementById('clear-all-versions-btn');
        if (clearButton) {
            console.log('✅ Clear All Versions button found');
            console.log(`   Text: "${clearButton.textContent}"`);
            console.log(`   Enabled: ${!clearButton.disabled}`);
        } else {
            console.error('❌ Clear All Versions button NOT FOUND');
            console.log('💡 This means the UI file was not updated correctly');
        }
        
        // Check version control UI
        const versionUI = document.getElementById('optimized-version-control-ui');
        if (versionUI) {
            console.log('✅ Version control UI found');
        } else {
            console.error('❌ Version control UI not found');
        }
        
        console.log('\n🗃️ 2. TESTING DATABASE CONNECTIVITY');
        console.log('-'.repeat(40));
        
        // Test database tables
        const tables = ['version_history', 'content_versions', 'website_states', 'team_members'];
        for (const tableName of tables) {
            try {
                const { data, error } = await dbService.supabase
                    .from(tableName)
                    .select('count', { count: 'exact', head: true });
                    
                if (!error) {
                    console.log(`✅ ${tableName} table accessible`);
                } else {
                    console.warn(`⚠️ ${tableName} table error:`, error.message);
                }
            } catch (e) {
                console.warn(`⚠️ ${tableName} table not accessible`);
            }
        }
        
        console.log('\n👥 3. TESTING TEAM MEMBERS FUNCTIONALITY');
        console.log('-'.repeat(40));
        
        // Get current team members
        const { data: currentTeamMembers, error: teamError } = await dbService.supabase
            .from('team_members')
            .select('*')
            .eq('page_name', versionManager.currentPage)
            .eq('is_active', true)
            .order('sort_order');
            
        if (teamError) {
            console.error('❌ Error getting team members:', teamError);
        } else {
            console.log(`✅ Found ${currentTeamMembers?.length || 0} team members in database`);
            if (currentTeamMembers && currentTeamMembers.length > 0) {
                currentTeamMembers.forEach((member, index) => {
                    console.log(`   ${index + 1}. ${member.name} - ${member.position}`);
                });
            }
        }
        
        // Check if aboutAdminManager is available
        if (window.aboutAdminManager) {
            console.log('✅ aboutAdminManager available');
            console.log(`   Team members loaded: ${window.aboutAdminManager.teamMembers?.length || 0}`);
            console.log(`   Has unsaved changes: ${window.aboutAdminManager.hasUnsavedChanges || false}`);
        } else {
            console.warn('⚠️ aboutAdminManager not available (only available on about.html)');
        }
        
        console.log('\n📚 4. TESTING VERSION HISTORY');
        console.log('-'.repeat(40));
        
        // Get current version history
        const { versions, error: historyError } = await versionManager.getVersionHistory(10);
        if (historyError) {
            console.error('❌ Error getting version history:', historyError);
        } else {
            console.log(`✅ Found ${versions?.length || 0} versions in history`);
            if (versions && versions.length > 0) {
                versions.slice(0, 3).forEach((version, index) => {
                    console.log(`   ${index + 1}. Version ${version.version_number} - ${version.description || 'No description'}`);
                    console.log(`      Created: ${new Date(version.created_at).toLocaleString()}`);
                });
                if (versions.length > 3) {
                    console.log(`   ... and ${versions.length - 3} more versions`);
                }
            }
        }
        
        console.log('\n🧪 5. TESTING VERSION CONTROL CAPTURE');
        console.log('-'.repeat(40));
        
        // Test capturing current state
        try {
            const capturedState = await versionManager.captureCurrentContentState();
            console.log(`✅ Captured ${Object.keys(capturedState).length} content items`);
            
            // Check if team members are captured
            if (capturedState['_team_members_data']) {
                const teamData = JSON.parse(capturedState['_team_members_data']);
                console.log(`✅ Team members captured: ${teamData.length} members`);
            } else {
                console.warn('⚠️ No team members captured (may be normal if none exist)');
            }
            
            // Show some captured content
            const contentKeys = Object.keys(capturedState).filter(key => !key.startsWith('_'));
            if (contentKeys.length > 0) {
                console.log(`📋 Sample captured content:`);
                contentKeys.slice(0, 3).forEach(key => {
                    const content = capturedState[key];
                    const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
                    console.log(`   ${key}: "${preview}"`);
                });
            }
            
        } catch (captureError) {
            console.error('❌ Error capturing content state:', captureError);
        }
        
        console.log('\n🔧 6. TESTING CLEAR ALL VERSIONS FUNCTIONALITY');
        console.log('-'.repeat(40));
        
        if (clearButton) {
            console.log('✅ Clear All Versions button is available');
            console.log('💡 To test manually:');
            console.log('   1. Click the "🗑️ Clear All Versions" button');
            console.log('   2. Confirm the deletion prompts');
            console.log('   3. Type "DELETE" when prompted');
            console.log('   4. Check that version history is cleared');
            
            // Test if the method exists
            if (typeof window.adminVersionControlUI.handleClearAllVersions === 'function') {
                console.log('✅ handleClearAllVersions method exists');
            } else {
                console.error('❌ handleClearAllVersions method missing');
            }
            
            if (typeof versionManager.clearAllVersions === 'function') {
                console.log('✅ clearAllVersions method exists in version manager');
            } else {
                console.error('❌ clearAllVersions method missing in version manager');
            }
        }
        
        console.log('\n📋 7. DIAGNOSTIC SUMMARY');
        console.log('-'.repeat(40));
        
        const diagnostics = {
            clearButtonExists: !!clearButton,
            versionUIExists: !!versionUI,
            teamMembersAccessible: !teamError,
            versionHistoryAccessible: !historyError,
            aboutAdminManagerAvailable: !!window.aboutAdminManager,
            clearAllVersionsMethodExists: typeof versionManager.clearAllVersions === 'function'
        };
        
        const allGood = Object.values(diagnostics).every(Boolean);
        
        if (allGood) {
            console.log('🎉 ALL TESTS PASSED! Version control should be working correctly.');
        } else {
            console.log('⚠️ Some issues detected:');
            Object.entries(diagnostics).forEach(([key, value]) => {
                if (!value) {
                    console.log(`   ❌ ${key}: Failed`);
                }
            });
        }
        
        console.log('\n🔄 8. RECOMMENDED ACTIONS');
        console.log('-'.repeat(40));
        
        if (!clearButton) {
            console.log('❌ Clear All Versions button missing:');
            console.log('   • Refresh the page and try again');
            console.log('   • Check if admin-version-control-ui.js was updated correctly');
        }
        
        if (teamError) {
            console.log('❌ Team members table issues:');
            console.log('   • Run the team_members table setup SQL in Supabase');
            console.log('   • Check database permissions');
        }
        
        if (historyError) {
            console.log('❌ Version history issues:');
            console.log('   • Run the version control database setup SQL');
            console.log('   • Check if version_history table exists');
        }
        
        console.log('\n💡 NEXT STEPS FOR TESTING:');
        console.log('-'.repeat(40));
        console.log('1. Make changes to team members (if on about.html)');
        console.log('2. Save changes using "Save Changes" button');
        console.log('3. Make more changes');
        console.log('4. Use version history to restore to previous version');
        console.log('5. Verify team members are restored correctly');
        console.log('6. Test "Clear All Versions" button');
        
        console.log('\n✅ TEST COMPLETE');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Export to global scope
window.testCompleteVersionControl = testCompleteVersionControl;

console.log('🧪 Comprehensive Version Control Test Loaded!');
console.log('💡 Run: testCompleteVersionControl()'); 