#!/bin/bash
# Usage: find -L ./ -type l -exec /home/coolaj86/MediaBox/handle-broken-symlinks.sh "{}" \;
LINK=`echo "$1" | cut -d'.' -f2-100000 | cut -d '/' -f2-100000`
ls -l "${LINK}"
ls -l "${LINK}" >> BROKEN-LINKS.txt
rm "${LINK}"
