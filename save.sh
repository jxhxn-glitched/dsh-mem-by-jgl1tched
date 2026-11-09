#!/bin/sh
# dsh-mem save helper: save.sh (summary|note|session) "text"
[ $# -ge 2 ] || { echo "usage: save.sh (summary|note|session) text" >&2; exit 2; }
K="$1"; T="$2"
D="$HOME/.dsh/dsh-mem"
E="$D/entries"
mkdir -p "$E"
ID="$(date +%Y%m%d-%H%M%S%-3N 2>/dev/null || date +%Y%m%d-%H%M%S)-$(date +%N | tail -c 4)"
ID="$(echo "$ID" | tr -d ' ')"
F="$E/$ID.json"
cat > "$F" <<EOF
{"id":"$ID","at":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)","kind":"$K","text":$(printf '%s' "$T" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),"sessionId":null}
EOF
C=$(ls -1 "$E" | wc -l)
printf '{"count":%s,"lastAt":"%s"}\n' "$C" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$D/state.json"
echo "saved: $ID (kind=$K, total=$C)"
