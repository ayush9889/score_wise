import React from 'react';
import { Clock, Target, TrendingUp } from 'lucide-react';
import { Match } from '../types/cricket';

interface ScoreDisplayProps {
  match: Match;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ match }) => {
  const formatOvers = (balls: number): string => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  const calculateRunRate = (runs: number, balls: number): string => {
    if (balls === 0) return '0.00';
    return ((runs / balls) * 6).toFixed(2);
  };

  const calculateRequiredRate = (): string | null => {
    if (!match.isSecondInnings) return null;
    
    const target = match.firstInningsScore + 1;
    const remaining = target - match.battingTeam.score;
    const ballsLeft = (match.totalOvers * 6) - (match.battingTeam.overs * 6 + match.battingTeam.balls);
    
    if (ballsLeft <= 0) return '0.00';
    return ((remaining / ballsLeft) * 6).toFixed(2);
  };

  const calculatePartnership = () => {
    if (!match.currentStriker || !match.currentNonStriker) return { runs: 0, balls: 0 };
    // Only use balls from the current innings
    const currentInningsBalls = match.balls.filter(ball =>
      (!match.isSecondInnings && (ball.innings === 1 || !ball.innings)) ||
      (match.isSecondInnings && ball.innings === 2)
    );
    // Find when current partnership started (last wicket or start of innings)
    const lastWicketIndex = currentInningsBalls.map((ball, index) => ball.isWicket ? index : -1)
      .filter(index => index !== -1)
      .pop() || -1;
    const partnershipBalls = currentInningsBalls.slice(lastWicketIndex + 1);
    const runs = partnershipBalls.reduce((sum, ball) => sum + ball.runs, 0);
    const balls = partnershipBalls.filter(ball => !ball.isWide && !ball.isNoBall).length;
    return { runs, balls };
  };

  const requiredRate = calculateRequiredRate();
  const currentRate = calculateRunRate(match.battingTeam.score, match.battingTeam.overs * 6 + match.battingTeam.balls);
  const partnership = calculatePartnership();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      {/* Toss Info */}
      <div className="text-sm text-gray-600 mb-2">
        {match.tossWinner} opt to {match.tossDecision}
      </div>

      {/* Team Score */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {match.battingTeam.name}
        </div>
        <div className="flex items-baseline space-x-4">
          <div className="text-4xl font-bold text-gray-900">
            {match.battingTeam.score}-{match.battingTeam.wickets}
          </div>
          <div className="text-lg text-gray-600">
            ({formatOvers(match.battingTeam.overs * 6 + match.battingTeam.balls)})
          </div>
        </div>
      </div>

      {/* Current Run Rate and Partnership */}
      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
        <div>
          <span className="font-medium">CRR</span> {currentRate}
        </div>
        {partnership.balls > 0 && (
          <div>
            <span className="font-medium">P'SHIP</span> {partnership.runs}({partnership.balls})
          </div>
        )}
        {requiredRate && (
          <div>
            <span className="font-medium">RRR</span> {requiredRate}
          </div>
        )}
        <div className="ml-auto">
          <button className="text-blue-600 font-medium">More</button>
        </div>
      </div>

      {/* Target Display for Second Innings */}
      {match.isSecondInnings && (
        <div className="bg-orange-50 rounded-lg p-3 mb-4">
          <div className="text-sm text-orange-700">
            Target: {match.firstInningsScore + 1} • Need {match.firstInningsScore + 1 - match.battingTeam.score} runs from{' '}
            {(match.totalOvers * 6) - (match.battingTeam.overs * 6 + match.battingTeam.balls)} balls
          </div>
        </div>
      )}
    </div>
  );
};