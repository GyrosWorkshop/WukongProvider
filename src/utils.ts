import * as Url from 'url'
import * as qs from 'querystring'
import * as _ from 'lodash'

export function guessFromSongListUrl(link: string): SiteSongList {
    try {
        const url = Url.parse(link)
        let result: SiteSongList
        switch (url.hostname.toLowerCase()) {
        case 'music.163.com':
            result = {
                siteId: 'netease-cloud-music',
                songListId: guessFromSongListNetease(url).toString()
            }
            break
        case 'www.xiami.com':
            result = {
                siteId: 'Xiami',
                songListId: guessFromSongListXiami(url).toString()
            }
            break
        default:
            throw new Error('unknown site or unsupported')
        }
        return result
    } catch (e) {
        return null
    }
}

function guessFromSongListNetease(url: Url.Url): string {
    const matches = [/playlist\/?/, /toplist\/?$/]
    if (!_.some(matches, it => it.test(url.pathname))) {
        const link = url.hash.replace(/^#/, '')
        url = Url.parse(link)
    }

    const id = qs.parse(url.query.toString()).id.toString()
    const pathname = url.pathname
    const parseIdFromPath = (s: string) => /playlist\/(\d+)\/?/.exec(s)[1]
    if (_.some(matches, it => it.test(pathname))) {
        return id || parseIdFromPath(pathname)
    }
    throw new Error('netease songlist parse failed')
}

function guessFromSongListXiami(url: Url.Url): string {
    if (/collect\/\d+/.test(url.pathname)) {
        return /collect\/(\d+)/.exec(url.pathname)[1]
    }
    if (/showcollect\/id\/\d+/.test(url.pathname)) {
        return /showcollect\/id\/(\d+)/.exec(url.pathname)[1]
    }
    throw new Error('xiami songlist parse failed')
}

export type SiteSongList = {
    siteId: string,
    songListId: string
}