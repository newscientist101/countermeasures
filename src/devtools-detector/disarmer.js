(function() {
    // @include "../utils/stealth.js"

    const noop = () => {};

    // 1. Core Protections
    if (window.__stealth_silence_console) window.__stealth_silence_console();
    if (window.__stealth_suppress_timing) window.__stealth_suppress_timing();

    // 2. devtoolsFormatters neutralization
    try {
        window.devtoolsFormatters = [];
        Object.defineProperty(window, 'devtoolsFormatters', {
            get: window.__stealth_protect(() => [], 'get'),
            set: window.__stealth_protect(() => {}, 'set'),
            configurable: false
        });
    } catch (e) {}

    // 3. Block property traps on id and other common probes
    const _defProp = Object.defineProperty;
    const blockedProps = ['id', 'className', 'nodeName', 'outerWidth', 'outerHeight', 'innerWidth', 'innerHeight'];

    Object.defineProperty = window.__stealth_protect(function(obj, prop, descriptor) {
        if (blockedProps.includes(prop) && descriptor && (descriptor.get || descriptor.set)) {
            return obj;
        }
        return _defProp.apply(this, arguments);
    }, 'defineProperty');

    // 4. Fake geometry (Persistent)
    try {
        const _innerWidth = window.innerWidth;
        const _innerHeight = window.innerHeight;
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

    // 5. Neutralize destructive actions
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
        } catch (e) {}
    } catch (e) {}

    // 6. Specific library targeting (Aggressive)
    const targetLibrary = () => {
        if (window.devtoolsDetector) {
            try {
                if (typeof window.devtoolsDetector.stop === 'function') {
                    window.devtoolsDetector.stop();
                }
                if (typeof window.devtoolsDetector.setDetectDelay === 'function') {
                    window.devtoolsDetector.setDetectDelay(-1);
                }
                if (window.devtoolsDetector._listeners) {
                    window.devtoolsDetector._listeners = [];
                }
            } catch (e) {}
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
    };
    targetLibrary();
    setInterval(targetLibrary, 500);

    // 7. Kill all existing intervals/timeouts to stop detection loops
    let maxId = setTimeout(() => {}, 0);
    while (maxId--) {
        if (maxId > 100) { // Don't kill very low IDs which might be browser/test internals
            clearTimeout(maxId);
            clearInterval(maxId);
        }
    }

    // 8. Stealth everything
    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }

    console.warn('devtools-detector disarmed (v2).');
})();
