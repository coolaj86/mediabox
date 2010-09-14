#!/usr/bin/env python
import os

MB_HOME = '/mnt/data/MediaBox/'
MB_ANYS = 'Media'
MB_PICS = 'Pictures'
MB_AUDS = 'Audios'
# TODO an 'Experience' may have many of any media type
for path in [
  os.path.join(MB_HOME, MB_ANYS), 
  os.path.join(MB_HOME, MB_PICS),
  os.path.join(MB_HOME, MB_AUDS),
  ]:
  if not os.path.exists(os.path.join(path)):
    os.makedirs(path)

#############
## Tables  ##
#############

# Create tables which may or may not map 1:1 with classes
from sqlalchemy import Table, Column, Integer, String, Unicode, Date, UnicodeText, MetaData, ForeignKey
from sqlalchemy import ForeignKey
metadata = MetaData()

'''
Media is actually metadata + datastream (i.e. a file or stream)
However, files and streams often embed metadata hence the need
for two digests. One identifies both the metadata and the stream
the other identifies just the stream. A third should be created
to represent the lone metadata.
'''
media_table = Table('media', metadata,
  Column('id', Integer, primary_key=True),
  Column('sha256_digest', String(64)),
  Column('stream_sha256_digest', String(64)),
  # Cheap polymorphism
  Column('picture_id', Integer, ForeignKey('pictures.id')),
  #Column('song_id', Integer, ForeignKey('songs.id')),
  # TODO make a true polymorphic asociation
  Column('medium_id', Integer),
  Column('medium_type', String(20)), #TODO make enum?
  Column('name', Unicode(255)),
  Column('ext', Unicode(255)),
  Column('path', UnicodeText(1024)),
  Column('uid', Integer),
  Column('gid', Integer),
  Column('ctime', Date),
  Column('mtime', Date),
  Column('atime', Date),
  Column('size', Integer),
  Column('original_path', UnicodeText(1024)),
)

pictures_table = Table('pictures', metadata,
  Column('id', Integer, primary_key=True),
  # All physical media versions should attach to this uuid
  Column('uuid', String(32)),
  Column('title', Unicode(255)),
  Column('description', UnicodeText(1024)),
  Column('original_date', Date),
  Column('date', Date),
)

tags_table = Table('tags', metadata,
  Column('id', Integer, primary_key=True),
  Column('tag', Unicode(255), unique=True, nullable=False),
  # Allows only alphanumeric, strips all else
  Column('search_tag', Unicode(255), nullable=False),
  # TODO make a true polymorphic asociation?
  Column('medium_type', String(20)), #TODO make enum?
)


pictures_tags_table = Table('pictures_tags', metadata,
  Column('tag_id', Integer, ForeignKey('tags.id')),
  # How often a user searched clicked on this tag when searching
  Column('click_count', Integer),
  Column('picture_id', Integer, ForeignKey('pictures.id')),
  # TODO make a true polymorphic asociation?
  Column('medium_id', Integer),
  Column('medium_type', String(20)), #TODO make enum?
)



#############
## Classes ##
#############
'''
I want versioning support. How can I watermark the files?

To support versioning the uuid needs to be embedded into the
original file before any linking or copying or moving is done.

If there's a different sha256 then it's a different version
of the file. it could have the same uuid, but if it has the
same sha256 and the same size and content_type then it is the
same file. That's a moderately safe assumption, right?
'''

import uuid
import shutil
# Create classes which may or may not map 1:1 with tables
class Medium(object):
  """A stream containing data and metadata, such as a file or url stream."""
  constructors = {}
  def __init__(self, path, link='hard'):
    from datetime import datetime
    s = os.stat(path)
    self.uid = s.st_uid
    self.gid = s.st_gid
    self.original_path = unicode(path) # relative
    self.path, filename = os.path.split(path) 
    #self.path = unicode(self.path)
    self.path = unicode(os.path.join((MB_HOME, MB_ANYS)))
    self.name, self.ext = os.path.splitext(filename)
    self.name = unicode(self.name)
    self.ext = unicode(self.ext).lower()
