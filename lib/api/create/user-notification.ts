import to from 'await-to-js';

import { APIError } from 'lib/api/error';
import { SignUpEmail } from 'lib/emails';
import { User } from 'lib/model';
import send from 'lib/api/sendgrid';

/**
 * Creates and sends email notifications whenever a user is created.
 * @param user - The user that was created; the user that we'll send a
 * notification about.
 * @return Promise that resolves once the email notification has been sent;
 * throws an `APIError` if we were unable to create the notification.
 */
export default async function createUserNotification(
  user: User
): Promise<void> {
  const [err] = await to(send(new SignUpEmail(user)));
  if (err) {
    const msg = `${err.name} creating user (${user.toString()}) notification`;
    throw new APIError(`${msg}: ${err.message}`, 500);
  }
}
