#!/usr/bin/env bash
# =============================================================================
# End-to-End test for the Swimming Club application.
#
# Exercises the full realistic flow across the supported REST API:
#   1. Auth            - register admin, verify email, login (OTP), /me
#   2. Club onboarding - step 1 (club info), step 2 (invite coach), step 3 (submit)
#   3. Admin approve   - super_admin lists pending, approves club
#   4. Tryout          - create draft, then publish (open)
#   5. Parent flow     - register parent, login, register swimmers on slots,
#                        fill capacity, join waitlist, cancel registration,
#                        re-register from waitlist, promote waitlisted reg
#   6. Groups          - create / list / update / delete
#   7. Scoring roster  - score every registration (strokes + detailed + group rec)
#   8. Leaderboard     - generate ranked leadership board from scores
#   9. Offer / Reject  - admin decision per swimmer (offered/rejected)
#
# Dev-mode notes:
#   * Any 6-digit OTP is accepted (NODE_ENV=development bypass).
#   * The email-verification token is hashed in DB, so we mark the user
#     verified via mongosh (simulating the user clicking the email link).
#   * A registration with status "waitlisted" cannot be produced via the
#     create API (slot-capacity gates before session-capacity), so one is
#     seeded via mongosh to exercise the promote endpoint.
# =============================================================================
set -u
BASE="http://localhost:5000/api/v1"
DB="swimming_app"
SUF="$(date +%s)"
PASS=0; FAIL=0

# ---------- helpers ----------
c() { printf '\033[1;36m'; }   # cyan
g() { printf '\033[1;32m'; }   # green
r() { printf '\033[1;31m'; }   # red
y() { printf '\033[1;33m'; }   # yellow
d() { printf '\033[0m'; }

section() { echo; c; echo "════════════════════════════════════════════════════════════"; echo "  $1"; echo "════════════════════════════════════════════════════════════"; d; }
step()    { echo; y; echo "▶ $1"; d; }
ok()      { g; echo "  ✓ $1"; d; PASS=$((PASS+1)); }
bad()     { r; echo "  ✗ $1"; d; FAIL=$((FAIL+1)); }

# jq helpers: .data field extraction
jdata() { jq -r '.data // empty'; }
jval()  { jq -r "$1 // empty"; }

# POST JSON helper: args: path, json body, [token] -> prints response
post() {
  local url="$1" body="$2" tok="${3:-}"
  if [ -n "$tok" ]; then
    curl -s -X POST "$BASE$url" -H "Content-Type: application/json" -H "Authorization: Bearer $tok" -d "$body"
  else
    curl -s -X POST "$BASE$url" -H "Content-Type: application/json" -d "$body"
  fi
}
# GET helper: args: path, [token]
get() {
  local url="$1" tok="${2:-}"
  if [ -n "$tok" ]; then
    curl -s -X GET "$BASE$url" -H "Authorization: Bearer $tok"
  else
    curl -s -X GET "$BASE$url"
  fi
}
# PUT helper: args: path, json body, [token]
put() {
  local url="$1" body="$2" tok="${3:-}"
  if [ -n "$tok" ]; then
    curl -s -X PUT "$BASE$url" -H "Content-Type: application/json" -H "Authorization: Bearer $tok" -d "$body"
  else
    curl -s -X PUT "$BASE$url" -H "Content-Type: application/json" -d "$body"
  fi
}
# PATCH helper: args: path, [token]
patch() {
  local url="$1" tok="${2:-}"
  if [ -n "$tok" ]; then
    curl -s -X PATCH "$BASE$url" -H "Authorization: Bearer $tok"
  else
    curl -s -X PATCH "$BASE$url"
  fi
}
# DELETE helper: args: path, [token]
del() {
  local url="$1" tok="${2:-}"
  if [ -n "$tok" ]; then
    curl -s -X DELETE "$BASE$url" -H "Authorization: Bearer $tok"
  else
    curl -s -X DELETE "$BASE$url"
  fi
}

