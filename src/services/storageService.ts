import { Match } from '../types/cricket';

const MATCH_STORAGE_KEY = 'cricket_match_data';
const MATCH_HISTORY_KEY = 'cricket_match_history';

export const storageService = {
  saveMatch: (match: Match) => {
    try {
      localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(match));
      // Also save to match history
      const history = storageService.getMatchHistory();
      const existingIndex = history.findIndex(m => m.id === match.id);
      if (existingIndex >= 0) {
        history[existingIndex] = match;
      } else {
        history.push(match);
      }
      localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving match:', error);
    }
  },

  getMatch: (): Match | null => {
    try {
      const matchData = localStorage.getItem(MATCH_STORAGE_KEY);
      return matchData ? JSON.parse(matchData) : null;
    } catch (error) {
      console.error('Error getting match:', error);
      return null;
    }
  },

  getMatchHistory: (): Match[] => {
    try {
      const historyData = localStorage.getItem(MATCH_HISTORY_KEY);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Error getting match history:', error);
      return [];
    }
  },

  clearCurrentMatch: () => {
    try {
      localStorage.removeItem(MATCH_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing current match:', error);
    }
  },

  clearAllData: () => {
    try {
      localStorage.removeItem(MATCH_STORAGE_KEY);
      localStorage.removeItem(MATCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}; 