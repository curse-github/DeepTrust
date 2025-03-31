const oneTimeDuration = 30 * 1000; // 30 seconds
const totpWindow = 1;
const hotpCodeLength = 6;

function generateHotpKey(length) {
    if (length === void 0) { length = 32; }
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < length; i++)
        secret += alphabet[Math.floor(Math.random() * 32)];
    return secret;
}
// #region TOTP
function checkTotp(key, value) {
    if (value.length != hotpCodeLength)
        return false;
    let counter = getCounter();
    for (let i = -totpWindow; i <= totpWindow; i++)
        if (getHOTP(key, counter + i) == value)
            return true;
    return false;
}
// https://en.wikipedia.org/wiki/Time-based_one-time_password
function getCounter() {
    return Math.floor((new Date()).getTime() / oneTimeDuration);
}
function getTOTP(key) {
    return getHOTP(key, getCounter());
}
// #endregion TOTP
// #region HOTP
// https://en.wikipedia.org/wiki/HMAC-based_one-time_password#Definition
function getHOTP(key, counter) {
    let hmacHash = hmac(base32ToBytes(key), numToBytes(counter));
    let offset = hmacHash[hmacHash.length - 1] & 0xF; // Last nibble determines offset
    let binary = 0;
    for (let i = 0; i < 4; i++)
        binary |= (hmacHash[offset + i] & ((i == 0) ? 0x7F : 0xFF)) << ((3 - i) * 8);
    return (binary % Math.pow(10, hotpCodeLength)).toString().padStart(hotpCodeLength, "0"); // Return a n-digit HOTP
}
function base32ToBytes(str) {
    let binary = "";
    for (let i = 0; i < str.length; i++)
        binary += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(str[i]).toString(2).padStart(5, "0");
    let tmpLen = binary.length;
    binary = binary.padEnd(Math.ceil(tmpLen / 8) * 8, "0");
    let bytes = [];
    for (let i = 0; i < binary.length; i += 8)
        bytes.push(parseInt(binary.substring(i, i + 8), 2));
    return bytes;
}
function numToBytes(num) {
    let bytes = new Array(8).fill(0);
    for (let i = 7; i >= 0; i--) {
        bytes[i] = num & 255;
        num >>= 8;
    }
    return bytes;
}
// #endregion HOTP
// #region HMAC
// https://en.wikipedia.org/wiki/HMAC
function hmac(key, message) {
    if (typeof key == "string")
        key = strToBytes(key);
    if (typeof message == "string")
        message = strToBytes(message);
    let block_sized_key = computeBlockSizedKey(key);
    let o_key_pad = [];
    let i_key_pad = [];
    for (let i = 0; i < 64; i++) {
        o_key_pad[i] = block_sized_key[i] ^ 0x5c;
        i_key_pad[i] = block_sized_key[i] ^ 0x36;
    }
    return sha1Bytes(o_key_pad.concat(sha1Bytes(i_key_pad.concat(message))));
}
function computeBlockSizedKey(key) {
    if (key.length > 64)
        return sha1Bytes(key);
    else if (key.length < 64)
        return padEnd(key, 64); // Pad key with zeros to make it blockSize bytes long
    return key;
}
function padEnd(input, padTo) {
    let output = input.slice();
    for (let i = input.length; i < padTo; i++)
        output[i] = 0;
    return output;
}
// #endregion HMAC
// #region sha
function sha256(str) {
    return bytesToHex(sha256Bytes(strToBytes(str)));
}
function sha1(str) {
    return bytesToHex(sha1Bytes(strToBytes(str)));
}
// actual hash algorithms
function sha1Bytes(bytes) {
    let i, j;
    let bitLength = bytes.length * 8;
    bytes = bytes.slice();
    bytes.push(0x80);
    while (((bytes.length % 64) - 56) != 0)
        bytes.push(0);
    let words = bytesToWords(bytes);
    words.push(0);
    words.push(bitLength);
    let hash = [ 0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0 ];
    for (j = 0; j < words.length;) {
        let w = words.slice(j, j += 16);
        for (i = 16; i < 80; i++)
            w[i] = leftRotate(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        let wHash = hash.slice();
        for (i = 0; i < 80; i++) {
            let f = 0;
            let k = 0;
            const b = wHash[1], c = wHash[2], d = wHash[3];
            if (i < 20) {
                f = (b & c) | ((~b) & d);
                k = 0x5A827999;
            } else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ED9EBA1;
            } else if (i < 60) {
                f = (b & c) ^ (b & d) ^ (c & d);
                k = 0x8F1BBCDC;
            } else {
                f = b ^ c ^ d;
                k = 0xCA62C1D6;
            }
            wHash = [ (leftRotate(wHash[0], 5) + f + wHash[4] + k + w[i]) | 0, wHash[0], leftRotate(b, 30), c, d ];
        }
        for (i = 0; i < 5; i++)
            hash[i] = (hash[i] + wHash[i]) | 0;
    }
    return wordsToBytes(hash);
}
// constants used in sha256
var h = [];
var k = [];
var maxWord = Math.pow(2, 32);
var primeCounter = 0;
var isComposite = {};
for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate)
            isComposite[i] = true;
        h[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
}
// actual hash algorithm
function sha256Bytes(bytes) {
    var i, j;
    var bitLength = bytes.length * 8;
    var hash = h.slice(0, 8);
    bytes = bytes.slice();
    bytes.push(0x80);
    while (((bytes.length % 64) - 56) != 0)
        bytes.push(0);
    var words = bytesToWords(bytes);
    words.push(0);
    words.push(bitLength);
    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        for (var i_1 = 16; i_1 < 64; i_1++) {
            var w15 = w[i_1 - 15];
            var s0 = (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3));
            var w2 = w[i_1 - 2];
            var s1 = (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10));
            w.push(w[i_1 - 16] + s0 + w[i_1 - 7] + s1) | 0;
        }
        var wHash = hash.slice();
        for (i = 0; i < 64; i++) {
            var a = wHash[0], b = wHash[1], c = wHash[2], e = wHash[4];
            var S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
            var S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
            var ch = ((e & wHash[5]) ^ ((~e) & wHash[6]));
            var maj = ((a & b) ^ (a & c) ^ (b & c));
            var temp1 = wHash[7] + S1 + ch + k[i] + w[i];
            wHash = [ (temp1 + (S0 + maj)) | 0, wHash[0], wHash[1], wHash[2], (wHash[3] + temp1), wHash[4], wHash[5], wHash[6] ];
        }
        for (i = 0; i < 8; i++)
            hash[i] = (hash[i] + wHash[i]) | 0;
    }
    return wordsToBytes(hash);
}
// helpers
function leftRotate(value, amount) {
    return (value >>> (32 - amount)) | (value << amount);
}
function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
}
function strToBytes(str) {
    let output = [];
    for (let i = 0; i < str.length; i++)
        output[i] = str.charCodeAt(i) & 255;
    return output;
}
function bytesToHex(bytes) {
    return bytes.map(function(el) { return el.toString(16).padStart(2, "0"); }).join("");
}
function bytesToWords(bytes) {
    let words = [];
    for (let i = 0; i < bytes.length; i++) {
        words[i >> 2] |= bytes[i] << (((3 - i) % 4) * 8);
    }
    return words;
}
function wordsToBytes(words) {
    let bytes = [];
    for (let i = 0; i < words.length; i++)
        for (let j = 3; j + 1; j--)
            bytes.push((words[i] >> (j * 8)) & 255);
    return bytes;
}
// #endregion sha
