MediaBox
====

Own it!

Nothing here for most folks to use. This is nothing of beta or even alpha quality.

Instructions
====

Check the directory in `checksum-and-move.js` and all of your m4a and mp3 fills will be moved to `./db`

    ./checksum-and-move.sh

The log files must be parsed into JSON

    ./update-dbs-from-txt.sh

Extract the tags from each file

    node extract-tags.js
    node export-all-tags.js