# mark a user email verified in DB (simulates clicking the email link)
verify_email_db() {
  mongosh --quiet "$DB" --eval "db.users.updateOne({email:'$1'}, {\$set:{emailVerified:true, status:'active'}})" >/dev/null
}

# seed a waitlisted registration in DB (unreachable via create API)
seed_waitlisted_reg() {
  mongosh --quiet "$DB" --eval "db.registrations.updateOne({_id:ObjectId('$1')}, {\$set:{status:'waitlisted', waitlistPosition:1}})" >/dev/null
}

echo "$(c)Swimming App — End-to-End Test$(d)   (suffix=$SUF)"

# =============================================================================
section "0. SUPER ADMIN LOGIN"
step "Login as existing super_admin (dev OTP bypass)"
post "/auth/login" '{"email":"superadmin@yopmail.com"}' >/dev/null
SA_TOKEN=$(post "/auth/verify-otp" '{"email":"superadmin@yopmail.com","otp":"123456"}' | jdata | jval '.token')
if [ -n "$SA_TOKEN" ]; then ok "super_admin token acquired"; else bad "super_admin login failed"; exit 1; fi
SA_ME=$(get "/auth/me" "$SA_TOKEN")
echo "  super_admin: $(echo "$SA_ME" | jval '.data.user.email') ($(echo "$SA_ME" | jval '.data.user.role'))"

# =============================================================================
section "1. AUTH — register admin, verify, login"
ADMIN_EMAIL="sarah.mitchell.e2e+${SUF}@yopmail.com"
step "POST /auth/register (creates pending admin, sends verification email)"
REG=$(post "/auth/register" "{\"email\":\"$ADMIN_EMAIL\",\"firstName\":\"Sarah\",\"lastName\":\"Mitchell\"}")
echo "$REG" | jval '.success' | grep -q true && ok "register accepted" || bad "register failed: $REG"

step "Simulate email verification click (mark verified in DB)"
verify_email_db "$ADMIN_EMAIL"; ok "admin email marked verified"

step "POST /auth/login + /auth/verify-otp (dev OTP bypass)"
post "/auth/login" "{\"email\":\"$ADMIN_EMAIL\"}" >/dev/null
ADMIN_TOKEN=$(post "/auth/verify-otp" "{\"email\":\"$ADMIN_EMAIL\",\"otp\":\"123456\"}" | jdata | jval '.token')
if [ -n "$ADMIN_TOKEN" ]; then ok "admin token acquired"; else bad "admin login failed"; exit 1; fi

step "GET /auth/me"
ADMIN_ME=$(get "/auth/me" "$ADMIN_TOKEN")
echo "  admin: $(echo "$ADMIN_ME" | jval '.data.user.email') | role=$(echo "$ADMIN_ME" | jval '.data.user.role') | onboardingStep=$(echo "$ADMIN_ME" | jval '.data.user.onboardingStep') | clubId=$(echo "$ADMIN_ME" | jval '.data.user.clubId')"

# =============================================================================
section "2. CLUB ONBOARDING (admin)"
step "PUT /onboarding/step/1 — save club info"
S1=$(put "/onboarding/step/1" '{"name":"Bay Area Aquatics Club","address":"500 Aquatic Center Dr, San Jose, CA 95112","phone":"+1-408-555-0142","clubSize":"medium","region":"West"}' "$ADMIN_TOKEN")
CLUB_ID=$(echo "$S1" | jdata | jval '.club._id')
echo "$S1" | jval '.success' | grep -q true && [ -n "$CLUB_ID" ] && ok "club draft created (id=$CLUB_ID)" || bad "step1 failed: $S1"

step "GET /onboarding/status"
ST=$(get "/onboarding/status" "$ADMIN_TOKEN")
echo "  step=$(echo "$ST" | jdata | jval '.step') | club=$(echo "$ST" | jdata | jval '.club.name') | status=$(echo "$ST" | jdata | jval '.club.status')"

