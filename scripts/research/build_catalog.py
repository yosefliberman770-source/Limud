#!/usr/bin/env python3 -I
"""Build toras-menachem.json from the chabadlibrary.org crawl (raw/manifest.json + raw/cl-api-main-*.json).

Run:  python3 -I build_catalog.py <research-tm dir>
Needs network only for hebcal.com date conversion (cached in raw/hebcal-cache.json).

The gathering/occasion table below was curated by hand from the TOC headings returned by
  GET https://chabadlibrary.org/books/api/main?path=<volume_id>
and, for letters (whose TOC heading is only "ב"ה"), from the signature/date line of the letter text.
"""
import json, os, re, sys, html, subprocess, time, datetime

BASE = sys.argv[1]
RAW = os.path.join(BASE, "raw")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
NOW = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
SPA = "https://chabadlibrary.org/books/{id}"
API = "https://chabadlibrary.org/books/api/main?path={id}"

# ----------------------------------------------------------------------------------------------
# Volumes
# ----------------------------------------------------------------------------------------------
VOLUMES = [
    dict(id="tm-5710-01", clId="1400090001", heTitle="תורת מנחם — התוועדויות תש״י חלק א", year=5710, volumeNumber=1,
         heRange="י״ד שבט – ש״פ נצבים, כ״ז אלול ה׳שי״ת", pageCount=273,
         pageNotes="Digitized body text runs pp. 3–227 (plus inserted pages 18א–18ב, 21א–21ב, 151א–151ב; pp. 223–224 absent from the digital text, presumably the הוספות divider). "
                   "Chabad Library catalog cards: 1st ed. (ארץ ישראל תשנ״ג, 8°) XVI,(3),יד,270,(2) pp.; 2nd ed. 'עם תיקונים והוספות' (תשס״ב) XX,273,(3) pp.; 4th ed. (נ.י. תשס״ט, 12°) (2),20,273,(11) pp. pageCount=273 follows the 2nd/4th-edition body count, which the inserted lettered pages suggest is the edition digitized."),
    dict(id="tm-5711-02", clId="1400100001", heTitle="תורת מנחם — התוועדויות תשי״א חלק א", year=5711, volumeNumber=2,
         heRange="ראש השנה – ו׳ ניסן ה׳תשי״א", pageCount=365,
         pageNotes="Digitized body text runs pp. 3–365 (plus inserted pages 191א–191ה, 282א; pp. 347–348 absent, presumably the הוספות divider). "
                   "Chabad Library catalog cards: 1st ed. (נ.י. תשנ״ד, 8°) XXI,345,(2) pp.; 2nd ed. (רמלה תשס״ב) 38,365,(3) pp. pageCount=365 matches the 2nd edition, whose pagination the digital text follows."),
    dict(id="tm-5711-03", clId="1400110001", heTitle="תורת מנחם — התוועדויות תשי״א חלק ב", year=5711, volumeNumber=3,
         heRange="י״א ניסן ה׳תשי״א – ערב ראש השנה ה׳תשי״ב", pageCount=453,
         pageNotes="Digitized body text runs pp. 3–353 (plus inserted pages 221א–221ב). Chabad Library catalog cards: 1st ed. (רמלה תשנ״ה) XXII,453 pp.; later ed. (תשע״ד) 36,476,(12) pp. "
                   "The ~100 printed pages beyond p. 353 (indices / addenda) are not in the digital source; pageCount=453 is the 1st-edition catalog figure and is NOT confirmed against the digitized pagination."),
]

# ----------------------------------------------------------------------------------------------
# Gatherings (hand-curated). key -> metadata.  hm uses hebcal month names; hd int or None.
# kind: farbrengen | short_talk | document | undated
# occ: shabbos_parsha | festival | fixed_date | other
# ----------------------------------------------------------------------------------------------
G = {}
def g(key, heDate, hy, hm, hd, occ, label, parsha=None, festival=None, kind="farbrengen", notes=None):
    G[key] = dict(heDate=heDate, hy=hy, hm=hm, hd=hd, occ=occ, label=label, parsha=parsha, festival=festival, kind=kind, notes=notes)

# ---- Volume 1: 5710 ----
g("v1-shiva",      "י״ד שבט ה׳שי״ת", 5710, "Shvat", 14, "other", "ימי ה'שבעה' להסתלקות כ״ק אדמו״ר מהוריי״צ – יום ד׳, י״ד שבט ה׳שי״ת", kind="short_talk",
  notes="Remarks after Shacharis during the shiva week (and the list of stories told during the shiva days).")
g("v1-let-18shvat","ח״י שבט ה׳שי״ת", 5710, "Shvat", 18, "other", "מכתב, ח״י שבט ה׳שי״ת", kind="document")
g("v1-yisro",      "ש״פ יתרו, מבה״ח אדר ה׳שי״ת", 5710, "Shvat", 24, "shabbos_parsha", "ש״פ יתרו, מבה״ח אדר", parsha="Yitro")
g("v1-let-rch-adar","ר״ח אדר ה׳שי״ת", 5710, "Shvat", 30, "other", "מכתב, ר״ח אדר ה׳שי״ת", kind="document",
  notes="Signature line reads ר״ח אדר; 1 Adar 5710 was Shabbos, so 30 Shvat (first day of Rosh Chodesh, Friday) is assumed.")
g("v1-terumah",    "ש״פ תרומה, פ׳ זכור, ח׳ אדר ה׳שי״ת", 5710, "Adar", 8, "shabbos_parsha", "ש״פ תרומה, פ׳ זכור", parsha="Terumah")
g("v1-10adar",     "יו״ד אדר ה׳שי״ת", 5710, "Adar", 10, "fixed_date", "יו״ד אדר (סיום ה'שלושים'), באסיפת אנ״ש", kind="short_talk")
g("v1-tetzaveh",   "ש״פ תצוה, שושן פורים ה׳שי״ת", 5710, "Adar", 15, "shabbos_parsha", "ש״פ תצוה, שושן פורים", parsha="Tetzaveh", festival="Shushan Purim")
g("v1-let-25adar", "כ״ה אדר ה׳שי״ת", 5710, "Adar", 25, "other", "מכתב, כ״ה אדר ה׳שי״ת", kind="document")
g("v1-vayakhel",   "ש״פ ויקהל-פקודי, מבה״ח וער״ח ניסן ה׳שי״ת", 5710, "Adar", 29, "shabbos_parsha", "ש״פ ויקהל-פקודי, מבה״ח וער״ח ניסן", parsha="Vayakhel-Pekudei")
g("v1-rch-nisan",  "ר״ח ניסן ה׳שי״ת", 5710, "Nisan", 1, "festival", "ר״ד ראש-חודש ניסן", festival="Rosh Chodesh Nisan", kind="short_talk")
g("v1-pesach1",    "יום א׳ דחג הפסח ה׳שי״ת", 5710, "Nisan", 15, "festival", "יום א׳ דחג הפסח (אחרי התפלה בהיכל כ״ק אדמו״ר מהוריי״צ)", festival="Pesach I", kind="short_talk")
g("v1-achpesach",  "אחרון של פסח ה׳שי״ת", 5710, "Nisan", 22, "festival", "אחרון של פסח", festival="Pesach VIII (Acharon Shel Pesach)")
g("v1-shmini",     "ש״פ שמיני, מבה״ח אייר ה׳שי״ת", 5710, "Nisan", 28, "shabbos_parsha", "ש״פ שמיני, מבה״ח אייר", parsha="Shmini")
g("v1-2iyar",      "ליל ב׳ אייר ה׳שי״ת", 5710, "Iyyar", 2, "fixed_date", "ליל ב׳ אייר", notes="Night event; the Gregorian date given is the daytime of 2 Iyar (the farbrengen was on the preceding evening).")
g("v1-let-pesach2","פסח שני ה׳שי״ת", 5710, "Iyyar", 14, "other", "מכתב, פסח שני ה׳שי״ת", kind="document")
g("v1-motzpesach2","מוצאי פסח שני ה׳שי״ת", 5710, "Iyyar", 15, "festival", "מוצאי פסח שני (ליל ט״ו אייר)", festival="Pesach Sheni",
  notes="Held after Maariv of the night of 15 Iyar (text: 'התוועדות זו, שמתקיימת לאחרי תפלת ערבית דליל ט״ו'). Gregorian date is the daytime of 15 Iyar.")
g("v1-lagbaomer",  "ליל ל״ג בעומר ה׳שי״ת", 5710, "Iyyar", 18, "festival", "ליל ל״ג בעומר", festival="Lag BaOmer", notes="Night event (eve of 18 Iyar); Gregorian date is the daytime of 18 Iyar.")
g("v1-let-behar",  "יום הששי ערב שבת קדש לסדר כי תבואו אל הארץ, ה׳שי״ת", 5710, "Iyyar", 25, "other", "מכתב, ערב ש״ק פ׳ בהר-בחוקותי (כ״ה אייר) ה׳שי״ת", kind="document",
  notes="Dated only 'יום הששי ערב שבת קדש אחר חצות לסדר כי תבואו אל הארץ' (a year after the Frierdiker Rebbe's identically dated letter); = Friday 25 Iyar 5710.")
