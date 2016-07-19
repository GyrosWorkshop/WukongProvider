require('./QQMusicTest')
require('./NeteaseCloudMusicTest')
if (process.env.api) {
    require('./ApiTest')
}