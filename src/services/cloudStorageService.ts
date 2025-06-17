import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { Match } from '../types/cricket';

const MATCHES_COLLECTION = 'matches';

// Simple helper to check if we're online
const isOnline = () => navigator.onLine;

// Check if Firebase is working properly
const isFirebaseWorking = () => {
  try {
    // Simple test to see if Firebase is responsive
    return db && typeof db.collection === 'function';
  } catch (error) {
    console.warn('⚠️ Firebase not working properly:', error);
    return false;
  }
};

// Ultra-simple data preparation - only essential fields
const prepareMatchForFirestore = (match: Match) => {
  try {
    // Create a minimal, safe copy with only essential data
    const safeMatch = {
      // Basic match info
      id: match.id,
      totalOvers: match.totalOvers || 20,
      isCompleted: match.isCompleted || false,
      isSecondInnings: match.isSecondInnings || false,
      firstInningsScore: match.firstInningsScore || null,
      winner: match.winner || null,
      startTime: Timestamp.fromDate(new Date(match.startTime)),
      endTime: match.endTime ? Timestamp.fromDate(new Date(match.endTime)) : null,
      lastUpdated: serverTimestamp(),
      
      // Team names only (no complex player data)
      team1Name: match.team1?.name || '',
      team2Name: match.team2?.name || '',
      battingTeamName: match.battingTeam?.name || '',
      bowlingTeamName: match.bowlingTeam?.name || '',
      
      // Simple scores
      battingTeamScore: match.battingTeam?.score || 0,
      battingTeamWickets: match.battingTeam?.wickets || 0,
      battingTeamOvers: match.battingTeam?.overs || 0,
      battingTeamBalls: match.battingTeam?.balls || 0,
      
      bowlingTeamScore: match.bowlingTeam?.score || 0,
      bowlingTeamWickets: match.bowlingTeam?.wickets || 0,
      bowlingTeamOvers: match.bowlingTeam?.overs || 0,
      bowlingTeamBalls: match.bowlingTeam?.balls || 0,
      
      // Extras
      battingTeamExtras: {
        wides: match.battingTeam?.extras?.wides || 0,
        noBalls: match.battingTeam?.extras?.noBalls || 0,
        byes: match.battingTeam?.extras?.byes || 0,
        legByes: match.battingTeam?.extras?.legByes || 0
      },
      
      // Current players (names only)
      currentStrikerName: match.currentStriker?.name || '',
      currentNonStrikerName: match.currentNonStriker?.name || '',
      currentBowlerName: match.currentBowler?.name || '',
      previousBowlerName: match.previousBowler?.name || '',
      manOfTheMatchName: match.manOfTheMatch?.name || '',
      
      // Ball count
      totalBalls: match.balls?.length || 0,
      
      // Match status
      tossWinner: match.tossWinner || '',
      tossDecision: match.tossDecision || 'bat',
      currentInnings: match.currentInnings || 1
    };

    console.log('✅ Simple match data prepared for Firestore');
    return safeMatch;
  } catch (error) {
    console.error('❌ Error preparing simple match data:', error);
    throw new Error('Failed to prepare match data');
  }
};

