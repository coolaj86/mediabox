#!/bin/bash
# TODO should use node-walk instead
set -e
set -u

MB_ALL=db-all
find . -type f -iname '*.mp3' -exec ./checksum-and-move.js {} \; >> ${MB_ALL}.txt 2>> ${MB_ALL}.err
find . -type f -iname '*.m4a' -exec ./checksum-and-move.js {} \; >> ${MB_ALL}.txt 2>> ${MB_ALL}.err