step "PUT /onboarding/step/2 — invite a coach"
COACH_EMAIL="coach.mike.e2e+${SUF}@yopmail.com"
S2=$(put "/onboarding/step/2" "{\"coachEmails\":[\"$COACH_EMAIL\"]}" "$ADMIN_TOKEN")
echo "$S2" | jdata | jval '.invited[0]' | grep -q "$COACH_EMAIL" && ok "coach invited ($COACH_EMAIL)" || bad "step2 failed: $S2"

step "PUT /onboarding/step/3 — submit club for review"
S3=$(put "/onboarding/step/3" '{}' "$ADMIN_TOKEN")
echo "$S3" | jdata | jval '.club.status' | grep -q pending && ok "club submitted (status=pending)" || bad "step3 failed: $S3"

# =============================================================================
section "3. ADMIN APPROVE FLOW (super_admin)"
step "GET /clubs/pending"
PEND=$(get "/clubs/pending" "$SA_TOKEN")
FOUND=$(echo "$PEND" | jdata | jq --arg id "$CLUB_ID" '[.clubs[] | select(._id==$id)] | length')
[ "$FOUND" = "1" ] && ok "club appears in pending list" || bad "club not in pending list"

step "PUT /clubs/:clubId/approve"
APR=$(put "/clubs/$CLUB_ID/approve" '{}' "$SA_TOKEN")
echo "$APR" | jdata | jval '.club.status' | grep -q approved && ok "club approved" || bad "approve failed: $APR"

step "GET /clubs/my (admin sees own approved club)"
MYC=$(get "/clubs/my" "$ADMIN_TOKEN")
echo "  club=$(echo "$MYC" | jdata | jval '.club.name') | status=$(echo "$MYC" | jdata | jval '.club.status')"

# Demonstrate reject flow on a second throwaway club
step "Reject-flow demo: register a 2nd admin + club, then super_admin rejects it"
ADMIN2_EMAIL="reject.e2e+${SUF}@yopmail.com"
post "/auth/register" "{\"email\":\"$ADMIN2_EMAIL\",\"firstName\":\"Temp\",\"lastName\":\"Owner\"}" >/dev/null
verify_email_db "$ADMIN2_EMAIL"
post "/auth/login" "{\"email\":\"$ADMIN2_EMAIL\"}" >/dev/null
T2=$(post "/auth/verify-otp" "{\"email\":\"$ADMIN2_EMAIL\",\"otp\":\"123456\"}" | jdata | jval '.token')
put "/onboarding/step/1" '{"name":"Reject Me Swim Club","address":"999 Nowhere Ave, Reno, NV 89501","phone":"+1-775-555-0100"}' "$T2" >/dev/null
put "/onboarding/step/3" '{}' "$T2" >/dev/null
CLUB2_ID=$(get "/clubs/my" "$T2" | jdata | jval '.club._id')
REJ=$(put "/clubs/$CLUB2_ID/reject" '{"reason":"Incomplete facility details — please provide pool certification."}' "$SA_TOKEN")
echo "$REJ" | jdata | jval '.club.status' | grep -q rejected && ok "2nd club rejected (status=rejected)" || bad "reject failed: $REJ"

# =============================================================================
section "4. TRYOUT — create draft, then publish"
step "POST /tryouts (multipart form-data, status=draft)"
SESSIONS_JSON='[{"date":"2026-09-15","startTime":"09:00","endTime":"10:00","label":"Morning Session"},{"date":"2026-09-16","startTime":"09:00","endTime":"10:00","label":"Day 2 Session"}]'
SEGMENTS_JSON='[{"id":"seg-6-8","name":"Ages 6-8","minAge":6,"maxAge":8,"level":"Beginner"},{"id":"seg-9-12","name":"Ages 9-12","minAge":9,"maxAge":12,"level":"Intermediate"}]'
STEPS_JSON='[{"title":"Check in","description":"Arrive 15 min early at the front desk."},{"title":"Warm up","description":"5 min pool warm-up with coaches."}]'
FAQS_JSON='[{"question":"What should my child bring?","answer":"Swimsuit, goggles, and a towel."}]'
TC=$(curl -s -X POST "$BASE/tryouts" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "name=2026 Summer Splash Tryout" \
  -F "location=Bay Area Aquatics Center, San Jose" \
  -F "description=Annual summer tryout for swimmers ages 6-12. Coaches evaluate strokes, water safety, and overall potential." \
  -F "theme=ocean" \
  -F "slotDuration=30" \
  -F "lanesAvailable=2" \
  -F "swimmersPerLane=1" \
  -F "swimmersPerSlot=2" \
  -F "sessions=$SESSIONS_JSON" \
  -F "segments=$SEGMENTS_JSON" \
  -F "steps=$STEPS_JSON" \
  -F "faqs=$FAQS_JSON" \
  -F "status=draft" \
  -F "highlights=Certified coaching staff | Two-day evaluation | Small group sizes" \
  -F "additionalInstructions=Please arrive 15 minutes before your slot.")
