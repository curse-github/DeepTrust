// #region ./TOTP
// #region ./numberHandling
// general library for handling, converting, and generating numbers in other bases
// by Curse
function padStartToMod(str, mod, char) {
    return char.repeat((mod - (str.length % mod)) % mod) + str;
}
function padEndToMod(str, mod, char) {
    return str + char.repeat((mod - (str.length % mod)) % mod);
}
// base 16(hex) functions
const base16Chars = "0123456789ABCDEF";
function base16ToBytes(str) {
    // convert lowercase to uppercase, if any
    str = str.toUpperCase();
    // convert to a multiple of 8 binary bits
    let binary = "";
    for (let i = 0; i < str.length; i++) {
        const index = base16Chars.indexOf(str[i]);
        if (index == -1)
            throw new Error("Invalid character in base16 string.");
        binary += index.toString(2).padStart(4, "0");
    }
    binary = padStartToMod(binary, 8, "0");
    // convert each chunk of 8 bits to a byte in the array
    let bytes = [];
    for (let i = 0; i < binary.length; i += 8)
        bytes.push(parseInt(binary.substring(i, i + 8), 2));
    return bytes;
}
function bytesToBase16(bytes) {
    let base16 = "";
    // convert each chunk of 8 bits to two base16 characters
    for (let i = 0; i < bytes.length; i++)
        base16 += (bytes[i] & 0xFF).toString(16).padStart(2, "0");
    // if the length is now zero, return a single 0
    if (base16.length == 0)
        return "0";
    return base16.toUpperCase();
}
// base 32 functions
const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32ToBytes(str) {
    // remove "=" from the end of the string
    str = str.replace(/=+$/, "");
    if (str.length == 0)
        throw new Error("Base32 string contained only '='.");
    // convert to a multiple of 8 binary bits
    let binary = "";
    for (let i = 0; i < str.length; i++) {
        const index = base32Chars.indexOf(str[i]);
        if (index == -1)
            throw new Error("Invalid character in base32 string.");
        binary += index.toString(2).padStart(5, "0");
    }
    binary = padEndToMod(binary, 8, "0");
    // convert each chunk of 8 bits to a byte in the array
    let bytes = [];
    for (let i = 0; i < binary.length; i += 8)
        bytes.push(parseInt(binary.substring(i, i + 8), 2));
    if ((str.length % 8 == 1) || (str.length % 8 == 2) || (str.length % 8 == 3) || (str.length % 8 == 4) || (str.length % 8 == 5) || (str.length % 8 == 6) || (str.length % 8 == 7))
        bytes.pop();
    return bytes;
}
function bytesToBase32(bytes) {
    // convert to a multiple of 5 binary bits
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
        binary += (bytes[i] & 0xFF).toString(2).padStart(8, "0");
    binary = padEndToMod(binary, 5, "0");
    // convert each chunk of 5 bits to a base32 character
    let base32 = "";
    for (let i = 0; i < binary.length; i += 5)
        base32 += base32Chars[parseInt(binary.substring(i, i + 5), 2)];
    // if the length is now zero, return a single A(0) padded with "="
    const base32Len = base32.length;
    if (base32Len == 0)
        return "A===";
    // pad with "=" to the nearest multiple of 4
    return padEndToMod(base32, 8, "=");
}
// base 64 functions
const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64ToBytes(str) {
    // remove "=" from the end of the string
    str = str.replace(/=+$/, "");
    if (str.length == 0)
        throw new Error("Base64 string contained only '='.");
    // convert to a multiple of 8 binary bits
    let binary = "";
    for (let i = 0; i < str.length; i++) {
        const index = base64Chars.indexOf(str[i]);
        if (index == -1)
            throw new Error("Invalid character in base64 string.");
        binary += index.toString(2).padStart(6, "0");
    }
    binary = padEndToMod(binary, 8, "0");
    // convert each chunk of 8 bits to a byte in the array
    let bytes = [];
    for (let i = 0; i < binary.length; i += 8)
        bytes.push(parseInt(binary.substring(i, i + 8), 2));
    if ((str.length % 4 == 2) || (str.length % 4 == 3))
        bytes.pop();
    return bytes;
}
function bytesToBase64(bytes) {
    // convert to a multiple of 6 binary bits
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
        binary += bytes[i].toString(2).padStart(8, "0");
    binary = padEndToMod(binary, 6, "0");
    // convert each chunk of 6 bits to a base64 character
    let base64 = "";
    for (let i = 0; i < binary.length;)
        base64 += base64Chars[parseInt(binary.substring(i, i += 6), 2)];
    // if the length is now zero, return a single A(0) padded with "="
    const base64Len = base64.length;
    if (base64Len == 0)
        return "A===";
    // pad with "=" to the nearest multiple of 4
    return padEndToMod(base64, 4, "=");
}
// string functions
function stringToBytes(str) {
    // convert each char to a byte in the array
    const bytes = [];
    for (let i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i));
    return bytes;
}
function bytesToString(bytes) {
    // convert each char to a byte in the array
    let str = "";
    for (let i = 0; i < bytes.length; i++)
        str += String.fromCharCode((bytes[i] & 0xFF));
    return str;
}
// 32 bit word functions
function bytesToWords(bytes) {
    let words = [];
    for (let i = 0; i < bytes.length; i++)
        words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << ((3 - (i % 4)) * 8));
    return words.map((word) => (word >>> 0));
}
function wordsToBytes(words) {
    let bytes = [];
    for (let i = 0; i < words.length * 4; i++)
        bytes.push((words[i >> 2] >> ((3 - (i % 4)) * 8)) & 0xFF);
    return bytes;
}
// #endregion ./numberHandling

// #region ./HMAC

// #region ./sha0

// adapted partially from algorithm I found here https://stackoverflow.com/questions/59777670/how-can-i-hash-a-string-with-sha256, which was taken from https://geraintluff.github.io/sha256/
// and the wikipedia article on SHA-1 https://en.wikipedia.org/wiki/SHA-1
// by Curse
function sha0(str) {
    return bytesToBase16(sha0Bytes(stringToBytes(str)));
}
// actual hash algorithms
function leftRotate(value, amount) {
    return (value >>> (32 - amount)) | (value << amount);
}
function sha0Bytes(bytes) {
    var i, j;
    var bitLength = bytes.length * 8;
    bytes = bytes.slice();
    bytes.push(0x80);
    while (((bytes.length % 64) - 56) != 0)
        bytes.push(0);
    var words = bytesToWords(bytes);
    words.push(0);
    words.push(bitLength);
    let hash = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        for (let i = 16; i < 80; i++)
            w[i] = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
        let wHash = hash.slice();
        for (i = 0; i < 80; i++) {
            let f = 0;
            let k = 0;
            const b = wHash[1], c = wHash[2], d = wHash[3];
            if (i < 20) {
                f = (b & c) | ((~b) & d);
                k = 0x5A827999;
            }
            else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ED9EBA1;
            }
            else if (i < 60) {
                f = (b & c) ^ (b & d) ^ (c & d);
                k = 0x8F1BBCDC;
            }
            else {
                f = b ^ c ^ d;
                k = 0xCA62C1D6;
            }
            wHash = [leftRotate(wHash[0], 5) + f + wHash[4] + k + w[i], wHash[0], leftRotate(b, 30), c, d];
        }
        for (i = 0; i < 5; i++)
            hash[i] = (hash[i] + wHash[i]) | 0;
    }
    return wordsToBytes(hash);
}
// #endregion ./sha0

// #region ./sha1

// adapted partially from algorithm I found here https://stackoverflow.com/questions/59777670/how-can-i-hash-a-string-with-sha256, which was taken from https://geraintluff.github.io/sha256/
// and the wikipedia article on SHA-1 https://en.wikipedia.org/wiki/SHA-1
// by Curse
function sha1(str) {
    return bytesToBase16(sha1Bytes(stringToBytes(str)));
}
// actual hash algorithms
function leftRotate(value, amount) {
    return (value >>> (32 - amount)) | (value << amount);
}
function sha1Bytes(bytes) {
    var i, j;
    var bitLength = bytes.length * 8;
    bytes = bytes.slice();
    bytes.push(0x80);
    while (((bytes.length % 64) - 56) != 0)
        bytes.push(0);
    var words = bytesToWords(bytes);
    words.push(0);
    words.push(bitLength);
    let hash = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
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
            }
            else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ED9EBA1;
            }
            else if (i < 60) {
                f = (b & c) ^ (b & d) ^ (c & d);
                k = 0x8F1BBCDC;
            }
            else {
                f = b ^ c ^ d;
                k = 0xCA62C1D6;
            }
            wHash = [(leftRotate(wHash[0], 5) + f + wHash[4] + k + w[i]) | 0, wHash[0], leftRotate(b, 30), c, d];
        }
        for (i = 0; i < 5; i++)
            hash[i] = (hash[i] + wHash[i]) | 0;
    }
    return wordsToBytes(hash);
}
// #endregion ./sha1

// #region ./sha256

