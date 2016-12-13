import * as rp from 'request-promise'
import BaseProvider from './Base'
import {autobind} from 'core-decorators'
const serverConfig = require('../../server-config.json')

@autobind
export default class GrooveProvider extends BaseProvider {
    get providerName() {
        return 'Groove'
    }
    private oauthUrl = 'https://datamarket.accesscontrol.windows.net/v2/OAuth2-13'

    async getAccessToken(): Promise<string> {
        let clientId = serverConfig['Groove']['ClientId']
        let clientSecret = serverConfig['Groove']['ClientSecret']
        let scope = 'http://music.xboxlive.com'
        let grantType = 'client_credentials'
        const result = await this.sendRequest({
            url: this.oauthUrl,
            method: 'POST',
            form: {
                client_id: clientId,
                grant_type: grantType,
                client_secret: clientSecret,
                scope: scope,
            },
            headers: {
                ContentType: 'application/x-www-form-urlencoded',
            }
        })
        return JSON.parse(result).access_token
    }

    async searchSongs(keywords: string, withCookie?: string): Promise<Array<Wukong.ISong>> {
        let accessToken = await this.getAccessToken()
        try {
            const result = await this.sendRequest({
                url: 'https://music.xboxlive.com/1/content/music/search',
                headers: {
                    Authorization: 'Bearer ' + accessToken
                },
                qs: {
                    q: keywords
                }
            })

            console.log(result['Tracks'])
            console.log(JSON.parse(result).Tracks.Items)
            return await Promise.all<Wukong.ISong>((JSON.parse(result).Tracks.Items as Array<any>).map(this.mapToISong))
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async getSongInfo(songId: string, withCookie?: string): Promise<Wukong.ISong> {
        let accessToken = await this.getAccessToken()
        const result = await this.sendRequest({
            url: `https://music.xboxlive.com/1/content/${songId}/lookup`,
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
        return this.mapToISong((JSON.parse(result).Tracks.Items as Array<any>)[0])
    }

    async getPlayingUrl(songId: string, withCookie?: string): Promise<Wukong.IFile[]> {
        let accessToken = await this.getAccessToken()
        const result = await this.sendRequest({
            url: `https://music.xboxlive.com/1/content/${songId}/preview`,
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
        return [{
            file: JSON.parse(result).Url
        }]
    }

    public async getMvUrl(mvId: string): Promise<Wukong.IFile> {
        return null
    }

    private async mapToISong(data: any): Promise<Wukong.ISong> {
        const song = {} as Wukong.ISong
        song.length = 30
        song.album = data.Album.Name
        console.log(data.Artists)
        song.artist = data.Artists[0].Artist.Name
        song.title = data.Name
        song.siteId = this.providerName
        song.songId = data.Id
        song.artwork = {
            file: data.ImageUrl
        }
        song.bitrate = 0
        return song
    }

    // TODO
    public async getSongList(songListId: string, withCookie?: string): Promise<Wukong.ISongList> { return null }

    // TODO
    public async getUserSongLists(thirdPartyUserId: string, withCookie?: string): Promise<Wukong.ISongList[]> { return null }

    // TODO
    public async searchUsers(searchKey: string, withCookie?: string): Promise<Wukong.IThirdPartyUser[]> { return null }

    // TODO
    public getWebUrl(songId: string): string { return null }
}

