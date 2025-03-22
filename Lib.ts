export function generateUUID(): string {
    var a = new Date().getTime();// Timestamp
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var b = Math.random() * 16;// random number between 0 and 16
        b = (a + b) % 16 | 0;
        a = Math.floor(a / 16);
        return (c === "x" ? b : ((b & 0x3) | 0x8)).toString(16);
    });
}
export function sha256(ascii: any) {
    function rightRotate(value: any, amount: any) {
        return (value >>> amount) | (value << (32 - amount));
    }
    
    var mathPow: any = Math.pow;
    var maxWord: any = mathPow(2, 32);
    var i: any;
    var j: any; // Used as a counters across the whole file
    var result: any = "";

    var words: any = [];
    var asciiBitLength: any = ascii.length * 8;
    
    //* caching results is optional - remove/add slash from front of this line to toggle
    // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
    // (we actually calculate the first 64, but extra values are just ignored)
    var hash: any = [];
    // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
    var k: any = [];
    var primeCounter: any = k.length;
    /* /
    var hash = [], k = [];
    var primeCounter = 0;
    //*/

    var isComposite: any = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    
    ascii += "\x80"; // Append Ƈ' bit (plus zero padding)
    while ((ascii.length % 64) - 56) ascii += "\x00"; // More zero padding
    for (i = 0; i < ascii.length; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return; // ASCII check: only accept characters in range 0-255
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    
    // process each chunk
    for (j = 0; j < words.length;) {
        var w: any = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
        var oldHash: any = hash;
        // This is now the undefinedworking hash", often labelled as variables a...g
        // (we have to truncate as well, otherwise extra entries at the end accumulate
        hash = hash.slice(0, 8);
        
        for (i = 0; i < 64; i++) {
            // Expand the message into 64 words
            // Used below if
            var w15: any = w[i - 15], w2 = w[i - 2];

            // Iterate
            var a: any = hash[0];
            var e: any = hash[4];
            var temp1: any = hash[7];
            temp1 += (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)); // S1
            temp1 += ((e & hash[5]) ^ ((~e) & hash[6])); // ch
            temp1 += k[i];
            // Expand the message schedule if needed
            temp1 += (w[i] = (i < 16) ? w[i] : (
                w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) // s0+s1
            ) | 0);
            // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
            var temp2: any = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)); // S0
            temp2 += ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); // maj
            
            hash = [ (temp1 + temp2) | 0 ].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
            hash[4] = (hash[4] + temp1) | 0;
        }
        
        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b: any = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : "") + b.toString(16);
        }
    }
    return result;
}

import { readFileSync } from "fs";
export let config: {[sec: string]: {[key: string]: string}} = {};
export function readConfig(): void {
    config = {};
    const configIni: string[] = readFileSync("./config.ini").toString()// read config file
        .split("\r")
        .join("")// remove carriage returns
        .split("\n");
    let sec: string = "";
    for (let i = 0; i < configIni.length; i++) {
        const line: string = configIni[i];
        if (line.startsWith("[")) { sec = line.split("[")[1].split("]")[0].trim(); continue; }
        if (line.startsWith(";")) continue;
        const lineSplt: string[] = line.split("=");
        const name: string = lineSplt.shift()!;
        const value: string = lineSplt.join("=").trim();
        config[sec] = config[sec] || [];
        config[sec][name] = value;
    }
}