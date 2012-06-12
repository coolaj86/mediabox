/*jshint node:true es5:true*/
(function () {
  "use strict";

  /*
    { +uuid: true,
      \md5: true,
      \sha1: true,
      -path: true,
      +name: true,
      +mtime: true,
      -atime: true,
      -ctime: true,
      -uid: true,
      -gid: true,
      -mode: true,
      +size: true,
      -type: true,
      +imported_at: true,
  */

  var directive = {
    tables: [
      {
        name: 'data',
        key: {
          name: 'id',
          type: 'varchar'
        },
        columns: [
          {
            name: 'uuid',
            type: 'char',
            notnull: true,
            size: 36
          },
          {
            name: "created_at",
            notnull: true,
            type: "integer"
          },
          {
            name: "updated_at",
            notnull: true,
            type: "integer"
          },
          {
            name: 'md5',
            type: 'char',
            notnull: true,
            size: 32
          },
          {
            name: 'sha1',
            type: 'char',
            //notnull: true,
            size: 40
          },
          {
            name: "imported_at",
            notnull: true,
            type: "integer"
          },
          {
            name: "path",
            type: "text"
          },
          {
            name: "name",
            notnull: true,
            type: "varchar"
          },
          {
            name: "mtime",
            notnull: true,
            type: "integer"
          },
          {
            name: "ctime",
            type: "integer"
          },
          {
            name: "atime",
            type: "integer"
          },
          {
            name: "size",
            notnull: true,
            type: "integer"
          },
          {
            name: "uid",
            type: "integer"
          },
          {
            name: "gid",
            type: "integer"
          },
          {
            name: "mode",
            type: "integer"
          },
          {
            name: "type",
            type: "text"
          }
        ],
        indexes: [
          {
            columns: ["uuid"],
            name: "uuid_index"
          },
          {
            columns: ["md5"],
            name: "md5_index"
          },
          {
            columns: ["sha1"],
            name: "sha1_index"
          }
        ]
      }
    ]
  };

  module.exports = directive;

}());
