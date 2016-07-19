import {assert} from 'chai'
import QQMusicProvider from '../providers/QQMusic'

describe('QQMusicProvider', () => {
    const provider = new QQMusicProvider()
    describe('getSongInfo', () => {
        it('七里香', async () => {
            const song = await provider.getSongInfo('0042fRqf4fC8ZB')
            assert.equal(song.siteId, 'QQMusic')
            assert.equal(song.album, '七里香')
            assert.equal(song.artist, '周杰伦')
            assert.equal(song.title, '止战之殇')
            assert.equal(song.songId, '0042fRqf4fC8ZB')
            assert.equal(song.length, 274000)
        })
    })
    describe('getSongInfo 000sxzol11raSd', () => {
        it('周杰伦的床边故事', async () => {
            const song = await provider.getSongInfo('000sxzol11raSd')
            assert.equal(song.siteId, 'QQMusic')
            assert.equal(song.album, '周杰伦的床边故事')
            assert.equal(song.artist, '周杰伦')
            assert.equal(song.title, '不该 (with aMEI) (《幻城》电视剧主题曲)')
            assert.equal(song.songId, '000sxzol11raSd')
            assert.equal(song.length, 290000)
        })
    })
    describe('searchMusic', () => {
        it('七里香', async () => {
            const songs = await provider.searchSongs('七里香')
            assert.isArray(songs)
            for (const song of songs) {
                assert.equal(song.siteId, 'QQMusic')
            }
        })
    })
})
