import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { Match, MatchJSON, isMatchJSON } from 'lib/model';
import analytics from 'lib/api/analytics';
import getPeople from 'lib/api/get/people';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
import updateMatchDoc from 'lib/api/update/match-doc';
import updateMatchSearchObj from 'lib/api/update/match-search-obj';
import updateMatchTags from 'lib/api/update/match-tags';
import updatePeopleRoles from 'lib/api/update/people-roles';
import verifyAuth from 'lib/api/verify/auth';
import verifyBody from 'lib/api/verify/body';
import verifyDocExists from 'lib/api/verify/doc-exists';
import verifySubjectsCanBeTutored from 'lib/api/verify/subjects-can-be-tutored';

export type UpdateMatchRes = MatchJSON;

export default async function updateMatch(
  req: Req,
  res: Res<UpdateMatchRes>
): Promise<void> {
  try {
    const body = verifyBody<Match, MatchJSON>(req.body, isMatchJSON, Match);

    await verifyDocExists('matches', body.id);

    const people = await getPeople(body.people);

    verifySubjectsCanBeTutored(body.subjects, people);

    // TODO: Compare the previous data with the requested updates to ensure that
    // the creator hasn't changed (if it has, users could bypass these checks).
    const { uid } = await verifyAuth(req.headers, {
      userIds: body.people.map((p) => p.id),
      orgIds: [body.org],
    });

    const match = updateMatchTags(body);

    await Promise.all([
      updateMatchDoc(match),
      updateMatchSearchObj(match),
      updatePeopleRoles(people),
    ]);

    res.status(200).json(match.toJSON());

    segment.track({
      userId: uid,
      event: 'Match Updated',
      properties: match.toSegment(),
    });

    await analytics(match, 'updated');
  } catch (e) {
    handle(e, res);
  }
}
