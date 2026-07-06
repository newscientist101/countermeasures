(function() {
    /**
     * Countermeasure for disable-devtool library.
     */

    const originalDefineProperty = Object.defineProperty;
    const originalDefineProperties = Object.defineProperties;
    const originalToString = Function.prototype.toString;
    const originalNow = Date.now;
    const originalPerfNow = performance.now;

    // 1. Block property traps used to detect DevTools console inspection
    const blockedProps = ['id', 'className', 'nodeName', 'outerWidth', 'outerHeight', 'innerWidth', 'innerHeight'];

    Object.defineProperty = function(obj, prop, descriptor) {
        if (descriptor && descriptor.get && blockedProps.includes(prop)) {
            return obj;
        }
        try {
            return originalDefineProperty.apply(this, arguments);
        } catch (e) {
            return obj;
        }
    };

    Object.defineProperties = function(obj, props) {
        const clonedProps = {};
        for (const prop in props) {
            if (props[prop] && props[prop].get && blockedProps.includes(prop)) {
                continue;
            }
            clonedProps[prop] = props[prop];
        }
        try {
            return originalDefineProperties.call(this, obj, clonedProps);
        } catch (e) {
            return obj;
        }
    };

    // 2. Normalize viewport properties
    const normalizeViewport = (prop) => {
        try {
            originalDefineProperty(window, prop, {
                get: function() {
                    if (prop === 'outerWidth') return window.innerWidth;
                    if (prop === 'outerHeight') return window.innerHeight;
                    return window[prop];
                },
                configurable: true,
                enumerable: true
            });
        } catch (e) {}
    };

    normalizeViewport('outerWidth');
    normalizeViewport('outerHeight');

    // 3. Neutralize timing attacks
    let lastNow = originalNow();
    Date.now = () => lastNow;
    if (typeof performance !== 'undefined' && performance.now) {
        performance.now = () => 0;
    }

    // 4. Prevent detection of patched native functions
    Function.prototype.toString = function() {
        if (this === Object.defineProperty) return 'function defineProperty() { [native code] }';
        if (this === Object.defineProperties) return 'function defineProperties() { [native code] }';
        if (this === Function.prototype.toString) return 'function toString() { [native code] }';
        if (this === Date.now) return 'function now() { [native code] }';
        if (typeof performance !== 'undefined' && this === performance.now) return 'function now() { [native code] }';
        return originalToString.apply(this, arguments);
    };

    // 5. Disable active global instances if present
    if (window.DisableDevtool) {
        try {
            window.DisableDevtool.isSuspend = true;
            if (typeof window.DisableDevtool.off === 'function') {
                window.DisableDevtool.off();
            }
            for (const key in window.DisableDevtool) {
                if (typeof window.DisableDevtool[key] === 'function') {
                    window.DisableDevtool[key] = function() {};
                }
            }
        } catch (e) {}
    }

    // 6. Kill intervals (Self-contained)
    let maxId = setTimeout(() => {}, 0);
    while (maxId--) {
        clearTimeout(maxId);
        clearInterval(maxId);
    }

    console.log('disable-devtool has been disarmed.');
})();
