import React from 'react';
import { Player, Ball } from '../types/cricket';

interface CompactPlayerStatsProps {
  match: any;
}

export const CompactPlayerStats: React.FC<CompactPlayerStatsProps> = ({ match }) => {
  const calculateBatsmanStats = (player: Player) => {
    const playerBalls = match.balls.filter(b => b.striker.id === player.id);
    const runs = playerBalls.reduce((sum, ball) => {
      if (!ball.isWide && !ball.isNoBall && !ball.isBye && !ball.isLegBye) {
        return sum + ball.runs;
      }
      return sum;
    }, 0);
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
    const maidens = 0; // Calculate maiden overs if needed
    const economy = ballsBowled > 0 ? ((runs / ballsBowled) * 6).toFixed(2) : '0.00';
    const overs = Math.floor(ballsBowled / 6);
    const remainingBalls = ballsBowled % 6;

    return { runs, ballsBowled, wickets, maidens, economy, overs, remainingBalls };
  };

  if (!match.currentStriker || !match.currentNonStriker || !match.currentBowler) {
    return null;
  }

  const strikerStats = calculateBatsmanStats(match.currentStriker);
  const nonStrikerStats = calculateBatsmanStats(match.currentNonStriker);
  const bowlerStats = calculateBowlerStats(match.currentBowler);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      {/* Batsmen Stats */}
      <div className="mb-4">
        <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 mb-2 border-b pb-1">
          <div className="col-span-2">Batter</div>
          <div className="text-center">R</div>
          <div className="text-center">B</div>
          <div className="text-center">4s</div>
          <div className="text-center">6s</div>
          <div className="text-center">SR</div>
        </div>
        
        {/* Striker */}
        <div className="grid grid-cols-6 gap-2 text-sm mb-2">
          <div className="col-span-2 flex items-center">
            <span className="text-blue-600 font-medium">{match.currentStriker.name}</span>
            <span className="ml-1 text-blue-600">*</span>
          </div>
          <div className="text-center font-semibold">{strikerStats.runs}</div>
          <div className="text-center">{strikerStats.ballsFaced}</div>
          <div className="text-center">{strikerStats.fours}</div>
          <div className="text-center">{strikerStats.sixes}</div>
          <div className="text-center">{strikerStats.strikeRate}</div>
        </div>
        
        {/* Non-Striker */}
        <div className="grid grid-cols-6 gap-2 text-sm">
          <div className="col-span-2">
            <span className="text-blue-600 font-medium">{match.currentNonStriker.name}</span>
          </div>
          <div className="text-center font-semibold">{nonStrikerStats.runs}</div>
          <div className="text-center">{nonStrikerStats.ballsFaced}</div>
          <div className="text-center">{nonStrikerStats.fours}</div>
          <div className="text-center">{nonStrikerStats.sixes}</div>
          <div className="text-center">{nonStrikerStats.strikeRate}</div>
        </div>
      </div>

      {/* Bowler Stats */}
      <div>
        <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 mb-2 border-b pb-1">
          <div className="col-span-2">Bowler</div>
          <div className="text-center">O</div>
          <div className="text-center">M</div>
          <div className="text-center">R</div>
          <div className="text-center">W</div>
          <div className="text-center">ECO</div>
        </div>
        
        <div className="grid grid-cols-6 gap-2 text-sm">
          <div className="col-span-2">
            <span className="text-red-600 font-medium">{match.currentBowler.name}</span>
            <span className="ml-1 text-red-600">*</span>
          </div>
          <div className="text-center">{bowlerStats.overs}.{bowlerStats.remainingBalls}</div>
          <div className="text-center">{bowlerStats.maidens}</div>
          <div className="text-center font-semibold">{bowlerStats.runs}</div>
          <div className="text-center font-semibold">{bowlerStats.wickets}</div>
          <div className="text-center">{bowlerStats.economy}</div>
        </div>
      </div>
    </div>
  );
};