g("v1-behar",      "ש״פ בהר-בחוקותי, מבה״ח סיון ה׳שי״ת", 5710, "Iyyar", 26, "shabbos_parsha", "ש״פ בהר-בחוקותי, מבה״ח סיון", parsha="Behar-Bechukotai")
g("v1-rch-sivan",  "ראש-חודש סיון ה׳שי״ת", 5710, "Sivan", 1, "festival", "ראש-חודש סיון", festival="Rosh Chodesh Sivan")
g("v1-shavuos2",   "יום ב׳ דחג השבועות ה׳שי״ת", 5710, "Sivan", 7, "festival", "יום ב׳ דחג השבועות", festival="Shavuot II")
g("v1-nasso",      "ש״פ נשא, י״א סיון ה׳שי״ת", 5710, "Sivan", 11, "shabbos_parsha", "ש״פ נשא, י״א סיון", parsha="Nasso")
g("v1-shlach",     "ש״פ שלח, מבה״ח תמוז ה׳שי״ת", 5710, "Sivan", 25, "shabbos_parsha", "ש״פ שלח, מבה״ח תמוז", parsha="Sh'lach")
g("v1-26sivan",    "יום א׳ פ׳ קורח, כ״ו סיון ה׳שי״ת", 5710, "Sivan", 26, "other", "יום א׳ פ׳ קורח, כ״ו סיון – באסיפה דה'מרכז לעניני חינוך'", kind="short_talk")
g("v1-let-3tamuz", "ג׳ תמוז ה׳שי״ת", 5710, "Tamuz", 3, "other", "מכתב, ג׳ תמוז ה׳שי״ת", kind="document")
g("v1-chukas",     "ש״פ חוקת, ט׳ תמוז ה׳שי״ת", 5710, "Tamuz", 9, "shabbos_parsha", "ש״פ חוקת, ט׳ תמוז", parsha="Chukat")
g("v1-12tamuz",    "י״ב תמוז ה׳שי״ת", 5710, "Tamuz", 12, "fixed_date", "י״ב תמוז")
g("v1-pinchas",    "ש״פ פינחס, מבה״ח מנחם-אב ה׳שי״ת", 5710, "Tamuz", 23, "shabbos_parsha", "ש״פ פינחס, מבה״ח מנחם-אב", parsha="Pinchas")
g("v1-12av",       "יום ד׳ פ׳ ואתחנן, י״ב מנחם-אב ה׳שי״ת", 5710, "Av", 12, "other", "ר״ד יום ד׳ פ׳ ואתחנן, י״ב מנחם-אב", kind="short_talk")
g("v1-20av",       "כ״ף מנחם-אב ה׳שי״ת", 5710, "Av", 20, "fixed_date", "כ״ף מנחם-אב")
g("v1-reeh",       "ש״פ ראה, מבה״ח וער״ח אלול ה׳שי״ת", 5710, "Av", 29, "shabbos_parsha", "ש״פ ראה, מבה״ח וער״ח אלול", parsha="Re'eh")
g("v1-let-13elul", "ערב ש״ק י״ג אלול ה׳שי״ת", 5710, "Elul", 13, "other", "מכתב, ערב ש״ק י״ג אלול ה׳שי״ת", kind="document",
  notes="Signature line reads 'ערב ש״ק י״ג אלול'; per hebcal 13 Elul 5710 itself fell on Shabbos (Ki Teitzei), so the date line is internally inconsistent — Gregorian given for 13 Elul.")
g("v1-let-18elul", "ח״י אלול ה׳שי״ת", 5710, "Elul", 18, "other", "מכתב כללי, ח״י אלול ה׳שי״ת", kind="document")
g("v1-18elul",     "ח״י אלול ה׳שי״ת", 5710, "Elul", 18, "fixed_date", "ח״י אלול")
g("v1-nitzavim",   "ש״פ נצבים, כ״ז אלול ה׳שי״ת", 5710, "Elul", 27, "shabbos_parsha", "ש״פ נצבים, כ״ז אלול", parsha="Nitzavim")
g("v1-let-selichos","ראשון דסליחות ה׳שי״ת", 5710, "Elul", 21, "other", "מכתבים, יום ראשון דסליחות ה׳שי״ת", kind="document",
  notes="First day of Selichos 5710 = Sunday 21 Elul (Leil Selichos was Sat night 20 Elul). Printed after ש״פ נצבים although dated earlier.")
g("v1-add-7iyar",  "יום ב׳ פ׳ אחרי-קדושים, ז׳ אייר ה׳שי״ת", 5710, "Iyyar", 7, "other", "ר״ד יום ב׳ פ׳ אחרי-קדושים, ז׳ אייר (הוספות)", kind="short_talk", notes="Printed in the volume's addenda (הוספות) section.")
g("v1-add-15elul", "יום ב׳ פ׳ תבוא, ט״ו אלול ה׳שי״ת", 5710, "Elul", 15, "other", "ר״ד יום ב׳ פ׳ תבוא, ט״ו אלול (הוספות)", kind="short_talk", notes="Printed in the volume's addenda (הוספות) section.")

# ---- Volume 2: 5711 part 1 ----
g("v2-rh1",        "יום א׳ דראש השנה ה׳תשי״א", 5711, "Tishrei", 1, "festival", "יום א׳ דראש השנה – בעת ההליכה לתשליך", festival="Rosh Hashana I", kind="short_talk")
g("v2-let-shuva",  "ערב שבת תשובה ה׳תשי״א", 5711, "Tishrei", 4, "other", "מכתב, ערב שבת תשובה ה׳תשי״א", kind="document")
g("v2-erevyk",     "ערב יום הכיפורים ה׳תשי״א", 5711, "Tishrei", 9, "festival", "ערב יום הכיפורים (בעת נתינת לעקאח; ברכה לפני כל נדרי)", festival="Erev Yom Kippur", kind="short_talk")
g("v2-let-11tishrei","מחרת יום הכפורים ה׳תשי״א", 5711, "Tishrei", 11, "other", "מכתב, מחרת יום הכפורים ה׳תשי״א", kind="document")
g("v2-let-erevsukkos","ערב חג הסוכות ה׳תשי״א", 5711, "Tishrei", 14, "other", "מכתב, ערב חג הסוכות ה׳תשי״א", kind="document")
g("v2-simchasbeis","מוצאי יום א׳ דחול המועד סוכות, שמחת בית השואבה ה׳תשי״א", 5711, "Tishrei", 18, "festival", "מוצאי יום א׳ דחוה״מ סוכות – שמחת בית השואבה (ליל י״ח תשרי)", festival="Sukkot (Chol HaMoed)",
  notes="Night following the first day of Chol HaMoed (17 Tishrei); Gregorian date is the daytime of 18 Tishrei.")
