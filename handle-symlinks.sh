#!/bin/bash
# Usage: find ./ -type l -exec /mnt/wd-large-1tb/MediaBox/handle-broken-symlinks.sh "{}" \;
LINK=`echo "$1" | cut -d'.' -f2-100000 | cut -d '/' -f2-100000`
ls -l "${LINK}"
ls -l "${LINK}" >> LINKS.txt
rm "${LINK}"
