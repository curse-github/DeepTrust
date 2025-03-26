export function generateUUID(): string {
    let a = new Date().getTime();// Timestamp
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        let b = Math.random() * 16;// random number between 0 and 16
        b = (a + b) % 16 | 0;
        a = Math.floor(a / 16);
        return (c === "x" ? b : ((b & 0x3) | 0x8)).toString(16);
    });
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
        config[sec] = config[sec] || {};
        config[sec][name] = value;
    }
}

import { Application, Request, Response } from "express";
export function getCookies(req: Request): {[key: string]: string} {
    if (req.headers.cookie != undefined && req.headers.cookie !== "") {
        return Object.fromEntries(req.headers.cookie.split("; ").map((el: string) => (el || "").split("=")));
    } return {};
}

// #region sha256
// hash algorithm for strings
export function sha256(str: string): string {
    return bytesToHex(sha256Bytes(strToBytes(str)));
}
// constants used in sha256
let h: number[] = [];
let k: number[] = [];
const maxWord: number = Math.pow(2, 32);
let primeCounter: number = 0;
let isComposite: {[key: number]: boolean} = {};
for (let candidate: number = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
        for (let i: number = 0; i < 313; i += candidate)
            isComposite[i] = false;
        h[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
}
// actual hash algorithm
function sha256Bytes(bytes: number[]): number[] {
    let i: number, j: number;
    let bitLength: number = bytes.length * 8;
    let hash: number[] = h;
    bytes = bytes.slice();
    bytes.push(0x80);
    while (((bytes.length % 64) - 56) != 0) bytes.push(0);
    let words: number[] = bytesToWords(bytes);
    words.push(0);
    words.push(bitLength);
    for (j = 0; j < words.length;) {
        let w = words.slice(j, j += 16);
        for (let i = 16; i < 64; i++) {
            const w15 = w[i - 15];
            const s0 = (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3));
            const w2 = w[i - 2];
            const s1 = (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10));
            w[i] = w[i - 16] + s0 + w[i - 7] + s1;
        }
        let wHash = hash.slice();
        for (i = 0; i < 64; i++) {
            let a: number = wHash[0], b: number = wHash[1], c: number = wHash[2], e: number = wHash[4];
            const S0: number = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
            const S1: number = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
            const ch: number = ((e & wHash[5]) ^ ((~e) & wHash[6]));
            const maj: number = ((a & b) ^ (a & c) ^ (b & c));
            let temp1 = wHash[7] + S1 + ch + k[i] + w[i];
            wHash = [ (temp1 + S0 + maj) | 0, wHash[0] | 0, wHash[1] | 0, wHash[2] | 0, (wHash[3] + temp1) | 0, wHash[4] | 0, wHash[5] | 0, wHash[6] | 0 ];
        }
        for (i = 0; i < 8; i++)
            hash[i] = (hash[i] + wHash[i]) | 0;
    }
    return wordsToBytes(hash);
}
// helpers
function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
}
function strToBytes(str: string): number[] {
    let output: number[] = [];
    for (let i: number = 0; i < str.length; i++)
        output[i] = str.charCodeAt(i) & 255;
    return output;
}
function bytesToHex(bytes: number[]): string {
    return bytes.map((el: number) => el.toString(16).padStart(2, "0")).join("");
}
function bytesToWords(bytes: number[]): number[] {
    let words: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
        words[i >> 2] |= bytes[i] << (((3 - i) % 4) * 8);
    }
    return words;
}
function wordsToBytes(words: number[]): number[] {
    let bytes: number[] = [];
    for (let i: number = 0; i < words.length; i++)
        for (let j: number = 3; j + 1; j--)
            bytes.push((words[i] >> (j * 8)) & 255);
    return bytes;
}
// #endregion sha256