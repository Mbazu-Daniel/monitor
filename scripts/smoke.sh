#!/usr/bin/env bash
set -u
BASE="${SMOKE_BASE:-http://localhost:5173}"
PASS=0; FAIL=0
note() { printf '%s\n' "$*"; }
ok()   { PASS=$((PASS+1)); note "PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); note "FAIL  $1 (expected: $2)"; }
check() { local desc="$1" want="$2" got="$3"; [ "$got" = "$want" ] && ok "$desc" || bad "$desc" "$want, got $got"; }
code() { curl -s -o /tmp/smoke-body.json -w '%{http_code}' -b "$2" -X "${4:-GET}" "$1" ${3:+-H "Content-Type: application/json" -d "$3"}; }
note "MivaCampus smoke test against $BASE"
code "$BASE/api/health"  /dev/null
note "sanity: $(cat /tmp/smoke-body.json)"
code "$BASE/api/stats"   /dev/null

signin() { curl -s -c "/tmp/smoke-$1.jar" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/sign-in/email" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"$3\"}"; }
check "admin sign-in"   200 "$(signin admin admin@university.edu Admin@123)"
check "staff sign-in"   200 "$(signin staff staff2@university.edu Staff@123)"
check "officer sign-in" 200 "$(signin officer officer1@university.edu Officer@123)"

check "unauthenticated /api/stats/personal -> 401" 401 "$(code "$BASE/api/stats/personal" /dev/null)"
check "staff /api/users -> 403"          403 "$(code "$BASE/api/users" /tmp/smoke-staff.jar)"
check "officer /api/audit-logs -> 403"    403 "$(code "$BASE/api/audit-logs" /tmp/smoke-officer.jar)"
check "staff /api/export/requests -> 403" 403 "$(code "$BASE/api/export/requests" /tmp/smoke-staff.jar)"
check "admin /api/users -> 200"           200 "$(code "$BASE/api/users" /tmp/smoke-admin.jar)"
check "staff /api/stats/personal -> 200"    200 "$(code "$BASE/api/stats/personal" /tmp/smoke-staff.jar)"

CAT=$(curl -s -b /tmp/smoke-staff.jar "$BASE/api/categories" | python3 -c "import json,sys; print(json.load(sys.stdin)['categories'][0]['id'])")
CREATED=$(curl -s -b /tmp/smoke-staff.jar -X POST "$BASE/api/requests" -H 'Content-Type: application/json' -d "{\"title\":\"Smoke test request: leaking tap\",\"description\":\"The tap in the teaching block staff room drips constantly and wastes water all day long.\",\"categoryId\":\"$CAT\",\"location\":\"Block B, Staff Room\",\"priority\":\"LOW\"}")
REQ=$(printf '%s' "$CREATED" | python3 -c "import json,sys; print(json.load(sys.stdin)['request']['id'])" 2>/dev/null)
check "create request" 201 "$(printf '%s' "$CREATED" | python3 -c "import json,sys; d=json.load(sys.stdin); print(201 if d.get('request') else 0)")"
check "created request is OPEN" OPEN "$(curl -s -b /tmp/smoke-staff.jar "$BASE/api/requests/$REQ" | python3 -c "import json,sys; print(json.load(sys.stdin)['request']['status'])")"
DEL=$(curl -s -o /dev/null -w '%{http_code}' -b /tmp/smoke-staff.jar -X DELETE "$BASE/api/requests/$REQ")
check "delete own request" 200 "$DEL"

curl -s -b /tmp/smoke-admin.jar "$BASE/api/export/requests" > /tmp/smoke-export.csv -w 'export: %{http_code}\n'
python3 -c "import sys; d=open('/tmp/smoke-export.csv','rb').read(); sys.exit(0 if d.startswith(b'\xef\xbb\xbf') else 1)" && ok "export has UTF-8 BOM" || bad "export BOM" "ef BB BF"

curl -s -b /tmp/smoke-admin.jar -o /dev/null -w 'sse stream: %{http_code}, %{content_type}\n' --max-time 2 -N "$BASE/api/realtime/stream" || true

check "validation 400 on short title" 400 "$(code "$BASE/api/requests" /tmp/smoke-staff.jar '{"title":"x","description":"too short","categoryId":"'$CAT'","location":"B","priority":"LOW"}' POST)"

note ""
note "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
