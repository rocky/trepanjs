# Copyright 2008 the V8 project authors. All rights reserved.
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
#       copyright notice, this list of conditions and the following
#       disclaimer in the documentation and/or other materials provided
#       with the distribution.
#     * Neither the name of Google Inc. nor the names of its
#       contributors may be used to endorse or promote products derived
#       from this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


import platform
import re
import os

# Rocky's addition to lookup path
def whence_file(py_script):
    """Do a shell-like path lookup for py_script and return the results.
    If we can't find anything return py_script"""
    if py_script.find(os.sep) != -1:
        # Don't search since this name has path separator components
        return py_script
    for dirname in os.environ['PATH'].split(os.pathsep):
        py_script_try = os.path.join(dirname, py_script)
        if os.path.exists(py_script_try):
            return py_script_try
    # Failure
    return py_script



# Reads a .list file into an array of strings
def ReadLinesFrom(name):
  list = []
  for line in open(name):
    if '#' in line:
      line = line[:line.find('#')]
    line = line.strip()
    if len(line) == 0:
      continue
    list.append(line)
  return list


def GuessOS():
  id = platform.system()
  if id == 'Linux':
    return 'linux'
  elif id == 'Darwin':
    return 'macos'
  elif id.find('CYGWIN') >= 0:
    return 'cygwin'
  elif id == 'Windows' or id == 'Microsoft':
    # On Windows Vista platform.system() can return 'Microsoft' with some
    # versions of Python, see http://bugs.python.org/issue1082
    return 'win32'
  elif id == 'FreeBSD':
    return 'freebsd'
  elif id == 'OpenBSD':
    return 'openbsd'
  elif id == 'SunOS':
    return 'solaris'
  elif id == 'NetBSD':
    return 'netbsd'
  else:
    return None


# This will default to building the 32 bit VM even on machines that are capable
# of running the 64 bit VM.  Use the scons option --arch=x64 to force it to build
# the 64 bit VM.
def GuessArchitecture():
  id = platform.machine()
  id = id.lower()  # Windows 7 capitalizes 'AMD64'.
  if id.startswith('arm'):
    return 'arm'
  elif (not id) or (not re.match('(x|i[3-6])86$', id) is None):
    return 'ia32'
  elif id == 'i86pc':
    return 'ia32'
  elif id == 'x86_64':
    return 'ia32'
  elif id == 'amd64':
    return 'ia32'
  else:
    return None


def GuessWordsize():
  if '64' in platform.machine():
    return '64'
  else:
    return '32'


def IsWindows():
  return GuessOS() == 'win32'