TRYOUT_ID=$(echo "$TC" | jdata | jval '.tryout._id')
echo "$TC" | jval '.success' | grep -q true && [ -n "$TRYOUT_ID" ] && ok "draft tryout created (id=$TRYOUT_ID)" || bad "tryout create failed: $TC"
echo "  status=$(echo "$TC" | jdata | jval '.tryout.status') | swimmersPerSlot=$(echo "$TC" | jdata | jval '.tryout.swimmersPerSlot')"

step "GET /tryouts/:id/sessions + /slots (admin view)"
SESS=$(get "/tryouts/$TRYOUT_ID/sessions" "$ADMIN_TOKEN")
SESS1_ID=$(echo "$SESS" | jdata | jval '.sessions[0]._id')
SESS2_ID=$(echo "$SESS" | jdata | jval '.sessions[1]._id')
SLOTS1=$(get "/tryouts/$TRYOUT_ID/slots?sessionId=$SESS1_ID" "$ADMIN_TOKEN")
SLOT1_ID=$(echo "$SLOTS1" | jdata | jval '.slots[0]._id')
SLOT2_ID=$(echo "$SLOTS1" | jdata | jval '.slots[1]._id')
echo "  session1=$SESS1_ID (slots: $SLOT1_ID, $SLOT2_ID)  session2=$SESS2_ID"
echo "  slot1 capacity=$(echo "$SLOTS1" | jdata | jval '.slots[0].capacity') | slot2 capacity=$(echo "$SLOTS1" | jdata | jval '.slots[1].capacity')"

step "PATCH /tryouts/:id/publish (draft -> open)"
PUB=$(patch "/tryouts/$TRYOUT_ID/publish" "$ADMIN_TOKEN")
echo "$PUB" | jdata | jval '.tryout.status' | grep -q open && ok "tryout published (status=open)" || bad "publish failed: $PUB"

step "GET /tryouts/public (verify it appears publicly)"
PUB_LIST=$(get "/tryouts/public")
PUB_FOUND=$(echo "$PUB_LIST" | jdata | jq --arg id "$TRYOUT_ID" '[.tryouts[]? | select(._id==$id)] | length')
[ "$PUB_FOUND" = "1" ] && ok "tryout visible on public listing" || bad "tryout not public (found=$PUB_FOUND)"

# Optional registration questions
step "PUT /tryouts/:id/registration-questions"
QS=$(put "/tryouts/$TRYOUT_ID/registration-questions" '{"questions":[{"id":"q1","label":"Years of swim experience","type":"text","required":true},{"id":"q2","label":"Preferred stroke","type":"select","options":["Freestyle","Backstroke","Breaststroke","Butterfly"],"required":false}]}' "$ADMIN_TOKEN")
echo "$QS" | jval '.success' | grep -q true && ok "registration questions upserted" || bad "questions failed: $QS"

# =============================================================================
section "5. PARENT FLOW — register, login, register swimmers, waitlist, cancel"

create_parent() {
  local email="$1" first="$2" last="$3"
  post "/parent/auth/register" "{\"email\":\"$email\",\"firstName\":\"$first\",\"lastName\":\"$last\"}" >/dev/null
  verify_email_db "$email"
  post "/parent/auth/login" "{\"email\":\"$email\"}" >/dev/null
  local tok=$(post "/parent/auth/verify-otp" "{\"email\":\"$email\",\"otp\":\"123456\"}" | jdata | jval '.token')
  echo "$tok"
}

