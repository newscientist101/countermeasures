# Blueprint: Universal Bypass for `Jscrambler Anti-Debugging`

## Overview
`Jscrambler` is a high-end enterprise obfuscator. Its Anti-Debugging transformation is randomized, meaning each protected build uses a different subset of techniques (out of 9+ possibilities). To effectively disarm Jscrambler without knowing the specific build's configuration, a "Universal Bypass" via broad prototype patching is necessary.

## Universal Bypass Strategies

### 1. Timing Anomaly Suppression
**Mechanism:** Jscrambler uses high-precision timing to detect pauses caused by breakpoints or `debugger` statements.
**Countermeasure:** Patch all timing APIs to return stable, predictable values.

```javascript
const _now = performance.now;
const _dateNow = Date.now;
// Return a slowly incrementing value to allow normal logic but hide 'jumps'
let fakeTime = 0;
performance.now = () => fakeTime += 0.001;
Date.now = () => Math.floor(fakeTime += 1);
```

### 2. Console Evaluation Blocking
**Mechanism:** Jscrambler, like others, uses getter traps on objects passed to `console.log` or `console.dir`. It also checks if `console` methods have been modified.
**Countermeasure:**
- **Silencing:** Neutralize `console` methods before the library runs (or as soon as the bookmarklet starts).
- **Integrity Spoofing:** If Jscrambler checks `console.log.toString()`, ensure it returns the native code string.

```javascript
const _log = console.log;
console.log = function() {};
console.log.toString = () => "function log() { [native code] }";
```

### 3. Prototype Integrity Protection
**Mechanism:** Jscrambler checks if native functions (like `document.createElement`, `Object.defineProperty`) have been hooked by checking their `toString()` output or character length.
**Countermeasure:** Patch `Function.prototype.toString` to selectively "lie" about the content of hooked functions.

```javascript
const _toString = Function.prototype.toString;
Function.prototype.toString = function() {
    if (this === Object.defineProperty) return "function defineProperty() { [native code] }";
    if (this === performance.now) return "function now() { [native code] }";
    // Universal catch: if the function is one of our hooks, return a fake native string
    if (this.__isHooked) return `function ${this.name}() { [native code] }`;
    return _toString.apply(this, arguments);
};
```

### 4. `debugger` Loop Neutralization
**Mechanism:** Injects `debugger` statements in complex, obfuscated loops (control-flow flattening).
**Countermeasure:** While `debugger` can't be removed, we can neutralize the *timing checks* that follow them. Additionally, we can attempt to patch the `Function` constructor if it's used to generate `debugger` code dynamically.

```javascript
const _Function = window.Function;
window.Function = function(...args) {
    const body = args[args.length - 1];
    if (typeof body === 'string' && body.includes('debugger')) {
        console.warn('Blocked dynamic debugger generation');
        return _Function(...args.slice(0, -1), '/* debugger blocked */');
    }
    return _Function.apply(this, args);
};
```

### 5. Error and Exception Traps
**Mechanism:** Jscrambler sometimes intentionally triggers exceptions and checks if a debugger catches them or if the stack trace is "beautified."
**Countermeasure:** Suppress global errors and prevent stack trace inspection.

```javascript
window.onerror = () => true;
// Patch Error.prototype.stack getter if possible, though browser support varies
```

## Implementation Plan

1. **Step 1: Foundational Hooks**
   - Override `Object.defineProperty` and `Object.defineProperties` to block getter traps.
   - Override `Function.prototype.toString` to return "[native code]" for all subsequent hooks.

2. **Step 2: Timing Neutralization**
   - Implement the "slow time" version of `performance.now` and `Date.now`.

3. **Step 3: Constructor Interception**
   - Patch `window.Function` and `window.eval` to filter out `debugger` statements or malicious loops.

4. **Step 4: Console Silencing**
   - Set all `console` methods to no-ops.

5. **Step 5: Loop Termination**
   - Clear all intervals and timeouts. Jscrambler often schedules its checks asynchronously.

## Conceptual Bookmarklet Structure (Universal)

```javascript
(function() {
    const nativeCode = " { [native code] }";

    // 1. Helper to mark hooks
    const hook = (obj, name, newFunc) => {
        const original = obj[name];
        newFunc.__isHooked = true;
        newFunc.__original = original;
        obj[name] = newFunc;
    };

    // 2. Protect toString immediately
    const _toString = Function.prototype.toString;
    Function.prototype.toString = function() {
        if (this.__isHooked) return `function ${this.name}()${nativeCode}`;
        return _toString.apply(this, arguments);
    };

    // 3. Block Property Traps
    const _defProp = Object.defineProperty;
    Object.defineProperty = function(o, p, d) {
        if (d && d.get && (p === 'id' || p === 'name')) return o;
        return _defProp(o, p, d);
    };

    // 4. Timing & Console
    hook(window.performance, 'now', () => 0);
    hook(Date, 'now', () => 0);
    const noop = () => {};
    ['log', 'warn', 'error', 'dir', 'table', 'clear'].forEach(m => hook(console, m, noop));

    // 5. Dynamic Code Injection
    hook(window, 'Function', function(...args) {
        let body = args.pop();
        if (typeof body === 'string') body = body.replace(/debugger/g, '');
        return new (Function.bind.apply(Function, [null, ...args, body]));
    });

    // 6. Kill intervals
    let id = setTimeout(noop, 0);
    while (id--) { clearInterval(id); clearTimeout(id); }

    console.log('Universal bypass active. Jscrambler checks should be neutralized.');
})();
```
