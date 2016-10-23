import * as crypto from 'crypto'
import * as _ from 'lodash'
import * as Request from 'request'
import * as CryptoJS from 'crypto-js'
import BaseMusicProvider from './Base'
const moment = require('moment-timezone')
const serverConfig = require('../../server-config.json')
const bigint = require('BigInt')

moment.tz.setDefault('Asia/Shanghai')

class NeteaseCloudMusicProvider extends BaseMusicProvider {
    get providerName() {
        return 'netease-cloud-music'
    }
    static apiPrefix = serverConfig['netease-cloud-music-api-prefix']
    static binCdn = serverConfig['netease-cloud-music-bin-cdn']
    static imageSize = 400

    // from: https://github.com/Zazama/Netease-Downloader/blob/master/index.html
    static encryptDfsId(id: string): string {
        const byte1 = '3go8&$8*3*3h0k(2)2'
        let byte2 = id.toString()
        let byte3: string
        let i: number
        byte3 = byte2.split('').map((code, index) => {
            return String.fromCharCode(code.charCodeAt(0) ^ byte1.charCodeAt(index % byte1.length))
        }).join('')
        let md5hash = crypto.createHash('md5').update(byte3).digest().toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
        return md5hash
    }

    // from: https://github.com/darknessomi/musicbox/wiki/%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90%E6%96%B0%E7%89%88WebAPI%E5%88%86%E6%9E%90%E3%80%82
    static modulus = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
    static nonce = '0CoJUm6Qyw8W8jud'
    static pubKey = '010001'
    static createSecretKey(size: number): string {
        const possible = '012345679abcdef'
        let ret = ''
        for (let i = 0; i < size; i++) {
            ret += possible.charAt(Math.floor(Math.random() * possible.length))
        }
        return ret
    }

    static aesEncrypt(text: string, secKey: string): string {
        let pad = 16 - text.length % 16
        for (let i = 0; i < pad; i++) {
            text += String.fromCharCode(pad)
        }
        let key = CryptoJS.enc.Utf8.parse(secKey)
        let iv = CryptoJS.enc.Utf8.parse('0102030405060708')
        let textBytes = CryptoJS.enc.Utf8.parse(text)
        let enc = CryptoJS.AES.encrypt(textBytes, key, {
            iv,
            mode: CryptoJS.mode.CBC
        })
        return enc.toString()
    }

    static hexify(text: string): string {
        return text.split('').map((c) => c.charCodeAt(0).toString(16)).join('')
    }

    static rsaEncrypt(text: string, pubKey: string, modulus: string): string {
        text = text.split('').reverse().join('')
        let base = bigint.str2bigInt(NeteaseCloudMusicProvider.hexify(text), 16)
        let exp = bigint.str2bigInt(pubKey, 16)
        let mod = bigint.str2bigInt(modulus, 16)
        let bigNumber = NeteaseCloudMusicProvider.expmod(base, exp, mod)
        let rs = bigint.bigInt2str(bigNumber, 16)
        return NeteaseCloudMusicProvider.leftPad(rs, 256).toLowerCase()
    }

    static leftPad(num: number, length: number): string {
        let s = num.toString()
        while (s.length < length) s = '0' + s
        return s
    }

    static expmod(base: string, exp: string, mymod: string): string {
        if (bigint.equalsInt(exp, 0) === 1) return bigint.int2bigInt(1, 10)
        if (bigint.equalsInt(bigint.mod(exp, bigint.int2bigInt(2, 10)), 0)) {
            let newexp = bigint.dup(exp)
            bigint.rightShift_(newexp, 1)
            let result = bigint.powMod(NeteaseCloudMusicProvider.expmod(base, newexp, mymod), [2, 0], mymod)
            return result
        }
        else {
            let result = bigint.mod(bigint.mult(NeteaseCloudMusicProvider.expmod(base, bigint.sub(exp, bigint.int2bigInt(1, 10)), mymod), base), mymod)
            return result
        }
    }

    static encryptRequest(data: any): any {
        let text = JSON.stringify(data)
        let secKey = NeteaseCloudMusicProvider.createSecretKey(16)
        let encText = NeteaseCloudMusicProvider.aesEncrypt(NeteaseCloudMusicProvider.aesEncrypt(text, NeteaseCloudMusicProvider.nonce), secKey)
        let encSecKey = NeteaseCloudMusicProvider.rsaEncrypt(secKey, NeteaseCloudMusicProvider.pubKey, NeteaseCloudMusicProvider.modulus)
        return {
            params: encText,
            encSecKey
        }
    }

