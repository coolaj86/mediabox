#!/bin/bash
set -e
HOST='http://getmediabox.com'
CURL='curl -s'

${CURL} ${HOST}/api/mounts | json-prettify

${CURL} ${HOST}/api/import \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "path": "usbdrive" }' \

${CURL} ${HOST}/api/import \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "path": "deletable", "remove": true }' \
