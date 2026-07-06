(function() {
    if (window.__stealth_protect) return;

    const protectedFunctions = new Map();
    const _toString = Function.prototype.toString;

    window.__stealth_protect = (fn, name) => {
        if (typeof fn !== 'function') return fn;
        const fnName = name || fn.name || 'anonymous';
        const nativeStr = `function ${fnName}() { [native code] }`;
        protectedFunctions.set(fn, nativeStr);
        try {
            Object.defineProperty(fn, 'name', { value: fnName, configurable: true });
        } catch (e) {}
        return fn;
    };

    const _newToString = function toString() {
        if (protectedFunctions.has(this)) {
            return protectedFunctions.get(this);
        }
        return _toString.apply(this, arguments);
    };

    // Use Object.defineProperty to hook toString more robustly
    try {
        Object.defineProperty(Function.prototype, 'toString', {
            value: _newToString,
            configurable: true,
            writable: true
        });
    } catch (e) {
        Function.prototype.toString = _newToString;
    }

    window.__stealth_protect(Function.prototype.toString, 'toString');

    // --- debugger blocking ---
    const _Function = window.Function;
    const patchedFunction = function(...args) {
        if (args.length > 0) {
            let body = args[args.length - 1];
            if (typeof body === 'string' && body.includes('debugger')) {
                args[args.length - 1] = body.replace(/debugger/g, '/* debugger blocked */');
            }
        }
        return new _Function(...args);
    };
    window.__stealth_protect(patchedFunction, 'Function');
    window.Function = patchedFunction;
    window.__stealth_protect(_Function.prototype.constructor, 'Function');
    _Function.prototype.constructor = patchedFunction;

    // --- Error stack protection ---
    try {
        Object.defineProperty(Error.prototype, 'stack', {
            get: function() { return undefined; },
            set: function() { },
            configurable: true
        });

        const _Error = window.Error;
        const patchedError = function(...args) {
            const err = new _Error(...args);
            try {
                Object.defineProperty(err, 'stack', {
                    get: () => undefined,
                    configurable: true
                });
            } catch(e) {}
            return err;
        };
        window.__stealth_protect(patchedError, 'Error');
        window.Error = patchedError;
    } catch (e) {}

    window.__stealth_scan_and_hide = () => {
        const suspiciousNames = ['isOpen', 'detect', 'check', 'detector', 'isOpened', 'runAllChecks', 'runObjectIDCheck', 'runLogPerformanceCheck', 'runToStringCheck', 'runDebugCheck'];
        const windowProps = Object.getOwnPropertyNames(window);
        for (const prop of windowProps) {
            try {
                const val = window[prop];
                if (typeof val === 'function') {
                    if (prop === 'isOpen') continue;

                    if (suspiciousNames.some(name => prop.toLowerCase().includes(name.toLowerCase()))) {
                        window.__stealth_protect(val, prop);
                    }
                }
            } catch (e) {}
        }
    };

    // Protect some common targets immediately
    window.__stealth_protect(Object.defineProperty, 'defineProperty');
    window.__stealth_protect(Object.defineProperties, 'defineProperties');
    window.__stealth_protect(window.setInterval, 'setInterval');
    window.__stealth_protect(window.setTimeout, 'setTimeout');
    if (window.performance && window.performance.now) {
        window.__stealth_protect(window.performance.now, 'now');
    }
    window.__stealth_protect(Date.now, 'now');

})();
