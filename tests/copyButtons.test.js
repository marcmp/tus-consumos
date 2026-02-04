import { jest } from '@jest/globals';
import {
  buildJsonExportData,
  copyTableToClipboard,
  copyWebComparatorJsonToClipboard
} from '../script.js';

const monthKeys = [
  '2024/03', '2024/04', '2024/05', '2024/06',
  '2024/07', '2024/08', '2024/09', '2024/10',
  '2024/11', '2024/12', '2025/01', '2025/02'
];

const monthLabels = [
  'Mar-24', 'Apr-24', 'May-24', 'Jun-24',
  'Jul-24', 'Aug-24', 'Sep-24', 'Oct-24',
  'Nov-24', 'Dec-24', 'Jan-25', 'Feb-25'
];

const expectedCopyAll = [
  'Mar-24\tApr-24\tMay-24\tJun-24\tJul-24\tAug-24\tSep-24\tOct-24\tNov-24\tDec-24\tJan-25\tFeb-25',
  '31\t30\t31\t30\t31\t31\t30\t31\t30\t31\t31\t28',
  '3,0\t3,0\t3,0\t3,0\t3,0\t3,0\t3,0\t3,0\t3,0\t3,0\t3,0\t3,0',
  '6,0\t6,0\t6,0\t6,0\t6,0\t6,0\t6,0\t6,0\t6,0\t6,0\t6,0\t6,0',
  '3,33\t4,10\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00',
  '2,14\t2,30\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00',
  '0,89\t1,10\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00'
].join('\n');

const expectedExcedentes = '1,04\t1,20\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00\t0,00';

const contractDetails = { p1: 3, p2: 6 };

const expectedJson = [
  { name: 'Mar-24', dias: 31, consumoP1: 3.331, consumoP2: 2.137, consumoP3: 0.893, potenciaP1: 3, potenciaP2: 6, excedentes: 1.04 },
  { name: 'Apr-24', dias: 30, consumoP1: 4.1, consumoP2: 2.3, consumoP3: 1.1, potenciaP1: 3, potenciaP2: 6, excedentes: 1.2 },
  { name: 'May-24', dias: 31, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Jun-24', dias: 30, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Jul-24', dias: 31, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Aug-24', dias: 31, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Sep-24', dias: 30, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Oct-24', dias: 31, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Nov-24', dias: 30, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Dec-24', dias: 31, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Jan-25', dias: 31, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 },
  { name: 'Feb-25', dias: 28, consumoP1: 0, consumoP2: 0, consumoP3: 0, potenciaP1: 3, potenciaP2: 6, excedentes: 0 }
];

function buildProcessedDataFixture() {
  const monthlyRows = [
    { days: 31, P1: 3.331, P2: 2.137, P3: 0.893, surplusEnergyKWh: 1.04 },
    { days: 30, P1: 4.1, P2: 2.3, P3: 1.1, surplusEnergyKWh: 1.2 },
    { days: 31, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 30, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 31, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 31, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 30, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 31, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 30, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 31, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 31, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 },
    { days: 28, P1: 0, P2: 0, P3: 0, surplusEnergyKWh: 0 }
  ];

  const data = {};
  monthKeys.forEach((key, index) => {
    data[key] = monthlyRows[index];
  });

  return {
    summaries: {
      byMonth: {
        months: monthKeys,
        data
      }
    }
  };
}

function createCell(value) {
  return { textContent: value };
}

function createRow(label, values, hasLeadingGroupCell = false) {
  const cells = hasLeadingGroupCell
    ? [createCell(''), createCell(label), ...values.map(createCell)]
    : [createCell(label), ...values.map(createCell)];

  return {
    cells,
    querySelector: selector => {
      if (selector !== '.row-label') return null;
      return { textContent: label };
    }
  };
}

function buildFakeTable() {
  return {
    rows: [
      createRow('Facturas', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], true),
      createRow('Descripción', monthLabels, true),
      createRow('Días', ['31', '30', '31', '30', '31', '31', '30', '31', '30', '31', '31', '28'], true),
      createRow('Punta', ['3,0', '3,0', '3,0', '3,0', '3,0', '3,0', '3,0', '3,0', '3,0', '3,0', '3,0', '3,0'], true),
      createRow('Valle', ['6,0', '6,0', '6,0', '6,0', '6,0', '6,0', '6,0', '6,0', '6,0', '6,0', '6,0', '6,0'], false),
      createRow('Punta', ['3,33', '4,10', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00'], true),
      createRow('Llana', ['2,14', '2,30', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00'], false),
      createRow('Valle', ['0,89', '1,10', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00'], false),
      createRow('Suma (total)', ['6,36', '7,50', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00'], false),
      createRow('Excedentes (kWh)', ['1,04', '1,20', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '0,00'], false)
    ]
  };
}

describe('copy buttons payloads', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true
    });
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined)
      },
      configurable: true
    });
    globalThis.alert = jest.fn();
  });

  test('Copiar Potencias y Energía copies exact expected tab-separated text', () => {
    copyTableToClipboard(buildFakeTable(), 'all');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedCopyAll);
  });

  test('Copiar Excedentes copies exact expected tab-separated text', () => {
    copyTableToClipboard(buildFakeTable(), 'excedentes');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedExcedentes);
  });

  test('Copiar Todo copies exact expected JSON string from source data', () => {
    const exportData = buildJsonExportData(buildProcessedDataFixture(), contractDetails);
    copyWebComparatorJsonToClipboard(exportData);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(expectedJson, null, 2));
  });
});