step "Register + login parent 1 (Jennifer Chen)"
P1_EMAIL="jennifer.chen.e2e+${SUF}@yopmail.com"
P1_TOKEN=$(create_parent "$P1_EMAIL" "Jennifer" "Chen")
[ -n "$P1_TOKEN" ] && ok "parent1 logged in ($P1_EMAIL)" || bad "parent1 login failed"

step "Register + login parent 2 (David Park)"
P2_EMAIL="david.park.e2e+${SUF}@yopmail.com"
P2_TOKEN=$(create_parent "$P2_EMAIL" "David" "Park")
[ -n "$P2_TOKEN" ] && ok "parent2 logged in ($P2_EMAIL)" || bad "parent2 login failed"

# register_swimmer <token> <first> <last> <dob> <age> <segmentId> <slotId>
register_swimmer() {
  local tok="$1" first="$2" last="$3" dob="$4" age="$5" seg="$6" slot="$7"
  post "/registrations" "{\"tryoutId\":\"$TRYOUT_ID\",\"sessionId\":\"$SESS1_ID\",\"slotId\":\"$slot\",\"segmentId\":\"$seg\",\"swimmerFirstName\":\"$first\",\"swimmerLastName\":\"$last\",\"swimmerDob\":\"$dob\",\"ageOnTryoutDay\":$age,\"hasUsaMembership\":false,\"usaMembershipId\":\"\",\"clubName\":\"\",\"guardianName\":\"Guardian\",\"guardianEmail\":\"parent@yopmail.com\",\"dynamicAnswers\":[{\"label\":\"Years of swim experience\",\"value\":\"2\"}]}" \
    "$tok"
}

step "Register 4 swimmers on session 1 (capacity 4 -> all 'registered')"
R1=$(register_swimmer "$P1_TOKEN" "Emma"   "Chen" "2018-04-12" 8  "seg-6-8"  "$SLOT1_ID")
REG1_ID=$(echo "$R1" | jdata | jval '.registration._id')
echo "$R1" | jdata | jval '.registration.status' | grep -q registered && ok "Emma registered ($REG1_ID)" || bad "Emma failed: $R1"

R2=$(register_swimmer "$P1_TOKEN" "Lucas"  "Chen" "2016-09-03" 10 "seg-9-12" "$SLOT1_ID")
REG2_ID=$(echo "$R2" | jdata | jval '.registration._id')
echo "$R2" | jdata | jval '.registration.status' | grep -q registered && ok "Lucas registered ($REG2_ID)" || bad "Lucas failed: $R2"

R3=$(register_swimmer "$P1_TOKEN" "Sophia" "Chen" "2017-11-21" 9  "seg-9-12" "$SLOT2_ID")
REG3_ID=$(echo "$R3" | jdata | jval '.registration._id')
echo "$R3" | jdata | jval '.registration.status' | grep -q registered && ok "Sophia registered ($REG3_ID)" || bad "Sophia failed: $R3"

R4=$(register_swimmer "$P2_TOKEN" "Noah"   "Park" "2015-02-28" 11 "seg-9-12" "$SLOT2_ID")
REG4_ID=$(echo "$R4" | jdata | jval '.registration._id')
echo "$R4" | jdata | jval '.registration.status' | grep -q registered && ok "Noah registered ($REG4_ID) — session now full" || bad "Noah failed: $R4"

step "Attempt 5th registration on a full slot -> expect 'slot is full'"
R5=$(register_swimmer "$P2_TOKEN" "Olivia" "Park" "2019-06-15" 7 "seg-6-8" "$SLOT1_ID")
echo "$R5" | jval '.message' | grep -qi "full" && ok "5th registration correctly rejected (slot full)" || { bad "expected 'full' error, got: $R5"; }

