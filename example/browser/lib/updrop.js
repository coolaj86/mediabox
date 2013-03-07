(function () {
  "use strict";

  var $ = require('jQuery')
    ;
  //
  // Drop Area Widget
  //

  function handleDrag(ev) {
    console.log('handledrag');
    //ev.stopPropagation();
    ev.preventDefault();
    ev.stopPropagation();
  }

  function createFileSelectOrDropHandler(callback) {
    function handleFileSelectOrDrop(ev) {
      /*jshint validthis:true*/
      console.log('handleFileSelectOrDrop', ev);
      ev.preventDefault();
      ev.stopPropagation();

      // TODO jQuery.event.props.push("dataTransfer");
      ev = ev.originalEvent || ev;
      var files = this.files || ev.dataTransfer && ev.dataTransfer.files
        ;

      callback.call(this, files, ev);
    }

    return handleFileSelectOrDrop;
  }

  function createDropAreaWidget(callback, widgetRoot, dropEl) {
    var parentDom = $(dropEl)
      , chooser
      , chooserClass
      , handleFileSelectOrDrop = createFileSelectOrDropHandler(callback)
      ;

    console.log('updrop assigned');

    function onMouseMove(ev) {
      console.log('2');
      // This calculation is done every time because
      // other elements on the page may have changed
      // i.e. a font may load after pageload or a list above may lengthen
      var parentPos = parentDom.offset();
      parentPos.right = parentPos.left + parentPos.width;
      parentPos.bottom = parentPos.top + parentPos.height;

      // For some reason it is MUCH faster to render this input as a child
      // However, as moving-target-child it never "onMouseLeave"s
      if (
             (ev.pageX > parentPos.right)
          || (ev.pageY > parentPos.bottom)
          || (ev.pageY < parentPos.top)
          || (ev.pageX < parentPos.left)
         ) {
        // TODO this is about 20 pixels off on the top in webkit
        // fine in firefox

        onMouseLeave(ev);
        return;
      }

      chooser.css({ top: ev.pageY - 10, left: ev.pageX - 10 });
    }

    function onMouseLeave(ev) {
      console.log('3');
      chooser.css({ top: -1000, left: -1000 });
    }

    chooserClass = 'updrop-file-chooser';
    // These values were copied from min.us
    // and seem to work well for both firefox
    // and webkit
    // TODO separate style without sacrificing convenience
    chooser = $('<input'
      + ' type="file"'
      + ' class="' + chooserClass + '"'
      + ' multiple="multiple"'
      + ' style="'
        + ' position: absolute;'
        + ' opacity: 0.5;'
        + ' top: -1000px;'
        + ' left: -1000px;'
        + ' z-index: 1000000;'
        + ' margin: -10px 0pt 0pt -179px;'
        + ' height: 30px;'
        + ' margin: -10px 0pt 0pt -179px;'
        + ' cursor: pointer;'
      + '"'
      + ' >')
      ;

    console.log('5');
    $(dropEl).append(chooser);

    $(widgetRoot).delegate(dropEl + ' input.' + chooserClass, 'change', handleFileSelectOrDrop);
    $(widgetRoot).delegate(dropEl, 'dragover', handleDrag);
    $(widgetRoot).delegate(dropEl, 'drop', handleFileSelectOrDrop);
    $(widgetRoot).delegate(dropEl, 'mousemove', onMouseMove);
    $(widgetRoot).delegate(dropEl, 'mouseleave', onMouseLeave);
    console.log('6');
  }

  module.exports.create = createDropAreaWidget;
  module.exports.abstract = createFileSelectOrDropHandler;
  module.exports.handleDrag = handleDrag;
}());
