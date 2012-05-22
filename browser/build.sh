#!/usr/bin/env bash

set -u

PUBWEB='../webclient-deployed'
rm -rf "${PUBWEB}/"
mkdir -p "${PUBWEB}/"

echo "Compiling CommonJS -> BrowserJS"
pakmanager build >/dev/null 2>/dev/null
rm pakmanaged.html

echo "Compressing BrowserJS -> MinifiedJS"
#uglifyjs pakmanaged.js > ../public/pakmanaged.min.js
mv pakmanaged.js "${PUBWEB}/"

echo "Compiling LESS -> CSS"
lessc style.less > style.css
mv style.css "${PUBWEB}/"

echo "Compiling JADE -> HTML"
jade index.jade > /dev/null
mv index.html "${PUBWEB}/"

echo "Copying static files"
rsync -a static/ "${PUBWEB}" > /dev/null

echo "Done"
