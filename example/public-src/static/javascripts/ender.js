/*!
  * Ender: open module JavaScript framework
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * https://ender.no.de
  * License MIT
  * Build: ender -b jeesh underscore reqwest pure bean@0.1.5 node_modules/socket.io-browser
  */
!function (context) {

  function aug(o, o2) {
    for (var k in o2) {
      k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k]);
    }
    return o;
  }

  function boosh(s, r) {
    var els;
    if (ender._select && typeof s == 'string' || s.nodeName || s.length && 'item' in s) { //string || node || nodelist
      els = ender._select(s, r);
      els.selector = s;
    } else {
      els = isFinite(s.length) ? s : [s];
    }
    return aug(els, boosh);
  }

  function ender(s, r) {
    return boosh(s, r);
  }

  aug(ender, {
    _VERSION: '0.1.8',
    ender: function (o, chain) {
      aug(chain ? boosh : ender, o);
    }
  });

  var old = context.$;
  ender.noConflict = function () {
    context.$ = old;
    return this;
  };

  (typeof module !== 'undefined') && module.exports && (module.exports = ender);
  context['ender'] = context['$'] = ender;

}(this);
/*!
  * bean.js - copyright @dedfat
  * https://github.com/fat/bean
  * Follow our software http://twitter.com/dedfat
  * MIT License
  * special thanks to:
  * dean edwards: http://dean.edwards.name/
  * dperini: https://github.com/dperini/nwevents
  * the entire mootools team: github.com/mootools/mootools-core
  */
!function (context) {
  var __uid = 1, registry = {}, collected = {},
      overOut = /over|out/,
      namespace = /[^\.]*(?=\..*)\.|.*/,
      stripName = /\..*/,
      addEvent = 'addEventListener',
      attachEvent = 'attachEvent',
      removeEvent = 'removeEventListener',
      detachEvent = 'detachEvent',
      doc = context.document || {},
      root = doc.documentElement || {},
      W3C_MODEL = root[addEvent],
      eventSupport = W3C_MODEL ? addEvent : attachEvent,

  isDescendant = function (parent, child) {
    var node = child.parentNode;
    while (node != null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
  },

  retrieveUid = function (obj, uid) {
    return (obj.__uid = uid || obj.__uid || __uid++);
  },

  retrieveEvents = function (element) {
    var uid = retrieveUid(element);
    return (registry[uid] = registry[uid] || {});
  },

  listener = W3C_MODEL ? function (element, type, fn, add) {
    element[add ? addEvent : removeEvent](type, fn, false);
  } : function (element, type, fn, add, custom) {
    custom && add && (element['_on' + custom] = element['_on' + custom] || 0);
    element[add ? attachEvent : detachEvent]('on' + type, fn);
  },

  nativeHandler = function (element, fn, args) {
    return function (event) {
      event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || context).event);
      return fn.apply(element, [event].concat(args));
    };
  },

  customHandler = function (element, fn, type, condition, args) {
    return function (event) {
      if (condition ? condition.call(this, event) : W3C_MODEL ? true : event && event.propertyName == '_on' + type || !event) {
        fn.apply(element, [event].concat(args));
      }
    };
  },

  addListener = function (element, orgType, fn, args) {
    var type = orgType.replace(stripName, ''),
        events = retrieveEvents(element),
        handlers = events[type] || (events[type] = {}),
        uid = retrieveUid(fn, orgType.replace(namespace, ''));
    if (handlers[uid]) {
      return element;
    }
    var custom = customEvents[type];
    if (custom) {
      fn = custom.condition ? customHandler(element, fn, type, custom.condition) : fn;
      type = custom.base || type;
    }
    var isNative = nativeEvents[type];
    fn = isNative ? nativeHandler(element, fn, args) : customHandler(element, fn, type, false, args);
    isNative = W3C_MODEL || isNative;
    if (type == 'unload') {
      var org = fn;
      fn = function () {
        removeListener(element, type, fn) && org();
      };
    }
    element[eventSupport] && listener(element, isNative ? type : 'propertychange', fn, true, !isNative && type);
    handlers[uid] = fn;
    fn.__uid = uid;
    return type == 'unload' ? element : (collected[retrieveUid(element)] = element);
  },

  removeListener = function (element, orgType, handler) {
    var uid, names, uids, i, events = retrieveEvents(element), type = orgType.replace(stripName, '');
    if (!events || !events[type]) {
      return element;
    }
    names = orgType.replace(namespace, '');
    uids = names ? names.split('.') : [handler.__uid];
    for (i = uids.length; i--;) {
      uid = uids[i];
      handler = events[type][uid];
      delete events[type][uid];
      if (element[eventSupport]) {
        type = customEvents[type] ? customEvents[type].base : type;
        var isNative = W3C_MODEL || nativeEvents[type];
        listener(element, isNative ? type : 'propertychange', handler, false, !isNative && type);
      }
    }
    return element;
  },

  del = function (selector, fn, $) {
    return function (e) {
      var array = typeof selector == 'string' ? $(selector, this) : selector;
      for (var target = e.target; target && target != this; target = target.parentNode) {
        for (var i = array.length; i--;) {
          if (array[i] == target) {
            return fn.apply(target, arguments);
          }
        }
      }
    };
  },

  add = function (element, events, fn, delfn, $) {
    if (typeof events == 'object' && !fn) {
      for (var type in events) {
        events.hasOwnProperty(type) && add(element, type, events[type]);
      }
    } else {
      var isDel = typeof fn == 'string', types = (isDel ? fn : events).split(' ');
      fn = isDel ? del(events, delfn, $) : fn;
      for (var i = types.length; i--;) {
        addListener(element, types[i], fn, Array.prototype.slice.call(arguments, isDel ? 4 : 3));
      }
    }
    return element;
  },

  remove = function (element, orgEvents, fn) {
    var k, type, events,
        isString = typeof(orgEvents) == 'string',
        names = isString && orgEvents.replace(namespace, ''),
        rm = removeListener,
        attached = retrieveEvents(element);
    if (isString && /\s/.test(orgEvents)) {
      orgEvents = orgEvents.split(' ');
      var i = orgEvents.length - 1;
      while (remove(element, orgEvents[i]) && i--) {}
      return element;
    }
    events = isString ? orgEvents.replace(stripName, '') : orgEvents;
    if (!attached || (isString && !attached[events])) {
      return element;
    }
    if (typeof fn == 'function') {
      rm(element, events, fn);
    } else if (names) {
      rm(element, orgEvents);
    } else {
      rm = events ? rm : remove;
      type = isString && events;
      events = events ? (fn || attached[events] || events) : attached;
      for (k in events) {
        events.hasOwnProperty(k) && rm(element, type || k, events[k]);
      }
    }
    return element;
  },

  fire = function (element, type, args) {
    var evt, k, i, types = type.split(' ');
    for (i = types.length; i--;) {
      type = types[i].replace(stripName, '');
      var isNative = nativeEvents[type],
          isNamespace = types[i].replace(namespace, ''),
          handlers = retrieveEvents(element)[type];
      if (isNamespace) {
        isNamespace = isNamespace.split('.');
        for (k = isNamespace.length; k--;) {
          handlers[isNamespace[k]] && handlers[isNamespace[k]].apply(element, args);
        }
      } else if (!args && element[eventSupport]) {
        fireListener(isNative, type, element);
      } else {
        for (k in handlers) {
          handlers.hasOwnProperty(k) && handlers[k].apply(element, args);
        }
      }
    }
    return element;
  },

  fireListener = W3C_MODEL ? function (isNative, type, element) {
    evt = document.createEvent(isNative ? "HTMLEvents" : "UIEvents");
    evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, context, 1);
    element.dispatchEvent(evt);
  } : function (isNative, type, element) {
    isNative ? element.fireEvent('on' + type, document.createEventObject()) : element['_on' + type]++;
  },

  clone = function (element, from, type) {
    var events = retrieveEvents(from), obj, k;
    obj = type ? events[type] : events;
    for (k in obj) {
      obj.hasOwnProperty(k) && (type ? add : clone)(element, type || from, type ? obj[k] : k);
    }
    return element;
  },

  fixEvent = function (e) {
    var result = {};
    if (!e) {
      return result;
    }
    var type = e.type, target = e.target || e.srcElement;
    result.preventDefault = fixEvent.preventDefault(e);
    result.stopPropagation = fixEvent.stopPropagation(e);
    result.target = target && target.nodeType == 3 ? target.parentNode : target;
    if (~type.indexOf('key')) {
      result.keyCode = e.which || e.keyCode;
    } else if ((/click|mouse|menu/i).test(type)) {
      result.rightClick = e.which == 3 || e.button == 2;
      result.pos = { x: 0, y: 0 };
      if (e.pageX || e.pageY) {
        result.clientX = e.pageX;
        result.clientY = e.pageY;
      } else if (e.clientX || e.clientY) {
        result.clientX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        result.clientY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      overOut.test(type) && (result.relatedTarget = e.relatedTarget || e[(type == 'mouseover' ? 'from' : 'to') + 'Element']);
    }
    for (var k in e) {
      if (!(k in result)) {
        result[k] = e[k];
      }
    }
    return result;
  };

  fixEvent.preventDefault = function (e) {
    return function () {
      if (e.preventDefault) {
        e.preventDefault();
      }
      else {
        e.returnValue = false;
      }
    };
  };

  fixEvent.stopPropagation = function (e) {
    return function () {
      if (e.stopPropagation) {
        e.stopPropagation();
      } else {
        e.cancelBubble = true;
      }
    };
  };

  var nativeEvents = { click: 1, dblclick: 1, mouseup: 1, mousedown: 1, contextmenu: 1, //mouse buttons
    mousewheel: 1, DOMMouseScroll: 1, //mouse wheel
    mouseover: 1, mouseout: 1, mousemove: 1, selectstart: 1, selectend: 1, //mouse movement
    keydown: 1, keypress: 1, keyup: 1, //keyboard
    orientationchange: 1, // mobile
    touchstart: 1, touchmove: 1, touchend: 1, touchcancel: 1, // touch
    gesturestart: 1, gesturechange: 1, gestureend: 1, // gesture
    focus: 1, blur: 1, change: 1, reset: 1, select: 1, submit: 1, //form elements
    load: 1, unload: 1, beforeunload: 1, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
    error: 1, abort: 1, scroll: 1 }; //misc

  function check(event) {
    var related = event.relatedTarget;
    if (!related) {
      return related == null;
    }
    return (related != this && related.prefix != 'xul' && !/document/.test(this.toString()) && !isDescendant(this, related));
  }

  var customEvents = {
    mouseenter: { base: 'mouseover', condition: check },
    mouseleave: { base: 'mouseout', condition: check },
    mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
  };

  var bean = { add: add, remove: remove, clone: clone, fire: fire };

  var clean = function (el) {
    var uid = remove(el).__uid;
    if (uid) {
      delete collected[uid];
      delete registry[uid];
    }
  };

  if (context[attachEvent]) {
    add(context, 'unload', function () {
      for (var k in collected) {
        collected.hasOwnProperty(k) && clean(collected[k]);
      }
      context.CollectGarbage && CollectGarbage();
    });
  }

  var oldBean = context.bean;
  bean.noConflict = function () {
    context.bean = oldBean;
    return this;
  };

  (typeof module !== 'undefined' && module.exports) ?
    (module.exports = bean) :
    (context.bean = bean);

}(this);!function () {
  var b = bean.noConflict(),
      integrate = function (method, type, method2) {
        var _args = type ? [type] : [];
        return function () {
          for (var args, i = 0, l = this.length; i < l; i++) {
            args = [this[i]].concat(_args, Array.prototype.slice.call(arguments, 0));
            args.length == 4 && args.push($);
            !arguments.length && method == 'add' && type && (method = 'fire');
            b[method].apply(this, args);
          }
          return this;
        };
      };

  var add = integrate('add'),
      remove = integrate('remove'),
      fire = integrate('fire');

  var methods = {

    on: add,
    addListener: add,
    bind: add,
    listen: add,
    delegate: add,

    unbind: remove,
    unlisten: remove,
    removeListener: remove,
    undelegate: remove,

    emit: fire,
    trigger: fire,

    cloneEvents: integrate('clone'),

    hover: function (enter, leave) {
      for (var i = 0, l = this.length; i < l; i++) {
        b.add.call(this, this[i], 'mouseenter', enter);
        b.add.call(this, this[i], 'mouseleave', leave);
      }
      return this;
    }
  };

  var shortcuts = [
    'blur', 'change', 'click', 'dblclick', 'error', 'focus', 'focusin',
    'focusout', 'keydown', 'keypress', 'keyup', 'load', 'mousedown',
    'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'mouseup',
    'resize', 'scroll', 'select', 'submit', 'unload'
  ];

  for (var i = shortcuts.length; i--;) {
    var shortcut = shortcuts[i];
    methods[shortcut] = integrate('add', shortcut);
  }

  $.ender(methods, true);
}();
/** Socket.IO 0.6.2 - Built with build.js */
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * @namespace
 */
var io = this.io = {
  
  /**
   * Library version.
   */
  version: '0.6.2',
  
  /**
   * Updates the location of the WebSocketMain.swf file that is required for the Flashsocket transport.
   * This should only be needed if you want to load in the WebSocketMainInsecure.swf or if you want to
   * host the .swf file on a other server.
   *
   * @static
   * @deprecated Set the variable `WEB_SOCKET_SWF_LOCATION` pointing to WebSocketMain.swf
   * @param {String} path The path of the .swf file
   * @api public
   */
  setPath: function(path){
    if (window.console && console.error) console.error('io.setPath will be removed. Please set the variable WEB_SOCKET_SWF_LOCATION pointing to WebSocketMain.swf');
    this.path = /\/$/.test(path) ? path : path + '/';
    WEB_SOCKET_SWF_LOCATION = path + 'lib/vendor/web-socket-js/WebSocketMain.swf';
  }
};

/**
 * Expose Socket.IO in jQuery
 */
if ('jQuery' in this) jQuery.io = this.io;

/**
 * Default path to the .swf file.
 */
