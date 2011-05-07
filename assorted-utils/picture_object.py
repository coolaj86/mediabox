#!/usr/bin/env python

# http://www.sqlalchemy.org/docs/05/ormtutorial.html
# http://turbogears.org/2.0/docs/main/SQLAlchemy.html
# http://turbogears.org/2.0/docs/main/Wiki20/page4.html

# TODO
# Read and Consider http://www.packtpub.com/article/photoblog-application
# Photo gallery support?

from sqlalchemy import *

artist_table = Table('Artist', metadata,
                     Column('id', Integer, primary_key=True),
                     Column('name', String(), unique=True))

song_table = Table('Song', metadata,
                   Column('id', Integer, primary_key=True),
                   Column('title', String()),
                   Column('position', Integer),
                   Column('album_id', Integer,
                          ForeignKey('Album.id')))

album_table = Table('Album', metadata,
                    Column('id', Integer, primary_key=True),
                    Column('title', String()),
                    Column('release_year', Integer),
                    Column('artist_id', Integer,
                           ForeignKey('Artist.id')))

class Artist(object):
    def __init__(self, name):
        self.id = None
        self.name = name

class Album(object):
    def __init__(self, title, release_year=0):
        self.id = None
        self.title = title
        self.release_year = release_year

class Song(object):
    def __init__(self, title, position=0):
        self.id = None
        self.title = title
        self.position = position

song_mapper = mapper(Song, song_table)
album_mapper = mapper(Album, album_table,
                      properties = {'songs': relation(song_mapper,
                                    cascade="all, delete-orphan")
                                   })
artist_mapper = mapper(Artist, artist_table,
                       properties = {'albums': relation(album_mapper,
                                     cascade="all, delete-orphan")
                                    }) 
engine = create_engine('sqlite:///:memory:', echo=True)
metadata = BoundMetaData(engine)

def create_tables():
    artist_table.create(checkfirst=True)
    album_table.create(checkfirst=True)
    song_table.create(checkfirst=True)

def drop_tables():
    artist_table.drop(checkfirst=False)
    song_table.drop(checkfirst=False)
    album_table.drop(checkfirst=False)


session = create_session(bind_to=engine)

jeff_buckley = Artist(name="Jeff Buckley")

grace = Album(title="Grace", release_year=1994)
dream_brother = Song(title="Dream Brother", position=10)
mojo_pin = Song(title="Mojo Pin", position=1)

lilac_wine = Song(title="Lilac Wine", position=4)
grace.songs.append(dream_brother)
grace.songs.append(mojo_pin)
grace.songs.append(lilac_wine)
jeff_buckley.albums.append(grace)
session.save(jeff_buckley)
session.flush()



session = create_session(bind_to=engine)

# Retrieve an artist by his name
buckley = session.query(Artist).get_by(name='Jeff Buckley')
display_info(buckley)

# Retrieve songs containing the word 'la' from the given artist
songs = session.query(Song).select(and_(artist_table.c.name=="Jeff
                                                              Buckley",
                                                              song_table.c.title.like
                                                              ("%la%")))
for song in songs:
    print " %s" % (song.title,)

# Retrieve all songs but only display some of them
# Note that we specify the order by clause at this level
songs = session.query(Song).select(order_by=[Song.c.position])
print "Found %d songs, let's show only a few of them:" % (len(songs),)
for song in songs[1:-1]:
    print " %s" % (song.title,)

# Retrieve an album by its ID
album = session.query(Album).get_by(id=1)
print album.title

# Delete the album and all its dependencies
# since we have specified cascade delete
session.delete(album)
session.flush()



class Picture():
  def __init__():
    # unique key track, title, artist, album
    self.number #track
    self.description # this may be duplicated, but that's okay
    self.title
    self.rendition # is normal, sepia, b&w
    self.artist #fk
    self.album #fk
    self.genre
    self.bpm
    self.length # in seconds
    self.tags
    self.thumbs_up # handle on a per-user basis?
    self.thumbs_down
    # might have many rips of the same song version
    self.streams
    self.blacklists # Christmas, Hymns, Foul-language
    self.playlists # Christmas, Hymns, Dance
    self.last_played
    self.play_count
    self.user_comments # youtube-style comments
  #end
#end

class Album:
  def __init__():
    self.tracks # array of songs
    self.title # exclude explicit, editide, etc
    self.version # is explicit, edited, re-release
    self.year
    self.genres # special read-only select
    self.image # main image
    self.images # consider Relient-K which has multiple, pickled blob
    self.blacklisted
    # collections
    self.artists
  #end
  def blacklist(self)
    # recursively blacklist songs
  # end 
#end

class Artist:
  def __init__():
    self.name
    self.bio
  #end
#end

class MediaStream(PhysicalMedia):
  def __init__():
    # unique key checksum, size, type
    self.uid # md5 checksum or stream url
    self.type # mime: mp3, m4a
    self.rate # bitrate or quality
    self.mode # cbr, vbr, abr
    self.stream # lazy load # for legal reasons, we may need to call this 'cache'
    self.preview # lazy load
    self.size # ??
    self.added_date
    self.last_rated_date
    self.last_played
    self.play_count
    self.broken # NULL or comment: skips, incomplete, vandalized
    #self.when_changed # not needed because then it would be a different stream 
  #end
  def quality
    # calculate a quality - cd, voice, 
  #end
#end

class PhysicalMedia:
  def __init__():
    self.uuid # md5checksum
    self.uid # owner
    self.gid # group
    self.filename
    self.filepath # relative
    self.content_type
    self.scheme # http, ftp, file, mms
    self.repository # domain / abspath to base folder
    self.size
    self.mtime
    self.atime
    self.ctime
  #end
#end

class Tag:
  # lowercase, puncuation-stripped versions of title, album, artist, etc
  def __init__():
    self.title # has punctuation, spaces, cases, etc
    self.tag
    self.tag_type # playlist, artist, album, etc
  #end
#end

class Playlist:
  def __init__():
    self.title
    self.songs
  #end
#end
