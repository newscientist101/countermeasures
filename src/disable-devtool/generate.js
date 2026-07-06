const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function generate() {
    const filePath = path.join(__dirname, 'disarmer.js');
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

    console.log('\n--- MINIFIED BOOKMARKLET ---');
    console.log(bookmarklet);
    console.log('----------------------------\n');

    const outputPath = path.join(process.cwd(), 'dist', 'disable-devtool-bookmarklet.txt');
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, bookmarklet);
    console.log(`Saved to ${outputPath}`);
}

generate().catch(console.error);
