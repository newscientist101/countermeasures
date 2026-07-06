(function() {
    // @include "../utils/stealth.js"

    const noop = () => {};

    // 1. devtoolsFormatters neutralization
    try {
        window.devtoolsFormatters = [];
        Object.defineProperty(window, 'devtoolsFormatters', {
            get: () => [],
            set: () => {},
            configurable: false
        });
    } catch (e) {}

    // 2. Block property traps on id
    const _defProp = Object.defineProperty;
    Object.defineProperty = window.__stealth_protect(function(obj, prop, descriptor) {
        if (prop === 'id' && descriptor && (descriptor.get || descriptor.set)) {
            return obj;
        }
        return _defProp.apply(this, arguments);
    }, 'defineProperty');

    // 3. Fake geometry
    try {
        Object.defineProperty(window, 'outerWidth', {
            get: () => window.innerWidth,
            configurable: false
        });
        Object.defineProperty(window, 'outerHeight', {
            get: () => window.innerHeight,
            configurable: false
        });
        Object.defineProperty(window, 'devicePixelRatio', {
            get: () => 1,
            configurable: false
        });
    } catch (e) {}

    // 4. Neutralize destructive actions
    try {
        window.close = window.__stealth_protect(noop, 'close');

        // Location reload neutralization
        // We try to replace the property on the instance.
        // If it fails, we try to redefine it on the window object.
        const _location = window.location;
        try {
            Object.defineProperty(_location, 'reload', {
                value: window.__stealth_protect(noop, 'reload'),
                configurable: true,
                writable: true
            });
        } catch (e) {
            try {
                // If we can't change .reload, maybe we can change window.location
                const proxy = new Proxy(_location, {
                    get: (target, prop) => {
                        if (prop === 'reload') return noop;
                        const val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    }
                });
                Object.defineProperty(window, 'location', {
                    get: () => proxy,
                    configurable: true
                });
            } catch (e2) {}
        }

        // Final fallback: intercept events
        window.addEventListener('beforeunload', (e) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }, { capture: true });
    } catch (e) {}

    // 5. Specific library targeting
    if (window.devtoolsDetector) {
        try {
            if (typeof window.devtoolsDetector.stop === 'function') {
                window.devtoolsDetector.stop();
            }
            if (typeof window.devtoolsDetector.setDetectorDelay === 'function') {
                window.devtoolsDetector.setDetectorDelay(Infinity);
            }
        } catch (e) {}
    }

    // 6. Stealth existing functions
    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }

    console.warn('devtools-detector disarmed.');
})();
