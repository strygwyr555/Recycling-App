import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to RecycleAI</Text>
      <Pressable style={styles.button} onPress={() => router.push("/login_app")}>
        <Text style={styles.btnText}>Go to Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 20 
  },
  button: { 
    backgroundColor: "#27ae60", 
    padding: 12, 
    borderRadius: 8, 
    margin: 8 
  },
  btnText: { 
    color: "white", 
    fontWeight: "bold" 
  },
});