// adapted from algorithm I found here https://stackoverflow.com/questions/59777670/how-can-i-hash-a-string-with-sha256, which was taken from https://geraintluff.github.io/sha256/
// and from pseudo-code at https://en.wikipedia.org/wiki/SHA-2
// by Curse
function sha256(str) {
    return bytesToBase16(sha256Bytes(stringToBytes(str)));
}
let h = [];
let k = [];
const maxWord = Math.pow(2, 32);
let primeCounter = 0;
let isComposite = {};
for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate)
            isComposite[i] = true;
        h[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
}
function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
}
function sha256Bytes(bytes) {
    let i, j; // Used as a counter across the whole file
    let bitLength = bytes.length * 8;
    let hash = h.slice(0, 8);
    bytes = bytes.slice();
    bytes.push(0x80); // Append Ƈ' byte (plus zero padding)
    while (((bytes.length % 64) - 56) != 0)
        bytes.push(0); // More zero padding
    let words = bytesToWords(bytes);
    words.push(0);
    words.push(bitLength);
    // process each chunk of 16 bytes
    for (j = 0; j < words.length;) {
        let w = words.slice(j, j += 16);
        // expanded the message into 64 words to calculate with
        for (let i = 16; i < 64; i++) {
            const w15 = w[i - 15];
            const s0 = (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3));
            const w2 = w[i - 2];
            const s1 = (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10));
            w.push(w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        // this is the working hash, added to the original hash after hashing
        let wHash = hash.slice();
        for (i = 0; i < 64; i++) {
            // naming changed to be more like wikipedia, beacuase it was better than the other link
            let a = wHash[0], b = wHash[1], c = wHash[2], e = wHash[4];
            const S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
            const S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
            const ch = ((e & wHash[5]) ^ ((~e) & wHash[6]));
            const maj = ((a & b) ^ (a & c) ^ (b & c));
            let temp1 = wHash[7] + S1 + ch + k[i] + w[i];
            // shift hash right and add temp1 + temp2 to the front
            // also add temp1 to e
            wHash = [(temp1 + (S0 + maj)) | 0, wHash[0], wHash[1], wHash[2], (wHash[3] + temp1), wHash[4], wHash[5], wHash[6]];
        }
        // add working hash back to original hash
        for (i = 0; i < 8; i++)
            hash[i] = (hash[i] + wHash[i]) | 0;
    }
    return wordsToBytes(hash);
}
// #endregion ./sha256

// implementation of Hash-Based Message Authentication Code(HMAC) in javascript
// by Curse
// https://en.wikipedia.org/wiki/HMAC
function padEnd(input, padTo) {
    const output = input.slice();
    for (let i = input.length; i < padTo; i++)
        output[i] = 0;
    return output;
}
function computeBlockSizedKey(key, hashFunc, blockSize) {
    if (key.length > blockSize)
        return hashFunc(key);
    else if (key.length < blockSize)
        return padEnd(key, blockSize); // Pad key with zeros to make it blockSize bytes long
    return key;
}
function hmac(key, message, hashFunc, blockSize) {
    if (typeof key == "string")
        key = stringToBytes(key);
    if (typeof message == "string")
        message = stringToBytes(message);
    const block_sized_key = computeBlockSizedKey(key, hashFunc, blockSize);
    let o_key_pad = [];
    let i_key_pad = [];
    for (let i = 0; i < blockSize; i++) {
        o_key_pad[i] = block_sized_key[i] ^ 0x5c;
        i_key_pad[i] = block_sized_key[i] ^ 0x36;
    }
    return hashFunc(o_key_pad.concat(hashFunc(i_key_pad.concat(message))));
}
function hmac0(key, message) {
    return hmac(key, message, sha0Bytes, 64);
}
function hmac1(key, message) {
    return hmac(key, message, sha1Bytes, 64);
}
function hmac256(key, message) {
    return hmac(key, message, sha256Bytes, 64);
}
// #endregion ./HMAC

// implementation of HMAC-Based One Time Password(HOTP)
// and Time Based One Time Password(TOTP)
// by Curse
const oneTimeDuration = 30 * 1000; // 30 seconds
const totpWindow = 1;
const hotpCodeLength = 6;
// #region TOTP
// https://en.wikipedia.org/wiki/Time-based_one-time_password
function checkTotp(key, value) {
    if (value.length != hotpCodeLength)
        return false;
    const counter = getCounter();
    for (let i = -totpWindow; i <= totpWindow; i++)
        if (getHOTP(key, counter + i) == value)
            return true;
    return false;
}
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
    const hmacHash = hmac1(base32ToBytes(key), wordsToBytes([counter]));
    let offset = hmacHash[hmacHash.length - 1] & 0xF; // Last nibble determines offset
    let binary = 0;
    for (let i = 0; i < 4; i++)
        binary |= (hmacHash[offset + i] & ((i == 0) ? 0x7F : 0xFF)) << ((3 - i) * 8);
    return (binary % Math.pow(10, hotpCodeLength)).toString().padStart(hotpCodeLength, "0"); // Return a n-digit HOTP
}
// #endregion HOTP
// #endregion ./TOTP

// #region ./AES

// #region ./RijndaelsFF
// https://en.wikipedia.org/wiki/Finite_field_arithmetic#Rijndael's_(AES)_finite_field
// also help from ChatGPT
// function using Rijndaels Finite Field or GF(2^8) or GF(2)[x]/(x^8 + x^4 + x^3 + x + 1) where x^8 + x^4 + x^3 + x + 1 = 0b100011011 or 0x11b
function RijndaelsDegree(poly) {
    // console.log("degree(" + poly + ")");
    for (let i = 8; i >= 0; i--) {
        if ((poly & (1 << i)) !== 0) {
            return i;
        }
    }
    return -1;
}
function RijndaelsMultiplication(a, b) {
    // console.log("mult(" + a + ", " + b + ")");
    let result = 0;
    for (let i = 0; (i < 8) && (b > 0); i++) {
        if ((b & 1) !== 0)
            result ^= a;
        if (a & 0x80)
            a = ((a << 1) ^ 0x1b) & 0xFF; // AES irreducible polynomial(0x11b) mod 0x100
        else
            a = a << 1;
        b = (b >> 1);
    }
    return result & 0xFF;
}
function RijndaelsDivision(dividend, divisor) {
    if (RijndaelsDegree(dividend) < RijndaelsDegree(divisor))
        return [0, dividend];
    let quotient = 0;
    let remainder = dividend;
    const degDivisor = RijndaelsDegree(divisor);
    while (RijndaelsDegree(remainder) >= degDivisor) {
        const shift = RijndaelsDegree(remainder) - degDivisor;
        quotient ^= 1 << shift;
        remainder ^= divisor << shift;
    }
    return [quotient, remainder];
}
// for 0 < a < p : there exists s and t such that as + pt = 1
// if equation is mod p then (as + pt) % p = as % p = 1 % p = 1 => there exists s such that as % p = 1
// as + pt = 1
// p   = q_1*a   + r_1 where q_1 and r_1 are integers and 0 <= r_1 < a
// a   = q_2*r_1 + r_2 where q_2 and r_2 are integers and 0 <= r_2 < r_1
// r_1 = q_3*r_2 + r_3 where q_3 and r_3 are integers and 0 <= r_3 < r_2
// r_2 = q_4*r_3 + r_4 where q_4 and r_4 are integers and 0 <= r_4 < r_3
// ...
// r_(n-2) = q_n*r_(n-1) + 0 because r_x is strictly decreasing due to the condition of r(n) < r_(n-1)
function RijndaelsExtendedEuclidean(a) {
    // console.log("inv(" + a + ")");
    let x = a;
    let y = 0x11b;
    let s2 = 1;
    let s1 = 0;
    while (y !== 0) {
        let [q, r] = RijndaelsDivision(x, y);
        let s0 = s2 ^ RijndaelsMultiplication(q, s1);
        // cycle variables
        x = y;
        y = r;
        s2 = s1;
        s1 = s0;
    }
    return s2;
}
// #endregion ./RijndaelsFF

