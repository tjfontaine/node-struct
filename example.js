var util = require('util')

var struct = require('./struct')

var r = struct.pack('hhl', 1, 2, 3)
console.log(util.inspect(r))

r = struct.unpack.apply(null, ['hhl', r])
console.log(util.inspect(r))

var record = new Buffer("raymond   \x32\x12\x08\x01\x08")
r = struct.unpack('<10sHHb', record)
console.log(util.inspect(r))

var b = new Buffer(15)
b.fill(0)
struct.pack('hhl', b, 3, 1, 2, 3);
console.log(util.inspect(b));