step "Parent joins the dedicated waitlist (POST /waitlist/:tryoutId)"
WL=$(post "/waitlist/$TRYOUT_ID" "{\"swimmerFirstName\":\"Olivia\",\"swimmerLastName\":\"Park\",\"swimmerDob\":\"2019-06-15\",\"ageOnTryoutDay\":7,\"segmentId\":\"seg-6-8\",\"guardianName\":\"David Park\",\"guardianEmail\":\"$P2_EMAIL\"}" "$P2_TOKEN")
WL_POS=$(echo "$WL" | jdata | jval '.waitlist.position')
echo "$WL" | jval '.success' | grep -q true && ok "Olivia added to waitlist (position=$WL_POS)" || bad "waitlist join failed: $WL"

step "Admin lists waitlist (GET /waitlist/tryout/:tryoutId)"
WLL=$(get "/waitlist/tryout/$TRYOUT_ID" "$ADMIN_TOKEN")
echo "  waitlist total=$(echo "$WLL" | jdata | jval '.total') | first=$(echo "$WLL" | jdata | jval '.entries[0].swimmerFirstName')"

step "Parent cancels Emma's registration (PUT /registrations/:id status=cancelled)"
CAN=$(put "/registrations/$REG1_ID" '{"status":"cancelled"}' "$P1_TOKEN")
echo "$CAN" | jdata | jval '.registration.status' | grep -q cancelled && ok "Emma's registration cancelled (slot reopened, waitlist notified)" || bad "cancel failed: $CAN"

step "GET /registrations/my-tryouts (parent1 view)"
MTP1=$(get "/registrations/my-tryouts" "$P1_TOKEN")
echo "  parent1 tryouts=$(echo "$MTP1" | jdata | jval '.tryouts[0].tryout.name') | children=$(echo "$MTP1" | jdata | jq '[.tryouts[0].children[].firstName] | join(", ")')"

step "Waitlisted Olivia now registers on the reopened slot 1"
R5B=$(register_swimmer "$P2_TOKEN" "Olivia" "Park" "2019-06-15" 7 "seg-6-8" "$SLOT1_ID")
REG5_ID=$(echo "$R5B" | jdata | jval '.registration._id')
echo "$R5B" | jdata | jval '.registration.status' | grep -q registered && ok "Olivia registered from waitlist ($REG5_ID)" || bad "Olivia re-register failed: $R5B"

step "Remove the waitlist entry after successful registration"
WL_ENTRY_ID=$(echo "$WLL" | jdata | jval '.entries[0]._id')
WLR=$(del "/waitlist/entry/$WL_ENTRY_ID" "$ADMIN_TOKEN")
echo "$WLR" | jval '.success' | grep -q true && ok "waitlist entry removed" || bad "waitlist remove failed: $WLR"

step "Admin promote-waitlist endpoint (seed a waitlisted reg via DB, then promote)"
seed_waitlisted_reg "$REG3_ID"
PROM=$(put "/tryouts/$TRYOUT_ID/registrations/$REG3_ID/promote" '{}' "$ADMIN_TOKEN")
echo "$PROM" | jdata | jval '.registration.status' | grep -q registered && ok "promoted waitlisted registration -> registered" || bad "promote failed: $PROM"

step "Admin verify USA-S membership (PUT .../verify)"
VER=$(put "/tryouts/$TRYOUT_ID/registrations/$REG2_ID/verify" '{"status":"verified"}' "$ADMIN_TOKEN")
echo "$VER" | jdata | jval '.registration.usaVerificationStatus' | grep -q verified && ok "USA-S verification updated" || bad "verify failed: $VER"

step "Admin views all registrations (GET /tryouts/:id/registrations)"
ALLR=$(get "/tryouts/$TRYOUT_ID/registrations?limit=50" "$ADMIN_TOKEN")
echo "  total=$(echo "$ALLR" | jdata | jval '.total') | statuses=$(echo "$ALLR" | jdata | jq '[.registrations[].status] | group_by(.) | map({(.[0]):length}) | add')"

