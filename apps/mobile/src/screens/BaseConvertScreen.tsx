import React, { useMemo, useState } from "react";
import {
  Animated,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GalaxyParallaxBackground from "../components/GalaxyParallaxBackground";
import { C, F } from "../theme";

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COMMON_BASES = [2, 8, 10, 16];

type ParseStep = {
  index: number;
  ch: string;
  digit: bigint;
  before: bigint;
  afterMul: bigint;
  afterAdd: bigint;
};

type DivStep = {
  q: bigint;
  r: bigint;
};

type ConversionResult = {
  value: string;
  steps: DivStep[];
};

type SolveResult =
  | {
      ok: true;
      normalizedInput: string;
      sourceBase: number;
      decimal: bigint;
      parseSteps: ParseStep[];
      outputs: Record<number, ConversionResult>;
      customTarget: { base: number; result: ConversionResult } | null;
    }
  | { ok: false; error: string };

function charToVal(ch: string): number {
  return DIGITS.indexOf(ch);
}

function toBase(n: bigint, base: number): ConversionResult {
  const b = BigInt(base);
  if (n === 0n) return { value: "0", steps: [] };

  let cur = n < 0n ? -n : n;
  const steps: DivStep[] = [];
  const out: string[] = [];

  while (cur > 0n) {
    const q = cur / b;
    const r = cur % b;
    steps.push({ q, r });
    out.push(DIGITS[Number(r)]);
    cur = q;
  }

  const raw = out.reverse().join("");
  return { value: n < 0n ? `-${raw}` : raw, steps };
}

function parseToDecimal(
  input: string,
  base: number,
): { decimal: bigint; steps: ParseStep[] } {
  const b = BigInt(base);
  const normalized = input.toUpperCase();
  const steps: ParseStep[] = [];
  let total = 0n;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const v = charToVal(ch);
    if (v < 0 || v >= base) {
      throw new Error(`Invalid digit '${ch}' for base ${base}`);
    }

    const before = total;
    const afterMul = before * b;
    const afterAdd = afterMul + BigInt(v);
    steps.push({
      index: i,
      ch,
      digit: BigInt(v),
      before,
      afterMul,
      afterAdd,
    });
    total = afterAdd;
  }

  return { decimal: total, steps };
}

