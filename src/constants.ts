export interface FrenchNumber {
  value: number;
  cardinal: string;
  ordinal: string;
}

const cardinalMap: Record<number, string> = {
  0: "zéro", 1: "un", 2: "deux", 3: "trois", 4: "quatre", 5: "cinq",
  6: "six", 7: "sept", 8: "huit", 9: "neuf", 10: "dix",
  11: "onze", 12: "douze", 13: "treize", 14: "quatorze", 15: "quinze", 16: "seize",
  20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante",
  80: "quatre-vingts", 100: "cent"
};

function getCardinal(n: number): string {
  if (cardinalMap[n]) return cardinalMap[n];
  if (n < 20) return "dix-" + cardinalMap[n - 10];
  
  if (n < 70) {
    const tens = Math.floor(n / 10) * 10;
    const units = n % 10;
    if (units === 0) return cardinalMap[tens];
    if (units === 1) return cardinalMap[tens] + " et un";
    return cardinalMap[tens] + "-" + cardinalMap[units];
  }
  
  if (n < 80) {
    const units = n - 60;
    if (units === 11) return "soixante et onze";
    return "soixante-" + getCardinal(units);
  }
  
  if (n < 90) {
    const units = n - 80;
    if (units === 0) return "quatre-vingts";
    return "quatre-vingt-" + cardinalMap[units];
  }
  
  if (n < 100) {
    const units = n - 80;
    return "quatre-vingt-" + getCardinal(units);
  }
  
  return "cent";
}

function getOrdinal(n: number, cardinal: string): string {
  if (n === 1) return "premier";
  
  let base = cardinal;
  if (n === 80) base = "quatre-vingt"; // drop 's'
  
  if (base.endsWith("e")) {
    base = base.slice(0, -1);
  }
  
  if (n % 10 === 5) {
    return base + "uième";
  }
  
  if (n % 10 === 9) {
    return base.slice(0, -1) + "vième";
  }
  
  return base + "ième";
}

export const FRENCH_NUMBERS: FrenchNumber[] = Array.from({ length: 101 }, (_, i) => {
  const cardinal = getCardinal(i);
  return {
    value: i,
    cardinal,
    ordinal: getOrdinal(i, cardinal)
  };
});
