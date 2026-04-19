import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { drugsApi, type DrugDetail } from "../../lib/api";
import { useTheme } from "../../lib/theme";

function fontBold() {
  return Platform.select({
    ios: "Inter_700Bold",
    android: "Inter_700Bold",
    default: "Inter_700Bold",
  });
}

function fontReg() {
  return Platform.select({
    ios: "Inter_400Regular",
    android: "Inter_400Regular",
    default: "Inter_400Regular",
  });
}

type SectionDef = {
  key: string;
  title: string;
  content: (d: DrugDetail) => string | null;
};

function Section({
  title,
  open,
  onToggle,
  children,
  theme,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.section, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Haptics.selectionAsync();
          onToggle();
        }}
        style={styles.sectionHead}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {open ? (
          <ChevronUp size={22} color={theme.textMuted} />
        ) : (
          <ChevronDown size={22} color={theme.textMuted} />
        )}
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

export default function IlacDetailScreen() {
  const theme = useTheme();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = useMemo(() => {
    const raw = idParam;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [idParam]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["drug", id],
    queryFn: async () => (await drugsApi.detail(id!)).data,
    enabled: Boolean(id),
  });

  const sections: SectionDef[] = useMemo(
    () => [
      {
        key: "ind",
        title: "Endikasyon",
        content: (d) => d.indication,
      },
      {
        key: "mec",
        title: "Etki Mekanizması",
        content: (d) => d.mechanism,
      },
      {
        key: "pharm",
        title: "Farmakodinamik",
        content: (d) => d.pharmacodynamics,
      },
      {
        key: "tox",
        title: "Toksisite",
        content: (d) => d.toxicity,
      },
      {
        key: "met",
        title: "Metabolizma",
        content: (d) => d.metabolism,
      },
      {
        key: "half",
        title: "Yarı Ömür & Dağılım",
        content: (d) => {
          const parts: string[] = [];
          if (d.half_life) parts.push(`Yarı ömür: ${d.half_life}`);
          if (d.protein_binding) parts.push(`Protein bağlanması: ${d.protein_binding}`);
          if (d.absorption) parts.push(`Emilim: ${d.absorption}`);
          if (d.volume_of_distribution) parts.push(`Dağılım hacmi: ${d.volume_of_distribution}`);
          if (d.route_of_elimination) parts.push(`Eliminasyon: ${d.route_of_elimination}`);
          return parts.length ? parts.join("\n\n") : null;
        },
      },
      {
        key: "ddi",
        title: "İlaç Etkileşimleri",
        content: (d) => d.drug_interactions,
      },
      {
        key: "food",
        title: "Besin Etkileşimleri",
        content: (d) => d.food_interactions,
      },
      {
        key: "tgt",
        title: "Hedefler",
        content: (d) => d.targets,
      },
      {
        key: "atc",
        title: "ATC Kodları",
        content: (d) => d.atc_codes,
      },
    ],
    []
  );

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => ({
    ind: true,
  }));

  const toggle = (key: string) => {
    setOpenMap((m) => ({ ...m, [key]: !m[key] }));
  };

  const titleName = data?.name ?? "İlaç";

  if (!id) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
        <Text style={[styles.err, { color: theme.error }]}>
          Geçersiz ilaç kodu.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            router.back();
          }}
          style={styles.navBtn}
        >
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text
          style={[styles.navTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {titleName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : isError || !data ? (
        <Text style={[styles.err, { color: theme.error }]}>
          İlaç bilgisi yüklenemedi.
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {sections.filter((s) => s.content(data)?.trim()).length === 0 ? (
            <Text style={[styles.err, { color: theme.textMuted }]}>
              Bu ilaç için ayrıntılı alan bulunamadı.
            </Text>
          ) : null}
          {sections.map((s) => {
            const text = s.content(data);
            if (!text?.trim()) return null;
            return (
              <Section
                key={s.key}
                title={s.title}
                open={Boolean(openMap[s.key])}
                onToggle={() => toggle(s.key)}
                theme={theme}
              >
                <Text style={[styles.body, { color: theme.textMuted }]}>{text}</Text>
              </Section>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
    minHeight: 44,
  },
  navBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontFamily: fontBold(),
    fontSize: 17,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  center: {
    paddingVertical: 48,
    alignItems: "center",
  },
  err: {
    fontFamily: fontReg(),
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  sectionTitle: {
    fontFamily: fontBold(),
    fontSize: 16,
    flex: 1,
    paddingRight: 8,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  body: {
    fontFamily: fontReg(),
    fontSize: 15,
    lineHeight: 22,
  },
});
