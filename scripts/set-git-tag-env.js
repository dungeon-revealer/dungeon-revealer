"use strict";

// Github Actions is weird about environment variables.
// Setting a variable in this way makes it available to all subsequent steps in the job.
// The only way to get the tag is to extract it from github-ref.
// For example, GITHUB_REF='refs/tags/v1.5'.
const tag = process.env.GITHUB_REF.replace("refs/tags/", "");
console.log("Setting GitHub Environment Variable.");
console.log(`::set-env name=GH_TAG::${tag}`);