# Collect the 4 active registrations (exclude cancelled Emma) for scoring/decision
ACTIVE_REGS=$(echo "$ALLR" | jdata | jq -r '[.registrations[] | select(.status!="cancelled")] | sort_by(.swimmerDetails.firstName) | .[]._id')
mapfile -t REG_IDS <<< "$ACTIVE_REGS"

# =============================================================================
section "6. GROUPS — manage"
step "POST /groups — create Bronze, Silver, Gold"
GB=$(post "/groups" '{"name":"Bronze","color":"#cd7f32","description":"Developmental group — new swimmers"}' "$ADMIN_TOKEN")
GS=$(post "/groups" '{"name":"Silver","color":"#c0c0c0","description":"Intermediate group — refining technique"}' "$ADMIN_TOKEN")
GG=$(post "/groups" '{"name":"Gold","color":"#ffd700","description":"Advanced group — competitive swimmers"}' "$ADMIN_TOKEN")
GROUP_BRONZE=$(echo "$GB" | jdata | jval '.group._id')
GROUP_SILVER=$(echo "$GS" | jdata | jval '.group._id')
GROUP_GOLD=$(echo "$GG" | jdata | jval '.group._id')
[ -n "$GROUP_GOLD" ] && ok "3 groups created (bronze=$GROUP_BRONZE silver=$GROUP_SILVER gold=$GROUP_GOLD)" || bad "group create failed"

step "GET /groups (list)"
GL=$(get "/groups" "$ADMIN_TOKEN")
echo "  groups=$(echo "$GL" | jdata | jq -r '[.groups[].name] | join(", ")')"

step "PUT /groups/:id — update Gold description"
GU=$(put "/groups/$GROUP_GOLD" '{"name":"Gold","color":"#ffd700","description":"Advanced group — competitive swimmers targeting regional meets"}' "$ADMIN_TOKEN")
echo "$GU" | jdata | jval '.group.description' | grep -q "regional" && ok "Gold group updated" || bad "group update failed: $GU"

step "DELETE /groups/:id — remove Bronze (cleanup demo)"
GDEL=$(del "/groups/$GROUP_BRONZE" "$ADMIN_TOKEN")
echo "$GDEL" | jval '.success' | grep -q true && ok "Bronze group deleted" || bad "group delete failed: $GDEL"

# =============================================================================
section "7. SCORING ROSTER (admin scores each registration)"
# score_reg <regId> <freestyle> <backstroke> <breaststroke> <butterfly> <groupId>
score_reg() {
  local rid="$1" fr="$2" bk="$3" br="$4" fly="$5" grp="$6"
  put "/tryouts/$TRYOUT_ID/registrations/$rid/score" \
    "{\"freestyle\":$fr,\"backstroke\":$bk,\"breaststroke\":$br,\"butterfly\":$fly,\"detailed_scores\":{\"freestyle_time\":\"$fr\",\"backstroke_time\":\"$bk\",\"breaststroke_time\":\"$br\",\"butterfly_time\":\"$fly\",\"safety_entry_exit\":true,\"safety_float\":true},\"coach_recommendation\":\"$grp\",\"notes\":\"Evaluated during morning session\"}" \
    "$ADMIN_TOKEN"
}

step "Score Lucas (strong) -> Gold"
SC1=$(score_reg "$REG2_ID" 92 88 85 90 "$GROUP_GOLD")
echo "$SC1" | jdata | jval '.registration.scores.totalScore' | grep -q . && ok "Lucas scored (total=$(echo "$SC1" | jdata | jval '.registration.scores.totalScore'), rec=Gold)" || bad "score Lucas failed: $SC1"

step "Score Noah (strong) -> Gold"
SC2=$(score_reg "$REG4_ID" 90 86 84 88 "$GROUP_GOLD")
echo "$SC2" | jval '.success' | grep -q true && ok "Noah scored (total=$(echo "$SC2" | jdata | jval '.registration.scores.totalScore'), rec=Gold)" || bad "score Noah failed: $SC2"

