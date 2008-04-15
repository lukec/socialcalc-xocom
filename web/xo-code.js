var XO = window.XO = {
    callbacks: { }
    set_status: function (msg) {
        jQuery("#xostatus").html(msg)
    },
    observer: {
      observe: function(req_obj,topic,command) {
        XO.set_status("Handling " + command)
        try {
          // We need access to use the XPCom functions below
          netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");

          // Unwrap the XPCom objects to get at the data passed to us
          req_obj = req_obj.QueryInterface(Components.interfaces.nsIMutableArray)
          var iter = req_obj.enumerate()
          var data = iter.getNext()
          data = data.QueryInterface(Components.interfaces.nsISupportsString)

          // Execute the registered callback method
          // return_value = XO.callbacks{command}(data.toString())
          return_value = 'Poop!'

          // Wrap the return value back into the XPCom object
          var result = Components.classes["@mozilla.org/supports-string;1"].createInstance(
                Components.interfaces.nsISupportsString)
          result.data = return_value
          // req_obj.replaceElementAt(result, 0, false)
          req_obj.clear()
          req_obj.appendElement(result, false)
        }
        catch (err) {
          XO.set_status("Error handling event: " + err)
        }
      }
    },
    register: function(command, callback) {
        XO.callbacks{command} = callback
    }
  }

try {
  netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(XO.observer, 'xo-message', false);
}
catch(err) {
    jQuery('#xostatus', 'JS Error: ' + err);
}

XO.set_status("Loaded Javascript");