function leftRotate(value, bitSize, amount) {
    if (bitSize === 32)
        return ((value >>> (bitSize - amount)) | (value << amount)) >>> 0;
    else if (bitSize < 32)
        return ((value >>> (bitSize - amount)) | (value << amount)) & ((1 << bitSize) - 1);
    return 0;
}
var AES;
(function (AES) {
    // #region S-Box
    function createS_Box() {
        // https://en.wikipedia.org/wiki/Rijndael_S-box
        let Sb = [0x63];
        let RSb = [0x63];
        // have to define i=0 manually because it has no inverse
        Sb[0] = 0x63;
        RSb[0x63] = 0;
        for (let i = 1; i < 256; i++) {
            const b = RijndaelsExtendedEuclidean(i);
            Sb[i] = b ^ leftRotate(b, 8, 1) ^ leftRotate(b, 8, 2) ^ leftRotate(b, 8, 3) ^ leftRotate(b, 8, 4) ^ 0x63;
            RSb[Sb[i]] = i;
        }
        // console.log("S-Box:");
        // for (let i = 0; i < 256;) console.log("    " + S.slice(i, i += 16).map((byte: number) => byte.toString(16).padStart(2, "0")).join(" "));
        return [Sb, RSb];
    }
    let [S, RS] = createS_Box();
    function SubByte(byte) {
        if (S == undefined)
            throw new Error("S-Box has not been initialized.");
        else
            return S[byte];
    }
    function UnSubByte(byte) {
        if (RS == undefined)
            throw new Error("Reverse-S-Box has not been initialized.");
        else
            return RS[byte];
    }
    function SubWord(num) {
        return bytesToWords(wordsToBytes([num]).map(SubByte))[0];
    }
    // #endregion  S-Box
    function expandKey(K) {
        if ((K.length !== 16) && (K.length !== 24) && (K.length !== 32))
            throw new Error("key length is not valid.");
        // https://en.wikipedia.org/wiki/AES_key_schedule
        // generate constants used in key schedule
        const rc = [1];
        const rcon = [1 << 24];
        for (let i = 1; i < 10; i++) {
            if (rc[i - 1] < 0x80)
                rc[i] = rc[i - 1] << 1;
            else
                rc[i] = ((rc[i - 1] << 1) ^ 0x1B) % 0x100;
            rcon[i] = (rc[i] << 24) >>> 0;
        }
        let Ww = bytesToWords(K); // 32 bit words of the "expanded key" length of 4R
        const N = Ww.length; // number of 32 bit words in key size, 4, 6, or 8 for AES128, 196, and 256 respectively
        for (let i = N; i < 60; i++) { // for (let i = 0; i < (4 * R); i++) {
            if ((i % N) === 0)
                Ww[i] = Ww[i - N] ^ SubWord(leftRotate(Ww[i - 1], 32, 8)) ^ rcon[Math.floor(i / N) - 1]; // leftRotate(Ww[i - 1]!, 32, 8) === RotWord(Ww[i - 1]!)
            else if ((N > 6) && ((i % N) === 4))
                Ww[i] = Ww[i - N] ^ SubWord(Ww[i - 1]);
            else
                Ww[i] = Ww[i - N] ^ Ww[i - 1];
        }
        return wordsToBytes(Ww.map((word) => (word >>> 0)));
    }
    AES.expandKey = expandKey;
    let Type;
    (function (Type) {
        Type[Type["ECB"] = 1] = "ECB";
        Type[Type["CTR"] = 2] = "CTR";
        Type[Type["GCM"] = 3] = "GCM";
        Type[Type["CBC"] = 4] = "CBC";
        Type[Type["PCBC"] = 5] = "PCBC";
        Type[Type["CBC_CTS"] = 6] = "CBC_CTS";
        Type[Type["PCBC_CTS"] = 7] = "PCBC_CTS";
        Type[Type["CBC_RBT"] = 8] = "CBC_RBT";
        Type[Type["CFB"] = 9] = "CFB";
        Type[Type["OFB"] = 10] = "OFB"; // Output feedback
    })(Type = AES.Type || (AES.Type = {}));
    function TypeToString(AEStype) {
        switch (AEStype) {
            case AES.Type.ECB:
                return "ECB";
            case AES.Type.CTR:
                return "CTR";
            case AES.Type.GCM:
                return "GCM";
            case AES.Type.CBC:
                return "CBC";
            case AES.Type.PCBC:
                return "PCBC";
            case AES.Type.CBC_CTS:
                return "CBC-CTS";
            case AES.Type.PCBC_CTS:
                return "PCBC-CTS";
            case AES.Type.CBC_RBT:
                return "CBC-RBT";
            case AES.Type.CFB:
                return "CFB";
            case AES.Type.OFB:
                return "OFB";
            default:
                return "";
        }
    }
    AES.TypeToString = TypeToString;
    let Padding;
    (function (Padding) {
        Padding[Padding["NoPadding"] = 1] = "NoPadding";
        Padding[Padding["PKCS7"] = 2] = "PKCS7";
        Padding[Padding["DES"] = 3] = "DES";
    })(Padding = AES.Padding || (AES.Padding = {}));
    function PaddingToString(AEStype) {
        switch (AEStype) {
            case AES.Padding.NoPadding:
                return "NoPadding";
            case AES.Padding.PKCS7:
                return "PKCS#7";
            case AES.Padding.DES:
                return "DES";
            default:
                return "";
        }
    }
    AES.PaddingToString = PaddingToString;
    function encrypt(message, W, options) {
        let messageBytes = stringToBytes(message);
        if (options.type == undefined)
            throw new Error("type option is missing.");
        if (options.type === Type.ECB) {
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.Padding === Padding.NoPadding) {
                const paddingNeeded = (16 - (messageBytes.length % 16)) % 16;
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            else if (options.Padding === Padding.PKCS7) {
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(paddingNeeded);
            }
            else if (options.Padding === Padding.DES) {
                messageBytes.push(1);
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            let output = [];
            for (let i = 0; i < messageBytes.length;)
                output.push(...encryptBlock(messageBytes.slice(i, i += 16), W));
            return output;
        }
        else if (options.type === Type.CTR) {
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let CTR = stringToBytes(options.IV);
            let CTRhash = [];
            const numNeeded = Math.ceil(messageBytes.length / 16);
            for (let i = 0; i < numNeeded; i++) {
                CTRhash.push(...encryptBlock(CTR, W));
                if (CTR[15] === 0xFF) {
                    CTR[15] = 0;
                    CTR[14]++;
                }
                else
                    CTR[15]++; // I most definitely wont use more that 256*256*16 bytes
            }
            return messageBytes.map((byte, j) => byte ^ CTRhash[j]);
        }
        else if (options.type === Type.GCM) {
            return [];
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let CTR = stringToBytes(options.IV);
            let CTRhash = [];
            const numNeeded = Math.ceil(messageBytes.length / 16) + 1;
            for (let i = 0; i < numNeeded; i++) {
                CTRhash.push(...encryptBlock(CTR, W));
                if (CTR[15] === 0xFF) {
                    CTR[15] = 0;
                    CTR[14]++;
                }
                else
                    CTR[15]++; // I most definitely wont use more that 256*256*16 bytes
            }
            const cipherText = messageBytes.map((byte, j) => byte ^ CTRhash[j + 16]);
            let tag = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const H = encryptBlock(tag, W);
            for (let i = 0; i < cipherText.length;) {
                const Cblock = cipherText.slice(i, i += 16);
                tag = tag.map((byte, j) => byte ^ Cblock[j]);
            }
            const lenAlenC = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].concat(wordsToBytes([cipherText.length * 8])); // bit length of cipherText as byte array
            tag = tag.map((byte, i) => byte ^ lenAlenC[i]);
            tag = tag.map((byte, i) => byte ^ CTRhash[i]);
            return cipherText.concat(tag);
        }
        else if (options.type === Type.CBC) {
            // pad data
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.Padding === Padding.NoPadding) {
                const paddingNeeded = (16 - (messageBytes.length % 16)) % 16;
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            else if (options.Padding === Padding.PKCS7) {
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(paddingNeeded);
            }
            else if (options.Padding === Padding.DES) {
                messageBytes.push(1);
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            // xor plaintext with previous block of ciphertext, with the first block using the IV
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < messageBytes.length;)
                output.push(...Vector = encryptBlock(messageBytes.slice(i, i += 16).map((byte, j) => byte ^ Vector[j]), W));
            return output;
        }
        else if (options.type === Type.PCBC) {
            // pad data
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.Padding === Padding.NoPadding) {
                const paddingNeeded = (16 - (messageBytes.length % 16)) % 16;
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            else if (options.Padding === Padding.PKCS7) {
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(paddingNeeded);
            }
            else if (options.Padding === Padding.DES) {
                messageBytes.push(1);
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            // xor plaintext with previous block of ciphertext and previous block of plaintext, with the first block only being plaintext xor IV
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < messageBytes.length;) {
                const plainText = messageBytes.slice(i, i += 16);
                const cipherText = encryptBlock(plainText.map((byte, j) => byte ^ Vector[j]), W);
                Vector = plainText.map((byte, j) => byte ^ cipherText[j]);
                output.push(...cipherText);
            }
            return output;
        }
        else if (options.type === Type.CBC_CTS) {
            const paddingNeeded = 16 - messageBytes.length;
            for (let i = 0; i < paddingNeeded; i++)
                messageBytes.push(0);
            // hard to explain, best explained here https://en.wikipedia.org/wiki/Ciphertext_stealing#CBC_ciphertext_stealing_encryption_using_a_standard_CBC_interface
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < messageBytes.length;) {
                const plainText = messageBytes.slice(i, i += 16);
                if (plainText.length === 16)
                    output.push(...Vector = encryptBlock(plainText.map((byte, j) => byte ^ Vector[j]), W));
                else {
                    // output = output.slice(0, output.length - 16).concat(encryptBlock(Vector.map((byte: number, j: number) => ((plainText[j] ?? 0) ^ byte)) as number16, W)).concat(plainText.map((_, j: number) => Vector[j]!));
                    output = output.slice(0, output.length - 16);
                    output.push(...encryptBlock(Vector.map((byte, j) => { var _a; return (((_a = plainText[j]) !== null && _a !== void 0 ? _a : 0) ^ byte); }), W), ...plainText.map((_, j) => Vector[j]));
                }
            }
            return output;
        }
        else if (options.type === Type.PCBC_CTS) {
            let paddingNeeded = 16 - messageBytes.length;
            for (let i = 0; i < paddingNeeded; i++)
                messageBytes.push(0);
            paddingNeeded = (16 - (messageBytes.length % 16)) % 16;
            // hard to explain, best explained here https://en.wikipedia.org/wiki/Ciphertext_stealing#CBC_ciphertext_stealing_encryption_using_a_standard_CBC_interface
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            let cipherText = Vector;
            for (let i = 0; i < messageBytes.length;) {
                const plainText = messageBytes.slice(i, i += 16);
                if (plainText.length === 16)
                    cipherText = encryptBlock(plainText.map((byte, j) => byte ^ Vector[j]), W);
                else
                    cipherText = encryptBlock(cipherText.map((byte, j) => ((plainText[j] == undefined) ? byte : (plainText[j] ^ Vector[j]))), W);
                output.push(...cipherText);
                Vector = plainText.map((byte, j) => byte ^ cipherText[j]);
            }
            // if the last chunk was not a full block, swap last two blocks and truncate
            if (paddingNeeded != 0) {
                const lastHash = output.slice(output.length - 16);
                const secondLastHash = output.slice(output.length - 32, output.length - 16);
                output = output.slice(0, output.length - 32).concat([...lastHash, ...secondLastHash.filter((_, i) => i < (16 - paddingNeeded))]);
            }
            return output;
        }
        else if (options.type === Type.CBC_RBT) {
            // xor plaintext with previous block of ciphertext, with the first block using the IV
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < messageBytes.length;) {
                const plainText = messageBytes.slice(i, i += 16);
                if (plainText.length === 16)
                    output.push(...Vector = encryptBlock(plainText.map((byte, j) => byte ^ Vector[j]), W));
                else {
                    Vector = encryptBlock(Vector, W);
                    output.push(...plainText.map((byte, j) => byte ^ Vector[j]));
                }
            }
            return output;
        }
        else if (options.type === Type.CFB) {
            // pad data
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.Padding === Padding.NoPadding) {
                const paddingNeeded = (16 - (messageBytes.length % 16)) % 16;
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            else if (options.Padding === Padding.PKCS7) {
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(paddingNeeded);
            }
            else if (options.Padding === Padding.DES) {
                messageBytes.push(1);
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            // xor plaintext with encrypt(previous ciphertext), with the first block using the encrypt(IV)
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let encryptedVector = encryptBlock(stringToBytes(options.IV), W);
            let output = [];
            for (let i = 0; i < messageBytes.length;) {
                const cipherText = messageBytes.slice(i, i += 16).map((byte, j) => byte ^ encryptedVector[j]);
                output.push(...cipherText);
                encryptedVector = encryptBlock(cipherText, W);
            }
            return output;
        }
        else if (options.type === Type.OFB) {
            // pad data
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.Padding === Padding.NoPadding) {
                const paddingNeeded = (16 - (messageBytes.length % 16)) % 16;
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            else if (options.Padding === Padding.PKCS7) {
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(paddingNeeded);
            }
            else if (options.Padding === Padding.DES) {
                messageBytes.push(1);
                const paddingNeeded = 16 - (messageBytes.length % 16);
                for (let i = 0; i < paddingNeeded; i++)
                    messageBytes.push(0);
            }
            // xor plaintext with incrementally incrypted IV's ie. encrypt(IV), encrypt(encrypt(IV)), encrypt(encrypt(encrypt(IV))), etc.
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let encryptedVector = encryptBlock(stringToBytes(options.IV), W);
            let output = [];
            for (let i = 0; i < messageBytes.length;) {
                output.push(...messageBytes.slice(i, i += 16).map((byte, j) => byte ^ encryptedVector[j]));
                encryptedVector = encryptBlock(encryptedVector, W);
            }
            return output;
        }
        return [];
    }
    AES.encrypt = encrypt;
    function decrypt(encryptedBytes, W, options) {
        if (options.type == undefined)
            throw new Error("type option is missing.");
        if (options.type === Type.ECB) {
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                const state = encryptedBytes.slice(i, i += 16);
                output.push(...decryptBlock(state, W));
            }
            if (options.Padding === Padding.NoPadding) { // remove trailing 0 bytes
                while ((output.length > 0) && (output[output.length - 1] === 0))
                    output.pop();
            }
            else if (options.Padding === Padding.PKCS7) { // remove number of bytes as the last byte
                const padByte = output[output.length - 1];
                for (let i = 0; i < Math.min(padByte, 16); i++)
                    output.pop();
            }
            else if (options.Padding === Padding.DES) { // remove trailing 0 bytes and a 1 byte
                while (output[output.length - 1] === 0)
                    output.pop();
                output.pop();
            }
            return bytesToString(output);
        }
        else if (options.type === Type.CTR) {
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let CTR = stringToBytes(options.IV);
            let CTRhash = [];
            const numNeeded = Math.ceil(encryptedBytes.length / 16);
            for (let i = 0; i < numNeeded; i++) {
                CTRhash.push(...encryptBlock(CTR, W));
                if (CTR[15] === 0xFF)
                    CTR[14]++;
                else
                    CTR[15]++; // I most definitely wont use more that 256*256*16 bytes
            }
            return bytesToString(encryptedBytes.map((byte, j) => byte ^ CTRhash[j]));
        }
        else if (options.type === Type.GCM) {
            return "";
        }
        else if (options.type === Type.CBC) {
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                const cipherText = encryptedBytes.slice(i, i += 16);
                output.push(...decryptBlock(cipherText, W).map((byte, j) => byte ^ Vector[j]));
                Vector = cipherText;
            }
            if (options.Padding === Padding.NoPadding) { // remove trailing 0 bytes
                while ((output.length > 0) && (output[output.length - 1] === 0))
                    output.pop();
            }
            else if (options.Padding === Padding.PKCS7) { // remove number of bytes as the last byte
                const padByte = output[output.length - 1];
                for (let i = 0; i < Math.min(padByte, 16); i++)
                    output.pop();
            }
            else if (options.Padding === Padding.DES) { // remove trailing 0 bytes and a 1 byte
                while (output[output.length - 1] === 0)
                    output.pop();
                output.pop();
            }
            return bytesToString(output);
        }
        else if (options.type === Type.PCBC) {
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                const cipherText = encryptedBytes.slice(i, i += 16);
                const plainText = decryptBlock(cipherText, W).map((byte, j) => byte ^ Vector[j]);
                Vector = plainText.map((byte, j) => byte ^ cipherText[j]);
                output.push(...plainText);
            }
            if (options.Padding === Padding.NoPadding) { // remove trailing 0 bytes
                while ((output.length > 0) && (output[output.length - 1] === 0))
                    output.pop();
            }
            else if (options.Padding === Padding.PKCS7) { // remove number of bytes as the last byte
                const padByte = output[output.length - 1];
                for (let i = 0; i < Math.min(padByte, 16); i++)
                    output.pop();
            }
            else if (options.Padding === Padding.DES) { // remove trailing 0 bytes and a 1 byte
                while (output[output.length - 1] === 0)
                    output.pop();
                output.pop();
            }
            return bytesToString(output);
        }
        else if (options.type === Type.CBC_CTS) {
            // https://en.wikipedia.org/wiki/Ciphertext_stealing#CBC_ciphertext_stealing_decryption_using_a_standard_CBC_interface
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let OldVector = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                const cipherText = encryptedBytes.slice(i, i += 16);
                if (cipherText.length < 16) { // if it is the last block
                    const beforeXor = output.slice(output.length - 16).map((byte, j) => byte ^ OldVector[j]);
                    const input = beforeXor.map((byte, j) => ((cipherText[j] == undefined) ? byte : cipherText[j]));
                    output = output.slice(0, output.length - 16);
                    output.push(...decryptBlock(input, W).map((byte, j) => byte ^ OldVector[j]), ...beforeXor.map((byte, j) => byte ^ input[j]));
                }
                else {
                    // regular decryption step
                    [OldVector, Vector] = [Vector, cipherText];
                    output.push(...decryptBlock(Vector, W).map((byte, j) => byte ^ OldVector[j]));
                }
            }
            while ((output.length > 0) && (output[output.length - 1] === 0))
                output.pop();
            return bytesToString(output);
        }
        else if (options.type === Type.PCBC_CTS) {
            // https://en.wikipedia.org/wiki/Ciphertext_stealing#CBC_ciphertext_stealing_decryption_using_a_standard_CBC_interface, this but for PCBC
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let lastVector = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            let Vector = stringToBytes(options.IV);
            let plainText = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                let cipherText = encryptedBytes.slice(i, i += 16);
                if (cipherText.length === 16) {
                    // regular decryption step
                    plainText = decryptBlock(cipherText, W).map((byte, j) => byte ^ Vector[j]);
                    lastVector = Vector;
                    Vector = plainText.map((byte, j) => byte ^ cipherText[j]);
                    output.push(...plainText);
                }
                else {
                    let newCipherText = plainText.map((byte, j) => { var _a; return (_a = cipherText[j]) !== null && _a !== void 0 ? _a : (byte ^ lastVector[j]); });
                    const plainText1 = decryptBlock(newCipherText, W).map((byte, j) => byte ^ lastVector[j]);
                    Vector = plainText1.map((byte, j) => byte ^ newCipherText[j]);
                    const plainText2 = plainText.map((byte, j) => byte ^ lastVector[j] ^ Vector[j]);
                    output = output.slice(0, output.length - 16);
                    output.push(...plainText1, ...plainText2.slice(0, cipherText.length));
                }
            }
            while ((output.length > 0) && (output[output.length - 1] === 0))
                output.pop();
            return bytesToString(output);
        }
        else if (options.type === Type.CBC_RBT) {
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let Vector = stringToBytes(options.IV);
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                const cipherText = encryptedBytes.slice(i, i += 16);
                if (cipherText.length === 16) {
                    output.push(...decryptBlock(cipherText, W).map((byte, j) => byte ^ Vector[j]));
                    Vector = cipherText;
                }
                else {
                    Vector = encryptBlock(Vector, W);
                    output.push(...cipherText.map((byte, j) => byte ^ Vector[j]));
                }
            }
            return bytesToString(output);
        }
        else if (options.type === Type.CFB) {
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let encryptedVector = encryptBlock(stringToBytes(options.IV), W);
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                const cipherText = encryptedBytes.slice(i, i += 16);
                output.push(...cipherText.map((byte, j) => byte ^ encryptedVector[j]));
                encryptedVector = encryptBlock(cipherText, W);
            }
            if (options.Padding === Padding.NoPadding) { // remove trailing 0 bytes
                while ((output.length > 0) && (output[output.length - 1] === 0))
                    output.pop();
            }
            else if (options.Padding === Padding.PKCS7) { // remove number of bytes as the last byte
                const padByte = output[output.length - 1];
                for (let i = 0; i < Math.min(padByte, 16); i++)
                    output.pop();
            }
            else if (options.Padding === Padding.DES) { // remove trailing 0 bytes and a 1 byte
                while (output[output.length - 1] === 0)
                    output.pop();
                output.pop();
            }
            return bytesToString(output);
        }
        else if (options.type === Type.OFB) {
            if (options.Padding == undefined)
                throw new Error("Padding option is missing.");
            if (options.IV == undefined)
                throw new Error("IV option is missing.");
            if (options.IV.length !== 16)
                throw new Error("IV length is not valid.");
            let encryptedVector = encryptBlock(stringToBytes(options.IV), W);
            let output = [];
            for (let i = 0; i < encryptedBytes.length;) {
                output.push(...encryptedBytes.slice(i, i += 16).map((byte, j) => byte ^ encryptedVector[j]));
                encryptedVector = encryptBlock(encryptedVector, W);
            }
            if (options.Padding === Padding.NoPadding) { // remove trailing 0 bytes
                while ((output.length > 0) && (output[output.length - 1] === 0))
                    output.pop();
            }
            else if (options.Padding === Padding.PKCS7) { // remove number of bytes as the last byte
                const padByte = output[output.length - 1];
                for (let i = 0; i < Math.min(padByte, 16); i++)
                    output.pop();
            }
            else if (options.Padding === Padding.DES) { // remove trailing 0 bytes and a 1 byte
                while (output[output.length - 1] === 0)
                    output.pop();
                output.pop();
            }
            return bytesToString(output);
        }
        return "";
    }
    AES.decrypt = decrypt;
    function encryptBlock(message, W) {
        if (message.length != 16)
            throw new Error("block size must be exactly 128 bits.");
        let state = [...message];
        // AddRoundKey step
        state = state.map((byte, i) => byte ^ W[i]);
        // 13 round
        for (let i = 1; i < 14; i++) { // 13 rounds
            // SubBytes step
            state = state.map(SubByte);
            // ShiftRows step
            state = [
                state[0], state[5], state[10], state[15],
                state[4], state[9], state[14], state[3],
                state[8], state[13], state[2], state[7],
                state[12], state[1], state[6], state[11]
            ];
            // MixColumns step
            for (let offset = 0; offset < 16; offset += 4) {
                const state0 = state[0 + offset];
                const state1 = state[1 + offset];
                const state2 = state[2 + offset];
                const state3 = state[3 + offset];
                state[0 + offset] = RijndaelsMultiplication(2, state0) ^ RijndaelsMultiplication(3, state1) ^ state2 ^ state3;
                state[1 + offset] = state0 ^ RijndaelsMultiplication(2, state1) ^ RijndaelsMultiplication(3, state2) ^ state3;
                state[2 + offset] = state0 ^ state1 ^ RijndaelsMultiplication(2, state2) ^ RijndaelsMultiplication(3, state3);
                state[3 + offset] = RijndaelsMultiplication(3, state0) ^ state1 ^ state2 ^ RijndaelsMultiplication(2, state3);
            }
            // AddRoundKey step
            state = state.map((byte, j) => byte ^ W[(i * 16) + j]);
            // console.log("After round #" + i + ", state: [ " + state.map((byte: number) => byte.toString(16).padStart(2, "0")).join(", ") + " ]\n");
        }
        // last round
        // SubBytes step
        state = state.map(SubByte);
        // ShiftRows step
        state = [
            state[0], state[5], state[10], state[15],
            state[4], state[9], state[14], state[3],
            state[8], state[13], state[2], state[7],
            state[12], state[1], state[6], state[11]
        ];
        // AddRoundKey step
        state = state.map((byte, i) => byte ^ W[224 + i]); // 224 = 14*16
        // switch from column-major back to list
        return state;
    }
    function decryptBlock(encryptedState, W) {
        let state = [...encryptedState];
        // SubRoundKey step
        state = state.map((byte, i) => byte ^ W[224 + i]); // 224 = 14*16
        // UnShiftRows step
        state = [
            state[0], state[13], state[10], state[7],
            state[4], state[1], state[14], state[11],
            state[8], state[5], state[2], state[15],
            state[12], state[9], state[6], state[3]
        ];
        // UnSubBytes step
        state = state.map(UnSubByte);
        for (let i = 13; i > 0; i--) {
            // SubRoundKey step
            state = state.map((byte, j) => byte ^ W[(i * 16) + j]);
            // UnMixColumns step
            for (let offset = 0; offset < 16; offset += 4) {
                const state0 = state[0 + offset];
                const state1 = state[1 + offset];
                const state2 = state[2 + offset];
                const state3 = state[3 + offset];
                state[0 + offset] = RijndaelsMultiplication(14, state0) ^ RijndaelsMultiplication(11, state1) ^ RijndaelsMultiplication(13, state2) ^ RijndaelsMultiplication(9, state3);
                state[1 + offset] = RijndaelsMultiplication(9, state0) ^ RijndaelsMultiplication(14, state1) ^ RijndaelsMultiplication(11, state2) ^ RijndaelsMultiplication(13, state3);
                state[2 + offset] = RijndaelsMultiplication(13, state0) ^ RijndaelsMultiplication(9, state1) ^ RijndaelsMultiplication(14, state2) ^ RijndaelsMultiplication(11, state3);
                state[3 + offset] = RijndaelsMultiplication(11, state0) ^ RijndaelsMultiplication(13, state1) ^ RijndaelsMultiplication(9, state2) ^ RijndaelsMultiplication(14, state3);
            }
            // UnShiftRows step
            state = [
                state[0], state[13], state[10], state[7],
                state[4], state[1], state[14], state[11],
                state[8], state[5], state[2], state[15],
                state[12], state[9], state[6], state[3]
            ];
            // UnSubBytes step
            state = state.map(UnSubByte);
        }
        // SubRoundKey step
        state = state.map((byte, i) => byte ^ W[i]);
        return state;
    }
})(AES || (AES = {}));
/*
// console.clear();
// output
let numTests16: number = 0;
let succesfullTests16: number = 0;
let numTests32: number = 0;
let succesfullTests32: number = 0;
let numTests64: number = 0;
let succesfullTests64: number = 0;
function encDecTest(msg: string, W: number[], options: { type: AES.Type, Padding?: AES.Padding, IV?: string }): void {
    let header: string = "AES-" + AES.TypeToString(options.type);
    if ((options.type !== AES.Type.CTR) && (options.type !== AES.Type.GCM) && (options.type !== AES.Type.CBC_CTS) && (options.type !== AES.Type.PCBC_CTS) && (options.type !== AES.Type.CBC_RBT)) header += ", Padding = " + AES.PaddingToString(options.Padding!);
    if (options.type !== AES.Type.ECB) header += ", IV = \"" + options.IV! + "\"";
    console.log(header);
    const encrypted: number[] = AES.encrypt(msg, W, options);
    const encrypted16: string = bytesToBase16(encrypted);
    const encrypted32: string = bytesToBase32(encrypted);
    const encrypted64: string = bytesToBase64(encrypted);
    const decrypted16: string = AES.decrypt(base16ToBytes(encrypted16), W, options);
    const decrypted32: string = AES.decrypt(base32ToBytes(encrypted32), W, options);
    const decrypted64: string = AES.decrypt(base64ToBytes(encrypted64), W, options);
    numTests16++;
    numTests32++;
    numTests64++;
    console.log("    encrypted: \"" + encrypted16 + "\"");
    console.log("    encrypted: \"" + encrypted32 + "\"");
    console.log("    encrypted: \"" + encrypted64 + "\"");
    if (msg === decrypted16) {
        console.log("    Test succeeded, decrypted matched original string.");
        succesfullTests16++;
    } else
        console.log("    Test failed.");
    if (msg === decrypted32) {
        console.log("    Test succeeded, decrypted matched original string.");
        succesfullTests32++;
    } else
        console.log("    Test failed.");
    if (msg === decrypted64) {
        console.log("    Test succeeded, decrypted matched original string.");
        succesfullTests64++;
    } else
        console.log("    Test failed.");
}
function fullTest(msg: string, randKey: string, IV: string): void {
    console.log("\nmessage: \"" + msg + "\"");
    console.log("key: \"" + randKey + "\"\n");
    const K: number[] = stringToBytes(randKey);
    const W: number[] = AES.expandKey(K);
    encDecTest(msg, W, { type: AES.Type.ECB, Padding: AES.Padding.NoPadding });
    encDecTest(msg, W, { type: AES.Type.ECB, Padding: AES.Padding.PKCS7 });
    encDecTest(msg, W, { type: AES.Type.ECB, Padding: AES.Padding.DES });
    encDecTest(msg, W, { type: AES.Type.CTR, IV });
    // encDecTest(msg, W, { type: AES.Type.GCM, IV });
    encDecTest(msg, W, { type: AES.Type.CBC, Padding: AES.Padding.NoPadding, IV });
    encDecTest(msg, W, { type: AES.Type.CBC, Padding: AES.Padding.PKCS7, IV });
    encDecTest(msg, W, { type: AES.Type.CBC, Padding: AES.Padding.DES, IV });
    encDecTest(msg, W, { type: AES.Type.PCBC, Padding: AES.Padding.NoPadding, IV });
    encDecTest(msg, W, { type: AES.Type.PCBC, Padding: AES.Padding.PKCS7, IV });
    encDecTest(msg, W, { type: AES.Type.PCBC, Padding: AES.Padding.DES, IV });
    encDecTest(msg, W, { type: AES.Type.CBC_CTS, IV });
    encDecTest(msg, W, { type: AES.Type.PCBC_CTS, IV });
    encDecTest(msg, W, { type: AES.Type.CBC_RBT, IV });
    encDecTest(msg, W, { type: AES.Type.CFB, Padding: AES.Padding.NoPadding, IV });
    encDecTest(msg, W, { type: AES.Type.CFB, Padding: AES.Padding.PKCS7, IV });
    encDecTest(msg, W, { type: AES.Type.CFB, Padding: AES.Padding.DES, IV });
    encDecTest(msg, W, { type: AES.Type.OFB, Padding: AES.Padding.NoPadding, IV });
    encDecTest(msg, W, { type: AES.Type.OFB, Padding: AES.Padding.PKCS7, IV });
    encDecTest(msg, W, { type: AES.Type.OFB, Padding: AES.Padding.DES, IV });
}
const strs: string[] = [
    "aaaaaaaaaaaaaaa", // less than a full block
    "bbbbbbbbbbbbbbbb", // exactly one block
    "ccccccccccccccccc", // just more than one block
    "test message, this is a much longer message which also does not align with the 128 bit boundary"
];
for (let i = 0; i < strs.length; i++) {
    fullTest(strs[i]!, generateBase64Num(32), generateBase64Num(16));
}

console.log();
console.log((succesfullTests16 + succesfullTests32 + succesfullTests64) + "/" + (numTests16 + numTests32 + numTests64) + " or " + (Math.round((succesfullTests16 + succesfullTests32 + succesfullTests64) / (numTests16 + numTests32 + numTests64) * 10000) / 100) + "% of tests succeeded.");
console.log(succesfullTests16 + "/" + numTests16 + " or " + (Math.round(succesfullTests16 / numTests16 * 10000) / 100) + "% of base-16 tests succeeded.");
console.log(succesfullTests32 + "/" + numTests32 + " or " + (Math.round(succesfullTests32 / numTests32 * 10000) / 100) + "% of base-32 tests succeeded.");
console.log(succesfullTests64 + "/" + numTests64 + " or " + (Math.round(succesfullTests64 / numTests64 * 10000) / 100) + "% of base-64 tests succeeded.");
// */ 
// #endregion ./AES

