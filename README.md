Stat Example
===

Object Representation:

    {
        "uuid": "0123-4567-89ab-cdef"
      , "pathroot": "/mnt/wd-500gb"
      , "pathname": "old-files/backup/"
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
