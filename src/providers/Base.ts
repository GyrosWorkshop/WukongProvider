import * as rp from 'request-promise'
import * as Request from 'request'
import * as _ from 'lodash'
import { RedisClient } from 'redis';
import * as Bluebird from 'bluebird'

abstract class BaseMusicProvider {
    /**
     * Return the provider's name, e.g. netease-cloud-music.
     */
    abstract get providerName(): string

    redis: RedisClient

    protected RequestOptions: Request.CoreOptions = {
        headers: {
            'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
            'Accept' : '*/*',
            'Accept-Language' : 'zh-CN,zh;q=0.8,en-US;q=0.6,en;q=0.4,ja;q=0.2'
        }
    }

    protected sendRequest(options: Request.OptionsWithUri): PromiseLike<any> {
        const defaultOption = _.merge(_.cloneDeep(this.RequestOptions), options)
        console.info(`Send request by ${this.providerName}: ${options.uri}`)
        return rp(defaultOption)
    }

    private getSongRedisKey(siteId: string, songId: string): string {
        return `song:${siteId}.${songId}`
    }

    protected save(song: Wukong.ISong & {meta?: string, detail?: boolean}) {
        try {
            if (!song.available)
                return console.info(`save nothing for unavailable ${song.siteId}.${song.songId}`)

            const saveSong: Wukong.ISong = _.cloneDeep(song)
            if (saveSong.artwork && !_.isString(saveSong.artwork)) saveSong.artwork = (<any>saveSong.artwork).file
            const key = this.getSongRedisKey(song.siteId, song.songId)
            // Cache song for 30d.
            this.redis.set(key, JSON.stringify(saveSong), 'EX', 3600 * 24 * 30)
        } catch (e) {
            // tolerate
            console.error(`save err ${song.siteId}.${song.songId}`, e)
        }
    }

    protected bulkSave(songs: (Wukong.ISong & {meta?: string, detail?: boolean})[]) {
        try {
            songs.forEach(song => this.save(song))
        } catch (e) {
            // tolerate
            console.error(`bulkSave err`, e)
        }
    }

    protected async load(songId: string, needDetail?: boolean): Promise<Wukong.ISong> {
        try {
            const key = this.getSongRedisKey(this.providerName, songId)
            const data = JSON.parse(await Bluebird.promisify(this.redis.get, {
                context: this.redis
            })(key))
            if (data) {
                console.info(`Cache HIT for ${key}`)
                if (needDetail) {
                    return data
                } else {
                    data.lyrics = []
                    return data
                }
            } else {
                console.info(`Cache MISS for ${key}`)
                return null
            }
        } catch (e) {
            // tolerate
            console.error(`load err ${this.providerName}.${songId}`, e)
            return null
        }
    }

    protected isLrcFormat(text: string) {
        return /\[[0-9]+\:[0-9]+(\.[0-9]+)?\]/.test(text)
    }

    protected parseAudioQuality(bitrate: Number) {
        let quality: string = null
        if (bitrate >= 500000) {
            quality = 'lossless'
        } else if (bitrate >= 320000) {
            quality = 'high'
        } else if (bitrate >= 192000) {
            quality = 'medium'
        } else if (bitrate > 0) {   // actually 128000
            quality = 'low'
        }
        return quality
    }

    abstract async searchSongs(searchKey: string, withCookie?: string): Promise<Array<Wukong.ISong>>
    abstract async getSongInfo(songId: string, withCookie?: string): Promise<Wukong.ISong>
    abstract async getPlayingUrl(songId: string, withCookie?: string, sendPlayLog?: boolean): Promise<Wukong.IFile[]>
    abstract async getMvUrl(mvId: string): Promise<Wukong.IFile>
    abstract async getSongList(songListId: string, withCookie?: string): Promise<Wukong.ISongList>
    abstract async getUserSongLists(thirdPartyUserId: string, withCookie?: string): Promise<Wukong.ISongList[]>
    abstract async searchUsers(searchKey: string, withCookie?: string): Promise<Wukong.IThirdPartyUser[]>

    abstract getWebUrl(songId: string): string
    private formatRow(song: Wukong.ISong | any): Wukong.ISong {
        if (_.isString(song.artwork)) song.artwork = { file: song.artwork }
        song.webUrl = this.getWebUrl(song.songId)
        return song
    }
}

export default BaseMusicProvider
export {Request}
