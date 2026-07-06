import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "../lib/theme";
import { storage } from "../lib/storage";

const WEB_ORIGIN = "https://klinikiq.furkanguven.space";

type Props = {
  path: string;
};

export function WebAppScreen({ path }: Props) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    void storage.getToken().then((t) => {
      setToken(t);
      setTokenReady(true);
    });
  }, []);

  const uri = `${WEB_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

  const injectedJavaScript = useMemo(() => {
    const t = token != null ? JSON.stringify(token) : "null";
    return `(function(){try{var __t=${t};if(__t)localStorage.setItem('access_token',__t);}catch(e){}})();true;`;
  }, [token]);

  if (!tokenReady) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <WebView
        source={{ uri }}
        style={styles.web}
        injectedJavaScript={injectedJavaScript}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={() => {
          /* İleride derin linkler için genişletilebilir */
        }}
        onMessage={() => {}}
        originWhitelist={["https://*", "http://*"]}
        setSupportMultipleWindows={Platform.OS === "android"}
      />
      {loading ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  web: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
