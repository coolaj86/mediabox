#!/bin/bash
node ../example/test-app.js testroot/
echo FILES
find testdb/files/ -type f
echo SYMLINKS
find testdb/meta/ -type f
