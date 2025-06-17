import React, { useState } from 'react';
import { Player, Ball } from '../types/cricket';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';

interface LiveScoreboardProps {
  match: any;
  onStrikeRotate: (striker: Player, nonStriker: Player) => void;
  onBowlerChange: (bowler: Player) => void;
  onNewBatsman: (batsman: Player) => void;
  onNewBowler: (bowler: Player) => void;
  onScoreUpdate: (score: any) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSecondInningsSetup: boolean;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  match,
  onStrikeRotate,
  onBowlerChange,
  onNewBatsman,
  onNewBowler,
  onScoreUpdate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isSecondInningsSetup
}) => {
  const [showBatsmanSelector, setShowBatsmanSelector] = useState(false);
  const [showBowlerSelector, setShowBowlerSelector] = useState(false);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [selectedBatsman, setSelectedBatsman] = useState<Player | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<Player | null>(null);
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [selectedExtra, setSelectedExtra] = useState<ExtraType | null>(null);
  const [selectedWicket, setSelectedWicket] = useState<WicketType | null>(null);

  const handleBatsmanSelect = (player: Player) => {
    setSelectedBatsman(player);
    setShowBatsmanSelector(false);
    setShowScoreInput(true);
  };

  const handleBowlerSelect = (player: Player) => {
    setSelectedBowler(player);
    setShowBowlerSelector(false);
    onBowlerChange(player);
  };

  const handleScoreSubmit = () => {
    if (selectedBatsman && selectedBowler) {
      onScoreUpdate({
        batsman: selectedBatsman,
        bowler: selectedBowler,
        runs: selectedScore,
        extra: selectedExtra,
        wicket: selectedWicket
      });
      setShowScoreInput(false);
      setSelectedBatsman(null);
      setSelectedBowler(null);
      setSelectedScore(0);
      setSelectedExtra(null);
      setSelectedWicket(null);
    }
  };

  const calculateBatsmanStats = (player: Player) => {
    const playerBalls = match.balls.filter(b => b.striker.id === player.id);
    const runs = playerBalls.reduce((sum, ball) => sum + ball.runs, 0);
    const ballsFaced = playerBalls.filter(b => !b.isWide && !b.isNoBall).length;
    const fours = playerBalls.filter(b => b.runs === 4).length;
    const sixes = playerBalls.filter(b => b.runs === 6).length;
    const strikeRate = ballsFaced > 0 ? ((runs / ballsFaced) * 100).toFixed(2) : '0.00';

    return { runs, ballsFaced, fours, sixes, strikeRate };
  };

  const calculateBowlerStats = (player: Player) => {
    const bowlerBalls = match.balls.filter(b => b.bowler.id === player.id);
    const runs = bowlerBalls.reduce((sum, ball) => sum + ball.runs, 0);
    const ballsBowled = bowlerBalls.filter(b => !b.isWide && !b.isNoBall).length;
    const wickets = bowlerBalls.filter(b => b.isWicket && b.wicketType !== 'run_out').length;
    const dotBalls = bowlerBalls.filter(b => !b.isWide && !b.isNoBall && b.runs === 0).length;
    const economy = ballsBowled > 0 ? ((runs / ballsBowled) * 6).toFixed(2) : '0.00';

    return { runs, ballsBowled, wickets, dotBalls, economy };
  };

  const strikerStats = calculateBatsmanStats(match.currentStriker);
  const nonStrikerStats = calculateBatsmanStats(match.currentNonStriker);
  const bowlerStats = calculateBowlerStats(match.currentBowler);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Team Names and Scores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">{match.battingTeam.name}</h2>
          <p className="text-3xl font-bold text-blue-600">
            {match.battingTeam.score}/{match.battingTeam.wickets}
          </p>
          <p className="text-sm text-gray-500">
            {match.battingTeam.overs}.{match.battingTeam.balls} Overs
          </p>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">{match.bowlingTeam.name}</h2>
          {match.isSecondInnings && (
            <p className="text-lg text-gray-600">
              Target: {match.firstInningsScore + 1}
            </p>
          )}
        </div>
      </div>

      {/* Current Players */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Batting</h3>
          <div className="space-y-2">
            {match.currentStriker && (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="font-medium">{match.currentStriker.name}*</span>
                <span className="text-gray-600">{match.currentStriker.runs}</span>
              </div>
            )}
            {match.currentNonStriker && (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="font-medium">{match.currentNonStriker.name}</span>
                <span className="text-gray-600">{match.currentNonStriker.runs}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Bowling</h3>
          {match.currentBowler && (
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span className="font-medium">{match.currentBowler.name}</span>
              <span className="text-gray-600">
                {match.currentBowler.overs}.{match.currentBowler.balls}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isSecondInningsSetup && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowBatsmanSelector(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Batsman
          </button>
          <button
            onClick={() => setShowBowlerSelector(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Change Bowler
          </button>
        </div>
      )}

      {/* Player Selection Modals */}
      <AnimatePresence>
        {showBatsmanSelector && (
          <PlayerSelector
            title="Select New Batsman"
            onPlayerSelect={handleBatsmanSelect}
            onClose={() => setShowBatsmanSelector(false)}
            availablePlayers={match.battingTeam.players}
            showOnlyAvailable={true}
          />
        )}

        {showBowlerSelector && (
          <PlayerSelector
            title="Select New Bowler"
            onPlayerSelect={handleBowlerSelect}
            onClose={() => setShowBowlerSelector(false)}
            availablePlayers={match.bowlingTeam.players}
            showOnlyAvailable={true}
          />
        )}

        {showScoreInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Enter Score</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Runs</label>
                  <input
                    type="number"
                    min="0"
                    value={selectedScore}
                    onChange={(e) => setSelectedScore(parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Extra</label>
                  <select
                    value={selectedExtra || ''}
                    onChange={(e) => setSelectedExtra(e.target.value as ExtraType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    <option value="wide">Wide</option>
                    <option value="noBall">No Ball</option>
                    <option value="bye">Bye</option>
                    <option value="legBye">Leg Bye</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Wicket</label>
                  <select
                    value={selectedWicket || ''}
                    onChange={(e) => setSelectedWicket(e.target.value as WicketType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    <option value="bowled">Bowled</option>
                    <option value="caught">Caught</option>
                    <option value="lbw">LBW</option>
                    <option value="runOut">Run Out</option>
                    <option value="stumped">Stumped</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowScoreInput(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleScoreSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 