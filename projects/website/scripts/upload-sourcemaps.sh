#!/bin/sh
set -eu

STATIC_DIR=".next/static"

if [ -z "${OPENOBSERVE_SOURCEMAP_URL:-}" ] || [ -z "${OPENOBSERVE_SOURCEMAP_TOKEN:-}" ]; then
  echo "OPENOBSERVE_SOURCEMAP_URL/TOKEN not set, skipping source map upload"
else
  ARCHIVE="$(mktemp -d)/sourcemaps.zip"
  find "$STATIC_DIR" \( -name '*.js' -o -name '*.js.map' \) -print | zip -j -q "$ARCHIVE" -@
  if curl --fail --show-error --silent -X POST \
    "${OPENOBSERVE_SOURCEMAP_URL%/}/api/${NEXT_PUBLIC_OPENOBSERVE_ORGANIZATION:-default}/sourcemaps" \
    -H "Authorization: ${OPENOBSERVE_SOURCEMAP_TOKEN}" \
    -F "service=${NEXT_PUBLIC_OPENOBSERVE_SERVICE:-website}" \
    -F "env=${NEXT_PUBLIC_APP_ENV:-production}" \
    -F "version=${SOURCE_COMMIT:-dev}" \
    -F "file=@${ARCHIVE}"; then
    echo "Uploaded source maps for ${SOURCE_COMMIT:-dev}"
  else
    echo "WARNING: source map upload failed, continuing without it"
  fi
fi

find "$STATIC_DIR" -name '*.map' -delete
