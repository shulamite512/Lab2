#!/usr/bin/env bash
set -euo pipefail

# Download and extract Apache JMeter to a local tools directory (no sudo required).
# Usage:
#   JMETER_VERSION=5.6.3 ./scripts/download-jmeter.sh
#   JMETER_HOME=/custom/path ./scripts/download-jmeter.sh

JMETER_VERSION="${JMETER_VERSION:-5.6.3}"
JMETER_HOME="${JMETER_HOME:-"$PWD/tools/jmeter"}"
ARCHIVE="apache-jmeter-${JMETER_VERSION}.tgz"
BASE_URL="https://dlcdn.apache.org/jmeter/binaries"

for bin in curl tar; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing dependency: $bin" >&2
    exit 1
  fi
done

mkdir -p "$JMETER_HOME"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading JMeter ${JMETER_VERSION} ..."
curl -fsSL "${BASE_URL}/${ARCHIVE}" -o "${TMP_DIR}/${ARCHIVE}"

echo "Extracting to ${JMETER_HOME} ..."
tar -xzf "${TMP_DIR}/${ARCHIVE}" -C "$TMP_DIR"
rm -rf "${JMETER_HOME:?}/"*
mv "${TMP_DIR}/apache-jmeter-${JMETER_VERSION}"/* "$JMETER_HOME"/

echo "JMeter installed to: $JMETER_HOME"
echo "Binary: $JMETER_HOME/bin/jmeter"
