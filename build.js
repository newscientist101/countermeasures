const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const srcDir = path.join(__dirname, 'src', 'bytehide-shield');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

async function buildBookmarklet(fileName, outputName) {
    const filePath = path.join(srcDir, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }

    const code = fs.readFileSync(filePath, 'utf8');

    const minified = await minify(code, {
        compress: {
            dead_code: true,
            drop_console: false,
            passes: 2
        },
        mangle: true
    });

    const bookmarklet = `javascript:${encodeURIComponent('(function(){' + minified.code + '})();')}`;
    fs.writeFileSync(path.join(distDir, outputName), bookmarklet);
    console.log(`Built ${outputName}`);
}

async function main() {
    await buildBookmarklet('core-disarmer.js', 'core-disarmer.txt');
    await buildBookmarklet('interval-killer.js', 'interval-killer.txt');
}

main().catch(console.error);
