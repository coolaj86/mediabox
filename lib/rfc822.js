(function () {
  "use strict";

    /*Accepts a Javascript Date object as the parameter;
  outputs an RFC822-formatted datetime string. */
  var aMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    , aDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    ;

  function GetRFC822Date(oDate) {
    var dtm = ""
      ;
      
    dtm += aDays[oDate.getUTCDay()] + ", ";
    dtm += padWithZero(oDate.getUTCDate()) + " ";
    dtm += aMonths[oDate.getUTCMonth()] + " ";
    dtm += oDate.getUTCFullYear() + " ";
    dtm += padWithZero(oDate.getUTCHours()) + ":";
    dtm += padWithZero(oDate.getUTCMinutes()) + ":";
    dtm += padWithZero(oDate.getUTCSeconds()) + " " ;
    dtm += "GMT"; //getTZOString(oDate.getTimezoneOffset());
    return dtm;
  }

  //Pads numbers with a preceding 0 if the number is less than 10.
  function padWithZero(val) {
    if (parseInt(val) < 10) {
      return "0" + val;
    }
    return val;
  }

  /* accepts the client's time zone offset from GMT in minutes as a parameter.
  returns the timezone offset in the format [+|-}DDDD */
  function getTZOString(timezoneOffset) {
    var hours = Math.floor(timezoneOffset/60);
    var modMin = Math.abs(timezoneOffset%60);
    var s = new String();
    s += (hours > 0) ? "-" : "+";
    var absHours = Math.abs(hours)
    s += (absHours < 10) ? "0" + absHours :absHours;
    s += ((modMin == 0) ? "00" : modMin);

    return(s);
  }

  module.exports = GetRFC822Date;
}());
