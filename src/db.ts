import * as Sequelize from 'sequelize'
import {join} from 'path'

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    pool: {
        maxConnections: 5,
        minConnections: 0,
        maxIdleTime: 10000
    },
    storage: join(__dirname, '..', 'storage/sqlite.db'),
    logging: false
})
export default sequelize

export const Lyric = sequelize.define('lyric', {
    withTimeLine: Sequelize.BOOLEAN,
    translate: Sequelize.BOOLEAN,
    lyric: Sequelize.STRING
}, {
    indexes: [
        {
            name: 'lyricSongId',
            fields: ['songId']
        }
    ]
})

export const Song = sequelize.define('song', {
    songId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    siteId: {
        type: Sequelize.STRING,
        allowNull: false
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    artist: Sequelize.STRING,
    album: Sequelize.STRING,
    artwork: Sequelize.STRING,
    length: Sequelize.INTEGER,
    bitrate: Sequelize.INTEGER
}, {
    indexes: [
        {
            unique: true,
            fields: ['siteId', 'songId']
        }
    ]
})

Song.hasMany(Lyric, {
    as: 'lyric'
})

async function init() {
    try {
        await sequelize.sync()
    } catch (err) {
        console.error(err)
    }
}

init()