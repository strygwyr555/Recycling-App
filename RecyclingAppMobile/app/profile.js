import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { auth, db } from "./firebaseInit";

export default function ProfileScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: "User",
    lastName: "",
    email: "",
    phone: "",
    createdAt: "",
  });
  const [orientation, setOrientation] = useState(
    width > height ? "landscape" : "portrait"
  );

  // Track orientation changes
  useEffect(() => {
    const isLandscape = width > height;
    setOrientation(isLandscape ? "landscape" : "portrait");
  }, [width, height]);

  // Responsive values
  const isLandscape = orientation === "landscape";
  const isMobileSmall = width < 375;
  const isTablet = width >= 768;

  const getResponsiveSizes = () => {
    let headerFontSize = 20;
    let cardTitleFontSize = 18;
    let labelFontSize = 12;
    let valueFontSize = 16;
    let buttonFontSize = 16;
    let padding = 16;
    let cardMargin = 12;

    if (isMobileSmall) {
      headerFontSize = 18;
      cardTitleFontSize = 16;
      labelFontSize = 11;
      valueFontSize = 14;
      buttonFontSize = 14;
      padding = 12;
      cardMargin = 8;
    } else if (isTablet) {
      headerFontSize = 26;
      cardTitleFontSize = 22;
      labelFontSize = 14;
      valueFontSize = 18;
      buttonFontSize = 18;
      padding = 20;
      cardMargin = 16;
    }

    return {
      headerFontSize,
      cardTitleFontSize,
      labelFontSize,
      valueFontSize,
      buttonFontSize,
      padding,
      cardMargin,
    };
  };

  const sizes = getResponsiveSizes();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login_app");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setProfileData({
            firstName: userDoc.data().firstName || "User",
            lastName: userDoc.data().lastName || "",
            email: userDoc.data().email || user.email,
            phone: userDoc.data().phone || "Not provided",
            createdAt: userDoc.data().createdAt || "N/A",
          });
        } else {
          setProfileData({
            firstName: "User",
            lastName: "",
            email: user.email,
            phone: "Not provided",
            createdAt: "N/A",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={[styles.loadingText, { fontSize: sizes.valueFontSize }]}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View
        style={[
          styles.header,
          {
            padding: sizes.padding,
            paddingHorizontal: sizes.padding * 1.33,
          },
        ]}
      >
        <Pressable
          onPress={() => router.push("/dashboard")}
          style={[
            styles.backButton,
            { paddingHorizontal: sizes.padding, minHeight: isTablet ? 48 : 40 },
          ]}
        >
          <Text style={[styles.backButtonText, { fontSize: sizes.buttonFontSize }]}>
            Back
          </Text>
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { fontSize: sizes.headerFontSize, flex: 1, marginHorizontal: 12 },
          ]}
        >
          Profile
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: sizes.padding, paddingBottom: sizes.padding * 2 },
        ]}
      >
        {/* Profile Information Card */}
        <View
          style={[
            styles.card,
            {
              marginBottom: sizes.cardMargin,
              padding: sizes.padding,
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              {
                fontSize: sizes.cardTitleFontSize,
                marginBottom: sizes.padding,
                paddingBottom: sizes.padding * 0.75,
              },
            ]}
          >
            Account Information
          </Text>

          <View style={[styles.infoItem, { paddingVertical: sizes.padding * 0.75 }]}>
            <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
              First Name
            </Text>
            <Text style={[styles.value, { fontSize: sizes.valueFontSize }]}>
              {profileData.firstName}
            </Text>
          </View>

          <View style={[styles.infoItem, { paddingVertical: sizes.padding * 0.75 }]}>
            <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
              Last Name
            </Text>
            <Text style={[styles.value, { fontSize: sizes.valueFontSize }]}>
              {profileData.lastName || "Not provided"}
            </Text>
          </View>

          <View style={[styles.infoItem, { paddingVertical: sizes.padding * 0.75 }]}>
            <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
              Email
            </Text>
            <Text style={[styles.value, { fontSize: sizes.valueFontSize }]}>
              {profileData.email}
            </Text>
          </View>

          <View style={[styles.infoItem, { paddingVertical: sizes.padding * 0.75 }]}>
            <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
              Phone
            </Text>
            <Text style={[styles.value, { fontSize: sizes.valueFontSize }]}>
              {profileData.phone}
            </Text>
          </View>

          <View
            style={[
              styles.infoItem,
              { paddingVertical: sizes.padding * 0.75, borderBottomWidth: 0 },
            ]}
          >
            <Text style={[styles.label, { fontSize: sizes.labelFontSize }]}>
              Member Since
            </Text>
            <Text style={[styles.value, { fontSize: sizes.valueFontSize }]}>
              {profileData.createdAt}
            </Text>
          </View>
        </View>

        {/* Preferences Card */}
        <View
          style={[
            styles.card,
            {
              marginBottom: sizes.cardMargin,
              padding: sizes.padding,
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              {
                fontSize: sizes.cardTitleFontSize,
                marginBottom: sizes.padding,
              },
            ]}
          >
            Preferences
          </Text>
          <Text
            style={[
              styles.preferencesText,
              {
                fontSize: sizes.valueFontSize,
                marginBottom: sizes.padding * 0.75,
              },
            ]}
          >
            Notifications enabled for recycling tips and achievements
          </Text>
          <Text
            style={[
              styles.preferencesText,
              { fontSize: sizes.valueFontSize },
            ]}
          >
            Dark mode: Currently disabled
          </Text>
        </View>

        {/* Quick Stats Card */}
        <View
          style={[
            styles.card,
            {
              marginBottom: sizes.cardMargin,
              padding: sizes.padding,
              backgroundColor: "#e8f8f5",
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              {
                fontSize: sizes.cardTitleFontSize,
                marginBottom: sizes.padding,
              },
            ]}
          >
            Your Stats
          </Text>
          <Text
            style={[
              styles.statsText,
              { fontSize: sizes.valueFontSize, marginBottom: sizes.padding * 0.5 },
            ]}
          >
            View your scanning history and environmental impact on the statistics page.
          </Text>
          <Pressable
            style={[styles.button, styles.statsButton]}
            onPress={() => router.push("/statistics")}
          >
            <Text
              style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}
            >
              View Statistics
            </Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View
          style={[
            styles.buttonContainer,
            {
              gap: sizes.padding,
              marginBottom: sizes.padding,
              flexDirection: isLandscape && isTablet ? "row" : "column",
            },
          ]}
        >
          <Pressable
            style={[
              styles.button,
              styles.editButton,
              isLandscape && isTablet && { flex: 1 },
            ]}
            onPress={() => alert("Edit profile feature coming soon!")}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
              Edit Profile
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.dashboardButton,
              isLandscape && isTablet && { flex: 1 },
            ]}
            onPress={() => router.push("/dashboard")}
          >
            <Text style={[styles.buttonText, { fontSize: sizes.buttonFontSize }]}>
              Back to Dashboard
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: {
    paddingVertical: 10,
    backgroundColor: "#27ae60",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontWeight: "700",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  scrollContent: {},
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 3px rgba(0,0,0,0.1)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        }),
  },
  cardTitle: {
    fontWeight: "700",
    color: "#2c3e50",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    fontWeight: "600",
    color: "#7f8c8d",
    marginBottom: 4,
  },
  value: {
    fontWeight: "500",
    color: "#2c3e50",
  },
  preferencesText: {
    color: "#333",
    lineHeight: 20,
  },
  statsText: {
    color: "#27ae60",
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#27ae60",
  },
  dashboardButton: {
    backgroundColor: "#3498db",
  },
  statsButton: {
    backgroundColor: "#27ae60",
    marginTop: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});
