const core = require('@actions/core');
const github = require('@actions/github');
const { request } = require('@octokit/request');
const fs = require('fs');

const API_URL = 'https://training.clevertec.ru';

const main = async () => {
  try {
    const owner = core.getInput('owner', { required: true });
    const repo = core.getInput('repo', { required: true });
    const pull_number = core.getInput('pull_number', { required: true });
    const token = core.getInput('token', { required: true });
    const base_url = core.getInput('host', { required: false }) || API_URL;
    const url = `${base_url}/pull-request/reviewed`;
    const required_number_of_approvals = 2;
    const CHANGES_REQUESTED_STATE = 'CHANGES_REQUESTED';
    const APPROVED_STATE = 'APPROVED';

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

    const responseCommitsStatuses = reviews.reduce((acc, { user, state }) => {
      if (user.login !== repo) {
        if (acc[user.login]) {
          acc[user.login].push(state);
        } else {
          acc[user.login] = [state];
        }
      }
      return acc;
    }, {});

    const reviewStatuses = Object.values(responseCommitsStatuses);

    const isApproved = !reviewStatuses
      .map(
        (item) =>
          (item.includes(CHANGES_REQUESTED_STATE) && item[item.length - 1] === APPROVED_STATE) ||
          (!item.includes(CHANGES_REQUESTED_STATE) && item.includes(APPROVED_STATE))
      )
      .includes(false);

    const shouldPostReviewRequest = () => {
      const hasRequiredApprovals = reviewStatuses.length >= required_number_of_approvals;
      const hasApprovedState = reviewStatuses.some(item => item.includes(APPROVED_STATE));
      const hasChangesRequestedState = reviewStatuses.some(item => item.includes(CHANGES_REQUESTED_STATE));
      const lastStateIsNotApproved = reviewStatuses[reviewStatuses.length - 1][reviewStatuses[reviewStatuses.length - 1].length - 1] !== APPROVED_STATE;
      
      return (hasRequiredApprovals || !isApproved) && ((hasApprovedState && isApproved) || (hasChangesRequestedState && lastStateIsNotApproved));
    };

    if (shouldPostReviewRequest()) {
      await request(`POST ${url}`, {
        data: {
          github: pull_request_info.user.login,
          isApproved,
          pullNumber: pull_number,
        },
      });
    }
  
  } catch (error) {
    console.log(error);
    core.setFailed(error.message);
  }
};

main();
