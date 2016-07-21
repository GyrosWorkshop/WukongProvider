import * as Sequelize from 'sequelize'
import {join} from 'path'
const dbConfig = require('../server-config.json').database

let sequelize: Sequelize.Connection
if (dbConfig) {
    // Use postgresql connection uri
    sequelize = new Sequelize(dbConfig)
} else {
    // Use sqlite
    sequelize = new Sequelize('database', 'username', 'password', {
        host: 'localhost',
        dialect: 'sqlite',
        storage: join(__dirname, '..', 'storage/sqlite.db'),
        logging: false,
        native: true
    })
}

export default sequelize

export const Lyric = sequelize.define('lyric', {
    withTimeline: Sequelize.BOOLEAN,
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
    bitrate: Sequelize.INTEGER,
    meta: Sequelize.STRING
}, {
    indexes: [
        {
            unique: true,
            fields: ['siteId', 'songId']
        }
    ]
})

Song.hasMany(Lyric, {
    as: 'lyrics'
})

async function init() {
    try {
        await sequelize.sync()
    } catch (err) {
        console.error(err)
    }
}

init()