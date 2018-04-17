import * as Redis from 'redis'

if (process.env.api) {
    require('./ApiTest')
} else {
    require('./QQMusicTest')
    require('./NeteaseCloudMusicTest')
    // require('./XiamiTest')
    require('./utilsTest')
}