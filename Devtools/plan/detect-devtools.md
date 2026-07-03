# Blueprint: Disarming `detect-devtools`

## Overview
`detect-devtools` is a lightweight, modular library that employs several strategies to detect the presence of DevTools, including object ID monitoring, performance analysis of console methods, and `toString` behavior checks.

## Detection Vectors & Countermeasures

### 1. Object ID Check (`ObjectIDCheck`)
**Mechanism:** Creates an `Image` object and defines getters for properties like `id`, `innerText`, `style`, and `accessKey`. It then calls `console.dir(image)` every second. If DevTools is open, the browser evaluates these properties for display, triggering the getters.
**Countermeasure:** Intercept and neutralize `__defineGetter__` and `Object.defineProperty` for these specific properties on `HTMLImageElement` or generic objects.

```javascript
const _defineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
    const traps = ["id", "innerText", "style", "accessKey"];
    if (traps.includes(prop) && descriptor && descriptor.get) {
        return obj; // Block trap
    }
    return _defineProperty.apply(this, arguments);
};

// Also patch the legacy __defineGetter__
const _defineGetter = Object.prototype.__defineGetter__;
Object.prototype.__defineGetter__ = function(prop, func) {
    const traps = ["id", "innerText", "style", "accessKey"];
    if (traps.includes(prop)) return;
    return _defineGetter.apply(this, arguments);
};
```

### 2. Performance Logging Check (`LogPerformanceCheck`)
**Mechanism:** Measures the time taken to execute `console.log`. Since logging complex objects or large numbers of items is slower when the console panel is open, a timing delta can detect the state.
**Countermeasure:** Patch `console.log` and related methods to be no-ops or to run instantly.

```javascript
const _log = console.log;
console.log = function() {
    // Optionally call the original if needed for debugging our own bookmarklet
    // But for the detector, we want it to be fast.
};
```

### 3. `toString` Behavior Check (`ToStringCheck`)
**Mechanism:** Overrides `toString` on functions or other objects. When the console renders the object, it calls `toString`.
**Countermeasure:** Intercept attempts to override `toString` or ensure that the returned value doesn't trigger the detector's logic.

```javascript
const _toString = Function.prototype.toString;
Function.prototype.toString = function() {
    // Return standard representation for any suspect functions
    if (this.name === 'detected' || this.name === 'check') {
        return 'function ' + this.name + '() { [native code] }';
    }
    return _toString.apply(this, arguments);
};
```

### 4. Debug Check (`DebugCheck`)
**Mechanism:** Uses `debugger` statements combined with timing checks (similar to `disable-devtool`).
**Countermeasure:** Neutralize timing APIs (`performance.now`, `Date.now`) and ensure the delta remains below the threshold.

```javascript
const _now = performance.now;
performance.now = () => 0; // Force zero delta
```

## Implementation Plan

1. **Step 1: Prototype Hardening**
   - Patch `Object.defineProperty` and `Object.prototype.__defineGetter__` to block property traps.
   - Patch `Function.prototype.toString` to hide modifications.

2. **Step 2: Console Silencing**
   - Neutralize `console.log`, `console.dir`, `console.table`, and `console.clear`. This stops most of the library's active probes.

3. **Step 3: Timing Manipulation**
   - Override `performance.now` and `Date.now` during the "healing" phase.

4. **Step 4: Interval Termination**
   - The library uses `setInterval` for its checks. Clear all intervals to stop the background loops.

5. **Step 5: Global Object Neutralization**
   - The library is often initialized via an `init` function. If a global instance or the `init` function is found, attempt to disable it.

## Conceptual Bookmarklet Structure

```javascript
(function() {
    // 1. Block property traps
    const _defProp = Object.defineProperty;
    Object.defineProperty = function(o, p, d) {
        if (["id", "innerText", "style", "accessKey"].includes(p) && d && d.get) return o;
        return _defProp(o, p, d);
    };

    const _defGet = Object.prototype.__defineGetter__;
    Object.prototype.__defineGetter__ = function(p, f) {
        if (["id", "innerText", "style", "accessKey"].includes(p)) return;
        return _defGet.apply(this, arguments);
    };

    // 2. Silencing Probes
    const noop = () => {};
    console.log = console.dir = console.table = console.clear = noop;

    // 3. Stop intervals
    for (let i = 0; i < 10000; i++) {
        clearInterval(i);
        clearTimeout(i);
    }

    // 4. Manipulate Timing
    performance.now = Date.now = () => 0;

    console.warn('detect-devtools disarmed. active probes silenced.');
})();
```
