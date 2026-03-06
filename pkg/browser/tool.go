package browser

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/nextlevelbuilder/goclaw/internal/store"
	"github.com/nextlevelbuilder/goclaw/internal/tools"
)

// BrowserTool implements tools.Tool for browser automation.
type BrowserTool struct {
	manager *Manager
}

// NewBrowserTool creates a BrowserTool wrapping a Manager.
func NewBrowserTool(manager *Manager) *BrowserTool {
	return &BrowserTool{manager: manager}
}

func (t *BrowserTool) Name() string { return "browser" }

func (t *BrowserTool) Description() string {
	return `Control a browser to navigate web pages, take accessibility snapshots, and interact with elements.
The browser auto-starts on first use.

Actions:
- status: Get browser status (includes current headless mode)
- start: Launch browser
- stop: Close browser
- restart: Restart browser with different headless mode (use headless param). Useful when a site blocks headless browsers — switch to headless=false and retry.
- tabs: List open tabs
- open: Open a new tab (requires targetUrl). Returns targetId for subsequent actions.
- close: Close a tab (requires targetId)
- snapshot: Get page accessibility tree with element refs (use targetId, maxChars, interactive, compact, depth)
- screenshot: Capture page screenshot as image (use targetId, fullPage)
- navigate: Navigate tab to URL (requires targetId, targetUrl)
- act: Interact with elements (requires targetId and request object)
- console: Get browser console messages (requires targetId)
- setCookies: Load cookies from a JSON file exported by browser extensions like EditThisCookie (requires cookiesFile path). Set cookies BEFORE opening the target URL so the browser has a valid session.
- status: Get browser status (includes headless mode)
- restart: Restart browser with different mode (use headless param). Useful when a site blocks headless browsers — switch to headless=false (full Chrome) and retry.
- start/stop: Manually control browser lifecycle (rarely needed)

Headless mode:
- headless=true: faster, no GUI needed, but some sites detect and block headless browsers
- headless=false: full Chrome, bypasses most headless detection but requires a display server
- Use "status" to check current mode. If a page shows a bot challenge or blank content, try restart with headless=false.

Act kinds: click, type, press, hover, wait, evaluate
- click: Click element (request: {kind:"click", ref:"e1"})
- type: Type text (request: {kind:"type", ref:"e1", text:"hello"})
- press: Press key (request: {kind:"press", key:"Enter"})
- hover: Hover element (request: {kind:"hover", ref:"e1"})
- wait: Wait for condition (request: {kind:"wait", timeMs:1000} or {kind:"wait", text:"loaded"})
- evaluate: Run JavaScript (request: {kind:"evaluate", fn:"document.title"})

Snapshot tips:
- interactive=false (default): shows ALL content including text, headings, articles — use this to READ page content
- interactive=true: shows ONLY buttons/links/inputs — use this to find clickable elements, NOT for reading content
- compact=true: removes empty structural divs, recommended for content-heavy pages (Facebook, etc.)
- For large pages: increase maxChars (default 16000) to see more content

Workflow: open URL → snapshot (get refs) → act (use refs) → snapshot again`
}

func (t *BrowserTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"status", "start", "stop", "restart", "tabs", "open", "close", "snapshot", "screenshot", "navigate", "console", "act", "setCookies"},
				"description": "The browser action to perform",
			},
			"headless": map[string]any{
				"type":        "boolean",
				"description": "Set headless mode (for restart action). true=headless, false=full Chrome",
			},
			"targetUrl": map[string]any{
				"type":        "string",
				"description": "URL for open/navigate actions",
			},
			"targetId": map[string]any{
				"type":        "string",
				"description": "Tab target ID (omit for current tab)",
			},
			"maxChars": map[string]any{
				"type":        "number",
				"description": "Max characters for snapshot (default 8000)",
			},
			"interactive": map[string]any{
				"type":        "boolean",
				"description": "Only show interactive elements in snapshot",
			},
			"compact": map[string]any{
				"type":        "boolean",
				"description": "Remove empty structural elements from snapshot",
			},
			"depth": map[string]any{
				"type":        "number",
				"description": "Max depth for snapshot tree",
			},
			"fullPage": map[string]any{
				"type":        "boolean",
				"description": "Capture full page screenshot",
			},
			"timeoutMs": map[string]any{
				"type":        "number",
				"description": "Timeout in milliseconds for actions",
			},
			"cookiesFile": map[string]any{
				"type":        "string",
				"description": "Path to cookies JSON file (for setCookies action). Export from EditThisCookie or Cookie-Editor extension.",
			},
			"request": map[string]any{
				"type":        "object",
				"description": "Action request for 'act' command",
				"properties": map[string]any{
					"kind": map[string]any{
						"type":        "string",
						"enum":        []string{"click", "type", "press", "hover", "wait", "evaluate"},
						"description": "The interaction kind",
					},
					"ref": map[string]any{
						"type":        "string",
						"description": "Element ref from snapshot (e.g. e1, e2)",
					},
					"text": map[string]any{
						"type":        "string",
						"description": "Text to type",
					},
					"key": map[string]any{
						"type":        "string",
						"description": "Key to press (e.g. Enter, Tab, Escape)",
					},
					"submit": map[string]any{
						"type":        "boolean",
						"description": "Press Enter after typing",
					},
					"fn": map[string]any{
						"type":        "string",
						"description": "JavaScript to evaluate",
					},
					"timeMs": map[string]any{
						"type":        "number",
						"description": "Wait time in milliseconds",
					},
				},
			},
		},
		"required": []string{"action"},
	}
}

