/// <reference path="../../typings/index.d.ts" />

import * as rp from 'request-promise'
import BaseProvider from './Base'
import {autobind} from 'core-decorators'
import * as _ from 'lodash'
import * as jsdom from 'jsdom'

@autobind
export default class QQMusicProvider extends BaseProvider {
    get providerName() {
        return 'QQMusic'
    }

    constructor() {
        super()
        this.RequestOptions.headers['Referer'] = 'http://y.qq.com/'
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
        song.album = baseInfo.albumname
        song.artist = baseInfo.singer.map((it: any) => it.name).join(', ')
        song.title = baseInfo.songname
        song.length = Math.floor(parseFloat(baseInfo.interval) * 1000)
        song.siteId = this.providerName
        song.songId = songId
        song.file = ''
        song.artwork = this.getArtworkUrl(baseInfo.albummid || baseInfo.album.mid)
        song.bitrate = 320 * 1000
        song.lyrics = await this.getSongLyrics(songId)
        return song
    }

    private mapToSongSingle(data: any): Wukong.ISong {
        // TODO: 搜索 七里香 里面有个格式不同
        if (data.f.indexOf('|') === -1) {
            return undefined
        }

        const f: Array<string> = data.f.split('|')
        const song = {} as Wukong.ISong
        const imgId = f[22]

        song.album = f[5]
        song.artist = data.fsinger
        song.title = f[1]
        song.length = Math.floor(parseFloat(f[7]) * 1000)
        song.siteId = this.providerName
        song.songId = f[20]
        song.file = ''
        song.artwork = this.getArtworkUrl(imgId)
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
        return `https://i.gtimg.cn/music/photo/mid_album_300/${imgId[imgId.length - 2]}/${imgId[imgId.length - 1]}/${imgId}.jpg`
    }

    public async getPlayingUrl(songId: string, overseas: boolean): Promise<string> {
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
        const key: string = JSON.parse(result.replace(/^jsonCallback\((.*)\);$/, '$1')).key
        return `http://cc.stream.qqmusic.qq.com/C200${songId}.m4a?vkey=${key}&fromtag=30&guid=${guid}`
    }

    // TODO
    public async getSongList(songListId: string): Promise<Wukong.ISongList> { return null }

    // TODO
    public async getUserSongLists(thirdPartyUserId: string): Promise<Wukong.ISongList[]> { return null }

    // TODO
    public async searchUsers(searchKey: string): Promise<Wukong.IThirdPartyUser[]> { return null }
}
