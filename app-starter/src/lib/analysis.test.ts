/**
 * analysis.test.ts — nilai acuan TETAP.
 * Jalankan: npm test
 * Jika angka ini berubah tanpa alasan setelah AI mengedit analysis.ts,
 * berarti ada regresi -> kembalikan perubahannya.
 *
 * Memakai node:test (bawaan Node 20+), tanpa dependency tambahan.
 */
import { test } from "node:test";
import assert from "node:assert";
import { timeToSeconds, computeDcp, computeCwt, ageAt } from "./analysis";

test("timeToSeconds: normal & rusak", () => {
  assert.equal(timeToSeconds("01:35:01"), 5701);
  assert.equal(timeToSeconds("undefined"), null);
  assert.equal(timeToSeconds("00:-23:-05"), null); // nilai rusak dibuang
  assert.equal(timeToSeconds(""), null);
});

test("DCP: on time & early dihitung, late tidak; waiting list dibuang", () => {
  const rows = [
    { "Is Waiting List": false, "Patient Time Punctuality": "on time" }, // num
    { "Is Waiting List": false, "Patient Time Punctuality": "early" },   // num
    { "Is Waiting List": false, "Patient Time Punctuality": "late" },    // denom saja
    { "Is Waiting List": true, "Patient Time Punctuality": "on time" },  // dibuang
  ];
  const r = computeDcp(rows);
  assert.equal(r.denominator, 3);
  assert.equal(r.numerator, 2);
  assert.equal(r.pct, 66.7);
});

test("CWT: hanya on time + appointment, rata-rata menit", () => {
  const rows = [
    { "Patient Time Punctuality": "on time", "Appointment VS Walk In": "appointment", "Waiting Time": "00:10:00" },
    { "Patient Time Punctuality": "on time", "Appointment VS Walk In": "appointment", "Waiting Time": "00:20:00" },
    { "Patient Time Punctuality": "early", "Appointment VS Walk In": "appointment", "Waiting Time": "00:05:00" }, // dibuang (early)
    { "Patient Time Punctuality": "on time", "Appointment VS Walk In": "walk_in", "Waiting Time": "00:30:00" },   // dibuang (walk_in)
  ];
  const r = computeCwt(rows);
  assert.equal(r.n, 2);
  assert.equal(r.minutes, 15);
});

test("ageAt", () => {
  assert.equal(ageAt("1956-07-26", new Date("2026-05-31")), 69);
});

import { aggregateReport1ByDate, combineMetrics, parseServiceDate } from "./analysis";

test("parseServiceDate dd/mm/yyyy -> yyyy-mm-dd", () => {
  assert.equal(parseServiceDate("30/05/2026"), "2026-05-30");
});

test("AKURASI RANGE: gabungan agregat harian == hitung langsung seluruh baris", () => {
  // Data lintas 3 tanggal & 2 dokter, mencakup waiting list, walk_in, payer, waktu rusak.
  const rows = [
    { "Appointment Date":"01/05/2026","Doctor Name":"A","Is Waiting List":false,"Patient Time Punctuality":"on time","Appointment VS Walk In":"appointment","Waiting Time":"00:10:00","Payer":"bpjs" },
    { "Appointment Date":"01/05/2026","Doctor Name":"A","Is Waiting List":false,"Patient Time Punctuality":"early","Appointment VS Walk In":"appointment","Waiting Time":"00:05:00","Payer":"regular" },
    { "Appointment Date":"01/05/2026","Doctor Name":"B","Is Waiting List":true,"Patient Time Punctuality":"on time","Appointment VS Walk In":"appointment","Waiting Time":"00:08:00","Payer":"bpjs" },
    { "Appointment Date":"15/06/2026","Doctor Name":"A","Is Waiting List":false,"Patient Time Punctuality":"late","Appointment VS Walk In":"appointment","Waiting Time":"00:20:00","Payer":"bpjs" },
    { "Appointment Date":"15/06/2026","Doctor Name":"B","Is Waiting List":false,"Patient Time Punctuality":"on time","Appointment VS Walk In":"walk_in","Waiting Time":"00:30:00","Payer":"regular" },
    { "Appointment Date":"30/06/2026","Doctor Name":"A","Is Waiting List":false,"Patient Time Punctuality":"on time","Appointment VS Walk In":"appointment","Waiting Time":"00:18:00","Payer":"bpjs" },
  ];

  // Kebenaran acuan: hitung langsung pada seluruh baris.
  const directDcp = computeDcp(rows);     // denom: 5 (satu waiting-list dibuang), num: on time/early = baris 1,2,6 = 3
  const directCwt = computeCwt(rows);     // on time+appointment: baris 1 (600s) & 6 (1080s) -> n=2, avg 14 mnt

  // Jalur DB: agregasi harian lalu gabungkan SELURUH range.
  const daily = aggregateReport1ByDate(rows);
  const combinedAll = combineMetrics(daily);

  assert.equal(combinedAll.dcpNumerator, directDcp.numerator);
  assert.equal(combinedAll.dcpDenominator, directDcp.denominator);
  assert.equal(combinedAll.dcpPct, directDcp.pct);
  assert.equal(combinedAll.cwtCount, directCwt.n);
  assert.equal(combinedAll.cwtMinutes, directCwt.minutes);

  // Range parsial "01/05 - 15/06": kecualikan tanggal 30/06.
  const inRange = daily.filter(d => d.serviceDate >= "2026-05-01" && d.serviceDate <= "2026-06-15");
  const partial = combineMetrics(inRange);
  // direct pada subset yang sama:
  const subsetRows = rows.filter(r => { const d = parseServiceDate(r["Appointment Date"]); return d >= "2026-05-01" && d <= "2026-06-15"; });
  assert.equal(partial.dcpPct, computeDcp(subsetRows).pct);
  assert.equal(partial.cwtMinutes, computeCwt(subsetRows).minutes);
});
