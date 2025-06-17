import React from 'react';
import { X, Trophy, Award, TrendingUp, Target, User } from 'lucide-react';
import { Match, Player } from '../types/cricket';
import { CricketEngine } from '../services/cricketEngine';

interface DetailedScorecardModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
}

export const DetailedScorecardModal: React.FC<DetailedScorecardModalProps> = ({
  match,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const calculateBattingStats = (player: Player) => {
    const battingBalls = match.balls.filter(b => b.striker.id === player.id);
    let runs = 0;
    let balls = 0;
    let fours = 0;
    let sixes = 0;
    let gotOut = false;

    battingBalls.forEach(ball => {
      if (!ball.isWide && !ball.isNoBall && !ball.isBye && !ball.isLegBye) {
        runs += ball.runs;
      }
      if (!ball.isWide && !ball.isNoBall) {
        balls++;
      }
      if (ball.runs === 4) fours++;
      if (ball.runs === 6) sixes++;
      if (ball.isWicket && ball.striker.id === player.id) gotOut = true;
    });

    const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';

    return {
      runs,
      balls,
      fours,
      sixes,
      gotOut,
      strikeRate
    };
  };

  const calculateBowlingStats = (player: Player) => {
    const bowlingBalls = match.balls.filter(b => b.bowler.id === player.id);
    let wickets = 0;
    let runs = 0;
    let balls = 0;
    let wides = 0;
    let noBalls = 0;

    bowlingBalls.forEach(ball => {
      if (!ball.isWide && !ball.isNoBall) {
        balls++;
      }
      if (ball.isWicket && ball.wicketType !== 'run_out') {
        wickets++;
      }
      runs += ball.runs;
      if (ball.isWide) wides++;
      if (ball.isNoBall) noBalls++;
    });

    const overs = Math.floor(balls / 6) + (balls % 6) / 10;
    const economy = overs > 0 ? (runs / overs).toFixed(2) : '0.00';

    return {
      overs: overs.toFixed(1),
      wickets,
      runs,
      economy,
      wides,
      noBalls
    };
  };

  const allPlayers = [...match.team1.players, ...match.team2.players];
  const battingStats = allPlayers.map(player => ({
    player,
    ...calculateBattingStats(player)
  })).filter(stat => stat.runs > 0 || stat.balls > 0).sort((a, b) => b.runs - a.runs);

  const bowlingStats = allPlayers.map(player => ({
    player,
    ...calculateBowlingStats(player)
  })).filter(stat => parseFloat(stat.overs) > 0).sort((a, b) => b.wickets - a.wickets);

  // --- Modern color palette ---
  const palette = {
    header: 'from-indigo-900 to-purple-700',
    innings1: 'from-blue-50 to-indigo-50',
    innings2: 'from-yellow-50 to-amber-50',
    gold: 'text-yellow-500',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    slate: 'text-slate-800',
  };

  // --- Helper: Partnerships ---
  const getPartnerships = (balls, teamPlayers) => {
    const partnerships = [];
    let current = { runs: 0, balls: 0, batsmen: [] };
    let lastWicket = null;
    balls.forEach((ball, i) => {
      if (i === 0) {
        current.batsmen = [ball.striker.name, ball.nonStriker?.name].filter(Boolean);
      }
      current.runs += ball.runs;
      if (!ball.isWide && !ball.isNoBall) current.balls++;
      if (ball.isWicket) {
        partnerships.push({ ...current });
        current = { runs: 0, balls: 0, batsmen: [ball.nonStriker?.name, ball.nextBatsman?.name].filter(Boolean) };
        lastWicket = i;
      }
    });
    if (current.balls > 0) partnerships.push(current);
    return partnerships;
  };

  // --- Helper: Dismissal Info ---
  const getDismissalInfo = (player) => {
    // Find the ball where this player got out
    const wicketBall = match.balls.find(b => b.isWicket && b.striker.id === player.id);
    if (wicketBall) {
      let info = wicketBall.wicketType || 'out';
      if (wicketBall.wicketType === 'caught' && wicketBall.fielder) {
        info = `c ${wicketBall.fielder.name} b ${wicketBall.bowler.name}`;
      } else if (wicketBall.wicketType === 'bowled') {
        info = `b ${wicketBall.bowler.name}`;
      } else if (wicketBall.wicketType === 'lbw') {
        info = 'lbw';
      } else if (wicketBall.wicketType === 'run_out') {
        info = 'run out';
      } else if (wicketBall.wicketType === 'stumped') {
        info = `stumped ${wicketBall.fielder?.name || ''}`;
      }
      return info.toLowerCase();
    }
    // Not out
    return 'not out';
  };

  // --- Render Innings Section ---
  const renderInnings = (team, balls, paletteClass, title) => {
    // Batting stats for this innings only
    const battingStats = team.players.map(player => {
      const playerBalls = balls.filter(b => b.striker.id === player.id);
      let runs = 0, ballsFaced = 0, fours = 0, sixes = 0;
      playerBalls.forEach(ball => {
        if (!ball.isWide && !ball.isNoBall && !ball.isBye && !ball.isLegBye) runs += ball.runs;
        if (!ball.isWide && !ball.isNoBall) ballsFaced++;
        if (ball.runs === 4) fours++;
        if (ball.runs === 6) sixes++;
      });
      const strikeRate = ballsFaced > 0 ? ((runs / ballsFaced) * 100).toFixed(1) : '0.0';
      return { player, runs, balls: ballsFaced, fours, sixes, strikeRate, dismissal: getDismissalInfo(player) };
    }).filter(stat => stat.balls > 0);
    // Partnerships
    const partnerships = getPartnerships(balls, team.players);
    // Refined Fall of Wickets
    const fallOfWickets = (team.fallOfWickets || []).map((fall, i) => {
      // Example: 1-42 (Sehwag, 6.2 ov)
      return `${i + 1}-${fall.score} (${fall.batsman}, ${fall.over} ov)`;
    });
    return (
      <div className={`bg-gradient-to-r ${paletteClass} rounded-xl p-6 mb-8 border shadow-lg`}> 
        <h3 className="text-xl font-bold mb-4 uppercase tracking-wide text-slate-900">{title}</h3>
        {/* Batting Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Batsman</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">How Out</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">R</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">B</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">4s</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">6s</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {battingStats.map(stat => (
                <tr key={stat.player.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{stat.player.name}</td>
                  <td className="px-4 py-3 text-slate-600 lowercase">{stat.dismissal}</td>
                  <td className="px-4 py-3 text-right font-bold">{stat.runs}</td>
                  <td className="px-4 py-3 text-right">{stat.balls}</td>
                  <td className="px-4 py-3 text-right">{stat.fours}</td>
                  <td className="px-4 py-3 text-right">{stat.sixes}</td>
                  <td className="px-4 py-3 text-right">{stat.strikeRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Partnerships */}
        <div className="mb-4">
          <h4 className="font-semibold text-slate-800 mb-1">Partnerships</h4>
          <ul className="text-slate-600 text-sm flex flex-wrap gap-2">
            {partnerships.map((p, i) => (
              <li key={i} className="bg-slate-100 rounded px-2 py-1">{p.batsmen.join(' & ')}: {p.runs} ({p.balls} balls)</li>
            ))}
          </ul>
        </div>
        {/* Fall of Wickets */}
        <div className="mb-4">
          <h4 className="font-semibold text-slate-800 mb-1">Fall of Wickets</h4>
          <ul className="text-slate-600 text-sm flex flex-wrap gap-2">
            {fallOfWickets.map((f, i) => (
              <li key={i} className="bg-slate-100 rounded px-2 py-1">{f}</li>
            ))}
          </ul>
        </div>
        {/* Extras and Total */}
        <div className="flex flex-wrap gap-6 mb-2">
          <div className="text-slate-700">Extras: <span className="font-semibold">B {team.extras.byes}, LB {team.extras.legByes}, WD {team.extras.wides}, NB {team.extras.noBalls}</span></div>
          <div className="text-slate-700">Total: <span className="font-semibold">{team.score}-{team.wickets} ({team.overs}.{team.balls})</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border-4 border-indigo-900">
        {/* Result and Man of the Match at the top */}
        <div className={`bg-gradient-to-r ${palette.header} p-6 text-white`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-wider">{match.team1.name} vs {match.team2.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {/* Result using cricket language */}
          <div className="mt-2 text-lg font-bold text-yellow-200">{CricketEngine.getMatchResult(match)}</div>
          {/* Man of the Match at top */}
          {match.manOfTheMatch && (
            <div className="mt-2 flex items-center text-yellow-300 font-semibold">
              <Award className="w-5 h-5 mr-2" />
              Man of the Match: <span className="ml-1">{match.manOfTheMatch.name}</span>
            </div>
          )}
        </div>
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 bg-gradient-to-b from-slate-50 to-white">
          {/* 1st Innings (top) */}
          {renderInnings(match.team1, match.balls.filter(b => b.battingTeamId === match.team1.id), palette.innings1, '1st Innings')}
          {/* 2nd Innings (bottom) */}
          {renderInnings(match.team2, match.balls.filter(b => b.battingTeamId === match.team2.id), palette.innings2, '2nd Innings')}
        </div>
      </div>
    </div>
  );
}; 