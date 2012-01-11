#!/bin/bash

rm -rf ./testroot
mkdir -p ./testroot/absolute
mkdir -p ./testroot/symbolic

echo 'hello world' > ./testroot/absolute/real
cd ./testroot/symbolic
  ln -s ../doesntexist ./broken
  touch /tmp/out-of-scope
  ln -s /tmp/out-of-scope out-of-scope
  ln -s ../absolute/real working
  ln -s working link-to-a-link
cd -
find testroot

mkdir -p ./testdb
mkdir -p ./testdb/tmp
