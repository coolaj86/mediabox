Usage (for alpha testing)
===

    git clone git://github.com/coolaj86/mediabox.git MediaBox
    cd MediaBox
    git checkout modularized
    ./create-testroot.sh
    node move-files ./testroot

Expected Behavior

The files in `testroot/` will be moved to `testdb/` according to md5sum.

If a file already exists with the name of that md5sum, but the size does not match,
it is assumed that the existing file is the result of a partial write prior
to the program being `SIGINT`d, or a power-failure and the existing file is overwritten.

Note: In the astronomically rare case of a "birthday problem" collision
(attack, random happenstance, memory corruption), there is no safegaurd.

If the file is on the same device, a hard-link will be preferred to that of a copy.

If this is the first run, the files will be checksummed before they are copied.
Otherwise, they are checksummed during the copy.

Note: In the case that writes happen very fast, this behavior is non-optimal 
- the checksumming should occur during the copy.

Metadata for each file and symlink is written into `testdb/`
Original files are hard-linked (if on the same device) to the md5-named file in `testdb/`.
Symlinks are left as-is.
The file's extension is preserved with a symlink to the md5-named file.

Stat Example
===

Object Representation:

    {
        "uuid": "0123-4567-89ab-cdef"
      , "root": "/mnt/wd-500gb"
      , "path": "old-files/backup/"
      , "name": "resume"
      , "ext": ".pdf"
      , "symlink": true
      //, "type": "symbolicLink"
      , "mtime": "2012-01-12T13:28:47.768Z"
      , "size": 120341
    }

Array Representation (order matters):

    [
        "0123-4567-89ab-cdef"
      , "/mnt/wd-500gb"
      , "old-files/backup"
      , "resume"
      , ".pdf"
      , true
      //, "symbolicLink"
      , "2012-01-12T13:28:47.768Z"
      , 120341
    ]

Notes on `stat` objects in MediaBox
---

  * walk adds `type`
  * driver adds `filepath` and `name`
  * copy strategy adds `ext`, `md5sum`, and `uuid`

fun stuff

    ls -lah testdb/*/*
    rm testdb/*/*

Test Cases TODO
===

  * what if a large file is partially written before a power failure?
    An md5sum will exist, but it will not be the same size
  * What if two files suffer from hash-collision?
    In such a case, the sizes would most likely be different.
  * What if a file system becomes read-only after a write error?
