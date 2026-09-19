#!/usr/bin/env sh
# Optional local toolchain installed by Codex. A normal global Rust/CLI works too.
set -eu
BRIDGE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ -x "$BRIDGE_ROOT/.toolchain/cargo/bin/cargo" ]; then
  export PATH="$BRIDGE_ROOT/.toolchain/cargo/bin:$PATH"
  export RUSTUP_HOME="$BRIDGE_ROOT/.toolchain/rustup"
  export CARGO_HOME="$BRIDGE_ROOT/.toolchain/cargo"
fi
exec "$@"
