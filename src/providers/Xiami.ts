import BaseProvider, {Request} from './Base'
import {autobind} from 'core-decorators'
import * as _ from 'lodash'
import {AllHtmlEntities} from 'html-entities'

@autobind
export default class XiamiMusicProvider extends BaseProvider {
    get providerName() {
        return 'Xiami'
    }

    private entities: AllHtmlEntities
    private sessionCookie: string = ''

    constructor() {
        super()
        this.entities = new AllHtmlEntities()
    }

    private getCookieHeader(cookie: string | any): any {
        if (cookie) {
            if (_.isString(cookie)) {
                const validCookieMatch = /member_auth=[^;]+/.exec(cookie)
                if (validCookieMatch) return {
                    Cookie: String(validCookieMatch)
                }
            } else if (cookie.Cookie) {
                return cookie
            }
        }
        return {}
    }

    async getSongInfo(songId: string, withCookie?: string): Promise<Wukong.ISong> {
        let song: Wukong.ISong = await this.load(songId, true)
        let headers = this.getCookieHeader(withCookie)
        if (!song) {
            song = await this.getSongInfoOnline(songId, headers)
            if (!song) {
                throw new Error('获取歌曲信息失败')
            }
            await this.save(song)
        }
        return _.omit(song, ['meta', 'detail']) as Wukong.ISong
    }

    private async getSongInfoOnline(songId: string, cookie?: string | any): Promise<Wukong.ISong & {meta: string, detail: boolean}> {
        if (!songId) return null
        const headers = this.getCookieHeader(cookie)
        const uri = `http://www.xiami.com/song/playlist/id/${songId}/object_name/default/object_id/0/cat/json`
        const res = await this.sendRequest({
            uri,
            json: true,
            headers
        })
        if (!res.status || _.isNull(res.data.trackList)) {
            throw new Error('XiamiProvider: 获取错误-' + res.message)
        }
        const onlineSong: any = res.data.trackList[0]
        const song = {} as Wukong.ISong
        song.siteId = this.providerName
        song.songId = songId
        song.title = onlineSong.songName
        song.album = onlineSong.album_name
        song.artist = onlineSong.singers.replace(/;/g, ' / ')
        song.artwork = {
            file: onlineSong.album_pic
        }
        song.webUrl = this.getWebUrl(songId)
        song.length = onlineSong.length * 1000
        try {
            const onlineSongAudio = this.getApproriateAudio(onlineSong.allAudios)
            song.length = onlineSongAudio.length
            song.bitrate = onlineSongAudio.rate * 1000
        } catch (e) {
            console.error('getSongInfoOnline: song bitrate parse failed', onlineSong)
        }
        song.lyrics = await this.getSongLyrics(onlineSong.lyric_url)
        return Object.assign(song, {meta: JSON.stringify(onlineSong), detail: true})
    }

    private getApproriateAudio(audios: any[]): any {
        return audios.filter(it => it.audioQualityEnum !== 'LOSSLESS')
            .reduce((acc: any, cur: any) => (acc.rate > cur.rate ? acc : cur))
    }

    // https://gist.github.com/buoge/a3a0774e6e19a5c2ed820331ce4a08dd
    private parsePlayingUrl(meta: any): string {
        const location = meta.location
        const arr = location.split('')
        const rows = parseInt(arr.shift())
        const columns = Math.floor(arr.length / rows)
        const rightRows = arr.length % rows
        let iteration = 0
        const ans: Array<string> = []
        for (let i = 0; i !== arr.length; ++i) {
            const x = i % rows
            const y = Math.floor(i / rows)
            let position: number
            if (x <= rightRows) position = x * (columns + 1) + y
            else position = rightRows * (columns + 1) + (x - rightRows) * columns + y
            ans.push(arr[position])
        }
        // Fixme: replace to HQ music not working.
        return decodeURIComponent(ans.join('')).replace(/\^/g, '0')// replace('//m5', '//m6').replace('l.mp3', 'h.mp3')
    }

    async searchSongs(keywords: string, withCookie?: string): Promise<Array<Wukong.ISong>> {
        if (!keywords) return []
        const token = await this.getXiamiToken()
        const songs = await this.searchSongsOnlne(token, keywords)
        return songs
    }

