#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Books for Agents — Installer
# https://booksforagents.com
#
# Usage: curl -fsSL https://booksforagents.com/install.sh | bash
# ──────────────────────────────────────────────

MCP_URL="https://booksforagents.com/mcp"
SERVER_NAME="books-for-agents"

# ── Colors ────────────────────────────────────
bold='\033[1m'
green='\033[0;32m'
yellow='\033[0;33m'
red='\033[0;31m'
cyan='\033[0;36m'
dim='\033[2m'
reset='\033[0m'

info()    { printf "${cyan}ℹ${reset} %s\n" "$1"; }
success() { printf "${green}✓${reset} %s\n" "$1"; }
warn()    { printf "${yellow}⚠${reset} %s\n" "$1"; }
error()   { printf "${red}✗${reset} %s\n" "$1"; }

# ── Detect OS ─────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin)  OS="macOS" ;;
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        OS="WSL"
      else
        OS="Linux"
      fi
      ;;
    *)
      error "Unsupported operating system: $(uname -s)"
      exit 1
      ;;
  esac
}

# ── Find Python ───────────────────────────────
find_python() {
  if command -v python3 &>/dev/null; then
    PYTHON="python3"
  elif command -v python &>/dev/null; then
    PYTHON="python"
  else
    PYTHON=""
  fi
}

# ── Prompt user for choice ────────────────────
choose() {
  local prompt="$1"
  shift
  local options=("$@")

  printf "\n${bold}%s${reset}\n" "$prompt"
  for i in "${!options[@]}"; do
    printf "  ${cyan}%d)${reset} %s\n" "$((i + 1))" "${options[$i]}"
  done
  printf "\n"

  while true; do
    printf "${dim}>${reset} "
    read -r choice </dev/tty
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
      CHOICE="$choice"
      return
    fi
    printf "  ${dim}Please enter a number between 1 and %d${reset}\n" "${#options[@]}"
  done
}

# ── JSON merge via Python ─────────────────────
# Reads existing JSON config, adds books-for-agents entry under mcpServers,
# preserves all other keys. Returns 0 on success, 1 if already exists, 2 on error.
# Pass "stdio" as $2 to use npx mcp-remote (for Claude Desktop), or "url" for direct URL.
merge_json_config() {
  local config_path="$1"
  local transport_mode="${2:-url}"

  $PYTHON - "$config_path" "$MCP_URL" "$SERVER_NAME" "$transport_mode" <<'PYEOF'
import json, sys, os

config_path    = sys.argv[1]
mcp_url        = sys.argv[2]
server_name    = sys.argv[3]
transport_mode = sys.argv[4]

# Read existing config or start fresh
if os.path.exists(config_path):
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
    except json.JSONDecodeError:
        print("ERROR:Invalid JSON in " + config_path, file=sys.stderr)
        sys.exit(2)
else:
    config = {}

# Ensure mcpServers key exists
if "mcpServers" not in config:
    config["mcpServers"] = {}

# Check if already installed
if server_name in config["mcpServers"]:
    sys.exit(1)

# Add the server
if transport_mode == "stdio":
    config["mcpServers"][server_name] = {
        "command": "npx",
        "args": ["-y", "mcp-remote", mcp_url]
    }
else:
    config["mcpServers"][server_name] = {"url": mcp_url}

# Write back
os.makedirs(os.path.dirname(config_path) or ".", exist_ok=True)
with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
    f.write("\n")

sys.exit(0)
PYEOF
}

# ── Get config path for Claude Desktop ────────
get_claude_desktop_path() {
  case "$OS" in
    macOS) echo "$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
    Linux) echo "$HOME/.config/Claude/claude_desktop_config.json" ;;
    WSL)
      local winuser
      winuser=$(cmd.exe /C "echo %USERNAME%" 2>/dev/null | tr -d '\r' || echo "$USER")
      echo "/mnt/c/Users/$winuser/AppData/Roaming/Claude/claude_desktop_config.json"
      ;;
  esac
}

# ── Install: Claude Desktop ──────────────────
install_claude_desktop() {
  if [ -z "$PYTHON" ]; then
    error "Python is required for Claude Desktop installation but was not found."
    error "Please install Python 3 and try again."
    exit 1
  fi

  local config_path
  config_path="$(get_claude_desktop_path)"

  info "Config file: $config_path"

  local result=0
  merge_json_config "$config_path" "stdio" || result=$?

  case $result in
    0)
      success "Added $SERVER_NAME to $config_path (via npx mcp-remote)"
      printf "\n  ${dim}Requires Node.js. Restart Claude Desktop to activate.${reset}\n"
      ;;
    1)
      warn "$SERVER_NAME is already configured in $config_path"
      printf "  ${dim}No changes made.${reset}\n"
      ;;
    *)
      error "Failed to update config file."
      exit 1
      ;;
  esac
}

# ── Install: Claude Code ─────────────────────
install_claude_code() {
  if ! command -v claude &>/dev/null; then
    error "'claude' CLI not found in PATH."
    error "Install Claude Code first: https://docs.anthropic.com/en/docs/claude-code/overview"
    exit 1
  fi

  local scope_flag=""

  choose "Scope:" "Global (all projects)" "Current project only"
  if [ "$CHOICE" -eq 1 ]; then
    scope_flag="--scope user"
  fi

  # Check if already added (claude mcp list returns JSON)
  if claude mcp list 2>/dev/null | grep -q "$SERVER_NAME"; then
    warn "$SERVER_NAME is already configured in Claude Code."
    printf "  ${dim}No changes made.${reset}\n"
    return
  fi

  # shellcheck disable=SC2086
  claude mcp add --transport http $scope_flag "$SERVER_NAME" "$MCP_URL"

  success "Added $SERVER_NAME to Claude Code${scope_flag:+ (global)}."
  printf "\n  ${dim}Start a new session to use it.${reset}\n"
}

# ── Install: Cursor ───────────────────────────
install_cursor() {
  if [ -z "$PYTHON" ]; then
    error "Python is required for Cursor installation but was not found."
    error "Please install Python 3 and try again."
    exit 1
  fi

  local config_path=".cursor/mcp.json"

  info "Config file: $(pwd)/$config_path"

  local result=0
  merge_json_config "$config_path" || result=$?

  case $result in
    0)
      success "Added $SERVER_NAME to $config_path"
      printf "\n  ${dim}Restart Cursor to activate.${reset}\n"
      ;;
    1)
      warn "$SERVER_NAME is already configured in $config_path"
      printf "  ${dim}No changes made.${reset}\n"
      ;;
    *)
      error "Failed to update config file."
      exit 1
      ;;
  esac
}

# ── Main ──────────────────────────────────────
main() {
  printf "\n${bold}📚 Books for Agents — Installer${reset}\n"

  detect_os
  find_python

  info "Detected: $OS"

  choose "Where do you want to install?" "Claude Desktop" "Claude Code" "Cursor"

  case "$CHOICE" in
    1) install_claude_desktop ;;
    2) install_claude_code ;;
    3) install_cursor ;;
  esac

  printf "\n${dim}Learn more: https://booksforagents.com${reset}\n\n"
}

main
