import NeteaseCloudMusicProvider from './providers/NeteaseCloudMusic'
import QQMusicProvider from './providers/QQMusic'
import GrooveProvider from './providers/Groove'
import XiamiProvider from './providers/Xiami'
import BaseMusicProvider from './providers/Base'
import {guessFromSongListUrl} from './utils'

import * as _ from 'lodash'
import * as express from 'express'
import * as morgan from 'morgan'
import * as http from 'http'
import * as bodyParser from 'body-parser'
import * as rp from 'request-promise'
import {autobind} from 'core-decorators'
const serverConfig = require('../server-config.json')
const app = express()

app.use(bodyParser.json())
if (serverConfig.trust_proxy)
    app.set('trust proxy', serverConfig.trust_proxy)
app.use(morgan('combined'))
http.createServer(app).listen(process.env.port || 3120)

const providers = new Map<string, BaseMusicProvider>()
const qqProvider = new QQMusicProvider()
const neteaseProvider = new NeteaseCloudMusicProvider()
const xiamiProvider = new XiamiProvider()

providers.set(qqProvider.providerName, qqProvider)
// providers.set(GrooveProvider.providerName, new GrooveProvider())
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
        if (!_.isString(key) || _.isEmpty(key)) {
            throw new Error('IllegalArgumentException "key" not exist or wrong type.')
        }
        console.log('Request searchSongs', key)
        const result = await Promise.all<Wukong.ISong[]>([...providers].map(([, it]) => it.searchSongs(key)))
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
     * @apiParam {string} [clientIP] If provided with this, server may take different actions to the file url. E.g. use proxy server to make oversea users happy.
     * @apiParam {string} [useCdn=false] If set to true, a CDN server will be used anyway.
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async songInfo(req: express.Request) {
        const {siteId, songId, withFileUrl = false, clientIP, useCdn} = req.body as {
            siteId: string,
            songId: string,
            withFileUrl: boolean,
            clientIP: string,
            useCdn: boolean
        }
        if (!siteId || !songId) {
            throw new Error('IllegalArgumentException siteId or songId is not valid.')
        }
        const provider = providers.get(siteId)
        if (!provider) {
            throw new Error('site provider not exist.')
        }
        console.log('Request songInfo', req.body)
        const song = await provider.getSongInfo(songId)
        if (withFileUrl) {
            Object.assign(song, await provider.getPlayingUrl(songId))
        }
        return song
    }

    /**
     * @api {POST} /api/songList songList
     * @apiName songList
     * @apiGroup API
     * @apiParam {string} siteId
     * @apiParam {string} songListId
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async songList(req: express.Request) {
        const {siteId, songListId} = req.body as {
            siteId: string
            songListId: string
        }
        if (!siteId || !songListId) {
            throw new Error('IllegalArgumentException siteId or songListId is empty')
        }
        console.log('Request songList', req.body)
        const provider = providers.get(siteId)
        if (!provider) {
            throw new Error('site provider not exist.')
        }
        return provider.getSongList(songListId)
    }

    /**
     * @api {POST} /api/songListWithUrl songListWithUrl
     * @apiName songListWithUrl
     * @apiGroup API
     * @apiParam {string} url
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async songListWithUrl(req: express.Request) {
        const {url} = req.body as {
            url: string
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
        return provider.getSongList(songList.songListId)
    }

    /**
     * @api {POST} /api/userSongLists userSongLists
     * @apiName userSongLists
     * @apiGroup API
     * @apiParam {string} siteId
     * @apiParam {string} thirdPartyUserId
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async userSongLists(req: express.Request) {
        const {siteId, thirdPartyUserId} = req.body as {
            siteId: string,
            thirdPartyUserId: string
        }
        if (!siteId || !thirdPartyUserId) {
            throw new Error('IllegalArgumentException siteId or thirdPartyUserId is empty')
        }
        const provider = providers.get(siteId)
        if (!provider) {
            throw new Error('site provider not exist.')
        }
        console.log('Request userSongLists', req.body)
        return provider.getUserSongLists(thirdPartyUserId)
    }

    /**
     * @api {POST} /api/searchUsers searchUsers
     * @apiName searchUsers
     * @apiGroup API
     * @apiParam {string} key
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *      }
     */
    async searchUsers(req: express.Request) {
        const {key} = req.body as {
            key: string
        }
        if (!_.isString(key) || _.isEmpty(key)) {
            throw new Error('IllegalArgumentException key not exist or wrong type.')
        }
        console.log('Request searchUsers', key)
        const result = await Promise.all<Wukong.IThirdPartyUser[]>([...providers].map(([, it]) => it.searchUsers(key)))
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

console.log('wukong provider started.')

module.exports = app
