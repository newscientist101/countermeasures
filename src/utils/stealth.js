(function() {
    const protectedFunctions = new Map();
    const _toString = Function.prototype.toString;

    window.__stealth_protect = (fn, name) => {
        if (typeof fn !== 'function') return fn;
        const fnName = name || fn.name || 'anonymous';
        const nativeStr = `function ${fnName}() { [native code] }`;
        protectedFunctions.set(fn, nativeStr);
        return fn;
    };

    window.__stealth_scan_and_hide = () => {
        const suspiciousNames = ['isOpen', 'detect', 'check', 'devtoolsDetector', 'isOpened', 'DisableDevtool', 'detector'];
        const visited = new Set();
        const scan = (obj) => {
            if (!obj || visited.has(obj)) return;
            visited.add(obj);
            for (const prop in obj) {
                try {
                    const val = obj[prop];
                    if (typeof val === 'function') {
                        if (prop === 'isOpen') continue;
                        if (suspiciousNames.some(name => prop.toLowerCase().includes(name.toLowerCase()))) {
                            window.__stealth_protect(val, prop);
                        }
                    } else if (typeof val === 'object') {
                        // Shallow scan of second level objects if name matches
                        if (suspiciousNames.some(name => prop.toLowerCase().includes(name.toLowerCase()))) {
                             // don't recurse too deep to avoid performance issues
                        }
                    }
                } catch (e) {}
            }
        };
        scan(window);
    };

    // Global Timing Suppression Utility
    window.__stealth_suppress_timing = () => {
        const noop = () => 0;
        if (window.performance && window.performance.now) {
            const _now = window.performance.now;
            window.performance.now = window.__stealth_protect(noop, 'now');
        }
        if (Date.now) {
            const _dateNow = Date.now;
            Date.now = window.__stealth_protect(noop, 'now');
        }
    };

    // Global Console Silencing Utility
    window.__stealth_silence_console = () => {
        const noop = () => {};
        ['log', 'warn', 'error', 'dir', 'table', 'clear', 'debug', 'info', 'trace'].forEach(m => {
            if (console[m]) {
                console[m] = window.__stealth_protect(noop, m);
            }
        });
    };

    const _newToString = function toString() {
        if (protectedFunctions.has(this)) {
            return protectedFunctions.get(this);
        }
        return _toString.apply(this, arguments);
    };

    Function.prototype.toString = _newToString;
    window.__stealth_protect(Function.prototype.toString, 'toString');

})();
