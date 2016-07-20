require('./QQMusicTest')
require('./NeteaseCloudMusicTest')
// require('./XiamiTest')
if (process.env.api) {
    require('./ApiTest')
}