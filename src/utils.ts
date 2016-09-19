import * as Url from 'url'
import * as qs from 'querystring'

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
    if (url.pathname === null || url.pathname.length === 0) {
        const link = url.hash.replace(/^#/, '')
        url = Url.parse(link)
    }

    const id = qs.parse(url.query).id
    const pathname = url.pathname
    if (id && (pathname.endsWith('toplist') || pathname.endsWith('playlist'))) {
        return qs.parse(url.query).id
    }
    throw new Error('netease songlist parse failed')
}

export type SiteSongList = {
    siteId: string,
    songListId: string
}