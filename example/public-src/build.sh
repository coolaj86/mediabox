mkdir -p ../public

pakmanager build
rm pakmanaged.html
uglifyjs pakmanaged.js > ../public/pakmanaged.min.js
rm pakmanaged.js

lessc style.less > ../public/style.css

jade index.jade
mv index.html ../public/
