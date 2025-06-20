import React, { useState, useEffect } from 'react';
import { X, Users, Target, Play } from 'lucide-react';
import { Player, Match } from '../types/cricket';
import { PlayerSelector } from './PlayerSelector';
import { storageService } from '../services/storage';
import { authService } from '../services/authService';

interface InningsSetupModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: (striker: Player, nonStriker: Player, bowler: Player) => void;
  isSecondInnings?: boolean;
}

export const InningsSetupModal: React.FC<InningsSetupModalProps> = ({
  match,
  isOpen,
  onClose,
  onSetupComplete,
  isSecondInnings = false
}) => {
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [bowler, setBowler] = useState<Player | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState<{
    type: 'striker' | 'nonStriker' | 'bowler';
    title: string;
  } | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPlayers();
      // Reset selections when modal opens
      setStriker(null);
      setNonStriker(null);
      setBowler(null);
    }
  }, [isOpen]);

  const loadPlayers = async () => {
    try {
      const players = await storageService.getAllPlayers();
      setAllPlayers(players);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (player: Player) => {
    if (!showPlayerSelector) return;

    console.log(`Selected ${showPlayerSelector.type}: ${player.name}`);

    switch (showPlayerSelector.type) {
      case 'striker':
        setStriker(player);
        break;
      case 'nonStriker':
        setNonStriker(player);
        break;
      case 'bowler':
        setBowler(player);
        break;
    }
    
    // AUTO-CLOSE: Close player selector modal automatically after selection
    setShowPlayerSelector(null);
  };

  const getAvailablePlayers = (type: string): Player[] => {
    switch (type) {
      case 'striker':
      case 'nonStriker':
        // For batsmen, exclude:
        // 1. The other selected batsman
        // 2. Any selected bowler
        // 3. Players who are already in the bowling team
        return allPlayers.filter(p => 
          p.id !== striker?.id && 
          p.id !== nonStriker?.id &&
          p.id !== bowler?.id &&
          !match.bowlingTeam.players.some(bowler => bowler.id === p.id)
        );
      case 'bowler':
        // For bowler, exclude:
        // 1. Selected batsmen
        // 2. Players who are already in the batting team
        return allPlayers.filter(p => 
          p.id !== striker?.id && 
          p.id !== nonStriker?.id &&
          !match.battingTeam.players.some(batsman => batsman.id === p.id)
        );
      default:
        return allPlayers;
    }
  };

  const handleInningsSetup = (striker: Player, nonStriker: Player, bowler: Player) => {
    if (!striker || !nonStriker || !bowler) {
      alert('Please select all three players (striker, non-striker, and bowler) before starting the innings.');
      return;
    }

    // Validate that players are not already in the opposite team
    if (match.bowlingTeam.players.some(p => p.id === striker.id || p.id === nonStriker.id)) {
      alert('Selected batsmen cannot be from the bowling team.');
      return;
    }

    if (match.battingTeam.players.some(p => p.id === bowler.id)) {
      alert('Selected bowler cannot be from the batting team.');
      return;
    }

    console.log('Starting innings with:', {
      striker: striker.name,
      nonStriker: nonStriker.name,
      bowler: bowler.name
    });

    onSetupComplete(striker, nonStriker, bowler);
  };

  const canComplete = striker && nonStriker && bowler;
  const currentGroup = authService.getCurrentGroup();

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading players...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {isSecondInnings ? 'Second Innings Setup' : 'First Innings Setup'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
          {isSecondInnings && (
            <p className="text-sm text-gray-600 mt-2">
              Select opening batsmen and bowler for the chase
            </p>
          )}
        </div>

        <div className="p-6 space-y-6">
          {isSecondInnings && match.firstInningsScore && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center mb-2">
                <Target className="w-5 h-5 text-orange-600 mr-2" />
                <span className="font-semibold text-orange-800">Target to Win</span>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-1">
                {match.firstInningsScore + 1} runs
              </div>
              <div className="text-sm text-orange-700">
                {match.battingTeam.name} needs {match.firstInningsScore + 1} runs in {match.totalOvers} overs
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Required run rate: {((match.firstInningsScore + 1) / match.totalOvers).toFixed(2)} per over
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Select Players ({canComplete ? '3/3' : `${[striker, nonStriker, bowler].filter(Boolean).length}/3`} selected)
            </h3>

            {/* Striker Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Batsman (Striker) *
              </label>
              <button
                onClick={() => setShowPlayerSelector({
                  type: 'striker',
                  title: 'Select Opening Batsman (Striker)'
                })}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  striker
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">
                    {striker ? striker.name : 'Select Striker'}
                  </div>
                  {striker ? (
                    <div className="text-sm text-green-600">
                      ✓ {striker.stats.runsScored} runs • {striker.stats.matchesPlayed} matches
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Tap to select opening batsman (on strike)
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Non-Striker Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Batsman (Non-Striker) *
              </label>
              <button
                onClick={() => setShowPlayerSelector({
                  type: 'nonStriker',
                  title: 'Select Opening Batsman (Non-Striker)'
                })}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  nonStriker
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">
                    {nonStriker ? nonStriker.name : 'Select Non-Striker'}
                  </div>
                  {nonStriker ? (
                    <div className="text-sm text-blue-600">
                      ✓ {nonStriker.stats.runsScored} runs • {nonStriker.stats.matchesPlayed} matches
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Tap to select opening batsman (not on strike)
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Bowler Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Bowler *
              </label>
              <button
                onClick={() => setShowPlayerSelector({
                  type: 'bowler',
                  title: 'Select Opening Bowler'
                })}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  bowler
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">
                    {bowler ? bowler.name : 'Select Bowler'}
                  </div>
                  {bowler ? (
                    <div className="text-sm text-red-600">
                      ✓ {bowler.stats.wicketsTaken} wickets • {bowler.stats.matchesPlayed} matches
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Tap to select opening bowler
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Setup Progress</span>
              <span className={`font-semibold ${canComplete ? 'text-green-600' : 'text-orange-600'}`}>
                {[striker, nonStriker, bowler].filter(Boolean).length}/3 players selected
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  canComplete ? 'bg-green-500' : 'bg-orange-500'
                }`}
                style={{ width: `${([striker, nonStriker, bowler].filter(Boolean).length / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleInningsSetup(striker, nonStriker, bowler)}
              disabled={!canComplete}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center ${
                canComplete
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 mr-2" />
              {isSecondInnings ? 'Start Second Innings' : 'Start Match'}
            </button>
          </div>

          {!canComplete && (
            <div className="text-center">
              <p className="text-sm text-orange-600 font-medium">
                ⚠️ Please select all 3 players to continue
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Player Selector Modal */}
      {showPlayerSelector && (
        <PlayerSelector
          title={showPlayerSelector.title}
          onPlayerSelect={handlePlayerSelect}
          onClose={() => setShowPlayerSelector(null)}
          players={getAvailablePlayers(showPlayerSelector.type)}
          allowAddPlayer={true}
          groupId={currentGroup?.id}
        />
      )}
    </div>
  );
};