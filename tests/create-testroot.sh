#!/bin/bash

echo "Popullating './testroot' with files of various timestamps"
rm -rf ./testroot
mkdir -p ./testroot/absolute
mkdir -p ./testroot/symbolic
mkdir -p ./test-files/

if [ ! -f "./test-files/sample.mp3" ]
then
  # http://www.last.fm/music/+free-music-downloads
  curl -L 'http://freedownloads.last.fm/download/499948173/Broken%2BHearts.mp3' \
    -o ./test-files/sample.mp3
fi
echo "This will take 7 seconds or so (TODO: use 'touch' instead of 'sleep')"
rsync -a ./test-files/ ./testroot/absolute/
#rsync -a ./test-files/button-10.mp3 ./testroot/absolute/button-10.mp3
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
  rsync ../absolute/real ../absolute/real.copy
  sleep 1
  rsync ../absolute/real ../absolute/duplicate
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
