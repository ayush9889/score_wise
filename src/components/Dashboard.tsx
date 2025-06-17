import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, TrendingUp, Target, Award, Users, Download, Upload, User, RefreshCw, MessageCircle, Share2, AlertCircle } from 'lucide-react';
import { Player, Match } from '../types/cricket';
import { PlayerDashboard } from './PlayerDashboard';
import { DetailedScorecardModal } from './DetailedScorecardModal';
import { GroupDashboard } from './GroupDashboard';
import { storageService } from '../services/storage';
import { CricketEngine } from '../services/cricketEngine';
import { PDFService } from '../services/pdfService';
import { LiveScorer } from './LiveScorer';

interface DashboardProps {
  onBack: () => void;
  onResumeMatch: (match: Match) => void;
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
  const [incompleteMatch, setIncompleteMatch] = useState<Match | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [storedMatches, storedPlayers] = await Promise.all([
        storageService.getAllMatches(),
        storageService.getAllPlayers()
      ]);
      
      // Sort matches by date (most recent first)
      const sortedMatches = storedMatches.sort((a: Match, b: Match) => b.startTime - a.startTime);
      
      setMatches(sortedMatches);
      setPlayers(storedPlayers);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      // Cleanup any subscriptions or pending operations
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

  useEffect(() => {
    checkForIncompleteMatch();
  }, []);

  const checkForIncompleteMatch = async () => {
    try {
      const matches = await storageService.getAllMatches();
      const incomplete = matches.find(m => !m.isCompleted);
      if (incomplete) {
        setIncompleteMatch(incomplete);
        setShowResumePrompt(true);
      }
    } catch (error) {
      console.error('Failed to check for incomplete match:', error);
    }
  };

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

  const handleResumeMatch = () => {
    if (incompleteMatch) {
      // Navigate to LiveScorer with the incomplete match
      // This will be handled by the parent component
      onResumeMatch(incompleteMatch);
    }
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
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
      </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Matches</p>
                <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Players</p>
                <p className="text-2xl font-bold text-gray-900">{players.length}</p>
                </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Users className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed Matches</p>
                <p className="text-2xl font-bold text-gray-900">
                  {matches.filter(m => m.isCompleted).length}
                </p>
                </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Award className="w-6 h-6 text-purple-500" />
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
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {match.team1.score}/{match.team1.wickets} - {match.team2.score}/{match.team2.wickets}
                    </p>
                    <p className="text-sm text-gray-500">
                      {match.isCompleted ? 'Completed' : 'In Progress'}
                    </p>
                    <button
                      className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-semibold"
                      onClick={() => {
                        setCurrentMatch(match);
                        setShowDetailedScorecard(true);
                      }}
                    >
                      View Full Scorecard
                    </button>
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

      {showResumePrompt && incompleteMatch && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Incomplete Match Found</h3>
          <p className="mb-2">
            You have an incomplete match from {new Date(incompleteMatch.startTime).toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleResumeMatch}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Resume Match
            </button>
            <button
              onClick={handleDismissResume}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};