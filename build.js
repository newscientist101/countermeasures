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
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else if (file.endsWith('.js')) {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

async function buildBookmarklet(filePath) {
    const relativePath = path.relative(srcDir, filePath);
    // Use path segments for output name to avoid collisions and maintain structure
    const outputName = relativePath.replace(/\//g, '-').replace(/\.js$/, '.txt').replace(/\\/g, '-');

    console.log(`Building ${relativePath} -> ${outputName}`);

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
    const allFiles = getAllFiles(srcDir);
    for (const file of allFiles) {
        await buildBookmarklet(file);
    }
}

main().catch(console.error);
