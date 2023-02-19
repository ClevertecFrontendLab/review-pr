const getApprove = (reviews) => {
  const responseCommitsStatuses = reviews.reduce((acc, { user, state }) => {
    if (user.login !== 'ephemeralCode') {
      if (acc[user.login]) {
        acc[user.login].push(state);
      } else {
        acc[user.login] = [state];
      }
      console.log(acc);
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
  return isApproved;
};

describe('tests approves', () => {
  it('real-approve - expect TRUE', () => {
    const reviews = [
      {
        user: {
          login: 'dariavorom',
        },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: {
          login: 'ephemeralCode',
        },
        state: 'COMMENTED',
      },
      {
        user: {
          login: 'ephemeralCode',
        },
        state: 'COMMENTED',
      },
      {
        user: {
          login: 'dariavorom',
        },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: {
          login: 'ephemeralCode',
        },
        state: 'COMMENTED',
      },
      {
        user: {
          login: 'dariavorom',
        },
        state: 'APPROVED',
      },
    ];
    expect(getApprove(reviews)).toBe(true);
  });
  it('[CHANGES_REQUESTED] - [CHANGES_REQUESTED]', () => {
    const reviews = [
      {
        user: { login: 'Ivan' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Garrus' },
        state: 'CHANGES_REQUESTED',
      },
    ];
    expect(getApprove(reviews)).toBe(false);
  });
  it('[CHANGES_REQUESTED] - [CHANGES_REQUESTED, APPROVED]', () => {
    const reviews = [
      {
        user: { login: 'Ivan' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Garrus' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Garrus' },
        state: 'APPROVED',
      },
    ];
    expect(getApprove(reviews)).toBe(false);
  });
  it('[CHANGES_REQUESTED, CHANGES_REQUESTED] - [CHANGES_REQUESTED, APPROVED]', () => {
    const reviews = [
      {
        user: { login: 'Ivan' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Garrus' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Garrus' },
        state: 'APPROVED',
      },
      {
        user: { login: 'Ivan' },
        state: 'CHANGES_REQUESTED',
      },
    ];
    expect(getApprove(reviews)).toBe(false);
  });
  it('[CHANGES_REQUESTED, CHANGES_REQUESTED, APPROVED] - [CHANGES_REQUESTED, APPROVED]', () => {
    const reviews = [
      {
        user: { login: 'Ivan' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Garrus' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Garrus' },
        state: 'APPROVED',
      },
      {
        user: { login: 'Ivan' },
        state: 'CHANGES_REQUESTED',
      },
      {
        user: { login: 'Ivan' },
        state: 'APPROVED',
      },
    ];
    expect(getApprove(reviews)).toBe(true);
  });
});
