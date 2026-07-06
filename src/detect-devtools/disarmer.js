(function() {
    const noop = () => {};
    const traps = ["id", "innerText", "style", "accessKey"];

    // Utility to hide our modifications
    const protectedFunctions = new Map();
    const _toString = Function.prototype.toString;

    Function.prototype.toString = function() {
        if (protectedFunctions.has(this)) {
            return protectedFunctions.get(this);
        }
        // Generic protection for detected-looking functions
        if (this.name && (
            this.name.includes('detector') ||
            this.name.includes('check') ||
            this.name.includes('DevTools') ||
            this.name.includes('isOpened')
        )) {
            return `function ${this.name}() { [native code] }`;
        }
        return _toString.apply(this, arguments);
    };

    const protect = (fn, name) => {
        const nativeStr = name ? `function ${name}() { [native code] }` : _toString.apply(fn);
        protectedFunctions.set(fn, nativeStr);
        return fn;
    };

    protect(Function.prototype.toString, 'toString');

    // 1. Prototype Hardening: Object.defineProperty
    const _defProp = Object.defineProperty;
    Object.defineProperty = protect(function(obj, prop, descriptor) {
        if (traps.includes(prop) && descriptor && (descriptor.get || descriptor.set)) {
            // Block property traps used by ObjectIDCheck
            return obj;
        }
        return _defProp.apply(this, arguments);
    }, 'defineProperty');

    // Legacy __defineGetter__
    const _defineGetter = Object.prototype.__defineGetter__;
    if (_defineGetter) {
        Object.prototype.__defineGetter__ = protect(function(prop, func) {
            if (traps.includes(prop)) return;
            return _defineGetter.apply(this, arguments);
        }, '__defineGetter__');
    }

    // 2. Console Silencing (LogPerformanceCheck and general probes)
    const silencedMethods = ['log', 'clear', 'dir', 'table', 'warn', 'error', 'info', 'debug', 'trace'];
    silencedMethods.forEach(method => {
        try {
            if (console[method]) {
                console[method] = protect(noop, method);
            }
        } catch (e) {}
    });

    // 3. Timing Manipulation (DebugCheck and LogPerformanceCheck)
    try {
        const constantTime = 0;
        performance.now = protect(() => constantTime, 'now');
        Date.now = protect(() => constantTime, 'now');
    } catch (e) {}

    // 4. Interval Termination
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
    Element.prototype.remove = protect(function() {
        if (protectScript(this)) return;
        return _remove.apply(this, arguments);
    }, 'remove');

    const _removeChild = Node.prototype.removeChild;
    Node.prototype.removeChild = protect(function(child) {
        if (protectScript(child)) return child;
        return _removeChild.apply(this, arguments);
    }, 'removeChild');

    console.warn('detect-devtools disarmed.');
})();
