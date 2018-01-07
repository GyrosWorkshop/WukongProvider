import {assert} from 'chai'
import QQMusicProvider from '../providers/QQMusic'

describe('QQMusicProvider', () => {
    const provider = new QQMusicProvider()
    describe('getSongInfo', () => {
        it('曹操 0003y8uR1ZZwOI', async () => {
            const song = await provider.getSongInfo('0003y8uR1ZZwOI')
            assert.equal(song.siteId, 'QQMusic')
            assert.equal(song.album, '曹操')
            assert.equal(song.artist, '林俊杰')
            assert.equal(song.title, '曹操')
            assert.equal(song.songId, '0003y8uR1ZZwOI')
            assert.equal(song.length, 242000)
        })
        it('周杰伦的床边故事 000sxzol11raSd', async () => {
            const song = await provider.getSongInfo('000sxzol11raSd')
            assert.equal(song.siteId, 'QQMusic')
            assert.equal(song.album, '周杰伦的床边故事')
            assert.equal(song.artist, '周杰伦')
            assert.equal(song.title, '不该 (with aMEI)')
            assert.equal(song.songId, '000sxzol11raSd')
            assert.equal(song.length, 290000)
        })
    })
    describe('playing url', () => {
        it('曹操 0003y8uR1ZZwOI', async () => {
            const url = await provider.getPlayingUrl('0003y8uR1ZZwOI')
        })
    })
    describe('searchMusic', () => {
        it('七里香', async () => {
            const songs = await provider.searchSongs('七里香')
            assert.isArray(songs)
            assert.isTrue(songs.length > 5)
            for (const song of songs) {
                assert.equal(song.siteId, 'QQMusic')
            }
        })
    })
})
