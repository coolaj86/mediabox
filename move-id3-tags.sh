#!/bin/bash
# find ./db -name '[a-z0-9]*[a-z0-9][a-z0-9][a-z0-9][a-z0-9].json' -exec move-id3-tags.sh {} \;
set -e 
set -u

JSON=${1}
DIRNAME=`dirname ${1}`
MD5SUM=`basename ${1} .json`
mv ${JSON} ${DIRNAME}/${MD5SUM}.mp3.json
