import React from 'react';
import { Player, Ball } from '../types/cricket';
import { TrendingUp, Target, Clock } from 'lucide-react';

interface LiveStatsBarProps {
  player: Player;
  balls: Ball[];
  type: 'batsman' | 'bowler';
  isStriker?: boolean;
}

export const LiveStatsBar: React.FC<LiveStatsBarProps> = ({ 
  player, 
  balls, 
  type, 
  isStriker = false 
}) => {
  const calculateBatsmanStats = () => {
    const playerBalls = balls.filter(b => b.striker.id === player.id);
    const runs = playerBalls.reduce((sum, ball) => {
      if (!ball.isWide && !ball.isNoBall && !ball.isBye && !ball.isLegBye) {
        return sum + ball.runs;
      }
      return sum;
    }, 0);
    const ballsFaced = playerBalls.filter(b => !b.isWide && !ball.isNoBall).length;
    const fours = playerBalls.filter(b => b.runs === 4).length;
    const sixes = playerBalls.filter(b => b.runs === 6).length;
    const strikeRate = ballsFaced > 0 ? ((runs / ballsFaced) * 100).toFixed(1) : '0.0';
    const dotBalls = playerBalls.filter(b => !b.isWide && !b.isNoBall && b.runs === 0).length;

    return { runs, ballsFaced, fours, sixes, strikeRate, dotBalls };
  };

  const calculateBowlerStats = () => {
    const bowlerBalls = balls.filter(b => b.bowler.id === player.id);
    const runs = bowlerBalls.reduce((sum, ball) => sum + ball.runs, 0);
    const ballsBowled = bowlerBalls.filter(b => !b.isWide && !b.isNoBall).length;
    const wickets = bowlerBalls.filter(b => b.isWicket && b.wicketType !== 'run_out').length;
    const dotBalls = bowlerBalls.filter(b => !b.isWide && !b.isNoBall && b.runs === 0).length;
    const economy = ballsBowled > 0 ? ((runs / ballsBowled) * 6).toFixed(2) : '0.00';
    const overs = Math.floor(ballsBowled / 6);
    const remainingBalls = ballsBowled % 6;

    return { runs, ballsBowled, wickets, dotBalls, economy, overs, remainingBalls };
  };

  if (type === 'batsman') {
    const stats = calculateBatsmanStats();
    
    return (
      <div className={`bg-white rounded-lg shadow-sm p-2 border-l-4 ${
        isStriker ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <div className="font-semibold text-gray-900 text-sm">{player.name}</div>
            {isStriker && (
              <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                On Strike
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">{stats.runs}</div>
            <div className="text-xs text-gray-500">runs</div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-xs mb-2">
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.ballsFaced}</div>
            <div className="text-gray-500">balls</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.fours}</div>
            <div className="text-gray-500">4s</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.sixes}</div>
            <div className="text-gray-500">6s</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.strikeRate}</div>
            <div className="text-gray-500">SR</div>
          </div>
        </div>

        {/* Very Narrow Progress Bar for Strike Rate */}
        <div className="mt-1">
          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
            <span>Strike Rate</span>
            <span>{stats.strikeRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                parseFloat(stats.strikeRate) >= 120 ? 'bg-green-500' :
                parseFloat(stats.strikeRate) >= 100 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(parseFloat(stats.strikeRate), 200)}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  } else {
    const stats = calculateBowlerStats();
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-2 border-l-4 border-red-500 bg-red-50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <div className="font-semibold text-gray-900 text-sm">{player.name}</div>
            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
              Bowling
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">{stats.overs}.{stats.remainingBalls}</div>
            <div className="text-xs text-gray-500">overs</div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-xs mb-2">
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.runs}</div>
            <div className="text-gray-500">runs</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.wickets}</div>
            <div className="text-gray-500">wickets</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.dotBalls}</div>
            <div className="text-gray-500">dots</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{stats.economy}</div>
            <div className="text-gray-500">econ</div>
          </div>
        </div>

        {/* Very Narrow Progress Bar for Economy Rate */}
        <div className="mt-1">
          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
            <span>Economy Rate</span>
            <span>{stats.economy}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                parseFloat(stats.economy) <= 6 ? 'bg-green-500' :
                parseFloat(stats.economy) <= 8 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(parseFloat(stats.economy) * 10, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }
};