import { describe, expect, test } from "bun:test";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { language } from "../../tests/catalog";
import { clockFace, datePattern } from "./format";

const tools = (formatting: string) =>
  languageTools({ language: formatting.slice(0, 2), formatting, catalog: null, english: null });

const noon = new Date(Date.UTC(2026, 10, 3, 12));
const auto = { timeFormat: "auto", dateFormat: "auto", timeZone: "UTC" } as const;

describe("clockFace", () => {
  test("auto in German writes 3. Nov.", () => {
    expect(clockFace(noon, auto, tools("de-DE")).date).toBe("3. Nov.");
  });

  test("auto in English writes Nov 3", () => {
    expect(clockFace(noon, auto, tools("en-US")).date).toBe("Nov 3");
  });

  test("auto in French writes 3 nov.", () => {
    expect(clockFace(noon, auto, tools("fr-FR")).date).toBe("3 nov.");
  });

  test("the configured zone wins", () => {
    const late = new Date(Date.UTC(2026, 10, 2, 23, 30));
    const face = clockFace(late, { ...auto, timeZone: "Europe/Berlin" }, tools("de-DE"));
    expect(face.date).toBe("3. Nov.");
    expect(face.hours).toBe("00");
  });

  test("an empty zone reads the device zone", () => {
    const face = clockFace(noon, { ...auto, timeZone: "" }, tools("de-DE"));
    expect(face).toEqual(clockFace(noon, { ...auto, timeZone: undefined }, tools("de-DE")));
  });

  test("24 keeps 15 in English", () => {
    const face = clockFace(
      new Date(Date.UTC(2026, 10, 3, 15, 4, 5)),
      { ...auto, timeFormat: "24" },
      tools("en-US"),
    );
    expect(face).toMatchObject({ hours: "15", minutes: "04", seconds: "05" });
    expect(face.period).toBeUndefined();
  });

  test("12 gives PM in English", () => {
    const face = clockFace(
      new Date(Date.UTC(2026, 10, 3, 15)),
      { ...auto, timeFormat: "12" },
      tools("en-GB"),
    );
    expect(face.hours).toBe("03");
    expect(face.period?.toLowerCase()).toBe("pm");
  });

  test("auto in English US gives PM", () => {
    const face = clockFace(new Date(Date.UTC(2026, 10, 3, 15)), auto, tools("en-US"));
    expect(face.hours).toBe("03");
    expect(face.period).toBe("PM");
  });

  test("DD/MM/YYYY writes 03/11/2026", () => {
    expect(clockFace(noon, { ...auto, dateFormat: "DD/MM/YYYY" }, tools("en-US")).date).toBe(
      "03/11/2026",
    );
  });

  test("DD/MM/YYYY in German writes 03.11.2026", () => {
    expect(clockFace(noon, { ...auto, dateFormat: "DD/MM/YYYY" }, tools("de-DE")).date).toBe(
      "03.11.2026",
    );
  });

  test("MM/DD/YYYY in German writes 11.03.2026", () => {
    expect(clockFace(noon, { ...auto, dateFormat: "MM/DD/YYYY" }, tools("de-DE")).date).toBe(
      "11.03.2026",
    );
  });

  test("DD/MM/YYYY in French writes 03/11/2026", () => {
    expect(clockFace(noon, { ...auto, dateFormat: "DD/MM/YYYY" }, tools("fr-FR")).date).toBe(
      "03/11/2026",
    );
  });

  test("YYYY-MM-DD in German writes 2026-11-03", () => {
    expect(clockFace(noon, { ...auto, dateFormat: "YYYY-MM-DD" }, tools("de-DE")).date).toBe(
      "2026-11-03",
    );
  });

  test("the weekday follows the language", () => {
    expect(clockFace(noon, auto, tools("de-DE")).weekday).toBe("Dienstag");
  });
});

describe("datePattern", () => {
  const spoken = (tag: "en" | "fr" | "de") => languageTools(language("clock", tag));

  test("German day-first reads TT.MM.JJJJ, as the clock writes it", () => {
    expect(datePattern("DD/MM/YYYY", spoken("de"))).toBe("TT.MM.JJJJ");
  });

  test("French day-first reads JJ/MM/AAAA", () => {
    expect(datePattern("DD/MM/YYYY", spoken("fr"))).toBe("JJ/MM/AAAA");
  });

  test("year-first keeps hyphens in German", () => {
    expect(datePattern("YYYY-MM-DD", spoken("de"))).toBe("JJJJ-MM-TT");
  });

  test("English month-first reads MM/DD/YYYY", () => {
    expect(datePattern("MM/DD/YYYY", spoken("en"))).toBe("MM/DD/YYYY");
  });
});
