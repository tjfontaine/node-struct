/*
Copyright 2011 Timothy J Fontaine <tjfontaine@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN

*/

var entries = {
  x: {},
  c: {
    size: 1,
    string: true,
  },
  b: {
    size: 1,
    native: 'Int8',
    endian: false,
  },
  B: {
    size: 1,
    native: 'UInt8',
    endian: false,
  },
  '?': {
    size: 1,
    native: 'UInt8',
    endian: false,
  },
  h: {
    size: 2,
    native: 'Int16',
  },
  H: {
    size: 2,
    native: 'UInt16',
  },
  i: {
    size: 4,
    native: 'Int32',
  },
  I: {
    size: 4,
    native: 'UInt32',
  },
  l: {
    size: 4,
    native: 'Int32',
  },
  L: {
    size: 4,
    native: 'UInt32',
  },
  /* TODO XXX FIXME
  q: {
    size: 8,
    native: 'Int32',
  },
  Q: {
    size: 8,
    native: 'UInt32',
  },
  */
  f: {
    size: 4,
    native: 'Float',
  },
  d: {
    size: 8,
    native: 'Double',
  },
  s: {
    size: 1,
    string: true,
  },
};

var ENDIAN = {
  '@': false,
  '=': false,
  '<': 'LE',
  '>': 'BE',
  '!': 'BE',
};

var format_method = function(entry, prefix, endian) {
  var meth = prefix + entry.native;
  if (entry.endian !== false) {
    if (endian !== undefined && endian !== false) {
      meth += endian;
    } else {
      meth += 'LE';
    }
  }
  return meth;
};

var fmt_to_list = function(fmt, prefix) {
  var elm = fmt.split('');
  elm.reverse();

  var c = elm.pop();
  var endian = ENDIAN[c];

  if (endian !== undefined) {
    c = elm.pop();
  }

  var count = '';
  var result = [];

  while(c) {
    if (isFinite(c)) {
      count += c;
      c = elm.pop();
      continue;
    } else {
      if (entries[c]) {
        var size = parseInt(count, 10);
        count = '';

        if (isNaN(size)) {
          size = 1;
        }

        var entry = entries[c];

        result.push({
          meth: format_method(entry, prefix, endian),
          size: size,
          entry: entry,
        });

        c = elm.pop();
      } else {
        throw new Error("Not a valid format character: " + c);
      }
    }
  }

  return result;
};

var unpack = function(fmt, input, encoding, pos) {
  var calls, result = [];

  if (!Buffer.isBuffer(input)) {
    throw new Error("Input not a buffer object");
  }

  if (!encoding) {
    encoding = 'ascii';
  }

  calls = fmt_to_list(fmt, 'read');

  if (pos === undefined) {
    pos = 0;
  }

  calls.forEach(function(c) {
    var i;
    if (c.entry.string) {
      result.push(input.toString(encoding, pos, c.size));
      pos += c.size;
    } else {
      for (i = 0; i < c.size; i++) {
        result.push(Buffer.prototype[c.meth].call(input, pos));
        pos += c.entry.size;
      }
    }
  });

  return result;
};
exports.unpack = unpack;

var calc_size = function(calls) {
  var size = 0;
  calls.forEach(function(c) {
    size += c.size * c.entry.size;
  });
  return size;
};

var calcsize = function(fmt) {
  var calls = fmt_to_list(fmt, '');
  return calc_size(calls);
};
exports.calcsize = calcsize;

var pack = function(fmt, buff, buf_pos) {
  var calls = fmt_to_list(fmt, 'write');
  var size = calc_size(calls);
  var result, values, position;

  if (buff instanceof Buffer) {
    if (size + buf_pos > buff.length) {
      throw new Error("Buffer not large enough for packing");
    }
    result = buff;
    position = buf_pos;
    values = Array.prototype.slice.call(arguments, 3);
  } else {
    result = new Buffer(size);
    position = 0;
    values = Array.prototype.slice.call(arguments, 1);
  }

  var expected = 0;
  calls.forEach(function(c) {
    expected += c.size;
  });

  if (expected !== values.length) {
    throw new Error("Argument mismatch, Expected: " + expected + " Received: " + values.length);
  }

  var pos = 0;
  var arg_pos = 0;
  var i;

  for (i=0; i<calls.length; i++) {
    var call = calls[i];
    var arg  = values[arg_pos];
    if (call.entry.string) {
      result.write(arg, pos + position, arg.length);
      arg_pos += 1;
      pos += call.size * call.entry.size;
    } else {
      var j;
      for (j=0; j<call.size; j++) {
        Buffer.prototype[call.meth].call(result, arg, pos + position);
        pos += call.entry.size;
        arg_pos += 1;
      }
    }
  }

  return result;
};
exports.pack = pack;
