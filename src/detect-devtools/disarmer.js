(function() {
    // @include "../utils/stealth.js"

    const noop = () => {};
    const traps = ["id", "innerText", "style", "accessKey"];

    // 1. Prototype Hardening: Object.defineProperty
    const _defProp = Object.defineProperty;
    Object.defineProperty = window.__stealth_protect(function(obj, prop, descriptor) {
        if (traps.includes(prop) && descriptor && (descriptor.get || descriptor.set)) {
            // Block property traps used by ObjectIDCheck
            return obj;
        }
        return _defProp.apply(this, arguments);
    }, 'defineProperty');

    // Legacy __defineGetter__
    const _defineGetter = Object.prototype.__defineGetter__;
    if (_defineGetter) {
        Object.prototype.__defineGetter__ = window.__stealth_protect(function(prop, func) {
            if (traps.includes(prop)) return;
            return _defineGetter.apply(this, arguments);
        }, '__defineGetter__');
    }

    // 2. Console Silencing (LogPerformanceCheck and general probes)
    const silencedMethods = ['log', 'clear', 'dir', 'table', 'warn', 'error', 'info', 'debug', 'trace'];
    silencedMethods.forEach(method => {
        try {
            if (console[method]) {
                console[method] = window.__stealth_protect(noop, method);
            }
        } catch (e) {}
    });

    // 3. Timing Manipulation (DebugCheck and LogPerformanceCheck)
    try {
        const constantTime = 0;
        performance.now = window.__stealth_protect(() => constantTime, 'now');
        Date.now = window.__stealth_protect(() => constantTime, 'now');
    } catch (e) {}

    // 4. Interval Termination
    // Note: Blueprint says this can be skipped as handled by interval-killer.js,
    // but the original disarmer had it. We'll keep it for standalone consistency.
    try {
        const maxId = setTimeout(noop, 0);
        for (let i = 0; i <= maxId; i++) {
            clearTimeout(i);
            clearInterval(i);
        }
    } catch (e) {}

    // 5. Prevent script removal (common in many detectors)
    const protectScript = (node) => {
        return node && node.tagName === 'SCRIPT';
    };

    const _remove = Element.prototype.remove;
    Element.prototype.remove = window.__stealth_protect(function() {
        if (protectScript(this)) return;
        return _remove.apply(this, arguments);
    }, 'remove');

    const _removeChild = Node.prototype.removeChild;
    Node.prototype.removeChild = window.__stealth_protect(function(child) {
        if (protectScript(child)) return child;
        return _removeChild.apply(this, arguments);
    }, 'removeChild');

    // 6. Stealth existing functions
    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }

    console.warn('detect-devtools disarmed.');
})();
