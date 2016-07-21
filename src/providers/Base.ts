/// <reference path="../../typings/index.d.ts" />

import * as rp from 'request-promise'
import * as Request from 'request'
import * as _ from 'lodash'
import sequelize, {Song, Lyric} from '../db'



abstract class BaseMusicProvider {
    /**
     * set provider name, eg: netease-cloud-music
     */
    abstract get providerName(): string

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
        let dbSong = await Song.findOne({
            where: {
                songId: song.songId,
                siteId: song.siteId
            }
        }) as any
        if (dbSong) {
            await Song.update(song, {
                where: {
                    songId: song.songId,
                    siteId: song.siteId
                }
            })
        } else {
            dbSong = await Song.create(song);
        }

        if (song.lyrics) {
            const songKey = dbSong.getDataValue('id')
            await Lyric.destroy({
                where: {
                    songId: songKey
                }
            })
            await Lyric.bulkCreate(song.lyrics.map(it => Object.assign(it, { songId: songKey })))
        }
    }

    protected async bulkSave(songs: Wukong.ISong[]): Promise<void> {
        try {
            await Song.bulkCreate(_.uniqBy(songs, ['siteId', 'songId']))
        } catch (e) {
            // tolerate
            console.error('bulkSave err', e)
        }
    }

    protected async load(songId: string): Promise<Wukong.ISong & {meta: string}> {
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
        if (data) return data.dataValues;
        else return null;
    }

    abstract async searchSongs(searchKey: string, offset: number, limit: number): Promise<Array<Wukong.ISong>>
    abstract async searchSongs(searchKey: string): Promise<Array<Wukong.ISong>>
    abstract async getSongInfo(songId: string): Promise<Wukong.ISong>
    abstract async getPlayingUrl(songId: string, ovserseas: boolean): Promise<string>
}

export default BaseMusicProvider
export {Request}