// #region ./ECC
// https://www.youtube.com/watch?v=dCvB-mhkT0w
// ECC key of 384 bits is equivilant to the security of a 7680 bit RSA key
// a 384 bit ECC key is considered top secret level security by the us government
// A dot A -> B
// A dot B -> C
// D = -C
// A dot E -> D
// F = -E
// A dot G -> F
// ...
// iterate this process N times
// maximum value is the size of the key
// https://www.youtube.com/watch?v=F3zzNa42-tQ
// Calculating
//     y^2=x^3+ax+b
//     
//     A dot A -> B:
//         S = (3(A.x)^2+a)/(2A.y)
//         B.x = S^2-2A.x
//         B.y = 3SA.x-S^3-A.y
//     A dot B -> C:
//         S = (B.y-A.y)/(B.x-A.x)
//         C.x = S^2-A.x-B.x
//         C.y = SA.x-SC.x-A.y
// public values:
//     p: modulus value, or the domain of the curve
//     a,b: the curve parameters such that y^2 = x^3 + ax + b
//     G: the generator point such that nG = P
//     n: ord(G)
//     h: cofactor
// method:
//     alice creates private key a such that 1 <= a <= n-1
//     alice compute public key A such that A = aG
//     bob creates private key b such that 1 <= b <= n-1
//     bob compute public key B such that B = bG
//     alice sends bob her public key A
//     bob sends alice his public key B
//     alice and bob compute P = aB or bA
//     this results in alice and bob having the same point because abG = baG
// #region ./384FF

