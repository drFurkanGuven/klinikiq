import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme, useThemeMode } from "../lib/theme";
import { storage } from "../lib/storage";
import { WEB_ORIGIN } from "../lib/urls";

type Props = {
  path: string;
};

export function WebAppScreen({ path }: Props) {
  const theme = useTheme();
  const { resolvedScheme } = useThemeMode();
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<{
    access: string | null;
    refresh: string | null;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const [access, refresh] = await Promise.all([
        storage.getToken(),
        storage.getRefreshToken(),
      ]);
      setTokens({ access, refresh });
    })();
  }, []);

  const uri = `${WEB_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

  const injectedJavaScript = useMemo(() => {
    const access = tokens?.access != null ? JSON.stringify(tokens.access) : "null";
    const refresh =
      tokens?.refresh != null ? JSON.stringify(tokens.refresh) : "null";
    const dark = resolvedScheme === "dark";
    return `(function(){
      try{
        var a=${access},r=${refresh};
        if(a)localStorage.setItem('access_token',a);
        if(r)localStorage.setItem('refresh_token',r);
        var root=document.documentElement;
        if(${dark ? "true" : "false"}){root.classList.add('dark');}
        else{root.classList.remove('dark');}
      }catch(e){}
    })();true;`;
  }, [tokens, resolvedScheme]);

  if (!tokens) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.foreground} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <WebView
        source={{ uri }}
        style={styles.web}
        injectedJavaScript={injectedJavaScript}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        originWhitelist={["https://*", "http://*"]}
        setSupportMultipleWindows={Platform.OS === "android"}
      />
      {loading ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.foreground} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  web: { flex: 1 },
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
