from sugar.activity.activity import get_bundle_path
from hulahop.webview import WebView
from xpcom import components

debug = True

class XOCom:
    # Constructor gives full XPCom access by default
    # This should be improved for future apps that may not need/want full access
    def __init__(self, uri=None):
        if uri:
            self.uri = uri
        else:
            self.uri = 'file://' + get_bundle_path() + '/web/index.html';
        self.give_full_xpcom_access()

    # Give the browser permission to use XPCom interfaces
    # This is necessary for XPCom communication to work
    # Note: Not all of these preferences may be required - requires further
    #       investigation
    def give_full_xpcom_access(self):
        pref_class = components.classes["@mozilla.org/preferences-service;1"]
        prefs = pref_class.getService(components.interfaces.nsIPrefService)
        prefs.getBranch('signed.applets.').setBoolPref('codebase_principal_support',
                True);
        prefs.getBranch('capability.principal.').setCharPref(
                        'socialcalc.granted', 'UniversalXPConnect')
        prefs.getBranch('capability.principal.').setCharPref(
                        'socialcalc.id', self.uri)

    # Wrapper method to create a new webview embedded browser component
    # Uses hulahop's WebView.  Assumes that you'll want to serve
    # web/index.html relative to your activity directory.
    def create_webview(self):
        web_view = WebView()
        web_view.load_uri(self.uri)
        web_view.show()
        return web_view

    # Use XPCom to execute a javascript callback registered with XO.js
    # The command will execute a javascript method registered with the same name,
    # and return any value received from the javascript
    def send_to_browser(self, command, parameter=None):
        if debug:
            print "sending: %s - (%s)"%(command, parameter)

        # Set up an array for parameters and return values for the XPCom call
        array = components.classes["@mozilla.org/array;1"].createInstance(
                components.interfaces.nsIMutableArray)
     
        # Optionally pass data to the javascript
        if parameter: 
            str = components.classes["@mozilla.org/supports-string;1"].createInstance(
                        components.interfaces.nsISupportsString)
            str.data = parameter
            array.appendElement(str, False)

        # Use XPCom to send an event to a javascript observer (web/xo.js)
        observerService = components.classes["@mozilla.org/observer-service;1"]
        ob_serv = observerService.getService(components.interfaces.nsIObserverService);
        ob_serv.notifyObservers(array, "xo-message", command);

        # check if the browser returned anything
        result = None
        if array.length:
            iter = array.enumerate()
            result = iter.getNext()
            result = result.QueryInterface(components.interfaces.nsISupportsString)
            result = result.toString()

        if debug:
            print "result: %s - (%s)"%(command, result)
        return result
