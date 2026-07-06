(function() {
    // 1. Mask Geometry
    const _defProp = Object.defineProperty;
    try {
        _defProp(window, 'outerWidth', { get: () => window.innerWidth, configurable: false });
        _defProp(window, 'outerHeight', { get: () => window.innerHeight, configurable: false });
        _defProp(window, 'devicePixelRatio', { get: () => 1, configurable: true });
    } catch (e) {
        console.warn('ByteHide Shield: Could not patch geometry', e);
    }

    // 2. Silence Probes & Timing
    const noop = () => {};
    const silencedMethods = ['log', 'clear', 'dir', 'table', 'warn', 'error', 'info', 'debug', 'trace'];
    silencedMethods.forEach(method => {
        try {
            console[method] = noop;
        } catch (e) {}
    });

    try {
        performance.now = Date.now = () => 0;
    } catch (e) {
        console.warn('ByteHide Shield: Could not patch timing', e);
    }

    // 3. Suppress Termination Errors
    window.addEventListener('error', (e) => {
        const msg = (e.message || '').toLowerCase();
        if (msg.includes('security') || msg.includes('devtool') || msg.includes('violation')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    window.addEventListener('unhandledrejection', (e) => {
        const msg = (e.reason && e.reason.message || '').toLowerCase();
        if (msg.includes('security') || msg.includes('devtool') || msg.includes('violation')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // 4. Prevent Script Wiping
    const protectScript = (node) => {
        if (node && node.tagName === 'SCRIPT') {
            return true;
        }
        return false;
    };

    const _remove = Element.prototype.remove;
    Element.prototype.remove = function() {
        if (protectScript(this)) {
            return;
        }
        return _remove.apply(this, arguments);
    };

    const _removeChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
        if (protectScript(child)) {
            return child;
        }
        return _removeChild.apply(this, arguments);
    };
})();
