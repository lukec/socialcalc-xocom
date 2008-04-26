import os
import gtk
import time
import hulahop
hulahop.startup(os.path.expanduser('~/.test-hulahop'))
from XOCom import XOCom

# The XOCom object helps us communicate with the browser
uri = "file:///home/olpc/src/socialcalc-xocom/web/index.html"
xocom = XOCom(uri)

# This is just a simple way to trigger events from python for testing
# Handler for keypresses in the GTK Application
#   r - call the javascript 'read' hook with a dummy string
#   w - call the javascript 'write' hook and print out the result
def keypress(window, event):
    key = event.string
    if key == 'w':
        result = xocom.send_to_browser('write')
        if result:
            print "Result from browser - '%s'"%result
        else:
            print "No data received in the browser's response"
    if key == 'r':
        message = "I am a monkey - %s"%time.time()
        print "Sending '%s'"%message
        result = xocom.send_to_browser('read', message)
    if key == 'q':
        quit(None)


# Shut down our app
def quit(window):
#    hulahop.shutdown()
    gtk.main_quit()

# Create our GTK window containing the embedded browser, and hook up some handlers
window = gtk.Window()
window.set_default_size(600, 400)
window.connect("destroy", quit)
window.connect("key_press_event", keypress)

window.add( xocom.create_webview() )
window.show()
gtk.main()
