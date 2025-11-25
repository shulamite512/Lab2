#!/usr/bin/env bash
set -euo pipefail

# Run the backend-endpoints JMeter plan with configurable users/duration and fresh results.
# Usage:
#   ./scripts/run-jmeter-backend.sh -u 10 -d 30 -r 5 -e owner@test.com -p password123

USERS=5
DURATION=0
RAMP=5
START_DELAY=0
EMAIL=""
PASSWORD=""
RESULTS_DIR="jmeter-tests/results"
PLAN_PATH="jmeter-tests/backend-endpoints.jmx"
JMETER_BIN="./tools/jmeter/bin/jmeter"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--users) USERS="$2"; shift 2 ;;
    -d|--duration) DURATION="$2"; shift 2 ;;
    -r|--ramp) RAMP="$2"; shift 2 ;;
    --delay) START_DELAY="$2"; shift 2 ;;
    -e|--email) EMAIL="$2"; shift 2 ;;
    -p|--password) PASSWORD="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -x "$JMETER_BIN" ]]; then
  echo "JMeter not found at $JMETER_BIN. Run ./scripts/download-jmeter.sh first." >&2
  exit 1
fi

mkdir -p "$RESULTS_DIR"
rm -rf "${RESULTS_DIR}/backend-endpoints.jtl" "${RESULTS_DIR}/test-report"

# Build JMeter property overrides
JMETER_PROPS=(
  "-JUSERS=${USERS}"
  "-JDURATION=${DURATION}"
  "-JRAMP=${RAMP}"
  "-JSTART_DELAY=${START_DELAY}"
)
if [[ -n "$EMAIL" ]]; then
  JMETER_PROPS+=("-JUSER_EMAIL=${EMAIL}")
fi
if [[ -n "$PASSWORD" ]]; then
  JMETER_PROPS+=("-JUSER_PASSWORD=${PASSWORD}")
fi

set -x
"$JMETER_BIN" \
  -n \
  -t "$PLAN_PATH" \
  -l "${RESULTS_DIR}/backend-endpoints.jtl" \
  -e -o "${RESULTS_DIR}/test-report" \
  "${JMETER_PROPS[@]}"
