(function() {
    // @include "../utils/stealth.js"

    // 1. Block Property Traps
    const _defProp = Object.defineProperty;
    window.Object.defineProperty = window.__stealth_protect(function(o, p, d) {
        // Jscrambler and others use getters on 'id' or 'name' to detect console/inspection
        if (d && d.get && (p === 'id' || p === 'name')) {
            return o;
        }
        return _defProp.apply(this, arguments);
    }, 'defineProperty');

    // 2. Console Silencing
    const noop = () => {};
    ['log', 'warn', 'error', 'dir', 'table', 'clear', 'debug', 'info', 'trace'].forEach(m => {
        if (console[m]) {
            console[m] = window.__stealth_protect(noop, m);
        }
    });

    // 3. Error and Stack Trace Protection
    window.onerror = () => true;

    // 4. Stealth existing functions
    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }

    console.log('Jscrambler disarmer active.');
})();
