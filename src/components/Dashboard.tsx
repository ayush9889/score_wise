import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, TrendingUp, Target, Award, Users, Download, Upload, User, RefreshCw, MessageCircle, Share2, AlertCircle, Cloud, CloudOff, Wifi, WifiOff } from 'lucide-react';
import { Player, Match } from '../types/cricket';
import { PlayerDashboard } from './PlayerDashboard';
import { DetailedScorecardModal } from './DetailedScorecardModal';
import { GroupDashboard } from './GroupDashboard';
import { storageService } from '../services/storage';
import { cloudStorageService } from '../services/cloudStorageService';
import { CricketEngine } from '../services/cricketEngine';
import { PDFService } from '../services/pdfService';
import { LiveScorer } from './LiveScorer';

interface DashboardProps {
  onBack: () => void;
  onResumeMatch?: (match: Match) => void;
}

type View = 'main' | 'player' | 'group';

export const Dashboard: React.FC<DashboardProps> = ({ onBack, onResumeMatch }) => {
  const [view, setView] = useState<View>('main');
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showDetailedScorecard, setShowDetailedScorecard] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [incompleteMatches, setIncompleteMatches] = useState<Match[]>([]);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    online: boolean;
    firebaseWorking: boolean;
    lastSync?: Date;
  }>({ online: false, firebaseWorking: false });
  const [syncing, setSyncing] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      
      // Load from local storage first
      const [storedMatches, storedPlayers] = await Promise.all([
        storageService.getAllMatches(),
        storageService.getAllPlayers()
      ]);
      
      // Sort matches by date (most recent first)
      const sortedMatches = storedMatches.sort((a: Match, b: Match) => b.startTime - a.startTime);
      
      setMatches(sortedMatches);
      setPlayers(storedPlayers);
      
      // Check for incomplete matches
      await checkForIncompleteMatches();
      
      // Try to sync with cloud if online
      await checkConnectionAndSync();
      
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const checkConnectionAndSync = async () => {
    try {
      const status = await cloudStorageService.checkConnection();
      setConnectionStatus(status);
      
      if (status.online && status.firebaseWorking) {
        // Try to get cloud data
        const cloudMatches = await cloudStorageService.getRecentMatches(20);
        const cloudPlayers = await cloudStorageService.getAllPlayers();
        
        // Merge with local data (cloud takes precedence for newer items)
        if (cloudMatches.matches.length > 0) {
          const mergedMatches = [...cloudMatches.matches];
          matches.forEach(localMatch => {
            if (!mergedMatches.find(m => m.id === localMatch.id)) {
              mergedMatches.push(localMatch);
            }
          });
          setMatches(mergedMatches.sort((a, b) => b.startTime - a.startTime));
        }
        
        if (cloudPlayers.length > 0) {
          const mergedPlayers = [...cloudPlayers];
          players.forEach(localPlayer => {
            if (!mergedPlayers.find(p => p.id === localPlayer.id)) {
              mergedPlayers.push(localPlayer);
            }
          });
          setPlayers(mergedPlayers);
        }
      }
    } catch (error) {
      console.warn('⚠️ Connection check failed:', error);
    }
  };

  const checkForIncompleteMatches = async () => {
    try {
      // Check local storage first
      const localIncomplete = matches.filter(m => !m.isCompleted);
      
      // Check cloud storage if online
      if (connectionStatus.online && connectionStatus.firebaseWorking) {
        const cloudIncomplete = await cloudStorageService.getIncompleteMatches();
        
        // Merge incomplete matches
        const allIncomplete = [...localIncomplete];
        cloudIncomplete.forEach(cloudMatch => {
          if (!allIncomplete.find(m => m.id === cloudMatch.id)) {
            allIncomplete.push(cloudMatch);
          }
        });
        
        setIncompleteMatches(allIncomplete);
        if (allIncomplete.length > 0) {
          setShowResumePrompt(true);
        }
      } else {
        setIncompleteMatches(localIncomplete);
        if (localIncomplete.length > 0) {
          setShowResumePrompt(true);
        }
      }
    } catch (error) {
      console.error('Failed to check for incomplete matches:', error);
    }
  };

  const handleSyncData = async () => {
    if (!connectionStatus.online || !connectionStatus.firebaseWorking) {
      alert('Cannot sync - device is offline or cloud storage unavailable');
      return;
    }
    
    setSyncing(true);
    try {
      const result = await cloudStorageService.syncLocalData(matches, players);
      
      if (result.errors > 0) {
        alert(`Sync completed with ${result.errors} errors. ${result.synced} items synced successfully.`);
      } else {
        alert(`Sync successful! ${result.synced} items synced to cloud.`);
      }
      
      // Refresh data after sync
      await loadData();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleResumeMatch = (match: Match) => {
    if (onResumeMatch) {
      onResumeMatch(match);
    }
    setShowResumePrompt(false);
  };

  const handleCreateBackup = async (match: Match) => {
    try {
      const backupName = prompt('Enter backup name (optional):');
      const backupId = await cloudStorageService.createBackup(match, backupName || undefined);
      alert(`Backup created successfully! Backup ID: ${backupId}`);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Failed to create backup. Please check your connection.');
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      setMatches([]);
      setPlayers([]);
      setSelectedPlayer(null);
      setCurrentMatch(null);
    };
  }, [loadData]);

  useEffect(() => {
    const handleMatchSaved = () => {
      loadData();
    };
    window.addEventListener('matchSaved', handleMatchSaved);
    window.addEventListener('playerStatsUpdated', handleMatchSaved);
    return () => {
      window.removeEventListener('matchSaved', handleMatchSaved);
      window.removeEventListener('playerStatsUpdated', handleMatchSaved);
    };
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
    setView('player');
  };

  const handleGroupView = () => {
    setView('group');
  };

  const handleBackToMain = () => {
    setView('main');
    setSelectedPlayer(null);
  };

  const handleDismissResume = () => {
    setShowResumePrompt(false);
  };

  const renderError = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard data...</p>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
        <p className="text-gray-600 mb-6">Start by creating your first match to see statistics and leaderboards.</p>
        <button
          onClick={onBack}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Match
        </button>
      </div>
    </div>
  );

  const renderMainView = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className={`p-2 rounded-lg ${connectionStatus.online ? 'text-green-600' : 'text-red-600'}`}>
              {connectionStatus.online ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            
            {/* Cloud Status */}
            <div className={`p-2 rounded-lg ${connectionStatus.firebaseWorking ? 'text-blue-600' : 'text-gray-400'}`}>
              {connectionStatus.firebaseWorking ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            
            {/* Sync Button */}
            <button
              onClick={handleSyncData}
              disabled={syncing || !connectionStatus.online || !connectionStatus.firebaseWorking}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                syncing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Sync with Cloud"
            >
              <Upload className={`w-5 h-5 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Connection Status Banner */}
        {!connectionStatus.online && (
          <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-6">
            <div className="flex items-center">
              <WifiOff className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-orange-700 font-medium">You're offline</p>
                <p className="text-orange-600 text-sm">Data will sync when connection is restored</p>
              </div>
            </div>
          </div>
        )}

        {/* Resume Match Prompt */}
        {showResumePrompt && incompleteMatches.length > 0 && (
          <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Incomplete Matches Found</h3>
                <p className="text-blue-700 mb-3">
                  You have {incompleteMatches.length} incomplete match{incompleteMatches.length > 1 ? 'es' : ''} that can be resumed:
                </p>
                <div className="space-y-2">
                  {incompleteMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between bg-white rounded p-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {match.team1.name} vs {match.team2.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {match.battingTeam.score}/{match.battingTeam.wickets} in {match.battingTeam.overs}.{match.battingTeam.balls} overs
                        </div>
                        <div className="text-xs text-gray-500">
                          Started: {new Date(match.startTime).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleResumeMatch(match)}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          Resume
                        </button>
                        {connectionStatus.online && connectionStatus.firebaseWorking && (
                          <button
                            onClick={() => handleCreateBackup(match)}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          >
                            Backup
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleDismissResume}
                className="text-blue-600 hover:text-blue-800 ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{matches.length}</div>
                <div className="text-sm text-gray-600">Total Matches</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{players.length}</div>
                <div className="text-sm text-gray-600">Total Players</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Users className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {matches.filter(m => m.isCompleted).length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Award className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{incompleteMatches.length}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Target className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Matches</h2>
          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.slice(0, 5).map(match => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {match.team1.name} vs {match.team2.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(match.startTime).toLocaleDateString()}
                    </p>
                    {!match.isCompleted && (
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full mt-1">
                        In Progress
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {match.team1.score}/{match.team1.wickets} - {match.team2.score}/{match.team2.wickets}
                    </p>
                    <div className="flex space-x-2 mt-2">
                      <button
                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-semibold"
                        onClick={() => {
                          setCurrentMatch(match);
                          setShowDetailedScorecard(true);
                        }}
                      >
                        View Scorecard
                      </button>
                      {!match.isCompleted && (
                        <button
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
                          onClick={() => handleResumeMatch(match)}
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No matches played yet</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={handleGroupView}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Group Statistics</h3>
                <p className="text-sm text-gray-500">View comprehensive group statistics and leaderboards</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setView('player')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <User className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Player Statistics</h3>
                <p className="text-sm text-gray-500">View individual player statistics and performance</p>
              </div>
            </div>
          </button>
        </div>

        {/* Sync Status */}
        {connectionStatus.lastSync && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Last synced: {connectionStatus.lastSync.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return renderLoading();
  if (error) return renderError();
  if (matches.length === 0 && players.length === 0) return renderEmptyState();

  return (
    <>
      {view === 'main' && renderMainView()}
      {view === 'player' && selectedPlayer && (
        <PlayerDashboard
          onBack={handleBackToMain}
          player={selectedPlayer}
          onPlayerUpdate={(updatedPlayer) => {
            setSelectedPlayer(updatedPlayer);
            setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
          }}
        />
      )}
      {view === 'group' && <GroupDashboard onBack={handleBackToMain} />}
      
      {showDetailedScorecard && currentMatch && (
        <DetailedScorecardModal
          match={currentMatch}
          isOpen={showDetailedScorecard}
          onClose={() => setShowDetailedScorecard(false)}
        />
      )}
    </>
  );
};