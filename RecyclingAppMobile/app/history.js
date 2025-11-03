import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { auth, db } from './firebaseInit';

const isWeb = Platform.OS === 'web';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isWeb && typeof window === 'undefined') return;

    const loadHistory = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const scansCol = collection(db, "scans");
        const q = query(
          scansCol,
          where("email", "==", user.email),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        const historyData = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHistory(historyData);
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text>Loading history...</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.loading}>
        <Text>No scan history found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {history.map(scan => (
        <View key={scan.id} style={styles.card}>
          {scan.imageUrl && (
            <Image source={{ uri: scan.imageUrl }} style={styles.image} />
          )}
          <Text style={styles.text}><Text style={styles.bold}>Classification:</Text> {scan.classification}</Text>
          <Text style={styles.text}><Text style={styles.bold}>Email:</Text> {scan.email}</Text>
          {scan.timestamp?.seconds && (
            <Text style={styles.text}>
              <Text style={styles.bold}>Scanned At:</Text> {new Date(scan.timestamp.seconds * 1000).toLocaleString()}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginBottom: 16, padding: 12, backgroundColor: "#fff", borderRadius: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3 },
  image: { width: "100%", height: 200, borderRadius: 8, marginBottom: 8 },
  text: { fontSize: 14, color: "#333", marginBottom: 4 },
  bold: { fontWeight: "700" },
});
