import React, { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera } from 'expo-camera';
import { auth, db } from './firebaseInit';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const isWeb = Platform.OS === 'web';

export default function ScanScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraRef, setCameraRef] = useState(null);

  useEffect(() => {
    // Skip permission check during SSR
    if (isWeb && typeof window === 'undefined') {
      return;
    }

    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleScan = async () => {
    if (!cameraRef) return;

    try {
      setScanning(true);
      const photo = await cameraRef.takePictureAsync();
      
      // Add scan record to Firestore
      const user = auth.currentUser;
      if (user) {
        await addDoc(collection(db, 'scans'), {
          uid: user.uid,
          imageUrl: photo.uri,
          timestamp: serverTimestamp(),
          status: 'pending'
        });
      }

      navigation.navigate('Results', { photoUri: photo.uri });
    } catch (error) {
      console.error('Error scanning:', error);
      alert('Failed to scan. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        ref={ref => setCameraRef(ref)}
        type={Camera.Constants.Type.back}
      >
        <View style={styles.overlay}>
          <Pressable 
            style={[styles.button, scanning && styles.buttonDisabled]}
            onPress={handleScan}
            disabled={scanning}
          >
            <Text style={styles.buttonText}>
              {scanning ? 'Scanning...' : 'Scan Item'}
            </Text>
          </Pressable>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    padding: 20,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  }
});