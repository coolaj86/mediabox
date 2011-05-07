#!/usr/bin/env python
# TODO
# be OS independant (search for AtomicParsley)
# port AP to python
from subprocess import Popen, PIPE
class MP4Checksum:
  def __init__(self, filepath):
    self._has_ap()
    self._filepath = filepath
    self._read_ap_data()
  #end

  def _has_ap(self):
    has_ap = Popen(["which", "AtomicParsley"], stdout=PIPE).communicate()[0]
    if not has_ap:
      no_ap = """\n\n\nYou do not have AtomicParsley installed.\nPlease install it to use mp4checksum support:
      'sudo apt-get install atomicparsley' # Ubuntu"
      'sudo yum -i atomicparsley' # Fedora"\n\n"""
      raise Exception(no_ap)
    #end
  #end

  def _read_ap_data(self):
    import re
    output = Popen(["AtomicParsley", self._filepath, "-T"], stdout=PIPE).communicate()[0]
    if not output:
      raise Exception("AtomicParsley doesn't believe this to be a valid mp4 file")
    #end
    regex = r"Atom mdat @ (.*) of size: (.*), ends @ (.*)"
    match = re.search(regex, output)
    # account for slightly incorrect sizes given by AP
    self._mdat_at = int(match.group(1)) + 4
    # Other tags may come after the mdat tag, usually only if the tag size became
    # is larger than the original free padding (i.e. a large image was added)
    # I'm not sure that AP is accurate, since it is off by 4 bytes with the
    # mdat tag. However, I assume that if it is off, it isn't off than by more
    # than the 4 bytes it was previously off by.
    self._mdat_size = int(match.group(2)) - 8
  #end

  def mdat_start(self):
    return self._mdat_at + 4
  #end

  def size(self):
    return self._mdat_size - 8
  #end

  def hexdigest(self):
    return self.md5_digest()

  def md5_digest(self):
    import hashlib

    f = open(self._filepath, 'rb')
    f.seek(self._mdat_at)
    mdat = f.read(4)
    if 'mdat' != mdat:
      raise Exception('mdat tag not where expected!')
    #end

    hash = hashlib.md5(f.read(self._mdat_size)).hexdigest()
    f.close()
    return hash
  #end

  def sha256_digest(self):
    import hashlib

    f = open(self._filepath, 'rb')
    f.seek(self._mdat_at)
    mdat = f.read(4)
    if 'mdat' != mdat:
      raise Exception('mdat tag not where expected!')
    #end

    hash = hashlib.sha256(f.read(self._mdat_size)).hexdigest()
    f.close()
    return hash
  #end
#end

if __name__ == "__main__":
  import sys
  mp4sum = MP4Checksum(sys.argv[1])
  print "md5: " + mp4sum.md5_digest()
  print "sha256: " + mp4sum.sha256_digest()
  print "size: " + str(mp4sum.size() / (1000.0 * 1000))
  print "data_start: " + str(mp4sum.mdat_start()) + " bytes"
