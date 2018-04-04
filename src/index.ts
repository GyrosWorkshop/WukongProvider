import NeteaseCloudMusicProvider from './providers/NeteaseCloudMusic'
import QQMusicProvider from './providers/QQMusic'
import XiamiProvider from './providers/Xiami'
import BaseMusicProvider, {CMQMessageProcessor} from './providers/Base'
import {guessFromSongListUrl} from './utils'

import * as _ from 'lodash'
import * as express from 'express'
import * as morgan from 'morgan'
import * as http from 'http'
import * as bodyParser from 'body-parser'
import * as rp from 'request-promise'
import {autobind} from 'core-decorators'

const version = require('../package.json').version
const serverConfig = require('../server-config.json')
const app = express()

app.use(bodyParser.json())
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY)
} else if (serverConfig.trust_proxy) {
    app.set('trust proxy', serverConfig.trust_proxy)
}
app.use(morgan('combined'))
app.use((req, res, next) => {
    res.set('X-Wukong-Provider-Version', version)
    next()
})

const providers = new Map<string, BaseMusicProvider>()
const qqProvider = new QQMusicProvider()
const neteaseProvider = new NeteaseCloudMusicProvider()
const xiamiProvider = new XiamiProvider()

providers.set(qqProvider.providerName, qqProvider)
providers.set(neteaseProvider.providerName, neteaseProvider)
providers.set(xiamiProvider.providerName, xiamiProvider)

@autobind
class Controller {
    constructor(app: express.Application) {
        app.post('/api/searchSongs', this.wrap(this.searchSongs))
        app.post('/api/songInfo', this.wrap(this.songInfo))
        app.post('/api/songList', this.wrap(this.songList))
        app.post('/api/userSongLists', this.wrap(this.userSongLists))
        app.post('/api/searchUsers', this.wrap(this.searchUsers))
        app.post('/api/songListWithUrl', this.wrap(this.songListWithUrl))
    }

    /**
     * @api {POST} /api/searchSongs search songs
     * @apiName SearchSongs
     * @apiGroup API
     * @apiDescription To simplify our provider implementation, only title, artist, and album are ensured to be included in the result.
     * @apiParam {string} key search keyword
     * @apiParam {string} [withCookie]
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      [
     *          {
     *          }
     *      ]
     * @apiErrorExample Error-Response:
     *      HTTP/1.1 400 ERROR
     *      {
     *          "error": "IllegalArgumentException \"key\" not exist or wrong type."
     *      }
     */
    async searchSongs(req: express.Request) {
        const key = req.body.key
        const withCookie = req.body.withCookie
        if (!_.isString(key) || _.isEmpty(key)) {
            throw new Error('IllegalArgumentException "key" not exist or wrong type.')
        }
        console.log('Request searchSongs', key)
        const result = await Promise.all<Wukong.ISong[]>([...providers].map(([, it]) => it.searchSongs(key, withCookie)))
        const data = _.uniqBy(
            Array.prototype.concat.apply([], _.zip.apply(null, result)).filter((it: any) => !!it),
            (it: Wukong.ISong) => `${it.siteId}|${it.songId}`
        )
        return data
    }

