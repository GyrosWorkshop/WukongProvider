import {assert} from 'chai'
import NeteaseCloudMusicProvider from '../providers/NeteaseCloudMusic'
import {guessFromSongListUrl} from '../utils'

describe('NeteaseCloudMusicProvider', () => {
    const provider = new NeteaseCloudMusicProvider()
    describe('search', () => {
        it('不为谁而作的歌 search results', async () => {
            const songs = await provider.searchSongs('不为谁而作的歌')
            for (let song of songs) {
                assert.equal(song.siteId, 'netease-cloud-music')
            }
            assert.equal(songs[0].title, '不为谁而作的歌')
            assert.equal(songs[0].artist, '林俊杰')
            assert.equal(songs[1].title, '不为谁而作的歌')
            assert.equal(songs[1].artist, '徐佳莹，林俊杰')
        })
    })
    describe('getSongInfo', () => {
        it('不为谁而作的歌 detailed info', async () => {
            const songId = '37196629'
            const song = await provider.getSongInfo(songId)
            assert.equal(song.siteId, 'netease-cloud-music')
            assert.equal(song.songId, songId)
            assert.equal(song.title, '不为谁而作的歌')
            assert.equal(song.artist, '林俊杰')
            assert.equal(song.album, '不为谁而作的歌')
        })
    })
    describe('getSongInfo', () => {
        it('おどるポンポコリン 25th ver. detailed info', async () => {
            const songId = '26119280'
            const song = await provider.getSongInfo(songId)
            assert.equal(song.siteId, 'netease-cloud-music')
            assert.equal(song.songId, songId)
            assert.equal(song.title, 'おどるポンポコリン')
            assert.equal(song.artist, 'B.B.クイーンズ')
            assert.equal(song.album, 'おどるポンポコリン~ちびまる子ちゃん 誕生25th Version~')
        })
    })
    describe('getSongList', () => {
        it('top list', async () => {
            const listId = '3779629'
            const songs = await provider.getSongList(listId)
            assert.equal(songs.songListId, listId)
            assert.equal(songs.siteId, 'netease-cloud-music')
            assert.equal(songs.creator.name, '网易云音乐')
            // assert.equal(songs.songs.length, songs.songCount)
            assert.isTrue(songs.songs.length > 10)
        })
        it('url list', async () => {
            // should follow 302
            const link = 'http://music.163.com/#/my/m/music/playlist?id=443490542'
            const songList = guessFromSongListUrl(link)
            const songs = await provider.getSongList(songList.songListId)
            assert.equal(songs.songListId, '443490542')
            assert.equal(songs.siteId, 'netease-cloud-music')
            assert.equal(songs.creator.name, 'richard1122')
            assert.isTrue(songs.songs.length > 10)
        })
    })
})