#    self.content_type = content_type()
#    self.scheme # http, ftp, file, mms
#    self.repository # domain / abspath to base folder
    self.size = s.st_size
    self.ctime = datetime.fromtimestamp(s.st_ctime)
    self.mtime = datetime.fromtimestamp(s.st_mtime)
    self.atime = datetime.fromtimestamp(s.st_atime)
    self.sha256_digest = self.sha256_hexdigest(path)
    if not os.path.exists(self.current_path()):
      if 'hard' == link:
          os.link(path, self.current_path())
      elif 'soft' == link:
        shutil.move(path, self.current_path())
        os.symlink(self.current_path(), path)
      elif 'move' == link:
        shutil.move(path, self.current_path())
      else:
        raise Exception(''''link' was set to '%' which is not a valid option. 'hard', 'soft', and 'move' are valid.''' % link)

  def timestamp(self): 
    return min(self.ctime,self.mtime,self.atime)

  def current_filename(self):
    return ''.join((self.sha256_digest,  self.ext))

  def current_path(self):
    return os.path.join(MB_HOME, MB_ANYS, self.current_filename())
 
  def content_type(self, path):
    import magic
    ms = magic.open(magic.MAGIC_NONE)
    ms.load()
    ms.close()
    return  ms.file(path)
  
  def hexdigest(self, path, algo = 'sha256'):
    if algo != 'sha256':
      raise Exception("sha256 is the only supported checksum at this time")
    self.sha256_hexdigest(path)

  def sha256_hexdigest(self, path):
    print "WARN: Generic file checksum inculding metadata"
    import hashlib
    m = hashlib.sha256()
    f = open(path, 'rb')
    while True:
      if not m.update(f.read(8096)):
        break
    return m.hexdigest()

  def create_stream_sha256_digest(self, path): pass
  def move(self, path): pass
  def path(self): pass

 
  def __repr__(self):
    return "<Medium('%s','%s', '%s')>" % (self.name + self.ext, self.size, self.sha256_digest)


class Audio(object):
  """
  Audio files to be uniquely identified across a user's library.

  MusicDNS PUIDs and MusicBrainz fingerprinting will be used in the future.
  # see http://musicbrainz.org/doc/PicardQt/TagMapping 
  """
  def __init__(self, media_obj):
    # Currently supports only mp3 with id3 and aac with m4a
    from mutagen.mp3 import MP3
    from mutagen.easyid3 import EasyID3
    from mutagen.mp4 import MP4
    from mutage.easymp4 import EasyMP4
   
    mdata = None
    if media_obj.ext == 'mp3':
      mdata = EasyID3(media_obj.current_path())
    elif media_obj.ext == 'm4a':
      mdata = EasyMP4(media_obj.current_path())
    else:
      raise Exception("Unhandled Audio type", media_obj.ext);

    """Objective Data specific to this song"""
    # unique key track, title, artist, album
    self.track = mdata.get("tracknumber",[None])[0]
    self.disk = mdata.get("disknumber",[None])[0] # if part of a set
    self.title = mdata.get("title",[None])[0]
    self.artist = mdata.get("artist",[None])[0] #fk
    self.album = mdata.get("album",[None])[0] #fk
    self.version # is explicit, edited, re-release, dance mix
    self.lyrics # this may be duplicated, but that's okay
    self.genre
    self.language
    self.bpm
    self.length # in seconds

    """Aggregate objective and subjective user data"""
    self.total_play_count
    self.total_skip_count
    self.total_thumbs_up
    self.total_thumbs_down
    self.total_user_comments # youtube-style comments

    """Data specific to this user"""
    self.tags
    self.thumbs_up
    #self.thumbs_down
    #TODO decouple songs from streams
    #self.streams
    self.blacklists # Christmas, Hymns, Foul-language
    self.playlists # Christmas, Hymns, Dance
    self.last_played
    self.play_count
    self.skip_count
    self.user_comments # youtube-style comments

  def __repr__(self):
    return "<Audio('%s','%s', '%s')>" % (self.name + self.ext, self.size, self.sha256_digest)