if (typeof window != 'undefined'){
  // WEB_SOCKET_SWF_LOCATION = (document.location.protocol == 'https:' ? 'https:' : 'http:') + '//cdn.socket.io/' + this.io.version + '/WebSocketMain.swf';
  if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined')
    WEB_SOCKET_SWF_LOCATION = '/socket.io/lib/vendor/web-socket-js/WebSocketMain.swf';
}
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * Set when the `onload` event is executed on the page. This variable is used by
   * `io.util.load` to detect if we need to execute the function immediately or add
   * it to a onload listener.
   *
   * @type {Boolean}
   * @api private
   */
  pageLoaded = false;
  
  /**
   * @namespace
   */
  io.util = {
    /**
     * Executes the given function when the page is loaded.
     *
     * Example:
     *
     *     io.util.load(function(){ console.log('page loaded') });
     *
     * @param {Function} fn
     * @api public
     */
    load: function(fn){
      if (/loaded|complete/.test(document.readyState) || pageLoaded) return fn();
      if ('attachEvent' in window){
        window.attachEvent('onload', fn);
      } else {
        window.addEventListener('load', fn, false);
      }
    },
    
    /**
     * Defers the function untill it's the function can be executed without
     * blocking the load process. This is especially needed for WebKit based
     * browsers. If a long running connection is made before the onload event
     * a loading indicator spinner will be present at all times untill a
     * reconnect has been made.
     *
     * @param {Function} fn
     * @api public
     */
    defer: function(fn){
      if (!io.util.webkit) return fn();
      io.util.load(function(){
        setTimeout(fn,100);
      });
    },
    
    /**
     * Inherit the prototype methods from one constructor into another.
     *
     * Example:
     *
     *     function foo(){};
     *     foo.prototype.hello = function(){ console.log( this.words )};
     *     
     *     function bar(){
     *       this.words = "Hello world";
     *     };
     *     
     *     io.util.inherit(bar,foo);
     *     var person = new bar();
     *     person.hello();
     *     // => "Hello World"
     *
     * @param {Constructor} ctor The constructor that needs to inherit the methods.
     * @param {Constructor} superCtor The constructor to inherit from.
     * @api public
     */
    inherit: function(ctor, superCtor){
      // no support for `instanceof` for now
      for (var i in superCtor.prototype){
        ctor.prototype[i] = superCtor.prototype[i];
      }
    },
    
    /**
     * Finds the index of item in a given Array.
     *
     * Example:
     *
     *     var data = ['socket',2,3,4,'socket',5,6,7,'io'];
     *     io.util.indexOf(data,'socket',1);
     *     // => 4
     *
     * @param {Array} arr The array
     * @param item The item that we need to find
     * @param {Integer} from Starting point
     * @api public
     */
    indexOf: function(arr, item, from){
      for (var l = arr.length, i = (from < 0) ? Math.max(0, l + from) : from || 0; i < l; i++){
        if (arr[i] === item) return i;
      }
      return -1;
    },
    
    /**
     * Checks if the given object is an Array.
     *
     * Example:
     *
     *     io.util.isArray([]);
     *     // => true
     *     io.util.isArray({});
     *    // => false
     *
     * @param obj
     * @api public
     */
    isArray: function(obj){
      return Object.prototype.toString.call(obj) === '[object Array]';
    },
    
    /**
     * Merges the properties of two objects.
     *
     * Example:
     *
     *     var a = {foo:'bar'}
     *       , b = {bar:'baz'};
     *     
     *     io.util.merge(a,b);
     *     // => {foo:'bar',bar:'baz'}
     *
     * @param {Object} target The object that receives the keys
     * @param {Object} additional The object that supplies the keys
     * @api public
     */
    merge: function(target, additional){
      for (var i in additional)
        if (additional.hasOwnProperty(i))
          target[i] = additional[i];
    }
  };
  
  /**
   * Detect the Webkit platform based on the userAgent string.
   * This includes Mobile Webkit.
   *
   * @type {Boolean}
   * @api public
   */
  io.util.webkit = /webkit/i.test(navigator.userAgent);
  
  io.util.load(function(){
    pageLoaded = true;
  });

})();
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * Message frame for encoding and decoding responses from the Socket.IO server.
   *
   * @const
   * @type {String}
   */
  frame = '~m~',
  
  /**
   * Transforms the message to a string. If the message is an {Object} we will convert it to
   * a string and prefix it with the `~j~` flag to indicate that message is JSON encoded.
   *
   * Example:
   *
   *     stringify({foo:"bar"});
   *     // => "~j~{"foo":"bar"}"
   *
   * @param {String|Array|Object} message The messages that needs to be transformed to a string.
   * @throws {Error} When the JSON.stringify implementation is missing in the browser.
   * @returns {String} Message.
   * @api private
   */
  stringify = function(message){
    if (Object.prototype.toString.call(message) == '[object Object]'){
      if (!('JSON' in window)){
        var error = 'Socket.IO Error: Trying to encode as JSON, but JSON.stringify is missing.';
        if ('console' in window && console.error){
          console.error(error);
        } else {
          throw new Error(error);
        }
        return '{ "$error": "'+ error +'" }';
      }
      return '~j~' + JSON.stringify(message);
    } else {
      return String(message);
    }
  },
  
  /**
   * This is the transport template for all supported transport methods. It provides the
   * basic functionality to create a working transport for Socket.IO.
   *
   * Options:
   *   - `timeout`  Transport shutdown timeout in milliseconds, based on the heartbeat interval.
   *
   * Example:
   *
   *     var transport = io.Transport.mytransport = function(){
   *       io.Transport.apply(this, arguments);
   *     };
   *     io.util.inherit(transport, io.Transport);
   *     
   *     ... // more code here
   *     
   *     // connect with your new transport
   *     var socket = new io.Socket(null,{transports:['mytransport']});
   *
   * @constructor
   * @param {Object} base The reference to io.Socket.
   * @param {Object} options The transport options.
   * @property {io.Socket|Object} base The reference to io.Socket.
   * @property {Object} options The transport options, these are used to overwrite the default options
   * @property {String} sessionid The sessionid of the established connection, this is only available a connection is established
   * @property {Boolean} connected The connection has been established.
   * @property {Boolean} connecting We are still connecting to the server.
   * @api public
   */
  Transport = io.Transport = function(base, options){
    this.base = base;
    this.options = {
      timeout: 15000 // based on heartbeat interval default
    };
    io.util.merge(this.options, options);
  };

  /**
   * Send the message to the connected Socket.IO server.
   *
   * @throws {Error} When the io.Transport is inherited, it should override this method.
   * @api public
   */
  Transport.prototype.send = function(){
    throw new Error('Missing send() implementation');
  };
  
  /**
   * Establish a connection with the Socket.IO server..
   *
   * @throws {Error} When the io.Transport is inherited, it should override this method.
   * @api public
   */
  Transport.prototype.connect = function(){
    throw new Error('Missing connect() implementation');
  };

  /**
   * Disconnect the established connection.
   *
   * @throws {Error} When the io.Transport is inherited, it should override this method.
   * @api private
   */
  Transport.prototype.disconnect = function(){
    throw new Error('Missing disconnect() implementation');
  };
  
  /**
   * Encode the message by adding the `frame` to each message. This allows
   * the client so send multiple messages with only one request.
   *
   * @param {String|Array} messages Messages that need to be encoded.
   * @returns {String} Encoded message.
   * @api private
   */
  Transport.prototype.encode = function(messages){
    var ret = '', message;
    messages = io.util.isArray(messages) ? messages : [messages];
    for (var i = 0, l = messages.length; i < l; i++){
      message = messages[i] === null || messages[i] === undefined ? '' : stringify(messages[i]);
      ret += frame + message.length + frame + message;
    }
    return ret;
  };
  
  /**
   * Decoded the response from the Socket.IO server, as the server could send multiple
   * messages in one response.
   *
   * @param (String} data The response from the server that requires decoding
   * @returns {Array} Decoded messages.
   * @api private
   */
  Transport.prototype.decode = function(data){
    var messages = [], number, n;
    do {
      if (data.substr(0, 3) !== frame) return messages;
      data = data.substr(3);
      number = '', n = '';
      for (var i = 0, l = data.length; i < l; i++){
        n = Number(data.substr(i, 1));
        if (data.substr(i, 1) == n){
          number += n;
        } else {
          data = data.substr(number.length + frame.length);
          number = Number(number);
          break;
        }
      }
      messages.push(data.substr(0, number)); // here
      data = data.substr(number);
    } while(data !== '');
    return messages;
  };
  
  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */
  Transport.prototype.onData = function(data){
    this.setTimeout();
    var msgs = this.decode(data);
    if (msgs && msgs.length){
      for (var i = 0, l = msgs.length; i < l; i++){
        this.onMessage(msgs[i]);
      }
    }
  };
  
  /**
   * All the transports have a dedicated timeout to detect if
   * the connection is still alive. We clear the existing timer
   * and set new one each time this function is called. When the
   * timeout does occur it will call the `onTimeout` method.
   *
   * @api private
   */
  Transport.prototype.setTimeout = function(){
    var self = this;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(function(){
      self.onTimeout();
    }, this.options.timeout);
  };
  
  /**
   * Disconnect from the Socket.IO server when a timeout occurs.
   * 
   * @api private
   */
  Transport.prototype.onTimeout = function(){
    this.onDisconnect();
  };
  
  /**
   * After the response from the server has been parsed to individual
   * messages we need to decode them using the the Socket.IO message
   * protocol: <https://github.com/learnboost/socket.io-node/>.
   *
   * When a message is received we check if a session id has been set,
   * if the session id is missing we can assume that the received message
   * contains the sessionid of the connection.
   
   * When a message is prefixed with `~h~` we dispatch it our heartbeat
   * processing method `onHeartbeat` with the content of the heartbeat.
   *
   * When the message is prefixed with `~j~` we can assume that the contents
   * of the message is JSON encoded, so we parse the message and notify
   * the base of the new message.
   *
   * If none of the above, we consider it just a plain text message and
   * notify the base of the new message.
   *
   * @param {String} message A decoded message from the server.
   * @api private
   */
  Transport.prototype.onMessage = function(message){
    if (!this.sessionid){
      this.sessionid = message;
      this.onConnect();
    } else if (message.substr(0, 3) == '~h~'){
      this.onHeartbeat(message.substr(3));
    } else if (message.substr(0, 3) == '~j~'){
      this.base.onMessage(JSON.parse(message.substr(3)));
    } else {
      this.base.onMessage(message);
    }
  },
  
  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */
  Transport.prototype.onHeartbeat = function(heartbeat){
    this.send('~h~' + heartbeat); // echo
  };
  
  /**
   * Notifies the base when a connection to the Socket.IO server has
   * been established. And it starts the connection `timeout` timer.
   *
   * @api private
   */
  Transport.prototype.onConnect = function(){
    this.connected = true;
    this.connecting = false;
    this.base.onConnect();
    this.setTimeout();
  };
  
  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */
  Transport.prototype.onDisconnect = function(){
    this.connecting = false;
    this.connected = false;
    this.sessionid = null;
    this.base.onDisconnect();
  };
  
  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */
  Transport.prototype.prepareUrl = function(){
    return (this.base.options.secure ? 'https' : 'http') 
      + '://' + this.base.host 
      + ':' + this.base.options.port
      + '/' + this.base.options.resource
      + '/' + this.type
      + (this.sessionid ? ('/' + this.sessionid) : '/');
  };

})();
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * A small stub function that will be used to reduce memory leaks.
   *
   * @type {Function}
   * @api private
   */
  empty = new Function,
  
  /**
   * We preform a small feature detection to see if `Cross Origin Resource Sharing`
   * is supported in the `XMLHttpRequest` object, so we can use it for cross domain requests.
   *
   * @type {Boolean}
   * @api private
   */ 
  XMLHttpRequestCORS = (function(){
    if (!('XMLHttpRequest' in window)) return false;
    // CORS feature detection
    var a = new XMLHttpRequest();
    return a.withCredentials != undefined;
  })(),
  
  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest we will return that.
   * @api private
   */
  request = function(xdomain){
    if ('XDomainRequest' in window && xdomain) return new XDomainRequest();
    if ('XMLHttpRequest' in window && (!xdomain || XMLHttpRequestCORS)) return new XMLHttpRequest();
    if (!xdomain){
      try {
        var a = new ActiveXObject('MSXML2.XMLHTTP');
        return a;
      } catch(e){}
    
      try {
        var b = new ActiveXObject('Microsoft.XMLHTTP');
        return b;
      } catch(e){}
    }
    return false;
  },
  
  /**
   * This is the base for XHR based transports, the `XHR-Polling` and the `XHR-multipart` 
   * transports will extend this class.
   *
   * @constructor
   * @extends {io.Transport}
   * @property {Array} sendBuffer Used to queue up messages so they can be send as one request.
   * @api public
   */
  XHR = io.Transport.XHR = function(){
    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };
  
  io.util.inherit(XHR, io.Transport);
  
  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */
  XHR.prototype.connect = function(){
    this.get();
    return this;
  };
  
  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our buffer
   * we encode it and forward it to the sendIORequest method.
   *
   * @api private
   */
  XHR.prototype.checkSend = function(){
    if (!this.posting && this.sendBuffer.length){
      var encoded = this.encode(this.sendBuffer);
      this.sendBuffer = [];
      this.sendIORequest(encoded);
    }
  };
  
  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */
  XHR.prototype.send = function(data){
    if (io.util.isArray(data)){
      this.sendBuffer.push.apply(this.sendBuffer, data);
    } else {
      this.sendBuffer.push(data);
    }
    this.checkSend();
    return this;
  };
  
  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */
  XHR.prototype.sendIORequest = function(data){
    var self = this;
    this.posting = true;
    this.sendXHR = this.request('send', 'POST');
    this.sendXHR.onreadystatechange = function(){
      var status;
      if (self.sendXHR.readyState == 4){
        self.sendXHR.onreadystatechange = empty;
        try { status = self.sendXHR.status; } catch(e){}
        self.posting = false;
        if (status == 200){
          self.checkSend();
        } else {
          self.onDisconnect();
        }
      }
    };
    this.sendXHR.send('data=' + encodeURIComponent(data));
  };
  
  /**
   * Disconnect the established connection.
   *
   * @returns {Transport}.
   * @api public
   */
  XHR.prototype.disconnect = function(){
    // send disconnection signal
    this.onDisconnect();
    return this;
  };
  
  /**
   * Handle the disconnect request.
   *
   * @api private
   */
  XHR.prototype.onDisconnect = function(){
    if (this.xhr){
      this.xhr.onreadystatechange = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
    if (this.sendXHR){
      this.sendXHR.onreadystatechange = empty;
      try {
        this.sendXHR.abort();
      } catch(e){}
      this.sendXHR = null;
    }
    this.sendBuffer = [];
    io.Transport.prototype.onDisconnect.call(this);
  };
  
  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @param {Boolean} multipart Do a multipart XHR request
   * @returns {XMLHttpRequest}
   * @api private
   */
  XHR.prototype.request = function(url, method, multipart){
    var req = request(this.base.isXDomain());
    if (multipart) req.multipart = true;
    req.open(method || 'GET', this.prepareUrl() + (url ? '/' + url : ''));
    if (method == 'POST' && 'setRequestHeader' in req){
      req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=utf-8');
    }
    return req;
  };
  
  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */
  XHR.check = function(xdomain){
    try {
      if (request(xdomain)) return true;
    } catch(e){}
    return false;
  };
  
  /**
   * Check if the XHR transport supports corss domain requests.
   * 
   * @returns {Boolean}
   * @api public
   */
  XHR.xdomainCheck = function(){
    return XHR.check(true);
  };
  
  XHR.request = request;
  
})();

/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an persistent
   * connection with the Socket.IO server. This transport will also be inherited by the
   * FlashSocket fallback as it provides a API compatible polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */
  WS = io.Transport.websocket = function(){
    io.Transport.apply(this, arguments);
  };
  
  io.util.inherit(WS, io.Transport);
  
  /**
   * The transport type, you use this to identify which transport was chosen.
   *
   * @type {String}
   * @api public
   */
  WS.prototype.type = 'websocket';
  
  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */
  WS.prototype.connect = function(){
    var self = this;
    this.socket = new WebSocket(this.prepareUrl());
    this.socket.onmessage = function(ev){ self.onData(ev.data); };
    this.socket.onclose = function(ev){ self.onDisconnect(); };
    this.socket.onerror = function(e){ self.onError(e); };
    return this;
  };
  
  /**
   * Send a message to the Socket.IO server. The message will automatically be encoded
   * in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */
  WS.prototype.send = function(data){
    if (this.socket) this.socket.send(this.encode(data));
    return this;
  };
  
  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */
  WS.prototype.disconnect = function(){
    if (this.socket) this.socket.close();
    return this;
  };
  
  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */
  WS.prototype.onError = function(e){
    this.base.emit('error', [e]);
  };
  
  /**
   * Generate a `WebSocket` compatible URL based on the options
   * the user supplied in our Socket.IO base.
   *
   * @returns {String} Connection url
   * @api private
   */
  WS.prototype.prepareUrl = function(){
    return (this.base.options.secure ? 'wss' : 'ws') 
    + '://' + this.base.host 
    + ':' + this.base.options.port
    + '/' + this.base.options.resource
    + '/' + this.type
    + (this.sessionid ? ('/' + this.sessionid) : '');
  };
  
  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */
  WS.check = function(){
    // we make sure WebSocket is not confounded with a previously loaded flash WebSocket
    return 'WebSocket' in window && WebSocket.prototype && ( WebSocket.prototype.send && !!WebSocket.prototype.send.toString().match(/native/i)) && typeof WebSocket !== "undefined";
  };
  
  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */
  WS.xdomainCheck = function(){
    return true;
  };
  
})();

