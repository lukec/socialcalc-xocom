#!/usr/bin/python

# Make the MANIFEST file.  The contents of the activity folder and the NEWS and MANIFEST
# files are already included in the .xo file which the bundlebuilder creates, so don't
# add them to the manifest file.
import os
os.system("find ./ -name 'activity' -prune -o -name 'NEWS' \
                                    -prune -o -name 'MANIFEST' \
                                    -prune -o -name '.svn' \
                                    -prune -o -name '*.pyc' \
                                    -prune -o -name '*.xo' \
                                    -prune -o -type f \
                   -print > MANIFEST") 

from sugar.activity import bundlebuilder
bundlebuilder.start("SocialCalcActivity")
