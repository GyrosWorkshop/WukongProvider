/// <reference path="../../typings/index.d.ts" />

import * as rp from 'request-promise'
import * as Request from 'request'
import * as _ from 'lodash'
import sequelize, {Song, Lyric} from '../db'



abstract class BaseMusicProvider {
    /**
     * set provider name, eg: netease-cloud-music
     */
    static providerName: string

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
    protected async save(song: Wukong.ISong): Promise<void> {
        let dbSong = await Song.findOrCreate({
            where: {
                songId: song.songId,
                siteId: song.siteId
            },
            defaults: song
        }) as any
        if (song.lyrics) {
            const songKey = dbSong[0].getDataValue('id')
            await Lyric.destroy({
                where: {
                    songId: songKey
                }
            })
            await Lyric.bulkCreate(song.lyrics.map(it => Object.assign(it, { songId: songKey })))
        }
    }

    protected async bulkSave(songs: Wukong.ISong[]): Promise<void> {
        await Song.bulkCreate(songs, {
            ignoreDuplicates: true
        })
    }

    protected async load(songId: string): Promise<Wukong.ISong> {
        return await Song.findOne({
            where: {
                songId: songId,
                siteId: BaseMusicProvider.providerName
            },
            include: [
                {
                    model: Lyric,
                    as: 'lyric'
                }
            ]
        }) as Wukong.ISong
    }

    abstract async searchSongs(searchKey: string, offset: number, limit: number): Promise<Array<Wukong.ISong>>
    abstract async searchSongs(searchKey: string): Promise<Array<Wukong.ISong>>
    abstract async getSongInfo(songId: string): Promise<Wukong.ISong>
    abstract async getPlayingUrl(songId: string, ovserseas: boolean): Promise<string>
}

export default BaseMusicProvider
