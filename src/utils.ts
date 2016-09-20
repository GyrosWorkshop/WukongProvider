import * as Url from 'url'
import * as qs from 'querystring'
import * as _ from 'lodash'

export function guessFromSongListUrl(link: string): SiteSongList {
    try {
        const url = Url.parse(link)
        if (url.hostname !== 'music.163.com') throw new Error('Unknown siteId')
        return {
            siteId: 'netease-cloud-music',
            songListId: guessFromSongListNetease(url).toString()
        }
    } catch (err) {
        return null
    }
}

function guessFromSongListNetease(url: Url.Url): string {
    const matches = [/playlist\/?$/, /toplist\/?$/]
    if (!_.some(matches, it => it.test(url.pathname))) {
        const link = url.hash.replace(/^#/, '')
        url = Url.parse(link)
    }

    const id = qs.parse(url.query).id
    const pathname = url.pathname
    if (id && _.some(matches, it => it.test(pathname))) {
        return qs.parse(url.query).id
    }
    throw new Error('netease songlist parse failed')
}

export type SiteSongList = {
    siteId: string,
    songListId: string
}