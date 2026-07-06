(function() {
    const noop = () => {};

    // 1. Kill existing loops
    let id = setInterval(noop, 1000); // Get a fresh ID to know where we are
    while (id--) {
        clearTimeout(id);
        clearInterval(id);
    }

    // 2. Hijack future loops
    window.setInterval = window.setTimeout = () => {
        return 0;
    };
})();
