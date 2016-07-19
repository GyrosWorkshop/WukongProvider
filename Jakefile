const async = require('async')

function lintSingle(file, cb) {
    jake.exec(`node node_modules/tslint/bin/tslint ${file}`, {printStdout: true}, cb)
}

task('lint', {async: true}, () => {
    var list = new jake.FileList()
    list.include(['src/**/*.ts'])
    const arr = list.toArray().map(it => (cb) => lintSingle(it, cb))
    async.parallelLimit(arr, require('os').cpus().length, (err, result) => {
        if (!err) return complete()
        throw err
    })
})
