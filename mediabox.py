#!/usr/bin/env python

#
# USAGE: mediabox.py [options] path1 path2 ...
#

'''
FUTURE Goals:
Export ratings an such from iTunes, Rhythmbox, etc.
Create some sort of text (json, yaml) from the db / xml they use
Store the last import
Diff the newest import to get rating info
don't change rating if the new rating is no rating
'''

import os
import sys
import optparse
from models import Medium, Picture, Tag, engine

from sqlalchemy.orm import sessionmaker

ENCODING = 'utf-8'

Session = sessionmaker(bind=engine)
session = Session()

usage = "usage: %prog [options] src_path1 src_path2 ... src_pathN"
parser = optparse.OptionParser(usage=usage)
#parser.add_option("-v", 
#  "--verbose", 
#  dest="verbose", 
#  action="store_true", 
#  help="Display more information. -v -v -v for most verbose.")
#parser.add_option("-d", 
#  "--database", 
#  dest="database", 
#  action="store",
#  type="string",
#  default="/tmp/fq.sqlite3", 
#  help="Select a database in which to store the file data")
parser.add_option("-m", 
  "--min-size", 
  dest="min_size",
  default=(512*1024), 
  action="store", 
  type="int",
  help="The minimum size (in bytes) of the files catalogued (512kb default)") 
options, paths = parser.parse_args()
if 1 > len(paths):
  parser.error("No paths specified and I don't dare assume anything.")

def tags_from_path(path):
  tags = []
  drive, path = os.path.splitdrive(path)
  path, ext = os.path.splitext(path)
  for tag in path.split(os.sep):
    tag = unicode(tag)
    if 0 != len(tag):
      db_tag = session.query(Tag).filter(Tag.tag == tag).first()
      if not db_tag:
        db_tag = Tag(tag)
        session.add(db_tag)
    tags.append(tag)
  return set(tags)

# rsync files to server
# run ctime / mtime based update and versionize on demand (after checksum)
# git-like versioning for metadata tags
"""Move all interesting files to MediaBox leaving hard links behind"""
for path in paths:
  path = os.path.abspath(path)
  for root, dirs, files in os.walk(path):
    root = unicode(root, ENCODING)
    for dir in dirs:
      try:
        dir = unicode(dir, ENCODING).encode(ENCODING)
      except:
        dir_utf8 = unicode(dir, ENCODING, 'replace').encode(ENCODING, 'replace')
        print 'WARN: moving', os.path.join(root.encode(ENCODING, 'replace'), dir), 'to', dir_utf8, '(utf-8 safe)'
        os.rename(os.path.join(root.encode(ENCODING, 'replace'), dir), os.path.join(root.encode(ENCODING, 'replace'), dir_utf8))
        dir = dir_utf8
      # is this redundant? A dir can't be a link can it?
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
      if nfo.st_size < options.min_size:
        continue

      # Needs DRYing
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


      # Find or create the tags
      tags = tags_from_path(filepath)
      tagobjs = session.query(Tag).filter(Tag.tag.in_(tags)).all()

      # Find or create the file
      medium = Medium(filepath)
      from sqlalchemy import and_
      db_file = session.query(Medium).filter(and_(
        Medium.sha256_digest == medium.sha256_digest,
        Medium.path == unicode(medium.path), 
        Medium.name == unicode(medium.name),
        Medium.ext == unicode(medium.ext),
        )).first()
      if not db_file:
        session.add(medium)
        db_file = medium


      # sift through media
      # TODO use magic types for safety
      # db_file IS in the session at this point in my code
      if db_file.ext.lower() in ['.jpg','.jpeg']:
        pic = session.query(Picture).filter(Picture.media.contains(db_file)).first()
        # I don't think this condition is ever true
        if not pic:
          pic = Picture(db_file)
          pic.media = [db_file]
          session.add(pic) # to be safe, in case this auto-add functionality changes in the future
        pic.tags = pic.tags + tagobjs
        #todo also, update the filedate to the oldest (most accurate) date if this picture has several files
      print db_file.name

    # after the entire directory is processed  
    #session.commit()
session.commit()

# better find_or_create
# http://www.sqlalchemy.org/trac/wiki/UsageRecipes/UniqueObject

# import itunes ratings
# http://www.kadavy.net/blog/posts/transfer-itunes-library/#comment-483
# http://addons.songbirdnest.com/addon/9
# http://code.google.com/p/itunes-to-rhythmbox-ratings/downloads/list

"""
if __name__ == '__main__':
    try:
        path = sys.argv[1]
    except IndexError:
        print 'use: %s dir' % sys.argv[0]
    else:
        Monitor(path)
"""
