#!/usr/bin/env python

import os
import sys
import md5sum
import optparse
from sqlalchemy import *
from datetime import datetime

# Put file info in the database
sqlite3_db_location = 'media-box-test'

metadata = MetaData('sqlite:///tmp/' + sqlite3_db_location + '.sqlite')

# http://truefalsemaybe.com/2008/09/sqlalchemy-migrations/
file_table = Table(
    'tf_file', metadata,
    Column('id', Integer, primary_key=True),
#    Column('md5sum_id', Unicode(16),
           unique=True, nullable=False),
    Column('password', Unicode(255), nullable=False),
    Column('display_name', Unicode(255), default=''),
    Column('created', DateTime, default=datetime.now))
            `md5sum` CHAR,
            `path` VARCHAR,
            `filename` VARCHAR,
            `ctime` INTEGER,
            `mtime` INTEGER,
            `atime` INTEGER,
            `size` INTEGER,
            `uid` INTEGER,
            `gid` INTEGER,
            `last_updated` DATE,
            UNIQUE (`path`,`filename`)

parser = optparse.OptionParser()
parser.add_option("-v", 
    "--verbose", 
    dest="verbose", 
    action="store_true", 
    help="Display more information. -v -v -v for most verbose.")
options, args = parser.parse_args()
#print args
#sys.exit()

DB_FILE = '/root/filequery.db'
MB = 1000 * 1000
ENCODING = 'utf-8'

db = sqlite3.connect(DB_FILE)
db.row_factory = sqlite3.Row
#db.text_factory = sqlite3.OptimizedUnicode
#db.text_factory = lambda x: unicode(x, ENCODING, "ignore")
c = db.cursor()

def initdb(c):
    c.execute('''
        CREATE TABLE IF NOT EXISTS Files (
            `id` INTEGER PRIMARY KEY,
            `md5sum` CHAR,
            `path` VARCHAR,
            `filename` VARCHAR,
            `ctime` INTEGER,
            `mtime` INTEGER,
            `atime` INTEGER,
            `size` INTEGER,
            `uid` INTEGER,
            `gid` INTEGER,
            `last_updated` DATE,
            UNIQUE (`path`,`filename`)
        )''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS pathIndex ON Files(`path`)
        ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS filenameIndex ON Files(`filename`)
        ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS md5Index ON Files(`md5sum`)
        ''')
initdb(c)

'''Put all regular files and directories into the database. Period.'''
for a_path in args:
    a_path = os.path.abspath(a_path)
    print '''########## The Path In Question:''', a_path
    for root, dirs, files in os.walk(a_path):
        # All subdirectories and directories will be renamed UTF8!!! TODO make option
        root = unicode(root, ENCODING)
        for dir in dirs:
            try:
                dir = unicode(dir, ENCODING).encode(ENCODING)
            except:
                dir_utf8 = unicode(dir, ENCODING, 'replace').encode(ENCODING, 'replace')
                print 'WARN: moving', os.path.join(root.encode(ENCODING, 'replace'), dir), 'to', dir_utf8
                os.rename(os.path.join(root.encode(ENCODING, 'replace'), dir), os.path.join(root.encode(ENCODING, 'replace'), dir_utf8))
                dir = dir_utf8
            if os.path.islink(dir) or os.path.ismount(dir):
                dirs.remove(dir)
        
        for filename in files:
            fail = False
            filepath = os.path.join(root.encode(ENCODING, 'replace'),filename) # Assuming this is always a normpath
            try:
                nfo = os.lstat(filepath)
            except:
                print >> sys.stderr, 'Failed to lstat %s' % (filepath)
                fail = True
            if True == fail:
                continue

            try:
                filename = unicode(filename, ENCODING).encode(ENCODING)
            except:
                filename_utf8 = unicode(filename, ENCODING, 'replace').encode(ENCODING, 'replace')
                print 'WARN: moving', os.path.join(root.encode(ENCODING, 'replace'), filename), 'to ##', filename_utf8, '##'
                os.rename(os.path.join(root.encode(ENCODING, 'replace'), filename), os.path.join(root.encode(ENCODING,'replace'), filename_utf8))
                filename = filename_utf8
            filepath = os.path.join(root.encode(ENCODING, 'replace'),filename)

            if os.path.islink(filepath):
                print >> sys.stderr, "IGNORED - islink:", filepath
                continue
            if not os.path.isfile(filepath):
                #IE /dev/
                print >> sys.stderr, "IGNORED - notfile:", filepath
                continue
            try:
                c.execute('''INSERT INTO Files(md5sum,	path,	filename,	ctime,	mtime,	atime,	size,	uid,	gid,	last_updated)
                                        Values(?,		?,		?,			?,		?,		?,		?,		?,		?,		DATETIME('NOW'))
                    ''', (None, root, unicode(filename, ENCODING), nfo.st_ctime, nfo.st_mtime, nfo.st_atime, nfo.st_size, nfo.st_uid, nfo.st_gid))
                md5hash = unicode(md5sum.md5sum(os.path.abspath(filepath)), ENCODING)
                c.execute('''UPDATE Files SET md5sum = ? WHERE path = ? AND filename = ?''', (md5hash, root, unicode(filename, ENCODING)))
                db.commit()
                print filepath
            except:
                print 'EXISTS:', filepath
            #print "files done"
db.close()
