#!/usr/bin/env python

# Alternate Implementations
# http://code.activestate.com/recipes/362459/
# http://svn.rpmforge.net/svn/trunk/rpms/hardlinkpy/hardlink.py

import os
import sys
import hashlib
# TODO port to ADOdb / SQLAlchemy
import sqlite3
import optparse
import time

usage = "usage: %prog [options] path1 path2 ..."
parser = optparse.OptionParser(usage=usage)
parser.add_option("-v", 
    "--verbose", 
    dest="verbose", 
    action="store_true", 
    help="Display more information. -v -v -v for most verbose.")
parser.add_option("-d", 
    "--database", 
    dest="database", 
    action="store",
    type="string",
    default="/tmp/fq.sqlite3", 
    help="Select a database in which to store the file data")
parser.add_option("-m", 
    "--min-size", 
    dest="min_size",
    default=(512*1024*4), 
    action="store", 
    type="int",
    help="The minimum size (in bytes) of the files catalogued (512kb default)") 
parser.add_option("-l", 
    "--link-type", 
    dest="link_type",
    default="hard", 
    action="store", 
    type="string",
    help="one of hard (default), soft, delete") 
options, args = parser.parse_args()
#print args
#sys.exit()

DB_FILE = options.database
KB = 1000
MB = 1000 * KB

db = sqlite3.connect(DB_FILE)
#db.text_factory = sqlite3.OptimizedUnicode
c = db.cursor()

def sumfile(fobj):
    '''Returns an md5 hash for an object with read() method.'''
    m = hashlib.md5()
    while True:
        d = fobj.read(8096)
        if not d:
            break
        m.update(d)
    return m.hexdigest()


def md5sum(fname):
    '''Returns an md5 hash for file fname, or stdin if fname is "-".'''
    if fname == '-':
        ret = sumfile(sys.stdin)
    else:
        f = file(fname, 'rb')
        #try:
        #	f = file(fname, 'rb')
        #except:
        #	print 'Failed to open file:', fname
        #	sys.exit()
        ret = sumfile(f)
        f.close()
    return ret

def toUTF8(string):
    try:
        string = unicode(string, 'utf-8', 'replace').encode()
    except:
        print 'utf-8 fail:', string
    return string

print '''Now search through files to find matches'''
md5matches = []
c.execute('''SELECT md5sum FROM Files WHERE size > ? GROUP BY md5sum HAVING COUNT() > 1 ORDER BY size DESC''', ( options.min_size, ) )
for row in c:
    md5matches.append(row[0])
for md5match in md5matches:
    c.execute('''SELECT path, filename FROM Files WHERE md5sum = ?''', (md5match,) )
    truematch = None
    lstat_tm = None
    for row in c:
        maybematch = os.path.join(row[0],row[1])

        try:
            lstat_mm = os.lstat(maybematch)
            if truematch is not None:
                try:
                    lstat_tm = os.lstat(truematch)
                except:
                    print 'MISSING - truematch go bye-bye:', maybematch
                    continue
        except:
            print 'MISSING - file go bye-bye:', maybematch
            continue

        # A duplicate file exists not just in the database, but on the disk
        if truematch and os.lstat(truematch): # Check each time that it is still there
            if truematch == maybematch:
                raise Exception('ERROR', 'The database has the same file twice')
                # TODO use tempfile to precopy any file, which alieviatees this case
            if lstat_tm.st_ino == lstat_mm.st_ino and lstat_tm.st_dev == lstat_mm.st_dev:
                print '\tSKIP - already linked', maybematch
                continue
            if md5match != md5sum(maybematch):
                print '\tSKIP - mismatch on checksum:', maybematch
                continue
            if 'hard' == options.link_type:
              os.unlink(os.path.join(row[0],row[1]))
              os.link(truematch, os.path.join(row[0],row[1]))
            elif 'soft' == options.link_type:
              os.unlink(os.path.join(row[0],row[1]))
              os.symlink(os.path.realpath(truematch), os.path.join(row[0],row[1]))
            elif 'delete' == options.link_type:
              os.unlink(os.path.join(row[0],row[1]))
            else:
              raise Exception('Yipes','Somehow "link_type" is not set correctly!')
              
            print '\t', os.path.join(row[0],row[1])
        else:
            if md5match != md5sum(maybematch):
                continue
            truematch = maybematch
            print md5match, os.path.join(row[0],row[1])

"""
# 'Guaranteed' either dup_name or same_hash
if row[0] == filepath:
dup_name = True
if md5sum(filepath) == row[1]:
#print '''This file is this file... imagine that!'''
continue
print '''This file''', filepath, '''has changed: updating md5 in db...'''
c.execute('''UPDATE Files SET md5sum = ? WHERE filepath = ?''',
(md5hash, filepath))
else: # not dup_name, must be same hash according to above query
#print '''md5 match, path mismatch: double-check md5, link.'''
#print '''Not Implemented: check last_update for > 1hour'''
if nfo.st_size < (1 * MB): # TODO disqualify before expensive hashing, don't store in db
#print '''Too small to be worthy of hard linkage or storage''' # TODO Check new file size and delete from db
dup_name = True
continue
target_a = md5sum(row[0])
target_b = md5sum(filepath)
if not target_a == target_b:
print '''Files have changed too recently. TODO update checksum'''
continue
print 'rm', row[0], '; ln "', filepath, '" "', row[0]
os.unlink(row[0])
os.link(filepath, row[0])
if not dup_name:
data = (md5hash, filepath, nfo.st_ctime, nfo.st_mtime, nfo.st_atime, nfo.st_size, nfo.st_uid, nfo.st_gid)
c.execute('''INSERT INTO	Files(md5sum,	filepath,	ctime,	mtime,	atime,	size,	uid,	gid,	last_updated)
Values(?,		?,			?,		?,		?,		?,		?,		?,		DATETIME('NOW'))
''', data)
db.commit()
"""				
#for row in c.execute('''SELECT * FROM Files'''):
#for row in c
#	print row
db.close()
'''
for name in dirs:
dirnames = os.path.join(root,name)
for dirname in dirnames:
nfo = os.lstat(dirname)
print "%s\t%s\t%s\t%s\t%s\t%s\t%s" % (nfo[0].st_ctime,nfo[0].st_mtime,nfo[0].st_atime,nfo[0].st_size,nfo[0].st_uid,nfo[0].st_gid,dir
'''
