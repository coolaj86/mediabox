MediaBox
====

Own it!

Nothing here for most folks to use. This is nothing of beta or even alpha quality.

Instructions
====

Check the directory in `checksum-and-move.js` and all of your m4a and mp3 fills will be moved to `./db`

    ./checksum-and-move.sh

    # /Users/coolaj86/Music/iTunes/ArtistX/AlbumY/TitleZ.m4a -> ./db/c4a/c4afce916bdf562b29247619d2ce8031.m4a

Cuts the datestamp and sorts log files

    ./update-dbs-from-txt.sh

Extract the tags from each file and creates a `.json` in the same dir

    node extract-tags.js

Puts all of the `.json` into a single file

This is a post-step since the `.json` step may be interrupted or whatever

    node export-all-tags.js

Normalized Tags
====

http://gumstix.coolaj86.info:3000/normalized-tags.json

All of the tags - id3v1, id3v2, and m4a have been reduced to just a few tags:

  * `title`
  * `artist`
  * `album_artist`
  * `album`
  * `track`
  * `genre`
  * `release_date`
  compilation - (if part of something like Now, Totally Hits, etc)

However, the fields have not been normalized (`release_date` on id3v1 is just the year; `track` for m4a is "x of y")

Additionally, these tags also exist:

  * pathTags - an array of the original paths of where files of that md5sum have been found
  * fileMd5sum - the md5sum of the file, the current location of the stream
  * extname - .m4a or .mp3
  * streamMd5sum - the contents of the raw stream, not including file or tag metadata

Notes
====

[Tags seen in the wild](https://gist.github.com/965870)

[MusicBrainz correlation of common tags](http://musicbrainz.org/doc/MusicBrainz_Tag)

Storing files by mime type results in faster parsing for third-party apps.

For example, storing the `.json` metatag files in the same dirs as the m4a and mp3s slows down iTunes processing significantly.

Some erroring m4a files may be fixable with `mp4file --optimize myfile.m4a # requires mp4v2 packafe` [issue #7](https://bitbucket.org/wez/atomicparsley/issue/7/im-getting-an-apar_readx_noseek-read)

Record audio in the browser:

  [FireFox Rainbow](https://addons.mozilla.org/en-us/firefox/addon/mozilla-labs-rainbow/)
