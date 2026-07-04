# ByteHide Shield Countermeasures

This project implements countermeasures for disarming the `ByteHide Shield` (DevTools blocking) protection.

## Standards Used

- **Red-Green-Refactor Cycle**: All countermeasures were developed using TDD with Playwright to verify their effectiveness against mock detection scenarios.
- **Bookmarklet Format**: The final artifacts are provided as minified bookmarklets for easy injection into target environments.

## Countermeasures

### 1. Core Disarmer (`dist/core-disarmer.txt`)
Injects the primary defenses:
- **UI Masking**: Overrides `outerWidth`, `outerHeight`, and `devicePixelRatio`.
- **Timing Freeze**: Freezes `performance.now()` and `Date.now()` to 0.
- **Console Suppression**: Silences all standard `console` methods.
- **Error Suppression**: Catches and suppresses "Security Violation" or "DevTools" related errors.
- **DOM Protection**: Patches `Element.prototype.remove` and `Node.prototype.removeChild` to prevent `<script>` tag removal.

### 2. Interval Killer (`dist/interval-killer.txt`)
Injects aggressive loop termination:
- **Existing Loop Termination**: Iterates through all current timeout/interval IDs and clears them.
- **Future Loop Hijacking**: Overrides `window.setInterval` and `window.setTimeout` to block any new loops from starting.

## Scripts

- `npm install`: Install dependencies (Playwright, Terser).
- `npm run build`: Minifies source scripts and generates bookmarklet text files in `dist/`.
- `npm test`: Runs Playwright tests to verify countermeasures.

## Usage

1. Run `npm run build`.
2. Copy the content of the desired `.txt` file from the `dist/` directory.
3. Create a new bookmark in your browser and paste the copied content as the URL.
4. Click the bookmark on the target website to apply the countermeasures.
