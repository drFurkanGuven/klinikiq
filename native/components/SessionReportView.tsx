import {
  BookOpen,
  Brain,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  MessageSquare,
  Stethoscope,
  Users,
  XCircle,
} from "lucide-react-native";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { ReportOut } from "../lib/api";
import type { Theme } from "../lib/theme";

function fontBold() {
  return Platform.select({
    ios: "Inter_700Bold",
    android: "Inter_700Bold",
    default: "Inter_700Bold",
  });
}
function fontSemi() {
  return Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  });
}
function fontReg() {
  return Platform.select({
    ios: "Inter_400Regular",
    android: "Inter_400Regular",
    default: "Inter_400Regular",
  });
}
function fontBlack() {
  return Platform.select({
    ios: "Inter_900Black",
    android: "Inter_900Black",
    default: "Inter_900Black",
  });
}

function ScoreRing({ score, theme }: { score: number; theme: Theme }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <View style={styles.scoreRingWrap}>
      <Svg
        width={120}
        height={120}
        style={[styles.scoreSvg, { transform: [{ rotate: "-90deg" }] }]}
      >
        <Circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke={theme.border}
          strokeWidth={10}
        />
        <Circle
          cx={60}
          cy={60}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={styles.scoreCenter}>
        <Text style={[styles.scoreNum, { color: theme.text }]}>
          {Math.round(score)}
        </Text>
        <Text style={[styles.scoreDenom, { color: theme.textMuted }]}>
          / 100
        </Text>
      </View>
    </View>
  );
}

export function SessionReportView({
  report,
  theme,
}: {
  report: ReportOut;
  theme: Theme;
}) {
  const label =
    report.score >= 70
      ? { text: "Başarılı", bg: theme.success + "22", color: theme.success }
      : report.score >= 50
        ? { text: "Geliştirilmeli", bg: "#f59e0b22", color: "#f59e0b" }
        : { text: "Yetersiz", bg: theme.error + "22", color: theme.error };

  const dateStr = new Date(report.created_at).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const cr = report.clinical_reasoning;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <ScoreRing score={report.score} theme={theme} />
        <View
          style={[
            styles.badge,
            { backgroundColor: label.bg, borderColor: label.color },
          ]}
        >
          <Text style={[styles.badgeText, { color: label.color }]}>
            {label.text}
          </Text>
        </View>
        <Text style={[styles.dateLine, { color: theme.textMuted }]}>
          {dateStr}
        </Text>
      </View>

      <View style={styles.twoCol}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHead}>
            <View style={[styles.iconBox, { borderColor: theme.success + "44" }]}>
              <CheckCircle2 size={20} color={theme.success} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Doğru Tanılar
            </Text>
          </View>
          {report.correct_diagnoses.length === 0 ? (
            <Text style={[styles.muted, { color: theme.textMuted }]}>
              Doğru tanı bulunamadı.
            </Text>
          ) : (
            report.correct_diagnoses.map((d, i) => (
              <Text
                key={i}
                style={[styles.diagLine, { color: theme.success }]}
              >
                {i + 1}. {d}
              </Text>
            ))
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHead}>
            <View style={[styles.iconBox, { borderColor: theme.error + "44" }]}>
              <XCircle size={20} color={theme.error} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Atlanmış Tanılar
            </Text>
          </View>
          {report.missed_diagnoses.length === 0 ? (
            <Text style={[styles.muted, { color: theme.success }]}>
              Harika, hiç tanı atlanmadı!
            </Text>
          ) : (
            report.missed_diagnoses.map((d, i) => (
              <Text key={i} style={[styles.diagLine, { color: theme.error }]}>
                {i + 1}. {d}
              </Text>
            ))
          )}
        </View>
      </View>

      {report.pathophysiology_note ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHead}>
            <BookOpen size={20} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Patofizyoloji Analizi
            </Text>
          </View>
          <Text
            style={[styles.bodyText, { color: theme.text, fontFamily: fontReg() }]}
          >
            {report.pathophysiology_note}
          </Text>
        </View>
      ) : null}

      {report.tus_reference ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.accent + "55",
            },
          ]}
        >
          <View style={styles.cardHead}>
            <ExternalLink size={20} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.accent }]}>
              TUS / Akademik Kaynak
            </Text>
          </View>
          <Text
            style={[
              styles.bodyText,
              {
                color: theme.text,
                fontFamily: fontSemi(),
                borderLeftWidth: 4,
                borderLeftColor: theme.accent,
                paddingLeft: 12,
              },
            ]}
          >
            {report.tus_reference}
          </Text>
        </View>
      ) : null}

      {report.recommendations && report.recommendations.length > 0 ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>
            Gelişim Önerileri
          </Text>
          {report.recommendations.map((r, i) => (
            <Text
              key={i}
              style={[styles.recLine, { color: theme.text, fontFamily: fontReg() }]}
            >
              {i + 1}. {r}
            </Text>
          ))}
        </View>
      ) : null}

      {cr ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHead}>
            <Brain size={20} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Klinik Akıl Yürütme Analizi
            </Text>
          </View>
          <View style={styles.crGrid}>
            {[
              { Icon: MessageSquare, label: "Anamnez", value: cr.anamnez_sayisi },
              { Icon: FlaskConical, label: "Tetkik", value: cr.tetkik_sayisi },
              {
                Icon: Stethoscope,
                label: "Fizik Muayene",
                value: cr.fizik_muayene_sayisi,
              },
              {
                Icon: Users,
                label: "Konsültasyon",
                value: cr.konsultasyon_sayisi,
              },
            ].map(({ Icon, label, value }) => (
              <View
                key={label}
                style={[
                  styles.crCell,
                  { borderColor: theme.border, backgroundColor: theme.card },
                ]}
              >
                <Icon size={18} color={theme.accent} />
                <Text style={[styles.crVal, { color: theme.text }]}>{value}</Text>
                <Text style={[styles.crLab, { color: theme.textMuted }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
          {[
            {
              text: cr.anamnez_yorum,
              good: cr.ilk_eylem_oncesi_anamnez >= 4,
            },
            { text: cr.fizik_yorum, good: cr.fizik_muayene_sayisi > 0 },
          ].map(({ text, good }, i) => (
            <View
              key={i}
              style={[
                styles.crComment,
                {
                  borderColor: good ? theme.success + "44" : "#f59e0b44",
                  backgroundColor: good
                    ? theme.success + "11"
                    : "#f59e0b11",
                },
              ]}
            >
              <Text style={{ color: theme.text, fontFamily: fontReg() }}>
                {good ? "✅ " : "⚠️ "}
                {text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 32 },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  twoCol: { gap: 16 },
  scoreRingWrap: {
    width: 120,
    height: 120,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreSvg: { position: "absolute" },
  scoreCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: {
    fontSize: 36,
    fontFamily: fontBlack(),
  },
  scoreDenom: { fontSize: 11, fontFamily: fontSemi(), opacity: 0.5 },
  badge: {
    alignSelf: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontFamily: fontBold(), fontSize: 13 },
  dateLine: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 13,
    fontFamily: fontReg(),
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
  },
  muted: { fontSize: 13, fontFamily: fontReg(), fontStyle: "italic" },
  diagLine: { fontSize: 14, fontFamily: fontSemi(), marginBottom: 8 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  recLine: { marginBottom: 10, fontSize: 14, lineHeight: 21 },
  crGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  crCell: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
  crVal: { fontSize: 22, fontFamily: fontBlack(), marginTop: 4 },
  crLab: { fontSize: 11, marginTop: 2, fontFamily: fontReg() },
  crComment: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
});
