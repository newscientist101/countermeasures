# Blueprint: Disarming `ByteHide Shield` (DevTools Blocking)

## Overview
`ByteHide Shield` is a commercial-grade protection suite. Its `devtoolsBlocking` feature is designed to terminate application execution, clear sensitive code from memory, and potentially redirect the user when DevTools are detected. It uses a combination of window size monitoring, performance analysis, and feature detection.

## Detection Vectors & Countermeasures

### 1. Viewport Disparity Monitoring
**Mechanism:** Constantly checks if the difference between `window.outerWidth/Height` and `window.innerWidth/Height` exceeds a threshold (typically 160px).
**Countermeasure:** Override `window.outerWidth` and `window.outerHeight` to return values that are always within the safe range (e.g., matching the inner dimensions exactly).

```javascript
Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth });
Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight });
```

### 2. Timing and Performance Analysis
**Mechanism:** Measures the execution time of operations that are significantly slower when a debugger or the console is active (e.g., large loops with `console.log`).
**Countermeasure:** Patch `performance.now` and `Date.now` to return a constant value or a very slowly incrementing value to hide the execution delay. Also, neutralize `console` methods to prevent them from causing rendering overhead.

```javascript
const _now = performance.now;
performance.now = () => 0; // Or a very small incrementing value

const noop = () => {};
console.log = console.clear = console.warn = noop;
```

### 3. "Self-Defending" and Execution Termination
**Mechanism:** Upon detection, the library throws errors (e.g., `throw new Error("Security violation")`) and attempts to wipe scripts from the DOM.
**Countermeasure:**
- **Global Error Handling:** Use a `window.onerror` handler to catch and suppress security-related errors thrown by the shield.
- **Wipe Prevention:** The shield might attempt to set `document.body.innerHTML = ''` or remove `<script>` tags. We can attempt to freeze these properties or intercept the removal methods.

```javascript
window.onerror = function(msg) {
    if (msg.includes("Security violation") || msg.includes("devtools")) {
        console.warn('Suppressed ByteHide security error:', msg);
        return true; // Prevent default error handling
    }
};

// Protect scripts from being wiped (if they use .remove())
const _remove = Element.prototype.remove;
Element.prototype.remove = function() {
    if (this.tagName === 'SCRIPT' && this.getAttribute('data-protected')) {
        return; // Prevent removal
    }
    return _remove.apply(this, arguments);
};
```

### 4. Behavior Analysis and Feature Detection
**Mechanism:** Checks for specific DevTools-only properties or behavior patterns.
**Countermeasure:** Since commercial shields often use obfuscated and randomized logic, a "scorched earth" approach to prototype patching is most effective.

## Implementation Plan

1. **Step 1: UI Masking**
   - Override `window.outerWidth/Height` and `window.devicePixelRatio`.

2. **Step 3: Timing and Console Suppression**
   - Patch `performance.now`, `Date.now`, and all `console` methods.

3. **Step 4: Error and DOM Protection**
   - Set up a global error listener to ignore "Security Violation" errors.
   - Patch `Element.prototype.remove` and `Node.prototype.removeChild` to prevent the shield from wiping its own or other scripts.

4. **Step 5: Interval Clearing**
   - ByteHide Shield likely uses a high-frequency `setInterval`. Iterate and clear all intervals to stop the detection loop.

## Conceptual Bookmarklet Structure

```javascript
(function() {
    // 1. Mask Geometry
    const _defProp = Object.defineProperty;
    _defProp(window, 'outerWidth', { get: () => window.innerWidth });
    _defProp(window, 'outerHeight', { get: () => window.innerHeight });
    _defProp(window, 'devicePixelRatio', { get: () => 1 });

    // 2. Silence Probes & Timing
    const noop = () => {};
    console.log = console.clear = console.dir = console.table = noop;
    performance.now = Date.now = () => 0;

    // 3. Suppress Termination Errors
    window.addEventListener('error', (e) => {
        if (e.message.toLowerCase().includes('security') || e.message.toLowerCase().includes('devtool')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // 4. Prevent Script Wiping
    const _remove = Element.prototype.remove;
    Element.prototype.remove = function() {
        if (this.tagName === 'SCRIPT') return;
        return _remove.apply(this, arguments);
    };

    // 5. Kill Loops
    let id = setTimeout(noop, 0);
    while (id--) {
        clearTimeout(id);
        clearInterval(id);
    }

    console.warn('ByteHide Shield disarmed. Detection loops terminated.');
})();
```
