export const P_NONE = 0;
export const P_GRASS = 1;
export const P_STRAWBERRY = 2;
export const P_BLUEBERRY = 3;
export const P_APPLE_TREE = 4;
export const P_MANGO_TREE = 5;
export const P_CARROT = 6;
export const P_SUNFLOWER = 7;
export const P_TOMATO = 8;
export const P_MUSHROOM = 9;
export const P_OAK_TREE = 10;
export const P_CACTUS = 11;
export const P_COCONUT_PALM = 12;
export const P_POTATO = 13;
export const P_CHILI_PEPPER = 14;
export const P_OLIVE_TREE = 15;

export const ALL_PLANT_TYPES = [
  P_GRASS,
  P_STRAWBERRY,
  P_BLUEBERRY,
  P_APPLE_TREE,
  P_MANGO_TREE,
  P_CARROT,
  P_SUNFLOWER,
  P_TOMATO,
  P_MUSHROOM,
  P_OAK_TREE,
  P_CACTUS,
  P_COCONUT_PALM,
  P_POTATO,
  P_CHILI_PEPPER,
  P_OLIVE_TREE,
];

export const PLANT_SEX = {
  [P_GRASS]: 'ASEXUAL',
  [P_STRAWBERRY]: 'HERMAPHRODITE',
  [P_BLUEBERRY]: 'HERMAPHRODITE',
  [P_APPLE_TREE]: 'HERMAPHRODITE',
  [P_MANGO_TREE]: 'HERMAPHRODITE',
  [P_CARROT]: 'ASEXUAL',
  [P_SUNFLOWER]: 'HERMAPHRODITE',
  [P_TOMATO]: 'HERMAPHRODITE',
  [P_MUSHROOM]: 'ASEXUAL',
  [P_OAK_TREE]: 'HERMAPHRODITE',
  [P_CACTUS]: 'HERMAPHRODITE',
  [P_COCONUT_PALM]: 'HERMAPHRODITE',
  [P_POTATO]: 'ASEXUAL',
  [P_CHILI_PEPPER]: 'HERMAPHRODITE',
  [P_OLIVE_TREE]: 'HERMAPHRODITE',
};

export const S_NONE = 0;
export const S_SEED = 1;
export const S_YOUNG_SPROUT = 2;
export const S_ADULT_SPROUT = 3;
export const S_ADULT = 4;
export const S_FRUIT = 5;
export const S_DEAD = 6;

export const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];