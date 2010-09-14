#!/bin/bash

# Picdir v0.9 rc1

# Copyleft 2005 Alvin A ONeal Jr - This software is OpenSource
# 
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

# Guaranteed to be my personal best!
# ...not guaranteed to work...


# What will this do?
# Search for all JPEG type files within a directory containing EXIF data
# Use the timestamp in the EXIF data to relocate and rename the file
# Using checksums, determine and remove duplicate files
# Uniquely name files which have the same timestamp but different data

# needs BASH FIND GREP CUT FILE JHEAD MD5SUM MV

# NOTE TO SELF
# Instead of moving files and leaving the old directory structure to crap
# this should  move the files and put links in the stead of the files
# Fix the trailing '/' issue

if [ ! -n "${1}" ]; then
	echo "USAGE: ${0} /my/pictures/unsorted/ [/my/pictures/sorted/]"
	echo "The trailing '/' is kinda important... btw..."
	exit
fi
if [ ! -n "${2}" ]; then
	MOVETO="${HOME}/Pictures/tmp/"
else
	MOVETO="${2}/"
fi
# Call self recursively
if [ ! "${3}" = "RECUR" ]; then
	echo "Finding and organizing all pictures with EXIF timestamps..."
	find "${1}" -type f -exec "${0}" {} "${2}" "RECUR" \;
	echo "Done!"
else
	FILE="${1}"
	HAS_EXIF=$(file "${FILE}" | grep 'JPEG' | grep 'EXIF') # Is it better this way?
	if [ -n "${HAS_EXIF}" ]; then
		TIMESTAMP=`jhead "${FILE}" 2>/dev/null | grep 'Date/Time' | cut -d':' -f2-6` # Or this way?
		if [ ! -n "${TIMESTAMP}" ]; then
			# '${FILE}' has EXIF but no timestamp!"
			exit
		fi
		# Deciding path
		DATE=`echo ${TIMESTAMP} | cut -d' ' -f1`
		YEAR=`echo ${DATE} | cut -d':' -f1`
		MONTH=`echo ${DATE} | cut -d':' -f2`
		DAY=`echo ${DATE} | cut -d':' -f3`
		MOVETO="${MOVETO}${YEAR}/${MONTH}/" #Directory Structure
		mkdir -p ${MOVETO}
		# Deciding filename
		TIME=`echo ${TIMESTAMP} | cut -d' ' -f2`
		HOUR=`echo ${TIME} | cut -d':' -f1`
		MINUTE=`echo ${TIME} | cut -d':' -f2`
		SECOND=`echo ${TIME} | cut -d':' -f3`
		NEWFILE="${YEAR}${MONTH}${DAY}${HOUR}${MINUTE}${SECOND}.jpg"
		# Complete path
		ABSPATH="${MOVETO}${NEWFILE}"
		# Complete path
		
		if [ -f "${ABSPATH}" ]; then
		# 1) File exists with that name"
			
			if [ ! "${ABSPATH}" = "${FILE}" ]; then
			# 2) The file isn't itself ... yeah ... that makes sense"
			
				SUM0=`/usr/bin/md5sum "${FILE}" | cut -d' ' -f1`
				SUM1=`/usr/bin/md5sum "${ABSPATH}" | cut -d' ' -f1`
				if [ ! "${SUM0}" = "${SUM1}" ]; then
				# 3) It isn't a duplicate of the same picture"
				
					i=0
					ABSPATH_1="d${i}-${ABSPATH}"
					ABSPATH_1="${MOVETO}d${i}-${YEAR}${MONTH}${DAY}${HOUR}${MINUTE}${SECOND}.jpg"
					until [ ! -f ${ABSPATH_1} ]; do
						(( i++ ))
						ABSPATH_1="${MOVETO}d${i}-${YEAR}${MONTH}${DAY}${HOUR}${MINUTE}${SECOND}.jpg"
					done
	
					# Giving it a unique name 'd#-FILE'"
					
					echo "Appending 'd${i}-' to ${ABSPATH}: file exists."
					ABSPATH="${ABSPATH_1}"
				
				# 3) non-duplicate of same name was renamed"
				else
					echo "Checksum match: Duplicate file overwritten"
				fi
	
			fi
			# 2) if the file is itself, pass-along, mv will handle it"
		
		fi
		# 1) All that settled, should be safe to move the file
		if [ ! "${FILE}" = "${ABSPATH}" ]; then
			echo "Moving ${FILE} to ${ABSPATH}"
			mv "${FILE}" ${ABSPATH}
		fi
	fi
	#  0) If that even was a picture, it certainly didn't have EXIF data."
fi

# Cleanup, if possible. Fail without error if not.
rmdir -p ${1} >&/dev/null

# I tested this baby on my precious photos and it worked for me.
# Sorted about 700 photos from about 34,500 files total in a few minutes. :-D
