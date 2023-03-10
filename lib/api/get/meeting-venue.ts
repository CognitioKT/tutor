import { Role, User } from 'lib/model/user';
import { Meeting } from 'lib/model/meeting';
import { Org } from 'lib/model/org';

/**
 * Get the meeting venue:
 * 0. The meeting's existing venue (if it isn't a Jitsi link).
 * 1. Use the org's meeting link (if it exists).
 * 2. Use the tutor's meeting link (if it exists).
 * 3. Use the parent's meeting link (if it exists).
 * 4. Use the tutee's meeting link (if it exists).
 * 5. Fallback to using an automatically generated Jitsi link.
 */
export default function getMeetingVenue(
  meeting: Meeting,
  org: Org,
  people: User[]
): string {
  if (!meeting.venue.includes('meet.jit.si')) return meeting.venue;
  if (org.venue) return org.venue;

  const priority: Role[] = ['tutor', 'parent', 'tutee'];
  // eslint-disable-next-line no-restricted-syntax
  for (const role of priority) {
    const person = people.find((p) => p.roles.includes(role) && p.venue);
    if (person?.venue) return person.venue;
  }

  return meeting.venue;
}