var FF;
(function (FF) {
    // constants
    FF.MAX32 = 0b11111111111111111111111111111111;
    FF.zero = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    FF.one = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
    FF.two = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
    FF.three = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3];
    FF.four = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4];
    FF.eight = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8];
    FF.MAX384 = [
        FF.MAX32, FF.MAX32,
        FF.MAX32, FF.MAX32,
        FF.MAX32, FF.MAX32,
        FF.MAX32, FF.MAX32,
        FF.MAX32, FF.MAX32,
        FF.MAX32, FF.MAX32
    ];
    // from, secp384r1, my reference being https://neuromancer.sk/std/secg/secp384r1#
    // p = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff
    FF.p = [
        FF.MAX32, FF.MAX32,
        FF.MAX32, FF.MAX32,
        FF.MAX32, FF.MAX32,
        FF.MAX32, 0b11111111111111111111111111111110,
        FF.MAX32, 0b00000000000000000000000000000000,
        0b00000000000000000000000000000000, FF.MAX32
    ];
    // operators
    function degree(a) {
        for (let i = 0; i < a.length; i++)
            for (let j = 31; j >= 0; j--)
                if ((a[i] >>> j) & 1)
                    return ((a.length - i - 1) * 32) + j;
        return 0;
    }
    FF.degree = degree;
    function isZero(a) {
        for (let i = 0; i < a.length; i++)
            if (a[i] != 0)
                return false;
        return true;
    }
    FF.isZero = isZero;
    // 1 if a > b
    // -1 if a < b
    // 0 if a == b
    function compareInPlace(A, B) {
        var _a, _b, _c, _d;
        for (let i = 0; i < A.length; i++) {
            if (((_a = A[i]) !== null && _a !== void 0 ? _a : 0) > ((_b = B[i]) !== null && _b !== void 0 ? _b : 0))
                return 1;
            if (((_c = A[i]) !== null && _c !== void 0 ? _c : 0) < ((_d = B[i]) !== null && _d !== void 0 ? _d : 0))
                return -1;
        }
        return 0;
    }
    function compare(A, B) {
        if (A.length > B.length) {
            const y = [...B];
            for (let i = 0; (A.length - y.length) > 0; i++)
                y.unshift(0);
            return compareInPlace(A, y);
        }
        else if (A.length > B.length) {
            const x = [...A];
            for (let i = 0; (B.length - x.length) > 0; i++)
                x.unshift(0);
            return compareInPlace(x, B);
        }
        else
            return compareInPlace(A, B);
    }
    FF.compare = compare;
    function rawLeftShift(A, B) {
        let output = [...A];
        rawLeftShiftEqual(output, B);
        return output;
    }
    function rawLeftShiftEqual(A, B) {
        const wordShifts = Math.floor(B / 32);
        for (let i = 0; i < wordShifts; i++)
            A.push(0b00000000000000000000000000000000);
        const bitShifts = B % 32;
        for (let j = 0; j < bitShifts; j++) {
            // do a single left shift b times
            let overflow = false;
            for (let i = A.length - 1; i >= 0; i--) {
                const lastOverflow = overflow;
                overflow = ((A[i] & 0b10000000000000000000000000000000) != 0); // will it overflow when left shifted
                A[i] <<= 1;
                if (lastOverflow)
                    A[i] += 0b00000000000000000000000000000001;
                A[i] &= FF.MAX32;
                A[i] >>>= 0;
            }
            if (overflow)
                A.unshift(0b00000000000000000000000000000001);
        }
    }
    function rightShift(a, b) {
        let output = [...a];
        rightShiftEqual(output, b);
        return output;
    }
    FF.rightShift = rightShift;
    function rightShiftEqual(a, b) {
        const wordShifts = Math.floor(b / 32);
        for (let i = 0; i < wordShifts; i++)
            a.pop();
        const bitShifts = b % 32;
        for (let j = 0; j < bitShifts; j++) {
            // do a single right shift b times
            let carry = false;
            for (let i = 0; i < a.length; i++) {
                const didCarry = carry;
                carry = (a[i] & 1) === 1; // if will it underflow when right shifted
                a[i] >>>= 1;
                if (didCarry)
                    a[i] |= 0b10000000000000000000000000000000; // after doing a right shift, it should never have a left most bit so you can safely just or instead of add
            }
        }
    }
    FF.rightShiftEqual = rightShiftEqual;
    function rawAdd(A, B) {
        const output = [];
        const x = [...A];
        const y = [...B];
        if (x.length > y.length)
            for (let i = 0; (x.length - y.length) > 0; i++)
                y.unshift(0);
        if (y.length > x.length)
            for (let i = 0; (y.length - x.length) > 0; i++)
                x.unshift(0);
        let overflow = false;
        for (let i = x.length - 1; i >= 0; i--) {
            output[i] = x[i] + y[i] + (overflow ? 1 : 0);
            if (overflow = (output[i] > FF.MAX32))
                output[i] = (output[i] & FF.MAX32) >>> 0;
        }
        if (overflow)
            output.unshift(0b00000000000000000000000000000001);
        return output;
    }
    function rawAddEqual(A, B) {
        const y = [...B];
        if (A.length > y.length)
            for (let i = 0; (A.length - y.length) > 0; i++)
                y.unshift(0);
        if (y.length > A.length)
            for (let i = 0; (y.length - A.length) > 0; i++)
                A.unshift(0);
        let overflow = false;
        for (let i = A.length - 1; i >= 0; i--) {
            A[i] = A[i] + y[i] + (overflow ? 1 : 0);
            if (overflow = (A[i] > FF.MAX32))
                A[i] = (A[i] & FF.MAX32) >>> 0;
        }
        if (overflow)
            A.unshift(0b00000000000000000000000000000001);
    }
    function rawSub(A, B) {
        let output = [];
        let x = [...A];
        let y = [...B];
        if (x.length > y.length)
            for (let i = 0; (x.length - y.length) > 0; i++)
                y.unshift(0);
        if (y.length > x.length)
            for (let i = 0; (y.length - x.length) > 0; i++)
                x.unshift(0);
        let subUnderflow = false;
        for (let i = x.length - 1; i >= 0; i--) {
            output[i] = x[i] - y[i] - (subUnderflow ? 1 : 0);
            // console.log("       " + x[i]! + " - " + y[i]! + " = " + ((output[i]! < 0) ? (MAX32 + output[i]! + 1) : output[i]!));
            if (subUnderflow = (output[i] < 0))
                output[i] = (FF.MAX32 + output[i] + 1) >>> 0;
        }
        if (subUnderflow)
            output.unshift(-1);
        while (output[0] === -1)
            rawAddEqual(output, FF.p);
        return output;
    }
    FF.rawSub = rawSub;
    function rawSubEqual(A, B) {
        let y = [...B];
        if (A.length > y.length)
            for (let i = 0; (A.length - y.length) > 0; i++)
                y.unshift(0);
        if (y.length > A.length)
            for (let i = 0; (y.length - A.length) > 0; i++)
                A.unshift(0);
        let subUnderflow = false;
        for (let i = A.length - 1; i >= 0; i--) {
            A[i] = A[i] - y[i] - (subUnderflow ? 1 : 0);
            if (subUnderflow = (A[i] < 0))
                A[i] = (FF.MAX32 + A[i] + 1) >>> 0;
        }
        if (subUnderflow)
            A.unshift(-1);
        while (A[0] === -1)
            rawAddEqual(A, FF.p);
    }
    function modP(A) {
        let output = [...A];
        while (compare(output, FF.p) !== -1) {
            const shift = Math.max(degree(output) - 384, 0); // 384 is the degree of p
            rawSubEqual(output, rawLeftShift(FF.p, shift));
        }
        return truncate384(output);
    }
    function modPEqual(A) {
        while (compare(A, FF.p) !== -1) {
            const shift = Math.max(degree(A) - 384, 0); // 384 is the degree of p
            rawSubEqual(A, rawLeftShift(FF.p, shift));
        }
    }
    function sub(A, B) {
        return modP(rawSub(A, B));
    }
    FF.sub = sub;
    function subEqual(A, B) {
        rawSubEqual(A, B);
        modPEqual(A);
    }
    FF.subEqual = subEqual;
    function add(A, B) {
        return modP(rawAdd(A, B));
    }
    FF.add = add;
    function addEqual(A, B) {
        rawAddEqual(A, B);
        modPEqual(A);
    }
    FF.addEqual = addEqual;
    function neg(a) {
        return FF.sub(FF.zero, a);
    }
    FF.neg = neg;
    function mult(a, b) {
        let output = [];
        let x = [...a];
        if (isZero(x))
            return x;
        let y = [...b];
        while (!isZero(y)) {
            if (y[y.length - 1] & 1)
                rawAddEqual(output, x);
            rawLeftShiftEqual(x, 1);
            rightShiftEqual(y, 1);
        }
        return modP(output);
    }
    FF.mult = mult;
    function integerDiv(dividend, divisor) {
        let quotient = [...FF.zero];
        if (isZero(divisor))
            throw new Error("div by 0");
        let degDivisor = degree(divisor);
        let remainder = [...dividend];
        let diff = Math.max(degree(remainder) - degDivisor - 1, 0);
        while (compare(remainder, divisor) !== -1) { // remainder >= divisor
            rawAddEqual(quotient, rawLeftShift(FF.one, diff));
            subEqual(remainder, rawLeftShift(divisor, diff));
            diff = Math.max(degree(remainder) - degDivisor - 1, 0);
        }
        return [quotient, remainder];
    }
    FF.integerDiv = integerDiv;
    function multInv(a) {
        // version of extended euclidean
        let x = [...a];
        let y = [...FF.p];
        let s2 = [...FF.one];
        let s1 = [...FF.zero];
        while (!isZero(y)) {
            let [q, r] = integerDiv(x, y);
            let s0 = sub(s2, mult(q, s1));
            // cycle variables
            x = y;
            y = r;
            s2 = s1;
            s1 = s0;
        }
        return s2;
    }
    FF.multInv = multInv;
    function modularDiv(dividend, divisor) {
        if (isZero(divisor))
            throw new Error("div by 0");
        return mult(dividend, multInv(divisor));
    }
    FF.modularDiv = modularDiv;
    function truncate384(a) {
        return a.slice(a.length - 12, a.length);
    }
    FF.truncate384 = truncate384;
    function toBase64(a) {
        return bytesToBase64(wordsToBytes(a));
    }
    FF.toBase64 = toBase64;
    function toBase16(a) {
        return bytesToBase16(wordsToBytes(a));
    }
    FF.toBase16 = toBase16;
})(FF || (FF = {}));
/*
console.log("0:");
FF.prnt(FF.zero);
console.log("1:");
FF.prnt(FF.one);
console.log("inf:");
FF.prnt(FF.inf);
console.log("  -------------------------------- -------------------------------- -------------------------------- -------------------------------- -------------------------------- --------------------------------");
console.log("0 + 0:");
FF.prnt(FF.add(FF.zero, FF.zero));
console.log("0 + 1:");
FF.prnt(FF.add(FF.zero, FF.one));
console.log("1 + 1:");
FF.prnt(FF.add(FF.one, FF.one));
console.log("inf + 1:");
FF.prnt(FF.add(FF.inf, FF.one));
console.log("MAX32 + 1:");
FF.prnt(FF.add([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, FF.MAX32 ], FF.one));
console.log("MAX32 + MAX32:");
FF.prnt(FF.add([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, FF.MAX32 ], [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, FF.MAX32 ]));
console.log("  -------------------------------- -------------------------------- -------------------------------- -------------------------------- -------------------------------- --------------------------------");
console.log("0 - 0:");
FF.prnt(FF.sub(FF.zero, FF.zero));
console.log("0 - 1:");
FF.prnt(FF.sub(FF.zero, FF.one));
console.log("1 - 1:");
FF.prnt(FF.sub(FF.one, FF.one));
console.log("1<<32 - 1:");
FF.prnt(FF.sub([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0 ], FF.one));
console.log("MAX32 - MAX32:");
FF.prnt(FF.sub([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, FF.MAX32 ], [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, FF.MAX32 ]));
console.log("  -------------------------------- -------------------------------- -------------------------------- -------------------------------- -------------------------------- --------------------------------");
const neg3_1: FF.number384 = FF.sub(FF.zero, FF.three);
const neg3_2: FF.number384 = FF.sub(FF.p, FF.three);
const neg3_3: FF.number384 = FF.neg(FF.three);
console.log("0 - 3:");
FF.prnt(neg3_1);
console.log("p - 3:");
FF.prnt(neg3_2);
console.log("neg(3):");
FF.prnt(neg3_3);
console.log("  -------------------------------- -------------------------------- -------------------------------- -------------------------------- -------------------------------- --------------------------------");
console.log("(0 - 3) + 3:");
FF.prnt(FF.add(neg3_1, FF.three));
console.log("(p - 3) + 3:");
FF.prnt(FF.add(neg3_2, FF.three));
console.log("neg(3) + 3:");
FF.prnt(FF.add(neg3_3, FF.three));
console.log("  -------------------------------- -------------------------------- -------------------------------- -------------------------------- -------------------------------- --------------------------------");
FF.prnt([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ]);
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000000000001 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000000000010 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000000000100 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000000001000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000000010000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000000100000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000001000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000010000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000000100000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000001000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000010000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000000100000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000001000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000010000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000000100000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000001000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000010000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000000100000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000001000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000010000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000000100000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000001000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000010000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000000100000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000001000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000010000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00000100000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00001000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00010000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b00100000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b01000000000000000000000000000000 ], 1));
console.log();
console.log("transition");
console.log();
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b10000000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b000001, 0b00000000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b000010, 0b00000000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b000100, 0b00000000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b001000, 0b00000000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b010000, 0b00000000000000000000000000000000 ], 1));
FF.prnt(FF.leftShift([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0b100000, 0b00000000000000000000000000000000 ], 1));
console.log("  -------------------------------- -------------------------------- -------------------------------- -------------------------------- -------------------------------- --------------------------------");
console.log(FF.degree([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]));
console.log(FF.degree([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ]));
console.log(FF.degree([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2 ]));
console.log(FF.degree([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4 ]));
console.log(FF.degree([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8 ]));
console.log(FF.degree([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16 ]));
for (let i = 1; i < 201; i++) {
    console.log(i, FF.toBase16(FF.modularDiv([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, i ], [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, i ])));
}
// */ 
// #endregion ./384FF