function solveConversion(
  rawInput: string,
  sourceBase: number,
  customTargetBase: number,
): SolveResult {
  const trimmed = rawInput.trim();
  if (!trimmed) return { ok: false, error: "Enter a number to convert." };
  if (!Number.isInteger(sourceBase) || sourceBase < 2 || sourceBase > 36) {
    return { ok: false, error: "Source base must be between 2 and 36." };
  }

  const isNeg = trimmed.startsWith("-");
  const body = isNeg ? trimmed.slice(1) : trimmed;
  if (!body) return { ok: false, error: "Enter digits after '-' sign." };

  try {
    const { decimal, steps } = parseToDecimal(body, sourceBase);
    const signedDecimal = isNeg ? -decimal : decimal;

    const outputs: Record<number, ConversionResult> = {};
    for (const b of COMMON_BASES) {
      outputs[b] = toBase(signedDecimal, b);
    }

    let customTarget: { base: number; result: ConversionResult } | null = null;
    if (
      Number.isInteger(customTargetBase) &&
      customTargetBase >= 2 &&
      customTargetBase <= 36 &&
      !COMMON_BASES.includes(customTargetBase)
    ) {
      customTarget = {
        base: customTargetBase,
        result: toBase(signedDecimal, customTargetBase),
      };
    }

    return {
      ok: true,
      normalizedInput: body.toUpperCase(),
      sourceBase,
      decimal: signedDecimal,
      parseSteps: steps,
      outputs,
      customTarget,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function SourceBaseChips({
  value,
  onChange,
}: {
  value: number;
  onChange: (b: number) => void;
}) {
  return (
    <View style={s.row}>
      {COMMON_BASES.map((b) => (
        <TouchableOpacity
          key={b}
          style={[s.chip, value === b && s.chipActive]}
          onPress={() => onChange(b)}
        >
          <Text style={[s.chipTxt, value === b && s.chipTxtActive]}>
            Base {b}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function BaseConvertScreen() {
  const scrollY = useState(() => new Animated.Value(0))[0];
  const [input, setInput] = useState("101101");
  const [sourceBase, setSourceBase] = useState(2);
  const [customTargetRaw, setCustomTargetRaw] = useState("3");

  const customTargetBase = useMemo(() => {
    const parsed = parseInt(customTargetRaw, 10);
    if (!Number.isFinite(parsed)) return 3;
    return Math.max(2, Math.min(36, parsed));
  }, [customTargetRaw]);

  const solved = useMemo(
    () => solveConversion(input, sourceBase, customTargetBase),
    [input, sourceBase, customTargetBase],
  );

  return (
    <SafeAreaView style={s.root}>
      <GalaxyParallaxBackground scrollY={scrollY} preset="cinematic" />
      <Animated.ScrollView
        style={s.scroll}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <View style={s.card}>
          <Text style={s.label}>INPUT NUMBER</Text>
          <TextInput
            style={s.input}
            autoCapitalize="characters"
            autoCorrect={false}
            value={input}
            onChangeText={setInput}
            placeholder="e.g. 101101 or 7F"
            placeholderTextColor={C.textMuted}
          />

          <Text style={[s.label, { marginTop: 10 }]}>SOURCE BASE</Text>
          <SourceBaseChips value={sourceBase} onChange={setSourceBase} />

          <View style={[s.row, { marginTop: 8 }]}>
            <Text style={s.small}>Custom source:</Text>
            <TextInput
              style={[s.smallInput, { marginLeft: 8 }]}
              keyboardType="number-pad"
              value={String(sourceBase)}
              onChangeText={(v) => {
                const parsed = parseInt(v, 10);
                if (Number.isFinite(parsed))
                  setSourceBase(Math.max(2, Math.min(36, parsed)));
                else if (v === "") setSourceBase(10);
              }}
            />
          </View>

          <View style={[s.row, { marginTop: 8 }]}>
            <Text style={s.small}>Custom target:</Text>
            <TextInput
              style={[s.smallInput, { marginLeft: 8 }]}
              keyboardType="number-pad"
              value={customTargetRaw}
              onChangeText={setCustomTargetRaw}
              onBlur={() => setCustomTargetRaw(String(customTargetBase))}
            />
          </View>
        </View>

        {!solved.ok ? (
          <View style={[s.card, { borderColor: "rgba(244,63,94,0.5)" }]}>
            <Text style={[s.label, { color: C.rose }]}>ERROR</Text>
            <Text style={s.error}>{solved.error}</Text>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <Text style={s.label}>CONVERSION RESULTS</Text>
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>Decimal (Base 10)</Text>
                <Text style={s.resultValue}>{solved.outputs[10].value}</Text>
              </View>
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>Binary (Base 2)</Text>
                <Text style={s.resultValue}>{solved.outputs[2].value}</Text>
              </View>
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>Octal (Base 8)</Text>
                <Text style={s.resultValue}>{solved.outputs[8].value}</Text>
              </View>
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>Hex (Base 16)</Text>
                <Text style={s.resultValue}>{solved.outputs[16].value}</Text>
              </View>
              {solved.customTarget ? (
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>
                    Custom (Base {solved.customTarget.base})
                  </Text>
                  <Text style={s.resultValue}>
                    {solved.customTarget.result.value}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={s.card}>
              <Text style={s.label}>STEP 1: SOURCE BASE TO DECIMAL</Text>
              <Text style={s.stepIntro}>
                total = total × {solved.sourceBase} + digit
              </Text>
              {solved.parseSteps.map((st) => (
                <Text key={`${st.index}-${st.ch}`} style={s.stepLine}>
                  [{st.index}] '{st.ch}' ({String(st.digit)}):{" "}
                  {String(st.before)} × {solved.sourceBase} ={" "}
                  {String(st.afterMul)}; + {String(st.digit)} ={" "}
                  {String(st.afterAdd)}
                </Text>
              ))}
              <Text style={s.summary}>
                Decimal result: {String(solved.decimal)}
              </Text>
            </View>

            {[2, 8, 16].map((base) => (
              <View key={base} style={s.card}>
                <Text style={s.label}>STEP 2: DECIMAL TO BASE {base}</Text>
                <Text style={s.stepIntro}>Repeated division by {base}</Text>
                {solved.outputs[base].steps.length === 0 ? (
                  <Text style={s.stepLine}>Input is 0, so result is 0.</Text>
                ) : (
                  solved.outputs[base].steps.map((st, i) => (
                    <Text key={`${base}-${i}`} style={s.stepLine}>
                      {i + 1}. q={String(st.q)} r={String(st.r)}
                    </Text>
                  ))
                )}
                <Text style={s.summary}>
                  Read remainders bottom-to-top: {solved.outputs[base].value}
                </Text>
              </View>
            ))}

            {solved.customTarget ? (
              <View style={s.card}>
                <Text style={s.label}>
                  STEP 3: DECIMAL TO BASE {solved.customTarget.base}
                </Text>
                <Text style={s.stepIntro}>
                  Repeated division by {solved.customTarget.base}
                </Text>
                {solved.customTarget.result.steps.length === 0 ? (
                  <Text style={s.stepLine}>Input is 0, so result is 0.</Text>
                ) : (
                  solved.customTarget.result.steps.map((st, i) => (
                    <Text key={`custom-${i}`} style={s.stepLine}>
                      {i + 1}. q={String(st.q)} r={String(st.r)}
                    </Text>
                  ))
                )}
                <Text style={s.summary}>
                  Read remainders bottom-to-top:{" "}
                  {solved.customTarget.result.value}
                </Text>
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 30 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgBase, overflow: "hidden" },
  scroll: { flex: 1 },
  card: {
    margin: 10,
    marginBottom: 0,
    backgroundColor: "rgba(19, 17, 42, 0.72)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.textMuted,
    marginBottom: 7,
  },
  input: {
    backgroundColor: C.bgInput,
    color: C.textPrimary,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    fontFamily: F.mono,
    borderWidth: 1,
    borderColor: C.border,
  },
  smallInput: {
    width: 56,
    textAlign: "center",
    backgroundColor: C.bgInput,
    color: C.textPrimary,
    borderRadius: 7,
    padding: 7,
    fontSize: 13,
    fontFamily: F.mono,
    borderWidth: 1,
    borderColor: C.border,
  },
  small: { fontSize: 12, color: C.textSecondary },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  chipActive: { borderColor: C.cyan, backgroundColor: "rgba(6,182,212,0.12)" },
  chipTxt: { fontSize: 11, fontWeight: "600", color: C.textMuted },
  chipTxtActive: { color: C.cyan },
  error: { fontSize: 13, color: C.textPrimary },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139,92,246,0.14)",
    paddingVertical: 8,
    gap: 8,
  },
  resultLabel: { fontSize: 12, color: C.textSecondary },
  resultValue: {
    fontSize: 15,
    color: C.cyan,
    fontFamily: F.mono,
    fontWeight: "700",
  },
  stepIntro: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: F.mono,
    marginBottom: 8,
  },
  stepLine: {
    fontSize: 11,
    color: C.textPrimary,
    fontFamily: F.mono,
    marginBottom: 4,
  },
  summary: {
    fontSize: 12,
    color: C.lime,
    fontFamily: F.mono,
    marginTop: 8,
    fontWeight: "700",
  },
});
