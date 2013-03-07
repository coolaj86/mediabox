#!/bin/bash

# preserve hardlinks
# add symlinks with ext
# don't remove if the source and dest are the same

export BASE="tests/testdb/files"

function move_file {
  FILEPATH="${1}"
  FILENAME=`basename "${FILEPATH}"`
  MD5=`md5sum "${FILEPATH}" | cut -d' ' -f1`
  PRE=`echo "${MD5}" | cut -c1-3`
  EXT=`echo "${FILENAME}" | awk -F . '{print $NF}'`
  if [ "${FILENAME}" = "${EXT}" ]
  then
    EXT=''
  else
    EXT=`echo "${EXT}" | tr '[A-Z]' '[a-z]'`
  fi

  # echo out to log file or die
  echo echo "${MD5}: ${FILEPATH}" || exit 1

  # link md5sum with extension
  if [ -n "${EXT}" ]
  then
    if [ ! -e "${BASE}/${PRE}/${MD5}.${EXT}" ]
    then
      echo "cd '${BASE}/${PRE}/' &&  ln -s '${MD5} ${MD5}.${EXT}'; cd -"
    fi
  fi


  # consolidate files by moving original or removing duplicate
  if [ -e "${BASE}/${PRE}/${MD5}" ]
  then
    # bail if this file is itself through symbolic links or by inode
    if [ "${FILEPATH}" -ef "${BASE}/${PRE}/${MD5}" ] || [ "$(stat -c "%d:%i" "${FILEPATH}")" == "$(stat -c "%d:%i" "${BASE}/${PRE}/${MD5}")" ]
    then
      return
    fi
    echo rm "${FILEPATH}"
  else
    echo mv "${FILEPATH}" "${BASE}/${PRE}/${MD5}"
  fi
}
export -f move_file

find `dirname "${1}"` -maxdepth 1 -type f -exec echo move_file '"'"{}"'"' \; | bash
