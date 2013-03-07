#!/bin/bash
set -e

curl http://mediabox.coolaj86.info:1232/api/mounts | json-prettify

curl http://mediabox.coolaj86.info:1232/api/import \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "path": "usbdrive" }' \
