const fse = require('fs-extra')
const { spawnSync } = require('child_process');
var exec = spawnSync("git",
    ["describe", "--tags"],
);

let myenv = {
    'appversion': '',
    'status': 'unknown',
    'tag': '',
    'commit': '',
    'commits_ahead': 0,
    'obj': ''
};

const package = require('../package.json');

myenv.appversion = package.version;


if (exec.status != 0) {
    env.status = 'unknown'
} else {
    let git_desc = exec.stdout.toString().replace('\n', '');
    let gd_array = git_desc.split('-')
    myenv.tag = gd_array[0];
    if (git_desc == myenv.appversion) {
        myenv.status = 'release';
    } else {
        myenv.status = 'development';
        myenv.commit = spawnSync("git",
            ["rev-parse", "--short", "HEAD"],
        ).stdout.toString().replace('\n', '');
        myenv.commits_ahead = gd_array[1];
        myenv.obj = gd_array[2]
    }
}

// console.log(myenv)

outstr = '';

let entries = Object.entries(myenv)



for (const x of entries) {
    outstr += `export const ${x[0]} = '${x[1]}';\n`
}

// console.log(outstr)


fse.outputFileSync('server/version.ts', outstr, (err) => {
    if (err)
        console.log(err);
    else {
        console.log("File written successfully\n");
        console.log("The written has the following contents:");
        console.log(fs.readFileSync("version.ts", "utf8"));
    }
})