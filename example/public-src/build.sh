mkdir -p ../public

pakmanager build
rm pakmanaged.html
uglifyjs pakmanaged.js > ../public/pakmanaged.min.js
mv pakmanaged.js ../public/

lessc style.less > ../public/style.css

jade index.jade
rsync -a static/ ../public/
mv index.html ../public/
