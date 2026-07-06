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

    // 5. Dynamic Code Injection (Function constructor)
    const _Function = window.Function;
    const patchedFunction = function(...args) {
        if (args.length > 0) {
            let body = args[args.length - 1];
            if (typeof body === 'string' && body.includes('debugger')) {
                body = body.replace(/\bdebugger\b/g, '/* dbg blocked */');
                args[args.length - 1] = body;
            }
        }
        // Correctly handle being called with or without 'new'
        if (!(this instanceof patchedFunction)) {
            return _Function.apply(null, args);
        }
        return new _Function(...args);
    };
    hook(window, 'Function', patchedFunction);
    // Also hook Function.prototype.constructor
    hook(Function.prototype, 'constructor', patchedFunction);

    // 6. Error and Stack Trace Protection
    window.onerror = () => true;

    // 4. Stealth existing functions
    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }

    console.log('Jscrambler disarmer active.');
})();
