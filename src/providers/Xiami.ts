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

    constructor() {
        super()
        this.entities = new AllHtmlEntities()
    }

    async getSongInfo(songId: string): Promise<Wukong.ISong> {
        let song: Wukong.ISong = await this.load(songId, true)
        if (!song) {
            song = await this.getSongInfoOnline(songId)
            if (!song) {
                throw new Error('获取歌曲信息失败')
            }
            await this.save(song)
        }
        return _.omit(song, ['meta', 'detail']) as Wukong.ISong
    }

    private async getSongInfoOnline(songId: string): Promise<Wukong.ISong & {meta: string, detail: boolean}> {
        if (!songId) return null
        const res = await this.sendRequest({
            url: `http://www.xiami.com/song/playlist/id/${songId}/object_name/default/object_id/0/cat/json`,
            json: true
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
        song.artist = onlineSong.artist || this.entities.decode(onlineSong.artist_name)
        song.artwork = {
            file: onlineSong.album_pic
        }
        song.webUrl = this.getWebUrl(songId)
        song.bitrate = 128000
        song.length = onlineSong.length * 1000
        song.music = null
        song.lyrics = await this.getSongLyrics(onlineSong.lyric_url)
        return Object.assign(song, {meta: JSON.stringify(onlineSong), detail: true})
    }

    // https://gist.github.com/buoge/a3a0774e6e19a5c2ed820331ce4a08dd
    private parsePlayingUrl(location: string): string {
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

    async searchSongs(keywords: string, offset: number = 0, limit: number = 30): Promise<Array<Wukong.ISong>> {
        if (!keywords) return []
        const token = await this.getXiamiToken()
        const songs = await this.searchSongsOnlne(token, keywords)
        return songs
    }

    async getSongLyrics(url: string): Promise<Wukong.ILyric[]> {
        try {
            const res = await this.sendRequest({
                url: url
            })
            return [{
                translate: false,
                withTimeline: this.checkLyricWithTimeline(res),
                lyric: res
            } as Wukong.ILyric]
        } catch (err) {}
        return null
    }

    public async getPlayingUrl(songId: string): Promise<Wukong.IFiles> {
        const song = await this.load(songId, true) as Wukong.ISong & { meta: any }
        return {
            file: this.parsePlayingUrl(JSON.parse(song.meta).location)
        }
    }

    public async getMvUrl(mvId: string): Promise<Wukong.IFiles> {
        return null
    }

    private async searchSongsOnlne(token: string, key: string): Promise<Array<Wukong.ISong>> {
        const res: any = await this.sendRequest({
            url: 'http://api.xiami.com/web?v=2.0&app_key=1&key=it%27s%20so%20easy&page=1&limit=50&_ksTS=1459930568781_153&callback=jsonp154&r=search/songs',
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
        return res.data.songs.map((it: any) => {
            it.album_logo = it.album_logo.replace('1.jpg', '4.jpg')     // high resolution
            return {
                songId: it.song_id,
                siteId: this.providerName,
                title: it.song_name,
                album: it.album_name,
                artist: it.artist_name,
                artwork: {
                    file: it.album_logo
                },
                webUrl: this.getWebUrl(it.song_id),
                bitrate: 128000,
                length: 0.0
            } as Wukong.ISong
        })
    }

    private async getXiamiToken(): Promise<string> {
        const jar = Request.jar()
        const res = await this.sendRequest({
            url: 'http://www.xiami.com/web/login',
            jar: jar
        })
        const cookies = jar.getCookieString('http://xiami.com').split('=')[1]
        return cookies
    }

    public getWebUrl(songId: string): string {
        return `http://www.xiami.com/song/${songId}`
    }

    // TODO
    public async getSongList(songListId: string): Promise<Wukong.ISongList> { return null }

    // TODO
    public async getUserSongLists(thirdPartyUserId: string): Promise<Wukong.ISongList[]> { return null }

    // TODO
    public async searchUsers(searchKey: string): Promise<Wukong.IThirdPartyUser[]> { return null }
}
