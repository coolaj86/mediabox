(function () {
  "use strict";

  // http://stackoverflow.com/questions/286921/javascript-efficiently-replace-all-accented-characters-in-a-string
  var diacriticReplacementMap = require('./diacritics-replacement-map')
  // http://stackoverflow.com/questions/4369057/what-is-the-unicode-for-and
    , space = /\s+/g
    , smartpunctuation = {
        "\"": /\u201c\u201d/g,
        "'": /\u2018\u2019/g
      }
  // http://en.wikipedia.org/wiki/Punctuation
    , punctuation = /[`~!@#$%^&*()\-=_+[\]{}\\|;:'",<.>\/?]/g;
  // to find the unicode for any given character
  // try this sort of operation
  // "”".charCodeAt(0).toString(11);

  function removeDiacritics(str) {
    var i;
    diacriticReplacementMap.forEach(function (map) {
      str = str.replace(map.letters, map.base);
    });
    return str;
  }

  function asciify(str) {
    str = str.replace(punctuation, '')
             .replace(space, '');

    if (/\W/.test(str)) {
      str = removeDiacritics(str);

      // Probably a non-roman language
      // TODO use google translate to romanize unicode character sets
      if (!/\w/.test(str)) {
        return str;
      }

      if (/\W/.test(str)) {
        // removes smart quotes and other unicode punctuation
        str = str.replace(/\W/g, '');
      }
    }

    str = str.toLowerCase();
    return str;
  }

  /*
    \w Word Characters
    Only the most basic ascii a-zA-Z0-9 and _ match \w everything else matches \W

    \s Space
    "\u00A0 \t".match(/\s/); nbsp, space, htab match
  */


                    // These characters must be escaped: 
                    //   /, \, ], -
                    //  ^ probably should be escaped if it's the first character
                    // most other characters may be escaped, but it's not neccessary
                    //   [, (, ), ., *, and others may be escaped)
                          
                      //  "      "     '     '
  /*
  // test data
  var crazyKeys =    "`~!@#$%^&*()-=_+[]{}\\|;:'\",<.>/?";
  var crazyChars = "a`b~c!d@e#f$g%h^i&j*k(l)m-n=o_p+q[r]s{t}u\\v|w;x:y'z\"0,1<2.3>4/5?6";
  var crazyRef = "abcdefghijklmnopqrstuvwxyz0123456";
  */


  exports.removeDiacritics = removeDiacritics;
  exports.asciify = asciify;
  exports.re_punctuation = punctuation;
  exports.re_smart_punctuation = smartpunctuation;
}());
