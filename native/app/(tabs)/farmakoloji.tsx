import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { BookOpen, Columns2, FlaskConical, Search, Shield } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import { useTheme } from "../../lib/theme";

function fontBlack() {
  return Platform.select({
    ios: "Inter_900Black",
    android: "Inter_900Black",
    default: "Inter_900Black",
  });
}

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

function fontSemi() {
  return Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  });
}

export default function FarmakolojiTab() {
  const theme = useTheme();

  const goIlaclar = () => {
    void Haptics.selectionAsync();
    router.push("/farmakoloji/ilaclar");
  };

  const goAtc = () => {
    void Haptics.selectionAsync();
    router.push("/farmakoloji/atc");
  };

  const goAntibiotics = () => {
    void Haptics.selectionAsync();
    router.push("/farmakoloji/antibiyotikler");
  };

  const goCompare = () => {
    void Haptics.selectionAsync();
    router.push("/farmakoloji/karsilastir");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={styles.pad}>
        <View style={styles.headerRow}>
          <FlaskConical size={28} color={theme.accent} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>Farmakoloji</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              İlaç rehberi · ATC sınıfları
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={goIlaclar}
          style={({ pressed }) => [
            styles.cardPress,
            pressed && styles.pressed,
          ]}
        >
          <Card style={[styles.hubCard, { borderColor: theme.border }]}>
            <View style={styles.hubRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}22` }]}>
                <Search size={26} color={theme.accent} />
              </View>
              <View style={styles.hubMeta}>
                <Text style={[styles.hubTitle, { color: theme.text }]}>İlaç Ara</Text>
                <Text style={[styles.hubHint, { color: theme.textMuted }]}>
                  İsim veya etken madde ile ara
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={goAtc}
          style={({ pressed }) => [
            styles.cardPress,
            pressed && styles.pressed,
          ]}
        >
          <Card style={[styles.hubCard, { borderColor: theme.border }]}>
            <View style={styles.hubRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}22` }]}>
                <BookOpen size={26} color={theme.accent} />
              </View>
              <View style={styles.hubMeta}>
                <Text style={[styles.hubTitle, { color: theme.text }]}>ATC Sınıfları</Text>
                <Text style={[styles.hubHint, { color: theme.textMuted }]}>
                  Anatomik terapötik sınıflandırma
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={goAntibiotics}
          style={({ pressed }) => [
            styles.cardPress,
            pressed && styles.pressed,
          ]}
        >
          <Card style={[styles.hubCard, { borderColor: theme.border }]}>
            <View style={styles.hubRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}22` }]}>
                <Shield size={26} color={theme.accent} />
              </View>
              <View style={styles.hubMeta}>
                <Text style={[styles.hubTitle, { color: theme.text }]}>Antibiyotikler</Text>
                <Text style={[styles.hubHint, { color: theme.textMuted }]}>
                  Sınıf ve direnç mekanizmaları
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={goCompare}
          style={({ pressed }) => [
            styles.cardPress,
            pressed && styles.pressed,
          ]}
        >
          <Card style={[styles.hubCard, { borderColor: theme.border }]}>
            <View style={styles.hubRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}22` }]}>
                <Columns2 size={26} color={theme.accent} />
              </View>
              <View style={styles.hubMeta}>
                <Text style={[styles.hubTitle, { color: theme.text }]}>İlaç karşılaştırma</Text>
                <Text style={[styles.hubHint, { color: theme.textMuted }]}>
                  En fazla dört ilacı yan yana incele
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  pad: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: fontBlack(),
    fontSize: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontReg(),
    fontSize: 14,
    marginTop: 4,
  },
  cardPress: {
    marginBottom: 14,
  },
  pressed: {
    opacity: 0.88,
  },
  hubCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  hubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hubMeta: {
    flex: 1,
  },
  hubTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
  },
  hubHint: {
    fontFamily: fontSemi(),
    fontSize: 13,
    marginTop: 4,
  },
});
