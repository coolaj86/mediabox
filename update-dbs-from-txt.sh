set -e
set -u

MB_ALL=db-all.txt
MB_SORTED=db-all-sorted.txt
MB_UNIQUE=db-all-unique.txt
MB_TAGS=tag-paths.txt

cat ${MB_ALL} | cut -d'-' -f2-99 | sort | cut -d ' ' -f2-99 > ${MB_SORTED}
#cat ${MB_ALL} | sort | cut -d ' ' -f2-99 > ${MB_SORTED}
sort -u ${MB_SORTED} > ${MB_UNIQUE}
node readfat.js > ${MB_TAGS}
