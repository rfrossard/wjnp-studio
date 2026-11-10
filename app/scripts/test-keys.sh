#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
set -a; source "$DIR/.env"; set +a

PASS=0; FAIL=0

check() {
  local name=$1 status=$2 expect=$3 detail=$4
  if [ "$status" = "$expect" ]; then
    echo "✓  $name"
    PASS=$((PASS+1))
  else
    echo "✗  $name  (HTTP $status) — $detail"
    FAIL=$((FAIL+1))
  fi
}

echo "──────────────────────────────────────"
echo "  Testando chaves de API"
echo "──────────────────────────────────────"

# Anthropic
if [ -n "${ANTHROPIC_API_KEY:-}" ] && [[ "$ANTHROPIC_API_KEY" != sk-ant-... ]]; then
  R=$(curl -s -o /tmp/wjnp_ant.json -w "%{http_code}" https://api.anthropic.com/v1/models \
    -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01")
  DETAIL=$(python3 -c "import json,sys;d=json.load(open('/tmp/wjnp_ant.json'));print(d.get('error',{}).get('message','?'))" 2>/dev/null || echo "")
  check "Anthropic" "$R" "200" "$DETAIL"
else
  echo "–  Anthropic  (chave não configurada)"
fi

# OpenAI
if [ -n "${OPENAI_API_KEY:-}" ]; then
  R=$(curl -s -o /tmp/wjnp_oai.json -w "%{http_code}" https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY")
  DETAIL=$(python3 -c "import json,sys;d=json.load(open('/tmp/wjnp_oai.json'));print(d.get('error',{}).get('message','?'))" 2>/dev/null || echo "")
  check "OpenAI" "$R" "200" "$DETAIL"
fi

# ElevenLabs
if [ -n "${ELEVENLABS_API_KEY:-}" ]; then
  R=$(curl -s -o /tmp/wjnp_el.json -w "%{http_code}" https://api.elevenlabs.io/v1/user \
    -H "xi-api-key: $ELEVENLABS_API_KEY")
  DETAIL=$(python3 -c "import json,sys;d=json.load(open('/tmp/wjnp_el.json'));sub=d.get('subscription',{});print(f\"tier={sub.get('tier','?')} chars_usados={sub.get('character_count','?')}\")" 2>/dev/null || echo "")
  check "ElevenLabs" "$R" "200" "$DETAIL"
fi

# DeepSeek
if [ -n "${DEEPSEEK_API_KEY:-}" ]; then
  R=$(curl -s -o /tmp/wjnp_ds.json -w "%{http_code}" https://api.deepseek.com/v1/models \
    -H "Authorization: Bearer $DEEPSEEK_API_KEY")
  DETAIL=$(python3 -c "import json,sys;d=json.load(open('/tmp/wjnp_ds.json'));ms=[m['id'] for m in d.get('data',[])];print(','.join(ms))" 2>/dev/null || echo "")
  check "DeepSeek" "$R" "200" "$DETAIL"
fi

echo "──────────────────────────────────────"
echo "  $PASS ok  |  $FAIL falhou"
echo "──────────────────────────────────────"
