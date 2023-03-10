import { NextApiRequest as Req, NextApiResponse as Res } from 'next';

import { User, UserJSON, isUserJSON } from 'lib/model/user';
import { createUser, getUser } from 'lib/api/db/user';
import createAuthUser from 'lib/api/create/auth-user';
import createCustomToken from 'lib/api/create/custom-token';
import { getOrg } from 'lib/api/db/org';
import getUserHash from 'lib/api/get/user-hash';
import { handle } from 'lib/api/error';
import logger from 'lib/api/logger';
import mail from 'lib/mail/users/create';
import segment from 'lib/api/segment';
import updatePhoto from 'lib/api/update/photo';
import updateUserOrgs from 'lib/api/update/user-orgs';
import updateUserTags from 'lib/api/update/user-tags';
import verifyBody from 'lib/api/verify/body';

export type CreateUserRes = UserJSON;

export default async function createUserAPI(
  req: Req,
  res: Res<CreateUserRes>
): Promise<void> {
  try {
    const body = verifyBody<User, UserJSON>(req.body, isUserJSON, User);

    logger.info(`Creating ${body.toString()}...`);

    // TODO: Update the photo after creating the auth user ID so that we can
    // organize our GCP Storage bucket by user (that would require two calls to
    // the auth API, however, so not ideal... perhaps I should assign uIDs).
    const withOrgsUpdate = updateUserOrgs(body);
    const withTagsUpdate = updateUserTags(withOrgsUpdate);
    const withPhotoUpdate = await updatePhoto(withTagsUpdate, User);
    const user = await createAuthUser(withPhotoUpdate);

    // We can perform all of these operations in parallel to speed up our API.
    const [token] = await Promise.all([
      createCustomToken(user.id),
      createUser(user),
      Promise.all(
        user.orgs.map(async (orgId) => {
          // Skip the org signup notification emails if the user is a child
          // being created by a parent while they're booking a new meeting.
          if (user.roles.includes('tutee')) return;

          // Don't send a notification email to the admin who is being created.
          // This fixes a bug when seeding data for tests (e.g. when the org
          // admin is the one being created so his/her data doesn't exist yet).
          const org = await getOrg(orgId);
          const admins = await Promise.all(
            org.members.filter((id) => user.id !== id).map((id) => getUser(id))
          );
          if (admins.length) await mail(user, org, admins);
        })
      ),
    ]);

    const hash = getUserHash(user.id);

    logger.info(`Created ${user.toString()}.`);

    // TODO: Don't send the user a custom login token once #116 is fixed and we
    // get rid of the semi-deprecated (and very unsecure) org signup page.
    res.status(201).json({ ...user.toJSON(), token, hash });

    // TODO: Sometimes parents or admins are creating users that aren't
    // themselves. We should account for that in these analytics calls.
    segment.identify({ userId: user.id, traits: user.toSegment() });
    segment.track({
      userId: user.id,
      event: 'User Created',
      properties: user.toSegment(),
    });
  } catch (e) {
    handle(e, res);
  }
}
