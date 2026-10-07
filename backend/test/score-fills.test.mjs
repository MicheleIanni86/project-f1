import test from 'node:test';
import assert from 'node:assert/strict';
import { RACES } from '../../shared/calendar.mjs';
import { buildPredictionFillRequests, SCORE_FILLS, getRaceRows } from '../src/index.js';

const race = (id) => RACES.find((entry) => entry.id === id);
const PLAYERS = ['Andrea', 'Giovanni', 'Luca', 'Marco', 'Michele', 'Salvo'];
const GRID_ID = 0;

const parse = (byPlayer) => ({
  predictions: Object.fromEntries(PLAYERS.map((player) => {
    const [pole, ...podium] = byPlayer[player];
    return [player, { pole, podium, manualScore: 0 }];
  })),
});

// Fill of a single cell, or undefined when the cell was left untouched.
const fillAt = (requests, row, column) => {
  const columnIndex = column.charCodeAt(0) - 'A'.charCodeAt(0);
  const match = requests.find((entry) =>
    entry.repeatCell.range.startRowIndex === row - 1
    && entry.repeatCell.range.startColumnIndex === columnIndex);
  return match?.repeatCell.cell.userEnteredFormat.backgroundColor;
};

// SPAGNA (race 21) as read from the sheet on 2026-10-07, with the official
// result from Jolpica: the colours below are the ones already in the sheet.
test('reproduces the colours a human applied to SPAGNA', () => {
  const official = { pole: 'Norris', podium: ['Antonelli', 'Verstappen', 'Norris'] };
  const parsed = parse({
    Andrea: ['Antonelli', 'Antonelli', 'Norris', 'Hamilton'],
    Giovanni: ['Antonelli', 'Antonelli', 'Norris', 'Hamilton'],
    Luca: ['Antonelli', 'Antonelli', 'Hamilton', 'Leclerc'],
    Marco: ['Antonelli', 'Antonelli', 'Norris', 'Russell'],
    Michele: ['Leclerc', 'Antonelli', 'Russell', 'Leclerc'],
    Salvo: ['Antonelli', 'Hamilton', 'Antonelli', 'Leclerc'],
  });
  const requests = buildPredictionFillRequests({ race: race(21), gridId: GRID_ID, parsed, official });
  const rows = getRaceRows(21);

  // Nobody guessed the pole, so no orange anywhere on that row.
  for (const column of 'CDEFGH') {
    assert.deepEqual(fillAt(requests, rows.pole, column), SCORE_FILLS.miss);
  }
  // Antonelli first: exact for everyone who picked him, miss for Salvo's Hamilton.
  for (const column of 'CDEFG') {
    assert.deepEqual(fillAt(requests, rows.first, column), SCORE_FILLS.exact);
  }
  assert.deepEqual(fillAt(requests, rows.first, 'H'), SCORE_FILLS.miss);
  // Norris finished third, so picking him second is a podium hit, not an exact one.
  assert.deepEqual(fillAt(requests, rows.second, 'C'), SCORE_FILLS.onPodium);
  assert.deepEqual(fillAt(requests, rows.second, 'H'), SCORE_FILLS.onPodium);
  assert.deepEqual(fillAt(requests, rows.second, 'E'), SCORE_FILLS.miss);
  assert.deepEqual(fillAt(requests, rows.second, 'G'), SCORE_FILLS.miss);
  // Third row: nobody on the podium.
  for (const column of 'CDEFGH') {
    assert.deepEqual(fillAt(requests, rows.third, column), SCORE_FILLS.miss);
  }
});

test('marks an exact pole orange and keeps exact podium slots green', () => {
  const official = { pole: 'Verstappen', podium: ['Verstappen', 'Antonelli', 'Hamilton'] };
  const parsed = parse({
    Andrea: ['Verstappen', 'Antonelli', 'Verstappen', 'Norris'],
    Giovanni: ['Verstappen', 'Antonelli', 'Verstappen', 'Norris'],
    Luca: ['Antonelli', 'Antonelli', 'Verstappen', 'Russell'],
    Marco: ['Antonelli', 'Antonelli', 'Verstappen', 'Russell'],
    Michele: ['Antonelli', 'Verstappen', 'Antonelli', 'Norris'],
    Salvo: ['Leclerc', 'Hamilton', 'Verstappen', 'Antonelli'],
  });
  const requests = buildPredictionFillRequests({ race: race(23), gridId: GRID_ID, parsed, official });
  const rows = getRaceRows(23);

  assert.deepEqual(fillAt(requests, rows.pole, 'C'), SCORE_FILLS.pole);
  assert.deepEqual(fillAt(requests, rows.pole, 'D'), SCORE_FILLS.pole);
  assert.deepEqual(fillAt(requests, rows.pole, 'E'), SCORE_FILLS.miss);
  // Michele nailed both the winner and the runner-up.
  assert.deepEqual(fillAt(requests, rows.first, 'G'), SCORE_FILLS.exact);
  assert.deepEqual(fillAt(requests, rows.second, 'G'), SCORE_FILLS.exact);
  // Salvo's Hamilton won nothing as a winner pick but is on the podium.
  assert.deepEqual(fillAt(requests, rows.first, 'H'), SCORE_FILLS.onPodium);
  assert.deepEqual(fillAt(requests, rows.third, 'H'), SCORE_FILLS.onPodium);
});

