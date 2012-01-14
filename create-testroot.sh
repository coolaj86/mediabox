#!/bin/bash

rm -rf ./testroot
mkdir -p ./testroot/absolute
mkdir -p ./testroot/symbolic

echo 'hello world' > ./testroot/absolute/real
echo 'goodbye cruel world' > ./testroot/absolute/goodbye.txt
cd ./testroot/symbolic
  ln -s ../doesnt.exist ./broken
  sleep 1
  touch /tmp/out-of-scope
  sleep 1
  ln -s /tmp/out-of-scope out-of-scope
  sleep 1
  ln -s ../absolute/real working.txt
  sleep 1
  rsync ../absolute/real ../absolute/real.duplicate
  sleep 1
  ln -s working.txt link-to-a-link
cd -
find testroot

mkdir -p ./testdb
mkdir -p ./testdb/tmp

BLOCK_COMMENT="
  expected result:
    real -> md5
    real.duplicate -> hardlinked to real
    working.txt
    link-to-a-link
"
