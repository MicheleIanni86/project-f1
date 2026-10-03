import test from 'node:test';
import assert from 'node:assert/strict';
import sheetBlocks from './fixtures/sheet-blocks.json' with { type: 'json' };
import { RACES, getRaceTiming, resolveSeasonRace } from '../../shared/calendar.mjs';
import { getRaceRows, getScoreRange, buildRacePredictionsPayload, buildRaceSummaries, getFallbackPayload, assertRaceSheetLabel } from '../src/index.js';

const race = (id) => RACES.find((entry) => entry.id === id);
const malaysia = {
  season: '2026', round: '16', Circuit: { circuitId: 'sepang' }, date: '2026-10-04', time: '07:00:00Z',
  Qualifying: { date: '2026-10-03', time: '08:00:00Z' }
};
const singapore = {
  season: '2026', round: '17', Circuit: { circuitId: 'marina_bay' }, date: '2026-10-11', time: '12:00:00Z',
  Qualifying: { date: '2026-10-10', time: '13:00:00Z' },
  SprintQualifying: { date: '2026-10-09', time: '12:30:00Z' },
  Sprint: { date: '2026-10-10', time: '09:00:00Z' }
};
const season = { RaceTable: { Races: [malaysia, singapore] } };
let moduleId = 0;
const freshBackend = () => import(`../src/index.js?test=${++moduleId}`);
const response = (MRData) => Response.json({ MRData });

test('all 31 spreadsheet blocks, prediction cells and score rows remain unchanged', () => {
  // Independent snapshot of actual Google Sheet labels, read on 2026-10-03.
  assert.equal(RACES.length, sheetBlocks.length);
  for (const block of sheetBlocks) {
    assert.equal(getRaceRows(block.id).pole, block.poleRow);
    assertRaceSheetLabel(race(block.id), block.name);
  }
  assert.deepEqual(RACES.map((entry) => entry.id), Array.from({ length: 31 }, (_, i) => i + 1));
  for (const entry of RACES) {
    const pole = 3 + (entry.id - 1) * 4;
    assert.deepEqual(getRaceRows(entry.id), { pole, first: pole + 1, second: pole + 2, third: pole + 3 });
    assert.equal(getScoreRange(entry.id), `Foglio1!I${pole}:N${pole}`);
  }
  assert.deepEqual(getRaceRows(23), { pole: 91, first: 92, second: 93, third: 94 });
  assert.equal(race(23).circuitId, 'sepang');
  assert.equal(race(23).isSprint, false);
  assert.equal(race(24).name, 'SINGAPORE SPRINT');
  assert.deepEqual(getRaceRows(24), { pole: 95, first: 96, second: 97, third: 98 });
  assert.equal(race(25).name, 'SINGAPORE');
  assert.equal(race(31).name, 'ABU DHABI');
  assert.deepEqual(getRaceRows(31), { pole: 123, first: 124, second: 125, third: 126 });
  assert.equal(race(5).isCancelled, true);
  const values = Array.from({ length: 4 }, (_, row) => ['', '', ...Array.from({ length: 6 }, (_, col) => `saved-${row}-${col}`)]);
  const original = structuredClone(values);
  const payload = buildRacePredictionsPayload(23, values);
  payload.predictions.forEach((prediction, i) => {
    assert.equal(prediction.pole, `saved-0-${i}`);
    assert.equal(prediction.third, `saved-3-${i}`);
  });
  assert.deepEqual(values, original);
  const summaries = buildRaceSummaries(RACES.map((entry) => [entry.id * 10]));
  assert.equal(summaries.find((entry) => entry.id === 23).points.Andrea, 230);
  assert.equal(getFallbackPayload().races.length, 31);
});

test('sheet headers must match before predictions or scores can be changed', () => {
  assert.doesNotThrow(() => assertRaceSheetLabel(race(23), 'BAHRAIN'));
  assert.doesNotThrow(() => assertRaceSheetLabel(race(24), 'SINGAPORE\nSPRINT'));
  assert.throws(() => assertRaceSheetLabel(race(23), 'SINGAPORE SPRINT'), /operazione bloccata/);
  assert.throws(() => assertRaceSheetLabel(race(24), ''), /operazione bloccata/);
});

test('old open pages cannot save against obsolete calendar IDs', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('No external requests allowed'); });
  t.mock.method(console, 'error', () => {});
  const { default: worker } = await freshBackend();
  for (const endpoint of ['/submit-prediction', '/apply-race-scores']) {
    const res = await worker.fetch(new Request('https://local.test' + endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raceId: 23 })
    }), {});
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /ricarica la pagina/);
  }
});

