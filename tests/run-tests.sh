#!/bin/bash
node app testroot/
echo FILES
ls -lah testdb/files/*/*
echo SYMLINKS
ls -lah testdb/meta/*/*
