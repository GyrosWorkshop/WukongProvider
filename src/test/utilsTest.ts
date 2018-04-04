import {guessFromSongListUrl} from '../utils'
import {assert} from 'chai'

describe('guessFromSongListUrl', () => {
    it('netease toplist', () => {
        const link = 'http://music.163.com/#/discover/toplist?id=3779629'
        assert.deepEqual(guessFromSongListUrl(link), {
            siteId: 'netease-cloud-music',
            songListId: '3779629'
        })
    })
    it('netease playlist', () => {
        const link = 'http://music.163.com/#/playlist?id=365918270'
        assert.deepEqual(guessFromSongListUrl(link), {
            siteId: 'netease-cloud-music',
            songListId: '365918270'
        })
    })
    it('netease my playlist', () => {
        const link = 'http://music.163.com/#/my/m/music/playlist?id=443490542'
        assert.deepEqual(guessFromSongListUrl(link), {
            siteId: 'netease-cloud-music',
            songListId: '443490542'
        })
    })
    it('qusics test', () => {
        const link = 'http://music.163.com/#/playlist?id=28613019'
        assert.deepEqual(guessFromSongListUrl(link), {
            siteId: 'netease-cloud-music',
            songListId: '28613019'
        })
    })
    it('end /', () => {
        const link = 'http://music.163.com/#/playlist/?id=28613019'
        assert.deepEqual(guessFromSongListUrl(link), {
            siteId: 'netease-cloud-music',
            songListId: '28613019'
        })
    })
})