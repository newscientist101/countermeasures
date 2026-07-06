const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.js')) {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

async function buildBookmarklet(filePath) {
    const relativePath = path.relative(srcDir, filePath);

    // Skip utils directory for direct bookmarklet generation
    if (relativePath.split(path.sep).includes('utils')) {
        return;
    }

    // Use path segments for output name to avoid collisions and maintain structure
    const outputName = relativePath.replace(/[/\\]/g, '-').replace(/\.js$/, '.txt');

    console.log(`Building ${relativePath} -> ${outputName}`);

    let code = fs.readFileSync(filePath, 'utf8');

    // Handle @include
    const includeRegex = /\/\/ @include\s+["'](.+?)["']/g;
    code = code.replace(includeRegex, (match, includePath) => {
        const fullIncludePath = path.resolve(path.dirname(filePath), includePath);
        if (fs.existsSync(fullIncludePath)) {
            console.log(`  Including ${includePath}`);
            return fs.readFileSync(fullIncludePath, 'utf8');
        } else {
            console.warn(`  Warning: Include file not found: ${fullIncludePath}`);
            return match;
        }
    });

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
    const allFiles = getAllFiles(srcDir);
    for (const file of allFiles) {
        await buildBookmarklet(file);
    }
}

main().catch(console.error);
