(function () {
  "use strict";

  function PlaylistItem(tag) {
    if (!this || Object.keys(this).length) {
      return new PlaylistItem(tag);
    }
    Object.keys(tag).forEach(function (key) {
      this[key] = tag[key];
    }, this);
  }
  function toJSON() {
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
  PlaylistItem.prototype.toJSON = toJSON;

  PlaylistItem.create = function (tag) {
    return new PlaylistItem(tag);
  }
  module.exports.PlaylistItem = PlaylistItem;
}());
