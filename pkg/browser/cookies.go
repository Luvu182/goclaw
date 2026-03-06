package browser

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

// ExtCookie is the cookie format exported by browser extensions (EditThisCookie, Cookie-Editor).
type ExtCookie struct {
	Name           string  `json:"name"`
	Value          string  `json:"value"`
	Domain         string  `json:"domain"`
	Path           string  `json:"path"`
	Secure         bool    `json:"secure"`
	HttpOnly       bool    `json:"httpOnly"`
	SameSite       string  `json:"sameSite"`
	ExpirationDate float64 `json:"expirationDate,omitempty"`
}

// SetCookiesFromFile loads cookies from a JSON file and sets them in the browser.
// Returns the number of cookies successfully set.
func (m *Manager) SetCookiesFromFile(ctx context.Context, cookiesFile string) (int, error) {
	data, err := os.ReadFile(cookiesFile)
	if err != nil {
		return 0, fmt.Errorf("read cookies file: %w", err)
	}

	var cookies []ExtCookie
	if err := json.Unmarshal(data, &cookies); err != nil {
		return 0, fmt.Errorf("parse cookies JSON: %w", err)
	}

	return m.setCookies(ctx, cookies)
}

// setCookies sets cookies in the browser via CDP Network.setCookie.
func (m *Manager) setCookies(ctx context.Context, cookies []ExtCookie) (int, error) {
	page, err := m.getOrCreateBlankPage()
	if err != nil {
		return 0, err
	}

	count := 0
	for _, c := range cookies {
		setCookie := proto.NetworkSetCookie{
			Name:     c.Name,
			Value:    c.Value,
			Domain:   c.Domain,
			Path:     c.Path,
			Secure:   c.Secure,
			HTTPOnly: c.HttpOnly,
			SameSite: mapSameSite(c.SameSite),
		}
		if c.ExpirationDate > 0 {
			setCookie.Expires = proto.TimeSinceEpoch(c.ExpirationDate)
		}

		result, err := setCookie.Call(page)
		if err != nil {
			m.logger.Warn("cookie.set failed", "name", c.Name, "error", err)
			continue
		}
		if result != nil && !result.Success {
			m.logger.Warn("cookie.set rejected", "name", c.Name)
			continue
		}
		count++
	}

	m.logger.Info("cookies loaded", "set", count, "total", len(cookies))
	return count, nil
}

// getOrCreateBlankPage returns an existing page or creates about:blank.
func (m *Manager) getOrCreateBlankPage() (*rod.Page, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.browser == nil {
		return nil, fmt.Errorf("browser not running")
	}

	pages, err := m.browser.Pages()
	if err != nil {
		return nil, fmt.Errorf("list pages: %w", err)
	}
	if len(pages) > 0 {
		return pages[0], nil
	}

	page, err := m.browser.Page(proto.TargetCreateTarget{URL: "about:blank"})
	if err != nil {
		return nil, fmt.Errorf("create blank page: %w", err)
	}
	return page, nil
}

// AutoLoadCookies scans the cookiesDir for JSON files and loads all cookies.
// Called once per browser session (skips if already loaded or no dir configured).
func (m *Manager) AutoLoadCookies(ctx context.Context) {
	if m.cookiesDir == "" || m.cookiesLoaded {
		return
	}
	m.cookiesLoaded = true

	entries, err := os.ReadDir(m.cookiesDir)
	if err != nil {
		if !os.IsNotExist(err) {
			m.logger.Warn("cookies dir read failed", "dir", m.cookiesDir, "error", err)
		}
		return
	}

	totalLoaded := 0
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		path := filepath.Join(m.cookiesDir, e.Name())
		n, err := m.SetCookiesFromFile(ctx, path)
		if err != nil {
			m.logger.Warn("auto-load cookies failed", "file", e.Name(), "error", err)
			continue
		}
		if n > 0 {
			m.logger.Info("auto-loaded cookies", "file", e.Name(), "count", n)
			totalLoaded += n
		}
	}

	if totalLoaded > 0 {
		m.logger.Info("cookies auto-loaded total", "count", totalLoaded)
	}
}

func mapSameSite(s string) proto.NetworkCookieSameSite {
	switch s {
	case "strict":
		return proto.NetworkCookieSameSiteStrict
	case "lax":
		return proto.NetworkCookieSameSiteLax
	case "no_restriction":
		return proto.NetworkCookieSameSiteNone
	default:
		return ""
	}
}
