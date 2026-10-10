const fs = require('fs');
const path = require('path');

const APP_JS_PATH = path.join(__dirname, 'src', 'js', 'app.js');

let content = fs.readFileSync(APP_JS_PATH, 'utf8');

// Find the start of DEFAULT_SUMMARY_ROWS and end of DEFAULT_APP_EXTRA
const startIdx = content.indexOf('    const DEFAULT_SUMMARY_ROWS = [');
const endIdx = content.indexOf('    // Initial load logic moved to init/switchMonth');

if (startIdx !== -1 && endIdx !== -1) {
    const defaultBlock = content.substring(startIdx, endIdx);
    
    // Remove it from its current location
    content = content.slice(0, startIdx) + content.slice(endIdx);
    
    // Insert it before // --- MONTHLY STATE ---
    const insertIdx = content.indexOf('    // --- MONTHLY STATE ---');
    if (insertIdx !== -1) {
        content = content.slice(0, insertIdx) + defaultBlock + content.slice(insertIdx);
    }
    
    fs.writeFileSync(APP_JS_PATH, content, 'utf8');
    console.log('Fixed order successfully');
} else {
    console.log('Could not find blocks');
}
