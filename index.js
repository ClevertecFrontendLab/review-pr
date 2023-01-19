const core = require('@actions/core');
const github = require('@actions/github');
const { request } = require('@octokit/request');
const fs = require('fs');

const main = async () => {
  try {
    const owner = core.getInput('owner', { required: true });
    const repo = core.getInput('repo', { required: true });
    const pull_number = core.getInput('pull_number', { required: true });
    const token = core.getInput('token', { required: true });
    const url = 'https://training.cleverland.by/pull-request/reviewed';

    const octokit = new github.getOctokit(token);

    const { data: pull_request_info } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number,
    });

    const reviewer = reviews[reviews.length - 1].user.login;

    const responseCommitsStatuses = reviews.reduce((acc, { user, state }) => {
      if (acc[user.login]) {
        acc[user.login].push(state);
      } else {
        acc[user.login] = [state];
      }
      return acc;
    }, {});

    const isApproved = !Object.values(responseCommitsStatuses)
      .map(
        (item) =>
          (item.includes('CHANGES_REQUESTED') &&
            item[item.length - 1] === 'APPROVED') ||
          (!item.includes('CHANGES_REQUESTED') && item.includes('APPROVED'))
      )
      .includes(false);

    await request(`POST ${url}`, {
      data: {
        github: pull_request_info.user.login,
        isApproved,
        reviewer,
      },
    });
  } catch (error) {
    console.log(error);
    core.setFailed(error.message);
  }
};

main();
