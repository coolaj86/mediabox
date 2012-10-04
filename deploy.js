#!/usr/bin/env node
/*jshint node:true */
(function () {
  'use strict';

  var npm = require('npm'),
      fs = require('fs'),
      util = require('util'),
      path = require('path'),
      forEachAsync = require('forEachAsync'),
      wrench = require('wrench'),
      // the public directory (where stuff is sent)
      publicDir = 'public',
      browserDir = 'browser',
      staticDir = 'static',
      dirs = [
        'public',
        'static'
      ];

  function fixupPath(dir) {
    return path.resolve(process.cwd(), dir);
  }

  function npmInstall(cb, dir) {
    npm.load(function () {
      npm.install(dir, cb);
    });
  }

  function prep(cb) {
    // make sure everything is relative to the cwd
    publicDir = fixupPath(publicDir);
    browserDir = fixupPath(browserDir);
    staticDir = fixupPath(staticDir);

    // npm install in the current dir to get deps
    npmInstall(cb, '.');
  }

  function touch(fpath) {
    // path.exists -> fs.exists in node 0.8.x
    if (typeof fs.existsSync === 'function') {
      if (!fs.existsSync(fpath)) {
          fs.writeFileSync(fpath, '');
      }
    } else {
      if (!path.existsSync(fpath)) {
          fs.writeFileSync(fpath, '');
      }
    }
  }

  function prepFs() {
    console.log('Deleting generated files...');
    try {
      // delete any old stuff
      wrench.rmdirSyncRecursive(publicDir);
    } catch (e) {
      // whatever
    }

    // make public/static directories
    dirs.forEach(function (dir) {
      try {
        wrench.mkdirSyncRecursive(fixupPath(dir));
      } catch (e) {
        // whatever
      }
    });

    console.log('Copying in static files...');
    try {
      wrench.copyDirSyncRecursive(staticDir, publicDir);
    } catch (e) {
    }

    // make sure there's a favicon.ico
    touch(path.join(publicDir, 'favicon.ico'));
  }

  function compileJade(inFile, outPath) {
      var jade = require('jade'),
          index = fs.readFileSync(inFile, 'utf8'),
          render = jade.compile(index, {'filename': inFile});

      fs.writeFileSync(outPath, render());
  }

  function templateModule(module) {
    var newScript;   

    // module.providespath is added by normalizeScriptRequires
    // TODO move to where?

    if (!module) {
      console.error('missing module', module);
      return;
    }   

    if (!module.scriptSource) {
      console.error('missing script source', module);
      return;
    }   
  
    // I'm using the 'ender:' prefix to make it
    // easier to search for a module start
    newScript = [
        util.format('// ender:%s as %s', module.modulepath, module.providespath),
        util.format('(function (context) {'),
        //util.format('  "use strict";'),
        util.format(''),
        util.format('  var module = { exports: {} }, exports = module.exports'),
        util.format('    , $ = require("ender")'),
        util.format('    ;'),
        util.format(''),
        util.format('  %s', module.scriptSource.replace(/\n/g, '\n  ')),
        util.format(''),
        util.format('  provide("%s", module.exports);', module.modulepath),
        util.format('  provide("%s", module.exports);', module.providespath),
        util.format('  $.ender(module.exports);'),
        util.format('}(global));')
      ].join('\n');

    return newScript;
  }

  function compileLess(cb, inFile, outFile) {
    var less = require('less'),
        l = fs.readFileSync(inFile, 'utf8');

    less.render(l, function (e, css) {
      if (e) {
        console.error(e);
        cb(e);
        return;
      }

      if (!path.existsSync(path.dirname(outFile))) {
        fs.mkdirSync(path.dirname(outFile));
      }

      fs.writeFileSync(outFile, css, 'utf8');
      cb();
    });
  }

  function buildJs(cb, pkg) {
    var pakman = require('pakman');

    pakman.compile(pkg, templateModule, cb);
  }

  function minify(js) {
    var jsp = require("uglify-js").parser,
        pro = require("uglify-js").uglify,
        // parse code and get the initial AST
        ast = jsp.parse(js);

    // get a new AST with mangled names
    ast = pro.ast_mangle(ast);
    // get an AST with compression optimizations
    ast = pro.ast_squeeze(ast);

    // compressed code here
    return pro.gen_code(ast);
  }

  function deploy(cb, cwd) {
    if (cwd) {
      process.chdir(cwd);
    }

    // npm install stuff
    prep(function () {
      // copy static files, create directories, etc
      prepFs();

      console.log('Compiling Jade...');
      fs.readdirSync(browserDir).forEach(function (f) {
        var inFile = path.join(browserDir, f),
            outFile = path.join(publicDir, f.replace(/\.jade$/, '.html'));

        if (/\.jade$/.test(f)) {
          compileJade(inFile, outFile);
        }
      });

      console.log('Compiling LESS...');
      process.chdir('browser');
      compileLess(function (err) {
        process.chdir('..');
        if (err) {
          console.error('Error compiling less:');
          console.error(err);
          return cb(err);
        }

        console.log('Compiling JavaScript...');
        buildJs(function (err, s) {
          var header = "var global = Function('return this;')();",
              outJsPath = path.join(publicDir, 'pakmanaged.js'),
              minJsPath = path.join(publicDir, 'pakmanaged.min.js'),
              enderPath = path.join(__dirname, 'lib/ender.js'),
              outJs,
              minJs,
              ender;

          if (err) {
              throw err;
          }

          ender = fs.readFileSync(enderPath, 'utf8');
          outJs = util.format('%s\n%s\n%s', header, ender, s);

          fs.writeFileSync(outJsPath, outJs);

          console.log('Minifying JavaScript...');

          minJs = minify(outJs);
          fs.writeFileSync(minJsPath, minJs);

          console.log('Package build successful!');
        }, browserDir);
      }, path.join(browserDir, 'style.less'), path.join(publicDir, 'style.css'));
    });
  }

  if (module === require.main) {
    deploy(function (err) {
      if (err) {
        process.exit(1);
      }
    });
  }

  module.exports = deploy;
}());