/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * The Flashsocket transport. This is a API wrapper for the HTML5 WebSocket specification.
   * It uses a .swf file to communicate with the server. If you want to serve the .swf file
   * from a other server than where the Socket.IO script is coming from you need to use the
   * insecure version of the .swf. More information about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */
  Flashsocket = io.Transport.flashsocket = function(){
    io.Transport.websocket.apply(this, arguments);
  };
  
  io.util.inherit(Flashsocket, io.Transport.websocket);
  
  /**
   * The transport type, you use this to identify which transport was chosen.
   *
   * @type {String}
   * @api public
   */
  Flashsocket.prototype.type = 'flashsocket';
  
  /**
   * Disconnect the established `Flashsocket` connection. This is done by adding a new
   * task to the Flashsocket. The rest will be handled off by the `WebSocket` transport.
   *
   * @returns {Transport}
   * @api public
   */
  Flashsocket.prototype.connect = function(){
    var self = this, args = arguments;
    WebSocket.__addTask(function(){
      io.Transport.websocket.prototype.connect.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the Flashsocket. The rest will be handled off by the `WebSocket` transport.
   *
   * @returns {Transport}
   * @api public
   */
  Flashsocket.prototype.send = function(){
    var self = this, args = arguments;
    WebSocket.__addTask(function(){
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };
  
  /**
   * Check if the Flashsocket transport is supported as it requires that the Adobe Flash Player
   * plugin version `10.0.0` or greater is installed. And also check if the polyfill is correctly
   * loaded.
   *
   * @returns {Boolean}
   * @api public
   */
  Flashsocket.check = function(){
    if (typeof WebSocket == 'undefined' || !('__addTask' in WebSocket) || !swfobject) return false;
    return swfobject.hasFlashPlayerVersion("10.0.0");
  };
  
  /**
   * Check if the Flashsocket transport can be used as cross domain / cross origin transport.
   * Because we can't see which type (secure or insecure) of .swf is used we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */
  Flashsocket.xdomainCheck = function(){
    return true;
  };
  
})();
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */
  HTMLFile = io.Transport.htmlfile = function(){
    io.Transport.XHR.apply(this, arguments);
  };
  
  io.util.inherit(HTMLFile, io.Transport.XHR);
  
  /**
   * The transport type, you use this to identify which transport was chosen.
   *
   * @type {String}
   * @api public
   */
  HTMLFile.prototype.type = 'htmlfile';
  
  /**
   * Starts the HTMLFile data stream for incoming messages. And registers a
   * onunload event listener so the HTMLFile will be destroyed.
   *
   * @api private
   */
  HTMLFile.prototype.get = function(){
    var self = this;
    this.open();
    window.attachEvent('onunload', function(){ self.destroy(); });
  };
  
  /**
   * Creates a new ActiveX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */
  HTMLFile.prototype.open = function(){
    this.doc = new ActiveXObject('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.parentWindow.s = this;
    this.doc.close();
    
    var iframeC = this.doc.createElement('div');
    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');
    iframeC.appendChild(this.iframe);
    this.iframe.src = this.prepareUrl() + '/' + (+ new Date);
  };
  
  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */
  HTMLFile.prototype._ = function(data, doc){
    this.onData(data);
    var script = doc.getElementsByTagName('script')[0];
    script.parentNode.removeChild(script);
  };
  
  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */
  HTMLFile.prototype.destroy = function(){
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}
      this.doc = null;
      CollectGarbage();
    }
  };
  
  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */
  HTMLFile.prototype.disconnect = function(){
    this.destroy();
    return io.Transport.XHR.prototype.disconnect.call(this);
  };
  
  /**
   * Checks if the browser supports this transport. The browser
   * must have an `ActiveXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */
  HTMLFile.check = function(){
    if ('ActiveXObject' in window){
      try {
        var a = new ActiveXObject('htmlfile');
        return a && io.Transport.XHR.check();
      } catch(e){}
    }
    return false;
  };
  
  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */
  HTMLFile.xdomainCheck = function(){
    // we can probably do handling for sub-domains, we should test that it's cross domain but a subdomain here
    return false;
  };
  
})();
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * The XHR-Multipart transport uses the a multipart XHR connection to
   * stream in the data from the Socket.IO server
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */
  XHRMultipart = io.Transport['xhr-multipart'] = function(){
    io.Transport.XHR.apply(this, arguments);
  };
  
  io.util.inherit(XHRMultipart, io.Transport.XHR);
  
   /**
   * The transport type, you use this to identify which transport was chosen.
   *
   * @type {String}
   * @api public
   */
  XHRMultipart.prototype.type = 'xhr-multipart';
  
  /**
   * Starts the multipart stream for incomming messages.
   *
   * @api private
   */
  XHRMultipart.prototype.get = function(){
    var self = this;
    this.xhr = this.request('', 'GET', true);
    this.xhr.onreadystatechange = function(){
      if (self.xhr.readyState == 4) self.onData(self.xhr.responseText);
    };
    this.xhr.send(null);
  };
  
  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */
  XHRMultipart.check = function(){
    return 'XMLHttpRequest' in window && 'prototype' in XMLHttpRequest && 'multipart' in XMLHttpRequest.prototype;
  };
  
  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */
  XHRMultipart.xdomainCheck = function(){
    return true;
  };
  
})();
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * A small stub function that will be used to reduce memory leaks.
   *
   * @type {Function}
   * @api private
   */
  empty = new Function(),
  
  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */
  XHRPolling = io.Transport['xhr-polling'] = function(){
    io.Transport.XHR.apply(this, arguments);
  };
  
  io.util.inherit(XHRPolling, io.Transport.XHR);
  
  /**
   * The transport type, you use this to identify which transport was chosen.
   *
   * @type {string}
   * @api public
   */
  XHRPolling.prototype.type = 'xhr-polling';
  
  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */
  XHRPolling.prototype.connect = function(){
    var self = this;
    io.util.defer(function(){ io.Transport.XHR.prototype.connect.call(self) });
    return false;
  };
  
   /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */
  XHRPolling.prototype.get = function(){
    var self = this;
    this.xhr = this.request(+ new Date, 'GET');
    this.xhr.onreadystatechange = function(){
      var status;
      if (self.xhr.readyState == 4){
        self.xhr.onreadystatechange = empty;
        try { status = self.xhr.status; } catch(e){}
        if (status == 200){
          self.onData(self.xhr.responseText);
          self.get();
        } else {
          self.onDisconnect();
        }
      }
    };
    this.xhr.send(null);
  };
  
  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */
  XHRPolling.check = function(){
    return io.Transport.XHR.check();
  };
  
  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */
  XHRPolling.xdomainCheck = function(){
    return io.Transport.XHR.xdomainCheck();
  };

})();

