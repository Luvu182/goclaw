package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"time"
)

// ClaudeCodeTool delegates tasks to Claude Code CLI running on a remote VPS via SSH.
type ClaudeCodeTool struct{}

func NewClaudeCodeTool() *ClaudeCodeTool { return &ClaudeCodeTool{} }

func (t *ClaudeCodeTool) Name() string { return "claude_code" }

func (t *ClaudeCodeTool) Description() string {
	return `Delegate a task to Claude Code, an AI coding agent already running on a remote server.
The prompt you provide is sent directly to Claude Code which already has full local access to that server's filesystem, terminal, and tools.
Do NOT tell Claude Code to "SSH into" or "connect to" the server — it is already there. Just describe the task.
Good prompt: "List projects in /var and identify their tech stacks"
Bad prompt: "SSH into the server and list projects in /var"
Claude Code will autonomously execute commands, read/edit files, and complete the task, then return the result.
To continue a previous session, pass the session_id from the previous result.`
}

func (t *ClaudeCodeTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"host": map[string]any{
				"type":        "string",
				"description": "SSH target, e.g. root@10.0.0.5 or user@myserver.com",
			},
			"port": map[string]any{
				"type":        "number",
				"description": "SSH port (default: 22)",
			},
			"prompt": map[string]any{
				"type":        "string",
				"description": "The task description for Claude Code to execute",
			},
			"working_dir": map[string]any{
				"type":        "string",
				"description": "Directory to cd into on the remote server before running Claude Code",
			},
			"session_id": map[string]any{
				"type":        "string",
				"description": "Resume a previous Claude Code session by its ID",
			},
			"max_turns": map[string]any{
				"type":        "number",
				"description": "Maximum agent turns (default: 50)",
			},
		},
		"required": []string{"host", "prompt"},
	}
}

// claudeCodeResult is the JSON output from `claude -p --output-format json`.
type claudeCodeResult struct {
	Result    string  `json:"result"`
	SessionID string  `json:"session_id"`
	CostUSD   float64 `json:"cost_usd"`
	Model     string  `json:"model"`
}

func (t *ClaudeCodeTool) Execute(ctx context.Context, args map[string]any) *Result {
	host, _ := args["host"].(string)
	port := 22
	if p, ok := args["port"].(float64); ok && p > 0 {
		port = int(p)
	}
	prompt, _ := args["prompt"].(string)
	workingDir, _ := args["working_dir"].(string)
	sessionID, _ := args["session_id"].(string)
	maxTurns := 50
	if mt, ok := args["max_turns"].(float64); ok && mt > 0 {
		maxTurns = int(mt)
	}

	if host == "" {
		return ErrorResult("host is required")
	}
	if prompt == "" {
		return ErrorResult("prompt is required")
	}

	// Build the remote command.
	// SSH non-interactive doesn't load .bashrc/.profile, so prepend common binary paths.
	escapedPrompt := shellEscapeSingleQuote(prompt)
	remoteCmd := fmt.Sprintf("export PATH=$PATH:/root/.local/bin:/usr/local/bin && claude -p '%s' --output-format json --max-turns %d", escapedPrompt, maxTurns)
	if sessionID != "" {
		remoteCmd += fmt.Sprintf(" --resume '%s'", shellEscapeSingleQuote(sessionID))
	}
	if workingDir != "" {
		remoteCmd = fmt.Sprintf("cd '%s' && %s", shellEscapeSingleQuote(workingDir), remoteCmd)
	}

	slog.Info("claude_code: executing",
		"host", host,
		"working_dir", workingDir,
		"session_id", sessionID,
		"max_turns", maxTurns,
		"prompt_len", len(prompt),
	)

	// 10 minute timeout — Claude Code tasks can run long.
	execCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	sshArgs := []string{
		"-i", "/tmp/.goclaw-ssh/id_ed25519",
		"-o", "StrictHostKeyChecking=no",
		"-o", "ConnectTimeout=10",
		"-o", "ServerAliveInterval=30",
		"-o", "ServerAliveCountMax=20",
		"-o", "UserKnownHostsFile=/dev/null",
		"-p", fmt.Sprintf("%d", port),
		host,
		remoteCmd,
	}

	cmd := exec.CommandContext(execCtx, "ssh", sshArgs...)

	stdout := &limitedBuffer{max: 2 << 20} // 2MB for Claude Code output
	stderr := &limitedBuffer{max: 256 << 10}
	cmd.Stdout = stdout
	cmd.Stderr = stderr

	err := cmd.Run()
	if err != nil {
		if errors.Is(execCtx.Err(), context.DeadlineExceeded) {
			return ErrorResult("claude_code timed out after 10 minutes")
		}
		errMsg := stderr.String()
		if errMsg == "" {
			errMsg = err.Error()
		}
		return ErrorResult(fmt.Sprintf("claude_code SSH failed: %s", errMsg))
	}

	// Parse JSON output from Claude Code.
	raw := stdout.String()
	var ccResult claudeCodeResult
	if err := json.Unmarshal([]byte(raw), &ccResult); err != nil {
		// JSON parse failed — return raw output (Claude Code might have printed plain text).
		slog.Warn("claude_code: failed to parse JSON output, returning raw", "error", err)
		if raw == "" {
			raw = "(claude_code completed with no output)"
		}
		return SilentResult(raw)
	}

	// Format result for the agent.
	var sb strings.Builder
	sb.WriteString(ccResult.Result)
	sb.WriteString("\n\n---\n")
	if ccResult.SessionID != "" {
		sb.WriteString(fmt.Sprintf("Session ID: %s (use this to continue the conversation)\n", ccResult.SessionID))
	}
	if ccResult.CostUSD > 0 {
		sb.WriteString(fmt.Sprintf("Cost: $%.4f\n", ccResult.CostUSD))
	}
	if ccResult.Model != "" {
		sb.WriteString(fmt.Sprintf("Model: %s\n", ccResult.Model))
	}

	slog.Info("claude_code: completed",
		"host", host,
		"session_id", ccResult.SessionID,
		"cost_usd", ccResult.CostUSD,
		"result_len", len(ccResult.Result),
	)

	return SilentResult(sb.String())
}

// shellEscapeSingleQuote escapes a string for use inside single quotes in shell.
// Replaces ' with '\'' (end quote, escaped quote, start quote).
func shellEscapeSingleQuote(s string) string {
	return strings.ReplaceAll(s, "'", `'\''`)
}

