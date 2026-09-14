import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateEventCreation } from '../../../packages/domain/src/event.ts';

// Generates fixture payloads only. No database, account, network or publishing action.
export function createDemoEvents(now = new Date()) {
  const plans = [
    ['easy-run', 'Running', 'Easy evening run', 1, 45, 6, ['beginner', 'intermediate', 'advanced']],
    ['friendly-tennis', 'Tennis', 'Friendly tennis doubles', 2, 60, 4, ['beginner', 'intermediate']],
    ['padel-pair', 'Padel', 'First padel rally', 3, 60, 4, ['beginner', 'intermediate', 'advanced']],
    ['weekend-walk', 'Walking', 'Weekend walking crew', 4, 90, 8, ['beginner', 'intermediate', 'advanced']],
    ['basketball', 'Basketball', 'Casual basketball', 5, 60, 6, ['beginner', 'intermediate']],
    ['tennis-practice', 'Tennis', 'Advanced tennis practice', 6, 90, 2, ['advanced']],
  ];
  return plans.map(([key, sport, title, days, durationMinutes, capacity, experienceLevels]) => {
    const startsAt = new Date(now);
    startsAt.setUTCDate(startsAt.getUTCDate() + days);
    startsAt.setUTCHours(16, 0, 0, 0);
    const payload = {
      sport, title: `DEMO - ${title}`, description: 'DEMO - not a real event. Fictional activity for testing discovery, requests and event management. Do not travel to this event. No venue or host availability is promised.',
      startsAt: startsAt.toISOString(), timeZone: 'Europe/Bucharest', durationMinutes, capacity,
      language: 'English', participantAgeRange: { minimum: 18, maximum: 100 }, experienceLevels,
      location: {
        public: { city: 'Bucharest', countryCode: 'RO', areaLabel: 'Demo area - North', approximateLatitude: null, approximateLongitude: null },
        private: { venueName: 'DEMO - no real venue', address: 'Fictional test address - do not travel', latitude: null, longitude: null, instructions: 'Test fixture only. No real meeting is scheduled.' },
      },
    };
    const result = validateEventCreation(payload, now);
    if (!result.valid) throw new Error(`${key}: ${result.errors.join('; ')}`);
    return { fixtureKey: `keepitup-demo-${key}`, payload };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = new URL('./artifacts/demo-events.json', import.meta.url);
  await mkdir(new URL('./artifacts/', import.meta.url), { recursive: true });
  const events = createDemoEvents();
  await writeFile(destination, JSON.stringify({ createdAt: new Date().toISOString(), status: 'prepared-not-inserted', events }, null, 2));
  console.log(`Prepared ${events.length} validated demo event payloads. No database writes.`);
}