    /**
     * @api {POST} /api/songInfo songInfo
     * @apiName songInfo
     * @apiGroup API
     * @apiParam {string} siteId
     * @apiParam {string} songId
     * @apiParam {Boolean} [withFileUrl=false]
     * @apiParam {Boolean} [withMvUrl=false]
     * @apiParam {string} [withCookie]
     * @apiParam {string} [sendPlayLog=true] If valid cookie is provided and withFileUrl is set, play log will be sended to netease-cloud-music to track your play count.
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async songInfo(req: express.Request) {
        const {siteId, songId, withFileUrl = false, withMvUrl = false, withCookie, sendPlayLog = true} = req.body as {
            siteId: string
            songId: string
            withFileUrl: boolean
            withMvUrl: boolean
            withCookie: string
            sendPlayLog: true
        }
        if (!siteId || !songId) {
            throw new Error('IllegalArgumentException siteId or songId is not valid.')
        }
        const provider = providers.get(siteId)
        if (!provider) {
            throw new Error('site provider not exist.')
        }
        console.log('Request songInfo', req.body)
        const song = _.omit(await provider.getSongInfo(songId, withCookie), ['meta', 'detail']) as Wukong.ISong
        if (withFileUrl) {
            song.musics = await provider.getPlayingUrl(songId, withCookie, sendPlayLog)
        }
        if (withMvUrl && Number(song.mvId)) {
            song.mv = await provider.getMvUrl(song.mvId)
        }
        return song
    }

    /**
     * @api {POST} /api/songList songList
     * @apiName songList
     * @apiGroup API
     * @apiParam {string} siteId
     * @apiParam {string} songListId
     * @apiParam {string} [withCookie]
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async songList(req: express.Request) {
        const {siteId, songListId, withCookie} = req.body as {
            siteId: string
            songListId: string
            withCookie: string
        }
        if (!siteId || !songListId) {
            throw new Error('IllegalArgumentException siteId or songListId is empty')
        }
        console.log('Request songList', req.body)
        const provider = providers.get(siteId)
        if (!provider) {
            throw new Error('site provider not exist.')
        }
        return provider.getSongList(songListId, withCookie)
    }

    /**
     * @api {POST} /api/songListWithUrl songListWithUrl
     * @apiName songListWithUrl
     * @apiGroup API
     * @apiParam {string} url
     * @apiParam {string} [withCookie]
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async songListWithUrl(req: express.Request) {
        const {url, withCookie} = req.body as {
            url: string
            withCookie: string
        }
        const songList = guessFromSongListUrl(url)
        if (!songList) {
            throw new Error('songlist parse failed')
        }
        const provider = providers.get(songList.siteId)
        if (!provider) {
            throw new Error('site provider not exist.')
        }
        console.log('Request songListWithUrl', url)
        return provider.getSongList(songList.songListId, withCookie)
    }

    /**
     * @api {POST} /api/userSongLists userSongLists
     * @apiName userSongLists
     * @apiGroup API
     * @apiParam {string} siteId
     * @apiParam {string} thirdPartyUserId
     * @apiParam {string} [withCookie]
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async userSongLists(req: express.Request) {
        const {siteId, thirdPartyUserId, withCookie} = req.body as {
            siteId: string
            thirdPartyUserId: string
            withCookie: string
        }
        if (!siteId || !thirdPartyUserId) {
            throw new Error('IllegalArgumentException siteId or thirdPartyUserId is empty')
        }
        const provider = providers.get(siteId)
        if (!provider) {
            throw new Error('site provider not exist.')
        }
        console.log('Request userSongLists', req.body)
        return provider.getUserSongLists(thirdPartyUserId, withCookie)
    }

    /**
     * @api {POST} /api/searchUsers searchUsers
     * @apiName searchUsers
     * @apiGroup API
     * @apiParam {string} key
     * @apiParam {string} [withCookie]
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async searchUsers(req: express.Request) {
        const {key, withCookie} = req.body as {
            key: string
            withCookie: string
        }
        if (!_.isString(key) || _.isEmpty(key)) {
            throw new Error('IllegalArgumentException key not exist or wrong type.')
        }
        console.log('Request searchUsers', key)
        const result = await Promise.all<Wukong.IThirdPartyUser[]>([...providers].map(([, it]) => it.searchUsers(key, withCookie)))
        const data = Array.prototype.concat.apply([], _.zip.apply(null, result)).filter((it: any) => !!it)
        return data
    }

    private wrap(fn: Function) {
        return async function(req: express.Request, res: express.Response) {
            try {
                const data = await Promise.resolve(fn.call(this, req))
                res.status(200).send(data)
            } catch (err) {
                console.error(err)
                res.status(400).send({
                    error: err.message || err
                })
            }
        }
    }
}

new Controller(app)
const port = process.env.port || 3120
http.createServer(app).listen(port)
module.exports = app

console.log(`WukongProvider ${version} started at port ${port}`)