func (t *BrowserTool) Execute(ctx context.Context, args map[string]any) *tools.Result {
	action, _ := args["action"].(string)
	if action == "" {
		return tools.ErrorResult("action is required")
	}

	// Propagate tenant ID from store context to browser context for page isolation.
	if tid := store.TenantIDFromContext(ctx); tid.String() != "00000000-0000-0000-0000-000000000000" {
		ctx = WithTenantID(ctx, tid.String())
	}

	// Auto-start browser for actions that need it
	switch action {
	case "open", "snapshot", "screenshot", "navigate", "act", "tabs", "console", "setCookies":
		if err := t.manager.Start(ctx); err != nil {
			return tools.ErrorResult(fmt.Sprintf("failed to start browser: %v", err))
		}
	}

	// Apply per-action timeout for heavy operations
	switch action {
	case "open", "navigate", "snapshot", "screenshot", "act":
		timeout := t.manager.ActionTimeout()
		if ms, ok := args["timeoutMs"].(float64); ok && ms > 0 {
			timeout = time.Duration(ms) * time.Millisecond
		}
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	switch action {
	case "status":
		return t.handleStatus()
	case "start":
		return t.handleStart(ctx)
	case "stop":
		return t.handleStop(ctx)
	case "restart":
		return t.handleRestart(ctx, args)
	case "tabs":
		return t.handleTabs(ctx)
	case "open":
		return t.handleOpen(ctx, args)
	case "close":
		return t.handleClose(ctx, args)
	case "snapshot":
		return t.handleSnapshot(ctx, args)
	case "screenshot":
		return t.handleScreenshot(ctx, args)
	case "navigate":
		return t.handleNavigate(ctx, args)
	case "console":
		return t.handleConsole(ctx, args)
	case "act":
		return t.handleAct(ctx, args)
	case "setCookies":
		return t.handleSetCookies(ctx, args)
	default:
		return tools.ErrorResult(fmt.Sprintf("unknown action: %s", action))
	}
}

func (t *BrowserTool) handleStatus() *tools.Result {
	status := t.manager.Status()
	return jsonResult(status)
}

func (t *BrowserTool) handleStart(ctx context.Context) *tools.Result {
	if err := t.manager.Start(ctx); err != nil {
		return tools.ErrorResult(fmt.Sprintf("failed to start browser: %v", err))
	}
	return tools.NewResult("Browser started successfully.")
}

func (t *BrowserTool) handleStop(ctx context.Context) *tools.Result {
	if err := t.manager.Stop(ctx); err != nil {
		return tools.ErrorResult(fmt.Sprintf("failed to stop browser: %v", err))
	}
	return tools.NewResult("Browser stopped.")
}

func (t *BrowserTool) handleRestart(ctx context.Context, args map[string]interface{}) *tools.Result {
	headless, ok := args["headless"].(bool)
	if !ok {
		return tools.ErrorResult("headless parameter (true/false) is required for restart action")
	}
	if err := t.manager.SetHeadless(ctx, headless); err != nil {
		return tools.ErrorResult(fmt.Sprintf("failed to switch mode: %v", err))
	}
	// Ensure browser is running after mode change
	if err := t.manager.Start(ctx); err != nil {
		return tools.ErrorResult(fmt.Sprintf("failed to start browser: %v", err))
	}
	mode := "headless"
	if !headless {
		mode = "full (non-headless)"
	}
	return tools.NewResult(fmt.Sprintf("Browser restarted in %s mode.", mode))
}

func (t *BrowserTool) handleTabs(ctx context.Context) *tools.Result {
	tabs, err := t.manager.ListTabs(ctx)
	if err != nil {
		return tools.ErrorResult(err.Error())
	}
	return jsonResult(tabs)
}

func (t *BrowserTool) handleOpen(ctx context.Context, args map[string]any) *tools.Result {
	url, _ := args["targetUrl"].(string)
	if url == "" {
		return tools.ErrorResult("targetUrl is required for open action")
	}

	// Auto-load cookies from configured dir (once per browser session)
	t.manager.AutoLoadCookies(ctx)

	tab, err := t.manager.OpenTab(ctx, url)
	if err != nil {
		return tools.ErrorResult(err.Error())
	}

	// Auto-snapshot after open so the agent has page context immediately.
	// Always use compact + non-interactive to show CONTENT (text, posts, articles),
	// not just buttons. Agent can use snapshot action with interactive=true later.
	opts := DefaultSnapshotOptions()
	opts.Compact = true
	opts.Interactive = false // always show content on open
	if mc, ok := args["maxChars"].(float64); ok && mc > 0 {
		opts.MaxChars = int(mc)
	}
	if d, ok := args["depth"].(float64); ok {
		opts.MaxDepth = int(d)
	}
	snap, snapErr := t.manager.Snapshot(ctx, tab.TargetID, opts)
	if snapErr != nil {
		// Snapshot failed — still return tab info so the agent can proceed
		return jsonResult(tab)
	}

	header := fmt.Sprintf("Page: %s\nURL: %s\nTargetID: %s\nStats: %d refs, %d interactive\n\n",
		snap.Title, snap.URL, snap.TargetID, snap.Stats.Refs, snap.Stats.Interactive)
	return tools.NewResult(header + snap.Snapshot)
}

func (t *BrowserTool) handleClose(ctx context.Context, args map[string]any) *tools.Result {
	targetID, _ := args["targetId"].(string)
	if err := t.manager.CloseTab(ctx, targetID); err != nil {
		return tools.ErrorResult(err.Error())
	}
	return tools.NewResult("Tab closed.")
}

func (t *BrowserTool) handleSnapshot(ctx context.Context, args map[string]any) *tools.Result {
	targetID, _ := args["targetId"].(string)
	opts := DefaultSnapshotOptions()

	if mc, ok := args["maxChars"].(float64); ok {
		opts.MaxChars = int(mc)
	}
	if inter, ok := args["interactive"].(bool); ok {
		opts.Interactive = inter
	}
	if comp, ok := args["compact"].(bool); ok {
		opts.Compact = comp
	}
	if d, ok := args["depth"].(float64); ok {
		opts.MaxDepth = int(d)
	}

	snap, err := t.manager.Snapshot(ctx, targetID, opts)
	if err != nil {
		return tools.ErrorResult(fmt.Sprintf("snapshot failed: %v", err))
	}

	// Return snapshot text directly (optimized for LLM consumption)
	header := fmt.Sprintf("Page: %s\nURL: %s\nTargetID: %s\nStats: %d refs, %d interactive\n\n",
		snap.Title, snap.URL, snap.TargetID, snap.Stats.Refs, snap.Stats.Interactive)
	return tools.NewResult(header + snap.Snapshot)
}

func (t *BrowserTool) handleScreenshot(ctx context.Context, args map[string]any) *tools.Result {
	targetID, _ := args["targetId"].(string)
	fullPage, _ := args["fullPage"].(bool)

	data, err := t.manager.Screenshot(ctx, targetID, fullPage)
	if err != nil {
		return tools.ErrorResult(fmt.Sprintf("screenshot failed: %v", err))
	}

	// Save to workspace/screenshots/ so the agent can access the file.
	// Falls back to os.TempDir() if workspace is not available.
	screenshotDir := filepath.Join(os.TempDir(), "goclaw_screenshots")
	if ws := tools.ToolWorkspaceFromCtx(ctx); ws != "" {
		screenshotDir = filepath.Join(ws, "screenshots")
	}
	if err := os.MkdirAll(screenshotDir, 0755); err != nil {
		return tools.ErrorResult(fmt.Sprintf("failed to create screenshots directory: %v", err))
	}
	imagePath := filepath.Join(screenshotDir, fmt.Sprintf("screenshot_%d.png", time.Now().UnixNano()))
	if err := os.WriteFile(imagePath, data, 0644); err != nil {
		return tools.ErrorResult(fmt.Sprintf("failed to save screenshot: %v", err))
	}

	return &tools.Result{ForLLM: fmt.Sprintf("MEDIA:%s", imagePath)}
}

func (t *BrowserTool) handleNavigate(ctx context.Context, args map[string]any) *tools.Result {
	targetID, _ := args["targetId"].(string)
	url, _ := args["targetUrl"].(string)
	if url == "" {
		return tools.ErrorResult("targetUrl is required for navigate action")
	}

	// Auto-load cookies from configured dir (once per browser session)
	t.manager.AutoLoadCookies(ctx)

	if err := t.manager.Navigate(ctx, targetID, url); err != nil {
		return tools.ErrorResult(err.Error())
	}
	return tools.NewResult(fmt.Sprintf("Navigated to %s", url))
}

func (t *BrowserTool) handleConsole(ctx context.Context, args map[string]any) *tools.Result {
	targetID, _ := args["targetId"].(string)
	msgs := t.manager.ConsoleMessages(ctx, targetID)
	return jsonResult(msgs)
}

func (t *BrowserTool) handleAct(ctx context.Context, args map[string]any) *tools.Result {
	req, ok := args["request"].(map[string]any)
	if !ok {
		return tools.ErrorResult("request object is required for act action")
	}

	kind, _ := req["kind"].(string)
	if kind == "" {
		return tools.ErrorResult("request.kind is required")
	}

	targetID, _ := args["targetId"].(string)

	switch kind {
	case "click":
		ref, _ := req["ref"].(string)
		if ref == "" {
			return tools.ErrorResult("request.ref is required for click")
		}
		opts := ClickOpts{}
		if dc, ok := req["doubleClick"].(bool); ok {
			opts.DoubleClick = dc
		}
		if btn, ok := req["button"].(string); ok {
			opts.Button = btn
		}
		if err := t.manager.Click(ctx, targetID, ref, opts); err != nil {
			return tools.ErrorResult(fmt.Sprintf("click failed: %v", err))
		}
		return tools.NewResult("Clicked successfully.")

	case "type":
		ref, _ := req["ref"].(string)
		if ref == "" {
			return tools.ErrorResult("request.ref is required for type")
		}
		text, _ := req["text"].(string)
		opts := TypeOpts{}
		if sub, ok := req["submit"].(bool); ok {
			opts.Submit = sub
		}
		if sl, ok := req["slowly"].(bool); ok {
			opts.Slowly = sl
		}
		if err := t.manager.Type(ctx, targetID, ref, text, opts); err != nil {
			return tools.ErrorResult(fmt.Sprintf("type failed: %v", err))
		}
		return tools.NewResult("Typed successfully.")

	case "press":
		key, _ := req["key"].(string)
		if key == "" {
			return tools.ErrorResult("request.key is required for press")
		}
		if err := t.manager.Press(ctx, targetID, key); err != nil {
			return tools.ErrorResult(fmt.Sprintf("press failed: %v", err))
		}
		return tools.NewResult(fmt.Sprintf("Pressed %s.", key))

	case "hover":
		ref, _ := req["ref"].(string)
		if ref == "" {
			return tools.ErrorResult("request.ref is required for hover")
		}
		if err := t.manager.Hover(ctx, targetID, ref); err != nil {
			return tools.ErrorResult(fmt.Sprintf("hover failed: %v", err))
		}
		return tools.NewResult("Hovered successfully.")

	case "wait":
		opts := WaitOpts{}
		if ms, ok := req["timeMs"].(float64); ok {
			opts.TimeMs = int(ms)
		}
		if txt, ok := req["text"].(string); ok {
			opts.Text = txt
		}
		if tg, ok := req["textGone"].(string); ok {
			opts.TextGone = tg
		}
		if u, ok := req["url"].(string); ok {
			opts.URL = u
		}
		if fn, ok := req["fn"].(string); ok {
			opts.Fn = fn
		}
		if err := t.manager.Wait(ctx, targetID, opts); err != nil {
			return tools.ErrorResult(fmt.Sprintf("wait failed: %v", err))
		}
		return tools.NewResult("Wait condition met.")

	case "evaluate":
		fn, _ := req["fn"].(string)
		if fn == "" {
			return tools.ErrorResult("request.fn is required for evaluate")
		}
		result, err := t.manager.Evaluate(ctx, targetID, fn)
		if err != nil {
			return tools.ErrorResult(fmt.Sprintf("evaluate failed: %v", err))
		}
		return tools.NewResult(result)

	default:
		return tools.ErrorResult(fmt.Sprintf("unknown act kind: %s", kind))
	}
}

func (t *BrowserTool) handleSetCookies(ctx context.Context, args map[string]any) *tools.Result {
	cookiesFile, _ := args["cookiesFile"].(string)
	if cookiesFile == "" {
		return tools.ErrorResult("cookiesFile parameter is required for setCookies action")
	}
	count, err := t.manager.SetCookiesFromFile(ctx, cookiesFile)
	if err != nil {
		return tools.ErrorResult(fmt.Sprintf("failed to set cookies: %v", err))
	}
	return tools.NewResult(fmt.Sprintf("Successfully set %d cookies from %s. You can now open/navigate to the target site with an authenticated session.", count, cookiesFile))
}

func jsonResult(v any) *tools.Result {
	data, _ := json.MarshalIndent(v, "", "  ")
	return tools.NewResult(string(data))
}
