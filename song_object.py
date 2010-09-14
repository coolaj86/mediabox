#!/usr/bin/env python

# TODO
# consider how to handle The, A, An, etc
# is Ampache's approach the best?
#
# Playlist is of type blacklist?
# How to quickly determine blacklistness of songs
class Song():
  def __init__():
    # unique key track, title, artist, album
    self.track
    self.disk # if part of a set
    self.lyrics # this may be duplicated, but that's okay
    self.title
    self.version # is explicit, edited, re-release
    self.artist #fk
    self.album #fk
    self.genre
    self.language
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
