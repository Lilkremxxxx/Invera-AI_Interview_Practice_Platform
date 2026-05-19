#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FAKE_BIN="$TMP_DIR/bin"
FAKE_HOME="$TMP_DIR/home"
mkdir -p "$FAKE_BIN" "$FAKE_HOME"

cat > "$FAKE_BIN/systemctl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exit 0
EOF
chmod +x "$FAKE_BIN/systemctl"

unset USER
export HOME="$FAKE_HOME"
export PATH="$FAKE_BIN:$PATH"

"$PROJECT_ROOT/scripts/install_user_services.sh"

test -f "$FAKE_HOME/.config/systemd/user/invera.target"
test -f "$FAKE_HOME/.config/systemd/user/invera-backend.service"
test -f "$FAKE_HOME/.config/systemd/user/invera-frontend.service"
test -f "$FAKE_HOME/.config/systemd/user/cloudflared.service"
test -f "$FAKE_HOME/.config/invera/cloudflared.yml"