function pointDouble(A, a) {
    // https://en.wikipedia.org/wiki/Elliptic_curve_point_multiplication#Point_doubling
    let S = FF.modularDiv(FF.add(FF.mult(FF.three, FF.mult(A[0], A[0])), a), FF.mult(A[1], FF.two)); // s = (3a.x^2)/(2a.y)
    const x = FF.mult(S, S);
    FF.subEqual(x, FF.mult(A[0], FF.two)); // x = S^2 - 2A.x
    const y = FF.mult(S, FF.sub(A[0], x));
    FF.subEqual(y, A[1]); // y = s(a.x - x) - a.y
    return [FF.truncate384(x), FF.truncate384(y)];
}
function pointAdd(A, B) {
    // https://en.wikipedia.org/wiki/Elliptic_curve_point_multiplication#Point_addition
    const S = FF.modularDiv(FF.sub(B[1], A[1]), FF.sub(B[0], A[0])); // s = (b.y-a.y)/(b.x-a.x)
    const x = FF.mult(S, S);
    FF.subEqual(x, A[0]);
    FF.subEqual(x, B[0]); // x = S^2 - A.x - B.x
    FF.subEqual(A[0], x);
    const y = FF.mult(S, A[0]);
    FF.subEqual(y, A[1]);
    return [FF.truncate384(x), FF.truncate384(y)]; // y = s(a.x - x) - a.y
}
function multPoint(s, P, a) {
    // https://en.wikipedia.org/wiki/Elliptic_curve_point_multiplication#Double-and-add
    if (FF.isZero(s))
        throw new Error("multiply by 0");
    s = [...s];
    let res = undefined;
    let temp = P;
    while (!FF.isZero(s)) {
        if ((s[11] & 1) === 1) {
            res = ((res == undefined) ? [[...temp[0]], [...temp[1]]] : pointAdd(res, temp));
        }
        FF.rightShiftEqual(s, 1);
        temp = pointDouble(temp, a);
    }
    return res;
}

