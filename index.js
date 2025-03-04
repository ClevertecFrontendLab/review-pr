// @ts-check
const core = require('@actions/core');
const github = require('@actions/github');
const { request } = require('@octokit/request');

const API_URL = 'https://training.clevertec.ru';
const REQUIRED_NUMBER_OF_APPROVALS = 2;
const CHANGES_REQUESTED_STATE = 'CHANGES_REQUESTED';
const APPROVED_STATE = 'APPROVED';

const main = async () => {
  try {
    const owner = core.getInput('owner', { required: true });
    const repo = core.getInput('repo', { required: true });
    const pull_number = core.getInput('pull_number', { required: true });
    const token = core.getInput('token', { required: true });
    const base_url = core.getInput('host', { required: false }) || API_URL;
    const url = `${base_url}/pull-request/reviewed`;

    const octokit = github.getOctokit(token);

    const { data: pull_request_info } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: Number(pull_number),
    });

    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: Number(pull_number),
    });

    const authorLogin = pull_request_info.user.login
    const reviewsWithoutAuthor = reviews.filter(({ user }) => user?.login !== authorLogin)

    /** @type {Record<string, string[]>} */
    const reviewUserHistory = reviewsWithoutAuthor.reduce((acc, { user, state }) => {
      if (!user) {
        return acc;
      }

      if (acc[user.login]) {
        acc[user.login].push(state);
      } else {
        acc[user.login] = [state];
      }

      return acc;
    }, {});

    /** @type {string[][]} */
    const reviewStatuses = Object.values(reviewUserHistory);
    const hasEnoughReviews = reviewStatuses.length >= REQUIRED_NUMBER_OF_APPROVALS;
    const isApproved = hasEnoughReviews && reviewStatuses.every((statusesHistory) => statusesHistory[statusesHistory.length - 1] === APPROVED_STATE);

    const latestReview = reviewsWithoutAuthor[reviewsWithoutAuthor.length - 1]
    const shouldPostReviewRequest = isApproved || latestReview?.state === CHANGES_REQUESTED_STATE

    if (shouldPostReviewRequest) {
      await request(`POST ${url}`, {
        data: {
          github: authorLogin,
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
