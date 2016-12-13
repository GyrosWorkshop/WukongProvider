/// <reference path="../../typings/index.d.ts" />

import * as rp from 'request-promise'
import * as Request from 'request'
import * as _ from 'lodash'
// import * as LRU from 'lru-cache'
import sequelize, {Song, Lyric} from '../db'

abstract class BaseMusicProvider {
    /**
     * set provider name, eg: netease-cloud-music
     */
    abstract get providerName(): string

    // private previousErrorSongRequest = LRU({
    //     max: 50,
    //     maxAge: 1000 * 3

    // })

    protected RequestOptions: Request.CoreOptions = {
        headers: {
            'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
            'Accept' : '*/*',
            'Accept-Language' : 'zh-CN,zh;q=0.8,en-US;q=0.6,en;q=0.4,ja;q=0.2'
        }
    }

    protected sendRequest(options: Request.Options): PromiseLike<any> {
        const defaultOption = _.merge(JSON.parse(JSON.stringify(this.RequestOptions)), options)
        return rp(defaultOption)
    }

    /**
     * Currently only new one created. (update not available)
     */
    protected async save(song: Wukong.ISong & {meta?: string, detail?: boolean}): Promise<void> {
        const saveSong: Wukong.ISong = _.cloneDeep(song)
        if (saveSong.artwork && !_.isString(saveSong.artwork)) saveSong.artwork = (<any>saveSong.artwork).file
        let dbSong = await Song.findOne({
            where: {
                songId: saveSong.songId,
                siteId: saveSong.siteId
            }
        }) as any
        if (dbSong) {
            await Song.update(saveSong, {
                where: {
                    songId: saveSong.songId,
                    siteId: saveSong.siteId
                }
            })
        } else {
            dbSong = await Song.create(saveSong)
        }

        if (saveSong.lyrics) {
            const songKey = dbSong.getDataValue('id')
            await Lyric.destroy({
                where: {
                    songId: songKey
                }
            })
            await Lyric.bulkCreate(saveSong.lyrics.map(it => Object.assign(it, { songId: songKey })))
        }
    }

    protected async bulkSave(songs: (Wukong.ISong & {meta?: string, detail?: boolean})[]): Promise<void> {
        try {
            await Promise.all(songs.map(song => Song.upsert(song)))
        } catch (e) {
            // tolerate
            console.error('bulkSave err', e)
        }
    }

    protected async load(songId: string, needDetail?: boolean): Promise<Wukong.ISong> {
        const data = await Song.findOne({
            where: {
                songId: songId,
                siteId: this.providerName
            },
            include: [
                {
                    model: Lyric,
                    as: 'lyrics'
                }
            ]
        }) as any
        if (data && ((needDetail && data.dataValues.detail) || !needDetail)) {
            return this.formatRow(data.dataValues)
        } else {
            return null
        }
    }

    protected checkLyricWithTimeline(lyric: string) {
        return !!/\[\d+:\d+\.\d+\]/.exec(lyric)
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