test('leaves a blank prediction untouched so the manual red marker survives', () => {
  const official = { pole: 'Russell', podium: ['Russell', 'Verstappen', 'Hadjar'] };
  const parsed = parse({
    Andrea: ['', '', '', ''],
    Giovanni: ['', 'Antonelli', 'Russell', 'Verstappen'],
    Luca: ['Russell', 'Russell', 'Antonelli', 'Verstappen'],
    Marco: ['Russell', 'Russell', 'Antonelli', 'Verstappen'],
    Michele: ['', 'Verstappen', 'Antonelli', 'Russell'],
    Salvo: ['', 'Hamilton', 'Antonelli', 'Verstappen'],
  });
  const requests = buildPredictionFillRequests({ race: race(22), gridId: GRID_ID, parsed, official });
  const rows = getRaceRows(22);

  // Andrea played nothing: not one of his four cells is addressed.
  for (const row of [rows.pole, rows.first, rows.second, rows.third]) {
    assert.equal(fillAt(requests, row, 'C'), undefined);
  }
  assert.equal(fillAt(requests, rows.pole, 'D'), undefined);
  assert.deepEqual(fillAt(requests, rows.pole, 'E'), SCORE_FILLS.pole);
  assert.deepEqual(fillAt(requests, rows.first, 'E'), SCORE_FILLS.exact);
  assert.deepEqual(fillAt(requests, rows.third, 'E'), SCORE_FILLS.onPodium);
});

test('a manual penalty written instead of a driver keeps its red marker', () => {
  // Rows 75-78 and 87-90 of the real sheet hold "-2"/"-3" penalties in the
  // prediction columns, flagged red by hand. A recalc must not repaint them.
  const official = { pole: 'Russell', podium: ['Russell', 'Verstappen', 'Hadjar'] };
  const parsed = parse({
    Andrea: ['-2', '-3', '', ''],
    Giovanni: ['Russell', 'Russell', 'Verstappen', 'Norris'],
    Luca: ['-2', 'Russell', 'Antonelli', 'Verstappen'],
    Marco: ['Russell', 'Russell', 'Antonelli', 'Verstappen'],
    Michele: ['-2.0', 'Verstappen', 'Antonelli', 'Russell'],
    Salvo: ['', 'Hamilton', 'Antonelli', 'Verstappen'],
  });
  const requests = buildPredictionFillRequests({ race: race(22), gridId: GRID_ID, parsed, official });
  const rows = getRaceRows(22);

  assert.equal(fillAt(requests, rows.pole, 'C'), undefined);
  assert.equal(fillAt(requests, rows.first, 'C'), undefined);
  assert.equal(fillAt(requests, rows.pole, 'E'), undefined);
  assert.equal(fillAt(requests, rows.pole, 'G'), undefined);
  // Real picks in the same block are still painted.
  assert.deepEqual(fillAt(requests, rows.pole, 'D'), SCORE_FILLS.pole);
  assert.deepEqual(fillAt(requests, rows.first, 'E'), SCORE_FILLS.exact);
  assert.deepEqual(fillAt(requests, rows.third, 'G'), SCORE_FILLS.onPodium);
});

test('every request targets one cell of the race block and only paints the background', () => {
  const official = { pole: 'Verstappen', podium: ['Verstappen', 'Antonelli', 'Hamilton'] };
  const parsed = parse(Object.fromEntries(PLAYERS.map((player) =>
    [player, ['Verstappen', 'Verstappen', 'Antonelli', 'Hamilton']])));
  const requests = buildPredictionFillRequests({ race: race(23), gridId: 42, parsed, official });
  const rows = getRaceRows(23);

  assert.equal(requests.length, PLAYERS.length * 4);
  for (const entry of requests) {
    const { range } = entry.repeatCell;
    assert.equal(entry.repeatCell.fields, 'userEnteredFormat.backgroundColor');
    assert.equal(range.sheetId, 42);
    assert.equal(range.endRowIndex - range.startRowIndex, 1);
    assert.equal(range.endColumnIndex - range.startColumnIndex, 1);
    assert.ok(range.startRowIndex + 1 >= rows.pole && range.startRowIndex + 1 <= rows.third);
    // Prediction columns C..H only, never the score columns I..N.
    assert.ok(range.startColumnIndex >= 2 && range.startColumnIndex <= 7);
  }
});
