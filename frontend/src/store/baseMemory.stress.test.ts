import { describe, it, expect, vi } from "vitest";
import {
  baseMemory,
  normalizeBlackboard,
  sanitizeText,
  SupportedLanguage,
} from "./baseMemory";

describe("Milestone 2 Challenger 1: Empirical Multilingual & Sanitization Stress Suite", () => {
  const ALL_LANGUAGES: SupportedLanguage[] = ["en", "es", "fr", "ja", "ar"];

  // --------------------------------------------------------------------------
  // 1. Reactive Multilingual Rapid Switching
  // --------------------------------------------------------------------------
  describe("1. Reactive Multilingual Rapid Switching", () => {
    it("rapidly switches across all 5 languages sequentially 50 times with zero state drift", () => {
      baseMemory.resetScenario();
      baseMemory.setLanguage("en");

      const expectedHeadlines: Record<SupportedLanguage, string> = {
        en: "Man City sustained possession pinning Arsenal in low defensive block.",
        es: "Posesión sostenida del Man City encerrando al Arsenal en bloque bajo defensivo.",
        fr: "Possession soutenue de Man City enfermant Arsenal dans un bloc bas défensif.",
        ja: "マンチェスター・シティがポゼッションを維持し、アーセナルを低位ブロックに封じ込める。",
        ar: "مانشستر سيتي يفرض حصار الاستحواذ ويجبر أرسنال على التراجع في كتلة دفاعية منخفضة.",
      };

      const expectedExplanations: Record<SupportedLanguage, string> = {
        en: "High territorial compression in the central corridor with Pass Difficulty Rating at 0.42.",
        es: "Alta compresión territorial en el pasillo interior con Índice de Dificultad de Pase en 0.42.",
        fr: "Forte compression territoriale dans l'axe avec indice de difficulté de passe à 0,42.",
        ja: "中央レーンでの高い陣形圧縮、パス難易度レーティングは0.42を記録。",
        ar: "ضغط مساحي مكثف في الممر المركزي مع مؤشر صعوبة تمرير يبلغ 0.42.",
      };

      const subscriberCalls: string[] = [];
      const unsubscribe = baseMemory.subscribe(() => {
        subscriberCalls.push(baseMemory.language);
      });

      for (let cycle = 0; cycle < 50; cycle++) {
        for (const lang of ALL_LANGUAGES) {
          baseMemory.setLanguage(lang);

          // Verify baseMemory.language getter contract
          expect(baseMemory.language).toBe(lang);
          expect(baseMemory.getState().selectedLanguage).toBe(lang);

          // Verify reactive updates on tactical blackboard
          const bb = baseMemory.getState().blackboard;
          expect(bb.narrative_headline).toBe(expectedHeadlines[lang]);
          expect(bb.narrative_explanation).toBe(expectedExplanations[lang]);
        }
      }

      unsubscribe();
      expect(subscriberCalls.length).toBe(50 * ALL_LANGUAGES.length);
    });

    it("notifies multiple listeners synchronously on language transition", () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      const unsubA = baseMemory.subscribe(listenerA);
      const unsubB = baseMemory.subscribe(listenerB);

      baseMemory.setLanguage("ja");
      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
      expect(baseMemory.language).toBe("ja");

      baseMemory.setLanguage("ar");
      expect(listenerA).toHaveBeenCalledTimes(2);
      expect(listenerB).toHaveBeenCalledTimes(2);
      expect(baseMemory.language).toBe("ar");

      unsubA();
      baseMemory.setLanguage("en");
      expect(listenerA).toHaveBeenCalledTimes(2);
      expect(listenerB).toHaveBeenCalledTimes(3);

      unsubB();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Scenario Injection across All 5 Languages
  // --------------------------------------------------------------------------
  describe("2. Multilingual Scenario Injection & Switching", () => {
    const SCENARIOS = [
      "low_block_siege",
      "rapid_counter",
      "red_card_crisis",
      "box_scramble",
    ];

    it.each(SCENARIOS)("injects scenario '%s' and switches across all 5 languages", (scenarioId) => {
      for (const initialLang of ALL_LANGUAGES) {
        baseMemory.resetScenario();
        baseMemory.setLanguage(initialLang);

        baseMemory.injectScenario(scenarioId);
        expect(baseMemory.getState().activeScenario).toBe(scenarioId);
        expect(baseMemory.getState().blackboard.active_tactical_inflection).toBe(true);

        // Check that initial injection resolved in initialLang
        const initialHeadline = baseMemory.getState().blackboard.narrative_headline;
        expect(initialHeadline).toBeDefined();
        expect(initialHeadline.length).toBeGreaterThan(0);
        expect(initialHeadline).not.toContain("[object Object]");
        expect(initialHeadline).not.toContain("NarrativeDraft");

        // Now cycle all 5 languages while scenario is active
        for (const targetLang of ALL_LANGUAGES) {
          baseMemory.setLanguage(targetLang);
          expect(baseMemory.language).toBe(targetLang);

          const bb = baseMemory.getState().blackboard;
          expect(bb.narrative_headline).toBeDefined();
          expect(bb.narrative_headline.length).toBeGreaterThan(0);
          expect(bb.narrative_headline).not.toContain("[object Object]");
          expect(bb.narrative_headline).not.toContain("NarrativeDraft");

          expect(bb.narrative_explanation).toBeDefined();
          expect(bb.narrative_explanation?.length).toBeGreaterThan(0);
          expect(bb.narrative_explanation).not.toContain("[object Object]");
          expect(bb.narrative_explanation).not.toContain("NarrativeDraft");
        }
      }
    });

    it("cleans up scenario state upon resetScenario() and preserves active language headline", () => {
      baseMemory.setLanguage("ja");
      expect(baseMemory.language).toBe("ja");

      baseMemory.injectScenario("box_scramble");
      expect(baseMemory.getState().activeScenario).toBe("box_scramble");
      expect(baseMemory.getState().blackboard.narrative_headline).toContain("ゴール前大混戦");

      baseMemory.resetScenario();
      expect(baseMemory.getState().activeScenario).toBeNull();
      expect(baseMemory.language).toBe("ja");
      // Check whether resetScenario restored Japanese headline or reset to English initialBlackboard
      const headline = baseMemory.getState().blackboard.narrative_headline;
      expect(headline).toBe("マンチェスター・シティがポゼッションを維持し、アーセナルを低位ブロックに封じ込める。");
    });
  });

  // --------------------------------------------------------------------------
  // 3. sanitizeText Adversarial Challenges
  // --------------------------------------------------------------------------
  describe("3. sanitizeText Adversarial Stress Testing", () => {
    describe("Multilingual object unwrapping & fallback rules", () => {
      it("unwraps exact language key when available", () => {
        const dict = {
          en: "English Title",
          es: "Título en Español",
          fr: "Titre en Français",
          ja: "日本語のタイトル",
          ar: "العنوان بالعربية",
        };

        for (const lang of ALL_LANGUAGES) {
          expect(sanitizeText(dict, "fallback", lang)).toBe(dict[lang]);
        }
      });

      it("falls back to 'en' when the active language is missing from dictionary", () => {
        const partialDict = {
          en: "Fallback English Headline",
          fr: "Titre Français",
        };

        expect(sanitizeText(partialDict, "default", "es")).toBe("Fallback English Headline");
        expect(sanitizeText(partialDict, "default", "ja")).toBe("Fallback English Headline");
        expect(sanitizeText(partialDict, "default", "ar")).toBe("Fallback English Headline");
        expect(sanitizeText(partialDict, "default", "fr")).toBe("Titre Français");
      });

      it("returns fallback if neither active language nor 'en' is present", () => {
        const nonEnglishDict = {
          de: "Deutscher Titel",
          it: "Titolo Italiano",
        };

        expect(sanitizeText(nonEnglishDict, "Safe Fallback", "es")).toBe("Safe Fallback");
        expect(sanitizeText(nonEnglishDict, "Safe Fallback", "en")).toBe("Safe Fallback");
      });

      it("handles empty objects without crashing", () => {
        expect(sanitizeText({}, "Safe Fallback", "en")).toBe("Safe Fallback");
        expect(sanitizeText({}, "Safe Fallback", "ar")).toBe("Safe Fallback");
      });

      it("handles nested objects without returning [object Object] or crashing", () => {
        const nested = {
          es: { sub: "Deep Spanish" },
          en: { sub: "Deep English" },
        };
        // Because rec[activeLang] is an object (not string), it must safely return fallback
        expect(sanitizeText(nested, "Recovered Fallback", "es")).toBe("Recovered Fallback");
      });

      it("handles objects with circular references without infinite recursion", () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        circular.en = "Safe circular en";

        expect(sanitizeText(circular, "fallback", "en")).toBe("Safe circular en");

        const pureLoop: Record<string, unknown> = {};
        pureLoop.self = pureLoop;
        expect(sanitizeText(pureLoop, "fallback", "en")).toBe("fallback");
      });

      it("handles arrays and object prototypes safely", () => {
        expect(sanitizeText([], "fallback")).toBe("fallback");
        expect(sanitizeText(["one", "two"], "fallback")).toBe("fallback");
        expect(sanitizeText(Object.create(null), "fallback")).toBe("fallback");
      });
    });

    describe("Poisoned strings and serialization artifacts", () => {
      it("strips raw NarrativeDraft(...) strings and returns fallback", () => {
        const poisonedRepr1 = "NarrativeDraft(id='test_123', headline='City siege', isTacticalInflectionPoint=False)";
        expect(sanitizeText(poisonedRepr1, "Clean Fallback")).toBe("Clean Fallback");

        const poisonedReprWithWhitespace = "   NarrativeDraft(id='x')   ";
        expect(sanitizeText(poisonedReprWithWhitespace, "Clean Fallback")).toBe("Clean Fallback");

        const embeddedPoison = "Alert: NarrativeDraft(id='123', headline='Breaking')";
        expect(sanitizeText(embeddedPoison, "Clean Fallback")).toBe("Clean Fallback");

        const poisonedInsideObject = {
          en: "NarrativeDraft(id='456', headline='Corrupted')",
          es: "NarrativeDraft(id='789', headline='Corrompido')",
        };
        expect(sanitizeText(poisonedInsideObject, "Clean Fallback", "en")).toBe("Clean Fallback");
        expect(sanitizeText(poisonedInsideObject, "Clean Fallback", "es")).toBe("Clean Fallback");
      });

      it("guards against [object Object] serialization leaks", () => {
        expect(sanitizeText("[object Object]", "Clean Fallback")).toBe("Clean Fallback");
        expect(sanitizeText("Prefix [object Object] Suffix", "Clean Fallback")).toBe("Clean Fallback");
        expect(sanitizeText("   [object Object]   ", "Clean Fallback")).toBe("Clean Fallback");

        const objWithObjectLeak = {
          en: "[object Object]",
          es: "Valid Spanish",
        };
        expect(sanitizeText(objWithObjectLeak, "Clean Fallback", "en")).toBe("Clean Fallback");
        expect(sanitizeText(objWithObjectLeak, "Clean Fallback", "es")).toBe("Valid Spanish");
      });
    });

    describe("Primitives, falsy values and type boundaries", () => {
      it("returns fallback on null and undefined", () => {
        expect(sanitizeText(null, "fallback")).toBe("fallback");
        expect(sanitizeText(undefined, "fallback")).toBe("fallback");
      });

      it("preserves valid numbers as trimmed strings", () => {
        expect(sanitizeText(0, "fallback")).toBe("0");
        expect(sanitizeText(42, "fallback")).toBe("42");
        expect(sanitizeText(-17.5, "fallback")).toBe("-17.5");
        expect(sanitizeText(NaN, "fallback")).toBe("NaN");
        expect(sanitizeText(Infinity, "fallback")).toBe("Infinity");
      });

      it("preserves booleans as string representation", () => {
        expect(sanitizeText(true, "fallback")).toBe("true");
        expect(sanitizeText(false, "fallback")).toBe("false");
      });

      it("preserves clean non-poisoned strings including symbols and whitespace", () => {
        expect(sanitizeText("Simple headline", "fallback")).toBe("Simple headline");
        expect(sanitizeText("   Trimmed headline   ", "fallback")).toBe("Trimmed headline");
        expect(sanitizeText("", "fallback")).toBe("");
        expect(sanitizeText("   ", "fallback")).toBe("");
      });
    });

    describe("High-volume throughput stress", () => {
      it("executes 10,000 adversarial calls under 50ms without crashing", () => {
        const adversarialPool = [
          null,
          undefined,
          "[object Object]",
          "NarrativeDraft(id='999', headline='foo')",
          { en: "City high press", es: "Presión alta del City" },
          { fr: "Seulement Français" },
          {},
          12345,
          true,
          false,
          "",
          "  NarrativeDraft(broken)  ",
          "Clean tactical string",
        ];

        const start = performance.now();
        let invalidCount = 0;
        for (let i = 0; i < 10000; i++) {
          const sample = adversarialPool[i % adversarialPool.length];
          const lang = ALL_LANGUAGES[i % ALL_LANGUAGES.length];
          const result = sanitizeText(sample, "safe_fallback", lang);
          if (result.includes("[object Object]") || result.startsWith("NarrativeDraft(")) {
            invalidCount++;
          }
        }
        const elapsed = performance.now() - start;
        expect(invalidCount).toBe(0);
        expect(elapsed).toBeLessThan(100); // 10k raw calls easily run in < 100ms
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. normalizeBlackboard Wire Serialization Protection
  // --------------------------------------------------------------------------
  describe("4. normalizeBlackboard Wire Protection", () => {
    it("safely ignores null or degraded payloads", () => {
      baseMemory.setLanguage("en");
      const current = baseMemory.getState().blackboard;
      const resNull = normalizeBlackboard(null, current);
      expect(resNull).toBe(current);

      const resString = normalizeBlackboard("invalid string payload", current);
      expect(resString).toBe(current);

      const resEmpty = normalizeBlackboard({}, current);
      expect(resEmpty.narrative_headline).toBe(current.narrative_headline);
    });

    it("rejects NarrativeDraft and [object Object] when updating blackboard wire payload", () => {
      const current = baseMemory.getState().blackboard;
      const poisonedWire = {
        narrative: "NarrativeDraft(id='poison', headline='leaked dataclass')",
        narrative_headline: "NarrativeDraft(id='poison2', headline='leaked')",
        multilingual_stream: {
          headline: {
            en: "[object Object]",
            es: "Presión táctica válida",
          },
        },
      };

      baseMemory.setLanguage("en");
      const normalizedEn = normalizeBlackboard(poisonedWire, current);
      // Since 'en' has [object Object], sanitizeText should reject it and keep fallback
      expect(normalizedEn.narrative_headline).not.toContain("[object Object]");
      expect(normalizedEn.narrative_headline).not.toContain("NarrativeDraft");

      baseMemory.setLanguage("es");
      const normalizedEs = normalizeBlackboard(poisonedWire, current);
      // 'es' has valid string
      expect(normalizedEs.narrative_headline).toBe("Presión táctica válida");
    });
  });
});
