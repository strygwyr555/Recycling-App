import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { auth, db } from './firebaseInit';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';

export default function HistoryScreen() {
  const router = useRouter();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        console.log("Starting fetch...");
        
        // Debug Firebase connection
        console.log("Database instance:", db);
        console.log("Current user:", auth.currentUser?.email);

        // Get reference to the scan collection
        const scansRef = collection(db, "scan");
        console.log("Collection reference:", scansRef);

        // Create simple query first to test
        const q = query(
          scansRef,
          limit(5) // Limit to 5 documents for testing
        );

        // Debug query
        console.log("Query:", q);

        const querySnapshot = await getDocs(q);
        console.log("Query snapshot:", querySnapshot);
        console.log("Total documents found:", querySnapshot.size);

        // Debug first document if exists
        if (querySnapshot.size > 0) {
          const firstDoc = querySnapshot.docs[0];
          console.log("First document ID:", firstDoc.id);
          console.log("First document data:", firstDoc.data());
        }

        const history = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Debug individual document data
          console.log("Processing document:", doc.id, data);

          return {
            id: doc.id,
            ...data,
            // Handle potential missing fields
            imageUrl: data.imageUrl || null,
            classification: data.classification || 'Unknown',
            date: data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'No date',
            time: data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'No time'
          };
        });

        console.log("Final processed history:", history);
        setHistoryData(history);
        setLoading(false);
      } catch (error) {
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          stack: error.stack,
          name: error.name
        });
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
      </View>

      {/* History Grid */}
      <ScrollView style={styles.historyGrid}>
        {loading ? (
          <Text style={styles.loadingText}>Loading history...</Text>
        ) : historyData.length === 0 ? (
          <Text style={styles.noDataText}>No scan history found</Text>
        ) : (
          historyData.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              {item.imageUrl && (
                <Image 
                  source={{ uri: item.imageUrl }} 
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemText}>Classification: {item.classification || 'Unknown'}</Text>
                <Text style={styles.itemText}>Date: {item.date}</Text>
                <Text style={styles.itemText}>Time: {item.time}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40, // Add safe area padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  filterCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyGrid: {
    flex: 1,
    padding: 16,
  },
  historyItem: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  itemImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemDetails: {
    gap: 4,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    color: '#666',
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    color: '#666',
  }
});