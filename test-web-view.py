import os
import gtk
import hulahop
hulahop.startup(os.path.expanduser('~/.test-hulahop'))
from hulahop.webview import WebView
from xpcom import components

def quit(window):
    hulahop.shutdown()
    gtk.main_quit()

# This is just a simple way to trigger events from python for testing
def keypress(window, key2):
    key = key2.string
    if key == 'w': # Send an event to the javascript handler
        result = send_to_browser('write')
        if result:
            print "Result from browser - '%s'"%result
        else:
            print "No data received in the browser's response"
    if key == 'r':
        import time
        result = send_to_browser('read', "I am a monkey - %s"%time.time())
    if key == 'q':
        quit(None)

observerService = components.classes["@mozilla.org/observer-service;1"]
ob_serv = observerService.getService(components.interfaces.nsIObserverService);

def send_to_browser(command, data=None):
    array = components.classes["@mozilla.org/array;1"].createInstance(
            components.interfaces.nsIMutableArray)
    if data: 
        str = components.classes["@mozilla.org/supports-string;1"].createInstance(
                    components.interfaces.nsISupportsString)
        str.data = data
        print "Sending (%s) to browser"%str.data
        array.appendElement(str, False)
    ob_serv.notifyObservers(array, "xo-message", command);
    # check if the browser returned anything
    if array.length:
        iter = array.enumerate()
        result = iter.getNext()
        result = result.QueryInterface(components.interfaces.nsISupportsString)
        return result.toString()
    return None

window = gtk.Window()
window.set_default_size(600, 400)
window.connect("destroy", quit)
window.connect("key_press_event", keypress)

# Give the browser permission to use XPCom interfaces
pref_class = components.classes["@mozilla.org/preferences-service;1"]
prefs = pref_class.getService(components.interfaces.nsIPrefService)
prefs.getBranch('signed.applets.').setBoolPref('codebase_principal_support', True);
prefs.getBranch('capability.principal.').setCharPref(
        'socialcalc.granted', 'UniversalXPConnect')
prefs.getBranch('capability.principal.').setCharPref(
        'socialcalc.id', 'file:///home/olpc/src/testapp/index.html')

# Create the embedded browser
web_view = WebView()
web_view.load_uri('file:///home/olpc/src/testapp/index.html')
web_view.show()

window.add(web_view)
window.show()
gtk.main()
