#!/usr/bin/env node

/**
 * Wolf Property Management - Change Deployment Script
 * 
 * This script applies saved changes from localStorage to the HTML files
 * for permanent deployment to GitHub Pages.
 * 
 * Usage:
 * 1. Save changes in the admin interface
 * 2. Run this script: node deploy-changes.js
 * 3. Commit and push the updated files to GitHub
 */

const fs = require('fs');
const path = require('path');

// File paths
const INDEX_FILE = 'index.html';
const ABOUT_FILE = 'about.html';

// Storage keys (must match script.js)
const CHANGES_STORAGE_KEY = 'wolf_pm_changes';
const VERSION_STORAGE_KEY = 'wolf_pm_versions';

function loadChangesFromLocalStorage() {
    console.log('📋 Loading saved changes...');
    
    // This would normally read from localStorage, but since this is a Node.js script,
    // we'll read from a JSON file that you can export from the browser
    const changesFile = 'saved-changes.json';
    
    if (!fs.existsSync(changesFile)) {
        console.log('❌ No saved changes file found.');
        console.log('💡 To export changes:');
        console.log('   1. Open your website in the browser');
        console.log('   2. Login as admin');
        console.log('   3. Click "Export Changes" in the admin controls');
        console.log('   4. Save the file as "saved-changes.json" in this directory');
        return null;
    }
    
    try {
        const changesData = JSON.parse(fs.readFileSync(changesFile, 'utf8'));
        return changesData;
    } catch (error) {
        console.error('❌ Error reading changes file:', error.message);
        return null;
    }
}

function applyChangesToFile(filePath, changes) {
    console.log(`📝 Applying changes to ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return false;
    }
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changesApplied = 0;
        
        // Apply each change
        Object.keys(changes).forEach(elementId => {
            const newText = changes[elementId];
            
            // Find the element in the HTML using a simple text search
            // This is a basic implementation - you might need to enhance it
            const elementSelector = extractElementSelector(elementId);
            if (elementSelector) {
                const regex = new RegExp(`(<[^>]*>)[^<]*${escapeRegex(elementSelector)}[^<]*(</[^>]*>)`, 'g');
                const matches = content.match(regex);
                
                if (matches) {
                    // Replace the content
                    content = content.replace(regex, `$1${newText}$2`);
                    changesApplied++;
                    console.log(`   ✅ Applied: ${elementSelector} -> "${newText}"`);
                }
            }
        });
        
        // Write the updated content back to the file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Applied ${changesApplied} changes to ${filePath}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error applying changes to ${filePath}:`, error.message);
        return false;
    }
}

function extractElementSelector(elementId) {
    // Extract the text content from the element ID
    // This is a simplified approach - you might need to enhance it
    const parts = elementId.split('-');
    if (parts.length > 2) {
        return parts.slice(2).join(' ').replace(/-/g, ' ');
    }
    return null;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createBackup(filePath) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    try {
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Created backup: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error(`❌ Error creating backup:`, error.message);
        return null;
    }
}

function main() {
    console.log('🚀 Wolf Property Management - Change Deployment Script');
    console.log('==================================================\n');
    
    // Load changes
    const changesData = loadChangesFromLocalStorage();
    if (!changesData) {
        return;
    }
    
    console.log(`📊 Found changes for version ${changesData.version || 'unknown'}`);
    console.log(`📅 Timestamp: ${changesData.timestamp || 'unknown'}`);
    console.log(`📄 Page: ${changesData.page || 'unknown'}`);
    console.log(`🔧 Total changes: ${Object.keys(changesData.changes || {}).length}\n`);
    
    if (!changesData.changes || Object.keys(changesData.changes).length === 0) {
        console.log('ℹ️  No changes to apply.');
        return;
    }
    
    // Create backups
    console.log('💾 Creating backups...');
    const indexBackup = createBackup(INDEX_FILE);
    const aboutBackup = createBackup(ABOUT_FILE);
    
    // Apply changes
    console.log('\n🔧 Applying changes...\n');
    
    let success = true;
    
    // Apply to index.html
    if (fs.existsSync(INDEX_FILE)) {
        success = applyChangesToFile(INDEX_FILE, changesData.changes) && success;
    }
    
    // Apply to about.html
    if (fs.existsSync(ABOUT_FILE)) {
        success = applyChangesToFile(ABOUT_FILE, changesData.changes) && success;
    }
    
    if (success) {
        console.log('\n✅ Deployment completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Review the changes in your HTML files');
        console.log('   2. Test the website locally');
        console.log('   3. Commit and push to GitHub:');
        console.log('      git add .');
        console.log('      git commit -m "Apply admin changes - version ' + (changesData.version || 'unknown') + '"');
        console.log('      git push origin main');
        console.log('   4. Your changes will be live on GitHub Pages in a few minutes');
    } else {
        console.log('\n❌ Deployment failed. Check the errors above.');
        console.log('💡 You can restore from the backup files if needed.');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main, applyChangesToFile, loadChangesFromLocalStorage }; 