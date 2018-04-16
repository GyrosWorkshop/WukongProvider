import * as Redis from 'redis'
// Flush db before run test.
Redis.createClient(6379, 'localhost').flushdb()

if (process.env.api) {
    require('./ApiTest')
} else {
    require('./QQMusicTest')
    require('./NeteaseCloudMusicTest')
    // require('./XiamiTest')
    require('./utilsTest')
}