/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */
  JSONPPolling = io.Transport['jsonp-polling'] = function(){
    io.Transport.XHR.apply(this, arguments);
    this.insertAt = document.getElementsByTagName('script')[0];
    this.index = io.JSONP.length;
    io.JSONP.push(this);
  };
  
  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);
  
  /**
   * A list of all JSONPolling transports, this is used for by
   * the Socket.IO server to distribute the callbacks.
   *
   * @type {Array}
   * @api private
   */
  io.JSONP = [];
  
  /**
   * The transport type, you use this to identify which transport was chosen.
   *
   * @type {String}
   * @api public
   */
  JSONPPolling.prototype.type = 'jsonp-polling';
  
  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */
  JSONPPolling.prototype.sendIORequest = function(data){
    var self = this;
    if (!('form' in this)){
      var form = document.createElement('FORM'),
        area = document.createElement('TEXTAREA'),
        id = this.iframeId = 'socket_io_iframe_' + this.index,
        iframe;
  
      form.style.position = 'absolute';
      form.style.top = '-1000px';
      form.style.left = '-1000px';
      form.target = id;
      form.method = 'POST';
      form.action = this.prepareUrl() + '/' + (+new Date) + '/' + this.index;
      area.name = 'data';
      form.appendChild(area);
      this.insertAt.parentNode.insertBefore(form, this.insertAt);
      document.body.appendChild(form);
  
      this.form = form;
      this.area = area;
    }
  
    function complete(){
      initIframe();
      self.posting = false;
      self.checkSend();
    };
  
    function initIframe(){
      if (self.iframe){
        self.form.removeChild(self.iframe);
      }
  
      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch(e){
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }
  
      iframe.id = self.iframeId;
  
      self.form.appendChild(iframe);
      self.iframe = iframe;
    };
  
    initIframe();
  
    this.posting = true;
    this.area.value = data;
  
    try {
      this.form.submit();
    } catch(e){}
  
    if (this.iframe.attachEvent){
      iframe.onreadystatechange = function(){
        if (self.iframe.readyState == 'complete') complete();
      };
    } else {
      this.iframe.onload = complete;
    }
  };
  
  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */
  JSONPPolling.prototype.get = function(){
    var self = this,
        script = document.createElement('SCRIPT');
    if (this.script){
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }
    script.async = true;
    script.src = this.prepareUrl() + '/' + (+new Date) + '/' + this.index;
    script.onerror = function(){
      self.onDisconnect();
    };
    this.insertAt.parentNode.insertBefore(script, this.insertAt);
    this.script = script;
  };
  
  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */
  JSONPPolling.prototype._ = function(){
    this.onData.apply(this, arguments);
    this.get();
    return this;
  };
  
  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */
  JSONPPolling.check = function(){
    return true;
  };
  
  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */
  JSONPPolling.xdomainCheck = function(){
    return true;
  };
})();
/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io;
  
  /**
   * Create a new `Socket.IO client` which can establish a persisted
   * connection with a Socket.IO enabled server.
   *
   * Options:
   *   - `secure`  Use secure connections, defaulting to false.
   *   - `document`  Reference to the document object to retrieve and set cookies, defaulting to document.
   *   - `port`  The port where the Socket.IO server listening on, defaulting to location.port.
   *   - `resource`  The path or namespace on the server where the Socket.IO requests are intercepted, defaulting to 'socket.io'.
   *   - `transports`  A ordered list with the available transports, defaulting to all transports.
   *   - `transportOption`  A {Object} containing the options for each transport. The key of the object should reflect
   *      name of the transport and the value a {Object} with the options.
   *   - `connectTimeout`  The duration in milliseconds that a transport has to establish a working connection, defaulting to 5000.
   *   - `tryTransportsOnConnectTimeout`  Should we attempt other transport methods when the connectTimeout occurs, defaulting to true.
   *   - `reconnect`  Should reconnection happen automatically, defaulting to true.
   *   - `reconnectionDelay`  The delay in milliseconds before we attempt to establish a working connection. This value will
   *      increase automatically using a exponential back off algorithm. Defaulting to 500.
   *   - `maxReconnectionAttempts`  Number of attempts we should make before seizing the reconnect operation, defaulting to 10.
   *   - `rememberTransport` Should the successfully connected transport be remembered in a cookie, defaulting to true.
   *
   * Examples:
   *
   * Create client with the default settings.
   *
   *     var socket = new io.Socket();
   *     socket.connect();
   *     socket.on('message', function(msg){
   *       console.log('Received message: ' + msg );
   *     });
   *     socket.on('connect', function(){
   *       socket.send('Hello from client');
   *     });
   *
   * Create a connection with server on a different port and host.
   *
   *     var socket = new io.Socket('http://example.com',{port:1337});
   *
   * @constructor
   * @exports Socket as io.Socket
   * @param {String} [host] The host where the Socket.IO server is located, it defaults to the host that runs the page.
   * @param {Objects} [options] The options that will configure the Socket.IO client. 
   * @property {String} host The supplied host arguments or the host that page runs.
   * @property {Object} options The passed options combined with the defaults.
   * @property {Boolean} connected Whether the socket is connected or not.
   * @property {Boolean} connecting Whether the socket is connecting or not.
   * @property {Boolean} reconnecting Whether the socket is reconnecting or not.
   * @property {Object} transport The selected transport instance.
   * @api public
   */
  var Socket = io.Socket = function(host, options){
    this.host = host || document.domain;
    this.options = {
      secure: false,
      document: document,
      port: document.location.port || 80,
      resource: 'socket.io',
      transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling'],
      transportOptions: {
        'xhr-polling': {
          timeout: 25000 // based on polling duration default
        },
        'jsonp-polling': {
          timeout: 25000
        }
      },
      connectTimeout: 5000,
      tryTransportsOnConnectTimeout: true,
      reconnect: true,
      reconnectionDelay: 500,
      maxReconnectionAttempts: 10,
      rememberTransport: true
    };
    io.util.merge(this.options, options);
    this.connected = false;
    this.connecting = false;
    this.reconnecting = false;
    this.events = {};
    this.transport = this.getTransport();
    if (!this.transport && 'console' in window) console.error('No transport available');
  };
  
  /**
   * Find an available transport based on the options supplied in the constructor. For example if the
   * `rememberTransport` option was set we will only connect with the previous successfully connected transport.
   * The supplied transports can be overruled if the `override` argument is supplied.
   *
   * Example:
   *
   * Override the existing transports.
   *
   *     var socket = new io.Socket();
   *     socket.getTransport(['jsonp-polling','websocket']);
   *     // returns the json-polling transport because it's availabe in all browsers.
   *
   * @param {Array} [override] A ordered list with transports that should be used instead of the options.transports.
   * @returns {Null|Transport} The available transport.
   * @api private
   */
  Socket.prototype.getTransport = function(override){
    var transports = override || this.options.transports, match;
    if (this.options.rememberTransport && !override){
      match = this.options.document.cookie.match('(?:^|;)\\s*socketio=([^;]*)');
      if (match){
        this.rememberedTransport = true;
        transports = [decodeURIComponent(match[1])];
      }
    } 
    for (var i = 0, transport; transport = transports[i]; i++){
      if (io.Transport[transport] 
        && io.Transport[transport].check() 
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck())){
        return new io.Transport[transport](this, this.options.transportOptions[transport] || {});
      }
    }
    return null;
  };
  
  /**
   * Establish a new connection with the Socket.IO server. This is done using the selected transport by the
   * getTransport method. If the `connectTimeout` and the `tryTransportsOnConnectTimeout` options are set
   * the client will keep trying to connect to the server using a different transports when the timeout occurs.
   *
   * Example:
   *
   * Create a Socket.IO client with a connect callback (We assume we have the WebSocket transport avaliable).
   *
   *     var socket = new io.Socket();
   *     socket.connect(function(transport){
   *       console.log("Connected to server using the " + socket.transport.type + " transport.");
   *     });
   *     // => "Connected to server using the WebSocket transport."
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */
  Socket.prototype.connect = function(fn){
    if (this.transport && !this.connected){
      if (this.connecting) this.disconnect(true);
      this.connecting = true;
      this.emit('connecting', [this.transport.type]);
      this.transport.connect();
      if (this.options.connectTimeout){
        var self = this;
        this.connectTimeoutTimer = setTimeout(function(){
          if (!self.connected){
            self.disconnect(true);
            if (self.options.tryTransportsOnConnectTimeout && !self.rememberedTransport){
              if(!self.remainingTransports) self.remainingTransports = self.options.transports.slice(0);
              var transports = self.remainingTransports;
              while(transports.length > 0 && transports.splice(0,1)[0] != self.transport.type){}
              if(transports.length){
                self.transport = self.getTransport(transports);
                self.connect();
              }
            }
            if(!self.remainingTransports || self.remainingTransports.length == 0) self.emit('connect_failed');
          }
          if(self.remainingTransports && self.remainingTransports.length == 0) delete self.remainingTransports;
        }, this.options.connectTimeout);
      }
    }
    if (fn && typeof fn == 'function') this.once('connect',fn);
    return this;
  };
  
  /**
   * Sends the data to the Socket.IO server. If there isn't a connection to the server
   * the data will be forwarded to the queue.
   *
   * @param {Mixed} data The data that needs to be send to the Socket.IO server.
   * @returns {io.Socket}
   * @api public
   */
  Socket.prototype.send = function(data){
    if (!this.transport || !this.transport.connected) return this.queue(data);
    this.transport.send(data);
    return this;
  };
  
  /**
   * Disconnect the established connect.
   *
   * @param {Boolean} [soft] A soft disconnect will keep the reconnect settings enabled.
   * @returns {io.Socket}
   * @api public
   */
  Socket.prototype.disconnect = function(soft){
    if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);
    if (!soft) this.options.reconnect = false;
    this.transport.disconnect();
    return this;
  };
  
  /**
   * Adds a new eventListener for the given event.
   *
   * Example:
   *
   *     var socket = new io.Socket();
   *     socket.on("connect", function(transport){
   *       console.log("Connected to server using the " + socket.transport.type + " transport.");
   *     });
   *     // => "Connected to server using the WebSocket transport."
   *
   * @param {String} name The name of the event.
   * @param {Function} fn The function that is called once the event is emitted.
   * @returns {io.Socket}
   * @api public
   */
  Socket.prototype.on = function(name, fn){
    if (!(name in this.events)) this.events[name] = [];
    this.events[name].push(fn);
    return this;
  };
  
  /**
   * Adds a one time listener, the listener will be removed after the event is emitted.
   *
   * Example:
   *
   *     var socket = new io.Socket();
   *     socket.once("custom:event", function(){
   *       console.log("I should only log once.");
   *     });
   *     socket.emit("custom:event");
   *     socket.emit("custom:event");
   *     // => "I should only log once."
   *
   * @param {String} name The name of the event.
   * @param {Function} fn The function that is called once the event is emitted.
   * @returns {io.Socket}
   * @api public
   */
  Socket.prototype.once = function(name, fn){
    var self = this
      , once = function(){
        self.removeEvent(name, once);
        fn.apply(self, arguments);
      };
    once.ref = fn;
    self.on(name, once);
    return this;
  };
  
  /**
   * Emit a event to all listeners.
   *
   * Example:
   *
   *     var socket = new io.Socket();
   *     socket.on("custom:event", function(){
   *       console.log("Emitted a custom:event");
   *     });
   *     socket.emit("custom:event");
   *     // => "Emitted a custom:event"
   *
   * @param {String} name The name of the event.
   * @param {Array} args Arguments for the event.
   * @returns {io.Socket}
   * @api private
   */
  Socket.prototype.emit = function(name, args){
    if (name in this.events){
      var events = this.events[name].concat();
      for (var i = 0, ii = events.length; i < ii; i++)
        events[i].apply(this, args === undefined ? [] : args);
    }
    return this;
  };

  /**
   * Removes a event listener from the listener array for the specified event.
   *
   * Example:
   *
   *     var socket = new io.Socket()
   *       , event = function(){};
   *     socket.on("connect", event);
   *     socket.removeEvent("connect", event);
   *
   * @param {String} name The name of the event.
   * @param {Function} fn The function that is called once the event is emitted.
   * @returns {io.Socket}
   * @api public
   */
  Socket.prototype.removeEvent = function(name, fn){
    if (name in this.events){
      for (var a = 0, l = this.events[name].length; a < l; a++)
        if (this.events[name][a] == fn || this.events[name][a].ref && this.events[name][a].ref == fn) this.events[name].splice(a, 1);    
    }
    return this;
  };
  
  /**
   * Queues messages when there isn't a active connection available. Once a connection has been
   * established you should call the `doQueue` method to send the queued messages to the server.
   *
   * @param {Mixed} message The message that was originally send to the `send` method.
   * @returns {io.Socket}
   * @api private
   */
  Socket.prototype.queue = function(message){
    if (!('queueStack' in this)) this.queueStack = [];
    this.queueStack.push(message);
    return this;
  };
  
  /**
   * If there are queued messages we send all messages to the Socket.IO server and empty
   * the queue.
   *
   * @returns {io.Socket}
   * @api private
   */
  Socket.prototype.doQueue = function(){
    if (!('queueStack' in this) || !this.queueStack.length) return this;
    this.transport.send(this.queueStack);
    this.queueStack = [];
    return this;
  };
  
  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */
  Socket.prototype.isXDomain = function(){
    var locPort = window.location.port || 80;
    return this.host !== document.domain || this.options.port != locPort;
  };
  
  /**
   * When the transport established an working connection the Socket.IO server it notifies us
   * by calling this method so we can set the `connected` and `connecting` properties and emit
   * the connection event.
   *
   * @api private
   */
  Socket.prototype.onConnect = function(){
    this.connected = true;
    this.connecting = false;
    this.doQueue();
    if (this.options.rememberTransport) this.options.document.cookie = 'socketio=' + encodeURIComponent(this.transport.type);
    this.emit('connect');
  };
  
  /**
   * When the transport receives new messages from the Socket.IO server it notifies us by calling
   * this method with the decoded `data` it received.
   *
   * @param data The message from the Socket.IO server.
   * @api private
   */
  Socket.prototype.onMessage = function(data){
    this.emit('message', [data]);
  };
  
  /**
   * When the transport is disconnected from the Socket.IO server it notifies us by calling
   * this method. If we where connected and the `reconnect` is set we will attempt to reconnect.
   *
   * @api private
   */
  Socket.prototype.onDisconnect = function(){
    var wasConnected = this.connected;
    this.connected = false;
    this.connecting = false;
    this.queueStack = [];
    if (wasConnected){
      this.emit('disconnect');
      if (this.options.reconnect && !this.reconnecting) this.onReconnect();
    }
  };
  
  /**
   * The reconnection is done using an exponential back off algorithm to prevent
   * the server from being flooded with connection requests. When the transport
   * is disconnected we wait until the `reconnectionDelay` finishes. We multiply 
   * the `reconnectionDelay` (if the previous `reconnectionDelay` was 500 it will
   * be updated to 1000 and than 2000>4000>8000>16000 etc.) and tell the current
   * transport to connect again. When we run out of `reconnectionAttempts` we will 
   * do one final attempt and loop over all enabled transport methods to see if 
   * other transports might work. If everything fails we emit the `reconnect_failed`
   * event.
   *
   * @api private
   */
  Socket.prototype.onReconnect = function(){
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options.reconnectionDelay;
    
    var self = this
      , tryTransportsOnConnectTimeout = this.options.tryTransportsOnConnectTimeout
      , rememberTransport = this.options.rememberTransport;
    
    function reset(){
      if(self.connected) self.emit('reconnect',[self.transport.type,self.reconnectionAttempts]);
      self.removeEvent('connect_failed', maybeReconnect).removeEvent('connect', maybeReconnect);
      self.reconnecting = false;
      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;
      self.options.tryTransportsOnConnectTimeout = tryTransportsOnConnectTimeout;
      self.options.rememberTransport = rememberTransport;
      
      return;
    };
    
    function maybeReconnect(){
      if (!self.reconnecting) return;
      if (!self.connected){
        if (self.connecting && self.reconnecting) return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
        
        if (self.reconnectionAttempts++ >= self.options.maxReconnectionAttempts){
          if (!self.redoTransports){
            self.on('connect_failed', maybeReconnect);
            self.options.tryTransportsOnConnectTimeout = true;
            self.transport = self.getTransport(self.options.transports); // override with all enabled transports
            self.redoTransports = true;
            self.connect();
          } else {
            self.emit('reconnect_failed');
            reset();
          }
        } else {
          self.reconnectionDelay *= 2; // exponential back off
          self.connect();
          self.emit('reconnecting', [self.reconnectionDelay,self.reconnectionAttempts]);
          self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
        }
      } else {
        reset();
      }
    };
    this.options.tryTransportsOnConnectTimeout = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);
    
    this.on('connect', maybeReconnect);
  };
  
  /**
   * API compatiblity
   */
  Socket.prototype.fire = Socket.prototype.emit;
  Socket.prototype.addListener = Socket.prototype.addEvent = Socket.prototype.addEventListener = Socket.prototype.on;
  Socket.prototype.removeListener = Socket.prototype.removeEventListener = Socket.prototype.removeEvent;
  
})();
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if (window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

!(function ($) {
	function fn(host, options) {
		var path;

		if (typeof host !== 'string') {
			options = host;
			host = window.location.host;
		}

		return new io.Socket(host, options);
	}

	$.ender({io: fn});
}(ender));

!function () { var exports = {}, module = { exports: exports }; //     Underscore.js 1.1.6
//     (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **CommonJS**, with backwards-compatibility
  // for the old `require()` API. If we're not in CommonJS, add `_` to the
  // global object.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = _;
    _._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.1.6';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects implementing `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (_.isNumber(obj.length)) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = memo !== void 0;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial && index === 0) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError("Reduce of empty array with no initial value");
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return memo !== void 0 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = (_.isArray(obj) ? obj.slice() : _.toArray(obj)).reverse();
    return _.reduce(reversed, iterator, memo, context);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result = iterator.call(context, value, index, list)) return breaker;
    });
    return result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    any(obj, function(value) {
      if (found = value === target) return true;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (method.call ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.max.apply(Math, obj);
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.min.apply(Math, obj);
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(iterable) {
    if (!iterable)                return [];
    if (iterable.toArray)         return iterable.toArray();
    if (_.isArray(iterable))      return iterable;
    if (_.isArguments(iterable))  return slice.call(iterable);
    return _.values(iterable);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.toArray(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head`. The **guard** check allows it to work
  // with `_.map`.
  _.first = _.head = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Get the last element of an array.
  _.last = function(array) {
    return array[array.length - 1];
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(_.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    var values = slice.call(arguments, 1);
    return _.filter(array, function(value){ return !_.include(values, value); });
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted) {
    return _.reduce(array, function(memo, el, i) {
      if (0 == i || (isSorted === true ? _.last(memo) != el : !_.include(memo, el))) memo[memo.length] = el;
      return memo;
    }, []);
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (array[i] === item) return i;
    return -1;
  };


  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function(func, obj) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(obj, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return hasOwnProperty.call(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(func, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Internal function used to implement `_.throttle` and `_.debounce`.
  var limit = function(func, wait, debounce) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var throttler = function() {
        timeout = null;
        func.apply(context, args);
      };
      if (debounce) clearTimeout(timeout);
      if (debounce || !timeout) timeout = setTimeout(throttler, wait);
    };
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    return limit(func, wait, false);
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds.
  _.debounce = function(func, wait) {
    return limit(func, wait, true);
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = slice.call(arguments);
    return function() {
      var args = slice.call(arguments);
      for (var i=funcs.length-1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };


  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (hasOwnProperty.call(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    return _.filter(_.keys(obj), function(key){ return _.isFunction(obj[key]); }).sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (source[prop] !== void 0) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    // Check object identity.
    if (a === b) return true;
    // Different types?
    var atype = typeof(a), btype = typeof(b);
    if (atype != btype) return false;
    // Basic equality test (watch out for coercions).
    if (a == b) return true;
    // One is falsy and the other truthy.
    if ((!a && b) || (a && !b)) return false;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // One of them implements an isEqual()?
    if (a.isEqual) return a.isEqual(b);
    // Check dates' integer values.
    if (_.isDate(a) && _.isDate(b)) return a.getTime() === b.getTime();
    // Both are NaN?
    if (_.isNaN(a) && _.isNaN(b)) return false;
    // Compare regular expressions.
    if (_.isRegExp(a) && _.isRegExp(b))
      return a.source     === b.source &&
             a.global     === b.global &&
             a.ignoreCase === b.ignoreCase &&
             a.multiline  === b.multiline;
    // If a is not an object by this point, we can't handle it.
    if (atype !== 'object') return false;
    // Check for different array lengths before comparing contents.
    if (a.length && (a.length !== b.length)) return false;
    // Nothing else worked, deep compare the contents.
    var aKeys = _.keys(a), bKeys = _.keys(b);
    // Different object sizes?
    if (aKeys.length != bKeys.length) return false;
    // Recursive comparison of contents.
    for (var key in a) if (!(key in b) || !_.isEqual(a[key], b[key])) return false;
    return true;
  };

  // Is a given array or object empty?
  _.isEmpty = function(obj) {
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (hasOwnProperty.call(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return !!(obj && hasOwnProperty.call(obj, 'callee'));
  };

  // Is a given value a function?
  _.isFunction = function(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
  };

  // Is the given value `NaN`? `NaN` happens to be the only value in JavaScript
  // that does not equal itself.
  _.isNaN = function(obj) {
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false;
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(str, data) {
    var c  = _.templateSettings;
    var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
      'with(obj||{}){__p.push(\'' +
      str.replace(/\\/g, '\\\\')
         .replace(/'/g, "\\'")
         .replace(c.interpolate, function(match, code) {
           return "'," + code.replace(/\\'/g, "'") + ",'";
         })
         .replace(c.evaluate || null, function(match, code) {
           return "');" + code.replace(/\\'/g, "'")
                              .replace(/[\r\n\t]/g, ' ') + "__p.push('";
         })
         .replace(/\r/g, '\\r')
         .replace(/\n/g, '\\n')
         .replace(/\t/g, '\\t')
         + "');}return __p.join('');";
    var func = new Function('obj', tmpl);
    return data ? func(data) : func;
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      method.apply(this._wrapped, arguments);
      return result(this._wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

})();
 $.ender(module.exports); }();
!function () { var exports = {}, module = { exports: exports }; /*!
	PURE Unobtrusive Rendering Engine for HTML

	Licensed under the MIT licenses.
	More information at: http://www.opensource.org

	Copyright (c) 2011 Michael Cvilic - BeeBole.com

	Thanks to Rog Peppe for the functional JS jump
	revision: 2.67
*/

var $p, pure = $p = function(){
	var sel = arguments[0], 
		ctxt = false;

	if(typeof sel === 'string'){
		ctxt = arguments[1] || false;
	}else if(sel && !sel[0] && !sel.length){
		sel = [sel];
	}
	return $p.core(sel, ctxt);
};

$p.core = function(sel, ctxt, plugins){
	//get an instance of the plugins
	var templates = [];
	plugins = plugins || getPlugins();

	//search for the template node(s)
	switch(typeof sel){
		case 'string':
			templates = plugins.find(ctxt || document, sel);
			if(templates.length === 0) {
				error('The template "' + sel + '" was not found');
			}
		break;
		case 'undefined':
			error('The root of the template is undefined, check your selector');
		break;
		default:
			templates = sel;
	}
	
	for(var i = 0, ii = templates.length; i < ii; i++){
		plugins[i] = templates[i];
	}
	plugins.length = ii;

	// set the signature string that will be replaced at render time
	var Sig = '_s' + Math.floor( Math.random() * 1000000 ) + '_',
		// another signature to prepend to attributes and avoid checks: style, height, on[events]...
		attPfx = '_a' + Math.floor( Math.random() * 1000000 ) + '_',
		// rx to parse selectors, e.g. "+tr.foo[class]"
		selRx = /^(\+)?([^\@\+]+)?\@?([^\+]+)?(\+)?$/,
		// set automatically attributes for some tags
		autoAttr = {
			IMG:'src',
			INPUT:'value'
		},
		// check if the argument is an array - thanks salty-horse (Ori Avtalion)
		isArray = Array.isArray ?
			function(o) {
				return Array.isArray(o);
			} :
			function(o) {
				return Object.prototype.toString.call(o) === "[object Array]";
			};
	
	/* * * * * * * * * * * * * * * * * * * * * * * * * *
		core functions
	 * * * * * * * * * * * * * * * * * * * * * * * * * */


	// error utility
	function error(e){
		if(typeof console !== 'undefined'){
			console.log(e);
			debugger;
		}
		throw('pure error: ' + e);
	}
	
	//return a new instance of plugins
	function getPlugins(){
		var plugins = $p.plugins,
			f = function(){};
		f.prototype = plugins;

		// do not overwrite functions if external definition
		f.prototype.compile    = plugins.compile || compile;
		f.prototype.render     = plugins.render || render;
		f.prototype.autoRender = plugins.autoRender || autoRender;
		f.prototype.find       = plugins.find || find;
		
		// give the compiler and the error handling to the plugin context
		f.prototype._compiler  = compiler;
		f.prototype._error     = error;
 
		return new f();
	}
	
	// returns the outer HTML of a node
	function outerHTML(node){
		// if IE, Chrome take the internal method otherwise build one
		return node.outerHTML || (
			function(n){
        		var div = document.createElement('div'), h;
	        	div.appendChild( n.cloneNode(true) );
				h = div.innerHTML;
				div = null;
				return h;
			})(node);
	}
	
	// returns the string generator function
	function wrapquote(qfn, f){
		return function(ctxt){
			return qfn('' + f.call(ctxt.context, ctxt));
		};
	}

	// default find using querySelector when available on the browser
	function find(n, sel){
		if(typeof n === 'string'){
			sel = n;
			n = false;
		}
		if(typeof document.querySelectorAll !== 'undefined'){
			return (n||document).querySelectorAll( sel );
		}else{
			return error('You can test PURE standalone with: iPhone, FF3.5+, Safari4+ and IE8+\n\nTo run PURE on your browser, you need a JS library/framework with a CSS selector engine');
		}
	}
	
	// create a function that concatenates constant string
	// sections (given in parts) and the results of called
	// functions to fill in the gaps between parts (fns).
	// fns[n] fills in the gap between parts[n-1] and parts[n];
	// fns[0] is unused.
	// this is the inner template evaluation loop.
	function concatenator(parts, fns){
		return function(ctxt){
			var strs = [ parts[ 0 ] ],
				n = parts.length,
				fnVal, pVal, attLine, pos;

			for(var i = 1; i < n; i++){
				fnVal = fns[i].call( this, ctxt );
				pVal = parts[i];
				
				// if the value is empty and attribute, remove it
				if(fnVal === ''){
					attLine = strs[ strs.length - 1 ];
					if( ( pos = attLine.search( /[^\s]+=\"?$/ ) ) > -1){
						strs[ strs.length - 1 ] = attLine.substring( 0, pos );
						pVal = pVal.substr( 1 );
					}
				}
				
				strs[ strs.length ] = fnVal;
				strs[ strs.length ] = pVal;
			}
			return strs.join('');
		};
	}

	// parse and check the loop directive
	function parseloopspec(p){
		var m = p.match( /^(\w+)\s*<-\s*(\S+)?$/ );
		if(m === null){
			error('bad loop spec: "' + p + '"');
		}
		if(m[1] === 'item'){
			error('"item<-..." is a reserved word for the current running iteration.\n\nPlease choose another name for your loop.');
		}
		if( !m[2] || (m[2] && (/context/i).test(m[2]))){ //undefined or space(IE) 
			m[2] = function(ctxt){return ctxt.context;};
		}
		return {name: m[1], sel: m[2]};
	}

	// parse a data selector and return a function that
	// can traverse the data accordingly, given a context.
	function dataselectfn(sel){
		if(typeof(sel) === 'function'){
			return sel;
		}
		//check for a valid js variable name with hyphen(for properties only), $, _ and :
		var m = sel.match(/^[a-zA-Z\$_\@][\w\$:-]*(\.[\w\$:-]*[^\.])*$/);
		if(m === null){
			var found = false, s = sel, parts = [], pfns = [], i = 0, retStr;
			// check if literal
			if(/\'|\"/.test( s.charAt(0) )){
				if(/\'|\"/.test( s.charAt(s.length-1) )){
					retStr = s.substring(1, s.length-1);
					return function(){ return retStr; };
				}
			}else{
				// check if literal + #{var}
				while((m = s.match(/#\{([^{}]+)\}/)) !== null){
					found = true;
					parts[i++] = s.slice(0, m.index);
					pfns[i] = dataselectfn(m[1]);
					s = s.slice(m.index + m[0].length, s.length);
				}
			}
			if(!found){
				return function(){ return sel; };
			}
			parts[i] = s;
			return concatenator(parts, pfns);
		}
		m = sel.split('.');
		return function(ctxt){
			var data = ctxt.context || ctxt,
				v = ctxt[m[0]],
				i = 0;
			if(v && v.item){
				i += 1;
				if(m[i] === 'pos'){
					//allow pos to be kept by string. Tx to Adam Freidin
					return v.pos;
				}else{
					data = v.item;
				}
			}
			var n = m.length;
			for(; i < n; i++){
				if(!data){break;}
				data = data[m[i]];
			}
			return (!data && data !== 0) ? '':data;
		};
	}

	// wrap in an object the target node/attr and their properties
	function gettarget(dom, sel, isloop){
		var osel, prepend, selector, attr, append, target = [];
		if( typeof sel === 'string' ){
			osel = sel;
			var m = sel.match(selRx);
			if( !m ){
				error( 'bad selector syntax: ' + sel );
			}
			
			prepend = m[1];
			selector = m[2];
			attr = m[3];
			append = m[4];
			
			if(selector === '.' || ( !selector && attr ) ){
				target[0] = dom;
			}else{
				target = plugins.find(dom, selector);
			}
			if(!target || target.length === 0){
				return error('The node "' + sel + '" was not found in the template:\n' + outerHTML(dom).replace(/\t/g,'  '));
			}
		}else{
			// autoRender node
			prepend = sel.prepend;
			attr = sel.attr;
			append = sel.append;
			target = [dom];
		}
		
		if( prepend || append ){
			if( prepend && append ){
				error('append/prepend cannot take place at the same time');
			}else if( isloop ){
				error('no append/prepend/replace modifiers allowed for loop target');
			}else if( append && isloop ){
				error('cannot append with loop (sel: ' + osel + ')');
			}
		}
		var setstr, getstr, quotefn, isStyle, isClass, attName, setfn;
		if(attr){
			isStyle = (/^style$/i).test(attr);
			isClass = (/^class$/i).test(attr);
			attName = isClass ? 'className' : attr;
			setstr = function(node, s) {
				node.setAttribute(attPfx + attr, s);
				if (attName in node && !isStyle) {
					node[attName] = '';
				}
				if (node.nodeType === 1) {
					node.removeAttribute(attr);
					isClass && node.removeAttribute(attName);
				}
			};
			if (isStyle || isClass) {//IE no quotes special care
				if(isStyle){
					getstr = function(n){ return n.style.cssText; };
				}else{
					getstr = function(n){ return n.className;	};
				}
			}else {
				getstr = function(n){ return n.getAttribute(attr); };
			}
			quotefn = function(s){ return s.replace(/\"/g, '&quot;'); };
			if(prepend){
				setfn = function(node, s){ setstr( node, s + getstr( node )); };
			}else if(append){
				setfn = function(node, s){ setstr( node, getstr( node ) + s); };
			}else{
				setfn = function(node, s){ setstr( node, s ); };
			}
		}else{
			if (isloop) {
				setfn = function(node, s) {
					var pn = node.parentNode;
					if (pn) {
						//replace node with s
						pn.insertBefore(document.createTextNode(s), node.nextSibling);
						pn.removeChild(node);
					}
				};
			} else {
				if (prepend) {
					setfn = function(node, s) { node.insertBefore(document.createTextNode(s), node.firstChild);	};
				} else if (append) {
					setfn = function(node, s) { node.appendChild(document.createTextNode(s));};
				} else {
					setfn = function(node, s) {
						while (node.firstChild) { node.removeChild(node.firstChild); }
						node.appendChild(document.createTextNode(s));
					};
				}
			}
			quotefn = function(s) { return s; };
		}
		return { attr: attr, nodes: target, set: setfn, sel: osel, quotefn: quotefn };
	}

	function setsig(target, n){
		var sig = Sig + n + ':';
		for(var i = 0; i < target.nodes.length; i++){
			// could check for overlapping targets here.
			target.set( target.nodes[i], sig );
		}
	}

	// read de loop data, and pass it to the inner rendering function
	function loopfn(name, dselect, inner, sorter, filter){
		return function(ctxt){
			var a = dselect(ctxt),
				old = ctxt[name],
				temp = { items : a },
				filtered = 0,
				length,
				strs = [],
				buildArg = function(idx, temp, ftr, len){
					//keep the current loop. Tx to Adam Freidin
					var save_pos = ctxt.pos,
						save_item = ctxt.item,
						save_items = ctxt.items;
					ctxt.pos = temp.pos = idx;
					ctxt.item = temp.item = a[ idx ];
					ctxt.items = a;
					//if array, set a length property - filtered items
					typeof len !== 'undefined' &&  (ctxt.length = len);
					//if filter directive
					if(typeof ftr === 'function' && ftr.call(ctxt.item, ctxt) === false){
						filtered++;
						return;
					}
					strs.push( inner.call(ctxt.item, ctxt ) );
					//restore the current loop
					ctxt.pos = save_pos;
					ctxt.item = save_item;
					ctxt.items = save_items;
				};
			ctxt[name] = temp;
			if( isArray(a) ){
				length = a.length || 0;
				// if sort directive
				if(typeof sorter === 'function'){
					a.sort(sorter);
				}
				//loop on array
				for(var i = 0, ii = length; i < ii; i++){
					buildArg(i, temp, filter, length - filtered);
				}
			}else{
				if(a && typeof sorter !== 'undefined'){
					error('sort is only available on arrays, not objects');
				}
				//loop on collections
				for(var prop in a){
					a.hasOwnProperty( prop ) && buildArg(prop, temp, filter);
				}
			}

			typeof old !== 'undefined' ? ctxt[name] = old : delete ctxt[name];
			return strs.join('');
		};
	}
	// generate the template for a loop node
	function loopgen(dom, sel, loop, fns){
		var already = false, ls, sorter, filter, prop;
		for(prop in loop){
			if(loop.hasOwnProperty(prop)){
				if(prop === 'sort'){
					sorter = loop.sort;
					continue;
				}else if(prop === 'filter'){
					filter = loop.filter;
					continue;
				}
				if(already){
					error('cannot have more than one loop on a target');
				}
				ls = prop;
				already = true;
			}
		}
		if(!ls){
			error('Error in the selector: ' + sel + '\nA directive action must be a string, a function or a loop(<-)');
		}
		var dsel = loop[ls];
		// if it's a simple data selector then we default to contents, not replacement.
		if(typeof(dsel) === 'string' || typeof(dsel) === 'function'){
			loop = {};
			loop[ls] = {root: dsel};
			return loopgen(dom, sel, loop, fns);
		}
		var spec = parseloopspec(ls),
			itersel = dataselectfn(spec.sel),
			target = gettarget(dom, sel, true),
			nodes = target.nodes;
			
		for(i = 0; i < nodes.length; i++){
			var node = nodes[i],
				inner = compiler(node, dsel);
			fns[fns.length] = wrapquote(target.quotefn, loopfn(spec.name, itersel, inner, sorter, filter));
			target.nodes = [node];		// N.B. side effect on target.
			setsig(target, fns.length - 1);
		}
		return target;
	}
	
	function getAutoNodes(n, data){
		var ns = n.getElementsByTagName('*'),
			an = [],
			openLoops = {a:[],l:{}},
			cspec,
			isNodeValue,
			i, ii, j, jj, ni, cs, cj;
		//for each node found in the template
		for(i = -1, ii = ns.length; i < ii; i++){
			ni = i > -1 ?ns[i]:n;
			if(ni.nodeType === 1 && ni.className !== ''){
				//when a className is found
				cs = ni.className.split(' ');
				// for each className 
				for(j = 0, jj=cs.length;j<jj;j++){
					cj = cs[j];
					// check if it is related to a context property
					cspec = checkClass(cj, ni.tagName);
					// if so, store the node, plus the type of data
					if(cspec !== false){
						isNodeValue = (/nodevalue/i).test(cspec.attr);
						if(cspec.sel.indexOf('@') > -1 || isNodeValue){
							ni.className = ni.className.replace('@'+cspec.attr, '');
							if(isNodeValue){
								cspec.attr = false;
							} 
						}
						an.push({n:ni, cspec:cspec});
					}
				}
			}
		}
		
		function checkClass(c, tagName){
			// read the class
			var ca = c.match(selRx),
				attr = ca[3] || autoAttr[tagName],
				cspec = {prepend:!!ca[1], prop:ca[2], attr:attr, append:!!ca[4], sel:c},
				i, ii, loopi, loopil, val;
			// check in existing open loops
			for(i = openLoops.a.length-1; i >= 0; i--){
				loopi = openLoops.a[i];
				loopil = loopi.l[0];
				val = loopil && loopil[cspec.prop];
				if(typeof val !== 'undefined'){
					cspec.prop = loopi.p + '.' + cspec.prop;
					if(openLoops.l[cspec.prop] === true){
						val = val[0];
					}
					break;
				}
			}
			// not found check first level of data
			if(typeof val === 'undefined'){
				val = dataselectfn(cspec.prop)(isArray(data) ? data[0] : data);
				// nothing found return
				if(val === ''){
					return false;
				}
			}
			// set the spec for autoNode
			if(isArray(val)){
				openLoops.a.push( {l:val, p:cspec.prop} );
				openLoops.l[cspec.prop] = true;
				cspec.t = 'loop';
			}else{
				cspec.t = 'str';
			}
			return cspec;
		}

		return an;

	}

	// returns a function that, given a context argument,
	// will render the template defined by dom and directive.
	function compiler(dom, directive, data, ans){
		var fns = [], j, jj, cspec, n, target, nodes, itersel, node, inner, dsel, sels, sel, sl, i, h, parts,  pfns = [], p;
		// autoRendering nodes parsing -> auto-nodes
		ans = ans || data && getAutoNodes(dom, data);
		if(data){
			// for each auto-nodes
			while(ans.length > 0){
				cspec = ans[0].cspec;
				n = ans[0].n;
				ans.splice(0, 1);
				if(cspec.t === 'str'){
					// if the target is a value
					target = gettarget(n, cspec, false);
					setsig(target, fns.length);
					fns[fns.length] = wrapquote(target.quotefn, dataselectfn(cspec.prop));
				}else{
					// if the target is a loop
					itersel = dataselectfn(cspec.sel);
					target = gettarget(n, cspec, true);
					nodes = target.nodes;
					for(j = 0, jj = nodes.length; j < jj; j++){
						node = nodes[j];
						inner = compiler(node, false, data, ans);
						fns[fns.length] = wrapquote(target.quotefn, loopfn(cspec.sel, itersel, inner));
						target.nodes = [node];
						setsig(target, fns.length - 1);
					}
				}
			}
		}
		// read directives
		for(sel in directive){
			if(directive.hasOwnProperty(sel)){
				i = 0;
				dsel = directive[sel];
				sels = sel.split(/\s*,\s*/); //allow selector separation by quotes
				sl = sels.length;
				do{
					if(typeof(dsel) === 'function' || typeof(dsel) === 'string'){
						// set the value for the node/attr
						sel = sels[i];
						target = gettarget(dom, sel, false);
						setsig(target, fns.length);
						fns[fns.length] = wrapquote(target.quotefn, dataselectfn(dsel));
					}else{
						// loop on node
						loopgen(dom, sel, dsel, fns);
					}
				}while(++i < sl);
			}
		}
        // convert node to a string 
        h = outerHTML(dom);
		// IE adds an unremovable "selected, value" attribute
		// hard replace while waiting for a better solution
        h = h.replace(/<([^>]+)\s(value\=""|selected)\s?([^>]*)>/ig, "<$1 $3>");
		
        // remove attribute prefix
        h = h.split(attPfx).join('');

		// slice the html string at "Sig"
		parts = h.split( Sig );
		// for each slice add the return string of 
		for(i = 1; i < parts.length; i++){
			p = parts[i];
			// part is of the form "fn-number:..." as placed there by setsig.
			pfns[i] = fns[ parseInt(p, 10) ];
			parts[i] = p.substring( p.indexOf(':') + 1 );
		}
		return concatenator(parts, pfns);
	}
	// compile the template with directive
	// if a context is passed, the autoRendering is triggered automatically
	// return a function waiting the data as argument
	function compile(directive, ctxt, template){
		var rfn = compiler( ( template || this[0] ).cloneNode(true), directive, ctxt);
		return function(context){
			return rfn({context:context});
		};
	}
	//compile with the directive as argument
	// run the template function on the context argument
	// return an HTML string 
	// should replace the template and return this
	function render(ctxt, directive){
		var fn = typeof directive === 'function' && directive, i = 0, ii = this.length;
		for(; i < ii; i++){
			this[i] = replaceWith( this[i], (fn || plugins.compile( directive, false, this[i] ))( ctxt, false ));
		}
		context = null;
		return this;
	}

	// compile the template with autoRender
	// run the template function on the context argument
	// return an HTML string 
	function autoRender(ctxt, directive){
		var fn = plugins.compile( directive, ctxt, this[0] );
		for(var i = 0, ii = this.length; i < ii; i++){
			this[i] = replaceWith( this[i], fn( ctxt, false));
		}
		context = null;
		return this;
	}
	
	function replaceWith(elm, html) {
		var ne,
			ep = elm.parentNode,
			depth = 0;
		if(!ep){ //if no parents
			ep = document.createElement('DIV');
			ep.appendChild(elm);
		}
		switch (elm.tagName) {
			case 'TBODY': case 'THEAD': case 'TFOOT':
				html = '<TABLE>' + html + '</TABLE>';
				depth = 1;
			break;
			case 'TR':
				html = '<TABLE><TBODY>' + html + '</TBODY></TABLE>';
				depth = 2;
			break;
			case 'TD': case 'TH':
				html = '<TABLE><TBODY><TR>' + html + '</TR></TBODY></TABLE>';
				depth = 3;
			break;
		}
		tmp = document.createElement('SPAN');
		tmp.style.display = 'none';
		document.body.appendChild(tmp);
		tmp.innerHTML = html;
		ne = tmp.firstChild;
		while (depth--) {
			ne = ne.firstChild;
		}
		ep.insertBefore(ne, elm);
		ep.removeChild(elm);
		document.body.removeChild(tmp);
		elm = ne;

		ne = ep = null;
		return elm;
	}

	return plugins;
};

$p.plugins = {};

$p.libs = {
	dojo:function(){
		if(typeof document.querySelector === 'undefined'){
			$p.plugins.find = function(n, sel){
				return dojo.query(sel, n);
			};
		}
	},
	domassistant:function(){
		if(typeof document.querySelector === 'undefined'){
			$p.plugins.find = function(n, sel){
				return $(n).cssSelect(sel);
			};
		}
		DOMAssistant.attach({ 
			publicMethods : [ 'compile', 'render', 'autoRender'],
			compile:function(directive, ctxt){
				return $p([this]).compile(directive, ctxt);
			},
			render:function(ctxt, directive){
				return $( $p([this]).render(ctxt, directive) )[0];
			},
			autoRender:function(ctxt, directive){
				return $( $p([this]).autoRender(ctxt, directive) )[0];
			}
		});
	},
	jquery:function(){
		if(typeof document.querySelector === 'undefined'){
			$p.plugins.find = function(n, sel){
				return jQuery(n).find(sel);
			};
		}
		jQuery.fn.extend({
			directives:function(directive){
				this._pure_d = directive; return this;
			},
			compile:function(directive, ctxt){
				return $p(this).compile(this._pure_d || directive, ctxt);
			},
			render:function(ctxt, directive){
				return jQuery( $p( this ).render( ctxt, this._pure_d || directive ) );
			},
			autoRender:function(ctxt, directive){
				return jQuery( $p( this ).autoRender( ctxt, this._pure_d || directive ) );
			}
		});
	},
	mootools:function(){
		if(typeof document.querySelector === 'undefined'){
			$p.plugins.find = function(n, sel){
				return $(n).getElements(sel);
			};
		}
		Element.implement({
			compile:function(directive, ctxt){ 
				return $p(this).compile(directive, ctxt);
			},
			render:function(ctxt, directive){
				return $p([this]).render(ctxt, directive);
			},
			autoRender:function(ctxt, directive){
				return $p([this]).autoRender(ctxt, directive);
			}
		});
	},
	prototype:function(){
		if(typeof document.querySelector === 'undefined'){
			$p.plugins.find = function(n, sel){
				n = n === document ? n.body : n;
				return typeof n === 'string' ? $$(n) : $(n).select(sel);
			};
		}
		Element.addMethods({
			compile:function(element, directive, ctxt){ 
				return $p([element]).compile(directive, ctxt);
			}, 
			render:function(element, ctxt, directive){
				return $p([element]).render(ctxt, directive);
			}, 
			autoRender:function(element, ctxt, directive){
				return $p([element]).autoRender(ctxt, directive);
			}
		});
	},
	sizzle:function(){
		if(typeof document.querySelector === 'undefined'){
			$p.plugins.find = function(n, sel){
				return Sizzle(sel, n);
			};
		}
	},
	sly:function(){
		if(typeof document.querySelector === 'undefined'){  
			$p.plugins.find = function(n, sel){
				return Sly(sel, n);
			};
		}
	}
};

// get lib specifics if available
(function(){
	var libkey = 
		typeof dojo         !== 'undefined' && 'dojo' || 
		typeof DOMAssistant !== 'undefined' && 'domassistant' ||
		typeof jQuery       !== 'undefined' && 'jquery' || 
		typeof MooTools     !== 'undefined' && 'mootools' ||
		typeof Prototype    !== 'undefined' && 'prototype' || 
		typeof Sizzle       !== 'undefined' && 'sizzle' ||
		typeof Sly          !== 'undefined' && 'sly';
		
	libkey && $p.libs[libkey]();
	
	//for node.js
	if(typeof exports !== 'undefined'){
		exports.$p = $p;
	}
})(); $.ender(module.exports); }();
/*!
  * bonzo.js - copyright @dedfat 2011
  * https://github.com/ded/bonzo
  * Follow our software http://twitter.com/dedfat
  * MIT License
  */
!function (context) {

  var doc = context.document,
      html = doc.documentElement,
      query = null,
      byTag = 'getElementsByTagName',
      specialAttributes = /^checked|value|selected$/,
      specialTags = /select|map|fieldset|table|tbody|tr|colgroup/i,
      tagMap = { select: 'option', table: 'tbody', tr: 'td' },
      stateAttributes = /^checked|selected$/,
      ie = /msie/i.test(navigator.userAgent),
      uidList = [],
      uuids = 0,
      digit = /^-?\d+$/,
      px = 'px',
      // commonly used methods
      setAttribute = 'setAttribute',
      getAttribute = 'getAttribute',
      trimReplace = /(^\s*|\s*$)/g,
      unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 };

  function classReg(c) {
    return new RegExp("(^|\\s+)" + c + "(\\s+|$)");
  }

  function each(ar, fn, scope) {
    for (var i = 0, l = ar.length; i < l; i++) {
      fn.call(scope || ar[i], ar[i], i, ar);
    }
    return ar;
  }

  var trim = String.prototype.trim ?
    function (s) {
      return s.trim();
    } :
    function (s) {
      return s.replace(trimReplace, '');
    };

  function camelize(s) {
    return s.replace(/-(.)/g, function (m, m1) {
      return m1.toUpperCase();
    });
  }

  function is(node) {
    return node && node.nodeName && node.nodeType == 1;
  }

  function some(ar, fn, scope) {
    for (var i = 0, j = ar.length; i < j; ++i) {
      if (fn.call(scope, ar[i], i, ar)) {
        return true;
      }
    }
    return false;
  }

  var getStyle = doc.defaultView && doc.defaultView.getComputedStyle ?
    function (el, property) {
      var value = null;
      if (property == 'float') {
        property = 'cssFloat';
      }
      var computed = doc.defaultView.getComputedStyle(el, '');
      computed && (value = computed[camelize(property)]);
      return el.style[property] || value;

    } : (ie && html.currentStyle) ?

    function (el, property) {
      property = camelize(property);
      property = property == 'float' ? 'styleFloat' : property;

      if (property == 'opacity') {
        var val = 100;
        try {
          val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity;
        } catch (e1) {
          try {
            val = el.filters('alpha').opacity;
          } catch (e2) {}
        }
        return val / 100;
      }
      var value = el.currentStyle ? el.currentStyle[property] : null;
      return el.style[property] || value;
    } :

    function (el, property) {
      return el.style[camelize(property)];
    };

  function insert(target, host, fn) {
    var i = 0, self = host || this, r = [];
    each(normalize(query ? query(target) : target), function (t) {
      each(self, function (el) {
        var n = el.cloneNode(true);
        fn(t, n);
        r[i] = n;
        i++;
      });
    }, this);
    each(r, function (e, i) {
      self[i] = e;
    });
    self.length = i;
    return self;
  }

  function xy(el, x, y) {
    var $el = bonzo(el),
        style = $el.css('position'),
        offset = $el.offset(),
        rel = 'relative',
        isRel = style == rel,
        delta = [parseInt($el.css('left'), 10), parseInt($el.css('top'), 10)];

    if (style == 'static') {
      $el.css('position', rel);
      style = rel;
    }

    isNaN(delta[0]) && (delta[0] = isRel ? 0 : el.offsetLeft);
    isNaN(delta[1]) && (delta[1] = isRel ? 0 : el.offsetTop);

    x !== null && (el.style.left = x - offset.left + delta[0] + 'px');
    y !== null && (el.style.top = y - offset.top + delta[1] + 'px');

  }

  function _bonzo(elements) {
    this.length = 0;
    this.original = elements;
    if (elements) {
      elements = typeof elements !== 'string' &&
        !elements.nodeType &&
        typeof elements.length !== 'undefined' ?
          elements :
          [elements];
      this.length = elements.length;
      for (var i = 0; i < elements.length; i++) {
        this[i] = elements[i];
      }
    }
  }

  _bonzo.prototype = {

    each: function (fn, scope) {
      return each(this, fn, scope);
    },

    map: function (fn, reject) {
      var m = [], n;
      for (var i = 0; i < this.length; i++) {
        n = fn.call(this, this[i]);
        reject ? (reject(n) && m.push(n)) : m.push(n);
      }
      return m;
    },

    first: function () {
      return bonzo(this[0]);
    },

    last: function () {
      return bonzo(this[this.length - 1]);
    },

    html: function (h, text) {
      var method = text ?
        html.textContent == null ?
          'innerText' :
          'textContent' :
        'innerHTML', m;
      function append(el, tag) {
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
        each(normalize(h, tag), function (node) {
          el.appendChild(node);
        });
      }
      return typeof h !== 'undefined' ?
          this.each(function (el) {
            (m = el.tagName.match(specialTags)) ?
              append(el, m[0]) :
              (el[method] = h);
          }) :
        this[0] ? this[0][method] : '';
    },

    text: function (text) {
      return this.html(text, 1);
    },

    addClass: function (c) {
      return this.each(function (el) {
        this.hasClass(el, c) || (el.className = trim(el.className + ' ' + c));
      }, this);
    },

    removeClass: function (c) {
      return this.each(function (el) {
        this.hasClass(el, c) && (el.className = trim(el.className.replace(classReg(c), ' ')));
      }, this);
    },

    hasClass: function (el, c) {
      return typeof c == 'undefined' ?
        some(this, function (i) {
          return classReg(el).test(i.className);
        }) :
        classReg(c).test(el.className);
    },

    toggleClass: function (c, condition) {
      if (typeof condition !== 'undefined' && !condition) {
        return this;
      }
      return this.each(function (el) {
        this.hasClass(el, c) ?
          (el.className = trim(el.className.replace(classReg(c), ' '))) :
          (el.className = trim(el.className + ' ' + c));
      }, this);
    },

    show: function (type) {
      return this.each(function (el) {
        el.style.display = type || '';
      });
    },

    hide: function (elements) {
      return this.each(function (el) {
        el.style.display = 'none';
      });
    },

    append: function (node) {
      return this.each(function (el) {
        each(normalize(node), function (i) {
          el.appendChild(i);
        });
      });
    },

    prepend: function (node) {
      return this.each(function (el) {
        var first = el.firstChild;
        each(normalize(node), function (i) {
          el.insertBefore(i, first);
        });
      });
    },

    appendTo: function (target, host) {
      return insert.call(this, target, host, function (t, el) {
        t.appendChild(el);
      });
    },

    prependTo: function (target, host) {
      return insert.call(this, target, host, function (t, el) {
        t.insertBefore(el, t.firstChild);
      });
    },

    next: function () {
      return this.related('nextSibling');
    },

    previous: function () {
      return this.related('previousSibling');
    },

    related: function (method) {
      return this.map(
        function (el) {
          el = el[method];
          while (el && el.nodeType !== 1) {
            el = el[method];
          }
          return el || 0;
        },
        function (el) {
          return el;
        }
      );
    },

    before: function (node) {
      return this.each(function (el) {
        each(bonzo.create(node), function (i) {
          el.parentNode.insertBefore(i, el);
        });
      });
    },

    after: function (node) {
      return this.each(function (el) {
        each(bonzo.create(node), function (i) {
          el.parentNode.insertBefore(i, el.nextSibling);
        });
      });
    },

    insertBefore: function (target, host) {
      return insert.call(this, target, host, function (t, el) {
        t.parentNode.insertBefore(el, t);
      });
    },

    insertAfter: function (target, host) {
      return insert.call(this, target, host, function (t, el) {
        var sibling = t.nextSibling;
        if (sibling) {
          t.parentNode.insertBefore(el, sibling);
        }
        else {
          t.parentNode.appendChild(el);
        }
      });
    },

    css: function (o, v) {
      // is this a request for just getting a style?
      if (v === undefined && typeof o == 'string') {
        return getStyle(this[0], o);
      }
      var iter = o;
      if (typeof o == 'string') {
        iter = {};
        iter[o] = v;
      }

      if (ie && iter.opacity) {
        // oh this 'ol gamut
        iter.filter = 'alpha(opacity=' + (iter.opacity * 100) + ')';
        // give it layout
        iter.zoom = o.zoom || 1;
        delete iter.opacity;
      }

      if (v = iter['float']) {
        // float is a reserved style word. w3 uses cssFloat, ie uses styleFloat
        ie ? (iter.styleFloat = v) : (iter.cssFloat = v);
        delete iter['float'];
      }

      var fn = function (el, p, v) {
        for (var k in iter) {
          if (iter.hasOwnProperty(k)) {
            v = iter[k];
            // change "5" to "5px" - unless you're line-height, which is allowed
            (p = camelize(k)) && digit.test(v) && !(p in unitless) && (v += px);
            el.style[p] = v;
          }
        }
      };
      return this.each(fn);
    },

    offset: function (x, y) {
      if (x || y) {
        return this.each(function (el) {
          xy(el, x, y);
        });
      }
      var el = this[0];
      var width = el.offsetWidth;
      var height = el.offsetHeight;
      var top = el.offsetTop;
      var left = el.offsetLeft;
      while (el = el.offsetParent) {
        top = top + el.offsetTop;
        left = left + el.offsetLeft;
      }

      return {
        top: top,
        left: left,
        height: height,
        width: width
      };
    },

    attr: function (k, v) {
      var el = this[0];
      return typeof v == 'undefined' ?
        specialAttributes.test(k) ?
          stateAttributes.test(k) && typeof el[k] == 'string' ?
            true : el[k] : el[getAttribute](k) :
        this.each(function (el) {
          k == 'value' ? (el.value = v) : el[setAttribute](k, v);
        });
    },

    val: function (s) {
      return (typeof s == 'string') ? this.attr('value', s) : this[0].value;
    },

    removeAttr: function (k) {
      return this.each(function (el) {
        el.removeAttribute(k);
      });
    },

    data: function (k, v) {
      var el = this[0];
      if (typeof v === 'undefined') {
        el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids);
        var uid = el[getAttribute]('data-node-uid');
        uidList[uid] || (uidList[uid] = {});
        return uidList[uid][k];
      } else {
        return this.each(function (el) {
          el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids);
          var uid = el[getAttribute]('data-node-uid');
          var o = {};
          o[k] = v;
          uidList[uid] = o;
        });
      }
    },

    remove: function () {
      return this.each(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
    },

    empty: function () {
      return this.each(function (el) {
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
      });
    },

    detach: function () {
      return this.map(function (el) {
        return el.parentNode.removeChild(el);
      });
    },

    scrollTop: function (y) {
      return scroll.call(this, null, y, 'y');
    },

    scrollLeft: function (x) {
      return scroll.call(this, x, null, 'x');
    }
  };

  function normalize(node, tag) {
    return typeof node == 'string' ? bonzo.create(node, tag) : is(node) ? [node] : node;
  }

  function scroll(x, y, type) {
    var el = this[0];
    if (x == null && y == null) {
      return (isBody(el) ? getWindowScroll() : { x: el.scrollLeft, y: el.scrollTop })[type];
    }
    if (isBody(el)) {
      window.scrollTo(x, y);
    } else {
      x != null && (el.scrollLeft = x);
      y != null && (el.scrollTop = y);
    }
    return this;
  }

  function isBody(element) {
    return element === window || (/^(?:body|html)$/i).test(element.tagName);
  }

  function getWindowScroll() {
    return { x: window.pageXOffset || html.scrollLeft, y: window.pageYOffset || html.scrollTop };
  }

  function bonzo(els, host) {
    return new _bonzo(els, host);
  }

  bonzo.setQueryEngine = function (q) {
    query = q;
    delete bonzo.setQueryEngine;
  };

  bonzo.aug = function (o, target) {
    for (var k in o) {
      o.hasOwnProperty(k) && ((target || _bonzo.prototype)[k] = o[k]);
    }
  };

  bonzo.create = function (node, tag) {
    return typeof node == 'string' ?
      function () {
        var t = tag ? tagMap[tag.toLowerCase()] : null;
        var el = doc.createElement(t || 'div'), els = [];
        if (tag) {
          var bitches = node.match(new RegExp("<" + t + ">.+?<\\/" + t + ">", "g"));
          each(bitches, function (m) {
            m = m.replace(/<(.+)>(.+?)<\/\1>/, '$2');
            var bah = doc.createElement(t);
            bah.appendChild(doc.createDocumentFragment(m));
            el.appendChild(bah);
          });
        } else {
          el.innerHTML = node;
        }
        var nodes = el.childNodes;
        el = el.firstChild;
        els.push(el);
        while (el = el.nextSibling) {
          (el.nodeType == 1) && els.push(el);
        }
        return els;

      }() : is(node) ? [node.cloneNode(true)] : [];
  };

  bonzo.doc = function () {
    var w = html.scrollWidth,
        h = html.scrollHeight,
        vp = this.viewport();
    return {
      width: Math.max(w, vp.width),
      height: Math.max(h, vp.height)
    };
  };

  bonzo.firstChild = function (el) {
    for (var c = el.childNodes, i = 0, j = (c && c.length) || 0, e; i < j; i++) {
      if (c[i].nodeType === 1) {
        e = c[j = i];
      }
    }
    return e;
  };

  bonzo.viewport = function () {
    var h = self.innerHeight,
        w = self.innerWidth;
    ie && (h = html.clientHeight) && (w = html.clientWidth);
    return {
      width: w,
      height: h
    };
  };

  bonzo.isAncestor = 'compareDocumentPosition' in html ?
    function (container, element) {
      return (container.compareDocumentPosition(element) & 16) == 16;
    } : 'contains' in html ?
    function (container, element) {
      return container !== element && container.contains(element);
    } :
    function (container, element) {
      while (element = element.parentNode) {
        if (element === container) {
          return true;
        }
      }
      return false;
    };

  var old = context.bonzo;
  bonzo.noConflict = function () {
    context.bonzo = old;
    return this;
  };
  context['bonzo'] = bonzo;

}(this);!function ($) {

  var b = bonzo;
  b.setQueryEngine($);
  $.ender(b);
  $.ender(b(), true);
  $.ender({
    create: function (node) {
      return $(b.create(node));
    }
  });

  function indexOf(ar, val) {
    for (var i = 0; i < ar.length; i++) {
      if (ar[i] === val) {
        return i;
      }
    }
    return -1;
  }

  function uniq(ar) {
    var a = [], i, j;
    label:
    for (i = 0; i < ar.length; i++) {
      for (j = 0; j < a.length; j++) {
        if (a[j] == ar[i]) {
          continue label;
        }
      }
      a[a.length] = ar[i];
    }
    return a;
  }
  $.ender({
    parents: function (selector, closest) {
      var collection = $(selector), j, k, p, r = [];
      for (j = 0, k = this.length; j < k; j++) {
        p = this[j];
        while (p = p.parentNode) {
          if (indexOf(collection, p) !== -1) {
            r.push(p);
            if (closest) break;
          }
        }
      }
      return $(uniq(r));
    },

    closest: function (selector) {
      return this.parents(selector, true);
    },

    first: function () {
      return $(this[0]);
    },

    last: function () {
      return $(this[this.length - 1]);
    },

    next: function () {
      return $(b(this).next());
    },

    previous: function () {
      return $(b(this).previous());
    },

    appendTo: function (t) {
      return b(this.selector).appendTo(t, this);
    },

    prependTo: function (t) {
      return b(this.selector).prependTo(t, this);
    },

    insertAfter: function (t) {
      return b(this.selector).insertAfter(t, this);
    },

    insertBefore: function (t) {
      return b(this.selector).insertBefore(t, this);
    },

    siblings: function () {
      var i, l, p, r = [];
      for (i = 0, l = this.length; i < l; i++) {
        p = this[i];
        while (p = p.previousSibling) {
          p.nodeType == 1 && r.push(p);
        }
        p = this[i];
        while (p = p.nextSibling) {
          p.nodeType == 1 && r.push(p);
        }
      }
      return $(r);
    },

    children: function () {
      var el, r = [];
      for (i = 0, l = this.length; i < l; i++) {
        if (!(el = b.firstChild(this[i]))) {
          continue;
        }
        r.push(el);
        while (el = el.nextSibling) {
          el.nodeType == 1 && r.push(el);
        }
      }
      return $(uniq(r));
    },

    height: function (v) {
      return v ? this.css('height', v) : parseInt(this.css('height'), 10);
    },

    width: function (v) {
      return v ? this.css('width', v) : parseInt(this.css('width'), 10);
    }
  }, true);

}(ender || $);

!function () { var exports = {}, module = { exports: exports }; !function (doc) {
  var loaded = 0, fns = [], ol, f = false,
      testEl = doc.createElement('a'),
      domContentLoaded = 'DOMContentLoaded',
      addEventListener = 'addEventListener',
      onreadystatechange = 'onreadystatechange';

  /^loade|c/.test(doc.readyState) && (loaded = 1);

  function flush() {
    loaded = 1;
    for (var i = 0, l = fns.length; i < l; i++) {
      fns[i]();
    }
  }
  doc[addEventListener] && doc[addEventListener](domContentLoaded, function fn() {
    doc.removeEventListener(domContentLoaded, fn, f);
    flush();
  }, f);


  testEl.doScroll && doc.attachEvent(onreadystatechange, (ol = function ol() {
    if (/^c/.test(doc.readyState)) {
      doc.detachEvent(onreadystatechange, ol);
      flush();
    }
  }));

  var domReady = testEl.doScroll ?
    function (fn) {
      self != top ?
        !loaded ?
          fns.push(fn) :
          fn() :
        !function () {
          try {
            testEl.doScroll('left');
          } catch (e) {
            return setTimeout(function() {
              domReady(fn);
            }, 50);
          }
          fn();
        }();
    } :
    function (fn) {
      loaded ? fn() : fns.push(fn);
    };

    (typeof module !== 'undefined') && module.exports ?
      (module.exports = {domReady: domReady}) :
      (window.domReady = domReady);

}(document); $.ender(module.exports); }();
/*!
  * qwery.js - copyright @dedfat
  * https://github.com/ded/qwery
  * Follow our software http://twitter.com/dedfat
  * MIT License
  */
!function (context, doc) {

  var c, i, j, k, l, m, o, p, r, v,
      el, node, len, found, classes, item, items, token, collection,
      id = /#([\w\-]+)/,
      clas = /\.[\w\-]+/g,
      idOnly = /^#([\w\-]+$)/,
      classOnly = /^\.([\w\-]+)$/,
      tagOnly = /^([\w\-]+)$/,
      tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/,
      html = doc.documentElement,
      tokenizr = /\s(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\])/,
      simple = /^([a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/,
      attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/,
      chunker = new RegExp(simple.source + '(' + attr.source + ')?');

  function array(ar) {
    r = [];
    for (i = 0, len = ar.length; i < len; i++) {
      r[i] = ar[i];
    }
    return r;
  }

  var cache = function () {
    this.c = {};
  };
  cache.prototype = {
    g: function (k) {
      return this.c[k] || undefined;
    },
    s: function (k, v) {
      this.c[k] = v;
      return v;
    }
  };

  var classCache = new cache(),
      cleanCache = new cache(),
      attrCache = new cache(),
      tokenCache = new cache();

  function q(query) {
    return query.match(chunker);
  }

  function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value) {
    var m, c, k;
    if (tag && this.tagName.toLowerCase() !== tag) {
      return false;
    }
    if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) {
      return false;
    }
    if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
      for (i = classes.length; i--;) {
        c = classes[i].slice(1);
        if (!(classCache.g(c) || classCache.s(c, new RegExp('(^|\\s+)' + c + '(\\s+|$)'))).test(this.className)) {
          return false;
        }
      }
    }
    if (wholeAttribute && !value) {
      o = this.attributes;
      for (k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
          return this;
        }
      }
    }
    if (wholeAttribute && !checkAttr(qualifier, this.getAttribute(attribute) || '', value)) {
      return false;
    }
    return this;
  }

  function loopAll(tokens) {
    var r = [], token = tokens.pop(), intr = q(token), tag = intr[1] || '*', i, l, els,
        root = tokens.length && (m = tokens[0].match(idOnly)) ? doc.getElementById(m[1]) : doc;
    if (!root) {
      return r;
    }
    els = root.getElementsByTagName(tag);
    for (i = 0, l = els.length; i < l; i++) {
      el = els[i];
      if (item = interpret.apply(el, intr)) {
        r.push(item);
      }
    }
    return r;
  }

  function clean(s) {
    return cleanCache.g(s) || cleanCache.s(s, s.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, '\\$1'));
  }

  function checkAttr(qualify, actual, val) {
    switch (qualify) {
    case '=':
      return actual == val;
    case '^=':
      return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, new RegExp('^' + clean(val))));
    case '$=':
      return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, new RegExp(clean(val) + '$')));
    case '*=':
      return actual.match(attrCache.g(val) || attrCache.s(val, new RegExp(clean(val))));
    case '~=':
      return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, new RegExp('(?:^|\\s+)' + clean(val) + '(?:\\s+|$)')));
    case '|=':
      return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, new RegExp('^' + clean(val) + '(-|$)')));
    }
    return false;
  }

  function _qwery(selector) {
    var r = [], ret = [], i, l,
        tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr));
    tokens = tokens.slice(0);
    if (!tokens.length) {
      return r;
    }
    r = loopAll(tokens);
    if (!tokens.length) {
      return r;
    }
    // loop through all descendent tokens
    for (j = 0, l = r.length, k = 0; j < l; j++) {
      node = r[j];
      p = node;
      // loop through each token
      for (i = tokens.length; i--;) {
        z: // loop through parent nodes
        while (p !== html && (p = p.parentNode)) {
          if (found = interpret.apply(p, q(tokens[i]))) {
            break z;
          }
        }
      }
      found && (ret[k++] = node);
    }
    return ret;
  }

  var isAncestor = 'compareDocumentPosition' in html ?
    function (element, container) {
      return (container.compareDocumentPosition(element) & 16) == 16;
    } : 'contains' in html ?
    function (element, container) {
      return container !== element && container.contains(element);
    } :
    function (element, container) {
      while (element = element.parentNode) {
        if (element === container) {
          return 1;
        }
      }
      return 0;
    };

  function boilerPlate(selector, _root, fn) {
    var root = (typeof _root == 'string') ? fn(_root)[0] : (_root || doc);
    if (isNode(selector)) {
      return !_root || (isNode(root) && isAncestor(selector, root)) ? [selector] : [];
    }
    if (selector && typeof selector === 'object' && isFinite(selector.length)) {
      return array(selector);
    }
    if (m = selector.match(idOnly)) {
      return (el = doc.getElementById(m[1])) ? [el] : [];
    }
    if (m = selector.match(tagOnly)) {
      return array(root.getElementsByTagName(m[1]));
    }
    return false;
  }

  function isNode(el) {
    return (el === window || el && el.nodeType && el.nodeType.toString().match(/[19]/));
  }

  function qsa(selector, _root) {
    var root = (typeof _root == 'string') ? qsa(_root)[0] : (_root || doc);
    if (!root || !selector) {
      return [];
    }
    if (m = boilerPlate(selector, _root, qsa)) {
      return m;
    }
    if (doc.getElementsByClassName && (m = selector.match(classOnly))) {
      return array((root).getElementsByClassName(m[1]));
    }
    return array((root).querySelectorAll(selector));
  }

  function uniq(ar) {
    var a = [], i, j;
    label:
    for (i = 0; i < ar.length; i++) {
      for (j = 0; j < a.length; j++) {
        if (a[j] == ar[i]) {
          continue label;
        }
      }
      a[a.length] = ar[i];
    }
    return a;
  }

  var qwery = function () {
    // return fast. boosh.
    if (doc.querySelector && doc.querySelectorAll) {
      return qsa;
    }
    return function (selector, _root) {
      var root = (typeof _root == 'string') ? qwery(_root)[0] : (_root || doc);
      if (!root || !selector) {
        return [];
      }
      var i, l, result = [], collections = [], element;
      if (m = boilerPlate(selector, _root, qwery)) {
        return m;
      }
      if (m = selector.match(tagAndOrClass)) {
        items = root.getElementsByTagName(m[1] || '*');
        r = classCache.g(m[2]) || classCache.s(m[2], new RegExp('(^|\\s+)' + m[2] + '(\\s+|$)'));
        for (i = 0, l = items.length, j = 0; i < l; i++) {
          r.test(items[i].className) && (result[j++] = items[i]);
        }
        return result;
      }
      for (i = 0, items = selector.split(','), l = items.length; i < l; i++) {
        collections[i] = _qwery(items[i]);
      }
      for (i = 0, l = collections.length; i < l && (collection = collections[i]); i++) {
        var ret = collection;
        if (root !== doc) {
          ret = [];
          for (j = 0, m = collection.length; j < m && (element = collection[j]); j++) {
            // make sure element is a descendent of root
            isAncestor(element, root) && ret.push(element);
          }
        }
        result = result.concat(ret);
      }
      return uniq(result);
    };
  }();

  qwery.uniq = uniq;
  var oldQwery = context.qwery;
  qwery.noConflict = function () {
    context.qwery = oldQwery;
    return this;
  };
  context.qwery = qwery;

}(this, document);
!function (doc) {
  var q = qwery.noConflict();
  function create(node, root) {
    var el = (root || doc).createElement('div'), els = [];
    el.innerHTML = node;
    var nodes = el.childNodes;
    el = el.firstChild;
    els.push(el);
    while (el = el.nextSibling) {
      (el.nodeType == 1) && els.push(el);
    }
    return els;
  };
  $._select = function (s, r) {
    return /^\s*</.test(s) ? create(s, r) : q(s, r);
  };
  $.ender({
    find: function (s) {
      var r = [], i, l, j, k, els;
      for (i = 0, l = this.length; i < l; i++) {
        els = q(s, this[i]);
        for (j = 0, k = els.length; j < k; j++) {
          r.push(els[j]);
        }
      }
      return $(q.uniq(r));
    }
  }, true);
}(document);

/*!
  * Valentine: JavaScript's Sister
  * copyright Dustin Diaz 2011 (@ded)
  * https://github.com/ded/valentine
  * License MIT
  */

!function (context) {

  var v = function (a, scope) {
        return new Valentine(a, scope);
      },
      ap = Array.prototype,
      op = Object.prototype,
      slice = ap.slice,
      nativ = !!('map' in ap),
      nativ18 = !!('reduce' in ap),
      trimReplace = /(^\s*|\s*$)/g;

  var iters = {
    each: nativ ?
      function (a, fn, scope) {
        ap.forEach.call(a, fn, scope);
      } :
      function (a, fn, scope) {
        for (var i = 0, l = a.length; i < l; i++) {
          fn.call(scope, a[i], i, a);
        }
      },
    map: nativ ?
      function (a, fn, scope) {
        return ap.map.call(a, fn, scope);
      } :
      function (a, fn, scope) {
        var r = [];
        for (var i = 0, l = a.length; i < l; i++) {
          r[i] = fn.call(scope, a[i], i, a);
        }
        return r;
      },
    some: nativ ?
      function (a, fn, scope) {
        return a.some(fn, scope);
      } :
      function (a, fn, scope) {
        for (var i = 0, l = a.length; i < l; i++) {
          if (fn.call(scope, a[i], i, a)) {
            return true;
          }
        }
        return false;
      },
    every: nativ ?
      function (a, fn, scope) {
        return a.every(fn, scope);
      } :
      function (a, fn, scope) {
        for (var i = 0, l = a.length; i < l; i++) {
          if (!fn.call(scope, a[i], i, a)) {
            return false;
          }
        }
        return true;
      },
    filter: nativ ?
      function (a, fn, scope) {
        return a.filter(fn, scope);
      } :
      function (a, fn, scope) {
        var r = [];
        for (var i = 0, j = 0, l = a.length; i < l; i++) {
          if (!fn.call(scope, a[i], i, a)) {
            continue;
          }
          r[j++] = a[i];
        }
        return r;
      },
    indexOf: nativ ?
      function (a, el, start) {
        return a.indexOf(el, isFinite(start) ? start : 0);
      } :
      function (a, el, start) {
        start = start || 0;
        for (var i = 0; i < a.length; i++) {
          if (a[i] === el) {
            return i;
          }
        }
        return -1;
      },

    lastIndexOf: nativ ?
      function (a, el, start) {
        return a.lastIndexOf(el, isFinite(start) ? start : a.length);
      } :
      function (a, el, start) {
        start = start || a.length;
        start = start >= a.length ? a.length :
          start < 0 ? a.length + start : start;
        for (var i = start; i >= 0; --i) {
          if (a[i] === el) {
            return i;
          }
        }
        return -1;
      },

    reduce: nativ18 ?
      function (o, i, m, c) {
        return ap.reduce.call(o, i, m, c);
      } :
      function (obj, iterator, memo, context) {
        var initial = !is.und(memo);
        !obj && (obj = []);
        iters.each(obj, function (value, index, list) {
          if (!initial && index === 0) {
            memo = value;
            initial = true;
          } else {
            memo = iterator.call(context, memo, value, index, list);
          }
        });
        if (!initial) {
          throw new TypeError("Reduce of empty array with no initial value");
        }
        return memo;
      },

    reduceRight: nativ18 ?
      function (o, i, m, c) {
        return ap.reduceRight.call(o, i, m, c);
      } :
      function (ob, i, m, c) {
        !ob && (ob = []);
        var reversed = (is.arr(ob) ? ob.slice() : o.toArray(ob)).reverse();
        return iters.reduce(reversed, i, m, c);
      },

    find: function (obj, iterator, context) {
      var result;
      iters.some(obj, function (value, index, list) {
        if (iterator.call(context, value, index, list)) {
          result = value;
          return true;
        }
      });
      return result;
    },

    reject: function (a, fn, scope) {
      var r = [];
      for (var i = 0, j = 0, l = a.length; i < l; i++) {
        if (fn.call(scope, a[i], i, a)) {
          continue;
        }
        r[j++] = a[i];
      }
      return r;
    },

    size: function (a) {
      return o.toArray(a).length;
    },

    pluck: function (a, k) {
      return iters.map(a, function (el) {
        return el[k];
      });
    },

    compact: function (a) {
      return iters.filter(a, function (value) {
        return !!value;
      });
    },

    flatten: function (a) {
      return iters.reduce(a, function (memo, value) {
        if (is.arr(value)) {
          return memo.concat(iters.flatten(value));
        }
        memo[memo.length] = value;
        return memo;
      }, []);
    },

    uniq: function (ar) {
      var a = [], i, j;
      label:
      for (i = 0; i < ar.length; i++) {
        for (j = 0; j < a.length; j++) {
          if (a[j] == ar[i]) {
            continue label;
          }
        }
        a[a.length] = ar[i];
      }
      return a;
    }

  };

  function aug(o, o2) {
    for (var k in o2) {
      o[k] = o2[k];
    }
  }

  var is = {
    fun: function (f) {
      return typeof f === 'function';
    },

    str: function (s) {
      return typeof s === 'string';
    },

    ele: function (el) {
      !!(el && el.nodeType && el.nodeType == 1);
    },

    arr: function (ar) {
      return ar instanceof Array;
    },

    num: function (n) {
      return typeof n === 'number';
    },

    bool: function (b) {
      return (b === true) || (b === false);
    },

    args: function (a) {
      return !!(a && op.hasOwnProperty.call(a, 'callee'));
    },

    emp: function (o) {
      var i = 0;
      return is.arr(o) ? o.length === 0 :
        is.obj(o) ? (function () {
          for (var k in o) {
            i++;
            break;
          }
          return (i === 0);
        }()) :
        o === '';
    },

    dat: function (d) {
      return !!(d && d.getTimezoneOffset && d.setUTCFullYear);
    },

    reg: function (r) {
      return !!(r && r.test && r.exec && (r.ignoreCase || r.ignoreCase === false));
    },

    nan: function (n) {
      return n !== n;
    },

    nil: function (o) {
      return o === null;
    },

    und: function (o) {
      return typeof o === 'undefined';
    },

    obj: function (o) {
      return o instanceof Object && !is.fun(o) && !is.arr(o);
    }
  };

  var o = {
    each: function (a, fn, scope) {
      is.arr(a) ?
        iters.each(a, fn, scope) : (function () {
          for (var k in a) {
            op.hasOwnProperty.call(a, k) && fn.call(scope, k, a[k], a);
          }
        }());
    },

    map: function (a, fn, scope) {
      var r = [], i = 0;
      return is.arr(a) ?
        iters.map(a, fn, scope) : !function () {
          for (var k in a) {
            op.hasOwnProperty.call(a, k) && (r[i++] = fn.call(scope, k, a[k], a));
          }
        }() && r;
    },

    toArray: function (a) {
      if (!a) {
        return [];
      }
      if (a.toArray) {
        return a.toArray();
      }
      if (is.arr(a)) {
        return a;
      }
      if (is.args(a)) {
        return slice.call(a);
      }
      return iters.map(a, function (k) {
        return k;
      });
    },

    first: function (a) {
      return a[0];
    },

    last: function (a) {
      return a[a.length - 1];
    },

    keys: Object.keys ?
      function (o) {
        return Object.keys(o);
      } :
      function (obj) {
        var keys = [];
        for (var key in obj) {
          op.hasOwnProperty.call(obj, key) && (keys[keys.length] = key);
        }
        return keys;
      },

    values: function (ob) {
      return o.map(ob, function (k, v) {
        return v;
      });
    },

    extend: function (ob) {
      o.each(slice.call(arguments, 1), function (source) {
        for (var prop in source) {
          !is.und(source[prop]) && (ob[prop] = source[prop]);
        }
      });
      return ob;
    },

    trim: String.prototype.trim ?
      function (s) {
        return s.trim();
      } :
      function (s) {
        return s.replace(trimReplace, '');
      },

    bind: function (scope, fn) {
      return function () {
        fn.apply(scope, arguments);
      };
    }

  };

  aug(v, iters);
  aug(v, o);
  v.is = is;

  // love thyself
  v.v = v;

  // peoples like the object style
  var Valentine = function (a, scope) {
    this.val = a;
    this._scope = scope || null;
    this._chained = 0;
  };

  v.each(v.extend({}, iters, o), function (name, fn) {
    Valentine.prototype[name] = function () {
      var a = v.toArray(arguments);
      a.unshift(this.val);
      var ret = fn.apply(this._scope, a);
      this.val = ret;
      return this._chained ? this : ret;
    };
  });

  // back compact to underscore (peoples like chaining)
  Valentine.prototype.chain = function () {
    this._chained = 1;
    return this;
  };

  Valentine.prototype.value = function () {
    return this.val;
  };

  var old = context.v;
  v.noConflict = function () {
    context.v = old;
    return this;
  };

  (typeof module !== 'undefined') && module.exports ?
    (module.exports = v) :
    (context['v'] = v);

}(this);ender.ender(v);
/*!
  * Reqwest! A x-browser general purpose XHR connection manager
  * copyright Dustin Diaz 2011
  * https://github.com/ded/reqwest
  * license MIT
  */
!function (window) {
  var twoHundo = /^20\d$/,
      doc = document,
      byTag = 'getElementsByTagName',
      topScript = doc[byTag]('script')[0],
      head = topScript.parentNode,
      xhr = ('XMLHttpRequest' in window) ?
        function () {
          return new XMLHttpRequest();
        } :
        function () {
          return new ActiveXObject('Microsoft.XMLHTTP');
        };

  var uniqid = 0;

  function readyState(o, success, error) {
    return function () {
      if (o && o.readyState == 4) {
        if (twoHundo.test(o.status)) {
          success(o);
        } else {
          error(o);
        }
      }
    };
  }

  function setHeaders(http, options) {
    var headers = options.headers || {};
    headers.Accept = 'text/javascript, text/html, application/xml, text/xml, */*';
    if (options.data) {
      headers['Content-type'] = 'application/x-www-form-urlencoded';
      for (var h in headers) {
        headers.hasOwnProperty(h) && http.setRequestHeader(h, headers[h], false);
      }
    }
  }

  function getCallbackName(o) {
    var callbackVar = o.jsonpCallback || "callback";
    if (o.url.substr(-(callbackVar.length + 2)) == (callbackVar + "=?")) {
      // Generate a guaranteed unique callback name
      var callbackName = "reqwest_" + uniqid++;

      // Replace the ? in the URL with the generated name
      o.url = o.url.substr(0, o.url.length - 1) + callbackName;
      return callbackName;
    } else {
      // Find the supplied callback name
      var regex = new RegExp(callbackVar + "=([\\w]+)");
      return o.url.match(regex)[1];
    }
  }

  function getRequest(o, fn, err) {
    if (o.type == 'jsonp') {
      var script = doc.createElement('script');

      // Add the global callback
      var callbackName = getCallbackName(o);
      window[callbackName] = function (data) {
        // Call the success callback
        o.success && o.success(data);
      };

      // Setup our script element
      script.type = "text/javascript";
      script.src = o.url;
      script.async = true;
      script.onload = function () {
        // Script has been loaded, and thus the user callback has
        // been called, so lets clean up now.
        head.removeChild(script);
        delete window[callbackName];
      };

      // Add the script to the DOM head
      head.insertBefore(script, topScript);
    } else {
      var http = xhr();
      http.open(o.method || 'GET', typeof o == 'string' ? o : o.url, true);
      setHeaders(http, o);
      http.onreadystatechange = readyState(http, fn, err);
      o.before && o.before(http);
      http.send(o.data || null);
      return http;
    }
  }

  function Reqwest(o, fn) {
    this.o = o;
    this.fn = fn;
    init.apply(this, arguments);
  }

  function setType(url) {
    if (/\.json$/.test(url)) {
      return 'json';
    }
    if (/\.jsonp$/.test(url)) {
      return 'jsonp';
    }
    if (/\.js$/.test(url)) {
      return 'js';
    }
    if (/\.html?$/.test(url)) {
      return 'html';
    }
    if (/\.xml$/.test(url)) {
      return 'xml';
    }
    return 'js';
  }

  function init(o, fn) {
    this.url = typeof o == 'string' ? o : o.url;
    this.timeout = null;
    var type = o.type || setType(this.url), self = this;
    fn = fn || function () {};

    if (o.timeout) {
      this.timeout = setTimeout(function () {
        self.abort();
        error();
      }, o.timeout);
    }

    function complete(resp) {
      o.complete && o.complete(resp);
    }

    function success(resp) {
      o.timeout && clearTimeout(self.timeout) && (self.timeout = null);
      var r = resp.responseText;

      switch (type) {
      case 'json':
        resp = eval('(' + r + ')');
        break;
      case 'js':
        resp = eval(r);
        break;
      case 'html':
        resp = r;
        break;
      // default is the response from server
      }

      fn(resp);
      o.success && o.success(resp);
      complete(resp);
    }

    function error(resp) {
      o.error && o.error(resp);
      complete(resp);
    }

    this.request = getRequest(o, success, error);
  }

  Reqwest.prototype = {
    abort: function () {
      this.request.abort();
    },

    retry: function () {
      init.call(this, this.o, this.fn);
    }
  };

  function reqwest(o, fn) {
    return new Reqwest(o, fn);
  }

  function enc(v) {
    return encodeURIComponent(v);
  }

  function serial(el) {
    var n = el.name;
    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) {
      return '';
    }
    n = enc(n);
    switch (el.tagName.toLowerCase()) {
    case 'input':
      switch (el.type) {
      // silly wabbit
      case 'reset':
      case 'button':
      case 'image':
      case 'file':
        return '';
      case 'checkbox':
      case 'radio':
        return el.checked ? n + '=' + (el.value ? enc(el.value) : true) + '&' : '';
      default: // text hidden password submit
        return n + '=' + (el.value ? enc(el.value) : true) + '&';
      }
      break;
    case 'textarea':
      return n + '=' + enc(el.value) + '&';
    case 'select':
      // @todo refactor beyond basic single selected value case
      return n + '=' + enc(el.options[el.selectedIndex].value) + '&';
    }
    return '';
  }

  reqwest.serialize = function (form) {
    var inputs = form[byTag]('input'),
        selects = form[byTag]('select'),
        texts = form[byTag]('textarea');
    return (v(inputs).chain().toArray().map(serial).value().join('') +
    v(selects).chain().toArray().map(serial).value().join('') +
    v(texts).chain().toArray().map(serial).value().join('')).replace(/&$/, '');
  };

  reqwest.serializeArray = function (f) {
    for (var pairs = this.serialize(f).split('&'), i = 0, l = pairs.length, r = [], o; i < l; i++) {
      pairs[i] && (o = pairs[i].split('=')) && r.push({name: o[0], value: o[1]});
    }
    return r;
  };

  var old = window.reqwest;
  reqwest.noConflict = function () {
    window.reqwest = old;
    return this;
  };

  // defined as extern for Closure Compilation
  // do not change to (dot) '.' syntax
  window['reqwest'] = reqwest;

}(this);ender.ender({
  ajax: reqwest
});
ender.ender(reqwest, true);