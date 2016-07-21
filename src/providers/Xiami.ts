import BaseProvider, {Request} from './Base'
import {autobind} from 'core-decorators'
import * as _ from 'lodash'

@autobind
export default class XiamiMusicProvider extends BaseProvider {
    get providerName() {
        return 'Xiami' 
    }

    async getSongInfo(songId: string): Promise<Wukong.ISong> {
        return await this.load(songId)
    }

    async searchSongs(keywords: string, offset: number = 0, limit: number = 30): Promise<Array<Wukong.ISong>> {
        if (!keywords) return []
        const token = await this.getXiamiToken()
        const songs = await this.searchSongsOnlne(token, keywords)
        const data = songs.map(it => Object.assign(it, {meta: JSON.stringify({url: it.file})}))
        await this.bulkSave(data)
        return songs
    }

    async getSongLyrics(songId: string): Promise<Wukong.ILyric[]> {
        return null
    }

    public async getPlayingUrl(songId: string, overseas: boolean): Promise<string> {
        return JSON.parse((await this.load(songId)).meta).url
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
                file: it.src
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
}
