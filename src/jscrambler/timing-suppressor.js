(function() {
    // @include "../utils/stealth.js"

    // Aggressive Timing Suppression
    if (window.performance && window.performance.now) {
        window.performance.now = window.__stealth_protect(() => 0, 'now');
    }

    if (window.Date && window.Date.now) {
        window.Date.now = window.__stealth_protect(() => 0, 'now');
    }

    if (window.__stealth_scan_and_hide) {
        window.__stealth_scan_and_hide();
    }

    console.log('Aggressive timing suppressor active.');
})();
