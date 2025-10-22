const fs = require('fs');
const path = require('path');

/**
 * Auto-rename trace folders to meaningful names
 * Runs automatically after Playwright tests
 */

const traceDir = 'ordino-report/trace-report';

if (!fs.existsSync(traceDir)) {
    console.log('No trace directory found. Skipping cleanup.');
    process.exit(0);
}

function cleanFolderName(folderName) {
    // Remove browser suffix
    let cleaned = folderName.replace(/-chromium$|-firefox$|-webkit$/i, '');
    
    // Remove hash pattern (5-character hex)
    cleaned = cleaned.replace(/-[a-f0-9]{5}-/g, '-');
    
    // Clean up multiple dashes
    cleaned = cleaned.replace(/-+/g, '-');
    cleaned = cleaned.replace(/^-+|-+$/g, '');
    
    return cleaned;
}

// Get all folders
const folders = fs.readdirSync(traceDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

let renamedCount = 0;

folders.forEach((folder) => {
    const oldPath = path.join(traceDir, folder);
    const cleanName = cleanFolderName(folder);
    
    // Only rename if the name actually changed
    if (cleanName !== folder && cleanName.length > 0) {
        const newPath = path.join(traceDir, cleanName);
        
        // Check if destination already exists
        if (!fs.existsSync(newPath)) {
            try {
                fs.renameSync(oldPath, newPath);
                console.log(`✅ Renamed: ${folder} → ${cleanName}`);
                renamedCount++;
            } catch (error) {
                console.error(`❌ Failed to rename ${folder}:`, error.message);
            }
        } else {
            console.log(`⚠️  Skipped ${folder} (destination exists)`);
        }
    }
});

if (renamedCount > 0) {
    console.log(`\n✅ Renamed ${renamedCount} trace folder(s) to meaningful names`);
} else {
    console.log('ℹ️  No trace folders to rename');
}

