import * as React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { signIn, registerAudience } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session-context";

/**
 * Sign-in / register screen. Single screen with a mode toggle so the user
 * doesn't lose their typed email when they realise they meant the other
 * one. Both modes hit the same `audience: "mobile"` flow on the backend.
 */
export default function SignInScreen() {
  const { setSavedSession } = useSession();
  const [mode, setMode] = React.useState<"sign-in" | "register">("sign-in");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const saved =
        mode === "register"
          ? await registerAudience({
              fullName: fullName.trim(),
              email: email.trim(),
              password,
            })
          : await signIn({ email: email.trim(), password });
      setSavedSession(saved);
      router.replace("/(tabs)");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 py-12 justify-center">
          <Text className="text-foreground text-3xl font-bold tracking-tight">
            {mode === "register"
              ? "Create your fan account"
              : "Welcome back"}
          </Text>
          <Text className="text-muted-foreground mt-2">
            {mode === "register"
              ? "Free fan account — like, follow, watchlist."
              : "Sign in to continue."}
          </Text>

          <View className="mt-8 gap-4">
            {mode === "register" && (
              <Field
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
                returnKeyType="next"
              />
            )}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
          </View>

          {error && (
            <View className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-3">
              <Text className="text-destructive text-sm">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={() => void submit()}
            disabled={busy}
            className="mt-6 h-12 rounded-xl bg-brand-500 items-center justify-center active:opacity-80"
          >
            {busy ? (
              <ActivityIndicator color="#0b0b0d" />
            ) : (
              <Text className="font-semibold text-background text-base">
                {mode === "register" ? "Create account" : "Sign in"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              setMode((m) => (m === "register" ? "sign-in" : "register"))
            }
            className="mt-4 items-center"
          >
            <Text className="text-muted-foreground text-sm">
              {mode === "register"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoComplete?:
    | "email"
    | "name"
    | "current-password"
    | "new-password"
    | "off";
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
}

function Field(props: FieldProps) {
  return (
    <View>
      <Text className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
        {props.label}
      </Text>
      <TextInput
        className="h-12 rounded-xl border border-border bg-card px-4 text-foreground"
        placeholderTextColor="#a1a1aa"
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        autoComplete={props.autoComplete}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize ?? "none"}
        returnKeyType={props.returnKeyType}
        onSubmitEditing={props.onSubmitEditing}
      />
    </View>
  );
}