g("v2-shabchm",    "שבת חול המועד סוכות ה׳תשי״א", 5711, "Tishrei", 19, "festival", "שבת חול המועד סוכות", festival="Sukkot (Shabbat Chol HaMoed)")
g("v2-leilst",     "ליל שמחת תורה ה׳תשי״א", 5711, "Tishrei", 23, "festival", "ליל שמחת תורה (קודם הקפות)", festival="Simchat Torah", notes="Night event; Gregorian date is the daytime of 23 Tishrei.")
g("v2-yomst",      "יום שמחת תורה ה׳תשי״א", 5711, "Tishrei", 23, "festival", "יום שמחת תורה", festival="Simchat Torah")
g("v2-isruchag",   "יום ה׳ פ׳ בראשית, אסרו-חג ה׳תשי״א", 5711, "Tishrei", 24, "other", "ר״ד יום ה׳ פ׳ בראשית, אסרו-חג", kind="short_talk")
g("v2-bereshis",   "שבת בראשית, מבה״ח מר-חשון ה׳תשי״א", 5711, "Tishrei", 26, "shabbos_parsha", "שבת בראשית, מבה״ח מר-חשון", parsha="Bereshit")
g("v2-lechlecha",  "ש״פ לך-לך, יו״ד מר-חשון ה׳תשי״א", 5711, "Cheshvan", 10, "shabbos_parsha", "ש״פ לך-לך, יו״ד מר-חשון", parsha="Lech-Lecha")
g("v2-chayeisarah","ש״פ חיי-שרה, מבה״ח כסלו ה׳תשי״א", 5711, "Cheshvan", 24, "shabbos_parsha", "ש״פ חיי-שרה, מבה״ח כסלו", parsha="Chayei Sara")
g("v2-let-rchkislev","ר״ח כסלו ה׳תשי״א", 5711, "Kislev", 1, "other", "מכתב, ר״ח כסלו ה׳תשי״א", kind="document")
g("v2-vayetzei",   "ש״פ ויצא, ט׳ כסלו ה׳תשי״א", 5711, "Kislev", 9, "shabbos_parsha", "ש״פ ויצא, ט׳ כסלו", parsha="Vayetzei")
g("v2-let-10kislev","יו״ד כסלו ה׳תשי״א", 5711, "Kislev", 10, "other", "מכתב כללי, יו״ד כסלו ה׳תשי״א", kind="document")
g("v2-tel-19kislev","לקראת י״ט כסלו ה׳תשי״א", 5711, "Kislev", None, "other", "מברק לאנ״ש לקראת י״ט כסלו ה׳תשי״א", kind="document", notes="Telegram; exact sending date not given in the source.")
g("v2-19kislev",   "י״ט כסלו ה׳תשי״א", 5711, "Kislev", 19, "fixed_date", "י״ט כסלו")
g("v2-vayeshev",   "ש״פ וישב, מבה״ח טבת ה׳תשי״א", 5711, "Kislev", 23, "shabbos_parsha", "ש״פ וישב, מבה״ח טבת", parsha="Vayeshev")
g("v2-let-erevvayigash","עש״ק ויגש ה׳תשי״א", 5711, "Tevet", 6, "other", "מכתב, עש״ק פ׳ ויגש (ו׳ טבת) ה׳תשי״א", kind="document")
g("v2-vayigash",   "ש״פ ויגש, ז׳ טבת ה׳תשי״א", 5711, "Tevet", 7, "shabbos_parsha", "ש״פ ויגש, ז׳ טבת", parsha="Vayigash")
g("v2-9teves",     "ט׳ טבת ה׳תשי״א", 5711, "Tevet", 9, "other", "ט׳ טבת – לאחר תפלת מנחה", kind="short_talk")
g("v2-24teves",    "כ״ד טבת ה׳תשי״א", 5711, "Tevet", 24, "fixed_date", "כ״ד טבת")
g("v2-vaera",      "ש״פ וארא, מבה״ח שבט ה׳תשי״א", 5711, "Tevet", 28, "shabbos_parsha", "ש״פ וארא, מבה״ח שבט", parsha="Vaera")
g("v2-let-rchshvat","ראש חודש שבט ה׳תשי״א", 5711, "Shvat", 1, "other", "מכתבים כלליים, ראש חודש שבט ה׳תשי״א", kind="document")
g("v2-tel-10shvat","לקראת יו״ד שבט ה׳תשי״א", 5711, "Shvat", None, "other", "מברק לאנ״ש לקראת יום ההילולא יו״ד שבט ה׳תשי״א", kind="document", notes="Telegram; exact sending date not given in the source.")
g("v2-10shvat",    "יו״ד שבט ה׳תשי״א", 5711, "Shvat", 10, "fixed_date", "יו״ד שבט – יום ההילולא הראשון (קבלת הנשיאות)")
g("v2-beshalach",  "ש״פ בשלח, י״ג שבט ה׳תשי״א", 5711, "Shvat", 13, "shabbos_parsha", "ש״פ בשלח, י״ג שבט", parsha="Beshalach")
g("v2-let-15shvat","ט״ו בשבט ה׳תשי״א", 5711, "Shvat", 15, "other", "מכתב כללי, ט״ו בשבט ר״ה לאילן ה׳תשי״א", kind="document")
g("v2-mishpatim",  "ש״פ משפטים, מבה״ח אדר ראשון ה׳תשי״א", 5711, "Shvat", 27, "shabbos_parsha", "ש״פ משפטים, מבה״ח אדר-ראשון", parsha="Mishpatim")
g("v2-kp-rchadar1","א׳ דר״ח אדר-ראשון ה׳תשי״א", 5711, "Shvat", 30, "other", "ר״ד בעת קבלת-פנים – א׳ דר״ח אדר-ראשון", kind="short_talk")
g("v2-terumah",    "ש״פ תרומה, ד׳ אדר-ראשון ה׳תשי״א", 5711, "Adar I", 4, "shabbos_parsha", "ר״ד ש״פ תרומה, ד׳ אדר-ראשון", parsha="Terumah", kind="short_talk")
g("v2-kp-7adar1",  "ז׳ אדר-ראשון ה׳תשי״א", 5711, "Adar I", 7, "other", "ר״ד בעת קבלת-פנים – ז׳ אדר-ראשון", kind="short_talk")
g("v2-tetzaveh",   "ש״פ תצוה, י״א אדר-ראשון ה׳תשי״א", 5711, "Adar I", 11, "shabbos_parsha", "ר״ד ש״פ תצוה, י״א אדר-ראשון", parsha="Tetzaveh", kind="short_talk")
g("v2-kp-purimkatan","פורים-קטן ה׳תשי״א", 5711, "Adar I", 14, "festival", "ר״ד בעת קבלת-פנים – פורים-קטן", festival="Purim Katan", kind="short_talk")
g("v2-16adar1",    "יום ה׳, ט״ז אדר-ראשון ה׳תשי״א", 5711, "Adar I", 16, "other", "ר״ד יום ה׳, ט״ז אדר-ראשון", kind="short_talk")
g("v2-vayakhel",   "ש״פ ויקהל, פ׳ שקלים, מבה״ח אדר שני ה׳תשי״א", 5711, "Adar I", 25, "shabbos_parsha", "ש״פ ויקהל, פ׳ שקלים, מבה״ח אדר-שני", parsha="Vayakhel")
g("v2-let-7adar2", "ז׳ אדר-שני ה׳תשי״א", 5711, "Adar II", 7, "other", "מכתב, ז׳ אדר-שני ה׳תשי״א", kind="document")
g("v2-bris-7adar2","ז׳ אדר-שני ה׳תשי״א", 5711, "Adar II", 7, "other", "ר״ד בעת ברית-מילה, ז׳ אדר-שני", kind="short_talk")
g("v2-tel-purim",  "לקראת ימי הפורים ה׳תשי״א", 5711, "Adar II", None, "other", "מברק לאנ״ש לקראת ימי הפורים ה׳תשי״א", kind="document", notes="Telegram; exact sending date not given in the source.")
g("v2-purim",      "פורים ה׳תשי״א", 5711, "Adar II", 14, "festival", "חג הפורים", festival="Purim")
g("v2-shmini",     "ש״פ שמיני, פ׳ פרה, מבה״ח ניסן ה׳תשי״א", 5711, "Adar II", 23, "shabbos_parsha", "ש״פ שמיני, פ׳ פרה, מבה״ח ניסן", parsha="Shmini")
g("v2-let-25adar2","כ״ה אדר-שני ה׳תשי״א", 5711, "Adar II", 25, "other", "מכתב, כ״ה אדר-שני ה׳תשי״א", kind="document")
g("v2-6nisan",     "יום ה׳, ו׳ ניסן ה׳תשי״א", 5711, "Nisan", 6, "other", "ר״ד יום ה׳, ו׳ ניסן", kind="short_talk")
g("v2-add-hadran", "(ללא תאריך בכותרת) ה׳תשי״א", 5711, None, None, "other", "הוספות: הדרן על הש״ס; שיחה בענין עדי קידושין", kind="undated",
  notes="Addenda (הוספות) of vol. 2, pp. 349–365. The date footnotes attached to the printed headings (marked *) are not returned by the chabadlibrary API, so the occasion/date could not be verified from this source.")

