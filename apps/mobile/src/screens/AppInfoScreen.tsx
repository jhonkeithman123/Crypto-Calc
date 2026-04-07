import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { latestPatchNotesSummary } from "@crypto/patch-notes/client";
import appJson from "../../app.json";
import GalaxyParallaxBackground from "../components/GalaxyParallaxBackground";
import { C, F } from "../theme";

type ReleaseInfo = {
  version: string;
  url: string;
  publishedAt: string | null;
  source: "release" | "tag" | "release-page";
};

const CREATOR_NAME = "Keith Justine Virgenes";
const REPO_OWNER = "jhonkeithman123";
const REPO_NAME = "Crypto-Calc";
const FACEBOOK_URL = `https://facebook.com/${REPO_OWNER}`;
const GITHUB_PROFILE_URL = `https://github.com/${REPO_OWNER}`;

function normalizeVersion(v: string): string {
  return v.trim().replace(/^v/i, "");
}

function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a)
    .split(".")
    .map((x) => Number(x) || 0);
  const pb = normalizeVersion(b)
    .split(".")
    .map((x) => Number(x) || 0);
  const max = Math.max(pa.length, pb.length);

  for (let i = 0; i < max; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString();
}

async function fetchLatestVersion(): Promise<ReleaseInfo> {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Crypto-Calc-Mobile",
  };
  const releaseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  const releaseRes = await fetch(releaseUrl, { headers });

  if (releaseRes.ok) {
    const data = await releaseRes.json();
    return {
      version: normalizeVersion(String(data.tag_name ?? "0.0.0")),
      url: String(
        data.html_url ?? `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
      ),
      publishedAt: data.published_at ? String(data.published_at) : null,
      source: "release",
    };
  }
  if (releaseRes.status === 403 || releaseRes.status === 429) {
    return fetchLatestFromPublicReleasePage();
  }

  const tagsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/tags`;
  const tagsRes = await fetch(tagsUrl, { headers });
  if (tagsRes.status === 403 || tagsRes.status === 429) {
    return fetchLatestFromPublicReleasePage();
  }
  if (!tagsRes.ok) {
    throw new Error("Could not fetch release or tags from GitHub.");
  }

  const tags = (await tagsRes.json()) as Array<{ name?: string }>;
  if (!Array.isArray(tags) || tags.length === 0 || !tags[0]?.name) {
    throw new Error("No release tags found in repository.");
  }

  return {
    version: normalizeVersion(String(tags[0].name)),
    url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/tags`,
    publishedAt: null,
    source: "tag",
  };
}

function parseVersionFromTagUrl(url: string): string | null {
  const m = url.match(/\/tag\/([^/?#]+)/i);
  if (!m || !m[1]) return null;
  return normalizeVersion(decodeURIComponent(m[1]));
}

async function fetchLatestFromPublicReleasePage(): Promise<ReleaseInfo> {
  const latestUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
  const releasePageRes = await fetch(latestUrl, { redirect: "follow" });
  const finalUrl = String(releasePageRes.url || latestUrl);

  const byRedirect = parseVersionFromTagUrl(finalUrl);
  if (byRedirect) {
    return {
      version: byRedirect,
      url: finalUrl,
      publishedAt: null,
      source: "release-page",
    };
  }

  const html = await releasePageRes.text();
  const m = html.match(/\/releases\/tag\/([^"'?#\s<]+)/i);
  if (m && m[1]) {
    const rawTag = decodeURIComponent(m[1]);
    return {
      version: normalizeVersion(rawTag),
      url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${rawTag}`,
      publishedAt: null,
      source: "release-page",
    };
  }

  throw new Error("Could not determine latest release from GitHub.");
}

export default function AppInfoScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const currentVersion = String(appJson.expo.version ?? "0.0.0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<ReleaseInfo | null>(null);

  const updateState = useMemo(() => {
    if (!latest) return "No update data yet";
    const cmp = compareVersions(latest.version, currentVersion);
    if (cmp > 0) return "Update available";
    if (cmp === 0) return "App is up to date";
    return "Local app version is newer than remote";
  }, [latest, currentVersion]);

  const checkForUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await fetchLatestVersion();
      setLatest(info);
    } catch (e) {
      setError((e as Error).message || "Failed to check updates");
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdates().catch(() => {});
  }, [checkForUpdates]);

  const openUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open link", url);
    }
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <GalaxyParallaxBackground scrollY={scrollY} preset="cinematic" />
      <Animated.ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <View style={s.card}>
          <Text style={s.header}>App Information</Text>
          <Text style={s.rowLabel}>App</Text>
          <Text style={s.rowValue}>Crypto Calc</Text>
          <Text style={s.rowLabel}>Current Version</Text>
          <Text style={s.rowValue}>{currentVersion}</Text>
          <Text style={s.rowLabel}>Creator</Text>
          <Text style={s.rowValue}>{CREATOR_NAME}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.header}>Links</Text>
          <TouchableOpacity
            style={s.linkBtn}
            onPress={() => openUrl(GITHUB_PROFILE_URL)}
          >
            <Text style={s.linkText}>Creator GitHub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.linkBtn}
            onPress={() => openUrl(FACEBOOK_URL)}
          >
            <Text style={s.linkText}>Creator Facebook</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.linkBtn}
            onPress={() =>
              openUrl(`https://github.com/${REPO_OWNER}/${REPO_NAME}`)
            }
          >
            <Text style={s.linkText}>Project Repository</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.header}>Latest Patch Notes</Text>
          <Text style={s.rowLabel}>Version</Text>
          <Text style={s.rowValue}>{latestPatchNotesSummary.version}</Text>
          <Text style={s.rowLabel}>Date</Text>
          <Text style={s.rowValue}>{latestPatchNotesSummary.date}</Text>
          {latestPatchNotesSummary.highlights.map((item) => (
            <Text key={item} style={s.bulletText}>
              - {item}
            </Text>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.header}>Update Checker</Text>
          <Text style={s.rowLabel}>Status</Text>
          <Text
            style={[
              s.rowValue,
              updateState === "Update available" && { color: C.amber },
            ]}
          >
            {loading ? "Checking GitHub..." : updateState}
          </Text>

          {latest ? (
            <>
              <Text style={s.rowLabel}>Latest Version ({latest.source})</Text>
              <Text style={s.rowValue}>{latest.version}</Text>
              {latest.source === "release-page" ? (
                <Text style={s.infoText}>
                  Using public GitHub page fallback (API rate-limited).
                </Text>
              ) : null}
              <Text style={s.rowLabel}>Published</Text>
              <Text style={s.rowValue}>{formatDate(latest.publishedAt)}</Text>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => openUrl(latest.url)}
              >
                <Text style={s.actionBtnTxt}>Open Latest Update</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={s.refreshBtn}
            onPress={() => checkForUpdates()}
          >
            <Text style={s.refreshBtnTxt}>
              {loading ? "Checking..." : "Check Again"}
            </Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: "rgba(19, 17, 42, 0.86)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: "700",
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  rowValue: {
    fontSize: 14,
    color: C.cyan,
    fontFamily: F.mono,
    marginBottom: 2,
  },
  linkBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.bgCard,
    marginBottom: 8,
  },
  linkText: {
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: C.cyan,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  actionBtnTxt: {
    color: C.cyan,
    fontWeight: "700",
    fontSize: 12,
  },
  refreshBtn: {
    backgroundColor: C.violet,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  refreshBtnTxt: {
    color: C.white,
    fontWeight: "700",
    fontSize: 12,
  },
  errorText: {
    color: C.rose,
    fontSize: 12,
    marginTop: 8,
  },
  bulletText: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  infoText: {
    color: C.amber,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 4,
  },
});
