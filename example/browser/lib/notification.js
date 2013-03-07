// Goal
// put this in an application cache
// allow the user to rate songs as they play
(function () {
  "use strict";

  // https://github.com/DangerCove/html5-notifications
  // http://dangercove.github.com/html5-notifications/
  // http://tumblr.dangercove.com/post/17213260067/html5-web-notifications
  // http://www.html5rocks.com/en/tutorials/notifications/quick/
  // http://www.chromium.org/developers/design-documents/desktop-notifications/api-specification
  // http://dev.w3.org/2006/webapi/WebNotifications/publish/WebNotifications.html

  var Notifications = window.notifications || window.webkitNotifications || window.mozNotifications
    , icon = '/favicon.ico'
    , title = 'The Fradio'
    , message = 'Hello Good Friend'
    ;

  function checkPermission() {
    // WRONG
    // http://dev.w3.org/2009/dap/perms/FeaturePermissions.html
    // USER_ALLOWED = 2;
    // DEFAULT_ALLOWED = 1;
    // DEFAULT_DENIED = -1;
    // USER_DENIED = -2;

    // CORRECT
    // http://www.chromium.org/developers/design-documents/desktop-notifications/api-specification
    // PERMISSION_ALLOWED = 0;
    // PERMISSION_NOT_ALLOWED = 1;
    // PERMISSION_DENIED = 2;
    if (0 == Notifications.checkPermission()) {
      Notifications.createNotification(icon, title, message);
      Notifications.createHTMLNotification('./notification.html');
    } else {
      alert('but we wants it');
      askForgivenessNotPermission();
    }
  }

  function askForgivenessNotPermission() {
    Notifications.requestPermission(checkPermission);
  }

  askForgivenessNotPermission();

}());
