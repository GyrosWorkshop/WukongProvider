import * as rp from 'request-promise'
import {assert} from 'chai'

describe('API', () => {
    it('search', async () => {
        const res = await rp({
            url: 'http://localhost:3120/api/searchSongs',
            method: 'POST',
            body: {
                key: '不为谁而作的歌'
            },
            json: true
        })
        assert.isArray(res)
    })
    it('search throw', async () => {
        try {
            const res = await rp({
                url: 'http://localhost:3120/api/searchSongs',
                method: 'POST',
                body: {
                    key: ''
                },
                json: true
            })
            throw new Error('should not go here.')
        } catch (err) {
        }
    })
    it('get info netease', async () => {
        const res = await rp({
            url: 'http://localhost:3120/api/songInfo',
            method: 'POST',
            body: {
                siteId: 'netease-cloud-music',
                songId: '37196629'
            },
            json: true
        })
        const song = res as Wukong.ISong
        assert.equal(song.siteId, 'netease-cloud-music')
        assert.equal(song.songId, '37196629')
        assert.equal(song.title, '不为谁而作的歌')
        assert.equal(song.artist, '林俊杰')
        assert.equal(song.album, '不为谁而作的歌')
    })
    it('get info QQ', async () => {
        const res = await rp({
            url: 'http://localhost:3120/api/songInfo',
            method: 'POST',
            body: {
                siteId: 'QQMusic',
                songId: '0042fRqf4fC8ZB'
            },
            json: true
        })
        const song = res as Wukong.ISong
        assert.equal(song.siteId, 'QQMusic')
        assert.equal(song.album, '七里香')
        assert.equal(song.artist, '周杰伦')
        assert.equal(song.title, '止战之殇')
        assert.equal(song.songId, '0042fRqf4fC8ZB')
        assert.equal(song.length, 274000)
    })
    it('get url netease', async () => {
        const res = await rp({
            url: 'http://localhost:3120/api/songInfo',
            method: 'POST',
            body: {
                siteId: 'netease-cloud-music',
                songId: '37196629',
                withFileUrl: true
            },
            json: true
        })
        assert.isString(res.file)
    })
    it('get info QQ', async () => {
        const res = await rp({
            url: 'http://localhost:3120/api/songInfo',
            method: 'POST',
            body: {
                siteId: 'QQMusic',
                songId: '0042fRqf4fC8ZB',
                withFileUrl: true
            },
            json: true
        })
        assert.isString(res.file)
    })
    it('wrong provider', async () => {
        try {
            const res = await rp({
                url: 'http://localhost:3120/api/playingUrl',
                method: 'POST',
                body: {
                    siteId: 'WWMusic',
                    songId: '0042fRqf4fC8ZB'
                },
                json: true
            })
            throw new Error('should not go here.')
        } catch (err) {

        }
    })
}) 