import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { Meeting, MeetingJSON, isMeetingJSON } from 'lib/model';
import createMeetingDoc from 'lib/api/create/meeting-doc';
import createMeetingSearchObj from 'lib/api/create/meeting-search-obj';
import getMatch from 'lib/api/get/match';
import { handle } from 'lib/api/error';
import verifyAuth from 'lib/api/verify/auth';
import verifyBody from 'lib/api/verify/body';

export type CreateMeetingRes = MeetingJSON;

export default async function createMeeting(
  req: Req,
  res: Res<CreateMeetingRes>
): Promise<void> {
  try {
    const body = verifyBody<Meeting, MeetingJSON>(
      req.body,
      isMeetingJSON,
      Meeting
    );
    body.match = await getMatch(body.match.id);

    await verifyAuth(req.headers, {
      userIds: body.match.people.map((p) => p.id),
      orgIds: [body.match.org],
    });

    const meeting = await createMeetingDoc(body);
    await createMeetingSearchObj(meeting);

    res.status(200).json(meeting.toJSON());
  } catch (e) {
    handle(e, res);
  }
}
