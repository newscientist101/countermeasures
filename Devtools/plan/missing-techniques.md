# Missing Anti-Debugging Libraries and Techniques

This document lists anti-debugging libraries and techniques not currently covered or fully tested by the current suite.

## Libraries to Target
1.  **the-wall**: A more aggressive anti-debugging library that uses multiple triggers including network-based side channels.
2.  **anti-tamper**: Focused on detecting modifications to the DOM and global objects.
3.  **sindresorhus/devtools-detect**: A popular, though older, library that uses various geometry and console tricks.
4.  **jdetects**: A Chinese library with unique detection patterns.

## Advanced Techniques
1.  **SourceMappingUrl Exploitation**: Detecting DevTools by appending a dynamic source map and monitoring for the browser's out-of-band request.
2.  **Web Worker Detection**: Offloading detection logic to Web Workers to avoid main-thread blocking and bypass standard `setInterval` killers.
3.  **WASM-based Detection**: Implementing timing and integrity checks within WebAssembly to hide the logic from standard JavaScript inspection.
4.  **CDP-based Detection (Protocol Detection)**: Checking for features only present when the Chrome DevTools Protocol is active, even if the UI is not visible.
5.  **Scope Pane Exploitation**: Using `arguments.callee.caller` and other scope inspection tools to detect if the code is being evaluated by the DevTools "Scope" pane.
6.  **Debugger Step-Detection**: Monitoring execution flow at a high frequency to detect the tiny pauses introduced by a human stepping through code.

## Future Bypass Research
- **Shadow DOM Isolation**: Moving detection mocks into Shadow DOM to see if disarmers fail to reach them.
- **Trusted Types**: Evaluating if `TrustedTypes` can be used to block the injection of countermeasures.
- **CSP Bypasses**: Researching how to inject countermeasures when a strict Content Security Policy is in place.
