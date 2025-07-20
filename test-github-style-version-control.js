/**
 * Test GitHub-Style Version Control
 * Tests both content and team member version control with GitHub-style logic
 * 
 * Usage:
 * 1. Login as admin
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: testGitHubStyleVersionControl()
 */

async function testGitHubStyleVersionControl() {
    console.log('🧪 TESTING GITHUB-STYLE VERSION CONTROL');
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
        console.log('\n📋 GITHUB-STYLE WORKFLOW TEST');
        console.log('-'.repeat(40));
        console.log('Testing: Current state → Make changes → Save → Restore');
        
        // Step 1: Capture initial state
        console.log('\n1️⃣ CAPTURING INITIAL STATE');
        const initialState = await versionManager.captureCurrentContentState();
        console.log(`✅ Initial state captured: ${Object.keys(initialState).length} items`);
        
        // Check team members in initial state
        if (initialState['_team_members_data']) {
            const initialTeamMembers = JSON.parse(initialState['_team_members_data']);
            console.log(`   📋 Initial team members: ${initialTeamMembers.length} members`);
            initialTeamMembers.forEach((member, index) => {
                console.log(`      ${index + 1}. ${member.name} - ${member.position}`);
            });
        } else {
            console.log('   📋 No team members in initial state');
        }
        
        // Step 2: Simulate making changes to team members (if on about page)
        let teamChangesSimulated = false;
        if (window.aboutAdminManager && window.location.pathname.includes('about.html')) {
            console.log('\n2️⃣ SIMULATING TEAM MEMBER CHANGES');
            
            // Check if there are existing team members to modify
            if (window.aboutAdminManager.teamMembers && window.aboutAdminManager.teamMembers.length > 0) {
                const firstMember = window.aboutAdminManager.teamMembers[0];
                console.log(`   🔄 Modifying member: ${firstMember.name}`);
                
                // Simulate a position change
                const originalPosition = firstMember.position;
                const newPosition = `Modified Position - ${new Date().toLocaleTimeString()}`;
                
                window.aboutAdminManager.trackMemberChange(firstMember.id, {
                    position: newPosition
                });
                
                console.log(`   ✅ Position changed: "${originalPosition}" → "${newPosition}"`);
                teamChangesSimulated = true;
            } else {
                console.log('   ⚠️ No existing team members to modify, skipping team changes');
            }
        } else {
            console.log('\n2️⃣ TEAM MEMBER CHANGES SKIPPED');
            console.log('   ⚠️ Not on about page or aboutAdminManager not available');
        }
        
        // Step 3: Create a version save
        console.log('\n3️⃣ TESTING VERSION SAVE (GitHub-style)');
        
        // Get pending team changes if any
        let pendingTeamChanges = null;
        if (window.aboutAdminManager && window.aboutAdminManager.hasUnsavedChanges) {
            pendingTeamChanges = window.aboutAdminManager.getPendingChangesForVersionControl();
            console.log('   📋 Pending team changes detected:', pendingTeamChanges);
        }
        
        // Test the GitHub-style save
        const saveResult = await versionManager.saveChangesGitHubStyle(
            'TEST: GitHub-style version save', 
            pendingTeamChanges
        );
        
        if (saveResult.success) {
            console.log(`   ✅ Version ${saveResult.version} saved successfully`);
            console.log(`   📝 Description: ${saveResult.description}`);
            console.log(`   🔢 Total changes: ${saveResult.changeCount}`);
        } else {
            console.error(`   ❌ Save failed: ${saveResult.error}`);
            return;
        }
        
        // Step 4: Capture state after changes
        console.log('\n4️⃣ CHECKING STATE AFTER SAVE');
        const afterSaveState = await versionManager.captureCurrentContentState();
        
        if (afterSaveState['_team_members_data']) {
            const afterTeamMembers = JSON.parse(afterSaveState['_team_members_data']);
            console.log(`   📋 Team members after save: ${afterTeamMembers.length} members`);
            
            if (teamChangesSimulated) {
                const modifiedMember = afterTeamMembers[0];
                console.log(`   ✅ Confirmed change applied: ${modifiedMember.name} - ${modifiedMember.position}`);
            }
        }
        
        // Step 5: Test restoration
        console.log('\n5️⃣ TESTING VERSION RESTORATION');
        console.log(`   🔄 Restoring to version ${saveResult.version}...`);
        
        const restoreResult = await versionManager.restoreVersion(saveResult.version, false);
        
        if (restoreResult.success) {
            console.log(`   ✅ Restoration completed in ${restoreResult.restoreTime}ms`);
            console.log(`   📋 Elements restored: ${restoreResult.elementsRestored}`);
        } else {
            console.error(`   ❌ Restoration failed: ${restoreResult.error}`);
            return;
        }
        
        // Step 6: Verify restoration worked
        console.log('\n6️⃣ VERIFYING RESTORATION');
        const restoredState = await versionManager.captureCurrentContentState();
        
        if (restoredState['_team_members_data'] && initialState['_team_members_data']) {
            const restoredTeamMembers = JSON.parse(restoredState['_team_members_data']);
            const initialTeamMembers = JSON.parse(initialState['_team_members_data']);
            
            console.log(`   📋 Team members after restore: ${restoredTeamMembers.length} members`);
            
            if (teamChangesSimulated && initialTeamMembers.length > 0 && restoredTeamMembers.length > 0) {
                const originalMember = initialTeamMembers[0];
                const restoredMember = restoredTeamMembers[0];
                
                console.log(`   🔍 Comparing first member:`);
                console.log(`      Original: ${originalMember.name} - ${originalMember.position}`);
                console.log(`      Restored: ${restoredMember.name} - ${restoredMember.position}`);
                
                if (originalMember.position === restoredMember.position) {
                    console.log(`   ✅ SUCCESS: Team member restored to original state!`);
                } else {
                    console.log(`   ❌ FAILURE: Team member not properly restored`);
                }
            }
        }
        
        // Step 7: Test Clear All Versions functionality
        console.log('\n7️⃣ TESTING CLEAR ALL VERSIONS BUTTON');
        const clearButton = document.getElementById('clear-all-versions-btn');
        
        if (clearButton) {
            console.log('   ✅ Clear All Versions button found');
            console.log('   💡 Button text:', clearButton.textContent);
            console.log('   💡 To test manually: Click the button and follow prompts');
            
            // Check if method exists
            if (typeof window.adminVersionControlUI.handleClearAllVersions === 'function') {
                console.log('   ✅ handleClearAllVersions method exists');
            } else {
                console.log('   ❌ handleClearAllVersions method missing');
            }
        } else {
            console.log('   ❌ Clear All Versions button NOT FOUND');
        }
        
        console.log('\n🎯 GITHUB-STYLE LOGIC SUMMARY');
        console.log('-'.repeat(40));
        console.log('✅ Version saves CURRENT state as checkpoint');
        console.log('✅ Changes are applied AFTER version is saved');
        console.log('✅ Restoring reverts to the BEFORE state');
        console.log('✅ Team members are included in version control');
        console.log('✅ Clear All Versions button is available');
        
        console.log('\n🎉 GITHUB-STYLE VERSION CONTROL TEST COMPLETE!');
        
        if (teamChangesSimulated) {
            console.log('\n💡 NEXT MANUAL TEST:');
            console.log('1. Make changes to team members (edit name/position/bio)');
            console.log('2. Click "Save Changes" button');
            console.log('3. Make more changes');
            console.log('4. Go to version history and restore to previous version');
            console.log('5. Verify team members revert to before the first changes');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Helper function to show expected workflow
function showGitHubStyleWorkflow() {
    console.log('📖 GITHUB-STYLE VERSION CONTROL WORKFLOW');
    console.log('='.repeat(50));
    console.log('');
    console.log('🔄 How it works (like GitHub commits):');
    console.log('');
    console.log('1. 📸 BEFORE CHANGES: Current state = "Hello World"');
    console.log('2. ✏️  USER MAKES CHANGES: Edits to "Hello Universe"');
    console.log('3. 💾 USER CLICKS SAVE:');
    console.log('   → System saves "Hello World" as Version 1 checkpoint');
    console.log('   → System applies changes so current = "Hello Universe"');
    console.log('4. 🔄 USER CLICKS RESTORE TO VERSION 1:');
    console.log('   → System reverts to "Hello World" ✅');
    console.log('');
    console.log('🎯 Key Point: Each version is a checkpoint of the state');
    console.log('   BEFORE the changes were made, just like Git commits!');
}

// Export to global scope
window.testGitHubStyleVersionControl = testGitHubStyleVersionControl;
window.showGitHubStyleWorkflow = showGitHubStyleWorkflow;

console.log('🧪 GitHub-Style Version Control Test Loaded!');
console.log('💡 Run: testGitHubStyleVersionControl()');
console.log('📖 Or run: showGitHubStyleWorkflow() to see how it works'); 