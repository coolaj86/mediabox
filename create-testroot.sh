#!/bin/bash

rm -rf ./testroot
mkdir -p ./testroot/absolute
mkdir -p ./testroot/symbolic

echo 'hello world' > ./testroot/absolute/real
echo 'goodbye cruel world' > ./testroot/absolute/goodbye.txt
cd ./testroot/symbolic
  ln -s ../doesnt.exist ./broken
  touch /tmp/out-of-scope
  ln -s /tmp/out-of-scope out-of-scope
  ln -s ../absolute/real working.txt
  ln -s working.txt link-to-a-link
cd -
find testroot

mkdir -p ./testdb
mkdir -p ./testdb/tmp
