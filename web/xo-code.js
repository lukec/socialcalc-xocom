/*
 * XOCom Javascript Source
 *
 * This source creates a global XO object that communicates
 * with the python XPCom code running this activity.
 *
 * Your HTML file should register several callbacks with 
 * the XO object to handle requests from the activity:
 *
 * Example: A handler for the activity read_file and write_file
 *
 *  <script type="text/javascript">
 *      XO.register('read', function(content) {
 *          // Your code to consume the supplied content
 *      })
 *      XO.register('write', function() {
 *          // Your code to return the content to save
 *          return 'monkey'
 *      })
 *  </script>
 *
 *  Some commands for debugging are put in an element with the 
 *  id 'xo-status' if it exists.
 */

var XO = window.XO = {
    callbacks: { },
    set_status: function (msg) {
        jQuery('#xo-status').html(msg)
    },
    observer: {
      observe: function(req_obj,topic,command) {
        XO.set_status("Handling " + command)
        try {
          // We need access to use the XPCom functions below
          netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")

          // Unwrap the XPCom objects to get at the data passed to us
          req_obj = req_obj.QueryInterface(Components.interfaces.nsIMutableArray)
          var command_arg = undefined
          if (req_obj.length) {
              var iter = req_obj.enumerate()
              xp_arg = iter.getNext()
              xp_arg = xp_arg.QueryInterface(Components.interfaces.nsISupportsString)
              command_arg = xp_arg.toString()
          }

          // Execute the registered callback method
          return_value = XO.callbacks[command](command_arg)

          // Wrap the return value back into the XPCom object
          var result = Components.classes["@mozilla.org/supports-string;1"].createInstance(
                Components.interfaces.nsISupportsString)
          result.data = return_value
          req_obj.clear()
          req_obj.appendElement(result, false)
          XO.set_status("Handled " + command)
        }
        catch (err) {
          XO.set_status("Error handling event: " + err)
        }
      }
    },
    register: function(command, callback) {
        XO.callbacks[command] = callback
    }
}

/*
 * This snippet registers the XO observer to receive commands
 * from the python XPCom code
 */
try {
  netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(XO.observer, 'xo-message', false);
}
catch(err) {
    // Wait a bit to show this error, so the page has time to load up.
    setTimeout( function() {
        jQuery('#xo-status', 'JS Error: ' + err);
    }, 1000)
}
