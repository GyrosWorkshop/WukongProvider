import {assert} from 'chai'
import XiamiMusicProvider from '../providers/Xiami'

describe('XiamiMusicProvider', () => {
    const provider = new XiamiMusicProvider()
    describe('search', () => {
        it('魔鬼中的天使', async () => {
            const songs = await provider.searchSongs('魔鬼中的天使')
            assert.isArray(songs)
        })
    })
    describe('info', () => {
        it('魔鬼中的天使', async () => {
            const song = await provider.getSongInfo('1770409076')
            assert.equal(song.artist, '田馥甄')
            assert.equal(song.songId, '1770409076')
            assert.equal(song.title, '魔鬼中的天使')
            assert.equal(song.album, 'My Love')
            assert.isString(song.artwork)
            assert.isTrue(song.artwork.startsWith('http'))
            assert.isArray(song.lyrics)
            assert.isTrue(song.lyrics[0].lyric.indexOf('魔鬼中的天使') !== -1)
        })
    })
    describe('playing url', () => {
        it('playing url', async () => {
            const url = await provider.getPlayingUrl('1770409076', false)
            assert.isString(url)
            assert.isTrue(url.startsWith('http'))
        })
    })
})
