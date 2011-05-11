#!/bin/bash
LOG=/tmp/failed-m4a-files.txt
rm ${LOG}
grep m4a extags.err3 | cut -d' ' -f2 | cut -d'.' -f1-2 | while read F
do
  echo '' >> ${LOG}
  echo '' >> ${LOG}
  echo '' >> ${LOG}
  echo ${F} >> ${LOG}
  m4atags --literal --with-md5sum ${F} 2>&1 >> ${LOG}
done
cat ${LOG}
