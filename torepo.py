#!/usr/bin/env python

import os
import sys
import optparse

#TODO allow hardlinks instead of symlinks
#TODO move unicode to function
parser = optparse.OptionParser()
parser.add_option("-v", 
    "--verbose", 
    dest="verbose", 
    action="store_true", 
    help="Display more information. -v -v -v for most verbose.")
options, args = parser.parse_args()

'''Put all regular files and directories into the database. Period.'''
# Create directory structure in repo
# Move files to repo
# create links

if 2 is not len(args) or not os.path.isdir(args[0]):
    raise Exception('Usage: torepo.py path/to/files ../path/to/repo/')
srcd = os.path.abspath(args[0])
repo = os.path.abspath(args[1])
print "################################"
print "moving all files from", srcd, "to", repo, "and leave (sym)links behind"

for root, dirs, files in os.walk(srcd):
    root = os.path.normpath(os.path.relpath(root, os.getcwd()))
    repo_sub = os.path.join(repo, os.path.relpath(root, srcd))
    if not os.path.isdir(repo_sub):
        os.mkdir(repo_sub)

    for dir in dirs:
        if os.path.islink(dir):
            dirs.remove(dir)

    for file in files:
        if os.path.islink(os.path.join(root,file)):
            continue
        #print "mv", os.path.normpath(os.path.join(root, file)), os.path.normpath(os.path.join(repo_sub, file))
        #print "ln -s", os.path.normpath(os.path.join(repo_sub, file)), os.path.normpath(os.path.join(root, file))
        if not os.path.lexists(os.path.join(repo_sub, file)):
            os.rename(os.path.join(root, file), os.path.join(repo_sub, file))
            #os.symlink(os.path.relpath(os.path.join(repo_sub, file), root), os.path.join(root, file))
            os.symlink(os.path.abspath(os.path.join(repo_sub, file)), os.path.join(root, file))
            #os.link(os.path.join(repo_sub, file), os.path.join(root, file))
        #TODO is it already: a sym link? a hard link? the same file?
