#!/bin/bash
HOST="mediabox.coolaj86.info:1232/api"

ID=`curl ${HOST}/upload/new \
  -X POST \
  -H 'X-User-Session: apple-pi-scream' \
  -H 'Content-Type: application/json' \
  -d '{
          "abcdef-01234-56789": {
              "name": "button-10.mp3"
            , "lastModificationDate": "2012-02-10T17:10:15.450Z"
            , "relativePath": "tests/example-files"
          }
      }'`

echo ${ID}
ID=`echo ${ID} | json-prettify | grep result | cut -d':' -f2 | cut -d'"' -f2`
ID=`echo ${ID}`
echo ${ID}

# TODO open websocket

curl "${HOST}/upload/${ID}" \
  -X POST \
  -H 'X-User-Session: apple-pi-scream' \
  -F "abcdef-01234-56789=@../tests/example-files/button-10.mp3" \
#  -F "doesnt-exist=@../tests/example-files/button-10.mp3" \

echo ''
