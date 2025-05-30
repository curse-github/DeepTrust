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
/*export */function base16ToBytes(str) {
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
/*export */function bytesToBase16(bytes) {
    let base16 = "";
    // convert each chunk of 8 bits to two base16 characters
    for (let i = 0; i < bytes.length; i++)
        base16 += (bytes[i] & 0xFF).toString(16).padStart(2, "0");
    // if the length is now zero, return a single 0
    if (base16.length == 0)
        return "0";
    return base16.toUpperCase();
}
/*export */function generateBase16Num(length = 64) {
    // generate "length" base64 characters
    let base16 = "";
    for (let i = 0; i < length; i++)
        base16 += base16Chars[Math.floor(Math.random() * 16)];
    // if the length is now zero, return a single 0
    if (base16.length == 0)
        return "0";
    return base16;
}
// base 32 functions
const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/*export */function base32ToBytes(str) {
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
/*export */function bytesToBase32(bytes) {
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
/*export */function generateBase32Num(length = 52) {
    // generate "length" base32 characters
    let base32 = "";
    for (let i = 0; i < length; i++)
        base32 += base32Chars[Math.floor(Math.random() * 32)];
    // if the length is now zero, return a single A(0) padded with "="
    const base32Len = base32.length;
    if (base32Len == 0)
        return "A===";
    // pad with "=" to the nearest multiple of 4
    return padEndToMod(base32, 8, "=");
}
// base 64 functions
const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/*export */function base64ToBytes(str) {
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
/*export */function bytesToBase64(bytes) {
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
/*export */function generateBase64Num(length = 43) {
    // generate "length" base64 characters
    let base64 = "";
    for (let i = 0; i < length; i++)
        base64 += base64Chars[Math.floor(Math.random() * 64)];
    // if the length is now zero, return a single A(0) padded with "="
    const base64Len = base64.length;
    if (base64Len == 0)
        return "A===";
    // pad with "=" to the nearest multiple of 4
    return padEndToMod(base64, 4, "=");
}
// string functions
/*export */function stringToBytes(str) {
    // convert each char to a byte in the array
    const bytes = [];
    for (let i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i));
    return bytes;
}
/*export */function bytesToString(bytes) {
    // convert each char to a byte in the array
    let str = "";
    for (let i = 0; i < bytes.length; i++)
        str += String.fromCharCode((bytes[i] & 0xFF));
    return str;
}
// 32 bit word functions
/*export */function bytesToWords(bytes) {
    let words = [];
    for (let i = 0; i < bytes.length; i++)
        words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << ((3 - (i % 4)) * 8));
    return words.map((word) => (word >>> 0));
}
/*export */function wordsToBytes(words) {
    let bytes = [];
    for (let i = 0; i < words.length * 4; i++)
        bytes.push((words[i >> 2] >> ((3 - (i % 4)) * 8)) & 0xFF);
    return bytes;
}

// https://en.wikipedia.org/wiki/Finite_field_arithmetic#Rijndael's_(AES)_finite_field
// also help from ChatGPT
// function using Rijndaels Finite Field or GF(2^8) or GF(2)[x]/(x^8 + x^4 + x^3 + x + 1) where x^8 + x^4 + x^3 + x + 1 = 0b100011011 or 0x11b
/*export */function RijndaelsDegree(poly) {
    // console.log("degree(" + poly + ")");
    for (let i = 8; i >= 0; i--) {
        if ((poly & (1 << i)) !== 0) {
            return i;
        }
    }
    return -1;
}
/*export */function RijndaelsMultiplication(a, b) {
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
/*export */function RijndaelsDivision(dividend, divisor) {
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
/*export */function RijndaelsExtendedEuclidean(a) {
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

function leftRotate(value, bitSize, amount) {
    if (bitSize === 32)
        return ((value >>> (bitSize - amount)) | (value << amount)) >>> 0;
    else if (bitSize < 32)
        return ((value >>> (bitSize - amount)) | (value << amount)) & ((1 << bitSize) - 1);
    return 0;
}
/*export */var AES;
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