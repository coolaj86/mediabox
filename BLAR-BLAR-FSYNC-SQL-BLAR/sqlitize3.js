/*jshint node:true es5:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  require('remedial');


  function sqliteQuoteKeyword(str) {
    return "`" + String(str) + "`";
  }
  function sqliteEscape(str) {
    return str.replace(/'/g,"''");
  }
  function sqliteQuoteValue(str) {
    return "'" + sqliteEscape(String(str)) + "'";
  }

  function createSqliteColumn(column, cb) {
    // TODO constraints
    column.type = (column.type || "text").toUpperCase();
    column.unique = (true === column.unique) ? "UNIQUE" : "";
    column.notnull = (true === column.notnull) ? "NOT NULL" : "";
    column.default = (column.default) ? "DEFAULT " + column.default : "";
    cb(" {name} {type} {notnull} {unique} {default}".supplant(column));
  }

  // CREATE [UNIQUE] INDEX [IF NOT EXISTS] [DBNAME.] <index-name> ON 
  //   <table-name> ( <column-name>[,] [COLLATE BINARY|NOCASE|RTRIM] [ASC|DESC] );
  var myIndex = {}
    , myColumns = []
    ;
  function createSqliteIndex(tablename, index) {
    myColumns.length = 0;

    myIndex.unique = (true === index.unique) ? 'UNIQUE' : '';
    myIndex.index = index.name || (tablename + '_' + sqliteEscape(index.columns.join('_')));
    myIndex.table = tablename;

    index.columns.forEach(function (item, i, arr) {
      myColumns.push(sqliteQuoteValue(item));
    });

    myIndex.columns = myColumns.join(', ');
    myColumns.length = 0;
    return "CREATE {unique} INDEX IF NOT EXISTS {index} ON {table} ( {columns} );".supplant(myIndex);
  }

  var myKey = {}
    ;
  Table.prototype.init = function (cb) {
    var sql = "CREATE TABLE IF NOT EXISTS {name}".supplant(this.table)
      , tableName = this.table.name
      , tableColumns = this.table.columns
      , key = this.table.key
      ;

    this._initColumns.length = 0;

    sql += " (\n  ";

    key = key || myKey;
    key.name = (key.name || 'id').toLowerCase();
    key.type = (key.type || 'integer').toUpperCase();
    key.options = 'PRIMARY KEY';

    sql += " {name} {type} {options} ".supplant(key);

    // XXX if when using real async
    tableColumns.forEach(function (column) {
      createSqliteColumn(column, function (sql) {
        this._initColumns.push(sql);
      });
    });
    if (this._initColumns.length) {
      sql += ',\n  ' + this._initColumns.join(',\n  ') + '\n);\n';
    }

    (this.table.indexes||gc_empty_arr).forEach(function (index) {
      sql += createSqliteIndex(this.table.name, index) + '\n';
    });

    this._initColumns.length = 0;
    cb(null, sql);
  };

  // TODO associate with table
  var gc_empty_obj = {}
    , gc_empty_arr = []
    ;

  Table.prototype.insert = function (obj, ins_opts) {
    var sql
      , resolve = ('ignore' === (ins_opts||gc_empty_obj).resolve) ? 'OR IGNORE' : ''
      , i
      , arr
      , column
      , value
      ;

    if (Array.isArray(obj)) {
      arr = obj;
      for (i = 0; i < arr.length; i += 1) {
        obj = arr[i];
        this.insert(obj, ins_opts);
      }
      return;
    }

    this._insertValues.length = 0;
    this._insertValues[0] = 'null';

    if (obj.hasOwnProperty(this.table.key.name)) {
      this._insertValues[0] = sqliteQuoteValue(obj[this.table.key.name]);
    }

    for (i = 0; i < this.table.columns.length; i += 1) {
      column = this.table.columns[i];

      value = obj[column.name]; // XXX cases must match
      if ('undefined' === typeof value || 'null' === typeof value) {
        value = 'null';
      }

      if ('null' !== value) {
        value = sqliteQuoteValue(String(value));
      }

      this.insertValues.push(value);
    }

    this._insertSupplanter.resolve = resolve;
    this._insertSupplanter.tablename = this.table.name;
    this._insertSupplanter.values = this._insertValues.join(', ');
    sql = "INSERT {resolve} INTO {tablename} VALUES ( {values} );".supplant(this._insertSupplanter);
    this._insertStatements.push(sql);

    return sql;
  };

  Table.prototype.update = function (obj, up_opts) {
    var self = this
      , key 
      , resolve = ('ignore' === (up_opts||gc_empty_obj).resolve) ? 'OR IGNORE' : ''
      , ins
      , me_up_opts
      , me_includes
      , i
      , arr
      ;

    if (Array.isArray(obj)) {
      arr = obj;
      for (i = 0; i < arr.length; i += 1) {
        obj = arr[i];
        this.update(obj, up_opts);
      }
      return;
    }

    me_up_opts = up_opts || gc_empty_obj;
    key = me_up_opts.key || 'id';

    me_includes = me_up_opts.includes || gc_empty_arr;

    this.table.columns.forEach(function (column) {
      var name = sqliteQuoteKeyword(column.name),
        value = obj[column.name]; // XXX cases must match

      if (-1 == me_includes.indexOf(column.name)) {
        return;
      }

      if ('undefined' === typeof value) {
        return;
      }
      if ('null' === typeof value) {
        value = 'null';
      } else {
        value = sqliteQuoteValue(String(value));
      }

      this._updateValues.push(name + " = " + value);
    });

    this._updateSupplanter.resolve = resolve;
    this._updateSupplanter.tablename = this.table.name;
    this._updateSupplanter.value_pairs = '\n    ' + this._updateValues.join(',\n    ');
    this._updateSupplanter.key = sqliteQuoteKeyword(key);
    this._updateSupplanter.value = sqliteQuoteValue(obj[key]);
    ins = "UPDATE {resolve} {tablename} SET {value_pairs} \n  WHERE {key} = {value};\n".supplant(this._updateSupplanter);
    this._updateStatements.push(ins);
  };

  Table.prototype.commit = function () {
    var sql
      , i
      ;

    this._allStatements.length = 0;

    this._allStatements.push("BEGIN TRANSACTION;\n ");
    for (i = 0; i < this._insertStatements.length; i += 1) {
      this._allStatements.push(this._insertStatements[i]);
    }
    this._allStatements.push("\nCOMMIT;");

    this._allStatements.push("BEGIN TRANSACTION;\n ");
    for (i = 0; i < this._updateStatements.length; i += 1) {
      this._allStatements.push(this._updateStatements[i]);
    }
    this._allStatements.push("\nCOMMIT;");

    sql = this._allStatements.join('\n  ');

    this._insertStatements.length = 0;
    this._updateStatements.length = 0;
    this._allStatements.length = 0;

    return sql;
  };

  function Table(directive) {
    this.table = directive;
    // these are being pre-declared and reused to avoid garbage collection halts
    this._allStatements = [];
    this._updateStatements = [];
    this._insertStatements = [];
    this._updateSupplanter = {};
    this._insertSupplanter = {};
    this._updateValues = [];
    this._insertValues = [];
    this._initColumns = [];
  }

  Table.create = function (a, b, c) {
    return new Table(a, b, c);
  };

  module.exports = Table;
}());
