import os
import gtk
import hulahop
hulahop.startup(os.path.expanduser('~/.test-hulahop'))
from hulahop.webview import WebView
from xpcom import components

class TestObserver:
    _com_interfaces_ = components.interfaces.nsIObserver

    def observe(self, subject, topic, data):
        print "observed! - %s - %s" % (topic, data)

def quit(window):
    hulahop.shutdown()
    gtk.main_quit()

window = gtk.Window()
window.set_default_size(600, 400)
window.connect("destroy", quit)

pref_class = components.classes["@mozilla.org/preferences-service;1"]
prefs = pref_class.getService(components.interfaces.nsIPrefService)
prefs.getBranch('signed.applets.').setBoolPref('codebase_principal_support', True);
prefs.getBranch('capability.principal.').setCharPref(
        'socialcalc.granted', 'UniversalXPConnect')
prefs.getBranch('capability.principal.').setCharPref(
        'socialcalc.id', 'file:///home/olpc/src/testapp/index.html')

web_view = WebView()
web_view.load_uri('file:///home/olpc/src/testapp/index.html')
web_view.show()

observerService = components.classes["@mozilla.org/observer-service;1"]
ob_serv = observerService.getService(components.interfaces.nsIObserverService);
ob_serv.addObserver(TestObserver(),"my-topic",False);


window.add(web_view)
window.show()

gtk.main()
