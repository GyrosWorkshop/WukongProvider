import * as rp from 'request-promise'
import BaseProvider from './Base'
import {autobind} from 'core-decorators'
import * as _ from 'lodash'
import * as jsdom from 'jsdom'
import * as url from 'url'
import {XmlEntities} from 'html-entities'

const xmlEntities = new XmlEntities()

@autobind
export default class XiamiMusicProvider extends BaseProvider {
    static providerName = 'Xiami'

    async getSongInfo(songId: string): Promise<Wukong.ISong> {
        return null
    }
    async searchSongs(keywords: string, offset: number = 0, limit: number = 30): Promise<Array<Wukong.ISong>> {
        const res = await this.sendRequest({
            url: 'http://www.xiami.com/search',
            qs: {
                key: keywords
            }
        })
        const window = await new Promise((resolve, reject) => jsdom.env(res, (err, window) => {
            if (err) reject(err)
            else resolve(window)
        })) as Window
        const list = window.document.getElementsByClassName('track_list')[0].getElementsByTagName('tbody')
        const result: Wukong.ISong[] = []
        for (let i = 0; i !== list.length; ++i) {
            const tbody = list.item(i)
            // if (tbody.classList.contains('same_song_group')) continue
            const trs = tbody.getElementsByTagName('tr')
            for (let j = 0; j !== trs.length; ++j) {
                const tr = trs.item(j)
                result.push(this.searchResultParseSingle(tr))
            }
        }
        return null
    }

    private searchResultParseSingle(item: Element): Wukong.ISong {
        const result = {} as Wukong.ISong
        {
            const song_name = item.getElementsByClassName('song_name')[0].getElementsByTagName('a')
            for (let i = 0; i !== song_name.length; ++i) {
                const item = song_name.item(i)
                if (item.classList.contains('slide_down')) continue
                result.title = item.getAttribute('title')
                result.songId = _.last(url.parse(item.getAttribute('href')).pathname.split('/'))
            }
        }
        {
            result.artist = item.getElementsByClassName('song_artist')[0].getElementsByTagName('a')[0].getAttribute('title')
        }
        {
            result.album = xmlEntities.decode(item.getElementsByClassName('song_album')[0].getElementsByTagName('a')[0].innerHTML.trim().replace(/^《(.*)》$/, '$1'))
        }
        return result
    }

    async getSongLyrics(songId: string): Promise<Wukong.ILyric[]> {
        return null
    }

    public async getPlayingUrl(songId: string, overseas: boolean): Promise<string> {
        return null
    }
}
