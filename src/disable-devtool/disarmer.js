(function() {
    // @include "../utils/stealth.js"

    const noop = () => {};

    // 1. Core Protections
    if (window.__stealth_silence_console) window.__stealth_silence_console();
    if (window.__stealth_suppress_timing) window.__stealth_suppress_timing();

    const originalDefineProperty = Object.defineProperty;
    const originalDefineProperties = Object.defineProperties;

    // 2. Block property traps used to detect DevTools console inspection
    const blockedProps = ['id', 'className', 'nodeName', 'outerWidth', 'outerHeight', 'innerWidth', 'innerHeight'];

    Object.defineProperty = window.__stealth_protect(function(obj, prop, descriptor) {
        if (descriptor && descriptor.get && blockedProps.includes(prop)) {
            return obj;
        }
        try {
            return originalDefineProperty.apply(this, arguments);
        } catch (e) {
            return obj;
        }
    }, 'defineProperty');

    Object.defineProperties = window.__stealth_protect(function(obj, props) {
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
    }, 'defineProperties');

    // 3. Normalize viewport properties (Lock them)
    try {
        const _innerWidth = window.innerWidth;
        const _innerHeight = window.innerHeight;
        originalDefineProperty(window, 'outerWidth', { get: () => _innerWidth, configurable: false });
        originalDefineProperty(window, 'outerHeight', { get: () => _innerHeight, configurable: false });
    } catch (e) {}

    // 4. Disable active global instances if present
    const targetLibrary = () => {
        if (window.DisableDevtool) {
            try {
                window.DisableDevtool.isSuspend = true;
                if (typeof window.DisableDevtool.off === 'function') {
                    window.DisableDevtool.off();
                }
                for (const key in window.DisableDevtool) {
                    if (typeof window.DisableDevtool[key] === 'function') {
                        window.DisableDevtool[key] = noop;
                    }
                }
            } catch (e) {}
        }
    };
    targetLibrary();
    setInterval(targetLibrary, 500);

    // 5. Kill intervals (Aggressive)
    let maxId = setTimeout(() => {}, 0);
    while (maxId--) {
        clearTimeout(maxId);
        clearInterval(maxId);
    }

    // 6. Stealth
    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }

    console.log('disable-devtool has been disarmed.');
})();
