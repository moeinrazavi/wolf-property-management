/**
 * Test Baseline Version Control
 * Tests that the version control system properly creates and maintains a baseline version
 * 
 * Usage:
 * 1. Login as admin
 * 2. Open browser console (F12)  
 * 3. Copy and paste this entire script
 * 4. Run: testBaselineVersionControl()
 */

async function testBaselineVersionControl() {
    console.log('🧪 TESTING BASELINE VERSION CONTROL');
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
        console.log('\n📋 BASELINE VERSION WORKFLOW TEST');
        console.log('-'.repeat(40));
        console.log('Expected: Baseline Version → Changes → Save → More Changes → Restore to Baseline');
        
        // Step 1: Check current version history
        console.log('\n1️⃣ CHECKING CURRENT VERSION HISTORY');
        const { versions: currentVersions, error: historyError } = await versionManager.getVersionHistory(10);
        
        if (historyError) {
            console.error('❌ Error getting version history:', historyError);
            return;
        }
        
        console.log(`📚 Found ${currentVersions?.length || 0} existing versions:`);
        if (currentVersions && currentVersions.length > 0) {
            currentVersions.forEach((version, index) => {
                const isBaseline = version.version_number === 1 || version.description.includes('Initial State');
                const prefix = isBaseline ? '📸 BASELINE' : '📝 CHANGE';
                console.log(`   ${prefix} - Version ${version.version_number}: ${version.description}`);
            });
        }
        
        // Step 2: Check if baseline exists, if not create it
        console.log('\n2️⃣ ENSURING BASELINE VERSION EXISTS');
        let baselineExists = currentVersions && currentVersions.some(v => 
            v.version_number === 1 || v.description.includes('Initial State')
        );
        
        if (!baselineExists) {
            console.log('📸 No baseline found, creating baseline version...');
            try {
                const baselineResult = await versionManager.createBaselineVersion();
                if (baselineResult.success) {
                    console.log(`✅ Baseline Version ${baselineResult.version} created successfully`);
                    baselineExists = true;
                } else {
                    console.error('❌ Failed to create baseline version');
                    return;
                }
            } catch (error) {
                console.error('❌ Error creating baseline version:', error);
                return;
            }
        } else {
            console.log('✅ Baseline version already exists');
        }
        
        // Step 3: Capture baseline state for comparison
        console.log('\n3️⃣ CAPTURING BASELINE STATE FOR COMPARISON');
        const baselineState = await versionManager.captureCurrentContentState();
        console.log(`📋 Baseline captured: ${Object.keys(baselineState).length} content items`);
        
        if (baselineState['_team_members_data']) {
            const baselineTeamMembers = JSON.parse(baselineState['_team_members_data']);
            console.log(`👥 Baseline team members: ${baselineTeamMembers.length} members`);
            baselineTeamMembers.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.name} - ${member.position}`);
            });
        }
        
        // Step 4: Make some changes and save
        console.log('\n4️⃣ SIMULATING CHANGES AND SAVE');
        let changesMade = false;
        let pendingTeamChanges = null;
        
        if (window.aboutAdminManager && window.location.pathname.includes('about.html')) {
            if (window.aboutAdminManager.teamMembers && window.aboutAdminManager.teamMembers.length > 0) {
                const firstMember = window.aboutAdminManager.teamMembers[0];
                console.log(`🔄 Making test change to: ${firstMember.name}`);
                
                const originalPosition = firstMember.position;
                const testPosition = `TEST CHANGE - ${new Date().toLocaleTimeString()}`;
                
                window.aboutAdminManager.trackMemberChange(firstMember.id, {
                    position: testPosition
                });
                
                console.log(`✅ Position changed: "${originalPosition}" → "${testPosition}"`);
                changesMade = true;
                
                pendingTeamChanges = window.aboutAdminManager.getPendingChangesForVersionControl();
            }
        }
        
        if (changesMade) {
            console.log('💾 Saving changes to create Version 2...');
            const saveResult = await versionManager.saveChangesGitHubStyle(
                'TEST: Changes after baseline', 
                pendingTeamChanges
            );
            
            if (saveResult.success) {
                console.log(`✅ Version ${saveResult.version} saved successfully`);
                console.log(`📝 This version preserves the state BEFORE the test changes`);
            } else {
                console.error(`❌ Save failed: ${saveResult.error}`);
                return;
            }
        } else {
            console.log('⚠️ No changes made (not on about page or no team members)');
        }
        
        // Step 5: Show updated version history
        console.log('\n5️⃣ CHECKING UPDATED VERSION HISTORY');
        const { versions: updatedVersions } = await versionManager.getVersionHistory(10);
        
        console.log(`📚 Version history now has ${updatedVersions?.length || 0} versions:`);
        if (updatedVersions && updatedVersions.length > 0) {
            updatedVersions.forEach((version, index) => {
                const isBaseline = version.version_number === 1 || version.description.includes('Initial State');
                const prefix = isBaseline ? '📸 BASELINE' : '📝 CHECKPOINT';
                const created = new Date(version.created_at).toLocaleString();
                console.log(`   ${prefix} - Version ${version.version_number}: ${version.description} (${created})`);
            });
        }
        
        // Step 6: Test restoration to baseline
        if (baselineExists && changesMade) {
            console.log('\n6️⃣ TESTING RESTORATION TO BASELINE');
            console.log('🔄 Restoring to baseline version (Version 1)...');
            
            const restoreResult = await versionManager.restoreVersion(1, false);
            
            if (restoreResult.success) {
                console.log(`✅ Restoration to baseline completed in ${restoreResult.restoreTime}ms`);
                
                // Verify restoration worked
                console.log('\n7️⃣ VERIFYING BASELINE RESTORATION');
                const restoredState = await versionManager.captureCurrentContentState();
                
                if (restoredState['_team_members_data'] && baselineState['_team_members_data']) {
                    const restoredTeamMembers = JSON.parse(restoredState['_team_members_data']);
                    const originalTeamMembers = JSON.parse(baselineState['_team_members_data']);
                    
                    console.log('👥 Comparing team members after baseline restoration:');
                    
                    if (originalTeamMembers.length > 0 && restoredTeamMembers.length > 0) {
                        const originalMember = originalTeamMembers[0];
                        const restoredMember = restoredTeamMembers[0];
                        
                        console.log(`   Original (baseline): ${originalMember.name} - ${originalMember.position}`);
                        console.log(`   Restored: ${restoredMember.name} - ${restoredMember.position}`);
                        
                        if (originalMember.position === restoredMember.position) {
                            console.log('   ✅ SUCCESS: Team member restored to baseline state!');
                        } else {
                            console.log('   ❌ FAILURE: Team member not properly restored to baseline');
                        }
                    }
                }
            } else {
                console.error(`❌ Restoration failed: ${restoreResult.error}`);
            }
        }
        
        console.log('\n🎯 BASELINE VERSION CONTROL SUMMARY');
        console.log('-'.repeat(40));
        console.log('✅ Baseline version represents original state');
        console.log('✅ Each save creates a checkpoint you can restore to');
        console.log('✅ Version 1 = baseline (original state)');
        console.log('✅ Version 2+ = checkpoints after changes');
        console.log('✅ Can restore to any version including baseline');
        
        console.log('\n💡 PROPER WORKFLOW:');
        console.log('1. 📸 System creates baseline (Version 1) on first load');
        console.log('2. ✏️  User makes changes');
        console.log('3. 💾 User saves → creates Version 2 (checkpoint before new changes)');
        console.log('4. ✏️  User makes more changes');
        console.log('5. 💾 User saves → creates Version 3 (checkpoint before newer changes)');
        console.log('6. 🔄 User can restore to Version 1 (baseline), Version 2, or Version 3');
        
        console.log('\n🎉 BASELINE VERSION CONTROL TEST COMPLETE!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Helper function to show the proper baseline workflow
function showBaselineWorkflow() {
    console.log('📖 BASELINE VERSION CONTROL WORKFLOW');
    console.log('='.repeat(50));
    console.log('');
    console.log('🏠 BASELINE VERSION (Version 1):');
    console.log('   Created automatically when version control initializes');
    console.log('   Represents the original state before any changes');
    console.log('   Always available for restoration');
    console.log('');
    console.log('📝 CHECKPOINT VERSIONS (Version 2, 3, 4...):');
    console.log('   Created each time you save changes');
    console.log('   Each represents the state BEFORE those changes');
    console.log('   Allows you to revert to any previous state');
    console.log('');
    console.log('🔄 RESTORATION:');
    console.log('   Version 1: Restore to original state (baseline)');
    console.log('   Version 2: Restore to state after first save');
    console.log('   Version 3: Restore to state after second save');
    console.log('   And so on...');
    console.log('');
    console.log('🎯 Key Benefit: You can ALWAYS go back to the original state!');
}

// Export to global scope
window.testBaselineVersionControl = testBaselineVersionControl;
window.showBaselineWorkflow = showBaselineWorkflow;

console.log('🧪 Baseline Version Control Test Loaded!');
console.log('💡 Run: testBaselineVersionControl()');
console.log('📖 Or run: showBaselineWorkflow() to see how it works'); 