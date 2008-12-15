#!/usr/bin/python

# Make the MANIFEST file.  The contents of the activity folder and the NEWS and MANIFEST
# files are already included in the .xo file which the bundlebuilder creates, so don't
# add them to the manifest file.

try:
    from sugar.activity import bundlebuilder
    bundlebuilder.start()
except ImportError:
    import os
    os.system("find ./ | sed 's,^./,SocialCalcActivity.activity/,g' > MANIFEST")
    os.chdir('..')
    os.system('zip -r SocialCalcActivity.xo SocialCalcActivity.activity')
    os.system('mv SocialCalcActivity.xo ./SocialCalcActivity.activity')
    os.chdir('SocialCalcActivity.activity')