function pointFromHex(str) {
    if (str.length != 194)
        return [[...FF.zero], [...FF.zero]];
    return [bytesToWords(base16ToBytes(str.substring(2, 98))), bytesToWords(base16ToBytes(str.substring(98)))];
}
function pointToHex(p) {
    return "04" + (FF.toBase16(p[0]) + FF.toBase16(p[1]));
}
// from, secp384r1, my reference being https://neuromancer.sk/std/secg/secp384r1#
const a = bytesToWords(base16ToBytes("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFC")); // can also be calculated as p - 3
// const b: number384 = bytesToWords(base16ToBytes("B3312FA7E23EE7E4988E056BE3F82D19181D9C6EFE8141120314088F5013875AC656398D8A2ED19D2A85C8EDD3EC2AEF")) as number384;
// G = (0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7, 0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f)
const G = pointFromHex("04AA87CA22BE8B05378EB1C71EF320AD746E1D3B628BA79B9859F741E082542A385502F25DBF55296C3A545E3872760AB73617DE4A96262C6F5D9E98BF9292DC29F8F41DBD289A147CE9DA3113B5F0B8C00A60B1CE1D7E819D7A431D7C90EA0E5F");
function getPublic(privateStr) {
    const privateKey = bytesToWords(base16ToBytes(privateStr));
    for (let i = privateKey.length; i < 12; i++)
        privateKey.unshift(0);
    const publicKey = multPoint(privateKey, G, a);
    const publicStr = pointToHex(publicKey);
    return publicStr;
}
// #region ./Random