test('Malaysia and Singapore are matched by identity even when rounds change', () => {
  assert.equal(resolveSeasonRace(race(23), season.RaceTable.Races).round, '16');
  assert.equal(resolveSeasonRace(race(24), season.RaceTable.Races).round, '17');
  assert.equal(resolveSeasonRace(race(25), [{ ...singapore, round: '18' }]).round, '18');
  assert.throws(() => resolveSeasonRace(race(24), [malaysia]), /mancante/);
  assert.throws(() => resolveSeasonRace(race(24), [{ ...singapore, Sprint: null }]), /Sprint mancante/);
  assert.throws(() => resolveSeasonRace(race(25), [singapore, singapore]), /ambiguo/);
});

test('qualifying, race and lock times are separate, including exact deadline boundary', () => {
  assert.equal(race(23).isCancelled, undefined);
  const before = getRaceTiming(race(23), null, new Date('2026-10-03T14:59:59Z'));
  assert.equal(before.isOpen, true);
  assert.equal(before.raceStartsAt.toISOString(), '2026-10-04T07:00:00.000Z');
  const locked = getRaceTiming(race(23), null, new Date('2026-10-03T15:00:00Z'));
  assert.equal(locked.isOpen, false);
  assert.equal(locked.isLocked, true);
  assert.equal(getRaceTiming(race(24), null, new Date('2026-10-03T15:00:00Z')).isOpen, true);
  assert.equal(getRaceTiming(race(6), null).isOpen, false);
});

test('Italian day boundary, DST and Las Vegas work independently of server timezone', () => {
  const event = race(23);
  assert.equal(getRaceTiming(event, null, new Date('2026-10-04T21:59:59Z')).isOngoing, true);
  assert.equal(getRaceTiming(event, null, new Date('2026-10-04T22:00:00Z')).done, true);
  assert.equal(race(29).raceStartsAt, '2026-11-22T04:00:00Z');
  const us = race(26);
  assert.equal(getRaceTiming(us, null, new Date('2026-10-25T22:59:59Z')).done, false);
  assert.equal(getRaceTiming(us, null, new Date('2026-10-25T23:00:00Z')).done, true);
  const capped = getRaceTiming(event, { raceSession: { dateStart: '2026-10-03T09:00:00Z' } });
  assert.equal(capped.lockStartsAt.toISOString(), '2026-10-03T09:00:00.000Z');
});

test('live schedule and lock validation use the same session without writing predictions', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-03T12:00:00Z') });
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options?.method || 'GET', 'GET');
    urls.push(url);
    return response(season);
  });
  const backend = await freshBackend();
  const schedule = await backend.getRaceScheduleInfo(25);
  assert.equal(schedule.raceSession.dateStart, '2026-10-11T12:00:00.000Z');
  assert.equal((await backend.getRaceScheduleInfo(24)).raceSession.dateStart, '2026-10-10T09:00:00.000Z');
  assert.equal((await backend.getPredictionLockInfo(23)).isLocked, false);
  await backend.assertPredictionWindowOpen(23); // After qualifying, but before the 7h deadline.
  t.mock.timers.setTime(Date.parse('2026-10-03T15:00:00Z'));
  await assert.rejects(backend.assertPredictionWindowOpen(23), /chiusi/);
  assert.equal((await backend.getRaceAutoScoreAvailableAt(race(23))).toISOString(), '2026-10-05T07:00:00.000Z');
  assert.ok(urls.every((url) => url.includes('api.jolpi.ca')));
});

test('season cache retries failed fetches and expires after five minutes', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 0 });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    if (calls === 1) throw new Error('temporary outage');
    return response(season);
  });
  const backend = await freshBackend();
  await assert.rejects(backend.getRaceScheduleInfo(25), /temporary outage/);
  await backend.getRaceScheduleInfo(25);
  await backend.getRaceScheduleInfo(24);
  assert.equal(calls, 2);
  t.mock.timers.setTime(300_001);
  await backend.getRaceScheduleInfo(25);
  assert.equal(calls, 3);
});

test('scoring uses Singapore round 17 and rejects results from the wrong event', async (t) => {
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(url);
    if (url.includes('/races/')) return response(season);
    return response({ RaceTable: { Races: [malaysia] } });
  });
  const backend = await freshBackend();
  await assert.rejects(backend.getOfficialRaceResult(race(25)), /altra gara/);
  assert.ok(urls.some((url) => url.includes('/17/results/')));
  assert.ok(!urls.some((url) => url.includes('/16/results/')));
});
