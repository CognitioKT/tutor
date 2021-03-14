const path = require('path');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'production';
console.log(`Loading ${env} environment variables...`);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}.local`) });

console.log(
  'Using Firebase configuration:',
  JSON.stringify(
    {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      serviceAccountId: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    },
    null,
    2
  )
);

const fs = require('fs');
const clone = require('rfdc')();
const admin = require('firebase-admin');
const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_ADMIN_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  }),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  serviceAccountId: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});
const db = app.firestore();

async function downloadData(orgId) {
  console.log(`Fetching (${orgId}) data...`);
  const [users, matches, meetings] = (
    await Promise.all([
      db.collection('users').where('orgs', 'array-contains', orgId).get(),
      db.collection('matches').where('org', '==', orgId).get(),
      db.collection('meetings').where('match.org', '==', orgId).get(),
    ])
  ).map((s) =>
    s.docs.map((d) => ({
      ...d.data(),
      created: d.createTime ? d.createTime.toDate() : new Date(),
      updated: d.updateTime ? d.updateTime.toDate() : new Date(),
    }))
  );

  console.log('Saving as JSON...');
  fs.writeFileSync(`./${orgId}-users.json`, JSON.stringify(users));
  fs.writeFileSync(`./${orgId}-matches.json`, JSON.stringify(matches));
  fs.writeFileSync(`./${orgId}-meetings.json`, JSON.stringify(meetings));
}

/**
 * Script that creates the analytics documents for org activity by:
 * 1. Fetching all org users, meetings, and matches.
 * 2. Updating the tags on all of those resources.
 * 3. Iterating over those resources, trying to add to existing analytics doc
 *    (within 24 hours of resource create timestamp). If we can't, create a new
 *    analytics doc and insert it into the growing timeline.
 * 4. Uploading the created timeline to Firestore.
 */
async function main(orgId, dryRun = false) {
  console.log(`Fetching (${orgId}) data...`);
  const usersData = require(`./${orgId}-users.json`);
  const matchesData = require(`./${orgId}-matches.json`);
  const meetingsData = require(`./${orgId}-meetings.json`);

  console.log('Updating tags...');
  const users = usersData
    .map((data) => {
      const user = { tags: [], ...data };
      const created = new Date(data.created || new Date());
      const updated = new Date(data.updated || new Date());
      const tags = [];
      if (user.mentoring.subjects.length || user.tags.includes('mentor'))
        tags.push('mentor');
      if (user.mentoring.searches.length || user.tags.includes('mentee'))
        tags.push('mentee');
      if (user.tutoring.subjects.length || user.tags.includes('tutor'))
        tags.push('tutor');
      if (user.tutoring.searches.length || user.tags.includes('tutee'))
        tags.push('tutee');
      if (user.verifications.length) tags.push('vetted');
      return { ...user, created, updated, tags };
    })
    .sort((a, b) => a.created - b.created);
  const matches = matchesData
    .map((data) => {
      // TODO: Once I implement the tag updating API logic, add it here as well.
      const match = data;
      const created = new Date(data.created || new Date());
      const updated = new Date(data.updated || new Date());
      match.people.forEach(({ id: personId }) => {
        const person = users.find((p) => p.id === personId);
        if (!person) return;
        if (!person.tags.includes('matched')) person.tags.push('matched');
      });
      return { ...match, created, updated, tags: [] };
    })
    .sort((a, b) => a.created - b.created);
  const meetings = meetingsData
    .map((data) => {
      // TODO: Once I implement the tag updating API logic, add it here as well.
      const meeting = data;
      const created = new Date(data.created || new Date());
      const updated = new Date(data.updated || new Date());
      meeting.match.people.forEach(({ id: personId }) => {
        const person = users.find((p) => p.id === personId);
        if (!person) return;
        if (!person.tags.includes('meeting')) person.tags.push('meeting');
      });
      return { ...meeting, created, updated, tags: [] };
    })
    .sort((a, b) => a.created - b.created);

  console.log('Creating timeline...');
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstUser = users[0].created.valueOf();
  const firstMatch = matches[0].created.valueOf();
  const firstMeeting = meetings[0].created.valueOf();
  const first = new Date(Math.min(firstUser, firstMatch, firstMeeting));
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    first.getDate() - 1
  );
  const timeline = [];
  const empty = {
    mentor: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    mentee: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    tutor: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    tutee: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    match: { total: 0, meeting: 0 },
    meeting: { total: 0, recurring: 0 },
  };

  let date = start;
  while (date <= current) {
    timeline.push(clone({ date, ...empty }));
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }

  function isRole(role) {
    if (typeof role !== 'string') return false;
    return ['tutor', 'tutee', 'mentor', 'mentee'].includes(role);
  }

  function updateTags(key, nums, tags) {
    nums[key].total += 1;
    tags.forEach((tag) => {
      if (!isRole(tag)) nums[key][tag] += 1;
    });
  }

  function prevDate(date, other) {
    const prev = new Date(
      other.getFullYear(),
      other.getMonth(),
      other.getDate() - 1
    );
    return (
      date.getFullYear() === prev.getFullYear() &&
      date.getMonth() === prev.getMonth() &&
      date.getDate() === prev.getDate()
    );
  }

  function sameDate(date, other) {
    return (
      date.getFullYear() === other.getFullYear() &&
      date.getMonth() === other.getMonth() &&
      date.getDate() === other.getDate()
    );
  }

  console.log(`Adding ${users.length} users to timeline...`);
  users.forEach((user) => {
    const current = timeline.find((n) => sameDate(n.date, user.created));
    const currentIdx = timeline.indexOf(current);
    timeline.slice(currentIdx).forEach((nums) => {
      user.tags.forEach((role) => {
        if (isRole(role)) updateTags(role, nums, user.tags);
      });
    });
  });

  console.log(`Adding ${matches.length} matches to timeline...`);
  matches.forEach((match) => {
    const current = timeline.find((n) => sameDate(n.date, match.created));
    const currentIdx = timeline.indexOf(current);
    timeline.slice(currentIdx).forEach((nums) => {
      updateTags('match', nums, match.tags);
    });
  });

  console.log(`Adding ${meetings.length} meetings to timeline...`);
  meetings.forEach((meeting) => {
    const current = timeline.find((n) => sameDate(n.date, meeting.created));
    const currentIdx = timeline.indexOf(current);
    timeline.slice(currentIdx).forEach((nums) => {
      updateTags('meeting', nums, meeting.tags);
    });
  });

  console.log('Writing timeline to JSON...');
  fs.writeFileSync('./timeline.json', JSON.stringify(timeline, null, 2));

  if (dryRun) return;

  console.log(`Creating ${timeline.length} database records...`);
  await Promise.all(
    timeline.map(async (nums) => {
      const ref = db
        .collection('orgs')
        .doc(orgId)
        .collection('analytics')
        .doc();
      nums.created = nums.updated = new Date();
      nums.id = ref.id;
      await ref.set(nums);
    })
  );
}

main('quarantunes');
