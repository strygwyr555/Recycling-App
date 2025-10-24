import React, { useState, useEffect } from "react";
import { Platform } from 'react-native';
import { auth, db } from './firebaseInit';
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

const isWeb = Platform.OS === 'web';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip during SSR
    if (isWeb && typeof window === 'undefined') {
      return;
    }

    const loadHistory = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const scansCol = collection(db, "scans");
        const q = query(scansCol, 
          where("uid", "==", user.uid),
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

  // Format date for display
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Create history card element
  function createHistoryCard(scan) {
    return (
      <div className="history-card" key={scan.id}>
        <div className="card-header">
          <h3>{scan.itemName.toUpperCase()}</h3>
          <span className="confidence">{scan.confidence}% confidence</span>
        </div>
        <div className="card-body">
          <p><strong>Bin:</strong> {scan.binType}</p>
          <p><strong>Materials:</strong> {scan.details}</p>
          <p><strong>Tip:</strong> {scan.tip}</p>
          <p className="timestamp"><small>Scanned: {formatDate(scan.timestamp)}</small></p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-indicator">Loading...</div>;
  }

  if (history.length === 0) {
    return <div id="noHistory">No scan history found.</div>;
  }

  return (
    <div id="historyGrid">
      {history.map(scan => createHistoryCard(scan))}
    </div>
  );
}