    private songSearchCache: Map<string, Wukong.ISong[]> = new Map()

    constructor() {
        super()
        this.RequestOptions.headers['Referer'] = 'http://music.163.com/'
        this.RequestOptions.headers['Origin'] = 'http://music.163.com'
        if (serverConfig.useCookie) {
            this.RequestOptions.headers['Cookie'] = serverConfig.useCookie['NeteaseCloudMusic']
        }
        this.RequestOptions.method = 'POST'
    }

    private getTraditionalMusicUrl(fId: string) {
        return `http://m2.music.126.net/${NeteaseCloudMusicProvider.encryptDfsId(fId)}/${fId}.mp3`
    }

    private getImageUrl(fId: string) {
        return `http://p3.music.126.net/${NeteaseCloudMusicProvider.encryptDfsId(fId)}/${fId}.jpg?param=${NeteaseCloudMusicProvider.imageSize}y${NeteaseCloudMusicProvider.imageSize}`
    }

    private convertToSongApiV1(rawArray: Array<any>, isDetailed: boolean = false): Array<Wukong.ISong> {
        return rawArray.map((o: any) => {
            let albumUrl = o.album && o.album.picUrl,
                albumPicId = o.album && o.album.picId
            if (albumPicId) {
                albumUrl = this.getImageUrl(albumPicId)
            }
            let musicUrl = o.mp3Url
            let musicUrlDomain = musicUrl ? /http:\/\/(.+?)\//.exec(musicUrl)[0] : 'http://m2.music.126.net/'
            let bitrate = 0
            for (let musicType of ['hMusic', 'mMusic', 'lMusic', 'bMusic']) {
                if (o[musicType]) {
                    musicUrl = `${musicUrlDomain}${NeteaseCloudMusicProvider.encryptDfsId(o[musicType].dfsId)}/${o[musicType].dfsId}.${o[musicType].extension}`
                    bitrate = o[musicType].bitrate
                    break
                }
            }
            if (NeteaseCloudMusicProvider.binCdn && musicUrl) {
                musicUrl = musicUrl.replace(/^http:\/\//, NeteaseCloudMusicProvider.binCdn + '/')
            }
            const songLength = o.duration
            const songId = o.id.toString()
            return {
                siteId: this.providerName,
                songId,
                title: o.name,
                file: musicUrl,
                artist: o.artists && o.artists.map((a: any) => a.name).join('，'),
                album: o.album && o.album.name,
                artwork: this.getFiles(albumUrl),
                webUrl: this.getWebUrl(songId),
                length: songLength,
                bitrate
            }
        })
    }

    private convertToSongApiV2(rawArray: Array<any>, isDetailed: boolean = false): Array<Wukong.ISong> {
        return rawArray.map((o: any) => {
            let albumUrl = o.al && o.al.picUrl,
                albumPicId = o.al && o.al.pic_str
            if (albumPicId) {
                albumUrl = this.getImageUrl(albumPicId)
            }
            let musicUrl: string
            let musicUrlDomain = musicUrl ? /http:\/\/(.+?)\//.exec(musicUrl)[0] : 'http://m2.music.126.net/'
            let bitrate = 0
            let musicAvail: boolean = false
            for (let musicType of ['h', 'm', 'l', 'b']) {
                if (o[musicType] && o[musicType].fid) {
                    musicAvail = true
                    musicUrl = `${musicUrlDomain}${NeteaseCloudMusicProvider.encryptDfsId(o[musicType].fid)}/${o[musicType].fid}.mp3`
                    bitrate = o[musicType].br
                    break
                }
            }
            if (NeteaseCloudMusicProvider.binCdn && musicUrl) {
                musicUrl = musicUrl.replace(/^http:\/\//, NeteaseCloudMusicProvider.binCdn + '/')
            }
            const songLength = o.dt
            const songId = o.id.toString()
            if (musicAvail) {
                return {
                    siteId: this.providerName,
                    songId: songId,
                    title: o.name,
                    file: null,
                    artist: o.ar && o.ar.map((a: any) => a.name).join('，'),
                    album: o.al && o.al.name,
                    artwork: this.getFiles(albumUrl),
                    webUrl: this.getWebUrl(songId),
                    length: songLength,
                    bitrate
                }
            } else {
                return null
            }
        }).filter((o) => <any>o)
    }

    private getFiles(url: string): Wukong.IFiles {
        return {
            file: url,
            fileViaCdn: url.replace(/^http:\/\//, NeteaseCloudMusicProvider.binCdn + '/') + '&cachecdn=1'
        }
    }

    private convertLyric(rawData: any, translate: boolean, withTimeline: boolean): Wukong.ILyric {
        return {
            withTimeline,
            translate,
            lyric: rawData.lyric
        }
    }

    private async getSongLyrics(songId: string): Promise<Wukong.ILyric[]> {
        let body = NeteaseCloudMusicProvider.encryptRequest({
            id: parseInt(songId),
            lv: -1,
            tv: -1,
            csrf_token: ''
        })
        let resObject = await this.sendRequest({
            uri: `${NeteaseCloudMusicProvider.apiPrefix}/weapi/song/lyric`,
            qs: {
                csrf_token: ''
            },
            form: body
        })
        if (resObject.code === 200) {
            if (resObject.lrc && resObject.lrc.lyric) {
                const lyrics: Wukong.ILyric[] = []
                let withTimeline: boolean = true
                if (resObject.qfy === true && !this.checkLyricWithTimeline(resObject.lrc.lyric)) {
                    withTimeline = false
                }
                lyrics.push(this.convertLyric(resObject.lrc, false, withTimeline))
                if (resObject.tlyric && resObject.tlyric.lyric) {
                    lyrics.push(this.convertLyric(resObject.tlyric, true, withTimeline))
                }
                return lyrics
            } else {
                return undefined
            }
        } else {
            return undefined
        }
    }

    private mapToThirdPartyUser(rawData: any): Wukong.IThirdPartyUser {
        return {
            siteId: this.providerName,
            userId: rawData.userId.toString(),
            name: rawData.nickname,
            signature: rawData.signature,
            gender: rawData.gender,
            avatar: rawData.avatarUrl,
            songListCount: rawData.playlistcount,
            followers: rawData.followeds,
            follows: rawData.follows
        }
    }

    public async searchSongs(searchKey: string, offset: number = 0, limit: number = 30): Promise<Wukong.ISong[]> {
        searchKey = searchKey.trim()
        const key = `search-${searchKey}-offset-${offset}-limit-${limit}`
        if (this.songSearchCache.has(key)) {
            return this.songSearchCache.get(key)
        }

        try {
            let body = NeteaseCloudMusicProvider.encryptRequest({
                s: searchKey,
                offset,
                limit,
                type: '1'   // 单曲
            })
            let resObject = await this.sendRequest({
                uri: `${NeteaseCloudMusicProvider.apiPrefix}/weapi/cloudsearch/get/web`,
                qs: {
                    csrf_token: ''
                },
                form: body
            })
            console.log(resObject.result.songs)
            let songList = this.convertToSongApiV2(resObject.result.songs, false)
            this.songSearchCache.set(key, songList)
            return songList
        } catch (err) {
            console.error(`search error`, err)
            // should be more detailed info after we use a logger manager
            return []
        }
    }

    public async getSongInfo(songId: string): Promise<Wukong.ISong> {
        const key = `song-${songId}`
        let song: Wukong.ISong = await this.load(songId, true)
        if (!song) {
            let body = NeteaseCloudMusicProvider.encryptRequest({
                id: songId,
                c: JSON.stringify([{id: songId}]),
                csrf_token: ''
            })
            let resObject = await this.sendRequest({
                uri: `${NeteaseCloudMusicProvider.apiPrefix}/weapi/v3/song/detail`,
                qs: {
                    csrf_token: ''
                },
                form: body
            })
            song = this.convertToSongApiV2(resObject.songs, true)[0]
            try {
                song.lyrics = await this.getSongLyrics(songId)
            } catch (err) {
                console.error(err)
            }
            Object.assign(song, { detail: true })
            song.mvId = resObject.songs[0].mv.toString()
            await this.save(song)
            if (!song) return null
        } else {
            song.artwork = this.getFiles(song.artwork.file)
        }
        if (Number(song.mvId)) {
            song.mvWebUrl = `http://music.163.com/mv?id=${song.mvId}`
        }
        return song
    }

    public async getPlayingUrl(songId: string): Promise<Wukong.IFiles> {
        const song = await this.getSongInfo(songId)
        let body = NeteaseCloudMusicProvider.encryptRequest({
            ids: [songId],
            br: song.bitrate,
            csrf_token: ''
        })
        let resObject = await this.sendRequest({
            uri: `${NeteaseCloudMusicProvider.apiPrefix}/weapi/song/enhance/player/url`,
            qs: {
                csrf_token: ''
            },
            form: body
        })
        return this.getFiles(resObject.data[0].url + '?semi_expi=' + resObject.data[0].expi.toString())
    }

    public async getMvUrl(mvId: string): Promise<Wukong.IFiles> {
        let resObject = await this.sendRequest({
            uri: `${NeteaseCloudMusicProvider.apiPrefix}/api/mv/detail/`,
            qs: {
                id: mvId,
                type: 'mp4'
            }
        })
        const videoes = resObject.data.brs
        return {
            file: videoes['1080'] || videoes['720'] || videoes['480'] || videoes['240'] || null
        }
    }

    protected async sendRequest(options: Request.Options): Promise<any> {
        return JSON.parse(await super.sendRequest(options))
    }

    private mapToSongList(rawData: any, withSongs: boolean = false): Wukong.ISongList {
        return {
            siteId: this.providerName,
            songListId: rawData.id.toString(),
            creator: this.mapToThirdPartyUser(rawData.creator),
            name: rawData.name,
            playCount: rawData.playCount,
            description: rawData.description,
            createTime: (new Date(rawData.createTime)).toISOString(),
            cover: this.getImageUrl(rawData.coverImgId),
            songs: withSongs ? this.convertToSongApiV2(rawData.tracks) : null,
            songCount: rawData.trackCount
        }
    }

    public async getSongList(songListId: string): Promise<Wukong.ISongList> {
        const body = NeteaseCloudMusicProvider.encryptRequest({
            id: songListId.toString(),
            offset: '0',
            total: 'true',
            limit: '1000',
            n: '1000',
            csrf_token: ''
        })
        const resObject = await this.sendRequest({
            uri: `${NeteaseCloudMusicProvider.apiPrefix}/weapi/v3/playlist/detail`,
            qs: {
                csrf_token: ''
            },
            form: body
        })
        if (resObject.code === 200) {
            return this.mapToSongList(resObject.playlist, true)
        } else {
            throw new Error('NeteaseCloudMusicProvider getSongList: ret code not 200')
        }
    }

    public async getUserSongLists(thirdPartyUserId: string): Promise<Wukong.ISongList[]> {
        const body = NeteaseCloudMusicProvider.encryptRequest({
            uid: thirdPartyUserId.toString(),
            offset: '0',
            limit: '1001',
            csrf_token: ''
        })
        const resObject = await this.sendRequest({
            uri: `${NeteaseCloudMusicProvider.apiPrefix}/weapi/user/playlist`,
            qs: {
                csrf_token: ''
            },
            form: body
        })
        if (resObject.code === 200) {
            return resObject.playlist.map((it: any) => this.mapToSongList(it, false))
        } else {
            throw new Error('NeteaseCloudMusicProvider getUserSongLists: ret code not 200')
        }
    }

    public async searchUsers(searchKey: string): Promise<Wukong.IThirdPartyUser[]> {
        const body = NeteaseCloudMusicProvider.encryptRequest({
            s: searchKey.toString(),
            type: '1002',
            offset: '0',
            total: 'true',
            limit: '30',
            csrf_token: ''
        })
        const resObject = await this.sendRequest({
            uri: `${NeteaseCloudMusicProvider.apiPrefix}/weapi/cloudsearch/get/web`,
            qs: {
                csrf_token: ''
            },
            form: body
        })
        if (resObject.code === 200) {
            return resObject.result.userprofiles.map((it: any) => this.mapToThirdPartyUser(it))
        } else {
            throw new Error('NeteaseCloudMusicProvider searchUsers: ret code not 200')
        }
    }

    public getWebUrl(songId: string): string {
        return `http://music.163.com/song?id=${songId}`
    }
}

export default NeteaseCloudMusicProvider
