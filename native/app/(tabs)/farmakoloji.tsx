import { SafeAreaView } from "react-native-safe-area-context";
import { WebAppScreen } from "../../components/WebAppScreen";

export default function FarmakolojiTab() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <WebAppScreen path="/farmakoloji/haritalar" />
    </SafeAreaView>
  );
}
