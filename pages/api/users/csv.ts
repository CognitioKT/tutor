import { NextApiRequest, NextApiResponse } from 'next';

import { UsersQuery } from 'lib/model/query/users';
import csv from 'lib/api/csv';
import { getUsers } from 'lib/api/db/user';
import { handle } from 'lib/api/error';
import verifyAuth from 'lib/api/verify/auth';

/**
 * GET - Downloads a CSV list of the filtered users.
 *
 * Requires admin authentication.
 */
export default async function users(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method as string} Not Allowed`);
    return;
  }

  try {
    const query = UsersQuery.params(req.query as Record<string, string>);

    // TODO: Update this using `paginationLimitedTo` or the `browseObjects` API
    // when we start scaling up (and have orgs with more than 1000 users each).
    query.hitsPerPage = 1000;

    await verifyAuth(req.headers, { orgIds: query.orgs });

    const { results } = await getUsers(query);

    // TODO: Replace the language codes with their actual i18n names.
    csv(
      res,
      'users',
      results.map((user) => user.toCSV())
    );
  } catch (e) {
    handle(e, res);
  }
}
