#!/usr/bin/env python
# TODO
# create common base class for mp4 / mp3

class MP3Checksum:

  def __init__(self, filepath):
    self._filepath = filepath
    self._read_id3_data()
  #end

  def _read_id3_data(self):
    """Calculate MD5 for an MP3 excluding ID3v1 and ID3v2 tags if
    present. See www.id3.org for tag format specifications.
    this function mostly written by Graham Poulter & GPL'd
    (search for mp3md5.py, which also records the md5 info as a uid)"""
    import os
    import sys
    import struct
    f = open(self._filepath, "rb")
    # Detect ID3v1 tag if present
    finish = os.stat(self._filepath).st_size;
    f.seek(-128, 2)
    if f.read(3) == "TAG":
        finish -= 128
    # ID3 at the start marks ID3v2 tag (0-2)
    f.seek(0)
    self._mdat_at = f.tell()
    if "ID3" == f.read(3):
        # Bytes w major/minor version (3-4)
        version = f.read(2)
        # Flags byte (5)
        flags = struct.unpack("B", f.read(1))[0]
        # Flat bit 4 means footer is present (10 bytes)
        footer = flags & (1<<4)
        # Size of tag body synchsafe integer (6-9)
        bs = struct.unpack("BBBB", f.read(4))
        bodysize = (bs[0]<<21) + (bs[1]<<14) + (bs[2]<<7) + bs[3]
        # Seek to end of ID3v2 tag
        f.seek(bodysize, 1)
        if footer:
            f.seek(10, 1)
        #end
        # Start of rest of the file
        self._mdat_at = f.tell()
    #end
    self._mdat_size = finish - self._mdat_at
    # Calculate MD5 using stuff between tags
  #end

  def mdat_start(self):
    return self._mdat_at
  #end

  def size(self):
    return self._mdat_size
  #end

  def sha256_digest(self):
    import hashlib

    f = open(self._filepath, 'rb')
    f.seek(self._mdat_at)
    hash = hashlib.sha256(f.read(self._mdat_size)).hexdigest()
    f.close()
    return hash
  #end

  def hexdigest(self):
    return self.md5_digest()

  def md5_digest(self):
    import hashlib

    f = open(self._filepath, 'rb')
    f.seek(self._mdat_at)
    hash = hashlib.md5(f.read(self._mdat_size)).hexdigest()
    f.close()
    return hash
  #end
#end

if __name__ == "__main__":
  import sys
  mp3sum = MP3Checksum(sys.argv[1])
  print "md5: " + mp3sum.md5_digest()
  print "sha256: " + mp3sum.sha256_digest()
  print "size: " + str(mp3sum.size() / (1000.0 * 1000))
  print "data_start: " + str(mp3sum.mdat_start()) + " bytes"
