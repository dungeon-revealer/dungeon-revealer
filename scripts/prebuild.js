const fse = require('fs-extra')
const package = require('../package.json');
const { spawnSync } = require('child_process');

let version = {
    'appversion': package.version,
    'status': 'unknown',
    'tag': '',
    'commit': '',
    'commits_ahead': 0,
    'obj': ''
};

var exec = spawnSync("git", ["describe", "--tags"]);

if (exec.status != 0) {
    version.status = 'unknown';
} else {
    let git_desc = exec.stdout.toString().replace('\n', '');
    let gd_array = git_desc.split('-');
    version.tag = gd_array[0];
    if (git_desc.slice(1) == version.appversion) {
        version.status = 'release';
    } else {
        version.status = 'development';
        version.commit = spawnSync("git", ["rev-parse", "--short", "HEAD"]).stdout.toString().replace('\n', '');
        version.commits_ahead = gd_array[1];
        version.obj = gd_array[2];
    }
}

let entries = Object.entries(version)
ts_out = '';
for (const entry of entries) {
    ts_out += `export const ${entry[0]} = '${entry[1]}';\n`
}

fse.outputFileSync('server/version.ts', ts_out, (err) => {
    if (err) {
        console.log(err);
    }
})