export const cloudStorageService = {
  // Save match to cloud storage - ultra simple approach with offline-first
  async saveMatch(match: Match): Promise<void> {
    try {
      console.log('🔄 Attempting to save match to cloud:', match.id);
      
      // Check if we're online and Firebase is working
      if (!isOnline()) {
        console.log('📱 Device is offline, skipping cloud save');
        return;
      }

      if (!isFirebaseWorking()) {
        console.log('⚠️ Firebase not working, continuing in offline mode');
        return;
      }
      
      // Basic validation
      if (!match.id || !match.team1?.name || !match.team2?.name) {
        console.warn('⚠️ Match missing required data, skipping cloud save');
        return;
      }

      // Prepare minimal data
      const matchData = prepareMatchForFirestore(match);
      
      // Save to Firestore with timeout
      const matchRef = doc(db, MATCHES_COLLECTION, match.id);
      
      // Add timeout to prevent hanging
      const savePromise = setDoc(matchRef, matchData, { merge: true });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout')), 5000)
      );
      
      await Promise.race([savePromise, timeoutPromise]);
      
      console.log('✅ Successfully saved match to cloud:', match.id);
    } catch (error: any) {
      // Handle all errors gracefully - never crash the app
      console.warn('⚠️ Cloud save failed, continuing in offline mode:', error?.message || error);
      
      // Don't throw errors - just log and continue
      return;
    }
  },

  // Get match from cloud storage - simplified with offline-first
  async getMatch(matchId: string): Promise<Match | null> {
    try {
      console.log('🔄 Attempting to get match from cloud:', matchId);
      
      if (!matchId || !isOnline() || !isFirebaseWorking()) {
        console.log('📱 Cannot fetch from cloud - offline, invalid ID, or Firebase issues');
        return null;
      }

      const matchRef = doc(db, MATCHES_COLLECTION, matchId);
      
      // Add timeout to prevent hanging
      const getPromise = getDoc(matchRef);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Get timeout')), 5000)
      );
      
      const matchDoc = await Promise.race([getPromise, timeoutPromise]);
      
      if (matchDoc.exists()) {
        const data = matchDoc.data();
        console.log('✅ Successfully retrieved match from cloud:', matchId);
        
        // Convert back to Match format (simplified)
        return {
          id: data.id,
          team1: { name: data.team1Name, players: [], score: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
          team2: { name: data.team2Name, players: [], score: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
          battingTeam: { 
            name: data.battingTeamName, 
            players: [], 
            score: data.battingTeamScore || 0, 
            wickets: data.battingTeamWickets || 0, 
            overs: data.battingTeamOvers || 0, 
            balls: data.battingTeamBalls || 0, 
            extras: data.battingTeamExtras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 } 
          },
          bowlingTeam: { 
            name: data.bowlingTeamName, 
            players: [], 
            score: data.bowlingTeamScore || 0, 
            wickets: data.bowlingTeamWickets || 0, 
            overs: data.bowlingTeamOvers || 0, 
            balls: data.bowlingTeamBalls || 0, 
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } 
          },
          totalOvers: data.totalOvers || 20,
          balls: [],
          isCompleted: data.isCompleted || false,
          isSecondInnings: data.isSecondInnings || false,
          firstInningsScore: data.firstInningsScore,
          winner: data.winner,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate(),
          tossWinner: data.tossWinner || '',
          tossDecision: data.tossDecision || 'bat',
          currentInnings: data.currentInnings || 1
        } as Match;
      }
      
      console.log('📭 Match not found in cloud:', matchId);
      return null;
    } catch (error: any) {
      console.warn('⚠️ Cloud retrieval failed:', error?.message || error);
      return null;
    }
  },

  // Get recent matches - simplified with offline-first
  async getRecentMatches(limitCount: number = 10): Promise<Match[]> {
    try {
      console.log('🔄 Attempting to get recent matches');
      
      if (!isOnline() || !isFirebaseWorking()) {
        console.log('📱 Device is offline or Firebase not working, cannot fetch recent matches');
        return [];
      }
      
      const matchesQuery = query(
        collection(db, MATCHES_COLLECTION),
        orderBy('lastUpdated', 'desc'),
        limit(limitCount)
      );
      
      // Add timeout to prevent hanging
      const getPromise = getDocs(matchesQuery);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Get recent matches timeout')), 5000)
      );
      
      const querySnapshot = await Promise.race([getPromise, timeoutPromise]);
      
      const matches = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          team1: { name: data.team1Name, players: [], score: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
          team2: { name: data.team2Name, players: [], score: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
          battingTeam: { 
            name: data.battingTeamName, 
            players: [], 
            score: data.battingTeamScore || 0, 
            wickets: data.battingTeamWickets || 0, 
            overs: data.battingTeamOvers || 0, 
            balls: data.battingTeamBalls || 0, 
            extras: data.battingTeamExtras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 } 
          },
          bowlingTeam: { 
            name: data.bowlingTeamName, 
            players: [], 
            score: data.bowlingTeamScore || 0, 
            wickets: data.bowlingTeamWickets || 0, 
            overs: data.bowlingTeamOvers || 0, 
            balls: data.bowlingTeamBalls || 0, 
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } 
          },
          totalOvers: data.totalOvers || 20,
          balls: [],
          isCompleted: data.isCompleted || false,
          isSecondInnings: data.isSecondInnings || false,
          firstInningsScore: data.firstInningsScore,
          winner: data.winner,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate(),
          tossWinner: data.tossWinner || '',
          tossDecision: data.tossDecision || 'bat',
          currentInnings: data.currentInnings || 1
        } as Match;
      });
      
      console.log('✅ Successfully retrieved recent matches:', matches.length);
      return matches;
    } catch (error: any) {
      console.warn('⚠️ Failed to get recent matches:', error?.message || error);
      return [];
    }
  },

  // Get team matches - simplified with offline-first
  async getTeamMatches(teamName: string, limitCount: number = 10): Promise<Match[]> {
    try {
      console.log('🔄 Attempting to get team matches:', teamName);
      
      if (!teamName || !isOnline() || !isFirebaseWorking()) {
        console.log('📱 Cannot fetch team matches - offline, invalid team name, or Firebase issues');
        return [];
      }

      const matchesQuery = query(
        collection(db, MATCHES_COLLECTION),
        orderBy('lastUpdated', 'desc'),
        limit(limitCount)
      );
      
      // Add timeout to prevent hanging
      const getPromise = getDocs(matchesQuery);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Get team matches timeout')), 5000)
      );
      
      const querySnapshot = await Promise.race([getPromise, timeoutPromise]);
      
      const matches = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: data.id,
            team1: { name: data.team1Name, players: [], score: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
            team2: { name: data.team2Name, players: [], score: 0, wickets: 0, overs: 0, balls: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
            battingTeam: { 
              name: data.battingTeamName, 
              players: [], 
              score: data.battingTeamScore || 0, 
              wickets: data.battingTeamWickets || 0, 
              overs: data.battingTeamOvers || 0, 
              balls: data.battingTeamBalls || 0, 
              extras: data.battingTeamExtras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 } 
            },
            bowlingTeam: { 
              name: data.bowlingTeamName, 
              players: [], 
              score: data.bowlingTeamScore || 0, 
              wickets: data.bowlingTeamWickets || 0, 
              overs: data.bowlingTeamOvers || 0, 
              balls: data.bowlingTeamBalls || 0, 
              extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } 
            },
            totalOvers: data.totalOvers || 20,
            balls: [],
            isCompleted: data.isCompleted || false,
            isSecondInnings: data.isSecondInnings || false,
            firstInningsScore: data.firstInningsScore,
            winner: data.winner,
            startTime: data.startTime?.toDate() || new Date(),
            endTime: data.endTime?.toDate(),
            tossWinner: data.tossWinner || '',
            tossDecision: data.tossDecision || 'bat',
            currentInnings: data.currentInnings || 1
          } as Match;
        })
        .filter(match => 
          match.team1.name === teamName || 
          match.team2.name === teamName
        );
      
      console.log('✅ Successfully retrieved team matches:', matches.length);
      return matches;
    } catch (error: any) {
      console.warn('⚠️ Failed to get team matches:', error?.message || error);
      return [];
    }
  },

  // Check connection
  async checkConnection(): Promise<boolean> {
    try {
      return isOnline() && isFirebaseWorking();
    } catch (error) {
      return false;
    }
  },

  // Go offline (for testing)
  async goOffline(): Promise<void> {
    console.log('📱 Going offline for testing');
  },

  // Go online (for testing)
  async goOnline(): Promise<void> {
    console.log('📱 Going online for testing');
  }
};