import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";

const { width: SW } = Dimensions.get("window");

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

function ZoomableImage({
  uri,
  headers,
  onLoaded,
}: {
  uri: string;
  headers?: Record<string, string>;
  onLoaded?: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const scaleRef = useRef(1);
  const gestureStartScale = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const panStartTx = useRef(0);
  const panStartTy = useRef(0);

  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);

  const clampScale = useCallback((s: number) => Math.min(5, Math.max(1, s)), []);

  const onPinchEvent = useCallback(
    (e: { nativeEvent: { scale: number } }) => {
      const next = clampScale(gestureStartScale.current * e.nativeEvent.scale);
      scaleRef.current = next;
      setScale(next);
      if (next <= 1) {
        txRef.current = 0;
        tyRef.current = 0;
        setTranslateX(0);
        setTranslateY(0);
      }
    },
    [clampScale]
  );

  const onPinchStateChange = useCallback(
    (e: { nativeEvent: { state: number; oldState: number } }) => {
      const { state, oldState } = e.nativeEvent;
      if (state === State.BEGAN) {
        gestureStartScale.current = scaleRef.current;
      }
      if (oldState === State.ACTIVE) {
        const s = scaleRef.current;
        if (s <= 1) {
          txRef.current = 0;
          tyRef.current = 0;
          setTranslateX(0);
          setTranslateY(0);
        }
      }
    },
    []
  );

  const onPanEvent = useCallback(
    (e: { nativeEvent: { translationX: number; translationY: number } }) => {
      if (scaleRef.current <= 1) return;
      const nx = panStartTx.current + e.nativeEvent.translationX;
      const ny = panStartTy.current + e.nativeEvent.translationY;
      txRef.current = nx;
      tyRef.current = ny;
      setTranslateX(nx);
      setTranslateY(ny);
    },
    []
  );

  const onPanStateChange = useCallback(
    (e: { nativeEvent: { state: number } }) => {
      if (e.nativeEvent.state === State.BEGAN) {
        panStartTx.current = txRef.current;
        panStartTy.current = tyRef.current;
      }
    },
    []
  );

  return (
    <PinchGestureHandler
      ref={pinchRef}
      onGestureEvent={onPinchEvent}
      onHandlerStateChange={onPinchStateChange}
    >
      <PanGestureHandler
        ref={panRef}
        onGestureEvent={onPanEvent}
        onHandlerStateChange={onPanStateChange}
        simultaneousHandlers={pinchRef}
        enabled={scale > 1}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            transform: [{ scale }, { translateX }, { translateY }],
          }}
        >
          <Image
            source={headers ? { uri, headers } : { uri }}
            style={{ width: SW, height: SW }}
            contentFit="contain"
            transition={200}
            onLoad={() => onLoaded?.()}
            onError={() => onLoaded?.()}
          />
        </View>
      </PanGestureHandler>
    </PinchGestureHandler>
  );
}

export default function HistolojiDetayScreen() {
  const insets = useSafeAreaInsets();
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [tokenReady, setTokenReady] = useState(false);
  const [authHeaders, setAuthHeaders] = useState<Record<string, string> | undefined>(
    undefined
  );
  const [imageLoading, setImageLoading] = useState(true);

  const previewUrl =
    BASE_URL.replace(/\/api\/?$/, "") +
    `/api/microscope/images/${encodeURIComponent(String(id ?? ""))}/preview`;

  useEffect(() => {
    let c = false;
    (async () => {
      const token = await storage.getToken();
      if (c) return;
      if (token) {
        setAuthHeaders({ Authorization: `Bearer ${token}` });
      } else {
        setAuthHeaders(undefined);
      }
      setTokenReady(true);
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          zIndex: 10,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
      </View>

      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 68,
          right: 16,
          zIndex: 10,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: "#fff",
            fontSize: 15,
            fontFamily: fontBold(),
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}
        >
          {String(title ?? "")}
        </Text>
      </View>

      {tokenReady && imageLoading ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
          }}
        >
          <ActivityIndicator size="large" color="#818cf8" />
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              marginTop: 12,
              fontSize: 13,
              fontFamily: fontReg(),
            }}
          >
            Görüntü yükleniyor...
          </Text>
        </View>
      ) : null}

      {tokenReady ? (
        <View style={{ flex: 1 }}>
          <ZoomableImage
            uri={previewUrl}
            headers={authHeaders}
            onLoaded={() => setImageLoading(false)}
          />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      )}
    </View>
  );
}
