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

Notes
====

[Tags seen in the wild](https://gist.github.com/965870)

[MusicBrainz correlation of common tags](http://musicbrainz.org/doc/MusicBrainz_Tag)

Storing files by mime type results in faster parsing for third-party apps.

For example, storing the `.json` metatag files in the same dirs as the m4a and mp3s slows down iTunes processing significantly.

Some erroring m4a files may be fixable with `mp4file --optimize myfile.m4a # requires mp4v2 packafe` [issue #7](https://bitbucket.org/wez/atomicparsley/issue/7/im-getting-an-apar_readx_noseek-read)
