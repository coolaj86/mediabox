/*jshint node:true es5:true*/
(function () {
  "use strict";

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
            size: 36
          },
          {
            name: 'file_md5',
            type: 'char',
            size: 32
          },
          {
            name: 'content_md5',
            type: 'char',
            size: 32
          },
          {
            name: 'file_sha1',
            type: 'char',
            size: 40
          },
          {
            name: 'content_sha1',
            type: 'char',
            size: 40
          },
          {
            name: "created_at",
            type: "integer"
          },
          {
            name: "updated_at",
            type: "integer"
          },
          {
            name: "value",
            type: "text",
            notnull: true
          }
        ],
        indexes: [
          {
            columns: ["file_md5"],
            name: "file_md5_index"
          },
          {
            columns: ["content_md5"],
            name: "content_md5_index"
          },
          {
            columns: ["file_sha1"],
            name: "file_sha1_index"
          },
          {
            columns: ["content_sha1"],
            name: "content_sha1_index"
          }
        ]
      }
    ]
  };

  module.exports = directive;

}());
