(function() {
    const nativeCode = " { [native code] }";

    // 1. Helper to mark hooks
    const hook = (obj, name, newFunc) => {
        const original = obj[name];
        if (!original) return;
        newFunc.__isHooked = true;
        newFunc.__original = original;
        // Maintain name if possible
        try {
            Object.defineProperty(newFunc, 'name', { value: name, configurable: true });
        } catch (e) {}
        obj[name] = newFunc;
    };

    // 2. Protect toString immediately
    const _toString = Function.prototype.toString;
    hook(Function.prototype, 'toString', function() {
        if (this.__isHooked) return `function ${this.name}()${nativeCode}`;
        return _toString.apply(this, arguments);
    });

    // 3. Block Property Traps
    const _defProp = Object.defineProperty;
    hook(Object, 'defineProperty', function(o, p, d) {
        // Jscrambler and others use getters on 'id' or 'name' to detect console/inspection
        if (d && d.get && (p === 'id' || p === 'name')) {
            // If it's a trap, we just return the object without defining the trap,
            // or we could define a static value.
            return o;
        }
        return _defProp(o, p, d);
    });

    // 4. Console Silencing
    const noop = () => {};
    ['log', 'warn', 'error', 'dir', 'table', 'clear', 'debug', 'info', 'trace'].forEach(m => {
        if (console[m]) {
            hook(console, m, noop);
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

    // Patch Error.prototype.stack to return an empty string or generic value
    try {
        // In Chrome, 'stack' is a non-standard property on Error instances.
        // We can try to define it on the prototype as a getter that returns empty.
        Object.defineProperty(Error.prototype, 'stack', {
            get: function() { return undefined; },
            set: function() { },
            configurable: true
        });

        // Also hook the Error constructor to delete stack from instances if it's added
        const _Error = window.Error;
        window.Error = function(...args) {
            const err = new _Error(...args);
            try {
                Object.defineProperty(err, 'stack', {
                    get: () => undefined,
                    configurable: true
                });
            } catch(e) {}
            return err;
        };
        hook(window, 'Error', window.Error);
    } catch (e) {}

    // 7. Prevent detection of our hooks via name/length if checked
    // (Already partially handled by hook helper for 'name')

    console.log('Jscrambler disarmer active.');
})();
