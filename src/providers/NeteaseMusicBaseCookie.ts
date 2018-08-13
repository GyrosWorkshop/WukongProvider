// Thanks: https://github.com/Binaryify/NeteaseCloudMusicApi/pull/291/files

function randomString(pattern: string, length: number) {
    return Array.apply(null, {length: length}).map(() => (pattern[Math.floor(Math.random() * pattern.length)])).join('')
}
const jsessionid = randomString('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKMNOPQRSTUVWXYZ\\/+', 176) + ':' + (new Date).getTime()
const nuid = randomString('0123456789abcdefghijklmnopqrstuvwxyz', 32)
const baseCookie: string = `JSESSIONID-WYYY=${jsessionid}; _iuqxldmzr_=32; _ntes_nnid=${nuid},${(new Date).getTime()}; _ntes_nuid=${nuid}`
export default baseCookie
