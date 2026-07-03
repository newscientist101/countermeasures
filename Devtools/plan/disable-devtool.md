# Blueprint: Disarming `disable-devtool`

## Overview
`disable-devtool` is a popular open-source library designed to prevent users from opening browser developer tools. It employs multiple detection vectors including timing attacks, UI property traps, and viewport monitoring.

## Detection Vectors & Countermeasures

### 1. Timing-Based Detection (`debugger` & `performance.now`)
**Mechanism:** The library executes a `debugger;` statement inside a loop or interval and measures the time delta before and after. If DevTools is open, the script pauses, causing a significant delay (> 100ms), which triggers the detection.
**Countermeasure:**
- **Freeze Time:** Patch `performance.now` and `Date.now` to return values that suggest near-instant execution.
- **Nullify Debugger:** Since we cannot disable the `debugger` keyword itself via JavaScript, we must ensure that if it *does* trigger, the subsequent timing check fails.

```javascript
const originalNow = performance.now;
performance.now = () => {
    // Return a value that doesn't increment significantly between calls
    // or return a fixed value if the caller is detected as the library
    return 0;
};
```

### 2. Element Property Getter Traps (`define-id`)
**Mechanism:** The library creates a DOM element and defines a custom getter for its `id` property using `Object.defineProperty`. It then logs this element to the console. If the console is open, it evaluates the element's properties, triggering the getter.
**Countermeasure:** Intercept `Object.defineProperty` and `Object.defineProperties`. If a getter is being defined on a property like `id` for a `div` or other element, prevent it or return a dummy descriptor.

```javascript
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
    if (prop === 'id' && descriptor.get) {
        console.warn('Blocked devtool detection trap on property:', prop);
        return obj;
    }
    return originalDefineProperty.apply(this, arguments);
};
```

### 3. Serialization Traps (`toString`)
**Mechanism:** The library overrides the `toString` method of functions, RegExps, or Dates. When the console attempts to display these objects, the custom `toString` is called, alerting the library. It also checks if native functions have been "beautified" or modified by checking their own `toString()` output.
**Countermeasure:** Patch `Function.prototype.toString` to return the expected "[native code]" string for any patched functions.

```javascript
const originalToString = Function.prototype.toString;
Function.prototype.toString = function() {
    if (this === Object.defineProperty) return 'function defineProperty() { [native code] }';
    // Add other patched functions here
    return originalToString.apply(this, arguments);
};
```

### 4. Viewport Geometry Monitoring (`size`)
**Mechanism:** Compares `window.outerWidth` vs `window.innerWidth` and `window.outerHeight` vs `window.innerHeight`. A large discrepancy suggests a docked DevTools panel.
**Countermeasure:** Override these properties to return equal values or values within the "safe" threshold (< 160px difference).

```javascript
Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth });
Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight });
```

### 5. Internal State Neutralization
**Mechanism:** The library maintains an internal state (e.g., `isRunning`).
**Countermeasure:** If the library is exposed globally (often as `DisableDevtool`), we can attempt to set its internal flags or call its teardown methods if available.

```javascript
if (window.DisableDevtool) {
    window.DisableDevtool.md5 = () => true; // Bypass md5 checks if applicable
    // Try to find and clear intervals if we can access the instance
}
```

## Implementation Plan

1. **Step 1: Immediate Environment Patching**
   - Override `Object.defineProperty` to block getter traps.
   - Override `window.outerWidth/Height` to hide UI disparities.
   - Override `console.clear` and `console.log` to prevent the library from spamming/clearing logs to trigger getters.

2. **Step 2: Timing Neutralization**
   - Patch `performance.now` and `Date.now` to return stable values during the bookmarklet execution window.

3. **Step 3: Global Variable Search**
   - Iterate over `window` keys to find instances of the `disable-devtool` library.
   - If found, attempt to call `off()` or `stop()` methods if they exist.

4. **Step 4: Interval/Timeout Clearing**
   - The library typically runs on a `setInterval`. The bookmarklet should attempt to clear all active intervals to stop the detection loop.
   - *Note:* Since we don't have the IDs, we can iterate from 0 to 10000 and call `clearInterval`.

5. **Step 5: Event Listener Removal**
   - Remove `keydown`, `contextmenu`, and `resize` listeners that the library attaches to `window` and `document`.

## Conceptual Bookmarklet Structure

```javascript
(function() {
    // 1. Block further property traps
    const _defineProperty = Object.defineProperty;
    Object.defineProperty = function(o, p, d) {
        if (p === 'id' && d.get) return o;
        return _defineProperty(o, p, d);
    };

    // 2. Hide viewport differences
    _defineProperty(window, 'outerWidth', { get: () => window.innerWidth });
    _defineProperty(window, 'outerHeight', { get: () => window.innerHeight });

    // 3. Stop intervals
    let maxId = setTimeout(() => {}, 0);
    while (maxId--) {
        clearTimeout(maxId);
        clearInterval(maxId);
    }

    // 4. Neutralize global instance
    if (window.DisableDevtool) {
        // Attempt to find a 'stop' or 'off' method via reflection
        for (let key in window.DisableDevtool) {
            if (typeof window.DisableDevtool[key] === 'function') {
                try { window.DisableDevtool[key](); } catch(e) {}
            }
        }
    }

    console.log('disable-devtool should now be disarmed.');
})();
```
