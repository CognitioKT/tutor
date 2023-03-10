import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { Org, OrgJSON, isOrgJSON } from 'lib/model/org';
import { createOrg } from 'lib/api/db/org';
import { handle } from 'lib/api/error';
import segment from 'lib/api/segment';
import updatePhoto from 'lib/api/update/photo';
import verifyAuth from 'lib/api/verify/auth';
import verifyBody from 'lib/api/verify/body';
import verifyIsOrgAdmin from 'lib/api/verify/is-org-admin';

export type CreateOrgRes = OrgJSON;

export default async function createOrgAPI(
  req: Req,
  res: Res<CreateOrgRes>
): Promise<void> {
  try {
    const body = verifyBody<Org, OrgJSON>(req.body, isOrgJSON, Org);
    const { uid } = await verifyAuth(req.headers);
    verifyIsOrgAdmin(body, uid);
    const org = await createOrg(await updatePhoto(body, Org));
    res.status(201).json(org.toJSON());

    // TODO: Use `segment.group` calls to associate all admins with the new org.
    segment.track({
      userId: uid,
      event: 'Org Created',
      properties: org.toSegment(),
    });
  } catch (e) {
    handle(e, res);
  }
}
