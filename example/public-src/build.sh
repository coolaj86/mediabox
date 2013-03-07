mkdir -p ../public

echo "Compiling CommonJS -> BrowserJS"
pakmanager build >/dev/null 2>/dev/null
rm pakmanaged.html

echo "Compressing BrowserJS -> MinifiedJS"
#uglifyjs pakmanaged.js > ../public/pakmanaged.min.js
mv pakmanaged.js ../public/

echo "Compiling LESS -> CSS"
lessc style.less > ../public/style.css

echo "Compiling JADE -> HTML"
jade index.jade > /dev/null

echo "Copying static files"
rsync -a static/ ../public/ > /dev/null
mv index.html ../public/

echo "Done"
