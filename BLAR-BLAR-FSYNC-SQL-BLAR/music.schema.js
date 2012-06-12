/*jshint node:true es5:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  // http://www.id3.org/id3v2.4.0-frames
  var directive = {
        name: "audio",
        key: {
          name: 'id',
          type: 'integer',
        },
        columns: [
          {
            name: "updated_at",
            type: "varchar",
          },
          {
            name: "created_at",
            type: "varchar",
          },
          {
            // Track "100"
            // TRCK "100/100"
            // trkn "100 of 100"
            name: "track",
            type: "varchar",
            size: "10"
          },
          {
            // Title
            // TIT2
            // ©nam
            name: "title",
            type: "text",
          },
          {
            // Artist
            // TPE1 || TSOP || TPE2
            // ©ART
            name: "artist",
            type: "text",
          },
          {
            // Album
            // TALB
            // ©alb
            name: "album",
            type: "text",
          },
          {
            // Year
            // TDRC || TDRL 1998
            // ©day
            name: "release",
            type: "text",
          },
          { 
            // Genre
            // TCON
            // ©gen || gnre
            name: "release",
            type: "text",
          },
          {
            name: "uuid",
            type: "char",
            size: 32
          },
          {
            name: "file_md5",
            type: "char",
            size: 32
          },
          {
            name: "stream_md5",
            type: "char",
            size: 32
          },
        ],
        // CREATE [UNIQUE] INDEX [IF NOT EXISTS] [DBNAME.] <index-name> ON 
        //   <table-name> ( <column-name>[,] [COLLATE BINARY|NOCASE|RTRIM] [ASC|DESC] );
        //
        // http://www.sqlite.org/lang_createindex.html
        indexes: [
          {
            columns: ["qmd5"],
            unique: true,
            name: "qmd5_index"
          },
          {
            columns: ["mtime","size"],
            name: "size_mtime_index"
          },
          {
            columns: ["rpath"],
            name: "path_index"
          }
        ],
        constraints: [
        ]
  };

  module.exports = directive;

/*
    //"dev": 234881026,
    //"ino": 2465719,
    "mode": 33204,
    //"nlink": 1,
    //"uid": 504,
    //"gid": 20,
    //"rdev": 0,
    "size": 334,
    //"blksize": 4096,
    //"blocks": 8,
    //"atime": "2011-02-23T04:33:12.000Z",
    "mtime": "2011-02-21T18:27:46.000Z",
    //"ctime": "2011-02-21T18:27:46.000Z",
    "name": "walk.js",
    //"type": "file",
    "path": "tests/walk.js",
    "qmd5": "7ebec5c45d407d74a2ef831a6f1e63ae"
*/

}());
