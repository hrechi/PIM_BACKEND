const fs = require('fs');
const path = require('path');

const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'base_assets.json'), 'utf8'));

function random(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function makeSeries({ prefix, numbers, suffix = '', category, usage, hpRange }) {
  return numbers.map((number) => ({ prefix, number, suffix, category, usage, hpRange }));
}

function buildModelName(series) {
  return `${series.prefix}${series.number}${series.suffix}`;
}

function pickHpRange(category) {
  switch (category) {
    case 'DRONE':
      return [0, 0];
    case 'SPRAYER':
      return [90, 300];
    case 'HARVESTER':
      return [150, 650];
    case 'SEEDER':
      return [40, 180];
    default:
      return [40, 350];
  }
}

const brandProfiles = {
  'John Deere': [
    ...makeSeries({ prefix: '50', numbers: [75, 80, 85, 90, 95, 100, 105, 110, 115, 120], suffix: 'E', category: 'TRACTOR', usage: ['Plowing', 'Tillage'], hpRange: [70, 120] }),
    ...makeSeries({ prefix: '5M ', numbers: [90, 100, 110, 120, 130, 140, 150, 160, 170, 180], category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [90, 180] }),
    ...makeSeries({ prefix: '6M ', numbers: [95, 105, 115, 125, 135, 145, 155, 165, 175, 185], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [95, 185] }),
    ...makeSeries({ prefix: '6R ', numbers: [120, 130, 140, 150, 160, 170, 180, 190, 200, 210], category: 'TRACTOR', usage: ['Plowing', 'Heavy transport'], hpRange: [120, 210] }),
    ...makeSeries({ prefix: '7R ', numbers: [210, 220, 230, 240, 250, 260, 270, 280, 290, 300], category: 'TRACTOR', usage: ['Tillage', 'Transport'], hpRange: [210, 300] }),
    ...makeSeries({ prefix: '8R ', numbers: [230, 240, 250, 260, 270, 280, 290, 300, 310, 320], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [230, 320] }),
    ...makeSeries({ prefix: 'S', numbers: [760, 770, 780, 790, 800, 810, 820, 830, 840, 850], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [300, 650] }),
    ...makeSeries({ prefix: 'X9 ', numbers: [1000, 1025, 1050, 1075, 1100, 1125, 1150, 1175, 1200, 1225], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [500, 650] }),
    ...makeSeries({ prefix: 'R40', numbers: [30, 35, 40, 45, 50, 55, 60, 65, 70, 75], category: 'SPRAYER', usage: ['Spraying'], hpRange: [90, 250] }),
    ...makeSeries({ prefix: '1775 ', numbers: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120], category: 'SEEDER', usage: ['Seeding'], hpRange: [40, 120] }),
  ],
  'Massey Ferguson': [
    ...makeSeries({ prefix: 'MF ', numbers: [240, 260, 290, 375, 390, 4707, 4708, 4709, 4710, 4711], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [45, 110] }),
    ...makeSeries({ prefix: 'MF ', numbers: [5710, 5711, 5712, 5713, 5714, 5715, 5716, 5718, 5720, 5722], category: 'TRACTOR', usage: ['Plowing', 'Seeding'], hpRange: [95, 150] }),
    ...makeSeries({ prefix: 'MF ', numbers: [6712, 6713, 6714, 6715, 6716, 6718, 6720, 6722, 6726, 6730], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [120, 180] }),
    ...makeSeries({ prefix: 'MF ', numbers: [7720, 7722, 7724, 7726, 7730, 7732, 7734, 7736, 7738, 7740], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [180, 260] }),
    ...makeSeries({ prefix: 'MF ', numbers: [8737, 8740, 8742, 8745, 8750, 8755, 8760, 8765, 8770, 8775], category: 'TRACTOR', usage: ['Heavy farming', 'Transport'], hpRange: [240, 320] }),
    ...makeSeries({ prefix: 'Activa ', numbers: [7340, 7344, 7347, 7348, 7350, 7354, 7358, 7362, 7366, 7370], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [120, 220] }),
    ...makeSeries({ prefix: 'Beta ', numbers: [7360, 7370, 7380, 7390, 7400, 7410, 7420, 7430, 7440, 7450], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [200, 320] }),
    ...makeSeries({ prefix: 'MF ', numbers: [28, 30, 32, 35, 40, 42, 45, 50, 55, 60], category: 'SPRAYER', usage: ['Spraying'], hpRange: [80, 180] }),
    ...makeSeries({ prefix: 'MF ', numbers: [7300, 7400, 7500, 7600, 7700, 7800, 7900, 8000, 8100, 8200], category: 'SEEDER', usage: ['Seeding'], hpRange: [70, 160] }),
    ...makeSeries({ prefix: 'MF ', numbers: [150, 155, 160, 165, 170, 175, 180, 185, 190, 195], suffix: 'S', category: 'TRACTOR', usage: ['Transport'], hpRange: [150, 200] }),
  ],
  'New Holland': [
    ...makeSeries({ prefix: 'T4.', numbers: [65, 75, 85, 95, 105, 115, 125, 135, 145, 155], category: 'TRACTOR', usage: ['Tillage', 'Transport'], hpRange: [65, 155] }),
    ...makeSeries({ prefix: 'T5.', numbers: [95, 105, 115, 125, 135, 145, 155, 165, 175, 185], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [95, 185] }),
    ...makeSeries({ prefix: 'T6.', numbers: [145, 155, 160, 165, 175, 180, 185, 190, 195, 200], category: 'TRACTOR', usage: ['Tillage', 'Transport'], hpRange: [145, 200] }),
    ...makeSeries({ prefix: 'T7.', numbers: [210, 220, 230, 240, 245, 250, 260, 270, 280, 290], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [210, 290] }),
    ...makeSeries({ prefix: 'T8.', numbers: [275, 300, 320, 340, 360, 380, 400, 420, 435, 450], category: 'TRACTOR', usage: ['Heavy farming', 'Transport'], hpRange: [275, 450] }),
    ...makeSeries({ prefix: 'CR', numbers: [790, 890, 990, 1090, 1190, 1290, 1390, 1490, 1590, 1690], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [250, 650] }),
    ...makeSeries({ prefix: 'FR', numbers: [450, 550, 650, 780, 920, 980, 1050, 1100, 1150, 1200], category: 'HARVESTER', usage: ['Forage harvesting'], hpRange: [250, 650] }),
    ...makeSeries({ prefix: 'SP', numbers: [210, 240, 260, 310, 350, 410, 450, 500, 550, 600], category: 'SPRAYER', usage: ['Spraying'], hpRange: [120, 300] }),
    ...makeSeries({ prefix: 'SD', numbers: [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400], category: 'SEEDER', usage: ['Seeding'], hpRange: [70, 180] }),
    ...makeSeries({ prefix: 'T', numbers: [190, 200, 210, 220, 230, 240, 250, 260, 270, 280], suffix: 'A', category: 'TRACTOR', usage: ['Spraying', 'Transport'], hpRange: [120, 220] }),
  ],
  Kubota: [
    ...makeSeries({ prefix: 'L', numbers: [2501, 3301, 3901, 4701, 3902, 4702, 4802, 3302, 2502, 4202], category: 'TRACTOR', usage: ['Plowing', 'Loader work'], hpRange: [25, 55] }),
    ...makeSeries({ prefix: 'M4-', numbers: [71, 72, 73, 83, 91, 92, 101, 102, 111, 121], category: 'TRACTOR', usage: ['Tillage', 'Transport'], hpRange: [65, 121] }),
    ...makeSeries({ prefix: 'M5-', numbers: [91, 111, 112, 122, 132, 152, 162, 172, 182, 192], category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [85, 192] }),
    ...makeSeries({ prefix: 'M6-', numbers: [101, 111, 131, 141, 151, 161, 171, 181, 191, 201], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [95, 201] }),
    ...makeSeries({ prefix: 'M7-', numbers: [132, 152, 172, 182, 192, 202, 212, 222, 232, 242], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [130, 242] }),
    ...makeSeries({ prefix: 'B', numbers: [2301, 2601, 2920, 3001, 3201, 3301, 3401, 3501, 3601, 3701], category: 'TRACTOR', usage: ['Orchard work', 'Loader work'], hpRange: [20, 40] }),
    ...makeSeries({ prefix: 'SVL', numbers: [65, 75, 97, 100, 110, 120, 130, 140, 150, 160], category: 'SPRAYER', usage: ['Spraying'], hpRange: [60, 160] }),
    ...makeSeries({ prefix: 'KX ', numbers: ['033', '040', '057', '080', '085', '090', '100', '110', '120', '130'], category: 'SEEDER', usage: ['Seeding', 'Earthmoving'], hpRange: [30, 130] }),
    ...makeSeries({ prefix: 'DR', numbers: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140], category: 'DRONE', usage: ['Crop Monitoring'], hpRange: [0, 0] }),
    ...makeSeries({ prefix: 'M8-', numbers: [301, 321, 351, 381, 401, 421, 451, 471, 491, 511], category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [240, 511] }),
  ],
  'Case IH': [
    ...makeSeries({ prefix: 'Farmall ', numbers: [65, 75, 85, 95, 105, 115, 125, 135, 145, 155], suffix: 'A', category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [60, 155] }),
    ...makeSeries({ prefix: 'Maxxum ', numbers: [115, 125, 135, 145, 150, 165, 175, 185, 195, 205], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [110, 205] }),
    ...makeSeries({ prefix: 'Puma ', numbers: [165, 180, 195, 210, 225, 240, 255, 260, 275, 285], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [165, 285] }),
    ...makeSeries({ prefix: 'Optum ', numbers: [270, 300, 340, 360, 380, 400, 420, 440, 460, 480], category: 'TRACTOR', usage: ['Heavy farming', 'Transport'], hpRange: [270, 480] }),
    ...makeSeries({ prefix: 'Magnum ', numbers: [280, 310, 340, 380, 410, 440, 470, 500, 530, 580], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [280, 580] }),
    ...makeSeries({ prefix: 'Steiger ', numbers: [420, 470, 500, 550, 600, 650, 700, 750, 800, 850], category: 'TRACTOR', usage: ['Large-scale tillage'], hpRange: [420, 850] }),
    ...makeSeries({ prefix: 'Axial-Flow ', numbers: [7240, 8250, 9250, 7260, 8260, 9260, 7150, 8150, 9150, 7155], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [250, 650] }),
    ...makeSeries({ prefix: 'Patriot ', numbers: [3340, 4440, 5550, 3345, 4445, 5555, 1230, 1240, 1250, 1260], category: 'SPRAYER', usage: ['Spraying'], hpRange: [120, 300] }),
    ...makeSeries({ prefix: 'Precision ', numbers: [2150, 2160, 2170, 2180, 2190, 2200, 2210, 2220, 2230, 2240], category: 'SEEDER', usage: ['Seeding'], hpRange: [80, 180] }),
    ...makeSeries({ prefix: 'Farmall ', numbers: [120, 130, 140, 150, 160, 170, 180, 190, 200, 210], suffix: 'A', category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [120, 210] }),
  ],
  Valtra: [
    ...makeSeries({ prefix: 'A', numbers: [75, 85, 95, 105, 115, 125, 135, 145, 155, 165], category: 'TRACTOR', usage: ['General farming', 'Transport'], hpRange: [70, 165] }),
    ...makeSeries({ prefix: 'G', numbers: [105, 115, 125, 135, 145, 155, 165, 175, 185, 195], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [100, 195] }),
    ...makeSeries({ prefix: 'N', numbers: [104, 114, 124, 134, 144, 154, 174, 194, 214, 234], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [100, 234] }),
    ...makeSeries({ prefix: 'T', numbers: [144, 154, 174, 194, 214, 234, 244, 254, 264, 274], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [140, 274] }),
    ...makeSeries({ prefix: 'Q', numbers: [235, 255, 275, 295, 305, 315, 325, 335, 345, 355], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [235, 355] }),
    ...makeSeries({ prefix: 'S', numbers: [274, 294, 324, 354, 394, 416, 426, 436, 446, 456], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [274, 456] }),
    ...makeSeries({ prefix: 'Hitec ', numbers: [100, 130, 150, 170, 190, 210, 230, 250, 270, 290], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [150, 300] }),
    ...makeSeries({ prefix: 'Frontier ', numbers: [220, 240, 260, 280, 300, 320, 340, 360, 380, 400], category: 'SPRAYER', usage: ['Spraying'], hpRange: [100, 400] }),
    ...makeSeries({ prefix: 'Nova ', numbers: [300, 350, 400, 450, 500, 550, 600, 650, 700, 750], category: 'SEEDER', usage: ['Seeding'], hpRange: [80, 160] }),
    ...makeSeries({ prefix: 'SmartTouch ', numbers: [80, 100, 120, 140, 160, 180, 200, 220, 240, 260], category: 'DRONE', usage: ['Crop Monitoring'], hpRange: [0, 0] }),
  ],
  Claas: [
    ...makeSeries({ prefix: 'Arion ', numbers: [410, 420, 430, 440, 450, 460, 470, 510, 530, 540], category: 'TRACTOR', usage: ['Tillage', 'Transport'], hpRange: [100, 220] }),
    ...makeSeries({ prefix: 'Arion ', numbers: [610, 620, 630, 640, 650, 660, 670, 680, 690, 700], category: 'TRACTOR', usage: ['Tillage', 'Transport'], hpRange: [180, 260] }),
    ...makeSeries({ prefix: 'Axion ', numbers: [810, 820, 830, 840, 850, 870, 890, 900, 920, 940], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [180, 350] }),
    ...makeSeries({ prefix: 'Nexos ', numbers: [220, 230, 240, 260, 270, 280, 290, 300, 310, 320], category: 'TRACTOR', usage: ['Orchard work', 'Loader work'], hpRange: [70, 120] }),
    ...makeSeries({ prefix: 'Lexion ', numbers: [760, 770, 780, 790, 880, 890, 700, 750, 7600, 7700], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [250, 650] }),
    ...makeSeries({ prefix: 'Trion ', numbers: [500, 530, 550, 660, 750, 760, 770, 780, 790, 800], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [220, 450] }),
    ...makeSeries({ prefix: 'Jaguar ', numbers: [840, 850, 870, 890, 900, 920, 930, 940, 950, 960], category: 'HARVESTER', usage: ['Forage harvesting'], hpRange: [400, 650] }),
    ...makeSeries({ prefix: 'Avero ', numbers: [240, 340, 360, 380, 400, 420, 440, 460, 480, 500], category: 'SPRAYER', usage: ['Spraying'], hpRange: [120, 220] }),
    ...makeSeries({ prefix: 'Cemos ', numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], category: 'SEEDER', usage: ['Seeding'], hpRange: [50, 120] }),
    ...makeSeries({ prefix: 'Quadtrac ', numbers: [470, 500, 530, 560, 590, 620, 650, 680, 710, 740], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [470, 740] }),
  ],
  Fendt: [
    ...makeSeries({ prefix: '200 Vario ', numbers: [207, 208, 209, 210, 211, 212, 213, 214, 215, 216], category: 'TRACTOR', usage: ['Orchard work', 'Transport'], hpRange: [70, 110] }),
    ...makeSeries({ prefix: '300 Vario ', numbers: [310, 311, 312, 313, 314, 315, 316, 317, 318, 319], category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [100, 150] }),
    ...makeSeries({ prefix: '500 Vario ', numbers: [512, 513, 514, 515, 516, 517, 518, 519, 520, 521], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [120, 180] }),
    ...makeSeries({ prefix: '700 Vario ', numbers: [714, 716, 718, 720, 722, 724, 726, 728, 730, 732], category: 'TRACTOR', usage: ['Heavy tillage', 'Transport'], hpRange: [150, 260] }),
    ...makeSeries({ prefix: '900 Vario ', numbers: [927, 930, 933, 936, 939, 942, 945, 948, 951, 954], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [250, 400] }),
    ...makeSeries({ prefix: '1000 Vario ', numbers: [1042, 1044, 1046, 1048, 1050, 1052, 1054, 1056, 1058, 1060], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [350, 550] }),
    ...makeSeries({ prefix: 'Katana ', numbers: [650, 850, 900, 950, 980, 1000, 1050, 1100, 1150, 1200], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [350, 650] }),
    ...makeSeries({ prefix: 'Ideal ', numbers: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [350, 650] }),
    ...makeSeries({ prefix: 'RoGator ', numbers: [655, 665, 675, 685, 695, 705, 715, 725, 735, 745], category: 'SPRAYER', usage: ['Spraying'], hpRange: [120, 240] }),
    ...makeSeries({ prefix: 'Former ', numbers: [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100], category: 'SEEDER', usage: ['Seeding'], hpRange: [90, 180] }),
  ],
  'Deutz-Fahr': [
    ...makeSeries({ prefix: '5G ', numbers: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140], category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [50, 140] }),
    ...makeSeries({ prefix: '5D ', numbers: [75, 85, 95, 105, 115, 125, 135, 145, 155, 165], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [70, 165] }),
    ...makeSeries({ prefix: '6C ', numbers: [100, 110, 120, 130, 140, 150, 160, 170, 180, 190], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [100, 190] }),
    ...makeSeries({ prefix: '6.4 ', numbers: [120, 130, 140, 150, 160, 170, 180, 190, 200, 210], category: 'TRACTOR', usage: ['Heavy tillage'], hpRange: [120, 210] }),
    ...makeSeries({ prefix: '6.5 ', numbers: [155, 165, 175, 185, 195, 205, 215, 225, 235, 245], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [155, 245] }),
    ...makeSeries({ prefix: '7 ', numbers: [210, 215, 225, 230, 245, 250, 255, 260, 270, 280], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [210, 280] }),
    ...makeSeries({ prefix: '9 ', numbers: [240, 250, 260, 270, 280, 290, 300, 310, 320, 340], category: 'TRACTOR', usage: ['Heavy farming'], hpRange: [240, 340] }),
    ...makeSeries({ prefix: 'C9000 ', numbers: [9206, 9306, 9406, 9506, 9606, 9706, 9806, 9906, 10006, 10106], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [250, 550] }),
    ...makeSeries({ prefix: 'H ', numbers: [410, 450, 500, 550, 600, 650, 700, 750, 800, 850], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [180, 320] }),
    ...makeSeries({ prefix: 'Condor ', numbers: [1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500], category: 'SPRAYER', usage: ['Spraying'], hpRange: [120, 250] }),
  ],
  Mahindra: [
    ...makeSeries({ prefix: '575 DI ', numbers: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95], category: 'TRACTOR', usage: ['Transport', 'Plowing'], hpRange: [50, 95] }),
    ...makeSeries({ prefix: '585 DI ', numbers: [35, 40, 45, 50, 55, 60, 65, 70, 75, 80], category: 'TRACTOR', usage: ['General farming'], hpRange: [35, 80] }),
    ...makeSeries({ prefix: '6075', numbers: ['E', 'P', 'K', 'S', 'H', 'N', 'U', 'V', 'T', 'M'], category: 'TRACTOR', usage: ['Plowing', 'Transport'], hpRange: [60, 75] }),
    ...makeSeries({ prefix: 'Yuvo ', numbers: [265, 275, 285, 305, 315, 325, 335, 345, 355, 365], category: 'TRACTOR', usage: ['Transport', 'Tillage'], hpRange: [25, 65] }),
    ...makeSeries({ prefix: 'OJA ', numbers: [3140, 3148, 4018, 4020, 4030, 4040, 4050, 4060, 4070, 4080], category: 'TRACTOR', usage: ['Orchard work', 'Transport'], hpRange: [30, 80] }),
    ...makeSeries({ prefix: 'Arjun Novo ', numbers: [605, 655, 755, 805, 855, 905, 955, 1005, 1055, 1105], category: 'TRACTOR', usage: ['Heavy tillage'], hpRange: [55, 120] }),
    ...makeSeries({ prefix: 'JIVO ', numbers: [305, 365, 405, 455, 505, 555, 605, 655, 705, 755], category: 'TRACTOR', usage: ['Orchard work'], hpRange: [20, 80] }),
    ...makeSeries({ prefix: 'Sampo ', numbers: [500, 630, 700, 760, 820, 880, 940, 1000, 1060, 1120], category: 'HARVESTER', usage: ['Harvesting'], hpRange: [220, 350] }),
    ...makeSeries({ prefix: 'EMAX ', numbers: [20, 25, 28, 30, 35, 40, 45, 50, 55, 60], category: 'SEEDER', usage: ['Seeding'], hpRange: [18, 60] }),
    ...makeSeries({ prefix: 'DRO ', numbers: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], category: 'DRONE', usage: ['Crop Monitoring'], hpRange: [0, 0] }),
  ],
};

const dataset = { brands: {} };
let count = 0;

for (const [brand, seriesList] of Object.entries(brandProfiles)) {
  dataset.brands[brand] = {
    category: random(base.categories),
    models: {},
  };

  for (const series of seriesList) {
    const modelName = buildModelName(series);
    dataset.brands[brand].models[modelName] = {
      usage: unique([random(series.usage), random(series.usage)]),
      hpRange: series.hpRange || pickHpRange(series.category),
    };
    count += 1;
  }
}

for (const info of Object.values(dataset.brands)) {
  const seeds = Object.keys(info.models);
  let suffixIndex = 0;
  while (Object.keys(info.models).length < 120) {
    const seed = seeds[suffixIndex % seeds.length];
    const candidate = `${seed} ${String.fromCharCode(65 + (suffixIndex % 5))}`;
    if (!info.models[candidate]) {
      info.models[candidate] = {
        usage: [random(base.usages)],
        hpRange: pickHpRange(info.category),
      };
      count += 1;
    }
    suffixIndex += 1;
  }
}

fs.writeFileSync(
  path.join(__dirname, 'fallback_assets_large.json'),
  JSON.stringify(dataset, null, 2),
);

console.log(`Generated ${count} models successfully`);
