/// <reference path="../../typings/index.d.ts" />

import * as rp from 'request-promise'
import BaseProvider from './Base'
import {autobind} from 'core-decorators'
import * as _ from 'lodash'
import * as jsdom from 'jsdom'
import {AllHtmlEntities} from 'html-entities'

@autobind
export default class QQMusicProvider extends BaseProvider {
    get providerName() {
        return 'QQMusic'
    }

    private entities: AllHtmlEntities

    constructor() {
        super()
        this.RequestOptions.headers['Referer'] = 'http://y.qq.com/'
        this.entities = new AllHtmlEntities()
    }

    private async getSongLyrics(songId: string): Promise<Wukong.ILyric[]> {
        const jsonpCallback = 'MusicJsonCallback_lrc'
        const qs = {
            songmid: songId,
            format: 'jsonp',
            inCharset: 'utf-8',
            outCharset: 'utf-8',
            notice: 0,
            platform: 'yqq',
            jsonpCallback,
            needNewCode: 0
        }
        try {
            const resObject = JSON.parse((await this.sendRequest({
                url: 'http://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric.fcg',
                qs
            })).trim().replace(jsonpCallback + '(', '').replace(/\)$/, ''))
            if (!(resObject.retcode === 0 && resObject.code === 0 && resObject.subcode === 0 && resObject.lyric)) {
                return undefined
            }
            const lyrics: Wukong.ILyric[] = []
            const lyricsContent = Buffer.from(resObject.lyric, 'base64').toString()
            lyrics.push({
                withTimeline: !!/\[\d+:\d+\.\d+\]/.exec(lyricsContent),
                translate: false,
                lyric: lyricsContent
            })
            return lyrics
        } catch (e) {
            console.error(e)
            return undefined
        }
    }

    async getSongInfo(songId: string): Promise<Wukong.ISong> {
        // Fixme: get music from baseinfo API.
        let song: Wukong.ISong = await this.load(songId, true)
        if (!song) {
            song = await this.getSingleSongOnline(songId)
            Object.assign(song, { detail: true })
            await this.save(song)
        }
        return song
    }

    async searchSongs(keywords: string, offset: number = 0, limit: number = 30): Promise<Array<Wukong.ISong>> {
        const result = await this.sendRequest({
            url: 'http://s.music.qq.com/fcgi-bin/music_search_new_platform',
            qs: {
                t: 0,
                n: limit,
                aggr: 1,
                cr: 1,
                loginUin: 0,
                format: 'json',
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'jqminiframe.json',
                needNewCode: 0,
                p: offset / limit,
                catZhida: 0,
                remoteplace: 'sizer.newclient.next_song',
                w: keywords
            }
        })
        const songs = this.mapToISong(JSON.parse(result).data.song.list).filter(it => !_.isUndefined(it))
        return songs
    }

    private mapToISong(data: Array<any>): Array<Wukong.ISong> {
        return data.map(this.mapToSongSingle)
    }

    async getSingleSongOnline(songId: string): Promise<Wukong.ISong> {
        const song = {} as Wukong.ISong
        const baseInfo = await this.getBaseInfo(songId)
        song.album = baseInfo.album.name
        song.artist = baseInfo.singer.map((it: any) => it.name).join(', ')
        song.title = baseInfo.title
        song.length = Math.floor(parseFloat(baseInfo.interval) * 1000)
        song.siteId = this.providerName
        song.songId = songId
        song.music = null
        song.artwork = { file: this.getArtworkUrl(baseInfo.album.mid) }
        song.webUrl = this.getWebUrl(songId)
        song.bitrate = this.getMaxAvailBitrate(baseInfo.file).bitrate
        song.lyrics = await this.getSongLyrics(songId)
        return song
    }

    private getMaxAvailBitrate(baseInfoFile: any): any {
        const bitrateKeyOrder = [
            [ 320000, 'size_320mp3', 'mp3', 'M800' ],
            // [ 192000, 'size_192ogg', 'ogg' ],
            // [ 192000, 'size_192aac', 'aac' ],
            [ 128000, 'size_128mp3', 'mp3', 'M500' ],
            // [  96000, 'size_96aac',  'aac' ],
            // [  48000, 'size_48aac',  'aac' ],
            [ 128000, 'size_128',    'm4a', 'C200' ]
        ]
        for (let it of bitrateKeyOrder) {
            if (baseInfoFile[it[1]]) {
                return {
                    bitrate: it[0],
                    key: it[1],
                    size: baseInfoFile[it[1]],
                    extension: it[2],
                    prefix: it[3]
                }
            }
        }
    }

    private mapToSongSingle(data: any): Wukong.ISong {
        // TODO: 搜索 七里香 里面有个格式不同
        if (data.f.indexOf('|') === -1) {
            return undefined
        }

        const f: Array<string> = data.f.split('|')
        const song = {} as Wukong.ISong
        const imgId = f[22]

        song.album = this.entities.decode(f[5])
        song.artist = this.entities.decode(data.fsinger)
        song.title = this.entities.decode(f[1])
        song.length = Math.floor(parseFloat(f[7]) * 1000)
        song.siteId = this.providerName
        song.songId = f[20]
        song.music = null
        song.artwork = { file: this.getArtworkUrl(imgId) }
        song.webUrl = this.getWebUrl(song.songId)
        song.bitrate = parseInt(f[13])
        return song
    }

    async getBaseInfo(songId: string): Promise<any> {
        const res = await this.sendRequest({
            url: 'http://i.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg',
            qs: {
                'songmid': songId,
                'tpl': 'yqq_song_detail'
            }
        })
        const window = await new Promise((resolve, reject) => jsdom.env(res, (err, window) => {
            if (err) reject(err)
            else resolve(window)
        })) as Window
        const data = window.document.getElementById('opt_btns').getElementsByClassName('data')[0].innerHTML
        return JSON.parse(data)
    }

    private getArtworkUrl(imgId: string): string {
        return `http://i.gtimg.cn/music/photo/mid_album_300/${imgId[imgId.length - 2]}/${imgId[imgId.length - 1]}/${imgId}.jpg`
    }

    public async getPlayingUrl(songId: string, overseas?: boolean, useCdn?: boolean): Promise<Wukong.IFiles> {
        const guid = Math.floor(Math.random() * 9999999999)
        const result: string = await this.sendRequest({
            url: 'http://base.music.qq.com/fcgi-bin/fcg_musicexpress.fcg',
            qs: {
                json: 3,
                loginUin: 0,
                format: 'jsonp',
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'yqq',
                needNewCode: 0,
                guid: guid
            }
        })
        const baseInfo: any = await this.getBaseInfo(songId)
        const bitrateInfo = this.getMaxAvailBitrate(baseInfo.file)
        const key: string = JSON.parse(result.replace(/^jsonCallback\((.*)\);$/, '$1')).key
        return {
            file: `http://cc.stream.qqmusic.qq.com/${bitrateInfo.prefix}${songId}.${bitrateInfo.extension}?vkey=${key}&guid=${guid}&fromtag=0`
        }
    }

    public getWebUrl(songId: string): string {
        return `http://y.qq.com/portal/song/${songId}.html`
    }

    // TODO
    public async getSongList(songListId: string): Promise<Wukong.ISongList> { return null }

    // TODO
    public async getUserSongLists(thirdPartyUserId: string): Promise<Wukong.ISongList[]> { return null }

    // TODO
    public async searchUsers(searchKey: string): Promise<Wukong.IThirdPartyUser[]> { return null }
}