Medium.constructors["mp3"] = Audio
Medium.constructors["m4a"] = Audio

class Picture(object):
  """
  A Picture, photo, drawing, scanned non-document, graphic

  Current support is for JPEGs only

  I will want iPhoto, Picasa, and Windows whatever support for extended metadata
  """
  def __init__(self, media_obj):
    import os
    import pyexiv2
    from datetime import datetime
    self.uuid = uuid.uuid4().hex

    image = pyexiv2.Image(media_obj.current_path())
    image.readMetadata()
    original_date = datetime.fromtimestamp(1)
    date = media_obj.timestamp()
    date_class = date.__class__
    if 'Exif.Image.DateTime' in image.exifKeys():
      original_date = image['Exif.Image.DateTime']
    elif 'Iptc.Application2.DateCreated' in image.iptcKeys():
      original_date = image['Iptc.Application2.DateCreated']
    else:
      for key in image.exifKeys():
        if key.lower().find('datetime'):
          original_date = image[key]
          break
      for key in image.iptcKeys():
        if key.lower().find('datecreated'):
          original_date = image[key]
          break
    if original_date.__class__ is not date_class:
      original_date = datetime.fromtimestamp(1)
    else:
      date = original_date
      
    self.title = unicode(media_obj.name)
    self.original_date = original_date
    self.date = date
    print 'photo times: '
    print '\t', self.date, self.original_date
    # TODO list all tags in linear sequence as text

    self.create_stream_sha256_digest(media_obj)
    self.move(media_obj)

  def create_stream_sha256_digest(self, media_obj):
    # TODO figure out how to checksum jpegs
    media_obj.stream_sha256_digest = media_obj.sha256_digest

  def path(self):
    rel_path = os.path.join(
      self.date.strftime('%Y'), 
      self.date.strftime('%m'), 
      self.date.strftime('%d'),
      self.date.strftime('%H%M%S'),
    )
    abs_path = os.path.join(MB_HOME, MB_PICS, rel_path)
    if not os.path.exists(abs_path):
      os.makedirs(abs_path)
    return rel_path

  def move(self, media_obj):
    rel_path = os.path.join(self.path(), media_obj.current_filename())
    media_path = media_obj.current_path()
    link_path = os.path.join(MB_HOME, MB_PICS, rel_path)
    print rel_path
    print media_path
    print link_path
    if not os.path.exists(link_path):
      # TODO how to make relative links?
      os.symlink(media_path, link_path)

  def __repr__(self):
    return "<Picture('%s','%s', '%s')>" % (self.title, self.date, self.sha256_digest)
Medium.constructors["jpeg"] = Picture
Medium.constructors["jpg"] = Picture

class Tag(object):
  """
  A text tag which may describe multiple instances of any medium

  TODO: http://pieceofpy.com/index.php/2008/10/09/tags-with-sqlalchemy/
  """
  def __init__(self, tag, search_tag=None):
    import re
    pattern = re.compile('[\W_]+')
    self.tag = unicode(tag)
    self.search_tag = unicode(pattern.sub('', self.tag).lower())

  def __repr__(self):
    return "<Tag('%s','%s')>" % (self.tag, self.search_tag)



#############
## Mapping ##
#############

# Map tables to classes as necessary
from sqlalchemy.orm import mapper
from sqlalchemy.orm import relation, backref

mapper(Picture, pictures_table, properties={
  'media': relation(Medium, backref=backref('picture')),
  'tags': relation(Tag, secondary=pictures_tags_table, backref=backref('pictures')),
})

mapper(Tag, tags_table)

mapper(Medium, media_table)



#################
## Application ##
#################

# Establish database connection
from sqlalchemy import create_engine
engine = create_engine('sqlite:///' + MB_HOME + 'MediaBoxDatabase.sqlite3')
#, echo=True)

metadata.create_all(engine)


# add the pathnames as tags for existing files
# for now, skip symbolic links
# if the file is a link, store the real path as the path and add the fake path as tags
# if the link is a dir, add the link name as a tag to a file that shares the tags of the real path... or just don't bother
