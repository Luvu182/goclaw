package browser

import (
	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

// stealthJS is injected before page scripts to reduce automation detection.
const stealthJS = `
// Remove webdriver flag
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

// Ensure window.chrome exists (like real Chrome)
if (!window.chrome) window.chrome = {};
if (!window.chrome.runtime) window.chrome.runtime = {};

// Fix plugins (headless Chrome has empty plugin list)
Object.defineProperty(navigator, 'plugins', {
    get: () => {
        const plugins = [
            {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
            {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: ''},
            {name: 'Native Client', filename: 'internal-nacl-plugin', description: ''},
        ];
        plugins.length = 3;
        return plugins;
    },
});

// Fix languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
});

// Fix permissions query for notifications
const origQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (params) => (
    params.name === 'notifications'
        ? Promise.resolve({state: Notification.permission})
        : origQuery(params)
);
`

// injectStealth adds anti-detection scripts to a page.
// It registers the script for all future navigations AND runs it on the current page.
func injectStealth(page *rod.Page) {
	// Register for future navigations (like Page.addScriptToEvaluateOnNewDocument)
	_, _ = proto.PageAddScriptToEvaluateOnNewDocument{Source: stealthJS}.Call(page)

	// Also run on current page immediately
	_, _ = page.Eval(stealthJS)
}