function xor(A, B) {
    return A.map((a, i) => (a ^ B[i]));
}
function time() {
    return (new Date()).getTime();
}
let seed = Array.from(self.crypto.getRandomValues(new Uint8Array(127))); // sha25 of current time
// https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator#Practical_schemes
function generateNum(bytes) {
    const num = [];
    while (num.length < bytes) {
        const D = wordsToBytes([time()]);
        const tmp = sha256Bytes(D);
        const x = sha256Bytes(xor(seed, tmp));
        for (let i = 0; i < x.length; i++)
            num.push(x[i]);
        seed = sha256Bytes(xor(x, tmp));
    }
    return num.slice(undefined, bytes);
}
function generateBase16Num(bytes) {
    return bytesToBase16(generateNum(bytes));
}
function generateBase32Num(bytes) {
    return bytesToBase32(generateNum(bytes));
}
function generateBase64Num(bytes) {
    return bytesToBase64(generateNum(bytes));
}
// #endregion ./Random

function getKeyPair() {
    const privateStr = generateBase16Num(48);
    const publicStr = getPublic(privateStr);
    return [privateStr, publicStr];
}
/*
getPublic("0000000000000000000000000000000051897B64E85C3F714BBA707E867914295A1377A7463A9DAE8EA6A8B914246319", "04687767250027023EA16A100A5013B11204D23C297FA7CA3089178B1F135C3044BFF9D12DD1DEF8AFBC8107B41B3B246F837B9FA9E3235E5284BC537A536E82226676F81D2E4C8C5159E643914802B00DB33C3DF15FD7E4E514295A1DF1088451");
getPublic("EEBB53AA624A244B5C845547C4320F121FF3AF21C26899E62F2E5D76A454816153EC66FC2A2C2BBDF37A020D545F8CF0", "04D9836A82760F45D06A9FDA48BB12E1D9A48122DCA082E43769009041B709CA8E381E8FFDDAB2CBE690E6012E702AA1D470F85DEF97AD3CCFA1F24BE8E39A4E9F7A842D49EEAD042BEBBAD2DB418D84D6DE475CB05FCA91209F20F665837FE46D");
getPublic("18E72E1FEC79E4FA8DFDB6AB71DF62F53CBF89719731049E711C1F44E89D0215069E520B150EAD804D9067799050DCB4", "0457E5C9DBC63879C995142FDA853C5BC28EF63C65CC0A721A1EF33A9A5E94B3E183000BC1BA5459DB4F76A42863836A9881CE3C06804736DDD47F15D62F9BE301C9097597957B7DB75A83E89F319CC5C20501F8A49B440A398434CF7EC582709D");
getPublic("2DE5DFEC9B51E4F7E1FFD5D7F311C0A0FCFE2C81E811A47A4B349618C8F2F1B0F59FA17BFA1ED6A34AF3760B4D42EF61", "0424A34BD70A56F5065D18DC28FC93B0CFD80B746C4EA6F66AEFD1CE71BD850885420D0420EE2504A3DB1A04D659504A1D4615D647395578D5081AED9DD4588D9DE2494123A4E91DFD891A41995FC7D1538825197E06D072B0EC810F43384F316A");
getPublic("6F2D24918E5701476FCF829D408B8FAF49FD9053125CFF01F8332C1C7659B34210763C64678516AB6CD38ADF7F31FE26", "048F9DDA54813ADEF962CFEAA8383D46F762E69D5A3AAACC5B2B8B25E6AEE3A2AC7C786908CF72C8A3E4BC280B5561D225C87C1D3BF4B4B24B724D1D21A22EB5E9D2F73297EB1F4C57553E51D1C7C6B5B64694AF78AEBE9635E2F0498B40F1DA91");
getPublic("1B19C2BAC56F31419F9E8A9CD964780F9DC33DD937D235937418EF505015D127B8CB20C27E9AD3A4FC823063E3D1DD88", "04609AC5B5CE2E994E64DF6FD1B32C0F6D73EE9D66BAA5A2C36CAF65E61255986C01AF71F315FECE284B28760583EAF40CBCE7A3D799240F296C0F734EF1566BD3EBFE93E1FA3E81E175E224D6272934FFA7FD0C5CA82B411D3E42235D309C5B45");
getPublic("B89619D9AFA5CA9F029B9085B90D07B01A95F0E2D7038C1E920AA9E8275B543F32364D33CEAC58D2A5241AC1E9F88EC8", "044BEE33CE2C9C00DE059E00D1E84FAF6CA38455891C83C23A2C2508CCC18AF586B48B4DFEEC5E81BDA514D67EC338CC6580E7C4CB51F4C08F415B3DEC02F5E5CB03C34A57E5636072BF7BD4B389124FB3BA1CF98A9CB9612640580B04EF8E4713");
getPublic("AF7717738E02958B14160CA44277E0147F7512FB3B6FA467B89C1CAAC745C638F7E5655F6BBA228643D3A4F583BC91A2", "0434DCF910DD69D5FCB1801C13FCF8586A97F87D5D3F72C90125107B634A5070EB3C4EEF6486238AEDE4B31F8952C6C2A8B0BDF018053D47BF0F4F1CCE0B71920D3F4FA0A6F8CFA5888650B512C75AD822B9188FE0CA5076167BC35DD89AD6ECAD");
getPublic("820288643FF080E65461050F5233F9B41BF12925451EE10D82F6525969EDA13FA45A93CDD99CCE81CE17E5DA42FDB956", "0449933D3A1A6E4E0B0C6DBE2D96D444C81EF1AEDE308B63E008A756D73FE22C3DB5C6795BC14E8D3A08BEF2CA3F622842B466D92A7804605E094D682CE26A00821E125F4193B4368877D2A6217F5A256CCD80E5699BE229769781E451E9C62EEC");
getKeyPair();
getKeyPair();
getKeyPair();
getKeyPair();
for (let i = 0; i < keyPairs.length; i++) {
    for (let j = i; j < keyPairs.length; j++) {
        const iJ: point = multPoint(keyPairs[i]![0], keyPairs[j]![1], a);
        const jI: point = multPoint(keyPairs[j]![0], keyPairs[i]![1], a);
        for (let k = 0; k < 2; k++)
            for (let l = 0; l < 12; l++)
                if (iJ[k]![l]! != jI[k]![l]!)
                    console.log("\nERROR\n");
        console.log("shared key " + i + "-" + j + ":", pointToHex(iJ));
    }
}
for (let i = 0; i < keyPairs.length; i++) {
    for (let j = i; j < keyPairs.length; j++) {
        for (let k = j; k < keyPairs.length; k++) {
            const ijK: point = multPoint(keyPairs[i]![0], multPoint(keyPairs[j]![0], keyPairs[k]![1], a), a);
            const jkI: point = multPoint(keyPairs[j]![0], multPoint(keyPairs[k]![0], keyPairs[i]![1], a), a);
            const kiJ: point = multPoint(keyPairs[k]![0], multPoint(keyPairs[i]![0], keyPairs[j]![1], a), a);
            for (let k = 0; k < 2; k++)
                for (let l = 0; l < 12; l++)
                    if ((ijK[k]![l]! != jkI[k]![l]!) || (jkI[k]![l]! != kiJ[k]![l]!) || (kiJ[k]![l]! != ijK[k]![l]!))
                        console.log("\nERROR\n");
            console.log("shared key " + i + "-" + j + "-" + k + ":", pointToHex(ijK));
        }
    }
} // */ 
// #endregion ./ECC
