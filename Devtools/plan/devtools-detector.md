# Blueprint: Disarming `devtools-detector`

## Overview
`devtools-detector` is a comprehensive library that uses modular "checkers" to identify if DevTools are active. It is particularly known for using `Custom Element` traps, `devtoolsFormatters`, and advanced timing checks.

## Detection Vectors & Countermeasures

### 1. `devtoolsFormatters` Trap
**Mechanism:** The library adds a custom object to `window.devtoolsFormatters`. When DevTools are open, the browser uses these formatters to render objects in the console. The library's formatter has a `header()` method that sets an `isOpen` flag to `true` whenever it's called.
**Countermeasure:** Nullify or replace `window.devtoolsFormatters` and prevent further additions.

```javascript
window.devtoolsFormatters = [];
Object.defineProperty(window, 'devtoolsFormatters', {
    get: () => [],
    set: () => {},
    configurable: false
});
```

### 2. Viewport & Geometry Checks
**Mechanism:** Monitors `window.innerWidth/Height` and `window.outerWidth/Height`. It also checks for discrepancies in `devicePixelRatio`.
**Countermeasure:** Override these properties to return consistent values.

```javascript
const fakeInnerWidth = window.innerWidth;
const fakeInnerHeight = window.innerHeight;
Object.defineProperty(window, 'outerWidth', { get: () => fakeInnerWidth });
Object.defineProperty(window, 'outerHeight', { get: () => fakeInnerHeight });
Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 });
```

### 3. Custom Element & Element ID Traps
**Mechanism:** Similar to `disable-devtool`, it uses `Object.defineProperty` on DOM element properties (like `id`) and logs them. The evaluation by DevTools triggers the getter.
**Countermeasure:** Intercept `Object.defineProperty` specifically for `id` getters on `HTMLElement` prototypes or instances.

```javascript
const _defineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
    if (prop === 'id' && descriptor && descriptor.get) {
        return obj; // Block the trap
    }
    return _defineProperty.apply(this, arguments);
};
```

### 4. `toString` Serialization Checkers
**Mechanism:** Uses `Function.prototype.toString`, `RegExp.prototype.toString`, and `Date.prototype.toString` to detect evaluation.
**Countermeasure:** Patch `toString` on these prototypes to prevent detection or return standard values.

```javascript
const _toString = Function.prototype.toString;
Function.prototype.toString = function() {
    if (this.name === 'isOpen' || this.name === 'detect') {
        return 'function () { [native code] }';
    }
    return _toString.apply(this, arguments);
};
```

### 5. Tab Crashing / Page Redirection
**Mechanism:** Upon detection, the library may call `window.close()`, `location.reload()`, or enter an infinite loop to "crash" the tab.
**Countermeasure:** Neutralize these destructive actions.

```javascript
window.onbeforeunload = null;
window.close = () => { console.warn('Blocked attempt to close tab.'); };
// location.reload is harder to patch but can be discouraged by intercepting triggers
```

## Implementation Plan

1. **Step 1: Formatter Neutralization**
   - Immediately clear and lock `window.devtoolsFormatters`.

2. **Step 2: Property Interception**
   - Override `Object.defineProperty` to block getter traps on `id`.
   - Override `window.outerWidth/Height` to hide docking.

3. **Step 3: Console Sanitization**
   - The detector relies heavily on `console.log` triggering getters. Patching `console` methods to ignore objects with suspicious getters can help.

4. **Step 4: Stop Intervals & Loops**
   - Clear all intervals. The detector usually runs on a timer.

5. **Step 5: Specific Library Targeting**
   - The library often exposes a `devtoolsDetector` object or similar. If found, call `.stop()` or `.setDetectorDelay(Infinity)`.

## Conceptual Bookmarklet Structure

```javascript
(function() {
    // 1. Kill formatters
    window.devtoolsFormatters = [];
    Object.defineProperty(window, 'devtoolsFormatters', {
        get: () => [], set: () => {}, configurable: false
    });

    // 2. Block property traps
    const _defProp = Object.defineProperty;
    Object.defineProperty = function(o, p, d) {
        if (p === 'id' && d && d.get) return o;
        return _defProp(o, p, d);
    };

    // 3. Fake geometry
    Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth });
    Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight });

    // 4. Stop intervals
    for (let i = 0; i < 10000; i++) {
        clearInterval(i);
        clearTimeout(i);
    }

    // 5. Target global instance if exists
    if (window.devtoolsDetector) {
        window.devtoolsDetector.stop();
        console.log('devtools-detector instance stopped.');
    }

    console.log('devtools-detector should now be disarmed.');
})();
```