    async getSongLyrics(uri: string): Promise<Wukong.ILyric[]> {
        try {
            const res = await this.sendRequest({uri})
            return [{
                lrc: this.isLrcFormat(res),
                translated: false,
                data: res
            } as Wukong.ILyric]
        } catch (e) {
            console.error('xiami getSongLyrics ' + uri, e)
            return null
        }
    }

    public async getPlayingUrl(songId: string, withCookie?: string): Promise<Wukong.IFile[]> {
        const song = await this.getSongInfoOnline(songId, withCookie)
        const meta = JSON.parse(song.meta)
        return [{
            file: this.parsePlayingUrl(meta),
            audioQuality: 'low',
            audioBitrate: 128000
        }]
    }

    public async getMvUrl(mvId: string): Promise<Wukong.IFile> {
        return null
    }

    private async searchSongsOnlne(token: string, key: string): Promise<Array<Wukong.ISong>> {
        const res: any = await this.sendRequest({
            uri: 'http://api.xiami.com/web',
            json: true,
            qs: {
                key,
                v: '2.0',
                app_key: 1,
                page: 1,
                limit: 50,
                _ksTS: Date.now(),
                callback: '',
                r: 'search/songs',
                _xiamitoken: token
            },
            headers: {
                'Referer': 'http://m.xiami.com/'
            }
        })
        if (!res || res.state) return []
        return this.mapToSongs(res.data.songs)
    }

    private mapToSongs(rawArray: any[]): Wukong.ISong[] {
        return rawArray.map((it: any) => {
            it.album_logo = it.album_logo.replace('1.jpg', '4.jpg')     // high resolution
            return {
                available: true,
                siteId: this.providerName,
                songId: it.song_id.toString(),
                title: it.song_name,
                album: it.album_name,
                artist: it.artist_name,
                artwork: {
                    file: it.album_logo
                },
                webUrl: this.getWebUrl(it.song_id),
                length: it.length * 1000,
                bitrate: null
            }
        })
    }

    private async getXiamiToken(): Promise<string> {
        const jar = Request.jar()
        const res = await this.sendRequest({
            uri: 'http://www.xiami.com/web/login',
            jar
        })
        const cookies = jar.getCookieString('http://xiami.com').split('=')[1]
        return cookies
    }

    public getWebUrl(songId: string): string {
        return `http://www.xiami.com/song/${songId}`
    }

    public async getSongList(songListId: string, withCookie?: string): Promise<Wukong.ISongList> {
        // Xiami Collection, 虾米个人精选集
        const token = await this.getXiamiToken()

        const res = JSON.parse(await this.sendRequest({
            uri: 'http://api.xiami.com/web?v=2.0&app_key=1&r=collect/detail&type=collectId',
            qs: {
                id: songListId
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/600.1.23 (KHTML, like Gecko) Version/12.0 Mobile/23D549 Safari/16182.331',
                'Referer': 'http://m.xiami.com/',
                'Proxy-Connection': 'keep-alive',
                'X-Requested-With': 'XMLHttpRequest',
                'X-FORWARDED-FOR': '42.156.140.237',
                'CLIENT-IP': '42.156.140.237',
                'Cookie': `_xiamitoken=${token}; ${this.getCookieHeader(withCookie).Cookie}`
            }
        }))
        if (res.state !== 0) {
            throw new Error('Xiami getSongList failed: ' + res.state + ', ' + res.message + ', request_id=' + res.request_id)
        }
        return {
            siteId: this.providerName,
            songListId: res.data.list_id.toString().toString(),
            creator: this.mapToThirdPartyUser(res.data),
            name: res.data.collect_name,
            playCount: res.data.play_count,
            createTime: (new Date(res.data.gmt_create * 1000)).toISOString(),
            cover: res.data.logo.replace('1.jpg', '4.jpg'),
            songCount: res.data.songs_count,
            songs: this.mapToSongs(res.data.songs)
        }
    }

    private mapToThirdPartyUser(rawData: any): Wukong.IThirdPartyUser {
        return {
            siteId: this.providerName,
            userId: rawData.user_id.toString(),
            name: rawData.user_name,
            avatar: rawData.author_avatar.replace('1.jpg', '3.jpg')  // user avatar highest solution: 3
        }
    }

    // TODO
    public async getUserSongLists(thirdPartyUserId: string, withCookie?: string): Promise<Wukong.ISongList[]> { return null }

    // TODO
    public async searchUsers(searchKey: string, withCookie?: string): Promise<Wukong.IThirdPartyUser[]> { return null }
}
