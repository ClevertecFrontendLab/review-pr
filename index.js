// @ts-check
const core = require('@actions/core');
const github = require('@actions/github');
const { request } = require('@octokit/request');

const API_URL = 'https://training.clevertec.ru';
const CHANGES_REQUESTED_STATE = 'CHANGES_REQUESTED';
const APPROVED_STATE = 'APPROVED';
const PENDING_STATE = 'PENDING';
const statusesToCollect = [APPROVED_STATE, CHANGES_REQUESTED_STATE];

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
      pull_number: Number(pull_number)
    });

    const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: Number(pull_number),
      per_page: 100,
    });

    // последний актуальный коммит в ПР участника
    const { data: commit_info } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: pull_request_info.head.sha
    });

    const authorLogin = pull_request_info.user.login;
    const reviewsWithoutAuthor = reviews.filter(({ user }) => user?.login !== authorLogin);

    /** @type {Record<string, { submitted_at?: string, state: string }[]>} */
    const reviewUserHistory = reviewsWithoutAuthor.reduce((acc, { user, state, submitted_at }) => {
      if (!user) {
        return acc;
      }

      acc[user.login] = acc[user.login] ?? [];
      acc[user.login].push({ submitted_at, state });

      return acc;
    }, {});

    const reviewStatuses = Object.entries(reviewUserHistory);

    /** @type {{mentorGithub: string, status: string}[]} */
    const mentorStatuses = [];

    reviewStatuses.forEach(([name, mentorHistory]) => {
      let index = mentorHistory.length - 1;

      // поиск первого статуса ревью с конца истории
      while (index >= 0 && !statusesToCollect.includes(mentorHistory[index].state)) {
        index--;
      }

      if (index < 0) {
        return mentorStatuses.push({ mentorGithub: name, status: PENDING_STATE });
      }

      const { state, submitted_at: reviewDate } = mentorHistory[index];

      // проверка устарело ли ревью CHANGES_REQUESTED по сравнению с датой последнего коммита участника
      if (state === CHANGES_REQUESTED_STATE) {
        const lastCommitDate = commit_info.commit.committer?.date;

        if (lastCommitDate && reviewDate && new Date(lastCommitDate) > new Date(reviewDate)) {
          return mentorStatuses.push({ mentorGithub: name, status: PENDING_STATE });
        }
      }

      mentorStatuses.push({ mentorGithub: name, status: state });
    });

    const latestReview = reviewsWithoutAuthor[reviewsWithoutAuthor.length - 1];
    const isLastChangesRequested = latestReview?.state === CHANGES_REQUESTED_STATE;
    const isLastApproved = latestReview?.state === APPROVED_STATE;

    if (isLastApproved || isLastChangesRequested) {
      await request(`POST ${url}`, {
        data: {
          github: authorLogin,
          link: pull_request_info.html_url,
          pullNumber: pull_number,
          reviews: mentorStatuses,
          changesRequested: isLastChangesRequested
        }
      });
    }
  } catch (error) {
    console.log(error);
    core.setFailed(error.message);
  }
};

main();
