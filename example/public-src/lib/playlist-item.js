(function () {
  "use strict";

  function PlaylistItem(tag) {
    Object.keys(tag).forEach(function (key) {
      this[key] = tag[key];
    }, this);
    this._el;
  }
  PlaylistItem.prototype.toJSON = function () {
    var json = {}
      ;

    this.href = this.audio && this.audio.src;
    // TODO id suitable for DOM

    Object.keys(this).forEach(function (key) {
      json[key] = this[key];
    }, this);

    delete json.el;
    delete json.audio;
    return json;
  }

  module.exports.PlaylistItem = PlaylistItem;
}());
