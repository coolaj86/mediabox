#!/bin/bash
# So you've just copied your iPhoto directory onto your linux box?
# Or perhaps you're on you mac and you just want to clean out the
# iPhoto cruft(tm)?
# poor soul...

#Usage:
#de-iPhoto-ify.sh /path/to/iPhoto/

iPhoto_dir=${1}
find "${iPhoto_dir}" -type d -name Data -exec rm -rf {} \;
find "${iPhoto_dir}" -type d -name Thumbnails -exec rm -rf {} \;
find "${iPhoto_dir}" -type d -name Originals -exec rm -rf {} \;
# Uncomment this if you know you don't have any bmp/gif/png pics
#find "${iPhoto_dir}" -type f ! -iname *.jpg -exec rm -rf {} \;

# If you have my picdir script and wish to use it as well:
#~/bin/picdir.sh "${iPhoto_dir}" "${iPhoto_dir}"

find "${iPhoto_dir}" -type d -exec rmdir -p {} \;
