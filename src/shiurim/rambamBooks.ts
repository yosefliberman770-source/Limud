/** Which of the 14 sefarim of Mishneh Torah (and which physical volume of the 3-volume set) a halachos belongs to. */
export const SEFARIM = ['מדע', 'אהבה', 'זמנים', 'נשים', 'קדושה', 'הפלאה', 'זרעים', 'עבודה', 'קרבנות', 'טהרה', 'נזיקין', 'קנין', 'משפטים', 'שופטים'] as const;

const ORDER: [string, string[]][] = [
  ['מדע', ['Foundations of the Torah', 'Human Dispositions', 'Torah Study', 'Foreign Worship and Customs of the Nations', 'Repentance']],
  ['אהבה', ['Reading the Shema', 'Prayer and the Priestly Blessing', 'Tefillin, Mezuzah and the Torah Scroll', 'Fringes', 'Blessings', 'Circumcision', 'The Order of Prayer']],
  ['זמנים', ['Sabbath', 'Eruvin', 'Rest on the Tenth of Tishrei', 'Rest on a Holiday', 'Leavened and Unleavened Bread', 'Shofar, Sukkah and Lulav', 'Sheqel Dues', 'Sanctification of the New Month', 'Fasts', 'Scroll of Esther and Hanukkah']],
  ['נשים', ['Marriage', 'Divorce', 'Levirate Marriage and Release', 'Virgin Maiden', 'Woman Suspected of Infidelity']],
  ['קדושה', ['Forbidden Intercourse', 'Forbidden Foods', 'Ritual Slaughter']],
  ['הפלאה', ['Oaths', 'Vows', 'Nazariteship', 'Appraisals and Devoted Property']],
  ['זרעים', ['Diverse Species', 'Gifts to the Poor', 'Heave Offerings', 'Tithes', "Second Tithes and Fourth Year's Fruit", 'First Fruits and other Gifts to Priests Outside the Sanctuary', 'Sabbatical Year and the Jubilee']],
  ['עבודה', ['The Chosen Temple', 'Vessels of the Sanctuary and Those who Serve Therein', 'Admission into the Sanctuary', 'Things Forbidden on the Altar', 'Sacrificial Procedure', 'Daily Offerings and Additional Offerings', 'Sacrifices Rendered Unfit', 'Service on the Day of Atonement', 'Trespass']],
  ['קרבנות', ['Paschal Offering', 'Festival Offering', 'Firstlings', 'Offerings for Unintentional Transgressions', 'Offerings for Those with Incomplete Atonement', 'Substitution']],
  ['טהרה', ['Defilement by a Corpse', 'Red Heifer', 'Defilement by Leprosy', 'Those Who Defile Bed or Seat', 'Other Sources of Defilement', 'Defilement of Foods', 'Vessels', 'Immersion Pools']],
  ['נזיקין', ['Damages to Property', 'Theft', 'Robbery and Lost Property', 'One Who Injures a Person or Property', 'Murderer and the Preservation of Life']],
  ['קנין', ['Sales', 'Ownerless Property and Gifts', 'Neighbors', 'Agents and Partners', 'Slaves']],
  ['משפטים', ['Hiring', 'Borrowing and Deposit', 'Creditor and Debtor', 'Plaintiff and Defendant', 'Inheritances']],
  ['שופטים', ['The Sanhedrin and the Penalties within their Jurisdiction', 'Testimony', 'Rebels', 'Mourning', 'Kings and Wars']],
];

const INTRO = ['Transmission of the Oral Law', 'Positive Mitzvot', 'Negative Mitzvot', 'Overview of Mishneh Torah Contents'];

export function sefarOf(halachosName: string): { sefer: string; index: number } | null {
  for (let i = 0; i < ORDER.length; i++) if (ORDER[i][1].includes(halachosName)) return { sefer: ORDER[i][0], index: i };
  return null;
}

/** Which physical volume (1..3) of the illustrative 3-volume set contains the halachos. Intro material is in volume 1. */
export function rambamPhysicalVolume(halachosName: string): 1 | 2 | 3 {
  if (INTRO.includes(halachosName)) return 1;
  const s = sefarOf(halachosName);
  if (!s) return 1;
  return s.index <= 2 ? 1 : s.index <= 6 ? 2 : 3;
}

export function allHalachosNames(): string[] {
  return [...INTRO, ...ORDER.flatMap(([, n]) => n)];
}
