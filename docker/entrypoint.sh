#!/bin/sh

set -eu

APP_DIR="${APP_DIR:-/app}"
cd "$APP_DIR"

log() { printf '[docker] %s\n' "$*" >&2; }

want="$(cat package.json bun.lock 2>/dev/null | sha256sum | cut -d' ' -f1)"
have="$(cat node_modules/.install-stamp 2>/dev/null || true)"
if [ "$want" != "$have" ]; then
	log "package.json / bun.lock changed since this image was built: running bun install"
	bun install --frozen-lockfile --ignore-scripts
	printf '%s' "$want" > node_modules/.install-stamp
	rm -rf .wxt
fi

if [ ! -f .wxt/tsconfig.json ]; then
	log "generating .wxt types"
	bunx wxt prepare >/dev/null
fi

if [ -z "${HOST_UID:-}" ] || [ "${HOST_UID}" = "0" ]; then
	exec "$@"
fi

fix_ownership() {
	for path in .output .wxt coverage playwright-report test-results; do
		if [ -e "$path" ]; then
			chown -R "${HOST_UID}:${HOST_GID:-$HOST_UID}" "$path" 2>/dev/null || true
		fi
	done
}

if [ -t 0 ]; then
	set +e
	"$@"
	status=$?
	set -e
	fix_ownership
	exit "$status"
fi

child=""
forward() {
	if [ -n "$child" ]; then
		kill -s "$1" "$child" 2>/dev/null || true
	fi
}
trap 'forward TERM' TERM
trap 'forward INT' INT

"$@" &
child=$!

set +e
wait "$child"
status=$?
while kill -0 "$child" 2>/dev/null; do
	wait "$child"
	status=$?
done
set -e

fix_ownership
exit "$status"