# ---- Volume 3: 5711 part 2 ----
g("v3-11nisan",    "יום ג׳, י״א ניסן ה׳תשי״א", 5711, "Nisan", 11, "fixed_date", "ר״ד יום ג׳, י״א ניסן", kind="short_talk")
g("v3-let-11nisan","י״א ניסן ה׳תשי״א", 5711, "Nisan", 11, "other", "מכתב, י״א ניסן ה׳תשי״א", kind="document")
g("v3-13nisan",    "אור ליום ה׳, י״ג ניסן ה׳תשי״א", 5711, "Nisan", 13, "fixed_date", "ר״ד אור ליום ה׳, י״ג ניסן", kind="short_talk", notes="Night event (eve of 13 Nisan); Gregorian date is the daytime of 13 Nisan.")
g("v3-erevpesach", "ועש״ק י״ד ניסן, ערב חג הפסח ה׳תשי״א", 5711, "Nisan", 14, "festival", "ר״ד ועש״ק י״ד ניסן, ערב חג הפסח", festival="Erev Pesach", kind="short_talk")
g("v3-leil2pesach","ליל ב׳ דחג הפסח ה׳תשי״א", 5711, "Nisan", 16, "festival", "ליל ב׳ דחג הפסח", festival="Pesach II", notes="Night event (second Seder night); Gregorian date is the daytime of 16 Nisan.")
g("v3-pesach2",    "יום ב׳ דחג הפסח ה׳תשי״א", 5711, "Nisan", 16, "festival", "ר״ד יום ב׳ דחג הפסח – לאחר תפלת מנחה", festival="Pesach II", kind="short_talk")
g("v3-18nisan",    "יום ג׳, ח״י ניסן, ב׳ דחוה״מ פסח ה׳תשי״א", 5711, "Nisan", 18, "festival", "ר״ד יום ג׳, ח״י ניסן, ב׳ דחוה״מ פסח – לאחר תפלת מנחה", festival="Pesach (Chol HaMoed)", kind="short_talk")
g("v3-shviishp",   "שביעי של פסח ה׳תשי״א", 5711, "Nisan", 21, "festival", "שביעי של פסח – לאחר תפלת מנחה", festival="Pesach VII", kind="short_talk")
g("v3-achpesach",  "אחרון של פסח ה׳תשי״א", 5711, "Nisan", 22, "festival", "אחרון של פסח", festival="Pesach VIII (Acharon Shel Pesach)")
g("v3-acharei",    "ש״פ אחרי, מבה״ח וער״ח אייר ה׳תשי״א", 5711, "Nisan", 29, "shabbos_parsha", "ש״פ אחרי, מבה״ח וער״ח אייר", parsha="Achrei Mot")
g("v3-lagbaomer",  "ל״ג בעומר ה׳תשי״א", 5711, "Iyyar", 18, "festival", "ל״ג בעומר", festival="Lag BaOmer")
g("v3-let-21iyar", "כ״א אייר ה׳תשי״א", 5711, "Iyyar", 21, "other", "מכתב, כ״א אייר ה׳תשי״א", kind="document")
g("v3-bris-24iyar","כ״ד אייר ה׳תשי״א", 5711, "Iyyar", 24, "other", "ר״ד בעת ברית-מילה, כ״ד אייר", kind="short_talk")
g("v3-bechukosai", "ש״פ בחוקותי, מבה״ח סיון ה׳תשי״א", 5711, "Iyyar", 27, "shabbos_parsha", "ש״פ בחוקותי, מבה״ח סיון", parsha="Bechukotai")
g("v3-rchsivan",   "ראש-חודש סיון ה׳תשי״א", 5711, "Sivan", 1, "festival", "ראש-חודש סיון – לאחר תפלת מנחה", festival="Rosh Chodesh Sivan", kind="short_talk")
g("v3-tel-shavuos","לקראת חג השבועות ה׳תשי״א", 5711, "Sivan", None, "other", "מברק לאנ״ש לקראת חג השבועות ה׳תשי״א", kind="document", notes="Telegram; exact sending date not given in the source.")
g("v3-bamidbar",   "ש״פ במדבר, ערב חג השבועות ה׳תשי״א", 5711, "Sivan", 5, "shabbos_parsha", "ר״ד ש״פ במדבר, ערב חג השבועות", parsha="Bamidbar", festival="Erev Shavuot", kind="short_talk")
g("v3-shavuos1",   "יום א׳ דחג השבועות ה׳תשי״א", 5711, "Sivan", 6, "festival", "יום א׳ דחג השבועות – לאחר תפלת מנחה", festival="Shavuot I", kind="short_talk")
g("v3-leil2shavuos","ליל ב׳ דחג השבועות ה׳תשי״א", 5711, "Sivan", 7, "festival", "ליל ב׳ דחג השבועות", festival="Shavuot II", notes="Night event; Gregorian date is the daytime of 7 Sivan.")
g("v3-shavuos2",   "יום ב׳ דחג השבועות ה׳תשי״א", 5711, "Sivan", 7, "festival", "יום ב׳ דחג השבועות", festival="Shavuot II")
g("v3-shadarim",   "יום א׳ ויום ג׳ פ׳ בהעלותך, י״ג-ט״ו סיון ה׳תשי״א", 5711, "Sivan", 13, "other", "ר״ד לא׳ השד״רים – יום א׳ ויום ג׳ פ׳ בהעלותך, י״ג–ט״ו סיון", kind="short_talk", notes="Spans two days (13 and 15 Sivan); hebrewDay/gregorianDate give the first.")
g("v3-shlach",     "ש״פ שלח, מבה״ח תמוז ה׳תשי״א", 5711, "Sivan", 26, "shabbos_parsha", "ש״פ שלח, מבה״ח תמוז", parsha="Sh'lach")
g("v3-let-3tamuz", "מוצש״ק ג׳ תמוז ה׳תשי״א", 5711, "Tamuz", 3, "other", "מכתב, מוצש״ק ג׳ תמוז ה׳תשי״א", kind="document", notes="Dated Motzaei Shabbos 3 Tamuz (3 Tamuz 5711 was Shabbos Korach); Gregorian date is that Shabbos.")
g("v3-tel-12tamuz","לקראת י״ב-י״ג תמוז ה׳תשי״א", 5711, "Tamuz", None, "other", "מברק לאנ״ש לקראת י״ב-י״ג תמוז ה׳תשי״א", kind="document", notes="Telegram; exact sending date not given in the source.")
g("v3-13tamuz",    "י״ג תמוז ה׳תשי״א", 5711, "Tamuz", 13, "fixed_date", "י״ג תמוז")
g("v3-20tamuz",    "יום ג׳ פ׳ פינחס, כ״ף תמוז ה׳תשי״א", 5711, "Tamuz", 20, "other", "ר״ד יום ג׳ פ׳ פינחס, כ״ף תמוז", kind="short_talk")
g("v3-22tamuz-tal","יום ה׳ פ׳ פינחס, כ״ב תמוז ה׳תשי״א", 5711, "Tamuz", 22, "other", "שיחה להתלמידים הנוסעים בשליחות המל״ח, כ״ב תמוז (בחדרו הק׳)", kind="short_talk")
g("v3-22tamuz-bm", "כ״ב תמוז ה׳תשי״א", 5711, "Tamuz", 22, "other", "ר״ד בעת חגיגת בר-מצוה, כ״ב תמוז", kind="short_talk")
g("v3-pinchas",    "ש״פ פינחס, מבה״ח מנחם-אב ה׳תשי״א", 5711, "Tamuz", 24, "shabbos_parsha", "ש״פ פינחס, מבה״ח מנחם-אב", parsha="Pinchas")
g("v3-20av",       "כ״ף מנחם-אב ה׳תשי״א", 5711, "Av", 20, "fixed_date", "כ״ף מנחם-אב")
g("v3-eikev",      "ש״פ עקב, מבה״ח אלול ה׳תשי״א", 5711, "Av", 23, "shabbos_parsha", "ש״פ עקב, מבה״ח אלול", parsha="Eikev")
g("v3-let-5elul",  "ה׳ אלול ה׳תשי״א", 5711, "Elul", 5, "other", "מכתב כללי לתלמידי מוסדות התורה, ה׳ אלול ה׳תשי״א", kind="document")
g("v3-kp-10elul",  "יו״ד אלול ה׳תשי״א", 5711, "Elul", 10, "other", "ר״ד בעת קבלת פנים – יו״ד אלול", kind="short_talk")
g("v3-let-13elul", "י״ג אלול ה׳תשי״א", 5711, "Elul", 13, "other", "מכתב, י״ג אלול ה׳תשי״א", kind="document")
g("v3-teitzei",    "ש״פ תצא, י״ד אלול ה׳תשי״א", 5711, "Elul", 14, "shabbos_parsha", "ר״ד מש״פ תצא, י״ד אלול – לאחר תפלת מנחה", parsha="Ki Teitzei", kind="short_talk")
g("v3-18elul",     "יום ד׳ פ׳ תבוא, ח״י אלול ה׳תשי״א", 5711, "Elul", 18, "fixed_date", "ח״י אלול")
g("v3-let-3selichos","ג׳ דסליחות ה׳תשי״א", 5711, "Elul", 24, "other", "מכתבים, יום שלישי דסליחות (כ״ד אלול) ה׳תשי״א", kind="document", notes="Leil Selichos 5711 = Sat night 21 Elul; 3rd day of Selichos = Tuesday 24 Elul.")
g("v3-25elul",     "יום ד׳, כ״ה אלול ה׳תשי״א", 5711, "Elul", 25, "other", "שיחה, יום ד׳ כ״ה אלול (במיפגש)", kind="short_talk")
g("v3-nitzavim",   "ש״פ נצבים, כ״ח אלול ה׳תשי״א", 5711, "Elul", 28, "shabbos_parsha", "ש״פ נצבים, כ״ח אלול", parsha="Nitzavim")
g("v3-erevrh",     "ערב ראש השנה ה׳תשי״ב", 5711, "Elul", 29, "festival", "ערב ראש השנה ה׳תשי״ב – לאחר תפלת שחרית וסדר התרת נדרים", festival="Erev Rosh Hashana", kind="short_talk")
g("v3-tel-rh",     "לקראת ראש השנה ה׳תשי״ב", 5711, "Elul", None, "other", "מברק לאנ״ש לקראת ראש השנה ה׳תשי״ב", kind="document", notes="Telegram; exact sending date not given in the source.")

