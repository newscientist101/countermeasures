(function() {
    const nativeCode = " { [native code] }";

    // Helper to mark hooks (re-defined here to keep script standalone)
    const hook = (obj, name, newFunc) => {
        const original = obj[name];
        if (!original) return;
        newFunc.__isHooked = true;
        newFunc.__original = original;
        try {
            Object.defineProperty(newFunc, 'name', { value: name, configurable: true });
        } catch (e) {}
        obj[name] = newFunc;
    };

    // Protect toString if not already protected
    if (!Function.prototype.toString.__isHooked) {
        const _toString = Function.prototype.toString;
        const newToString = function toString() {
            if (this.__isHooked) return `function ${this.name}()${nativeCode}`;
            return _toString.apply(this, arguments);
        };
        newToString.__isHooked = true;
        Function.prototype.toString = newToString;
    }

    // Aggressive Timing Suppression
    if (window.performance && window.performance.now) {
        hook(window.performance, 'now', () => 0);
    }

    if (Date.now) {
        hook(Date, 'now', () => 0);
    }

    console.log('Aggressive timing suppressor active.');
})();
