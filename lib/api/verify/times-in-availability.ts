import { Availability, Timeslot, User } from 'lib/model';
import APIError from 'lib/api/helpers/error';

/**
 * Verifies that the given times are included within the given people's
 * availability.
 * @param times - An array of timeslots that should be in the people's
 * availability.
 * @param people - The people whose availability should include `times`.
 * @return Nothing; throws an `APIError` if the given `times` are NOT within the
 * given `people`'s availability.
 */
export default function verifyTimesInAvailability(
  times: Availability,
  people: User[]
): void {
  people.forEach((person: User) => {
    times.forEach((time: Timeslot) => {
      if (!person.availability.contains(time))
        throw new APIError(
          `${person.toString()} is not available ${time.toString()}`
        );
    });
  });
}
