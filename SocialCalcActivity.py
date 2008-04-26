from sugar.activity import activity
from sugar.activity.activity import get_bundle_path
from sugar import env
import logging
import sys, os
import gtk
import gobject

import hulahop
hulahop.startup(os.path.join(env.get_profile_path(), 'gecko'))

from XOCom import XOCom

# The XOCom object helps us communicate with the browser
uri = 'file://' + get_bundle_path() + '/web/index.html';
xocom = XOCom(uri)

class OnePageWikiActivity (activity.Activity):
    def __init__(self, handle):
        activity.Activity.__init__(self, handle)
        self.set_title('OnePageWiki')

        toolbox = activity.ActivityToolbox(self)
        self.set_toolbox(toolbox)
        toolbox.show()

        self.set_canvas( xocom.create_webview() )

    def write_file(self, filename):
        content = xocom.send_to_browser('write')
        print "write_file(%s): %s"%(filename, content)
        if content:
            fh = open(filename, 'w')
            fh.write(content)
            fh.close()

    def read_file(self, filename):
        fh = open(filename, 'r')
        content = fh.read()
        print "read_file(%s): %s"%(filename, content)
        # We must delay this to give the browser time to start up
        # It would be better if this send_to_browser was instead triggered
        # once the browser had finished loading.
        gobject.timeout_add(2000, xocom.send_to_browser, 'read', content)
        
