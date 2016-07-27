import BaseProvider, {Request} from './Base'
import {autobind} from 'core-decorators'
import * as _ from 'lodash'

@autobind
export default class XiamiMusicProvider extends BaseProvider {
    get providerName() {
        return 'Xiami'
    }

    async getSongInfo(songId: string): Promise<Wukong.ISong> {
        const song = await this.getSongInfoOnline(songId)
        await this.save(song)
        return _.omit(song, ['meta', 'detail']) as Wukong.ISong
    }

    private async getSongInfoOnline(songId: string): Promise<Wukong.ISong & {meta: string, detail: boolean}> {
        if (!songId) return null
        const res = await this.sendRequest({
            url: `http://www.xiami.com/song/playlist/id/${songId}/object_name/default/object_id/0/cat/json`,
            json: true
        })
        if (!res.status) return null
        const onlineSong: any = res.data.trackList[0]
        const song = {} as Wukong.ISong
        song.album = onlineSong.album_name
        song.artist = onlineSong.artist
        song.artwork = onlineSong.album_pic
        song.bitrate = 128000
        song.file = ''
        song.length = onlineSong.length * 1000
        song.lyrics = await this.getSongLyrics(onlineSong.lyric_url)
        song.siteId = this.providerName
        song.songId = songId
        song.title = onlineSong.songName
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
        for (let i = 0; i != arr.length; ++i) {
            const x = i % rows
            const y = Math.floor(i / rows)
            let position: number
            if (x <= rightRows) position = x * (columns + 1) + y
            else position = rightRows * (columns + 1) + (x - rightRows) *columns + y
            ans.push(arr[position])
        }
        //Fixme: replace to HQ music not working.
        return decodeURIComponent(ans.join('')).replace(/\^/g, '0')//.replace('//m5', '//m6').replace('l.mp3', 'h.mp3')
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

    public async getPlayingUrl(songId: string, overseas: boolean): Promise<string> {
        const song = await this.load(songId, true)
        return this.parsePlayingUrl(JSON.parse(song.meta).location)
    }

    private async searchSongsOnlne(token: string, key: string): Promise<Array<Wukong.ISong>> {
        const res: any[] = await this.sendRequest({
            url: 'http://www.xiami.com/web/search-songs',
            json: true,
            qs: {
                key: key,
                _xiamitoken: token
            }
        })
        return res.map((it: any) => {
            return {
                songId: it.id,
                siteId: this.providerName,
                title: it.title,
                album: ' ',
                artist: it.author,
                artwork: it.cover,
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

    // TODO
    public async getSongList(songListId: string): Promise<Wukong.ISongList> { return null }
}