step "Score Sophia (mid) -> Silver"
SC3=$(score_reg "$REG3_ID" 78 75 72 70 "$GROUP_SILVER")
echo "$SC3" | jval '.success' | grep -q true && ok "Sophia scored (total=$(echo "$SC3" | jdata | jval '.registration.scores.totalScore'), rec=Silver)" || bad "score Sophia failed: $SC3"

step "Score Olivia (developing) -> Silver"
SC4=$(score_reg "$REG5_ID" 70 68 65 62 "$GROUP_SILVER")
echo "$SC4" | jval '.success' | grep -q true && ok "Olivia scored (total=$(echo "$SC4" | jdata | jval '.registration.scores.totalScore'), rec=Silver)" || bad "score Olivia failed: $SC4"

# =============================================================================
section "8. LEADERBOARD — generate ranked leadership board"
step "GET /tryouts/:id/leaderboard"
LB=$(get "/tryouts/$TRYOUT_ID/leaderboard" "$ADMIN_TOKEN")
echo "$LB" | jval '.success' | grep -q true && ok "leaderboard generated" || bad "leaderboard failed: $LB"
echo "  Ranked swimmers:"
echo "$LB" | jdata | jq -r 'to_entries[] | "    \(.key+1). \(.value.swimmer_name)  score=\(.value.total_score)  group=\(.value.coach_recommendation_name // "—")  status=\(.value.status)"'

# =============================================================================
section "9. OFFER / REJECT (admin decision per swimmer)"
# decision <regId> <status>
decision() { put "/tryouts/$TRYOUT_ID/registrations/$1/decision" "{\"status\":\"$2\"}" "$ADMIN_TOKEN"; }

step "Offer Lucas (top scorer)"
D1=$(decision "$REG2_ID" "offered")
echo "$D1" | jdata | jval '.registration.status' | grep -q offered && ok "Lucas -> offered (offer email sent)" || bad "offer Lucas failed: $D1"

step "Offer Noah (top scorer)"
D2=$(decision "$REG4_ID" "offered")
echo "$D2" | jdata | jval '.registration.status' | grep -q offered && ok "Noah -> offered (offer email sent)" || bad "offer Noah failed: $D2"

step "Reject Sophia"
D3=$(decision "$REG3_ID" "rejected")
echo "$D3" | jdata | jval '.registration.status' | grep -q rejected && ok "Sophia -> rejected (reject email sent)" || bad "reject Sophia failed: $D3"

step "Reject Olivia"
D4=$(decision "$REG5_ID" "rejected")
echo "$D4" | jdata | jval '.registration.status' | grep -q rejected && ok "Olivia -> rejected (reject email sent)" || bad "reject Olivia failed: $D4"

step "Final leaderboard after decisions"
LB2=$(get "/tryouts/$TRYOUT_ID/leaderboard" "$ADMIN_TOKEN")
echo "$LB2" | jdata | jq -r 'to_entries[] | "    \(.key+1). \(.value.swimmer_name)  score=\(.value.total_score)  status=\(.value.status)  group=\(.value.coach_recommendation_name // "—")"' 2>/dev/null

step "Parent1 views final results (GET /registrations/my-kids)"
PK=$(get "/registrations/my-kids" "$P1_TOKEN")
echo "  parent1 kids: $(echo "$PK" | jdata | jq -r '[.registrations[] | "\(.swimmerDetails.firstName): \(.status)"] | join(" | ")')"

# =============================================================================
echo
echo "════════════════════════════════════════════════════════════"
if [ "$FAIL" = "0" ]; then
  g; echo "  ALL CHECKS PASSED  ($PASS assertions, 0 failures)"; d
else
  r; echo "  COMPLETED WITH FAILURES  ($PASS passed, $FAIL failed)"; d
fi
echo "════════════════════════════════════════════════════════════"
echo "Created resources (suffix=$SUF):"
echo "  club:        $CLUB_ID  (Bay Area Aquatics Club)"
echo "  tryout:      $TRYOUT_ID (2026 Summer Splash Tryout)"
echo "  admin:       $ADMIN_EMAIL"
echo "  parent1:     $P1_EMAIL"
echo "  parent2:     $P2_EMAIL"
echo
