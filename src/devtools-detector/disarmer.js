(function() {
    // @include "../utils/stealth.js"

    const noop = () => {};

    // 1. devtoolsFormatters neutralization
    try {
        window.devtoolsFormatters = [];
        Object.defineProperty(window, 'devtoolsFormatters', {
            get: window.__stealth_protect(() => [], 'get'),
            set: window.__stealth_protect(() => {}, 'set'),
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
            get: window.__stealth_protect(() => window.innerWidth, 'outerWidth'),
            configurable: false
        });
        Object.defineProperty(window, 'outerHeight', {
            get: window.__stealth_protect(() => window.innerHeight, 'outerHeight'),
            configurable: false
        });
        Object.defineProperty(window, 'devicePixelRatio', {
            get: window.__stealth_protect(() => 1, 'devicePixelRatio'),
            configurable: false
        });
    } catch (e) {}

    // 4. Neutralize destructive actions
    try {
        window.close = window.__stealth_protect(noop, 'close');

        // Location reload neutralization
        const _location = window.location;
        try {
            Object.defineProperty(_location, 'reload', {
                value: window.__stealth_protect(noop, 'reload'),
                configurable: true,
                writable: true
            });
        } catch (e) {
            try {
                const proxy = new Proxy(_location, {
                    get: (target, prop) => {
                        if (prop === 'reload') return noop;
                        const val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    }
                });
                Object.defineProperty(window, 'location', {
                    get: window.__stealth_protect(() => proxy, 'location'),
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
