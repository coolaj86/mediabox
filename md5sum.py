import hashlib

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

