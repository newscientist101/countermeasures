(function() {
    // @include "../utils/stealth.js"

    const noop = () => {};

    // 1. Kill existing loops
    let id = setInterval(noop, 1000); // Get a fresh ID to know where we are
    while (id--) {
        clearTimeout(id);
        clearInterval(id);
    }

    // 2. Hijack future loops
    window.setInterval = window.setTimeout = window.__stealth_protect(() => {
        return 0;
    }, 'setInterval');

    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }
})();