# ----------------------------------------------------------------------------------------------
# Items: (chabadlibrary id, gathering key, type, subtype, dibbur-hamaschil, note)
# type: sicha | maamar | reshima | letter | telegram | editorial | other
# ----------------------------------------------------------------------------------------------
I = [
 # ---------------- volume 1 ----------------
 ("1400090002","v1-shiva","sicha","remarks","", "Brief remarks after Shacharis on the 4th day of the shiva (introducing the telling of stories)."),
 ("1400090004","v1-shiva","reshima","stories","", "רשימת הסיפורים שזוכרים – list of 16 numbered stories of the Rebbeim told by the Rebbe during the shiva days (14–17 Shvat 5710); not a sicha."),
 ("1400090011","v1-let-18shvat","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (ח\"י שבט ה'שי\"ת). Per footnote: אגרות-קודש ח\"ג אגרת תקנח, translated from Yiddish."),
 ("1400090013","v1-yisro","sicha","sicha","", None),
 ("1400090016","v1-let-rch-adar","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (ר\"ח אדר ה'שי\"ת). Footnote: printed in סה\"מ תש\"י ע' 130 (introduction to a kuntres) and אגרות-קודש ח\"ג אגרת תקסא."),
 ("1400090018","v1-terumah","sicha","sicha","", None),
 ("1400090023","v1-10adar","sicha","short_sicha","", "Sicha at אסיפת אנ\"ש marking the end of the shloshim; unsectioned."),
 ("1400090025","v1-tetzaveh","sicha","short_sicha","", "Unsectioned."),
 ("1400090028","v1-let-25adar","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (כ\"ה אדר ה'שי\"ת). Concerns ב' ניסן."),
 ("1400090030","v1-vayakhel","sicha","short_sicha","", "Unsectioned."),
 ("1400090034","v1-rch-nisan","sicha","rd","", "ר\"ד (רשימת דברים) – brief remarks."),
 ("1400090036","v1-pesach1","sicha","short_sicha","", "After davening in the room of the Frierdiker Rebbe; unsectioned."),
 ("1400090038","v1-achpesach","sicha","sicha","", None),
 ("1400090044","v1-shmini","sicha","sicha","", "Section א is marked in plain text (not bold) in the digital source."),
 ("1400090054","v1-2iyar","sicha","sicha","", None),
 ("1400090064","v1-let-pesach2","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (פסח שני ה'שי\"ת). Concerns ל\"ג בעומר."),
 ("1400090066","v1-motzpesach2","sicha","sicha","", None),
 ("1400090076","v1-lagbaomer","sicha","sicha","", None),
 ("1400090090","v1-let-behar","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line."),
 ("1400090093","v1-behar","sicha","sicha","", None),
 ("1400090103","v1-rch-sivan","sicha","sicha","", None),
 ("1400090112","v1-shavuos2","sicha","sicha","", None),
 ("1400090126","v1-nasso","sicha","sicha","", None),
 ("1400090129","v1-shlach","sicha","sicha","", None),
 ("1400090142","v1-26sivan","sicha","sicha","", "At a meeting of the מרכז לעניני חינוך."),
 ("1400090145","v1-let-3tamuz","letter","letter","", "TOC heading is only 'ב\"ה,'; dated from signature line (ג' תמוז ה'שי\"ת)."),
 ("1400090148","v1-chukas","sicha","sicha","", None),
 ("1400090157","v1-12tamuz","sicha","sicha","", None),
 ("1400090171","v1-pinchas","sicha","sicha","", None),
 ("1400090185","v1-12av","sicha","rd","", "ר\"ד – brief remarks."),
 ("1400090187","v1-20av","sicha","sicha","", None),
 ("1400090210","v1-reeh","sicha","sicha","", None),
 ("1400090223","v1-let-13elul","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (ערב ש\"ק י\"ג אלול ה'שי\"ת). Concerns ח\"י אלול (introduction to קונטרס ח\"י אלול ה'שי\"ת)."),
 ("1400090226","v1-let-18elul","letter","michtav_klali","", "מכתב כללי, ח\"י אלול ה'שי\"ת, אל אחינו ואחיותינו בני ובנות ישראל."),
 ("1400090229","v1-18elul","sicha","sicha","", None),
 ("1400090245","v1-nitzavim","sicha","sicha","", None),
 ("1400090260","v1-let-selichos","letter","michtav_klali","", "מכתב כללי לתלמידי הישיבות, ראשון דסליחות ה'שי\"ת."),
 ("1400090263","v1-let-selichos","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (יום ראשון דסליחות ה'שי\"ת). Concerns ראש השנה."),
 ("1400090266","v1-add-7iyar","sicha","rd","", "ר\"ד – brief remarks; printed in the הוספות (addenda) of vol. 1."),
 ("1400090269","v1-add-15elul","sicha","rd","", "ר\"ד – brief remarks; printed in the הוספות (addenda) of vol. 1."),
 # ---------------- volume 2 ----------------
 ("1400100002","v2-rh1","sicha","sicha","", "Spoken while walking to Tashlich."),
 ("1400100007","v2-let-shuva","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (ערב שבת תשובה ה'תשי\"א)."),
 ("1400100010","v2-erevyk","sicha","rd","", "Remarks while distributing לעקאח."),
 ("1400100012","v2-erevyk","sicha","blessing","", "Blessing before Kol Nidrei."),
 ("1400100014","v2-let-11tishrei","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (מחרת יום הכפורים ה'תשי\"א). Concerns Sukkos."),
 ("1400100017","v2-let-erevsukkos","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (ערב חה\"ס ה'תשי\"א). Introduction to a kuntres (Shemini Atzeres maamar)."),
 ("1400100020","v2-simchasbeis","sicha","sicha","", None),
 ("1400100035","v2-shabchm","sicha","sicha","", None),
 ("1400100042","v2-leilst","sicha","sicha","", None),
 ("1400100055","v2-yomst","sicha","sicha","", None),
 ("1400100062","v2-isruchag","sicha","rd","", "ר\"ד – brief remarks."),
 ("1400100064","v2-bereshis","sicha","sicha","", None),
 ("1400100078","v2-lechlecha","sicha","sicha","", None),
 ("1400100094","v2-chayeisarah","sicha","sicha","", None),
 ("1400100110","v2-let-rchkislev","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (ר\"ח כסלו ה'תשי\"א)."),
 ("1400100113","v2-vayetzei","sicha","sicha","", None),
 ("1400100125","v2-let-10kislev","letter","michtav_klali","", "מכתב כללי אל אנ\"ש ואל כל חובבי תורה, יו\"ד כסלו ה'תשי\"א."),
 ("1400100128","v2-tel-19kislev","telegram","telegram","", "נוסח המברק לאנ\"ש לקראת י\"ט כסלו."),
 ("1400100130","v2-19kislev","sicha","sicha","", None),
 ("1400100157","v2-vayeshev","sicha","sicha","", None),
 ("1400100170","v2-let-erevvayigash","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (עש\"ק ויגש ה'תשי\"א). On the conclusion of the year of Kaddish."),
 ("1400100173","v2-vayigash","sicha","sicha","", None),
 ("1400100187","v2-9teves","sicha","sicha","", "After Mincha."),
 ("1400100192","v2-24teves","sicha","sicha","", None),
 ("1400100199","v2-vaera","sicha","sicha","", None),
 ("1400100216","v2-let-rchshvat","letter","michtav_klali","", "מכתב כללי, ראש חודש שבט ה'תשי\"א (first of two)."),
 ("1400100218","v2-let-rchshvat","letter","michtav_klali","", "מכתב כללי, ראש חודש שבט ה'תשי\"א (second of two)."),
 ("1400100222","v2-tel-10shvat","telegram","telegram","", "נוסח המברק לאנ\"ש לקראת יום ההילולא יו\"ד שבט."),
 ("1400100224","v2-10shvat","maamar","maamar","באתי לגני", "The Rebbe's first maamar (יו\"ד שבט תשי\"א). Edited (מוגה) text; no numbered sections in the digital text — the Rebbe's own lettered footnotes (א, ב, ג…) are footnotes, not sections."),
 ("1400100237","v2-10shvat","sicha","sicha","", None),
 ("1400100251","v2-beshalach","maamar","maamar","היושבת בגנים", "Text notes it was edited (הוגה) by the Rebbe; no numbered sections."),
 ("1400100256","v2-beshalach","sicha","sicha","", None),
 ("1400100266","v2-let-15shvat","letter","michtav_klali","", "מכתב כללי, ט\"ו בשבט ר\"ה לאילן ה'תשי\"א."),
 ("1400100268","v2-mishpatim","maamar","maamar_hanacha","ואלה המשפטים", "הנחה בלתי מוגה; no numbered sections."),
 ("1400100275","v2-mishpatim","sicha","sicha","", None),
 ("1400100285","v2-kp-rchadar1","sicha","rd","", "ר\"ד at a קבלת-פנים (wedding)."),
 ("1400100288","v2-terumah","sicha","rd","", "ר\"ד to a groom after davening."),
 ("1400100290","v2-kp-7adar1","sicha","rd","", "ר\"ד at a קבלת-פנים (wedding)."),
 ("1400100293","v2-tetzaveh","sicha","rd","", "ר\"ד to a groom after davening."),
 ("1400100295","v2-kp-purimkatan","sicha","rd","", "ר\"ד at a קבלת-פנים (wedding) on Purim Katan."),
 ("1400100298","v2-16adar1","sicha","rd","", "ר\"ד."),
 ("1400100302","v2-vayakhel","reshima","outline","כי תשא", "Short telegraphic text (pp. 257–258) preceding the maamar; appears to be the Rebbe's own outline/ראשי-פרקים of the maamar כי תשא. Nature not confirmed from the API (the heading's * footnote is not returned)."),
 ("1400100305","v2-vayakhel","maamar","maamar_hanacha","כי תשא", "הנחה בלתי מוגה; no numbered sections."),
 ("1400100314","v2-vayakhel","sicha","sicha","", None),
 ("1400100323","v2-let-7adar2","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (ז' אד\"ש ה'תיש\"א)."),
 ("1400100326","v2-bris-7adar2","sicha","rd","", "ר\"ד at a bris."),
 ("1400100333","v2-tel-purim","telegram","telegram","", "נוסח המברק לאנ\"ש לקראת ימי הפורים."),
 ("1400100335","v2-purim","reshima","outline","וקבל היהודים", "Short telegraphic text (p. 283) preceding the maamar; appears to be the Rebbe's own outline/ראשי-פרקים of the maamar וקבל היהודים. Nature not confirmed from the API."),
 ("1400100337","v2-purim","maamar","maamar_hanacha","וקבל היהודים", "No numbered sections."),
 ("1400100352","v2-purim","sicha","sicha","", None),
 ("1400100383","v2-shmini","maamar","maamar_hanacha","וידבר גו׳ זאת חוקת", "הנחה בלתי מוגה; no numbered sections. Opening: וידבר הוי' אל משה ואל אהרן לאמר זאת חוקת התורה."),
 ("1400100391","v2-shmini","sicha","sicha","", None),
 ("1400100401","v2-let-25adar2","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (כ\"ה אד\"ש ה'תיש\"א)."),
 ("1400100404","v2-6nisan","sicha","rd","", "ר\"ד."),
 ("1400100406","v2-add-hadran","reshima","outline","", "pp. 349–351: telegraphic notes on 'אשתו של לוט מהו שתטמא' — appears to be the Rebbe's own outline of the הדרן that follows (הוספות). Nature not confirmed from the API."),
 ("1400100410","v2-add-hadran","sicha","hadran","", "The chabadlibrary node (pp. 352–365) contains three pieces separated by asterisks: (1) הדרן על הש\"ס, sections א–ו (pp. 352–359); (2) a short outline on 'שני סוגי עדים' (pp. 360–361); (3) a sicha 'ישנם שני סוגי עדים' (עדי קידושין), sections א–ז (pp. 362–365), apparently for a wedding. Section labels below are the concatenation of both numbered runs."),
 # ---------------- volume 3 ----------------
 ("1400110002","v3-11nisan","sicha","rd","", "ר\"ד – message given before leaving for the Ohel."),
 ("1400110004","v3-let-11nisan","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (יא ניסן ה'תיש\"א)."),
 ("1400110007","v3-13nisan","sicha","rd","", "ר\"ד."),
 ("1400110010","v3-erevpesach","sicha","rd","", "ר\"ד after ביעור חמץ."),
 ("1400110012","v3-leil2pesach","sicha","sicha","", None),
 ("1400110031","v3-pesach2","sicha","rd","", "ר\"ד after Mincha."),
 ("1400110033","v3-18nisan","sicha","rd","", "ר\"ד after Mincha."),
 ("1400110035","v3-shviishp","sicha","short_sicha","", "After Mincha; unsectioned."),
 ("1400110037","v3-achpesach","maamar","maamar_hanacha","והניף ידו על הנהר", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110046","v3-achpesach","sicha","sicha","", None),
 ("1400110059","v3-acharei","maamar","maamar_hanacha","ויאמר לו יהונתן מחר חודש", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110069","v3-acharei","sicha","sicha","", None),
 ("1400110075","v3-lagbaomer","maamar","maamar_hanacha","וספרתם לכם", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110084","v3-lagbaomer","sicha","sicha","", None),
 ("1400110113","v3-let-21iyar","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (כא אייר ה'תיש\"א). Concerns Shavuos."),
 ("1400110116","v3-bris-24iyar","sicha","rd","", "ר\"ד at a bris."),
 ("1400110122","v3-bechukosai","maamar","maamar_hanacha","והתהלכתי בתוככם", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110132","v3-bechukosai","sicha","sicha","", None),
 ("1400110138","v3-rchsivan","sicha","sicha","", "After Mincha."),
 ("1400110141","v3-tel-shavuos","telegram","telegram","", "נוסח המברק לאנ\"ש לקראת חג השבועות."),
 ("1400110143","v3-bamidbar","sicha","rd","", "ר\"ד after davening."),
 ("1400110145","v3-shavuos1","sicha","sicha","", "After Mincha."),
 ("1400110149","v3-leil2shavuos","sicha","sicha","", None),
 ("1400110155","v3-shavuos2","maamar","maamar_hanacha","אלפיים שנה קדמה תורה", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110165","v3-shavuos2","sicha","sicha","", None),
 ("1400110185","v3-shadarim","sicha","rd","", "ר\"ד to one of the שד\"רים."),
 ("1400110189","v3-shlach","maamar","maamar_hanacha","שלח לך אנשים", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110200","v3-shlach","sicha","sicha","", None),
 ("1400110203","v3-let-3tamuz","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (מוצש\"ק ג' תמוז ה'תיש\"א). Concerns י\"ב-י\"ג תמוז."),
 ("1400110206","v3-tel-12tamuz","telegram","telegram","", "נוסח המברק לאנ\"ש לקראת י\"ב-י\"ג תמוז."),
 ("1400110208","v3-13tamuz","maamar","maamar_hanacha","נתת ליראיך נס להתנוסס", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110216","v3-13tamuz","sicha","sicha","", None),
 ("1400110255","v3-20tamuz","sicha","rd","", "ר\"ד."),
 ("1400110258","v3-22tamuz-tal","sicha","short_sicha","", "To the students leaving on מל\"ח shlichus, in the Rebbe's room; unsectioned."),
 ("1400110262","v3-22tamuz-bm","sicha","rd","", "ר\"ד at a bar-mitzvah celebration."),
 ("1400110264","v3-pinchas","maamar","maamar_hanacha","צו את בני ישראל", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110273","v3-pinchas","sicha","sicha","", None),
 ("1400110280","v3-20av","sicha","sicha","", None),
 ("1400110315","v3-eikev","maamar","maamar_hanacha","והי׳ עקב תשמעון", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110324","v3-eikev","sicha","sicha","", None),
 ("1400110333","v3-let-5elul","letter","michtav_klali","", "מכתב כללי לתלמידי מוסדות התורה ובני הישיבות, ה' אלול ה'תיש\"א."),
 ("1400110335","v3-kp-10elul","sicha","rd","", "ר\"ד at a קבלת-פנים (wedding)."),
 ("1400110341","v3-let-13elul","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (י\"ג אלול תיש\"א). Concerns ח\"י אלול / ג' דסליחות."),
 ("1400110344","v3-teitzei","sicha","rd","", "ר\"ד after Mincha."),
 ("1400110346","v3-18elul","sicha","sicha","", None),
 ("1400110375","v3-let-3selichos","letter","michtav_klali","", "מכתב כללי אל בני ובנות ישראל, ג' דסליחות ה'תיש\"א."),
 ("1400110378","v3-let-3selichos","letter","letter","", "TOC heading is only 'ב\"ה'; dated from signature line (יום שלישי דסליחות תיש\"א)."),
 ("1400110381","v3-25elul","sicha","sicha","", "Address at a gathering (מיפגש), כ\"ה אלול."),
 ("1400110385","v3-nitzavim","maamar","maamar_hanacha","אתם נצבים", "הנחה בלתי מוגה; no numbered sections."),
 ("1400110393","v3-nitzavim","sicha","sicha","", None),
 ("1400110403","v3-erevrh","sicha","short_sicha","", "After Shacharis and התרת נדרים; unsectioned."),
 ("1400110405","v3-tel-rh","telegram","telegram","", "נוסח המברק לאנ\"ש לקראת ראש השנה ה'תשי\"ב."),
]

# ----------------------------------------------------------------------------------------------
HEB_MONTH_OUT = {"Adar I": "Adar I", "Adar II": "Adar II"}
HEBCAL_HM = {"Nisan":"Nisan","Iyyar":"Iyyar","Sivan":"Sivan","Tamuz":"Tamuz","Av":"Av","Elul":"Elul","Tishrei":"Tishrei",
             "Cheshvan":"Cheshvan","Kislev":"Kislev","Tevet":"Tevet","Shvat":"Shvat","Adar":"Adar","Adar I":"Adar1","Adar II":"Adar2"}

cache_path = os.path.join(RAW, "hebcal-cache.json")
cache = json.load(open(cache_path, encoding="utf-8")) if os.path.exists(cache_path) else {}
def hebcal(hy, hm, hd):
    key = f"{hy}-{hm}-{hd}"
    if key in cache:
        return cache[key]
    url = f"https://www.hebcal.com/converter?cfg=json&hy={hy}&hm={HEBCAL_HM[hm]}&hd={hd}&h2g=1"
    r = subprocess.run(["curl", "-sS", "-m", "40", "-A", UA, url], capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except Exception:
        d = {"error": r.stdout[:200]}
    cache[key] = d
    json.dump(cache, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    time.sleep(0.3)
    return d

GEM = {"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ל":30,"מ":40,"נ":50,"ס":60,"ע":70,"פ":80,"צ":90,"ק":100,"ר":200,"ש":300,"ת":400}
def gematria(s):
    return sum(GEM.get(ch, 0) for ch in s)

# Section markers at paragraph start. Observed markups: <strong>X</strong>. | <strong>X.</strong> | <strong>X. </strong> |
# <strong>X</strong><strong>.</strong> | plain "X. ".  Labels must be canonical Hebrew numerals (1-99).
SEC_RE = re.compile(r'<p[^>]*>\s*(?:<strong>\s*)?([א-ת]{1,3})(?:\s*</strong>)?\s*(?:<strong>\s*)?\.(?:\s*</strong>)?(?=\s|<|$)')
_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"]
_TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"]
CANON = set()
for n in range(1, 100):
    t, o = divmod(n, 10)
    lab = _TENS[t] + _ONES[o]
    if n == 15: lab = "טו"
    if n == 16: lab = "טז"
    CANON.add(lab)
def sections(text):
    labels = []
    for m in SEC_RE.finditer(text):
        lab = m.group(1)
        if lab in CANON:
            labels.append(lab)
    # split into contiguous runs starting at א
    runs, cur = [], []
    for lab in labels:
        v = gematria(lab)
        if cur and v == gematria(cur[-1]) + 1:
            cur.append(lab)
        else:
            if cur: runs.append(cur)
            cur = [lab]
    if cur: runs.append(cur)
    # keep only numbered runs that start at א (drops e.g. the signature "מ. שניאורסאהן" matched as a label)
    runs = [r for r in runs if r[0] == "א"]
    labels = [lab for r in runs for lab in r]
    return labels, runs

def strip(t):
    t = re.sub(r'<a class="ftnref"[^>]*>[^<]*</a>', '', t)
    t = re.sub(r'<h4[^>]*>[^<]*</h4>', '', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    return html.unescape(re.sub(r'\s+', ' ', t)).strip()

def page_int(label):
    m = re.match(r'(\d+)', label)
    return int(m.group(1)) if m else None

manifest = json.load(open(os.path.join(RAW, "manifest.json"), encoding="utf-8"))
item_specs = {i[0]: i for i in I}

sources = [
  dict(id="src-chabadlibrary-api", url="https://chabadlibrary.org/books/api/main?path=1400000000", title="ספריית ליובאוויטש (chabadlibrary.org) – JSON API of the Angular reader; node 1400000000 = תורת מנחם", accessedAt=NOW,
       notes="GET /books/api/main?path=<id> returns {content:{tree,type,data},sections}. type 'children' = TOC list (each child has id, heading, left:{id,heading}=first page); type 'childrenPages' = full HTML text of a TOC unit (data.text with <h4 class=page-number> markers, data.haoros footnotes); type 'page' = one page. Responses are brotli-encoded. Volume ids: 1400090001, 1400100001, 1400110001. Deep link: https://chabadlibrary.org/books/<id>."),
  dict(id="src-chabadlibrary-spa", url="https://chabadlibrary.org/books/", title="ספריית ליובאוויטש – online reader (SPA)", accessedAt=NOW, notes="Bundle main.7944696e3492e518.js revealed the api/main, api/search, api/statistics endpoints."),
  dict(id="src-cl-catalog-80376", url="https://chabadlibrary.org/catalog/index1.php?frame=main&catalog=hcatalog&mode=details&volno=80376", title="Chabad Library (Agudas Chasidei Chabad – Ohel Yosef Yitzchak) physical catalog card 80376: תורת מנחם – התוועדויות, volumes א–לא", accessedAt=NOW,
       notes="1st-edition physical data: ח\"א תש\"י (י\"ד שבט–ש\"פ נצבים כ\"ז אלול), ארץ ישראל תשנ\"ג, 8°, XVI,(3),יד,270,(2) pp.; ח\"ב תשי\"א ח\"א [ר\"ה–ו' ניסן], נ.י. תשנ\"ד, XXI,345,(2) pp.; ח\"ג תשי\"א ח\"ב [י\"א ניסן–ערב ר\"ה], רמלה תשנ\"ה, XXII,453 pp. Publisher line: י\"ל ע\"י ועד הנחות בלה\"ק."),
  dict(id="src-cl-catalog-101446", url="https://chabadlibrary.org/catalog/index1.php?frame=main&catalog=hcatalog&mode=details&volno=101446", title="Chabad Library catalog card 101446: תורת מנחם – התוועדויות, הוצאה שניה", accessedAt=NOW,
       notes="ח\"א (3),16,יד,270,(2) pp.; חלק שני תשי\"א (ר\"ה–חודש ניסן), רמלה תשס\"ב, 38,365,(3) pp."),
  dict(id="src-cl-catalog-94009", url="https://chabadlibrary.org/catalog/index1.php?frame=main&catalog=hcatalog&mode=details&volno=94009", title="Chabad Library catalog card 94009: תורת מנחם – התוועדויות, הוצאה שני' עם תיקונים והוספות", accessedAt=NOW,
       notes="ח\"א XX,273,(3) pp., ארץ ישראל תשס\"ב; חלק ג תשי\"א חלק ב (י\"א ניסן–ערב ראש השנה), תשע\"ד, 36,476,(12) pp."),
  dict(id="src-cl-catalog-91414", url="https://chabadlibrary.org/catalog/index1.php?frame=main&catalog=hcatalog&mode=details&volno=91414", title="Chabad Library catalog card 91414: תורת מנחם – התוועדויות, הוצאה רביעית, ח\"א", accessedAt=NOW,
       notes="נ.י. תשס\"ט, 12°, (2),20,273,(11) pp."),
  dict(id="src-hewiki", url="https://he.wikipedia.org/wiki/%D7%AA%D7%95%D7%A8%D7%AA_%D7%9E%D7%A0%D7%97%D7%9D_-_%D7%94%D7%AA%D7%95%D7%95%D7%A2%D7%93%D7%95%D7%99%D7%95%D7%AA", title="ויקיפדיה: תורת מנחם - התוועדויות", accessedAt=NOW,
       notes="Secondary: series edited by ועד הנחות בלה\"ק, printed by הוצאת ספרים קה\"ת; volume א = תש\"י, volumes ב–ג = תשי\"א; first maamar יו\"ד שבט תשי\"א; 130 volumes as of 2025. Used for edition context only (CC BY-SA)."),
  dict(id="src-hebcal", url="https://www.hebcal.com/converter?cfg=json&hy=5711&hm=Shvat&hd=10&h2g=1", title="Hebcal Hebrew-date converter / yearly calendar API", accessedAt=NOW, notes="Used for Hebrew→Gregorian conversion and to cross-check parsha/festival of each date (diaspora calendar, 5710 and 5711)."),
]

volumes_out, gatherings_out, items_out = [], [], []
report = {"volumes": {}}
for vol in VOLUMES:
    vman = manifest[vol["clId"]]
    kids = vman["children"]
    assert len(kids) == len([i for i in I if i[0].startswith(vol["clId"][:7])]), (vol["id"], len(kids))
    gath_ids, gath_ord = {}, 0
    stats = dict(tocUnits=len(kids), gatherings=0, farbrengens=0, shortTalks=0, documents=0, undated=0, items=0, sichos=0, maamarim=0, reshimos=0, letters=0, telegrams=0, other=0, itemsWithSections=0, pages=set())
    for k in kids:
        cid = str(k["id"])
        spec = item_specs[cid]
        _, gkey, itype, subtype, dh, note = spec
        gm = G[gkey]
        if gkey not in gath_ids:
            gath_ord += 1
            gid = f"{vol['id']}-g{gath_ord:03d}"
            gath_ids[gkey] = dict(id=gid, n=0, items=[])
            conv = None
            if gm["hd"] is not None and gm["hm"] is not None:
                conv = hebcal(gm["hy"], gm["hm"], gm["hd"])
            greg = f"{conv['gy']:04d}-{conv['gm']:02d}-{conv['gd']:02d}" if conv and "gy" in conv else None
            events = conv.get("events", []) if conv else []
            gnotes = [gm["notes"]] if gm["notes"] else []
            # cross-check parsha with hebcal
            if gm["parsha"]:
                ok = any(e.replace("Parashat ", "").replace("’", "'") == gm["parsha"] for e in events)
                if not ok:
                    gnotes.append(f"WARNING: hebcal events for this date {events} do not list Parashat {gm['parsha']}.")
            if events:
                gnotes.append("hebcal events on this date: " + "; ".join(events))
            gatherings_out.append(dict(
                id=gid, volumeId=vol["id"], ordinal=gath_ord, heDate=gm["heDate"], hebrewYear=gm["hy"], hebrewMonth=gm["hm"], hebrewDay=gm["hd"],
                occasion=dict(type=gm["occ"], parsha=gm["parsha"], festival=gm["festival"], label=gm["label"]),
                kind=gm["kind"], gregorianDate=greg, pageStart=None, pageEnd=None, pageStartLabel=None, pageEndLabel=None,
                sourceUrl=SPA.format(id=cid), sourceApiUrl=API.format(id=cid),
                verification="verified" if gm["hd"] is not None else "unverified",
                notes=" ".join(gnotes) if gnotes else None))
            stats["gatherings"] += 1
            stats[{"farbrengen":"farbrengens","short_talk":"shortTalks","document":"documents","undated":"undated"}[gm["kind"]]] += 1
        gref = gath_ids[gkey]
        gref["n"] += 1
        d = json.load(open(os.path.join(RAW, f"cl-api-main-{cid}.json"), encoding="utf-8"))
        text = d["content"]["data"]["text"]
        pages = [p for _, p in re.findall(r'page-number" id="(\d+)">([^<]+)</h4>', text)]
        for p in pages: stats["pages"].add(p)
        labels, runs = sections(text)
        plain = strip(text)
        first_words = plain[:120]
        notes = [note] if note else []
        sec_count, sec_labels, sec_runs = None, None, None
        if labels:
            sec_labels = labels
            sec_count = len(labels)
            sec_runs = [dict(first=r[0], last=r[-1], count=len(r)) for r in runs]
            if len(runs) != 1:
                notes.append(f"Section numbering restarts: {len(runs)} numbered runs ({', '.join(r[0] + '–' + r[-1] for r in runs)}); sectionCount is their sum.")
            stats["itemsWithSections"] += 1
        else:
            sec_count = 0
        if "בלתי מוגה" in plain[:200]:
            notes.append("Marked בלתי מוגה (unedited transcript).")
        if itype == "maamar":
            heTitle = f"מאמר ד״ה {dh}"
        elif itype == "sicha":
            heTitle = k["heading"]
        else:
            heTitle = k["heading"] if k["heading"] not in ('ב"ה', 'ב"ה,') else f"מכתב ({gm['heDate']})"
        iid = f"{gref['id']}-{ {'sicha':'s','maamar':'m','reshima':'r','letter':'l','telegram':'t','editorial':'e','other':'o'}[itype] }{gref['n']:02d}"
        items_out.append(dict(
            id=iid, gatheringId=gref["id"], volumeId=vol["id"], type=itype, subtype=subtype, ordinal=gref["n"], heTitle=heTitle, tocHeading=k["heading"],
            dibburHamaschil=dh or None, openingWords=first_words,
            pageStart=page_int(pages[0]) if pages else page_int(k["left"]["heading"]), pageEnd=page_int(pages[-1]) if pages else None,
            pageStartLabel=pages[0] if pages else k["left"]["heading"], pageEndLabel=pages[-1] if pages else None, pageLabels=pages,
            sectionCount=sec_count, sectionLabels=sec_labels, sectionRuns=sec_runs, textChars=len(plain),
            sourceUrl=SPA.format(id=cid), sourceApiUrl=API.format(id=cid), chabadlibraryId=int(cid),
            verification="source_imported_needs_crosscheck" if subtype == "outline" else "verified",
            notes=" ".join(notes) if notes else None))
        gref["items"].append(items_out[-1])
        stats["items"] += 1
        stats[{"sicha":"sichos","maamar":"maamarim","reshima":"reshimos","letter":"letters","telegram":"telegrams","other":"other","editorial":"other"}[itype]] += 1
    # gathering page ranges
    for gkey, gref in gath_ids.items():
        gobj = next(x for x in gatherings_out if x["id"] == gref["id"])
        its = gref["items"]
        gobj["pageStart"] = its[0]["pageStart"]; gobj["pageStartLabel"] = its[0]["pageStartLabel"]
        gobj["pageEnd"] = its[-1]["pageEnd"]; gobj["pageEndLabel"] = its[-1]["pageEndLabel"]
    nums = sorted({page_int(p) for p in stats["pages"]})
    missing = [n for n in range(nums[0], nums[-1] + 1) if n not in nums]
    stats["pages"] = dict(firstDigitized=nums[0], lastDigitized=nums[-1], distinctNumeric=len(nums), missingNumeric=missing, lettered=sorted({p for p in stats["pages"] if not p.isdigit()}))
    report["volumes"][vol["id"]] = stats
    volumes_out.append(dict(
        id=vol["id"], heTitle=vol["heTitle"], year=vol["year"], volumeNumber=vol["volumeNumber"], heRange=vol["heRange"], pageCount=vol["pageCount"],
        digitizedPageRange=[nums[0], nums[-1]], chabadlibraryId=int(vol["clId"]), chabadlibraryHeading=vman["heading"],
        publisher="ועד הנחות בלה״ק (Vaad Hanachos BeLahak); distributed by הוצאת ספרים קה״ת (Kehot) per Hebrew Wikipedia; catalog cards name only ועד הנחות בלה״ק",
        editions=[], bindingColor=None, bindingColorVerification="unverified – no cover image or description found in the sources reached",
        sourceIds=["src-chabadlibrary-api", "src-cl-catalog-80376", "src-cl-catalog-101446", "src-cl-catalog-94009", "src-cl-catalog-91414", "src-hewiki"],
        sourceUrl=SPA.format(id=vol["clId"]), verification="verified", notes=vol["pageNotes"]))

# editions per volume from catalog cards
volumes_out[0]["editions"] = [
    dict(edition="1st", place="ארץ ישראל", hebrewYear="תשנ״ג", gregorianYear=1993, format="8°", pagination="XVI, (3), יד, 270, (2) ע'", sourceId="src-cl-catalog-80376"),
    dict(edition="2nd (עם תיקונים והוספות)", place="ארץ ישראל", hebrewYear="תשס״ב", gregorianYear=2002, format="8°", pagination="XX, 273, (3) ע'", sourceId="src-cl-catalog-94009"),
    dict(edition="4th", place="נ.י.", hebrewYear="תשס״ט", gregorianYear=2009, format="12°", pagination="(2), 20, 273, (11) ע'", sourceId="src-cl-catalog-91414")]
volumes_out[1]["editions"] = [
    dict(edition="1st", place="נ.י.", hebrewYear="תשנ״ד", gregorianYear=1994, format="8°", pagination="XXI, 345, (2) ע'", sourceId="src-cl-catalog-80376"),
    dict(edition="2nd", place="רמלה", hebrewYear="תשס״ב", gregorianYear=2002, format="8°", pagination="38, 365, (3) ע'", sourceId="src-cl-catalog-101446")]
volumes_out[2]["editions"] = [
    dict(edition="1st", place="רמלה", hebrewYear="תשנ״ה", gregorianYear=1995, format="8°", pagination="XXII, 453 ע'", sourceId="src-cl-catalog-80376"),
    dict(edition="later (edition number not stated on card)", place="ארץ ישראל", hebrewYear="תשע״ד", gregorianYear=2014, format="8°", pagination="36, 476, (12) ע'", sourceId="src-cl-catalog-94009")]

out = dict(schemaVersion=1, generatedAt=NOW,
           notes="Catalogue of תורת מנחם – התוועדויות vols. 1–3 built from the full digital text on chabadlibrary.org. One 'item' = one TOC unit of the digital edition (the printed book numbers the sichos of a farbrengen as sections א, ב, ג… within a single 'שיחת …' unit, not as separate שיחה א׳/ב׳ entries). 'gatherings' include non-farbrengen dated events; see gathering.kind (farbrengen | short_talk | document | undated). Extra fields beyond the requested schema: gathering.kind, gathering.sourceApiUrl, page*Label, item.subtype, item.tocHeading, item.openingWords, item.pageLabels, item.textChars, item.chabadlibraryId, volume.editions/heRange/digitizedPageRange.",
           sources=sources, volumes=volumes_out, gatherings=gatherings_out, items=items_out)
json.dump(out, open(os.path.join(BASE, "toras-menachem.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(report, open(os.path.join(RAW, "build-stats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
print(json.dumps(report, ensure_ascii=False, indent=1, default=str))
# warnings
for gobj in gatherings_out:
    if gobj["notes"] and "WARNING" in gobj["notes"]:
        print("WARN", gobj["id"], gobj["heDate"], gobj["notes"])
for it in items_out:
    if it["notes"] and "not a single contiguous" in it["notes"]:
        print("SECWARN", it["id"], it["tocHeading"], it["sectionLabels"])
