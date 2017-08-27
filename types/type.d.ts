declare namespace Wukong {
    /**
     * ClientSong 是指只用来标记这个歌曲的，而不传输任何这个歌曲的信息，这应该由服务器返回
     */
    export interface IClientSong {
        siteId: string
        songId: string
    }
    export interface ISong extends IClientSong {
        title: string
        artist: string
        album: string
        webUrl?: string

        musics?: IFile[]

        artwork?: IFile
        length?: number
        // bitrate: number like 96000 (represents 96kpbs), 192000, 320000, etc.
        bitrate?: number
        lyrics?: ILyric[]
        mvId?: string
        mvWebUrl?: string
        mv?: IFile
    }
    export interface IFile {
        audioQuality?: string
        audioBitrate?: Number
        format?: string
        file: string
        fileViaCdn?: string
        unavailable?: boolean
    }
    export interface IUser {
        nickname: string
        // gravatar hash
        gravatar?: string
        nextSong?: Wukong.ISong
        userId: string
        // default: false
        listenOnlyMode: boolean
        finished: boolean
    }


    interface ILyric {
        lrc: boolean            // Is it LyRiCs format or not?
        translated: boolean
        data: string
    }

    export interface IThirdPartyUser {
        siteId: string
        userId: string
        name: string
        signature?: string
        gender?: number         // 0: 未知, 1: 男, 2: 女
        avatar?: string
        songListCount?: number
        followers?: number      // ta 关注了多少人
        follows?: number        // ta 被多少人关注
    }

    export interface ISongList {
        siteId: string
        songListId: string
        creator: IThirdPartyUser
        name: string
        playCount?: number
        description?: string
        createTime?: string
        cover?: string
        songs?: ISong[]
        songCount?: number
    }
}
