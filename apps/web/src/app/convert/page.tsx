"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GalaxyBackgroundWeb from "../components/GalaxyBackgroundWeb";

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

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COMMON_BASES = [2, 8, 10, 16];

function charToVal(ch: string): number {
  return DIGITS.indexOf(ch);
}

function toBase(n: bigint, base: number): ConversionResult {
  if (n === BigInt(0)) return { value: "0", steps: [] };
  const b = BigInt(base);
  let cur = n < BigInt(0) ? -n : n;
  const out: string[] = [];
  const steps: DivStep[] = [];

  while (cur > BigInt(0)) {
    const q = cur / b;
    const r = cur % b;
    steps.push({ q, r });
    out.push(DIGITS[Number(r)]);
    cur = q;
  }

  const raw = out.reverse().join("");
  return { value: n < BigInt(0) ? `-${raw}` : raw, steps };
}

function parseToDecimal(
  input: string,
  base: number,
): { decimal: bigint; steps: ParseStep[] } {
  const b = BigInt(base);
  let total = BigInt(0);
  const normalized = input.toUpperCase();
  const steps: ParseStep[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const v = charToVal(ch);
    if (v < 0 || v >= base) {
      throw new Error(`Invalid digit '${ch}' for base ${base}`);
    }
    const before = total;
    const afterMul = before * b;
    const afterAdd = afterMul + BigInt(v);
    steps.push({ index: i, ch, digit: BigInt(v), before, afterMul, afterAdd });
    total = afterAdd;
  }

  return { decimal: total, steps };
}

export default function ConvertPage() {
  const [input, setInput] = useState("101101");
  const [sourceBase, setSourceBase] = useState(2);
  const [targetBase, setTargetBase] = useState(3);

  const solved = useMemo(() => {
    const t = input.trim();
    if (!t) return { error: "Enter a number to convert." } as const;
    if (sourceBase < 2 || sourceBase > 36) {
      return { error: "Source base must be 2..36." } as const;
    }

    const isNeg = t.startsWith("-");
    const body = isNeg ? t.slice(1) : t;
    if (!body) return { error: "Enter digits after '-' sign." } as const;

    try {
      const parsed = parseToDecimal(body, sourceBase);
      const decimal = isNeg ? -parsed.decimal : parsed.decimal;
      return {
        decimal,
        parseSteps: parsed.steps,
        outputs: {
          2: toBase(decimal, 2),
          8: toBase(decimal, 8),
          10: toBase(decimal, 10),
          16: toBase(decimal, 16),
          custom: toBase(decimal, Math.max(2, Math.min(36, targetBase))),
        },
      } as const;
    } catch (e) {
      return { error: (e as Error).message } as const;
    }
  }, [input, sourceBase, targetBase]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        position: "relative",
      }}
    >
      <GalaxyBackgroundWeb preset="cinematic" />

      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(19,17,42,0.78)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background:
              "linear-gradient(135deg,var(--accent-cyan),var(--accent-violet))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          ⇄
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
            Base Converter
          </h1>
          <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>
            Decimal, Binary, Octal, Hex and custom base
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href="/" className="btn-ghost">
            Cipher
          </Link>
          <Link href="/modcalc" className="btn-ghost">
            Mod Calc
          </Link>
          <Link href="/about" className="btn-ghost">
            About
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "14px 12px 46px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <section
          className="panel"
          style={{
            padding: 14,
            marginBottom: 10,
            background: "rgba(19,17,42,0.72)",
          }}
        >
          <div className="section-label">Input</div>
          <input
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 101101 or 7F"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 10,
            }}
          >
            <div>
              <div className="section-label">Source Base (2..36)</div>
              <input
                type="number"
                className="input-field"
                min={2}
                max={36}
                value={sourceBase}
                onChange={(e) =>
                  setSourceBase(
                    Math.max(
                      2,
                      Math.min(36, parseInt(e.target.value || "10", 10)),
                    ),
                  )
                }
              />
            </div>
            <div>
              <div className="section-label">Custom Target Base</div>
              <input
                type="number"
                className="input-field"
                min={2}
                max={36}
                value={targetBase}
                onChange={(e) =>
                  setTargetBase(
                    Math.max(
                      2,
                      Math.min(36, parseInt(e.target.value || "3", 10)),
                    ),
                  )
                }
              />
            </div>
          </div>
        </section>

        {"error" in solved ? (
          <section
            className="panel"
            style={{
              padding: 14,
              borderColor: "rgba(244,63,94,0.55)",
              background: "rgba(19,17,42,0.72)",
            }}
          >
            <div
              className="section-label"
              style={{ color: "var(--accent-rose)" }}
            >
              Error
            </div>
            <div style={{ color: "var(--text-primary)" }}>{solved.error}</div>
          </section>
        ) : (
          <>
            <section
              className="panel"
              style={{
                padding: 14,
                marginBottom: 10,
                background: "rgba(19,17,42,0.72)",
              }}
            >
              <div className="section-label">Results</div>
              {[
                ["Decimal", solved.outputs[10].value],
                ["Binary", solved.outputs[2].value],
                ["Octal", solved.outputs[8].value],
                ["Hex", solved.outputs[16].value],
                [
                  `Base ${Math.max(2, Math.min(36, targetBase))}`,
                  solved.outputs.custom.value,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(139,92,246,0.15)",
                    padding: "8px 0",
                  }}
                >
                  <span
                    style={{ color: "var(--text-secondary)", fontSize: 12 }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      color: "var(--accent-cyan)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </section>

            <section
              className="panel"
              style={{
                padding: 14,
                marginBottom: 10,
                background: "rgba(19,17,42,0.72)",
              }}
            >
              <div className="section-label">Step 1: Source to Decimal</div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                total = total × {sourceBase} + digit
              </div>
              {solved.parseSteps.map((st) => (
                <div
                  key={`${st.index}-${st.ch}`}
                  style={{
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 4,
                  }}
                >
                  [{st.index}] '{st.ch}' ({String(st.digit)}):{" "}
                  {String(st.before)} × {sourceBase} = {String(st.afterMul)}; +{" "}
                  {String(st.digit)} = {String(st.afterAdd)}
                </div>
              ))}
              <div
                style={{
                  marginTop: 8,
                  color: "var(--accent-lime)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                }}
              >
                Decimal result: {String(solved.decimal)}
              </div>
            </section>

            {([2, 8, 16] as const).map((base) => {
              const out = solved.outputs[base];
              return (
                <section
                  key={base}
                  className="panel"
                  style={{
                    padding: 14,
                    marginBottom: 10,
                    background: "rgba(19,17,42,0.72)",
                  }}
                >
                  <div className="section-label">
                    Step 2: Decimal to Base {base}
                  </div>
                  {out.steps.length === 0 ? (
                    <div style={{ fontSize: 11 }}>
                      Input is 0, so result is 0.
                    </div>
                  ) : (
                    out.steps.map((st: DivStep, i: number) => (
                      <div
                        key={`${base}-${i}`}
                        style={{
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          marginBottom: 3,
                        }}
                      >
                        {i + 1}. q={String(st.q)} r={String(st.r)}
                      </div>
                    ))
                  )}
                  <div
                    style={{
                      marginTop: 8,
                      color: "var(--accent-lime)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                    }}
                  >
                    Read remainders bottom-to-top: {out.value}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
