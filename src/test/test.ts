const serverConfig = require('../../server-config.json')
import * as Redis from 'redis'
// Flush db before run test.
Redis.createClient(serverConfig.redis).flushdb()

if (process.env.api) {
    require('./ApiTest')
} else {

    require('./QQMusicTest')
    // require('./NeteaseCloudMusicTest')
    // require('./XiamiTest')
    require('./utilsTest')
}